import { fetchJSON } from '../../discover/lib.mjs'

// Type Department is a Shopify store selling families from many independent
// designers, one product per family. The "Browse all fonts" collection is the
// catalogue, and its products.json returns each product with its media in
// pages of 250, so the product pages, which Shopify rate-limits hard (429 with
// Retry-After: 60 after a short burst), are never read. A product's media are
// the square specimen and mock-up pictures its page shows, with their sizes.
// Free families are listed as "Arose (Free)"; the label is dropped.
//
// The date is the product's created_at, the day the shop added the family; its
// published_at moves whenever a batch is republished. About 80 products were
// created on one day in December 2023 when the store was rebuilt, so a day on
// which many products were created is an import, not a release, and those get
// no date.
const SITE = 'https://type-department.com'
const COLLECTION = `${SITE}/collections/browse-all-fonts/products.json`
const WIDTH = 1200
const IMPORT = 10

const sleep = ms => new Promise(r => setTimeout(r, ms))

// A refused request waits 5, then 10 seconds; past that the run fails and the
// crawler keeps the last rows.
async function page(n) {
  for (let attempt = 1; ; attempt++) {
    try {
      return (await fetchJSON(`${COLLECTION}?limit=250&page=${n}`)).products
    } catch (e) {
      if (e.message !== 'HTTP 429' || attempt === 3) throw e
      await sleep(attempt * 5000)
    }
  }
}

async function catalogue() {
  const all = []
  for (let n = 1; ; n++) {
    const products = await page(n)
    all.push(...products)
    if (products.length < 250) return all
  }
}

// GIFs keep their size: Shopify's resizer would flatten the animation.
function image({ src, width, height }) {
  const url = new URL(src)
  if (url.pathname.endsWith('.gif') || width <= WIDTH) return { src: url.href, width, height }
  url.searchParams.set('width', WIDTH)
  return { src: url.href, width: WIDTH, height: Math.round((height * WIDTH) / width) }
}

export default {
  id: 'type-department',
  label: 'Type Department',
  url: SITE,
  async run({ maxImages }) {
    const products = await catalogue()
    const perDay = {}
    for (const p of products) perDay[p.created_at.slice(0, 10)] = (perDay[p.created_at.slice(0, 10)] || 0) + 1
    return products.map(p => {
      const day = p.created_at.slice(0, 10)
      return {
        name: p.title.replace(/\s*\(Free\)\s*$/i, '').replace(/\s+/g, ' ').trim(),
        url: `${SITE}/products/${p.handle}`,
        date: perDay[day] < IMPORT ? day : null,
        images: p.images.slice(0, maxImages).map(image),
      }
    })
  },
}
