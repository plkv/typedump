import { fetchText, fetchJSON, mapLimit } from '../lib.mjs'

// Tunera is a small French libre foundry (all OFL). The homepage lists every
// typeface with its designers and a download link to the font's own repository,
// but nothing on the site carries a date, and robots.txt asks for a 10s crawl
// delay — so we read the homepage once and date each font by when its
// repository was created on Codeberg, GitHub or GitLab. Codeberg answers a
// browser user agent with a 403 bot challenge, so the APIs get an honest one.
const API_HEADERS = { Accept: 'application/json', 'User-Agent': 'typedump-discover' }
const REPO_APIS = [
  [/^https:\/\/codeberg\.org\/([^/]+)\/([^/]+)\//, (o, r) => `https://codeberg.org/api/v1/repos/${o}/${r}`],
  [/^https:\/\/github\.com\/([^/]+)\/([^/]+)\//, (o, r) => `https://api.github.com/repos/${o}/${r}`],
  [/^https:\/\/gitlab\.com\/([^/]+)\/([^/]+)\//, (o, r) => `https://gitlab.com/api/v4/projects/${encodeURIComponent(`${o}/${r}`)}`],
]

async function repoCreated(download) {
  for (const [re, api] of REPO_APIS) {
    const m = re.exec(download || '')
    if (!m) continue
    try {
      const j = await fetchJSON(api(m[1], m[2]), { headers: API_HEADERS, timeout: 15000 })
      return (j.created_at || '').slice(0, 10) || null
    } catch {
      return null
    }
  }
  return null
}

export default {
  id: 'tunera',
  label: 'Tunera',
  priority: 20,
  async run() {
    let html
    try {
      html = await fetchText('https://www.tunera.xyz/')
    } catch {
      return []
    }
    const items = html
      .split("<div class='grid typeface ")
      .slice(1)
      .map(block => {
        const page = /<h2 class='fontname[^>]*><a href='([^']+)'>([^<]+)</.exec(block)
        if (!page) return null
        const authors = (block.split("<ul class='authors'>")[1] || '').split('</ul>')[0]
        const license = /href='\/licenses\/([^/']+)\/?'/.exec(block)
        return {
          name: page[2].trim(),
          author: [...authors.matchAll(/<h3>(?:<a[^>]*>)?([^<]+)/gi)].map(m => m[1].trim()).join(', '),
          source: 'tunera.xyz',
          url: new URL(page[1], 'https://www.tunera.xyz/').href,
          download: (/href='([^']+)'><div class='button'>Download/.exec(block) || [])[1],
          license: license ? license[1].replace(/-/g, ' ').replace(/^sil open font license/, 'OFL') : 'OFL',
          image: null,
        }
      })
      .filter(Boolean)
    await mapLimit(items, 4, async it => {
      it.date = await repoCreated(it.download)
    })
    return items.map(({ download, ...it }) => it)
  },
}
