import { fetchText, monthsAgoISO, parseSitemap, ogImage, mapLimit } from '../lib.mjs'

// Fontesk is WordPress. Its RSS is disabled (500), but the paginated post
// sitemaps carry a <lastmod> per font post. Posts are chunked chronologically,
// so we read the highest-numbered sub-sitemaps and pull dated font URLs.
//
// Fontesk mixes three licenses: free-for-commercial-use, ofl-gpl, and
// free-for-personal-use. We only want the first two, so we fetch each recent
// candidate's page (which also gives us the preview thumbnail in one request)
// and drop the personal-use ones.
const FETCH_LIMIT = 120 // cap page fetches per run

function nameFromUrl(u) {
  const slug = u.replace(/\/$/, '').split('/').pop() || ''
  return slug
    .replace(/-(font|typeface|free-font)$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim()
}

// A page's own license, read from its /license/<slug>/ tag link.
function licenseOf(html) {
  const m = html.match(/license\/(free-for-commercial-use|ofl-gpl|free-for-personal-use)\//)
  return m ? m[1] : null
}

const LICENSE_LABEL = {
  'free-for-commercial-use': 'Free for commercial',
  'ofl-gpl': 'OFL / GPL',
}

export default {
  id: 'fontesk',
  label: 'Fontesk',
  priority: 30,
  async run({ months, floor }) {
    floor = floor || monthsAgoISO(months || 3)
    let index
    try {
      index = await fetchText('https://fontesk.com/sitemap.xml')
    } catch {
      return []
    }
    // Recent posts live in the highest-numbered sub-sitemaps; within a file the
    // newest are last, so reverse each to get newest-first overall.
    const posts = [...index.matchAll(/<loc>([^<]*post-sitemap(\d*)\.xml)<\/loc>/gi)]
      .map(m => ({ url: m[1], n: Number(m[2] || 0) }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 3)
      .map(p => p.url)

    const candidates = []
    for (const sm of posts) {
      let xml
      try {
        xml = await fetchText(sm)
      } catch {
        continue
      }
      const entries = parseSitemap(xml)
        .filter(({ loc, lastmod }) => lastmod && lastmod >= floor && /fontesk\.com\/[^/]+\/?$/.test(loc))
        .reverse()
      candidates.push(...entries)
      if (candidates.length >= FETCH_LIMIT) break
    }

    // Fetch each candidate once: license (to filter) + og:image (for preview).
    const fetched = await mapLimit(candidates.slice(0, FETCH_LIMIT), 6, async ({ loc, lastmod }) => {
      let html
      try {
        html = await fetchText(loc, { timeout: 15000 })
      } catch {
        return null
      }
      const lic = licenseOf(html)
      if (!lic || lic === 'free-for-personal-use') return null // commercial-safe only
      return {
        name: nameFromUrl(loc),
        author: '',
        source: 'fontesk.com',
        url: loc,
        date: lastmod,
        image: ogImage(html, loc),
        license: LICENSE_LABEL[lic] || lic,
      }
    })
    return fetched.filter(Boolean)
  },
}
