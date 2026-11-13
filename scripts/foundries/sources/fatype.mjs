import { fetchText, mapLimit, normName } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// Fatype's site is server-rendered (Rails). The typefaces index links one page
// per family; a page is a live specimen set in the webfonts, with a PDF
// specimen and, for recent families, a picture or two. Its "Font Info" tab is
// an essay whose pictures (CKEditor uploads, no extension) mix the family's
// own specimens with the photographs that inspired it: Berlin U-Bahn signs for
// U8, a 1970 concept car for UCity. Only Font Info pictures whose file is named
// after the family are kept; the others show someone else's lettering. Neither
// path says the format, so every picture is sized from its bytes and anything
// that isn't PNG, GIF, JPEG or WebP drops out. Most families have no raster
// picture at all and come back empty.
//
// Nothing on the site dates a family: no years in the text, uploads are
// numbered without dates and files carry no Last-Modified. The date is null.
const SITE = 'https://fatype.com'

const srcs = html => [...html.matchAll(/<img\b[^>]*\ssrc="([^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&'))

export default {
  id: 'fatype',
  label: 'Fatype',
  url: SITE,
  async run({ maxImages }) {
    const index = await fetchText(`${SITE}/typefaces`)
    const slugs = [...new Set([...index.matchAll(/href="\/typefaces\/([^"/#?]+)"/g)].map(m => m[1]))]
    return mapLimit(slugs, 2, async slug => {
      const url = `${SITE}/typefaces/${slug}`
      const html = await fetchText(url)
      const info = await fetchText(`${url}/font_info`)
      const name = (html.match(/<title>Fatype - ([^<]+)<\/title>/) || [])[1]?.trim() || slug
      const own = src => normName(decodeURIComponent(src.split('?')[0].split('/').pop())).includes(normName(name))
      const candidates = [...new Set([...srcs(html), ...srcs(info).filter(own)])]
        .filter(src => /^\/(media|uploads)\//.test(src))
        .map(src => new URL(src, SITE).href)
      const sized = await mapLimit(candidates, 2, async src => ({ src, ...(await imageSize(src)) }))
      return {
        name,
        url,
        date: null,
        images: sized.filter(i => i?.width).slice(0, maxImages),
      }
    })
  },
}
