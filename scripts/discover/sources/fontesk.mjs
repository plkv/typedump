import { fetchText, monthsAgoISO, parseSitemap } from '../lib.mjs'

// Fontesk is WordPress. Its RSS is disabled (500), but the paginated post
// sitemaps carry a <lastmod> per font post. Posts are chunked chronologically,
// so we read the highest-numbered sub-sitemaps and pull dated font URLs.
function nameFromUrl(u) {
  const slug = u.replace(/\/$/, '').split('/').pop() || ''
  return slug
    .replace(/-(font|typeface|free-font)$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim()
}

export default {
  id: 'fontesk',
  label: 'Fontesk',
  priority: 30,
  async run({ months }) {
    const floor = monthsAgoISO(months)
    let index
    try {
      index = await fetchText('https://fontesk.com/sitemap.xml')
    } catch {
      return []
    }
    // The plugin stamps every sub-sitemap's index lastmod with the regeneration
    // date, so it can't tell us which chunk is newest. Posts are chunked
    // chronologically, so the recent ones live in the highest-numbered files.
    const posts = [...index.matchAll(/<loc>([^<]*post-sitemap(\d*)\.xml)<\/loc>/gi)]
      .map(m => ({ url: m[1], n: Number(m[2] || 0) }))
      .sort((a, b) => b.n - a.n)
    const subs = posts.slice(0, 3).map(p => p.url)
    const out = []
    for (const sm of subs) {
      let xml
      try {
        xml = await fetchText(sm)
      } catch {
        continue
      }
      for (const { loc, lastmod } of parseSitemap(xml)) {
        if (!lastmod || lastmod < floor) continue
        if (!/fontesk\.com\/[^/]+\/?$/.test(loc)) continue // skip category/tag pages
        out.push({
          name: nameFromUrl(loc),
          author: '',
          source: 'fontesk.com',
          url: loc,
          date: lastmod,
          image: null,
        })
      }
    }
    return out
  },
}
