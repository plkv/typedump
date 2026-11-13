import { fetchText, mapLimit, normName } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// Family Type's site is SvelteKit. The homepage's JSON-LD lists every typeface
// page, widths and companions included (Bossa Extended, Universal Sans Text);
// a page whose name extends another listed name is part of that family and is
// dropped. Typeface pages render their specimens as live type, and the gallery
// pictures come from /api/typeface-images/, which robots.txt closes. What stays
// open: the homepage's typeface cards (an <img> whose alt is the family) and the
// paths the typeface route's bundle names for its own media (Fazer's portraits,
// Lanterne's specimen tile). The bundle is reached through the app entry, the
// route table and the route's chunks; a bundle path belongs to the family whose
// name its path contains, as /images/fazer/... or familytype.co_modernera2.png.
// Universal Sans shows only video and Bossa nothing open, so they come back empty.
//
// Each typeface page's JSON-LD gives "releaseDate": "2019", a year only, so the
// date is 1 January of it; pages without one get null.
const SITE = 'https://www.familytype.co'
const RASTER = /\.(jpe?g|png|gif|webp)$/i

function typefaces(html) {
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])
  const list = ld['@graph'].find(n => n['@type'] === 'ItemList').itemListElement.map(i => ({ name: i.name, url: i.url }))
  return list.filter(t => !list.some(o => o !== t && t.name.startsWith(`${o.name} `)))
}

function cards(html) {
  return [...html.matchAll(/<img[^>]+src="(\/images\/[^"]+)"[^>]+alt="([^"]+)"/g)].map(m => ({ path: m[1], alt: m[2] }))
}

async function bundlePaths(html) {
  try {
    const entry = new URL(html.match(/import\("([^"]*\/entry\/app\.[^"]+\.js)"\)/)[1], `${SITE}/`)
    const app = await fetchText(entry.href)
    const node = app.match(/"\/typefaces\/\[slug\]":\[(\d+)\]/)[1]
    const nodeUrl = new URL(app.match(new RegExp(`"(\\.\\./nodes/${node}\\.[\\w-]+\\.js)"`))[1], entry)
    const route = await fetchText(nodeUrl.href)
    const chunks = [...new Set([...route.matchAll(/"(\.\.\/chunks\/[\w-]+\.js)"/g)].map(m => new URL(m[1], nodeUrl).href))]
    const texts = await mapLimit(chunks, 4, fetchText)
    return [...new Set([route, ...texts].flatMap(t => [...(t || '').matchAll(/"(\/images\/[^"]+)"/g)].map(m => m[1])))]
  } catch {
    return []
  }
}

async function releaseDate(url) {
  const year = ((await fetchText(url)).match(/"releaseDate":"(\d{4})"/) || [])[1]
  return year ? `${year}-01-01` : null
}

export default {
  id: 'family-type',
  label: 'Family Type',
  url: SITE,
  async run({ maxImages }) {
    const home = await fetchText(`${SITE}/`)
    const bundle = await bundlePaths(home)
    const homeCards = cards(home)
    return mapLimit(typefaces(home), 4, async ({ name, url }) => {
      const key = normName(name)
      const own = [
        ...homeCards.filter(c => normName(c.alt) === key).map(c => c.path),
        ...bundle.filter(p => normName(p).includes(key)),
      ]
      const srcs = [...new Set(own.filter(p => RASTER.test(p)))].map(p => `${SITE}${p}`).slice(0, maxImages)
      const images = await mapLimit(srcs, 4, async src => ({ src, ...(await imageSize(src)) }))
      return { name, url, date: await releaseDate(url), images: images.filter(i => i.width) }
    })
  },
}
