'use client'

import { useEffect, useMemo, useState } from 'react'

type DiscoveredFont = {
  name: string
  author: string
  source: string
  sourceLabel: string
  url: string
  date: string | null
  image: string | null
  googleFamily: string | null
  category: string | null
  license: string | null
}
type Payload = { generatedAt: string; months: number; count: number; fonts: DiscoveredFont[] }

const PASSWORD = 'showme'
const AUTH_KEY = 'td_new_auth'

export default function NewFontsPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem(AUTH_KEY) === PASSWORD) setAuthed(true)
    // Keep this discovery scratchpad out of search results.
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => { document.head.removeChild(meta) }
  }, [])

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--gray-surface-sec)' }}>
        <form
          onSubmit={e => {
            e.preventDefault()
            if (pw === PASSWORD) {
              sessionStorage.setItem(AUTH_KEY, PASSWORD)
              setAuthed(true)
            } else {
              setErr(true)
            }
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 260 }}
        >
          <input
            type="password"
            autoFocus
            value={pw}
            onChange={e => { setPw(e.target.value); setErr(false) }}
            placeholder="Password"
            style={{
              padding: '10px 14px', fontSize: 16, borderRadius: 10,
              border: `1px solid ${err ? '#d33' : 'var(--gray-brd-prim)'}`,
              background: 'var(--gray-surface-prim)', color: 'var(--gray-cont-prim)', outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '10px 14px', fontSize: 16, borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'var(--gray-cont-prim)', color: 'var(--gray-surface-prim)',
            }}
          >
            Enter
          </button>
        </form>
      </div>
    )
  }

  return <Gallery />
}

function Gallery() {
  const [data, setData] = useState<Payload | null>(null)
  const [failed, setFailed] = useState(false)
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    fetch('/discovered-fonts.json', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setFailed(true))
  }, [])

  // One combined stylesheet for every Google family on the page — a single
  // request, so live previews stay cheap regardless of how many there are.
  useEffect(() => {
    if (!data) return
    const fams = [...new Set(data.fonts.map(f => f.googleFamily).filter(Boolean) as string[])]
    if (!fams.length) return
    const href =
      'https://fonts.googleapis.com/css2?' +
      fams.map(f => `family=${f.replace(/ /g, '+')}:wght@400;700`).join('&') +
      '&display=swap'
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    document.head.appendChild(link)
    return () => { document.head.removeChild(link) }
  }, [data])

  const sources = useMemo(() => {
    if (!data) return []
    const counts = new Map<string, number>()
    for (const f of data.fonts) counts.set(f.sourceLabel, (counts.get(f.sourceLabel) || 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [data])

  const shown = useMemo(
    () => (data ? data.fonts.filter(f => !active || f.sourceLabel === active) : []),
    [data, active]
  )

  if (failed)
    return <Centered>No discovery data yet. Run <code>node scripts/discover/index.mjs</code>.</Centered>
  if (!data) return <Centered>Loading…</Centered>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-surface-sec)', padding: '32px 24px 80px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <header style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: 'var(--gray-cont-prim)', margin: 0 }}>
            New fonts
          </h1>
          <p style={{ fontSize: 14, color: 'var(--gray-cont-tert)', marginTop: 6 }}>
            {data.count} not in the catalog · last {data.months} months · updated{' '}
            {new Date(data.generatedAt).toLocaleDateString()}
          </p>
        </header>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          <Chip label={`All (${data.count})`} active={!active} onClick={() => setActive(null)} />
          {sources.map(([label, n]) => (
            <Chip key={label} label={`${label} (${n})`} active={active === label} onClick={() => setActive(label)} />
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          {shown.map((f, i) => (
            <Card key={`${f.source}-${f.name}-${i}`} font={f} />
          ))}
        </div>
      </div>
    </div>
  )
}

function Card({ font }: { font: DiscoveredFont }) {
  return (
    <a
      href={font.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', flexDirection: 'column', textDecoration: 'none',
        border: '1px solid var(--gray-brd-prim)', borderRadius: 14, overflow: 'hidden',
        background: 'var(--gray-surface-prim)',
      }}
    >
      <div
        style={{
          height: 150, display: 'grid', placeItems: 'center', overflow: 'hidden',
          background: 'var(--gray-fill-prim)', borderBottom: '1px solid var(--gray-brd-prim)',
        }}
      >
        {font.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={font.image}
            alt={font.name}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span
            style={{
              fontFamily: font.googleFamily ? `"${font.googleFamily}", system-ui` : 'system-ui',
              fontSize: 44, lineHeight: 1.1, color: 'var(--gray-cont-prim)', padding: '0 12px', textAlign: 'center',
            }}
          >
            {font.name}
          </span>
        )}
      </div>
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--gray-cont-prim)' }}>{font.name}</div>
        {font.author && (
          <div style={{ fontSize: 13, color: 'var(--gray-cont-tert)' }}>by {font.author}</div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--gray-cont-sec)' }}>{font.sourceLabel}</span>
          {font.date && <span style={{ fontSize: 12, color: 'var(--gray-cont-quart)' }}>· {font.date}</span>}
          {font.license && <span style={{ fontSize: 12, color: 'var(--gray-cont-quart)' }}>· {font.license}</span>}
        </div>
      </div>
    </a>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px', fontSize: 13, borderRadius: 999, cursor: 'pointer',
        border: `1px solid ${active ? 'var(--gray-cont-prim)' : 'var(--gray-brd-prim)'}`,
        background: active ? 'var(--gray-cont-prim)' : 'transparent',
        color: active ? 'var(--gray-surface-prim)' : 'var(--gray-cont-sec)',
      }}
    >
      {label}
    </button>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--gray-surface-sec)', color: 'var(--gray-cont-tert)', fontSize: 15, padding: 24, textAlign: 'center' }}>
      <div>{children}</div>
    </div>
  )
}
