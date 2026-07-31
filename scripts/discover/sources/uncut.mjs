import { fetchText } from '../lib.mjs'

// Uncut.wtf ships its whole catalog as one JSON with a per-font `date` (YYMMDD)
// and a direct `dl` link. Best case it's the cleanest source we have. But the
// host sits behind a JS/WAF challenge that intermittently blocks plain HTTP;
// when that happens we just skip the run rather than fail the whole crawl.
function parseYYMMDD(s) {
  const m = /^(\d{2})(\d{2})(\d{2})$/.exec(String(s || ''))
  if (!m) return null
  return `20${m[1]}-${m[2]}-${m[3]}`
}

export default {
  id: 'uncut',
  label: 'Uncut.wtf',
  priority: 15,
  async run() {
    let txt
    try {
      txt = await fetchText('https://uncut.wtf/fonts.json', {
        headers: { Accept: 'application/json', Referer: 'https://uncut.wtf/' },
      })
    } catch {
      return []
    }
    if (!txt.trim().startsWith('{') && !txt.trim().startsWith('[')) return [] // challenge/HTML page
    let j
    try {
      j = JSON.parse(txt)
    } catch {
      return []
    }
    // Catalog is grouped by category; flatten every array of font objects.
    const fonts = []
    const walk = v => {
      if (Array.isArray(v)) v.forEach(walk)
      else if (v && typeof v === 'object') {
        if (v.name && (v.slug || v.dl)) fonts.push(v)
        else Object.values(v).forEach(walk)
      }
    }
    walk(j.fonts || j.data || j)
    return fonts.map(f => ({
      name: f.name,
      author: Array.isArray(f.authors) ? f.authors.join(', ') : f.authors || f.author || '',
      source: 'uncut.wtf',
      url: f.dl || (f.slug ? `https://uncut.wtf/${f.slug}` : 'https://uncut.wtf/'),
      date: parseYYMMDD(f.date),
      image: null,
    }))
  },
}
