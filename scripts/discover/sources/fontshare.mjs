import { fetchJSON } from '../lib.mjs'

// Fontshare (Indian Type Foundry) exposes a clean JSON API. Its `inserted_at`
// is a one-time 2022 DB seed, so it can't date entries. We instead trust the
// foundry's own `is_new` curation; the orchestrator drops anything we already
// have. License is proprietary-free (not OFL) — tagged accordingly on the card.
export default {
  id: 'fontshare',
  label: 'Fontshare',
  priority: 25,
  async run() {
    let j
    try {
      j = await fetchJSON('https://api.fontshare.com/v2/fonts?limit=200', {
        headers: {},
      })
    } catch {
      return []
    }
    const arr = Array.isArray(j) ? j : j.fonts || j.data || []
    return arr
      .filter(f => f.is_new)
      .map(f => ({
        name: f.name,
        author: (f.designers && f.designers[0] && f.designers[0].name) || f.publisher || '',
        source: 'fontshare.com',
        url: `https://www.fontshare.com/fonts/${f.slug}`,
        date: null, // no reliable per-font date; surfaced via the "new" flag
        image: null,
        license: 'free (not OFL)',
      }))
  },
}
