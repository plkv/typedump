import { fetchText, mapLimit, parseSitemap } from '../../discover/lib.mjs'

// Smuss Type Kiosk is Next.js over a Sanity dataset that is not public, but
// every page is server-rendered with its query result in __NEXT_DATA__. The
// homepage menu leaves out families that are not on the shelf yet (Earl), so
// the list is the sitemap's top-level pages, kept when the page holds font
// cuts. A family page is live type testers plus an "in use" carousel; the
// carousel's stills are the pictures, video slides have no poster. The
// homepage carousel holds more in-use stills, each tagged with the families it
// shows, and those follow the page's own. Sanity refs carry the original size
// and its CDN resizes on request. Astro has no pictures yet.
//
// The page's information table states "Launched: 2022", a year only, so the
// date is 1 January of it. The `updated` field is the last edit of the record.
const SITE = 'https://typekiosk.smuss.studio'
const CDN = 'https://cdn.sanity.io/images/me17iar8/production/'
const WIDTH = 1400

function nextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s)
  return m ? JSON.parse(m[1]).props.pageProps : null
}

// Sanity's resizer would flatten a GIF to its first frame.
function image(ref) {
  const [, id, w, h, ext] = ref.match(/^image-(\w+)-(\d+)x(\d+)-(\w+)$/)
  const src = `${CDN}${id}-${w}x${h}.${ext}`
  if (ext === 'gif') return { src, width: +w, height: +h }
  const width = Math.min(+w, WIDTH)
  return { src: `${src}?w=${width}&fit=max&auto=format`, width, height: Math.round((h * width) / w) }
}

function launched(page) {
  const year = (page.information || []).find(i => i.title === 'Launched')?.content?.match(/\d{4}/)?.[0]
  return year ? `${year}-01-01` : null
}

export default {
  id: 'typekiosk',
  label: 'Smuss Type Kiosk',
  url: SITE,
  async run({ maxImages }) {
    const home = nextData(await fetchText(`${SITE}/`))?.page?.inUse?.slides || []
    const urls = parseSitemap(await fetchText(`${SITE}/sitemap-0.xml`))
      .map(e => e.loc)
      .filter(loc => /^https:\/\/typekiosk\.smuss\.studio\/[^/]+$/.test(loc))
    const pages = await mapLimit(urls, 4, async url => {
      const page = nextData(await fetchText(url))?.page
      if (!page?.cuts) return null
      const tagged = home.filter(s => s.fonts?.some(f => f.slug?.current === page.slug.current))
      const refs = [...(page.inUse?.slides || []), ...tagged].map(s => s.image?.asset?._id).filter(Boolean)
      return {
        name: page.title,
        url,
        date: launched(page),
        images: [...new Set(refs)].slice(0, maxImages).map(image),
      }
    })
    return pages.filter(Boolean)
  },
}
