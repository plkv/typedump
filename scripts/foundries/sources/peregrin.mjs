import { fetchText, mapLimit } from '../../discover/lib.mjs'

// Peregrin Studio's site is WordPress with the Semplice theme, rendered on the
// server. The Typefaces page is a portfolio grid with one tile per retail family;
// each tile links the family's project page. A project page is a cover (its
// picture sits in data-src), image and gallery modules, and section backgrounds
// set in the page's CSS. The "next project" tiles at the foot show the other
// families and are skipped, as are SVG modules. Pictures are on Jetpack's CDN
// (i0.wp.com), whose ?fit=W,H gives the original size and ?w= resizes.
//
// The date is datePublished of the project page in Yoast's JSON-LD: the day
// the page went up, which is when the family was released.
const SITE = 'https://peregrinstudio.com'
const WIDTH = 1400
const RASTER = /\.(jpe?g|png|gif|webp)$/i

function families(html) {
  return [...html.matchAll(/<a href="(https:\/\/peregrinstudio\.com\/work\/[^"]+)">\s*<div class="thumb-inner">[\s\S]*?<span class="title"[^>]*>([^<]+)<\/span>/g)].map(
    m => ({ url: m[1], name: m[2].trim().replace(/ Family$/, '') }),
  )
}

function sized(raw) {
  const url = new URL(raw.replace(/&amp;/g, '&').replace(/&#038;/g, '&'))
  if (!RASTER.test(url.pathname)) return null
  const fit = (url.searchParams.get('fit') || '').split(',').map(Number)
  if (fit.length !== 2 || !fit[0] || !fit[1]) return null
  if (url.pathname.endsWith('.gif') || fit[0] <= WIDTH) return { src: url.href, width: fit[0], height: fit[1] }
  url.searchParams.delete('fit')
  url.searchParams.set('w', WIDTH)
  return { src: url.href, width: WIDTH, height: Math.round((fit[1] * WIDTH) / fit[0]) }
}

// Section backgrounds live in the page's CSS keyed by section id; they are put
// back where their section opens so the pictures keep page order.
function pictures(html) {
  const backgrounds = new Map(
    [...html.matchAll(/#(section_\w+)\s*\{[^}]*?background-image:\s*url\(([^)]+)\)/g)].map(m => [m[1], m[2]]),
  )
  const body = html.slice(html.indexOf('<div id="content-'))
  const seen = new Set()
  return [...body.matchAll(/<section id="(section_\w+)"|<div class="cover-image-wrapper[^"]*" data-src="([^"]+)"|<img\b([^>]*)>/g)]
    .map(m => {
      if (m[1]) return backgrounds.get(m[1])
      if (m[2]) return m[2]
      if (/class="sp-thumbnail"/.test(m[3])) return null
      return (m[3].match(/\ssrc="([^"]+)"/) || [])[1]
    })
    .filter(src => src && src.startsWith('https://i0.wp.com/'))
    .map(sized)
    .filter(img => img && !seen.has(img.src) && seen.add(img.src))
}

export default {
  id: 'peregrin',
  label: 'Peregrin Studio',
  url: SITE,
  async run({ maxImages }) {
    const index = await fetchText(`${SITE}/typefaces`)
    return mapLimit(families(index), 4, async ({ url, name }) => {
      const html = await fetchText(url)
      const published = (html.match(/"datePublished":"(\d{4}-\d\d-\d\d)/) || [])[1]
      return { name, url, date: published ?? null, images: pictures(html).slice(0, maxImages) }
    })
  },
}
