'use client'

import React, { useState } from 'react'
import Link from 'next/link'

// ── token data ────────────────────────────────────────────────────────────────

type TokenGroup = { group: string; tokens: { name: string; light: string; dark: string }[] }

const GRAY_TOKENS: TokenGroup[] = [
  { group: 'Content', tokens: [
    { name: '--gray-cont-prim',  light: '#0a0a0a',             dark: '#fcfcfc' },
    { name: '--gray-cont-sec',   light: 'rgba(10,10,10,0.64)', dark: 'rgba(252,252,252,0.64)' },
    { name: '--gray-cont-tert',  light: 'rgba(10,10,10,0.4)',  dark: 'rgba(252,252,252,0.4)' },
    { name: '--gray-cont-quart', light: 'rgba(10,10,10,0.24)', dark: 'rgba(252,252,252,0.24)' },
  ]},
  { group: 'Accent', tokens: [
    { name: '--gray-accent-prim', light: '#0a0a0a', dark: '#fcfcfc' },
    { name: '--gray-accent-sec',  light: '#1f1f1f', dark: '#f2f2f2' },
  ]},
  { group: 'Fill', tokens: [
    { name: '--gray-fill-prim', light: 'rgba(26,26,26,0.04)', dark: 'rgba(252,252,252,0.04)' },
    { name: '--gray-fill-sec',  light: 'rgba(26,26,26,0.08)', dark: 'rgba(252,252,252,0.08)' },
  ]},
  { group: 'Border', tokens: [
    { name: '--gray-brd-prim', light: 'rgba(26,26,26,0.08)', dark: 'rgba(252,252,252,0.08)' },
  ]},
  { group: 'Surface', tokens: [
    { name: '--gray-surface-prim', light: '#fcfcfc', dark: '#0a0a0a' },
    { name: '--gray-surface-sec',  light: '#f2f2f2', dark: '#1f1f1f' },
  ]},
]

const MISC_TOKENS: TokenGroup[] = [
  { group: 'Misc', tokens: [
    { name: '--misc-cont-inverse', light: '#f7f7f7',               dark: '#0a0a0a' },
    { name: '--misc-cont-sec',     light: 'rgba(247,247,247,0.64)', dark: 'rgba(10,10,10,0.64)' },
    { name: '--misc-cont-tert',    light: 'rgba(247,247,247,0.24)', dark: 'rgba(10,10,10,0.24)' },
  ]},
]

const SHADCN_TOKENS: TokenGroup[] = [
  { group: 'Base', tokens: [
    { name: '--background', light: '#ffffff', dark: '#0a0a0a' },
    { name: '--foreground', light: '#0f0f0f', dark: '#fafafa' },
  ]},
  { group: 'Primary', tokens: [
    { name: '--primary',            light: '#171717', dark: '#fafafa' },
    { name: '--primary-foreground', light: '#fafafa', dark: '#171717' },
  ]},
  { group: 'Secondary / Muted', tokens: [
    { name: '--secondary',            light: '#f5f5f5', dark: '#2d2d2d' },
    { name: '--secondary-foreground', light: '#171717', dark: '#fafafa' },
    { name: '--muted',                light: '#f5f5f5', dark: '#2d2d2d' },
    { name: '--muted-foreground',     light: '#737373', dark: '#a3a3a3' },
  ]},
  { group: 'Borders / Ring', tokens: [
    { name: '--border', light: '#e5e5e5', dark: '#2d2d2d' },
    { name: '--input',  light: '#e5e5e5', dark: '#2d2d2d' },
    { name: '--ring',   light: '#a3a3a3', dark: '#525252' },
  ]},
]

// ── helpers ───────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 64 }}>
      <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gray-cont-tert)', marginBottom: 24, paddingBottom: 12, borderBottom: '1px solid var(--gray-brd-prim)' }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: 'var(--gray-cont-tert)', marginTop: 6, fontFamily: 'var(--font-space-mono)' }}>{children}</div>
}

function Mono({ children }: { children: React.ReactNode }) {
  return <code style={{ fontSize: 11, fontFamily: 'var(--font-space-mono)', background: 'var(--gray-fill-sec)', padding: '2px 6px', borderRadius: 4, color: 'var(--gray-cont-prim)' }}>{children}</code>
}

