import { fetchText, mapLimit, parseSitemap } from '../../discover/lib.mjs'

// Groteskly Yours Studio's site is Framer. The sitemap lists every typeface
// page under /fonts/<slug>; the /fonts page shows only a selection, and the
// family pages (/resist-family, ...) group typefaces that have their own page.
// A typeface page is cut into sections with ids: #specimen (the poster
// carousel), #references (development pictures), #fontinuse (photos of the
// typeface in use), then #articles (cards of blog posts) and #pairings (links
// to other typefaces). Everything before #articles belongs to the typeface; the
// alt texts do not always (Arlen's posters carry GYS Pixels captions), so the
// section is the test. Framer repeats each image once per breakpoint and writes
// an uploaded picture's size into its URL, which serves the original without
// the query; the only images without a size are the carousel's arrow icons.
//
// Specs read "Released: July 2026" for recent typefaces and "Released: 2022"
// for older ones; the HTML comment "Published …" is the site build, not that.
const SITE = 'https://groteskly.xyz'
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

function released(html) {
  const [, month, year] = html.match(/>Released<\/\w+>(?:<[^>]+>)*\s*(?:([A-Za-z]+)\s+)?(\d{4})\s*</) || []
  if (!year) return null
  const m = MONTHS.indexOf((month || '').toLowerCase()) + 1
  return `${year}-${m ? String(m).padStart(2, '0') : '01'}-01`
}

function picture(url) {
  const [src, query] = url.split('?')
  const q = new URLSearchParams(query)
  return q.get('width') ? { src, width: +q.get('width'), height: +q.get('height') } : null
}

export default {
  id: 'groteskly',
  label: 'Groteskly Yours Studio',
  url: SITE,
  async run({ maxImages }) {
    const pages = parseSitemap(await fetchText(`${SITE}/sitemap.xml`))
      .map(e => e.loc)
      .filter(loc => /\/fonts\/[^/]+$/.test(loc))

    return mapLimit(pages, 4, async url => {
      const html = await fetchText(url)
      const start = html.indexOf('id="specimen"')
      const end = html.search(/id="(articles|pairings)"/)
      const seen = new Set()
      const images = [...html.slice(start, end).matchAll(/<img\b[^>]*\bsrc="(https:\/\/framerusercontent\.com\/images\/[^"]+)"/g)]
        .map(m => picture(m[1].replace(/&amp;/g, '&')))
        .filter(i => i && !seen.has(i.src) && seen.add(i.src))
      return {
        name: html.match(/<title>([^<]+?)\s+—/)[1],
        url,
        date: released(html),
        images: images.slice(0, maxImages),
      }
    })
  },
}
