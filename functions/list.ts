// A private list of every family: its name, its page and where "Get font"
// sends people, written out in full so a dead link can be spotted at a glance.
// Served at /list rather than /index, which Cloudflare Pages folds into the
// home page. Behind HTTP Basic auth: any user name, the password is the
// INDEX_PASSWORD secret (scripts/set-index-password.sh puts it there).
import { familyToSlug } from '../lib/font-slug'

interface Env {
  ASSETS: { fetch: (request: Request | string) => Promise<Response> }
  INDEX_PASSWORD?: string
}

interface Family {
  name: string
  downloadLink?: string
}

const SITE = 'https://typedump.com'

function authorised(request: Request, password: string): boolean {
  const header = request.headers.get('Authorization') || ''
  if (!header.startsWith('Basic ')) return false
  try {
    const decoded = atob(header.slice(6))
    return decoded.slice(decoded.indexOf(':') + 1) === password
  } catch {
    return false
  }
}

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const link = (url: string) => `<a href="${escape(url)}">${escape(url)}</a>`

function page(families: Family[]): string {
  const rows = families
    .map(f => {
      const pageUrl = `${SITE}/font/${familyToSlug(f.name)}`
      const get = f.downloadLink ? (f.downloadLink.startsWith('/') ? SITE + f.downloadLink : f.downloadLink) : ''
      return `<tr><td>${escape(f.name)}</td><td>${link(pageUrl)}</td><td>${get ? link(get) : ''}</td></tr>`
    })
    .join('\n')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>typedump list</title>
<style>
  :root { color-scheme: light dark; --fg: #111; --muted: #777; --line: #e6e6e6; --bg: #fff; }
  @media (prefers-color-scheme: dark) { :root { --fg: #eee; --muted: #888; --line: #2a2a2a; --bg: #111; } }
  body { margin: 0; padding: 24px 16px; background: var(--bg); color: var(--fg); font: 14px/1.4 system-ui, sans-serif; }
  p { color: var(--muted); margin: 0 0 16px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; vertical-align: top; padding: 6px 12px 6px 0; border-bottom: 1px solid var(--line); }
  th { color: var(--muted); font-weight: 500; }
  td:first-child { white-space: nowrap; }
  td:not(:first-child) { word-break: break-all; }
  a { color: inherit; }
  a:hover { opacity: 0.56; }
</style>
</head>
<body>
<p>${families.length} families</p>
<table>
<thead><tr><th>Font</th><th>Page</th><th>Get font</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
</body>
</html>`
}

export const onRequest = async ({ request, env }: { request: Request; env: Env }) => {
  if (!env.INDEX_PASSWORD) return new Response('Not configured', { status: 503 })
  if (!authorised(request, env.INDEX_PASSWORD)) {
    return new Response('Password required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="typedump list", charset="UTF-8"' },
    })
  }
  const data = await env.ASSETS.fetch(new URL('/fonts/fonts-data.json', request.url).toString())
  const { families } = (await data.json()) as { families: Family[] }
  const sorted = [...families].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
  return new Response(page(sorted), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
