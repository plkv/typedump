import { fetchJSON } from '../../discover/lib.mjs'

// Brownfox's site is Next.js over a Sanity dataset that is publicly readable,
// so one GROQ query returns every typeface with its pictures. A typeface page
// shows only its in-use projects; the homepage adds a specimen cover and in-use
// highlights per typeface, which lead the list here. Sanity image refs carry the
// original size, and its CDN resizes and rasterises SVG covers on request.
//
// Each typeface states "Released: 2017-2022" (first year is the release, the
// second an update). The records were created when the site moved to Sanity in
// early 2024, so their creation date only counts when it falls in the release
// year, which holds for the families launched since; older ones get 1 January.
const SITE = 'https://brownfox.org'
const API = 'https://z97j2wlx.apicdn.sanity.io/v2023-05-03/data/query/production'
const CDN = 'https://cdn.sanity.io/images/z97j2wlx/production/'
const WIDTH = 1400

const QUERY = `*[_type == "font" && defined(slug.current)]{
  title, "slug": slug.current, _createdAt, overviewBottom, copyright,
  "home": *[_type == "home"][0]{
    "covers": rows[].cells[fontReference._ref == ^.^._id].coverPhoto.asset._ref,
    "showcase": showcaseFonts[font._ref == ^.^._id].image.asset._ref
  },
  "inUse": inUseProjects[].images[].asset._ref
}`

function image(ref) {
  const [, id, w, h, ext] = ref.match(/^image-(\w+)-(\d+)x(\d+)-(\w+)$/)
  const width = Math.min(+w, WIDTH)
  const params = ext === 'svg' ? `w=${width}&fm=png` : `w=${width}&fit=max&auto=format`
  return { src: `${CDN}${id}-${w}x${h}.${ext}?${params}`, width, height: Math.round((h * width) / w) }
}

function releaseDate(f) {
  const year = ((f.overviewBottom || '').match(/Released:\s*(\d{4})/) || (f.copyright || '').match(/(\d{4})/) || [])[1]
  if (!year) return null
  return f._createdAt.startsWith(year) ? f._createdAt.slice(0, 10) : `${year}-01-01`
}

export default {
  id: 'brownfox',
  label: 'Brownfox',
  url: SITE,
  async run({ maxImages }) {
    const { result } = await fetchJSON(`${API}?query=${encodeURIComponent(QUERY)}`)
    return result.map(f => {
      const refs = [...(f.home?.covers || []), ...(f.home?.showcase || []), ...(f.inUse || [])].filter(Boolean)
      return {
        name: f.title,
        url: `${SITE}/fonts/${f.slug}`,
        date: releaseDate(f),
        images: [...new Set(refs)].slice(0, maxImages).map(image),
      }
    })
  },
}
