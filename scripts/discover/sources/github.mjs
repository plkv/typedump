import { fetchJSONMeta } from '../lib.mjs'

// GitHub is where indie OFL fonts live before (or instead of) reaching Google
// Fonts. A repo alone is a weak signal — most quality font repos were created
// years ago — so we look for two distinct "new to the world" events:
//
//   A. NEW REPOS   — a font project created inside the window (created:>=floor).
//                    Signal date = repo creation.
//   B. NEW RELEASES — an established font repo that cut a release inside the
//                    window. Signal date = the release's published_at. This is
//                    what catches "Foundry ships v2 in 2026" that pass A misses.
//
// Everything is unauthenticated by default (token-free), which caps us at ~10
// search req/min and ~60 core req/hr. We stay well under that and back off
// cleanly on a rate-limit 403. Set GITHUB_TOKEN to lift the caps if ever needed.

const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || ''
const GH_HEADERS = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
}

// Font-ish topics. license:ofl-1.1 keeps it libre; we broaden the license net
// only for the (dated, self-limiting) new-repo pass.
const TOPICS = ['font', 'fonts', 'typeface', 'typefaces']

// Pass B pulls from a broad "recently pushed" net, so demand real adoption to
// keep noise out. Pass A repos are brand-new and haven't accrued stars yet.
const MIN_STARS_RELEASE = 40
const MIN_STARS_NEW = 2
const MAX_RELEASE_LOOKUPS = 24 // stay under the 60/hr unauth core limit

// Aggregators, mirrors, and tooling masquerade as font repos. Drop by owner or
// full-name fragment — these are never a single family we'd add.
const DENY = [
  'google/fonts', 'fontsource', 'notofonts', 'googlefonts', 'font-mirror',
  'fonttools', 'fontforge', 'opentype', 'glyphsapp', 'fontello', 'fontkit',
  'awesome', 'webfont', 'iconfont', 'font-awesome', 'nerd-fonts', 'nerdfont',
  'programming-fonts', 'system-fonts',
  // Shaping engines / rendering libs that carry a font-ish topic but ship no
  // typeface of their own.
  'harfbuzz', 'pymupdf', 'mupdf', 'freetype', 'skia', 'pango', 'fribidi',
]

// Repo names that are collections or placeholders, not a single family.
const GENERIC_NAMES = new Set(['font', 'fonts', 'typeface', 'typefaces', 'library'])

function titleize(repoName) {
  return (
    String(repoName)
      .replace(/[-_]+/g, ' ')
      .replace(/\b(fonts?|typefaces?|vf|variable)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, c => c.toUpperCase()) || repoName
  )
}

function isDenied(fullName) {
  const s = String(fullName || '').toLowerCase()
  return DENY.some(d => s.includes(d))
}

// A repo is a plausible single font family, not a collection/tool/fork.
function looksLikeFont(r) {
  if (!r || r.fork || r.archived || r.is_template) return false
  if (isDenied(r.full_name)) return false
  // Bare "fonts"/"font" repo names are collections or placeholders.
  if (GENERIC_NAMES.has(String(r.name || '').toLowerCase())) return false
  return true
}

async function searchRepos(q, { sort, order = 'desc', perPage = 40 }) {
  const url =
    `https://api.github.com/search/repositories?q=${q}` +
    `&sort=${sort}&order=${order}&per_page=${perPage}`
  const { ok, status, rateRemaining, body } = await fetchJSONMeta(url, { headers: GH_HEADERS })
  if (!ok) {
    const limited = status === 403 && rateRemaining === 0
    return { items: [], limited }
  }
  return { items: body.items || [], limited: false }
}

export default {
  id: 'github',
  label: 'GitHub',
  priority: 20, // high: upstream source of truth for indie OFL
  async run({ floor }) {
    const seen = new Set()
    const out = []
    let rateLimited = false

    // ---- Pass A: repos created inside the window -------------------------
    // Dated by construction, so they're self-limiting. Low star bar.
    for (const topic of TOPICS) {
      if (rateLimited) break
      const q = `topic:${topic}+license:ofl-1.1+created:>=${floor}`
      const { items, limited } = await searchRepos(q, { sort: 'stars' })
      if (limited) { rateLimited = true; break }
      for (const r of items) {
        if (seen.has(r.id) || !looksLikeFont(r)) continue
        if ((r.stargazers_count || 0) < MIN_STARS_NEW) continue
        seen.add(r.id)
        out.push({
          name: titleize(r.name),
          author: r.owner?.login || '',
          source: 'github.com',
          url: r.html_url,
          date: String(r.created_at || '').slice(0, 10),
          image: null,
          license: 'OFL',
          repoDesc: (r.description || '').slice(0, 140),
        })
      }
    }

    // ---- Pass B: established repos with a release inside the window ------
    // Broad "recently pushed + adopted" net, then confirm via the latest
    // release date. published_at becomes the real signal, not the push.
    const candidates = []
    const candSeen = new Set()
    for (const topic of TOPICS) {
      if (rateLimited) break
      const q = `topic:${topic}+pushed:>=${floor}+stars:>=${MIN_STARS_RELEASE}`
      const { items, limited } = await searchRepos(q, { sort: 'updated', perPage: 30 })
      if (limited) { rateLimited = true; break }
      for (const r of items) {
        if (seen.has(r.id) || candSeen.has(r.id) || !looksLikeFont(r)) continue
        candSeen.add(r.id)
        candidates.push(r)
      }
    }

    // Most-starred first, then confirm each one's latest release date. Capped
    // so a daily run can't exhaust the unauthenticated core-API budget.
    candidates.sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
    for (const r of candidates.slice(0, MAX_RELEASE_LOOKUPS)) {
      if (rateLimited) break
      const { ok, status, rateRemaining, body } = await fetchJSONMeta(
        `https://api.github.com/repos/${r.full_name}/releases/latest`,
        { headers: GH_HEADERS }
      )
      if (!ok) {
        if (status === 403 && rateRemaining === 0) { rateLimited = true; break }
        continue // 404 = no releases; skip quietly
      }
      const relDate = String(body.published_at || '').slice(0, 10)
      if (!relDate || relDate < floor) continue
      seen.add(r.id)
      const tag = body.tag_name ? ` ${body.tag_name}` : ''
      out.push({
        name: titleize(r.name),
        author: r.owner?.login || '',
        source: 'github.com',
        url: body.html_url || r.html_url,
        date: relDate,
        image: null,
        license: 'OFL',
        repoDesc: `Release${tag} · ${(r.description || '').slice(0, 120)}`.trim(),
      })
    }

    if (rateLimited) {
      // Signal to the orchestrator's log without throwing away what we got.
      console.log('[discover] github: hit rate limit, returning partial results')
    }
    return out
  },
}
