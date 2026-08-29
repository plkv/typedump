import { fetchText, parseSitemap } from '../lib.mjs'

// BestFreeFonts is a curated aggregator of open/free typefaces. Its sitemap
// lists every font as a flat root slug (https://bestfreefonts.com/<slug>) with
// no <lastmod>, so this is a dateless source: entries land in the page's
// secondary "no date" group, capped like any other. Names come straight from
// the slug; the main crawler fetches each survivor's og:image once for preview.
// Overlap with our catalog (and with Google/Fontesk) is expected and gets
// deduped upstream, leaving the genuinely new picks.

// Non-font pages to skip: the homepage and the /styles/<category> indexes.
const SKIP = /^\/(styles\/|$)/

function nameFromSlug(slug) {
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim()
}

export default {
  id: 'bestfreefonts',
  label: 'BestFreeFonts',
  priority: 35,
  async run() {
    let xml
    try {
      xml = await fetchText('https://bestfreefonts.com/sitemap.xml')
    } catch {
      return []
    }
    return parseSitemap(xml)
      .map(({ loc }) => {
        let path
        try {
          path = new URL(loc).pathname
        } catch {
          return null
        }
        if (SKIP.test(path) || !/^\/[a-z0-9-]+$/.test(path)) return null
        return {
          name: nameFromSlug(path.slice(1)),
          author: '',
          source: 'bestfreefonts.com',
          url: loc,
          date: null,
        }
      })
      .filter(Boolean)
  },
}
