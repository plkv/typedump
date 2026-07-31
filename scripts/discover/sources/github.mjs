import { fetchJSON } from '../lib.mjs'

// New OFL/libre font projects on GitHub, before they reach Google Fonts.
// We treat repo `created_at` as the "new project" signal (low noise) and let
// the orchestrator apply the recency window.
const QUERIES = [
  'topic:font+license:ofl-1.1',
  'topic:typeface+license:ofl-1.1',
  'topic:fonts+license:ofl-1.1',
]

function titleize(repoName) {
  return String(repoName)
    .replace(/[-_]+/g, ' ')
    .replace(/\bfonts?\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase()) || repoName
}

export default {
  id: 'github',
  label: 'GitHub',
  priority: 20, // high: upstream source of truth for indie OFL
  async run() {
    const seen = new Set()
    const out = []
    for (const q of QUERIES) {
      let j
      try {
        j = await fetchJSON(
          `https://api.github.com/search/repositories?q=${q}&sort=created&order=desc&per_page=40`,
          { headers: { Accept: 'application/vnd.github+json' } }
        )
      } catch {
        continue
      }
      for (const r of j.items || []) {
        if (seen.has(r.id)) continue
        seen.add(r.id)
        out.push({
          name: titleize(r.name),
          author: (r.owner && r.owner.login) || '',
          source: 'github.com',
          url: r.html_url,
          date: String(r.created_at || '').slice(0, 10),
          image: null,
          repoDesc: (r.description || '').slice(0, 140),
        })
      }
    }
    return out
  },
}
