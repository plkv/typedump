import { fetchText, mapLimit } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// Commercial Type's site is server-rendered (Rails). The catalogue lists each
// collection with links to the family pages it sells (Graphik → Graphik Wide,
// Graphik Compact…); a family sold on its own is a single catalogue item. The
// "International" items are bundles of other collections' families and script
// versions, so script names are skipped and only family pages are kept.
//
// The pages set every style in SVG and live text, so the pictures come from two
// places: the collection page's specimen grid (a 600px cover per PDF, labelled
// with the family it shows) and the news archive. A news post counts for a
// family when it links the family's page, or links its collection and names the
// family in its slug (new_release_canela_condensed → Canela Condensed), or
// links a collection that holds one family. Posts linking more than three
// collections are overviews (specimen books, the year in review) and are left
// out. Posts come oldest first, so the release post leads.
//
// No page states a release date. A news byline gives month and day, its year
// comes from the archive page it is listed on; uploads sit under /uploads/MMYY/,
// which dates a specimen PDF to the month. Specimens were re-uploaded in
// batches (June 2015, June 2023 and December 2024 each touched a dozen or more
// collections), so a month shared by that many collections says nothing about a
// release and is ignored. A family dates to the earliest of what is left, which
// is its release for anything announced since the site's 2009 launch and a
// later specimen for some older families.
const SITE = 'https://commercialtype.com'
const SCRIPTS = /\b(Arabic|Armenian|Bangla|Cyrillic|Devanagari|Georgian|Greek|Hebrew|Tamil|Thai)\b/
const RASTER = /\.(jpe?g|png|gif)$/i
const MAX_COLLECTIONS = 3
const BATCH_UPLOAD = 10

const sleep = ms => new Promise(r => setTimeout(r, ms))

// The server drops a connection now and then; two quick retries cover it
// without stretching a run.
async function page(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetchText(url)
    } catch (e) {
      if (attempt === 3) throw e
      await sleep(attempt * 2000)
    }
  }
}

const decode = s => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim()
const slugOf = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
const lastSeg = href => href.split('/').pop()
const collectionOf = href => href.split('/')[2]

function uploadMonth(src) {
  const m = src.match(/\/uploads\/(\d\d)(\d\d)\//)
  return m ? `20${m[2]}-${m[1]}-01` : null
}

// A collection item's family dropdown has the full names (Graphik Compact) where
// its child links may have short ones (Compact); they pair up by slug.
function families(html) {
  const names = new Map()
  const hrefs = new Set()
  for (const item of html.split('class="catalog_item grid_item"').slice(1)) {
    const preview = (item.match(/class="catalog_item_preview" href="([^"]+)"/) || [])[1]
    const children = [...item.matchAll(/class="catalog_item_child" href="([^"]+)"><span class="child_family_name">([^<]+)</g)]
    if (!children.length) {
      if (preview) hrefs.add(preview)
      continue
    }
    const dropdown = (item.match(/data-type="family"><span class="dropdown_toggle">[\s\S]*?<div class="dropdown_content scrollable">([\s\S]*?)<\/div>/) || [])[1] || ''
    const full = [...dropdown.matchAll(/>([^<]+)<\/button>/g)].map(m => decode(m[1]))
    for (const [, href, short] of children) {
      hrefs.add(href)
      const name = full.find(n => slugOf(n) === lastSeg(href)) || decode(short)
      if (!names.has(href) || name.length > names.get(href).length) names.set(href, name)
    }
  }
  const all = [...hrefs]
  return all
    .filter(h => !all.some(o => o.startsWith(`${h}/`)))
    .map(href => ({ href, name: names.get(href) }))
    .filter(f => !SCRIPTS.test(f.name || f.href.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())))
}

function specimens(html) {
  const grid = html.slice(html.indexOf('id="collection_specimens_grid"'))
  const block = grid.slice(0, grid.indexOf('</section>'))
  return [...block.matchAll(/<img src="([^"]+)"\s*\/>\s*<div>([^<]*)<\/div>/g)].map(m => ({
    src: new URL(decode(m[1]), SITE).href,
    label: decode(m[2]),
  }))
}

