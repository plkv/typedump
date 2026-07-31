import { fetchJSON } from '../lib.mjs'

// Google Fonts publishes the whole catalog with a per-family `dateAdded`.
// One request, no key. This is the catch-all: almost every libre face lands
// here eventually, so we ingest smaller foundries first and dedupe by name.
export default {
  id: 'google-fonts',
  label: 'Google Fonts',
  priority: 40, // low: prefer upstream foundry entries when the same face appears
  async run() {
    const j = await fetchJSON('https://fonts.google.com/metadata/fonts')
    const list = j.familyMetadataList || []
    return list
      .filter(f => f.dateAdded)
      .map(f => ({
        name: f.family,
        author: (f.designers && f.designers[0] && f.designers[0].name) || '',
        source: 'fonts.google.com',
        url: `https://fonts.google.com/specimen/${String(f.family).replace(/ /g, '+')}`,
        date: String(f.dateAdded).slice(0, 10),
        image: null,
        googleFamily: f.family, // lets the page render a live preview cheaply
        category: f.category || '',
      }))
  },
}
