import { fetchText, mapLimit } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// Monotype bought Milieu Grotesque in 2023 and milieugrotesque.com now redirects
// to the foundry's premium page on MyFonts, which is what this reads. The page
// links each family's collection page ("Patron Font Family") and has a carousel
// per family of the foundry's own specimens, each slide a link to the family
// followed by a CMS picture in several sizes. A collection page adds a gallery
// served from MyFonts' image CDN; the family's pictures share a file prefix
// with its og:image, which keeps out the foundry logo and other families.
//
// MyFonts answers bursts with 429 local_rate_limited, so its pages are read one
// at a time and a refused one is tried twice more a few seconds later. The
// image hosts are not limited the same way.
//
// Nothing on MyFonts states a release date: the collections and products were
// created when the catalogue moved over in 2023, and the original site with its
// dates is gone. The date is null.
const SITE = 'https://www.myfonts.com'
const PAGE = `${SITE}/a/font/premium-font-collections/milieu-grotesque`
const CMS = 'https://cms.myfonts.com/sites/default/files/styles/1440_x_720/public/'
const CDN = 'https://cdn.myfonts.net/cdn-cgi/image/width=1600,fit=scale-down/'

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function page(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetchText(url)
    } catch (e) {
      if (e.message !== 'HTTP 429' || attempt === 3) throw e
      await sleep(attempt * 5000)
    }
  }
}

function families(html) {
  const seen = new Set()
  return [...html.matchAll(/href="https:\/\/www\.myfonts\.com\/collections\/([a-z0-9-]+)"[^>]*aria-label="(.+?) Font Family"/g)]
    .map(m => ({ handle: m[1], name: m[2] }))
    .filter(f => !seen.has(f.handle) && seen.add(f.handle))
}

function specimens(html) {
  return html
    .split('href="https://www.myfonts.com/collections/')
    .slice(1)
    .map(chunk => ({
      handle: chunk.slice(0, chunk.indexOf('"')),
      path: (chunk.match(/cms\.myfonts\.com\/sites\/default\/files\/styles\/1440_x_720\/public\/([^"?\s]+\.(?:png|jpe?g|gif))/) || [])[1],
    }))
    .filter(s => s.path)
}

function gallery(html) {
  const og = (html.match(/property="og:image" content="[^"]*\/(images\/pim\/\d+\/[A-Za-z0-9]+_)/) || [])[1]
  if (!og) return []
  const paths = [...html.matchAll(/\/(images\/pim\/\d+\/[A-Za-z0-9]+_[^"'?\s]+\.(?:png|jpe?g|gif|webp))/g)].map(m => m[1])
  return [...new Set(paths.filter(p => p.startsWith(og)))].map(p => CDN + p)
}

export default {
  id: 'milieu-grotesque',
  label: 'Milieu Grotesque',
  url: PAGE,
  async run({ maxImages }) {
    const premium = await page(PAGE)
    const shown = specimens(premium)
    return mapLimit(families(premium), 1, async ({ handle, name }) => {
      const url = `${SITE}/collections/${handle}`
      const own = shown.filter(s => s.handle === handle).map(s => CMS + s.path)
      const srcs = [...new Set([...own, ...gallery(await page(url).catch(() => ''))])].slice(0, maxImages)
      return {
        name,
        url,
        date: null,
        images: (await mapLimit(srcs, 2, async src => ({ src, ...(await imageSize(src)) }))).filter(i => i.width && i.height),
      }
    })
  },
}
