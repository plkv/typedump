import { fetchJSON } from '../../discover/lib.mjs'

// ALT.tf's site is a Shopify store with one product per retail family. The
// storefront's products.json returns every product with its media in a single
// request, so the product pages, which Shopify rate-limits hard (429 with
// Retry-After: 60 after a short burst), are never read. A product's media are
// the specimen and mock-up pictures its page opens with, with their sizes; the
// theme's font tester below them is live type. A script version of a family
// (ALT Riviera عربي) is its own product and is skipped as a duplicate.
//
// The date is the product's published_at, when it went on sale: products are
// drafted weeks to years ahead (ALT Rigatoni was created in January 2024 and
// published in May 2026), so created_at is too early. Shopify resets
// published_at when a product is unpublished and published again.
const SITE = 'https://alt-tf.com'
const WIDTH = 1200

const sleep = ms => new Promise(r => setTimeout(r, ms))

// A refused request waits 5, then 10 seconds; past that the run fails and the
// crawler keeps the last rows.
async function products() {
  for (let attempt = 1; ; attempt++) {
    try {
      return (await fetchJSON(`${SITE}/products.json?limit=250`)).products
    } catch (e) {
      if (e.message !== 'HTTP 429' || attempt === 3) throw e
      await sleep(attempt * 5000)
    }
  }
}

const latin = name => name.replace(/[^\p{Script=Latin}\p{N}\s.]/gu, '').trim()

// GIFs keep their size: Shopify's resizer would flatten the animation.
function image({ src, width, height }) {
  const url = new URL(src)
  if (url.pathname.endsWith('.gif') || width <= WIDTH) return { src: url.href, width, height }
  url.searchParams.set('width', WIDTH)
  return { src: url.href, width: WIDTH, height: Math.round((height * WIDTH) / width) }
}

export default {
  id: 'alt-tf',
  label: 'ALT.tf',
  url: SITE,
  async run({ maxImages }) {
    const list = (await products()).filter(p => p.product_type === 'Font')
    const names = new Set(list.map(p => p.title))
    return list
      .filter(p => latin(p.title) === p.title || !names.has(latin(p.title)))
      .map(p => ({
        name: p.title,
        url: `${SITE}/products/${p.handle}`,
        date: p.published_at.slice(0, 10),
        images: p.images.slice(0, maxImages).map(image),
      }))
  },
}
