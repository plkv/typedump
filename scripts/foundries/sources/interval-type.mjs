import { fetchJSON, fetchText, mapLimit } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// Interval Type's site is WordPress (WooCommerce, Bedrock layout) rendered on
// the server. The fonts page is a grid of SVG tiles, each linking either a
// product or a collection page; a collection (Oceanic, Rooftop, Algorytm) is a
// hub of tiles linking its member products and is one typeface here, as the
// grid shows it. A product page holds two sliders, a specimen strip at the top
// and photographs further down, each in a desktop and a mobile cut; the mobile
// cuts repeat the desktop ones and are skipped. Slides are originals of about
// 2500px, light enough to use as they are. A collection's pictures interleave
// its members', so each member shows up within the cap.
//
// Products in the REST API carry the date they were published, which matches
// the upload folder of their files and dates a release to the day. The site
// launched on 2021-05-18 with the families made before it, so those carry the
// launch date: when they were already out, not when they came out.
const SITE = 'https://intervaltype.com'
const API = `${SITE}/wp-json/wp/v2`
const RASTER = /\.(jpe?g|png|gif|webp)$/i

const links = html =>
  [...new Set([...html.slice(html.indexOf('<main'), html.indexOf('</main>')).matchAll(/<a href="(https:\/\/intervaltype\.com\/[^"#]+)"/g)].map(m => m[1]))]
const slug = url => url.match(/\/product\/([^/]+)\//)?.[1]
const title = html => (html.match(/<title>(.+?) &#8211; Interval Type<\/title>/) || [])[1]?.replace(/&amp;/g, '&')

function slides(html) {
  return [...html.matchAll(/<img class="module-slider(?:-font)?-img[^"]*" src="([^"]+)"/g)]
    .filter(m => html.lastIndexOf('show-on-mobile', m.index) <= html.lastIndexOf('hide-on-mobile', m.index))
    .map(m => m[1])
    .filter(src => RASTER.test(src))
}

const interleave = lists => Array.from({ length: Math.max(0, ...lists.map(l => l.length)) }, (_, i) => lists.map(l => l[i])).flat().filter(Boolean)

export default {
  id: 'interval-type',
  label: 'Interval Type',
  url: SITE,
  async run({ maxImages }) {
    const [grid, products] = await Promise.all([
      fetchText(`${SITE}/fonts/`),
      fetchJSON(`${API}/product?per_page=100&_fields=slug,date`),
    ])
    const dates = new Map(products.map(p => [p.slug, p.date.slice(0, 10)]))
    const pages = new Map()
    const page = url => pages.get(url) ?? pages.set(url, fetchText(url)).get(url)
    return mapLimit(links(grid).filter(url => url !== `${SITE}/fonts/`), 4, async url => {
      const html = await page(url)
      const members = slug(url) ? [url] : links(html).filter(slug)
      const pics = await mapLimit(members, 2, async m => slides(await page(m)))
      const srcs = [...new Set(interleave(pics))].slice(0, maxImages)
      const memberDates = members.map(m => dates.get(slug(m))).filter(Boolean).sort()
      const images = await mapLimit(srcs, 4, async src => ({ src, ...(await imageSize(src)) }))
      return {
        name: title(html),
        url,
        date: memberDates[0] ?? null,
        images: images.filter(i => i.width && i.height),
      }
    })
  },
}
