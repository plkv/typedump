import { fetchText, mapLimit } from '../../discover/lib.mjs'

// basement.studio's foundry is a Next.js (pages router) site over Contentful,
// and every page ships its Contentful entry in __NEXT_DATA__. The homepage
// lists the typefaces; a typeface page's content is a run of blocks, mostly
// live text, with a few ImageBlocks among them (some nested in DoubleBlocks),
// each with a desktop image and an optional mobile cut that repeats it. The
// OG card is the family's own picture too and goes last. Contentful assets come
// with their size, and its image API resizes on request; GIFs are left whole.
//
// Each typeface has a releaseDate field. Some are exact to the day, others are
// set to the 1st of the month (Basement Grotesque 2020-05-01), so treat them as
// month-exact.
const SITE = 'https://foundry.basement.studio'
const WIDTH = 1400
const RASTER = /^image\/(jpeg|png|gif|webp)$/

function nextData(html) {
  return JSON.parse(html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s)[1]).props.pageProps
}

function imageBlocks(node) {
  if (Array.isArray(node)) return node.flatMap(imageBlocks)
  if (!node || typeof node !== 'object') return []
  if (node.__typename === 'ImageBlock') return node.image ? [node.image] : []
  return Object.values(node).flatMap(imageBlocks)
}

function sized(asset) {
  const src = asset.url.startsWith('//') ? `https:${asset.url}` : asset.url
  if (asset.contentType === 'image/gif' || asset.width <= WIDTH) {
    return { src, width: asset.width, height: asset.height }
  }
  return { src: `${src}?w=${WIDTH}`, width: WIDTH, height: Math.round((asset.height * WIDTH) / asset.width) }
}

export default {
  id: 'basement',
  label: 'Basement Foundry',
  url: SITE,
  async run({ maxImages }) {
    const { fonts } = nextData(await fetchText(SITE))
    return mapLimit(fonts, 4, async ({ slug }) => {
      const url = `${SITE}/fonts/${slug}`
      const font = nextData(await fetchText(url))
      const assets = [...imageBlocks(font.pageContentCollection), font.ogImage]
        .filter(a => a?.url && RASTER.test(a.contentType) && a.width && a.height)
      const seen = new Set()
      return {
        name: font.name,
        url,
        date: font.releaseDate?.slice(0, 10) ?? null,
        images: assets.filter(a => !seen.has(a.url) && seen.add(a.url)).slice(0, maxImages).map(sized),
      }
    })
  },
}
