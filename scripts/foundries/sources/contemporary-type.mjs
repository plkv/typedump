import { fetchJSON, mapLimit } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// Contemporary Type is a shop selling families from many small foundries. The
// site is Nuxt over a JSON backend: /api_front/products lists every family in
// the shop, one record per family page. A family page shows a carousel of the
// foundry's pictures (originals on the backend, no sized variants) and live
// testers; some families have no pictures at all.
//
// The per-family API record, and the Nuxt payload at the end of the page, carry
// every style's font as base64, up to 10 MB for a large family. The carousel is
// rendered in the HTML before that payload, so a page is read only up to it.
//
// Each record has `created`, the day the shop added the family. That is the
// shop's listing date, not the foundry's own release, which the site doesn't
// state; families published before the shop opened in late 2024 land on their
// listing day. `approved_date` moves when a family is re-approved after an
// update, so it is not used.
const SITE = 'https://contemporarytype.com'
const API = 'https://backend.contemporarytype.com/api_front/'
const PAYLOAD = 'id="__NUXT_DATA__"'

async function pageHead(url) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 25000)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let html = ''
    while (!html.includes(PAYLOAD)) {
      const { done, value } = await reader.read()
      if (done) break
      html += decoder.decode(value, { stream: true })
    }
    await reader.cancel()
    return html.slice(0, html.indexOf(PAYLOAD))
  } finally {
    clearTimeout(t)
  }
}

// The carousel repeats its slides for looping; Set keeps the first pass.
function pictures(html) {
  const srcs = [...html.matchAll(/<img[^>]+src="(https:\/\/backend\.contemporarytype\.com\/files\/images\/[^"]+)"/g)]
    .map(m => m[1])
    .filter(src => /\.(jpe?g|png|gif|webp)$/i.test(src))
  return [...new Set(srcs)]
}

export default {
  id: 'contemporary-type',
  label: 'Contemporary Type',
  url: SITE,
  async run({ maxImages }) {
    const { products } = await fetchJSON(`${API}products`)
    return mapLimit(products, 4, async ({ Product: p }) => {
      const url = `${SITE}/fonts/${p.slug}`
      const srcs = pictures(await pageHead(url)).slice(0, maxImages)
      const images = await mapLimit(srcs, 4, async src => ({ src, ...(await imageSize(src)) }))
      return {
        name: p.title,
        url,
        date: p.created.slice(0, 10),
        images: images.filter(i => i.width),
      }
    })
  },
}
