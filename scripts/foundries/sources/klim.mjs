import { fetchJSON, fetchText, mapLimit } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// Klim's site is Gatsby; every page has its data at /page-data/<path>/page-data.json.
// The fonts index links one page per retail family (Söhne Mono and Söhne Breit
// are sold apart); collections bundle them and custom fonts are commissions,
// so neither is read. A family's data names its specimen picture (seoImage),
// the in-use posts featuring it and its collection's "design information"
// post. The pictures are the specimen, the hero of the design information post,
// then every picture in the in-use posts. The design post's other pictures are
// mostly the historical sources the design came from, not the family, and are
// left out. Pictures are served by imgix, which resizes on request and converts
// AVIF originals; GIFs are left whole so they keep moving.
//
// Each family has a release field, the day it went on sale.
const SITE = 'https://klim.co.nz'
const IMGIX = 'https://klim.imgix.net/'
const WIDTH = 1400
const RASTER = /\.(jpe?g|png|gif|webp|avif)$/i

const pageData = path => fetchJSON(`${SITE}/page-data${path}page-data.json`).then(j => j.result.pageContext)

function image({ file, width, height }) {
  if (file.endsWith('.gif')) return { src: IMGIX + file, width, height }
  const w = Math.min(width, WIDTH)
  const format = file.endsWith('.avif') ? '&fm=jpg' : ''
  return { src: `${IMGIX}${file}?w=${w}&fit=max${format}`, width: w, height: Math.round((height * w) / width) }
}

// Every {file, width, height} in a post body, in page order.
function bodyImages(node) {
  if (Array.isArray(node)) return node.flatMap(bodyImages)
  if (!node || typeof node !== 'object') return []
  if (typeof node.file === 'string') return RASTER.test(node.file) && node.width && node.height ? [node] : []
  return Object.values(node).flatMap(bodyImages)
}

export default {
  id: 'klim',
  label: 'Klim Type Foundry',
  url: SITE,
  async run({ maxImages }) {
    const index = await fetchText(`${SITE}/fonts/`)
    const paths = [...new Set([...index.matchAll(/href="(\/fonts\/[^"/]+\/)"/g)].map(m => m[1]))]
    const posts = new Map()
    const post = path => {
      if (!posts.has(path)) posts.set(path, pageData(path).catch(() => null))
      return posts.get(path)
    }
    return mapLimit(paths, 4, async path => {
      const { fontFamily: f } = await pageData(path)
      const design = f.fontFamilyGroup?.designInformationPage?.slug
      // One request at a time per family keeps the whole run at four.
      const [info, ...inUse] = await mapLimit(
        [design && `/blog/${design}/`, ...(f.featuredInUsePosts || []).map(p => `/in-use/${p.slug}/`)],
        1,
        p => p && post(p),
      )
      const seo = f.seoImage ? `${IMGIX}${f.seoImage}?w=${WIDTH}&fit=max` : null
      const seoSize = seo && (await imageSize(seo))
      const files = [
        ...bodyImages(info?.blogPost?.hero?.map(h => h.landscapeImage)),
        ...inUse.flatMap(p => bodyImages(p?.inUsePostPage?.body)),
      ]
      const seen = new Set()
      return {
        name: f.name,
        url: SITE + path,
        date: f.release || null,
        images: [
          ...(seoSize ? [{ src: seo, ...seoSize }] : []),
          ...files.filter(i => !seen.has(i.file) && seen.add(i.file)).map(image),
        ].slice(0, maxImages),
      }
    })
  },
}