function ColorCell({ value, bg }: { value: string; bg: 'light' | 'dark' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 22, height: 22, borderRadius: 5, flexShrink: 0, position: 'relative', outline: '1px solid rgba(0,0,0,0.08)', outlineOffset: '-1px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'8\' height=\'8\'%3E%3Crect width=\'4\' height=\'4\' fill=\'%23bbb\'/%3E%3Crect x=\'4\' y=\'4\' width=\'4\' height=\'4\' fill=\'%23bbb\'/%3E%3C/svg%3E")', backgroundSize: '8px 8px' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundColor: value }} />
      </div>
      <code style={{ fontSize: 11, fontFamily: 'var(--font-space-mono)', color: bg === 'dark' ? 'rgba(252,252,252,0.55)' : 'rgba(10,10,10,0.45)' }}>
        {value}
      </code>
    </div>
  )
}

function TokenTable({ groups }: { groups: TokenGroup[] }) {
  const col = (bg: 'light' | 'dark'): React.CSSProperties => ({
    backgroundColor: bg === 'light' ? '#f0f0f0' : '#181818', flex: 1,
  })
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--gray-brd-prim)' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-brd-prim)' }}>
        <div style={{ width: 216, padding: '7px 14px', flexShrink: 0, fontSize: 10, fontWeight: 700, color: 'var(--gray-cont-tert)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Token</div>
        <div style={{ ...col('light'), padding: '7px 14px', fontSize: 10, fontWeight: 700, color: 'rgba(10,10,10,0.35)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>☀ Light</div>
        <div style={{ ...col('dark'), padding: '7px 14px', fontSize: 10, fontWeight: 700, color: 'rgba(252,252,252,0.35)', letterSpacing: '0.07em', textTransform: 'uppercase', borderLeft: '1px solid rgba(0,0,0,0.25)' }}>☾ Dark</div>
      </div>
      {groups.map((g, gi) => (
        <div key={g.group}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-brd-prim)', backgroundColor: 'var(--gray-fill-prim)' }}>
            <div style={{ width: 216, padding: '5px 14px', flexShrink: 0, fontSize: 10, fontWeight: 700, color: 'var(--gray-cont-tert)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{g.group}</div>
            <div style={{ flex: 2 }} />
          </div>
          {g.tokens.map((t, ti) => {
            const last = gi === groups.length - 1 && ti === g.tokens.length - 1
            return (
              <div key={t.name} style={{ display: 'flex', borderBottom: last ? 'none' : '1px solid var(--gray-brd-prim)' }}>
                <div style={{ width: 216, padding: '9px 14px', flexShrink: 0 }}>
                  <code style={{ fontSize: 11, fontFamily: 'var(--font-space-mono)', color: 'var(--gray-cont-prim)' }}>{t.name}</code>
                </div>
                <div style={{ ...col('light'), padding: '9px 14px', display: 'flex', alignItems: 'center' }}>
                  <ColorCell value={t.light} bg="light" />
                </div>
                <div style={{ ...col('dark'), padding: '9px 14px', display: 'flex', alignItems: 'center', borderLeft: '1px solid rgba(0,0,0,0.25)' }}>
                  <ColorCell value={t.dark} bg="dark" />
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ── playground ────────────────────────────────────────────────────────────────

type CtrlRadio  = { type: 'radio';  label: string; options: string[]; value: string;  onChange: (v: string) => void }
type CtrlText   = { type: 'text';   label: string; value: string;  onChange: (v: string) => void }
type CtrlToggle = { type: 'toggle'; label: string; value: boolean; onChange: (v: boolean) => void }
type Ctrl = CtrlRadio | CtrlText | CtrlToggle

const ctrlBase: React.CSSProperties = {
  fontFamily: '"Inter Variable", sans-serif', cursor: 'pointer', transition: 'all 0.15s',
}

function ControlPanel({ controls }: { controls: Ctrl[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {controls.map((c, i) => {
        const lbl = <div style={{ fontSize: 10, color: 'var(--gray-cont-tert)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{c.label}</div>
        if (c.type === 'radio') return (
          <div key={i}>
            {lbl}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {c.options.map(opt => (
                <button key={opt} onClick={() => c.onChange(opt)} style={{ ...ctrlBase, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--gray-brd-prim)', background: c.value === opt ? 'var(--gray-cont-prim)' : 'transparent', color: c.value === opt ? 'var(--gray-surface-prim)' : 'var(--gray-cont-prim)', fontSize: 12, fontWeight: 500 }}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )
        if (c.type === 'text') return (
          <div key={i}>
            {lbl}
            <input value={c.value} onChange={e => c.onChange(e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--gray-brd-prim)', background: 'var(--gray-fill-prim)', color: 'var(--gray-cont-prim)', fontSize: 12, fontFamily: '"Inter Variable", sans-serif', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        )
        if (c.type === 'toggle') return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button role="switch" aria-checked={c.value} onClick={() => c.onChange(!c.value)} style={{ width: 30, height: 17, borderRadius: 9, border: 'none', cursor: 'pointer', background: c.value ? 'var(--gray-cont-prim)' : 'var(--gray-brd-prim)', position: 'relative', transition: 'all 0.2s', flexShrink: 0, padding: 0 }}>
              <div style={{ position: 'absolute', top: 2, left: c.value ? 14 : 2, width: 13, height: 13, borderRadius: '50%', background: c.value ? 'var(--gray-surface-prim)' : 'var(--gray-cont-prim)', transition: 'left 0.2s' }} />
            </button>
            <span style={{ fontSize: 12, color: 'var(--gray-cont-prim)', fontFamily: '"Inter Variable", sans-serif' }}>{c.label}</span>
          </div>
        )
        return null
      })}
    </div>
  )
}

function Playground({ name, cls, preview, controls, code }: {
  name: string; cls: string; preview: React.ReactNode; controls: React.ReactNode; code: string
}) {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1600) }
  return (
    <div style={{ borderRadius: 'var(--radius-card)', border: '1px solid var(--gray-brd-prim)', overflow: 'hidden', marginBottom: 20 }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--gray-brd-prim)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-cont-prim)', fontFamily: '"Inter Variable", sans-serif' }}>{name}</span>
        <Mono>{cls}</Mono>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px' }}>
        <div style={{ padding: '32px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gray-fill-prim)', borderRight: '1px solid var(--gray-brd-prim)', minHeight: 100 }}>
          {preview}
        </div>
        <div style={{ padding: 14 }}>
          {controls}
        </div>
      </div>
      <div style={{ borderTop: '1px solid var(--gray-brd-prim)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: 'var(--gray-surface-sec)' }}>
        <code style={{ fontSize: 11, color: 'var(--gray-cont-tert)', fontFamily: 'var(--font-space-mono)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>
          {code}
        </code>
        <button onClick={copy} style={{ ...ctrlBase, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--gray-brd-prim)', background: copied ? 'var(--gray-cont-prim)' : 'transparent', color: copied ? 'var(--gray-surface-prim)' : 'var(--gray-cont-tert)', fontSize: 11, flexShrink: 0 }}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

// ── component playgrounds ─────────────────────────────────────────────────────

function V2ButtonPlayground() {
  const [variant, setVariant] = useState('active')
  const [label, setLabel]     = useState('Get font')
  const [icon, setIcon]       = useState('')
  const cls = `v2-button v2-button-${variant}`
  const code = icon
    ? `<button class="${cls}" style="width:40px;padding:0">\n  <span class="material-symbols-outlined">${icon}</span>\n</button>`
    : `<button class="${cls}">${label}</button>`
  return (
    <Playground name="Button" cls=".v2-button" code={code}
      preview={
        icon
          ? <button className={cls} style={{ width: 40, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
            </button>
          : <button className={cls}>{label}</button>
      }
      controls={
        <ControlPanel controls={[
          { type: 'radio',  label: 'Variant', options: ['active', 'inactive'], value: variant, onChange: setVariant },
          { type: 'text',   label: 'Label',   value: label,   onChange: setLabel },
          { type: 'text',   label: 'Icon (overrides label)', value: icon, onChange: setIcon },
        ]} />
      }
    />
  )
}

function V2BadgePlayground() {
  const [label, setLabel] = useState('Humanist')
  const code = `<div class="v2-badge">${label}</div>`
  return (
    <Playground name="Badge" cls=".v2-badge" code={code}
      preview={<div className="v2-badge">{label}</div>}
      controls={<ControlPanel controls={[{ type: 'text', label: 'Label', value: label, onChange: setLabel }]} />}
    />
  )
}

function V2TagPlayground() {
  const [label, setLabel] = useState('Variable')
  const code = `<div class="v2-tag">${label}</div>`
  return (
    <Playground name="Tag" cls=".v2-tag" code={code}
      preview={<div className="v2-tag">{label}</div>}
      controls={<ControlPanel controls={[{ type: 'text', label: 'Label', value: label, onChange: setLabel }]} />}
    />
  )
}

function V2ApproachPlayground() {
  const [active, setActive] = useState(0)
  const options = ['Text', 'Display', 'Brutal']
  const code = `<div style="display:flex;gap:8px">\n${options.map((o, i) => `  <button class="v2-approach-button v2-button-${i === active ? 'active' : 'inactive'}">${o}</button>`).join('\n')}\n</div>`
  return (
    <Playground name="Approach Button" cls=".v2-approach-button" code={code}
      preview={
        <div style={{ display: 'flex', gap: 8 }}>
          {options.map((o, i) => (
            <button key={o} className={`v2-approach-button v2-button-${i === active ? 'active' : 'inactive'}`} style={{ minWidth: 72 }} onClick={() => setActive(i)}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>Ag</span>
              <span>{o}</span>
            </button>
          ))}
        </div>
      }
      controls={
        <ControlPanel controls={[
          { type: 'radio', label: 'Active', options: options, value: options[active], onChange: v => setActive(options.indexOf(v)) },
        ]} />
      }
    />
  )
}

function V2CardPlayground() {
  const [padding, setPadding] = useState('16')
  const code = `<div class="v2-card" style="padding:${padding}px">...</div>`
  return (
    <Playground name="Card" cls=".v2-card" code={code}
      preview={
        <div className="v2-card" style={{ padding: Number(padding), width: 180, border: '1px solid var(--gray-brd-prim)' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-cont-prim)', fontFamily: '"Inter Variable", sans-serif', marginBottom: 4 }}>Card title</div>
          <div style={{ fontSize: 12, color: 'var(--gray-cont-tert)', fontFamily: '"Inter Variable", sans-serif' }}>Some content inside the card.</div>
        </div>
      }
      controls={
        <ControlPanel controls={[
          { type: 'radio', label: 'Padding', options: ['8', '12', '16', '20', '24'], value: padding, onChange: setPadding },
        ]} />
      }
    />
  )
}

function V2DropdownPlayground() {
  const [style, setStyle] = useState('v2-dropdown')
  const options = ['Regular', 'Bold', 'Light', 'Italic']
  const code = `<div class="${style}">\n  <select>…</select>\n</div>`
  return (
    <Playground name="Dropdown" cls=".v2-dropdown" code={code}
      preview={
        <div className={style} style={{ display: 'flex', alignItems: 'center' }}>
          <select style={{ padding: '10px 36px 10px 12px', border: 'none', background: 'transparent', fontSize: 14, fontWeight: 500, fontFamily: '"Inter Variable", sans-serif', color: 'var(--gray-cont-prim)', cursor: 'pointer' }}>
            {options.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
      }
      controls={<ControlPanel controls={[]} />}
    />
  )
}

function V2ShimmerPlayground() {
  const [width, setWidth]   = useState('200')
  const [height, setHeight] = useState('20')
  const code = `<div class="v2-shimmer" style="width:${width}px;height:${height}px;border-radius:6px" />`
  return (
    <Playground name="Shimmer" cls=".v2-shimmer" code={code}
      preview={<div className="v2-shimmer" style={{ width: Number(width), height: Number(height), borderRadius: 6 }} />}
      controls={
        <ControlPanel controls={[
          { type: 'radio', label: 'Width',  options: ['120','160','200','240'], value: width,  onChange: setWidth },
          { type: 'radio', label: 'Height', options: ['12','16','20','24'],    value: height, onChange: setHeight },
        ]} />
      }
    />
  )
}

function BtnPlayground({ size }: { size: 'sm' | 'md' }) {
  const [state, setState] = useState('default')
  const [label, setLabel] = useState('Filter')
  const cls = `btn-${size}${state === 'active' ? ' active' : ''}`
  const code = `<button class="${cls}">${label}</button>`
  return (
    <Playground name={`Button ${size.toUpperCase()}`} cls={`.btn-${size}`} code={code}
      preview={<button className={cls}>{label}</button>}
      controls={
        <ControlPanel controls={[
          { type: 'radio', label: 'State', options: ['default', 'active'], value: state, onChange: setState },
          { type: 'text',  label: 'Label', value: label, onChange: setLabel },
        ]} />
      }
    />
  )
}

function MenuTabPlayground() {
  const [active, setActive] = useState(0)
  const tabs = ['Library', 'About', 'Submit']
  const code = tabs.map((t, i) => `<a class="menu-tab${i === active ? ' active' : ''}">${t}</a>`).join('\n')
  return (
    <Playground name="Menu Tab" cls=".menu-tab" code={code}
      preview={
        <div style={{ display: 'flex', gap: 4 }}>
          {tabs.map((t, i) => (
            // eslint-disable-next-line jsx-a11y/anchor-is-valid
            <a key={t} href="#" className={`menu-tab${i === active ? ' active' : ''}`} onClick={e => { e.preventDefault(); setActive(i) }}>{t}</a>
          ))}
        </div>
      }
      controls={
        <ControlPanel controls={[
          { type: 'radio', label: 'Active tab', options: tabs, value: tabs[active], onChange: v => setActive(tabs.indexOf(v)) },
        ]} />
      }
    />
  )
}

function IconBtnPlayground() {
  const [state, setState] = useState('default')
  const [icon, setIcon]   = useState('tune')
  const cls = `icon-btn${state === 'active' ? ' active' : ''}`
  const code = `<button class="${cls}">\n  <span class="material-symbols-outlined">${icon}</span>\n</button>`
  return (
    <Playground name="Icon Button" cls=".icon-btn" code={code}
      preview={
        <button className={cls}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
        </button>
      }
      controls={
        <ControlPanel controls={[
          { type: 'radio', label: 'State', options: ['default', 'active'], value: state, onChange: setState },
          { type: 'radio', label: 'Icon',  options: ['tune', 'search', 'close', 'filter_list', 'arrow_back'], value: icon, onChange: setIcon },
        ]} />
      }
    />
  )
}

function DownloadBtnPlayground() {
  const [label, setLabel] = useState('Get font')
  const code = `<button class="download-btn">${label}</button>`
  return (
    <Playground name="Download Button" cls=".download-btn" code={code}
      preview={<button className="download-btn">{label}</button>}
      controls={<ControlPanel controls={[{ type: 'text', label: 'Label', value: label, onChange: setLabel }]} />}
    />
  )
}

function DropdownWrapPlayground() {
  const [disabled, setDisabled] = useState(false)
  const options = ['Sans-serif', 'Serif', 'Monospace', 'Display']
  const code = `<div class="dropdown-wrap"${disabled ? ' data-disabled="true"' : ''}>\n  <select class="dropdown-select">…</select>\n  <span class="dropdown-icon material-symbols-outlined">expand_more</span>\n</div>`
  return (
    <Playground name="Dropdown Wrap" cls=".dropdown-wrap" code={code}
      preview={
        <div className="dropdown-wrap" data-disabled={disabled ? 'true' : undefined}>
          <select className="dropdown-select" disabled={disabled}>
            {options.map(o => <option key={o}>{o}</option>)}
          </select>
          <span className="dropdown-icon material-symbols-outlined" style={{ fontSize: 16 }}>expand_more</span>
        </div>
      }
      controls={
        <ControlPanel controls={[
          { type: 'toggle', label: 'Disabled', value: disabled, onChange: setDisabled },
        ]} />
      }
    />
  )
}

function SegmentedControlPlayground() {
  const [active, setActive] = useState(0)
  const options = ['Ag Text', 'Ag Display', 'Ag Brutal']
  const code = `<div class="segmented-control">\n${options.map((o, i) => `  <button class="segmented-control-button${i === active ? ' active' : ''}">${o}</button>`).join('\n')}\n</div>`
  return (
    <Playground name="Segmented Control" cls=".segmented-control" code={code}
      preview={
        <div className="segmented-control" style={{ width: 240 }}>
          {options.map((o, i) => (
            <button key={o} className={`segmented-control-button${i === active ? ' active' : ''}`} onClick={() => setActive(i)}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>Ag</span>
              <span>{o.replace('Ag ', '')}</span>
            </button>
          ))}
        </div>
      }
      controls={
        <ControlPanel controls={[
          { type: 'radio', label: 'Active', options: ['Text', 'Display', 'Brutal'], value: options[active].replace('Ag ', ''), onChange: v => setActive(options.findIndex(o => o.includes(v))) },
        ]} />
      }
    />
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function DesignSystemPage() {
  return (
    <div style={{ backgroundColor: 'var(--gray-surface-prim)', minHeight: '100vh' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px 120px' }}>

        {/* Header */}
        <div style={{ marginBottom: 56 }}>
          <Link href="/" style={{ fontSize: 13, color: 'var(--gray-cont-tert)', textDecoration: 'none' }}>← Library</Link>
          <h1 style={{ fontSize: 32, fontWeight: 600, marginTop: 16, color: 'var(--gray-cont-prim)', fontFamily: '"Inter Variable", sans-serif' }}>
            Design System
          </h1>
          <p style={{ fontSize: 14, color: 'var(--gray-cont-sec)', marginTop: 8, fontFamily: '"Inter Variable", sans-serif' }}>
            Foundation tokens and interactive component playground
          </p>
        </div>

        {/* ── FOUNDATION ──────────────────────────────────────────────────── */}

        <Section title="Colors — gray tokens">
          <p style={{ fontSize: 12, color: 'var(--gray-cont-tert)', marginBottom: 16, fontFamily: '"Inter Variable", sans-serif' }}>
            Theme via <Mono>prefers-color-scheme</Mono>. Light base <Mono>#0a0a0a</Mono> · Dark base <Mono>#fcfcfc</Mono>
          </p>
          <TokenTable groups={GRAY_TOKENS} />
        </Section>

        <Section title="Colors — misc tokens">
          <TokenTable groups={MISC_TOKENS} />
        </Section>

        <Section title="Colors — shadcn tokens">
          <p style={{ fontSize: 12, color: 'var(--gray-cont-tert)', marginBottom: 16, fontFamily: '"Inter Variable", sans-serif' }}>
            Used by shadcn components (Slider etc). <Mono>oklch</Mono> values approximated to hex for display.
          </p>
          <TokenTable groups={SHADCN_TOKENS} />
        </Section>

        <Section title="Typography">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {[
              { name: 'Inter Variable', family: 'var(--font-inter)', note: '--font-inter · main UI font', weights: [400, 500, 600, 700, 900] },
              { name: 'Space Grotesk',  family: 'var(--font-space-grotesk)', note: '--font-space-grotesk · used in: unknown', weights: [400, 500, 700] },
              { name: 'Space Mono',     family: 'var(--font-space-mono)',    note: '--font-space-mono · code labels', weights: [400, 700] },
            ].map(f => (
              <div key={f.name} style={{ borderRadius: 12, border: '1px solid var(--gray-brd-prim)', overflow: 'hidden' }}>
                <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--gray-brd-prim)' }}>
                  <div style={{ fontSize: 36, fontFamily: f.family, fontWeight: 500, color: 'var(--gray-cont-prim)', lineHeight: 1.1 }}>{f.name}</div>
                  <Label>{f.note}</Label>
                </div>
                <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {f.weights.map(w => (
                    <div key={w} style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
                      <code style={{ fontSize: 10, color: 'var(--gray-cont-tert)', fontFamily: 'var(--font-space-mono)', width: 32, flexShrink: 0 }}>{w}</code>
                      <span style={{ fontFamily: f.family, fontWeight: w, fontSize: 15, color: 'var(--gray-cont-prim)', lineHeight: 1.4 }}>
                        The quick brown fox jumps over the lazy dog
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, borderRadius: 12, border: '1px solid var(--gray-brd-prim)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--gray-brd-prim)', fontSize: 10, fontWeight: 700, color: 'var(--gray-cont-tert)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Utility classes</div>
            {[
              { cls: '.text-sidebar-title', sample: 'Sidebar title', spec: 'Inter Variable 14px/14px 500, ss03+cv06+cv11' },
              { cls: '.text-font-name',     sample: 'Font name',     spec: 'Inter Variable 14px/20px 500, ss03+cv06+cv11' },
              { cls: '.text-menu',          sample: 'Menu item',     spec: 'Inter Variable 14px/20px 500 (same as .text-font-name)' },
              { cls: '.text-author',        sample: 'by Some Author', spec: 'Inter Variable 14px/20px 500 · color: --gray-cont-tert' },
            ].map(({ cls, sample, spec }, i, arr) => (
              <div key={cls} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--gray-brd-prim)' : 'none' }}>
                <Mono>{cls}</Mono>
                <div className={cls.slice(1)} style={{ flex: 1 }}>{sample}</div>
                <div style={{ fontSize: 11, color: 'var(--gray-cont-tert)', fontFamily: 'var(--font-space-mono)', flexShrink: 0, display: 'none' }}>{spec}</div>
                <div style={{ fontSize: 11, color: 'var(--gray-cont-tert)', fontFamily: '"Inter Variable", sans-serif', textAlign: 'right' }}>{spec}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Radius">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { token: '--radius-component', value: '14px', use: 'buttons, badges, dropdowns', r: 14 },
              { token: '--radius-card',      value: '24px', use: 'cards, panels, bottom bar',  r: 24 },
            ].map(({ token, value, use, r }) => (
              <div key={token} style={{ borderRadius: 12, border: '1px solid var(--gray-brd-prim)', padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ width: 64, height: 40, borderRadius: r, background: 'var(--gray-fill-sec)', border: '1px solid var(--gray-brd-prim)', flexShrink: 0 }} />
                <div>
                  <Mono>{token}</Mono>
                  <div style={{ fontSize: 12, color: 'var(--gray-cont-prim)', fontFamily: '"Inter Variable", sans-serif', marginTop: 4 }}>{value}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-cont-tert)', fontFamily: '"Inter Variable", sans-serif', marginTop: 2 }}>{use}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Spacing">
          <p style={{ fontSize: 12, color: 'var(--gray-cont-sec)', marginBottom: 16, fontFamily: '"Inter Variable", sans-serif' }}>
            No spacing tokens — all values hardcoded inline. Base unit: 4px.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 }}>
            {[4, 8, 12, 16, 20, 24, 32, 40, 48, 64].map(s => (
              <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: s, height: s, background: 'var(--gray-fill-sec)', border: '1px solid var(--gray-brd-prim)', borderRadius: 3 }} />
                <div style={{ fontSize: 10, color: 'var(--gray-cont-tert)', fontFamily: 'var(--font-space-mono)' }}>{s}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── COMPONENTS ──────────────────────────────────────────────────── */}

        <Section title="Components — v2 (catalog.css)">
          <V2ButtonPlayground />
          <V2BadgePlayground />
          <V2TagPlayground />
          <V2ApproachPlayground />
          <V2CardPlayground />
          <V2DropdownPlayground />
          <V2ShimmerPlayground />
        </Section>

        <Section title="Components — utility (globals.css)">
          <BtnPlayground size="sm" />
          <BtnPlayground size="md" />
          <MenuTabPlayground />
          <IconBtnPlayground />
          <DownloadBtnPlayground />
          <DropdownWrapPlayground />
          <SegmentedControlPlayground />
        </Section>

      </div>
    </div>
  )
}
