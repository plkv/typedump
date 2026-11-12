import { fetchJSON, mapLimit } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// Grilli Type's site is an Angular app over a public JSON API. Each typeface
// carries the date its record was created, which matches the release, and four
// pictures: the minisite and specimen covers, each as a still and a GIF. The
// rest comes from its "in use" posts, whose bodies are HTML with full-size
// images. The GIF stands in for its still; showing both repeats the picture.
const API = 'https://www.grillitype.com/api/v1/'
const SITE = 'https://www.grillitype.com'

async function inUseImages(post) {
  try {
    const j = await fetchJSON(`${API}blogs/${post.category}/${post.slug}`)
    return [...(j.html || '').matchAll(/<img[^>]+src="([^"]+)"/g)].map(m => new URL(m[1], `${SITE}/`).href)
  } catch {
    return []
  }
}

export default {
  id: 'grilli',
  label: 'Grilli Type',
  url: SITE,
  async run({ maxImages }) {
    // Collections (GT America Intl) bundle families listed on their own and
    // have no typeface record behind them.
    const list = (await fetchJSON(`${API}typefaces`)).filter(t => t.type === 'family')
    return mapLimit(list, 4, async ({ page }) => {
      const t = await fetchJSON(`${API}typefaces/${page}`)
      const covers = [t.images?.minisite, t.images?.pdf]
        .filter(Boolean)
        .map(i => i.img_gif || i.img)
      const posts = await mapLimit(t.blogs || [], 4, inUseImages)
      const srcs = [...new Set([...covers, ...posts.flat()])].slice(0, maxImages)
      return {
        name: t.family.name,
        url: `${SITE}/typeface/${page}`,
        date: t.family.created_at.slice(0, 10),
        images: await mapLimit(srcs, 6, async src => ({ src, ...(await imageSize(src)) })),
      }
    })
  },
}
