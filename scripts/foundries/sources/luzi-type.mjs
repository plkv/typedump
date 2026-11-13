import { fetchText, mapLimit } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// Luzi Type's site is hand-written static HTML. The typeface menu on every page
// lists the retail families once each, linking pages outside /shop/, which
// robots.txt keeps crawlers out of. A typeface page is mostly live type: its own
// pictures are the share image (a PNG specimen) and a tall AVIF specimen, and
// further down it links blog posts about the typeface (its design story and
// projects that use it) through teaser thumbnails, which are skipped. The posts
// hold the photographs and scans, older ones as JPEG and PNG, newer ones as AVIF.
//
// AVIF is kept: sharp and Vision both read it, and dropping it would leave the
// newer families with the share image alone. imageSize does not parse it, so its
// size is read here from the ispe box, the largest one being the whole picture
// when it is stored as a grid of tiles.
//
// Nothing on the site dates a typeface: no release year on the pages, undated
// posts, and every image file was rewritten on the same day in March 2026, so
// the date stays null.
//
// The server stalls connections when pressed, so at most four requests are in
// flight; a size that does not arrive within 20 seconds drops its picture.
const SITE = 'https://luzi-type.ch'
const RASTER = /\.(jpe?g|png|gif|webp|avif)$/i

const decode = s => s.replace(/&thinsp;/g, ' ').replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é').replace(/&amp;/g, '&')

function typefaces(html) {
  const menu = html.slice(html.indexOf('<div class="mmw">'))
  return [...menu.slice(0, menu.indexOf('</div>')).matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)]
    .map(m => ({ url: `${SITE}/${m[1]}`, name: decode(m[2]).trim() }))
}

function shareImage(html) {
  const src = (html.match(/<meta property="og:image" content="([^"]+)"/) || [])[1]
  return src ? [{ src }] : []
}

function posts(html) {
  return [...new Set([...html.matchAll(/<a href="([^"#]+)">\s*<img class="hilimg/g)].map(m => new URL(m[1], `${SITE}/`).href))]
}

function pictures(html) {
  return [...html.matchAll(/<img\b[^>]*>/g)]
    .map(m => {
      const src = (m[0].match(/\s(?:data-)?src="([^"]+)"/) || [])[1]
      if (!src || !RASTER.test(src) || /\/_preview\/|_Preview\.|Similar_Typeface/.test(src)) return null
      const w = m[0].match(/\swidth="(\d+)"/)
      const h = m[0].match(/\sheight="(\d+)"/)
      return { src: new URL(src, `${SITE}/`).href, ...(w && h ? { width: +w[1], height: +h[1] } : {}) }
    })
    .filter(Boolean)
}

async function avifSize(url) {
  try {
    const res = await fetch(url, { headers: { Range: 'bytes=0-65535' }, signal: AbortSignal.timeout(20000) })
    if (!res.ok) return null
    const b = new Uint8Array(await res.arrayBuffer())
    const v = new DataView(b.buffer)
    let best = null
    for (let i = 4; i + 16 <= b.length; i++) {
      if (b[i] !== 0x69 || b[i + 1] !== 0x73 || b[i + 2] !== 0x70 || b[i + 3] !== 0x65) continue
      const size = { width: v.getUint32(i + 8), height: v.getUint32(i + 12) }
      if (!best || size.width * size.height > best.width * best.height) best = size
    }
    return best
  } catch {
    return null
  }
}

const measure = src => (/\.avif$/i.test(src) ? avifSize(src) : imageSize(src))

// One retry after a short pause covers a dropped connection; a page that fails
// twice is skipped (a post) or drops its typeface.
async function page(url) {
  try {
    return await fetchText(url)
  } catch {
    await new Promise(r => setTimeout(r, 3000))
    return fetchText(url)
  }
}

export default {
  id: 'luzi-type',
  label: 'Luzi Type',
  url: SITE,
  async run({ maxImages }) {
    const index = await page(`${SITE}/typefaces`)
    return mapLimit(typefaces(index), 2, async ({ url, name }) => {
      const html = await page(url)
      const linked = await mapLimit(posts(html), 1, async post => pictures(await page(post)))
      const seen = new Set()
      const pics = [...shareImage(html), ...pictures(html), ...linked.flat().filter(Boolean)]
        .filter(p => !seen.has(p.src) && seen.add(p.src))
        .slice(0, maxImages)
      const images = await mapLimit(pics, 2, async p => (p.width ? p : { src: p.src, ...(await measure(p.src)) }))
      return { name, url, date: null, images: images.filter(i => i.width) }
    })
  },
}
