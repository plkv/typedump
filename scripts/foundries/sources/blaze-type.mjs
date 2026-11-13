import { fetchText, mapLimit, parseSitemap } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

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
// The page gives the year alone ("Released in 2026"), so a year's releases
// share a date and keep the order of the /typefaces page, the shop's own.
const SITE = 'https://blazetype.eu'

const ENTITIES = { amp: '&', nbsp: ' ', lt: '<', gt: '>', quot: '"', apos: "'" }

function text(s) {
  return s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&([a-z]+);/g, (m, e) => ENTITIES[e] ?? m).trim()
}

const unique = srcs => [...new Set(srcs)]
const media = (html, folder) => unique([...html.matchAll(new RegExp(`/img/${folder}/[^"'\\s,)]+\\.(?:webp|jpe?g|png|gif)`, 'g'))].map(m => SITE + m[0]))

export default {
  id: 'blaze-type',
  label: 'Blaze Type',
  url: SITE,
  async run({ maxImages }) {
    const locs = parseSitemap(await fetchText(`${SITE}/sitemap-0.xml`)).map(e => e.loc)
    const slugs = locs.map(loc => loc.match(/\/typefaces\/([^/]+)$/)?.[1]).filter(Boolean)
    const posts = new Set(locs.map(loc => loc.match(/\/blog\/([^/]+)$/)?.[1]).filter(Boolean))
    const shop = unique([...(await fetchText(`${SITE}/typefaces`)).matchAll(/href="\/typefaces\/([^"/]+)\/?"/g)].map(m => m[1]))
    const rank = slug => (shop.includes(slug) ? shop.indexOf(slug) : shop.length)

    const rows = await mapLimit(slugs, 4, async slug => {
      const html = await fetchText(`${SITE}/typefaces/${slug}`)
      const year = html.match(/Released in<\/dt>\s*<dd[^>]*>\s*(\d{4})/)?.[1]
      if (!year) return null
      const release = posts.has(slug) ? media(await fetchText(`${SITE}/blog/${slug}`), `blog/${slug}`) : []
      const pictures = [...release, ...media(html, 'fonts-in-use')]
      if (!pictures.length) return null
      const srcs = [...pictures.slice(0, maxImages - 1), `${SITE}/og/typefaces/${slug}.png`]
      return {
        slug,
        name: text(html.match(/&quot;title&quot;:\[0,&quot;(.+?)&quot;\]/)?.[1] ?? slug),
        url: `${SITE}/typefaces/${slug}`,
        date: `${year}-01-01`,
        images: (await mapLimit(srcs, 4, async src => ({ src, ...(await imageSize(src)) }))).filter(i => i?.width),
      }
    })

    return rows
      .filter(Boolean)
      .sort((a, b) => b.date.localeCompare(a.date) || rank(a.slug) - rank(b.slug))
      .map(({ slug, ...row }) => row)
  },
}
