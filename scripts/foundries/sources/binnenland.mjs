import { fetchJSON, mapLimit } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// Binnenland's site is a Nuxt app over a public JSON API (Django REST). /api/fonts
// lists every typeface; one with a parent (Catalog Mono, T-Star TW) is shown on
// its parent's page and is not a family of its own here. A typeface record has
// no pictures of its own: they sit in the home page's slideshow, whose slide
// groups link the typeface they show, and in the "Explore" posts the typeface
// record links (development notes, specimens, in-use and custom-font projects).
// Every uploaded picture has resized copies next to it (name.1200w.jpg, fitted
// into 1200×800), used here for wide originals only: a tall one would shrink
// below the original. GIFs keep their original, the copies are single frames.
//
// The records carry no dates. "Design by" on the page states the year the
// typeface was designed ("Nik Thoenen, 2003 / revised and extended, 2017"), and
// the first year there is the release year; it is given as YYYY-01-01.
const SITE = 'https://binnenland.ch'
const RASTER = /\.(jpe?g|png|gif|webp)$/i

async function sized(src) {
  const size = await imageSize(src)
  if (!size || size.width <= 1600 || size.width / size.height < 1.25 || /\.gif$/i.test(src)) return { src, ...size }
  const copy = src.replace(/\.(\w+)$/, '.1200w.$1')
  const copySize = await imageSize(copy)
  return copySize ? { src: copy, ...copySize } : { src, ...size }
}

function slideTree(slide) {
  return [slide, ...(slide.children || []).flatMap(slideTree)]
}

// A group's link can sit on the top slide or on any of its children.
function homeSlides(index, slug) {
  const own = new RegExp(`^/typeface/${slug}(#|/|$)`)
  return index.slides
    .map(slideTree)
    .filter(group => group.some(s => own.test(s.href || '') || own.test(s.svg_href || '')))
    .flat()
    .filter(s => s.src && RASTER.test(s.src))
    .map(s => new URL(s.src, SITE).href)
}

async function postImages(slug) {
  try {
    const post = await fetchJSON(`${SITE}/api/explore/view/${slug}`)
    const slides = post.content_blocks
      .flatMap(b => b.slides || [])
      .filter(s => s.src && RASTER.test(s.src))
      .map(s => new URL(s.src, SITE).href)
    return [post.feature_image && new URL(post.feature_image, SITE).href, ...slides].filter(Boolean)
  } catch {
    return []
  }
}

function designYear(designBy) {
  const year = (designBy || '').match(/\b(19|20)\d\d\b/)
  return year ? `${year[0]}-01-01` : null
}

export default {
  id: 'binnenland',
  label: 'Binnenland',
  url: SITE,
  async run({ maxImages }) {
    const [fonts, index] = await Promise.all([fetchJSON(`${SITE}/api/fonts/`), fetchJSON(`${SITE}/api/page/index`)])
    return mapLimit(
      fonts.filter(t => !t.parent),
      4,
      async ({ slug, name, design_by }) => {
        const font = await fetchJSON(`${SITE}/api/font/${slug}/`)
        const posts = await mapLimit(font.related_posts || [], 1, p => postImages(p.slug))
        // A post's feature image is often a smaller copy of its first slide, filed
        // under features/ with the same name. Custom-font posts open on the
        // client's logo.
        const seen = new Set()
        const srcs = [...homeSlides(index, slug), ...posts.flat()]
          .filter(src => !/logo/i.test(src.split('/').pop()))
          .filter(src => {
            const key = src.split('/').pop()
            return !seen.has(key) && seen.add(key)
          })
          .slice(0, maxImages)
        const images = await mapLimit(srcs, 1, sized)
        return {
          name,
          url: `${SITE}/typeface/${slug}`,
          date: designYear(design_by),
          images: images.filter(i => i.width),
        }
      },
    )
  },
}