async function news() {
  const years = []
  for (let y = 2009; y <= new Date().getFullYear(); y++) years.push(y)
  const listed = await mapLimit(years, 4, async year => {
    const html = await page(`${SITE}/news/archive/${year}`)
    return [...html.matchAll(/<a class="grid_item" href="\/news\/([^"]+)"/g)].map(m => ({ slug: m[1], year }))
  })
  const posts = await mapLimit(listed.flat().filter(Boolean), 4, async ({ slug, year }) => {
    const html = await page(`${SITE}/news/${slug}`)
    const main = html.slice(html.indexOf('<main'), html.indexOf('class="related"'))
    const byline = (main.match(/class="byline">([A-Z][a-z]+ \d{1,2})/) || [])[1]
    const day = byline && new Date(`${byline} ${year} UTC`)
    const links = new Set([...main.matchAll(/href="(?:https:\/\/commercialtype\.com)?(\/catalog\/[a-z0-9_/]+)"/g)].map(m => m[1]))
    return {
      slug,
      date: day && !isNaN(day) ? day.toISOString().slice(0, 10) : null,
      links,
      collections: new Set([...links].map(collectionOf)),
      images: [...main.matchAll(/<img\b[^>]*\ssrc="([^"]+)"/g)].map(m => new URL(decode(m[1]), SITE).href).filter(s => RASTER.test(s)),
    }
  })
  return posts.filter(p => p && p.collections.size && p.collections.size <= MAX_COLLECTIONS).sort((a, b) => (a.date || '9').localeCompare(b.date || '9'))
}

const names = (slug, family) => `_${slug}_`.includes(`_${lastSeg(family.href)}_`)

function postsFor(family, all, posts) {
  const seg = collectionOf(family.href)
  const siblings = all.filter(f => collectionOf(f.href) === seg)
  return posts.filter(p => {
    if (p.links.has(family.href)) return true
    if (!p.collections.has(seg)) return false
    const named = siblings.filter(f => names(p.slug, f))
    const specific = named.filter(f => !named.some(o => o !== f && lastSeg(o.href).includes(lastSeg(f.href))))
    if (specific.length) return specific.includes(family)
    return siblings.length === 1
  })
}

// Labels read "Graphik Wide family" or "Graphik collection"; the longest family
// name a label starts with takes the cover.
function specimensFor(family, all, pages) {
  const seg = collectionOf(family.href)
  const page = pages.get(seg)
  if (!page) return []
  const siblings = all.filter(f => collectionOf(f.href) === seg)
  if (siblings.length === 1) return page.specimens
  return page.specimens.filter(s => {
    const label = s.label.toLowerCase()
    const owner = siblings
      .filter(f => f.name && label.startsWith(f.name.toLowerCase()))
      .sort((a, b) => b.name.length - a.name.length)[0]
    return owner?.href === family.href
  })
}

export default {
  id: 'commercial-type',
  label: 'Commercial Type',
  url: SITE,
  async run({ maxImages }) {
    const [catalog, posts] = await Promise.all([page(`${SITE}/catalog`), news()])
    const all = families(catalog)
    const segs = [...new Set(all.map(f => collectionOf(f.href)))]
    const pages = new Map(
      (
        await mapLimit(segs, 4, async seg => {
          const html = await page(`${SITE}/catalog/${seg}`)
          const title = (html.match(/<title>Commercial Type » Catalog » ([^<]+)<\/title>/) || [])[1]
          return [seg, { title: title && decode(title).replace(/ (Collection|Family)$/, ''), specimens: specimens(html) }]
        })
      ).filter(Boolean),
    )
    const spread = new Map()
    for (const page of pages.values()) {
      for (const month of new Set(page.specimens.map(s => uploadMonth(s.src)))) spread.set(month, (spread.get(month) || 0) + 1)
    }
    return mapLimit(all, 4, async family => {
      const name = family.name || pages.get(collectionOf(family.href))?.title
      if (!name) return null
      const own = specimensFor({ ...family, name }, all, pages)
      const related = postsFor(family, all, posts)
      const months = own.map(s => uploadMonth(s.src)).filter(m => spread.get(m) < BATCH_UPLOAD)
      const dates = [...months, ...related.map(p => p.date)].filter(Boolean).sort()
      const srcs = [...new Set([...own.map(s => s.src), ...related.flatMap(p => p.images)])].slice(0, maxImages)
      const images = await mapLimit(srcs, 4, async src => ({ src, ...(await imageSize(src)) }))
      return {
        name,
        url: `${SITE}${family.href}`,
        date: dates[0] ?? null,
        images: images.filter(i => i.width && i.height),
      }
    })
  },
}
