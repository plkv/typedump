import { fetchJSON, fetchText, mapLimit, parseSitemap } from '../../discover/lib.mjs'

// Production Type's site is Next.js over a Sanity dataset that is publicly
// readable, with a Shopify store behind the cart. The fonts index loads its
// list in the browser, so the sitemap gives the family pages: /font/<slug> is a
// family or superfamily, /font/<slug>/<sub> one of its subfamilies and is left
// out. The sitemap runs ahead of launches, so a page that 404s is skipped.
//
// A page is server-rendered. Its pictures (the hero video's poster, specimen
// images, the two latest "in use" entries) are <img> elements served through
// the site's /cdn proxy, which names the Sanity asset; everything from "About
// the designers" on is portraits and site furniture. The rest of the in-use
// entries come from the dataset: they reference styles, which hang off the
// family's subfamilies. Sanity asset names carry the original size, and its
// CDN resizes on request.
//
// Nothing on the site states a release date, and the family records were
// recreated in a 2026 migration. The Shopify product is created when a family
// goes on sale, which dates it to within weeks, except for the families already
// on sale when the store opened in April 2024: they were all imported on its
// first day, which says nothing about their release, so they get null.
const SITE = 'https://productiontype.com'
const API = 'https://qd7iq686.apicdn.sanity.io/v2023-05-03/data/query/production'
const CDN = 'https://cdn.sanity.io/images/qd7iq686/production/'
const WIDTH = 1400

const QUERY = `*[_type == "fontFamily"]{
  "slug": slug.en_us.current, "name": title.en_us, "created": store.createdAt,
  "inUse": *[_type == "fontInUse" && references(^.subfamilies[]->styles[]._ref)] | order(publishDate desc)[].image.asset._ref
}`

function image(file) {
  const [, w, h, ext] = file.match(/-(\d+)x(\d+)\.(\w+)$/)
  if (ext === 'gif') return { src: CDN + file, width: +w, height: +h }
  const width = Math.min(+w, WIDTH)
  return { src: `${CDN}${file}?w=${width}&fit=max&auto=format`, width, height: Math.round((h * width) / w) }
}

function pagePictures(html) {
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'))
  const own = main.slice(0, main.includes('id="designers"') ? main.indexOf('id="designers"') : undefined)
  return [...own.matchAll(/<img[^>]+src="\/cdn\?url=(\w+-\d+x\d+\.(?:jpe?g|png|gif|webp))/g)].map(m => m[1])
}

function storeOpened(families) {
  return families.map(f => f.created?.slice(0, 10)).filter(Boolean).sort()[0]
}

export default {
  id: 'production-type',
  label: 'Production Type',
  url: SITE,
  async run({ maxImages }) {
    const [sitemap, { result }] = await Promise.all([
      fetchText(`${SITE}/sitemap.xml`),
      fetchJSON(`${API}?query=${encodeURIComponent(QUERY)}`),
    ])
    const opened = storeOpened(result)
    const slugs = parseSitemap(sitemap)
      .map(e => (e.loc.match(/\/font\/([^/?#]+)$/) || [])[1])
      .filter(Boolean)
    return mapLimit(slugs, 4, async slug => {
      const url = `${SITE}/font/${slug}`
      const html = await fetchText(url)
      const family = result.find(f => f.slug === slug)
      const inUse = (family?.inUse || [])
        .filter(Boolean)
        .map(ref => ref.replace(/^image-/, '').replace(/-(\w+)$/, '.$1'))
        .filter(file => !file.endsWith('.svg'))
      const day = family?.created?.slice(0, 10)
      return {
        name: family?.name || html.match(/<title>([^<|]+?)\s*\|/)[1],
        url,
        date: day && day !== opened ? day : null,
        images: [...new Set([...pagePictures(html), ...inUse])].slice(0, maxImages).map(image),
      }
    })
  },
}
