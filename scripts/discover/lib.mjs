// Shared helpers for the font-discovery crawler.
// No external deps: Node 18+ global fetch, regex parsing, plain JSON.

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0 Safari/537.36'

const BROWSER_HEADERS = {
  'User-Agent': UA,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
}

export async function fetchText(url, { headers = {}, timeout = 25000 } = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, { headers: { ...BROWSER_HEADERS, ...headers }, signal: ctrl.signal, redirect: 'follow' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(t)
  }
}

export async function fetchJSON(url, opts = {}) {
  const txt = await fetchText(url, { headers: { Accept: 'application/json' }, ...opts })
  // Some endpoints prefix JSON with an XSSI guard like )]}'
  return JSON.parse(txt.replace(/^\)\]\}'[^\n]*\n?/, ''))
}

// Like fetchJSON, but surfaces the HTTP status and headers too. GitHub's REST
// API needs this: a 403 with x-ratelimit-remaining: 0 means "backed off", not
// "broken", and we want to stop the source cleanly rather than treat it as an
// empty result.
export async function fetchJSONMeta(url, { headers = {}, timeout = 25000 } = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, {
      headers: { ...BROWSER_HEADERS, Accept: 'application/json', ...headers },
      signal: ctrl.signal,
      redirect: 'follow',
    })
    const status = res.status
    const rateRemaining = Number(res.headers.get('x-ratelimit-remaining') ?? '')
    let body = null
    if (res.ok) {
      const txt = await res.text()
      body = JSON.parse(txt.replace(/^\)\]\}'[^\n]*\n?/, ''))
    }
    return { ok: res.ok, status, rateRemaining, body }
  } finally {
    clearTimeout(t)
  }
}

// Normalized family key for matching against our catalog and cross-source dedupe.
export function normName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(regular|variable|vf|font|typeface|family)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
}

export function monthsAgoISO(months) {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d.toISOString().slice(0, 10)
}

export function withinMonths(dateISO, months) {
  if (!dateISO) return false
  return dateISO.slice(0, 10) >= monthsAgoISO(months)
}

// Pull og:image / twitter:image from an HTML page (best-effort, one request).
export function ogImage(html, baseUrl) {
  const m =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
    html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
  if (!m) return null
  try {
    return new URL(m[1], baseUrl).href
  } catch {
    return null
  }
}

// Parse <url> entries from a sitemap into {loc, lastmod(YYYY-MM-DD|'')}.
// Split-then-extract instead of one regex: optional groups inside a single
// lazy pattern silently drop the <lastmod>.
export function parseSitemap(xml) {
  return xml
    .split('<url>')
    .slice(1)
    .map(block => {
      const loc = (block.match(/<loc>([^<]+)<\/loc>/) || [])[1] || ''
      const lastmod = ((block.match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1] || '').slice(0, 10)
      return { loc, lastmod }
    })
    .filter(e => e.loc)
}

// Tiny concurrency limiter so we stay polite and fast without a dep.
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let i = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++
      try {
        out[idx] = await fn(items[idx], idx)
      } catch {
        out[idx] = null
      }
    }
  })
  await Promise.all(workers)
  return out
}
