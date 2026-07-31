import { fetchText, monthsAgoISO, parseSitemap } from '../lib.mjs'

// Collletttivo is a small, high-quality Italian libre foundry. Static site with
// a dated sitemap; typeface pages live under /typefaces/<slug>.
export default {
  id: 'collletttivo',
  label: 'Collletttivo',
  priority: 20,
  async run({ months }) {
    const floor = monthsAgoISO(months)
    let xml
    try {
      xml = await fetchText('https://www.collletttivo.it/sitemap.xml')
    } catch {
      return []
    }
    const out = []
    for (const { loc, lastmod } of parseSitemap(xml)) {
      if (!/\/typefaces\/[^/]+\/?$/.test(loc)) continue
      if (!lastmod || lastmod < floor) continue
      const slug = loc.replace(/\/$/, '').split('/').pop() || ''
      out.push({
        name: slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim(),
        author: 'Collletttivo',
        source: 'collletttivo.it',
        url: loc,
        date: lastmod,
        image: null,
      })
    }
    return out
  },
}
