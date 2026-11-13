import { fetchText, mapLimit } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// Optimo's site is server-rendered (Rails, GrayMatter CMS). The typefaces menu
// lists one page per family; "Pan" pages add Cyrillic and Greek to a family
// listed on its own, and Plain Arabic is Plain in another script, so both are
// skipped. A typeface page is a stack of specimen pictures, each given as a
// desktop and a mobile file; most are SVG, which is skipped, so many families
// have no raster picture of their own. The page also links the articles about
// the family (reviews, its history, it in use), whose photographs are added.
// The OpenType panel's PNGs are the same feature diagrams on every page and are
// left out.
//
// Uploads sit under /uploads/MMYY/<hash>/ and a resized copy under
// derived/<preset>/; a picture shown at two sizes has two presets, and the one
// nearest 1600px wide is kept.
//
// Nothing states a release date. The earliest upload month among a family's
// own specimen pictures dates it to the month. The site was rebuilt in 2019 and
// every older family's pictures were uploaded then, so a month before 2020 says
// nothing and the date is left empty.
const SITE = 'https://optimo.ch'
const UPLOAD = /\/uploads\/(\d\d)(\d\d)\/([0-9a-f]{64})\/(?:derived\/[0-9a-f]+\/)?[^"]+/
const RASTER = /\.(jpe?g|png|gif|webp)$/i
const SCRIPTS = / (Pan|Arabic)$/

function families(html) {
  const all = [...html.matchAll(/class="collection_link" href="\/typefaces\/([^"]+)"><span class="menu_label">([^<]+)</g)]
    .map(m => ({ slug: m[1], name: m[2].trim() }))
  const names = new Set(all.map(f => f.name))
  return all.filter(f => !(SCRIPTS.test(f.name) && names.has(f.name.replace(SCRIPTS, ''))))
}

// Uploads in page order, each with every resized copy the page uses.
function uploads(srcs) {
  const byHash = new Map()
  for (const src of srcs) {
    const m = src.match(UPLOAD)
    if (!m || !RASTER.test(src)) continue
    if (!byHash.has(m[3])) byHash.set(m[3], [])
    byHash.get(m[3]).push(new URL(src, SITE).href)
  }
  return [...byHash.values()].map(v => [...new Set(v)])
}

async function pick(variants) {
  const sized = (await mapLimit(variants, 2, async src => ({ src, ...(await imageSize(src)) }))).filter(i => i?.width)
  const fits = sized.filter(i => i.width <= 1600).sort((a, b) => b.width - a.width)
  return fits[0] || sized.sort((a, b) => a.width - b.width)[0] || null
}

function releaseDate(own) {
  const months = own
    .map(src => src.match(UPLOAD))
    .filter(Boolean)
    .map(m => `20${m[2]}-${m[1]}`)
    .sort()
  return months[0] && months[0] >= '2020' ? `${months[0]}-01` : null
}

export default {
  id: 'optimo',
  label: 'Optimo',
  url: SITE,
  async run({ maxImages }) {
    const index = await fetchText(`${SITE}/typefaces`)
    return mapLimit(families(index), 2, async ({ slug, name }) => {
      const url = `${SITE}/typefaces/${slug}`
      const html = await fetchText(url)
      const own = [...html.matchAll(/<img class="(?:desktop|mobile)" src="([^"]+)"/g)].map(m => m[1])
      const desktop = [...html.matchAll(/<img class="desktop" src="([^"]+)"/g)].map(m => m[1])
      const articles = [...new Set([...html.matchAll(/href="(\/articles\/[^"/]+)"/g)].map(m => m[1]))]
      const posts = await mapLimit(articles, 1, async path => {
        const page = await fetchText(SITE + path)
        return [...page.matchAll(/<img\b[^>]*\ssrc="([^"]+)"/g)].map(m => m[1])
      })
      const candidates = uploads([...desktop, ...posts.flat().filter(Boolean)]).slice(0, maxImages)
      return {
        name,
        url,
        date: releaseDate(own),
        images: (await mapLimit(candidates, 1, pick)).filter(Boolean),
      }
    })
  },
}
