import { fetchText } from '../../discover/lib.mjs'

// Non Foundry's site is Cargo. Every page embeds the site's page tree as JSON
// (ScaffoldingData), with the HTML and image records of the page requested, and
// a list of all pages with the set each sits in (FirstloadThumbnails). Each
// typeface is a set kept out of the navigation holding the typeface page and a
// store page; the typeface page is read at its own URL, since the set's URL does
// not always come with its pages. Pages that are not typefaces (drafts in sets
// named with @, the DotType plugin outside any set) have no "Release:" credit
// or no such set and are dropped, as are hidden pages, which the list leaves
// out. The "types" page names the families as the foundry writes them; a set it
// does not list yet takes its own title. Non Natural Grotesk is sold by Type
// Department and has no page here.
//
// Image records carry the original size; Cargo's freight CDN resizes by path
// (/w/1500/), and GIFs stay original so they keep moving. Only pictures placed
// in the page count: a duplicated page keeps the source page's records.
//
// Each typeface page credits "Release: 2023". The upload stamps of its pictures
// give the day when they fall in that year (pages go up with the release);
// otherwise the date is 1 January of the year.
//
// robots.txt asks for a 2-second crawl delay, so pages are read one at a time.
const SITE = 'https://nonfoundry.com'
const FREIGHT = 'https://freight.cargo.site/'
const WIDTH = 1500
const DELAY = 2000

const sleep = ms => new Promise(r => setTimeout(r, ms))

// One retry after the crawl delay covers a dropped connection; a page that
// fails twice is skipped.
async function page(url) {
  try {
    return await fetchText(url)
  } catch {
    await sleep(DELAY)
    return fetchText(url)
  }
}

function scaffolding(html) {
  return JSON.parse(html.match(/data-set="ScaffoldingData" >(.*?)<\/script>/s)[1])
}

// Every page lists the site's pages with the set each belongs to.
function thumbnails(html) {
  return JSON.parse(html.match(/data-set="FirstloadThumbnails" >(.*?)<\/script>/s)[1])
}

function pages(node) {
  return [node, ...(node.pages || []).flatMap(pages)]
}

function listedNames(tree) {
  const types = pages(tree).find(p => p.project_url === 'types')
  const names = new Map()
  for (const m of (types?.content || '').matchAll(/<a href="([^"]+)" rel="history">([^<]+)<\/a>/g)) {
    if (!names.has(m[1])) names.set(m[1], m[2].trim())
  }
  return names
}

const titled = s => s.replace(/\b\w/g, c => c.toUpperCase())

function pictures(page) {
  const records = new Map((page.images || []).map(i => [i.hash, i]))
  const seen = new Set()
  return [...page.content.matchAll(/<img\b[^>]*>/g)]
    .map(m => [m[0], m[0].match(/\s(?:data-)?src="(https:\/\/freight\.cargo\.site\/t\/original\/i\/(\w+)\/([^"]+))"/)])
    .filter(([, src]) => src && /\.(jpe?g|png|gif|webp)$/i.test(src[3]) && !seen.has(src[2]) && seen.add(src[2]))
    .map(([tag, [, src, hash, name]]) => {
      const rec = records.get(hash)
      const width = +(rec?.width ?? (tag.match(/\swidth="(\d+)"/) || [])[1])
      const height = +(rec?.height ?? (tag.match(/\sheight="(\d+)"/) || [])[1])
      if (!width || !height) return null
      const added = rec?.date_added ? new Date(rec.date_added * 1000).toISOString().slice(0, 10) : null
      if (/\.gif$/i.test(name) || width <= WIDTH) return { src, width, height, added }
      return { src: `${FREIGHT}w/${WIDTH}/i/${hash}/${name}`, width: WIDTH, height: Math.round((height * WIDTH) / width), added }
    })
    .filter(Boolean)
}

function releaseDate(page, pics) {
  const year = (page.content.match(/Release:(?:\s|<[^>]+>)*(\d{4})/) || [])[1]
  if (!year) return null
  const stamps = pics.map(p => p.added).filter(d => d?.startsWith(year)).sort()
  return stamps[0] ?? `${year}-01-01`
}

export default {
  id: 'non-foundry',
  label: 'Non Foundry',
  url: SITE,
  async run({ maxImages }) {
    const types = await page(`${SITE}/types`)
    const tree = scaffolding(types)
    const names = listedNames(tree)
    const sets = new Map(
      tree.pages.filter(p => p.is_set && !p.in_nav && !p.pin && !p.title.startsWith('@')).map(p => [p.id, p])
    )
    const out = []
    for (const thumb of thumbnails(types).filter(t => sets.has(t.set_id))) {
      await sleep(DELAY)
      const url = `${SITE}/${thumb.project_url}`
      let html
      try {
        html = await page(url)
      } catch {
        continue
      }
      const typeface = pages(scaffolding(html)).find(p => p.id === thumb.id)
      if (!/Release:/.test(typeface?.content || '')) continue
      const set = sets.get(thumb.set_id)
      const pics = pictures(typeface)
      out.push({
        name: names.get(set.project_url) ?? titled(set.title),
        url,
        date: releaseDate(typeface, pics),
        images: pics.slice(0, maxImages).map(({ added, ...img }) => img),
      })
    }
    return out
  },
}
