import { fetchJSON, mapLimit } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// Future Fonts (futurefonts.xyz, now futurefonts.com) is a React app over a
// public Rails JSON API at /api/v1/. The typeface list takes the same sort the
// catalogue's "Last Updated" option sends, so one request returns the 60
// families whose latest version went live most recently, each with its
// foundry, which on this marketplace is the designer. A family's pictures are
// the slideshow of its current version (typeface_versions/:id?include=slides)
// followed by the journal posts written about it: a cover and image sections.
//
// Uploads sit on S3 with fixed variants beside the original; "large" is 1200px
// wide. GIFs get no variants, so they are taken as uploaded.
//
// The date is when the current version went live: the release for a v0.1
// family, the latest update for one that has had versions since.
const SITE = 'https://www.futurefonts.com'
const API = `${SITE}/api/v1/`
const LIMIT = 60

const isGif = url => /\.gif$/i.test(url)

// "orginal" is the API's own spelling.
function variant(image) {
  const src = image?.orginal
  if (!src) return null
  return { src: isGif(src) ? src : image.large || src, original: src }
}

async function posts(id) {
  const params = new URLSearchParams({ postable_type: 'Typeface', postable_id: id, status: 'live' })
  const { posts } = await fetchJSON(`${API}posts?${params}`)
  return posts.flatMap(p => [
    p.cover_image_present ? p.cover_image : null,
    ...(p.post_sections || []).filter(s => s.content_type === 'image').map(s => s.image),
  ])
}

// Older uploads can lack a variant; the original stands in for it.
async function sized({ src, original }) {
  for (const url of new Set([src, original])) {
    const size = await imageSize(url)
    if (size) return { src: url, ...size }
  }
  return null
}

export default {
  id: 'future-fonts',
  label: 'Future Fonts',
  url: SITE,
  async run({ maxImages }) {
    const params = new URLSearchParams({
      sort: 'last_version_live_at DESC',
      status: 'in-progress,finished',
      limit: LIMIT,
    })
    const { typefaces } = await fetchJSON(`${API}typefaces?${params}`)
    return mapLimit(typefaces.filter(t => t.current_version), 4, async t => {
      const { typeface_version: v } = await fetchJSON(`${API}typeface_versions/${t.current_version.id}?include=slides`)
      const slides = [...(v.slides || [])].sort((a, b) => a.position - b.position).map(s => s.image)
      const journal = t.posts_count ? await posts(t.id) : []
      const seen = new Set()
      const picks = [...slides, ...journal]
        .map(variant)
        .filter(p => p && !seen.has(p.original) && seen.add(p.original))
        .slice(0, maxImages)
      const images = await mapLimit(picks, 4, sized)
      return {
        name: `${t.name.trim()} by ${t.foundry.name.trim()}`,
        url: t.url,
        date: v.live_at ? v.live_at.slice(0, 10) : null,
        images: images.filter(Boolean),
      }
    })
  },
}
