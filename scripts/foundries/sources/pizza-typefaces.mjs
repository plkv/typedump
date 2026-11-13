import { fetchJSON } from '../../discover/lib.mjs'

// Pizza Typefaces' site is Gatsby over a Sanity dataset that is publicly
// readable, so one GROQ query returns the typefaces the homepage lists, in its
// order, with their pictures. The dataset also holds products the site no
// longer shows; going through the homepage leaves them out. A typeface page's
// only pictures are its "in use" gallery; about half the typefaces have none and
// drop out. Sanity image refs carry the original size and its CDN resizes on
// request, except GIFs, which a resize would flatten.
//
// Nothing states a release. The dataset dates the files it holds: the earliest
// upload of a typeface's font files (trial and retail) and pictures is when it
// went up on the site, which for a family released since is its release to
// within days. Families from before the site was built in 2022 all land in that
// year. The product record's own date is no help: a draft can sit for months
// before it is published (Business Blooming), and records get recreated (Kern).
const SITE = 'https://typefaces.pizza'
const API = 'https://h9xeh528.apicdn.sanity.io/v2021-10-21/data/query/production'
const CDN = 'https://cdn.sanity.io/images/h9xeh528/production/'
const WIDTH = 1400

const QUERY = `*[_type == "pageModulaire" && slug.current == "home"][0]
  .modules[_type == "productListUI"].products[]->{
    title, "slug": slug.current,
    "files": [trial.typeface.asset->_createdAt] + typefaces[].typeface.asset->_createdAt,
    "inUse": inUse[].asset->{_id, _createdAt}
  }`

function image(ref) {
  const [, id, w, h, ext] = ref.match(/^image-(\w+)-(\d+)x(\d+)-(\w+)$/)
  if (ext === 'gif') return { src: `${CDN}${id}-${w}x${h}.gif`, width: +w, height: +h }
  const width = Math.min(+w, WIDTH)
  return { src: `${CDN}${id}-${w}x${h}.${ext}?w=${width}&fit=max&auto=format`, width, height: Math.round((h * width) / w) }
}

export default {
  id: 'pizza-typefaces',
  label: 'Pizza Typefaces',
  url: SITE,
  async run({ maxImages }) {
    const { result } = await fetchJSON(`${API}?query=${encodeURIComponent(QUERY)}`)
    return result.filter(p => p?.slug).map(p => {
      const assets = (p.inUse || []).filter(Boolean)
      const stamps = [...(p.files || []), ...assets.map(a => a._createdAt)].filter(Boolean).sort()
      return {
        name: p.title.trim(),
        url: `${SITE}/type/${p.slug}`,
        date: stamps[0]?.slice(0, 10) ?? null,
        images: [...new Set(assets.map(a => a._id))].slice(0, maxImages).map(image),
      }
    })
  },
}
