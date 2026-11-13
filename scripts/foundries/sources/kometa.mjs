import { fetchText, mapLimit } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// Kometa moved from kometa.xyz to kometatype.com, a prerendered Nuxt site over
// Craft. The typefaces index links one page per family. A family page is a
// gallery of photographed specimens (/images/product/webp/) with vector type
// layers on top (/images/product/svg/), all behind Cloudflare's image resizer.
// The photographs are preloaded in the page head in gallery order; a picture
// shared by two families (labil-stabil-1) belongs to both. The resizer serves
// JPEG to a client that doesn't ask for WebP. The SVG layers are skipped.
//
// Each page states its version as "1.3 (Conceived 08/2018, Released 02/2019,
// Updated 03/2026)", so the date is the first of the release month.
const SITE = 'https://kometatype.com'
const WIDTH = 1600

function families(html) {
  return [...html.matchAll(/href="\/typefaces\/([a-z0-9-]+)"[^>]*aria-label="View (.+?) Typeface"/g)]
    .map(m => ({ slug: m[1], name: m[2] }))
}

function pictures(html) {
  const paths = [...html.matchAll(/\/cdn-cgi\/image\/[^/]+\/(images\/product\/[^"?, ]+\.(?:jpe?g|png|gif|webp))/g)].map(m => m[1])
  return [...new Set(paths)].map(path => `${SITE}/cdn-cgi/image/w=${WIDTH}/${path}`)
}

function releaseDate(html) {
  const m = html.match(/Released (\d{2})\/(\d{4})/)
  return m ? `${m[2]}-${m[1]}-01` : null
}

export default {
  id: 'kometa',
  label: 'Kometa',
  url: SITE,
  async run({ maxImages }) {
    const index = await fetchText(`${SITE}/typefaces`)
    return mapLimit(families(index), 4, async ({ slug, name }) => {
      const url = `${SITE}/typefaces/${slug}`
      const html = await fetchText(url)
      const srcs = pictures(html).slice(0, maxImages)
      return {
        name,
        url,
        date: releaseDate(html),
        images: (await mapLimit(srcs, 4, async src => ({ src, ...(await imageSize(src)) }))).filter(i => i.width && i.height),
      }
    })
  },
}
