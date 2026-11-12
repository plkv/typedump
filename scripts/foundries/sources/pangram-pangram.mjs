import { fetchText, mapLimit } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// Pangram Pangram's site is a Shopify theme rendered on the server. The footer's
// "All Fonts" list names each retail family once and links its main product;
// the store also holds a product per width or sub-family (agrandir-wide), which
// the list leaves out. A product page is a stack of theme sections: a cover,
// gallery grids, and a carousel of "in use" posts. The carousel shows posts
// tagged with the family when there are any and the latest posts about other
// families otherwise, so it counts only when it links to the family's tag.
// Pairings suggest other families and are skipped.
//
// Products were recreated when the store moved in 2020 and pictures are
// re-uploaded with each redesign, so neither Shopify's dates nor the image
// version stamps say when a family came out. The page's "Latest update: Month
// Year" is the month of the current version: the release for a 1.x family,
// later for one that has been reworked since.
//
// Shopify rate-limits the storefront hard: a burst gets 429 with Retry-After: 60
// and keeps getting it while requests keep coming. Pages are read two at a time
// and a refused one waits and tries again. Images come from the CDN, which is
// not limited.
const SITE = 'https://pangrampangram.com'
const WIDTH = 1200
const SCRIPTS = /\s(Arabic|Cyrillic|Greek|Hebrew|Japanese|Korean|Chinese|Thai|Devanagari)$/

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function page(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetchText(url)
    } catch (e) {
      if (e.message !== 'HTTP 429' || attempt === 6) throw e
      await sleep(attempt * 60000)
    }
  }
}

function families(html) {
  const list = html.slice(html.indexOf('>All Fonts<'))
  const all = [...list.slice(0, list.indexOf('</ul>')).matchAll(/href="\/products\/([^"]+)">([^<]+)</g)]
    .map(m => ({ handle: m[1], name: m[2].trim() }))
  const names = new Set(all.map(f => f.name))
  return all.filter(f => !(SCRIPTS.test(f.name) && names.has(f.name.replace(SCRIPTS, ''))))
}

// GIFs keep their size: Shopify's resizer would flatten the animation.
function sized(src) {
  const url = new URL(src.replace(/&amp;/g, '&'), SITE)
  if (!url.pathname.endsWith('.gif')) url.searchParams.set('width', WIDTH)
  return url
}

function pictures(html) {
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'))
  const seen = new Set()
  return main
    .split('<section id="shopify-section-')
    .slice(1)
    .filter(s => !/^[^"]*__product_pairings/.test(s))
    .filter(s => !/^[^"]*__product_inuse/.test(s) || s.includes('/blogs/font-in-use/tagged/'))
    .flatMap(s => [...s.matchAll(/<img[^>]+src="([^"]+)"/g)].map(m => m[1]))
    .filter(src => /\/cdn\/shop\/(files|articles)\/[^?]+\.(jpe?g|png|gif|webp)\?/i.test(src))
    .map(sized)
    .filter(url => !seen.has(url.pathname) && seen.add(url.pathname))
    .map(url => url.href)
}

function releaseDate(html) {
  const m = html.match(/Latest update:\s*([A-Z][a-z]+)\s+(\d{4})/)
  const d = m && new Date(`1 ${m[1]} ${m[2]} UTC`)
  return d && !isNaN(d) ? d.toISOString().slice(0, 10) : null
}

export default {
  id: 'pangram-pangram',
  label: 'Pangram Pangram',
  url: SITE,
  async run({ maxImages }) {
    const home = await page(`${SITE}/`)
    return mapLimit(families(home), 2, async ({ handle, name }) => {
      const url = `${SITE}/products/${handle}`
      const html = await page(url)
      const srcs = pictures(html).slice(0, maxImages)
      return {
        name,
        url,
        date: releaseDate(html),
        images: await mapLimit(srcs, 4, async src => ({ src, ...(await imageSize(src)) })),
      }
    })
  },
}
