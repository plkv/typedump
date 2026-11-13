import { fetchText, mapLimit, parseSitemap } from '../../discover/lib.mjs'
import { imageSize, woffDates } from '../lib.mjs'

// Blaze Type's site is Astro, rendered on the server. The sitemap lists every
// typeface page under /typefaces/<slug>, along with the four category pages
// (/typefaces/sans, ...), which have no release year and drop out. A typeface
// page sets its specimens as live text in the webfont, so its pictures are the
// "in use" photos, each credited to this typeface, and the share card (the name
// set in the face on a plain ground). A release gets a blog post named after it
// (/blog/yowza), a run of specimen images, which go first; the making-of posts
// under other names are mostly the historical references, and stay out. The
// share card is a template that cuts a long name short ("Dean Got..."), so it
// comes last, and a face with nothing else is left out, as type.today's are.
//
// The page gives the year alone ("Released in 2026"). The day comes from the
// first announcement: a Behance project named after the face (the profile page
// lists the latest dozen with their publication time) or a blog post about it
// (/blog/yowza, /blog/nosferatu-making-of-a-font). Failing that, the webfont's
// head table says when the font was last built, a week or so before release
// (Roke on 20 October, out on Behance on the 30th). A date counts only in the
// release year, since a face shown or rebuilt later is no new release; a year's
// releases with no day keep the order of the /typefaces page, the shop's own.
const SITE = 'https://blazetype.eu'
const BEHANCE = 'https://www.behance.net/BlazeTypeFoundry'

const ENTITIES = { amp: '&', nbsp: ' ', lt: '<', gt: '>', quot: '"', apos: "'" }

function text(s) {
  return s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&([a-z]+);/g, (m, e) => ENTITIES[e] ?? m).trim()
}

const unique = srcs => [...new Set(srcs)]
const media = (html, folder) => unique([...html.matchAll(new RegExp(`/img/${folder}/[^"'\\s,)]+\\.(?:webp|jpe?g|png|gif)`, 'g'))].map(m => SITE + m[0]))
const slugify = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const published = html => html.match(/"datePublished":"(\d{4}-\d{2}-\d{2})/)?.[1]

// Behance projects as { name, date }. Behance turns away some addresses, and
// the dates then fall back to the fonts.
async function behance() {
  try {
    const html = await fetchText(BEHANCE)
    const state = JSON.parse(html.match(/<script type="application\/json" id="beconfig-store_state">(.*?)<\/script>/s)[1])
    const projects = []
    const walk = node => {
      if (Array.isArray(node)) node.forEach(walk)
      else if (node && typeof node === 'object') {
        if (typeof node.name === 'string' && typeof node.publishedOn === 'number') {
          projects.push({ name: node.name, date: new Date(node.publishedOn * 1000).toISOString().slice(0, 10) })
        }
        Object.values(node).forEach(walk)
      }
    }
    walk(state)
    return projects
  } catch {
    return []
  }
}

async function fontBuilt(slug) {
  const css = await fetchText(`${SITE}/fonts/${slug}/fontface.css`).catch(() => '')
  const file = css.match(/url\('([^']+\.woff)'\)/)?.[1]
  if (!file) return null
  const res = await fetch(new URL(file, SITE), { signal: AbortSignal.timeout(20000) }).catch(() => null)
  return res?.ok ? woffDates(Buffer.from(await res.arrayBuffer()))?.modified : null
}

export default {
  id: 'blaze-type',
  label: 'Blaze Type',
  url: SITE,
  async run({ maxImages }) {
    const locs = parseSitemap(await fetchText(`${SITE}/sitemap-0.xml`)).map(e => e.loc)
    const slugs = locs.map(loc => loc.match(/\/typefaces\/([^/]+)$/)?.[1]).filter(Boolean)
    const posts = locs.map(loc => loc.match(/\/blog\/([^/]+)$/)?.[1]).filter(Boolean)
    const shop = unique([...(await fetchText(`${SITE}/typefaces`)).matchAll(/href="\/typefaces\/([^"/]+)\/?"/g)].map(m => m[1]))
    const rank = slug => (shop.includes(slug) ? shop.indexOf(slug) : shop.length)
    const projects = await behance()
    // A post or project belongs to the longest slug its own slug starts with,
    // so area-jp-making-of goes to Area JP, not Area.
    const owner = key => slugs.filter(s => key === s || key.startsWith(`${s}-`)).sort((a, b) => b.length - a.length)[0]

    const rows = await mapLimit(slugs, 4, async slug => {
      const html = await fetchText(`${SITE}/typefaces/${slug}`)
      const year = html.match(/Released in<\/dt>\s*<dd[^>]*>\s*(\d{4})/)?.[1]
      if (!year) return null
      const name = text(html.match(/&quot;title&quot;:\[0,&quot;(.+?)&quot;\]/)?.[1] ?? slug)
      const own = await mapLimit(posts.filter(p => owner(p) === slug), 2, async post => ({ post, html: await fetchText(`${SITE}/blog/${post}`) }))
      const release = own.filter(Boolean).find(p => p.post === slug)
      const pictures = [...(release ? media(release.html, `blog/${slug}`) : []), ...media(html, 'fonts-in-use')]
      if (!pictures.length) return null

      const shown = projects.filter(p => owner(slugify(p.name)) === slug).map(p => p.date)
      const announced = [...shown, ...own.filter(Boolean).map(p => published(p.html))].filter(d => d?.startsWith(year)).sort()[0]
      const built = announced ? null : await fontBuilt(slug)
      const srcs = [...pictures.slice(0, maxImages - 1), `${SITE}/og/typefaces/${slug}.png`]
      return {
        slug,
        name,
        url: `${SITE}/typefaces/${slug}`,
        date: announced ?? (built?.startsWith(year) ? built : `${year}-01-01`),
        images: (await mapLimit(srcs, 4, async src => ({ src, ...(await imageSize(src)) }))).filter(i => i?.width),
      }
    })

    return rows
      .filter(Boolean)
      .sort((a, b) => b.date.localeCompare(a.date) || rank(a.slug) - rank(b.slug))
      .map(({ slug, ...row }) => row)
  },
}
