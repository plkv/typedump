'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import type { FontFamily } from '@/lib/models/FontFamily'
import { canonicalFamilyName } from '@/lib/font-naming'
import { shortHash } from '@/lib/hash'

// ─── helpers ────────────────────────────────────────────────────────────────

function variantCssFamily(family: FontFamily, variantId: string) {
  const alias = canonicalFamilyName(family.name)
  const fHash = shortHash(alias).slice(0, 6)
  const vHash = shortHash(variantId).slice(0, 6)
  return `${alias}-${fHash}__v_${vHash}`
}

function buildFontFaceCSS(family: FontFamily): string {
  return family.variants.map(v => {
    const css = variantCssFamily(family, v.id)
    const url = v.blobUrl || `/fonts/${v.filename}`

    // weight range for variable fonts
    const wAxis = v.variableAxes?.find(a => a.axis === 'wght')
    const weight = v.isVariable && wAxis
      ? `${Math.floor(wAxis.min)} ${Math.ceil(wAxis.max)}`
      : `${v.weight}`

    const ext = v.filename.split('.').pop()?.toLowerCase() ?? 'ttf'
    const fmt = ext === 'woff2' ? 'woff2' : ext === 'woff' ? 'woff' : ext === 'otf' ? 'opentype' : 'truetype'

    return `@font-face{font-family:"${css}";src:url("${url}") format("${fmt}");font-weight:${weight};font-style:${v.isItalic ? 'italic' : 'normal'};font-display:swap;}`
  }).join('\n')
}

function weightLabel(w: number) {
  const map: Record<number, string> = {
    100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular',
    500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black',
  }
  return map[w] ?? `${w}`
}

// ─── main component ──────────────────────────────────────────────────────────

const DEFAULT_TEXT = 'The quick brown fox jumps over the lazy dog'

export function FontDetail({ family }: { family: FontFamily }) {
  const [previewText, setPreviewText] = useState(DEFAULT_TEXT)
  const [fontSize, setFontSize] = useState(48)
  const [lineHeight, setLineHeight] = useState(1.2)
  const [letterSpacing, setLetterSpacing] = useState(0)
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('left')
  const fontFaceInjected = useRef(false)

  // Inject @font-face CSS once
  useEffect(() => {
    if (fontFaceInjected.current) return
    fontFaceInjected.current = true
    const css = buildFontFaceCSS(family)
    const el = document.createElement('style')
    el.setAttribute('data-font-detail', family.name)
    el.textContent = css
    document.head.appendChild(el)
    return () => { el.remove() }
  }, [family])

  const isVariable = family.isVariable || family.variants.some(v => v.isVariable)

  // Sort variants: non-italic first, then italic; by weight asc
  const sorted = [...family.variants].sort((a, b) => {
    if (a.isItalic !== b.isItalic) return a.isItalic ? 1 : -1
    return a.weight - b.weight
  })

  const defaultVariant = family.variants.find(v => v.isDefaultStyle) ?? sorted[0]
  const heroFont = defaultVariant ? variantCssFamily(family, defaultVariant.id) : 'system-ui'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-surface-prim)' }}>

      {/* ── Back nav ── */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--gray-brd-prim)' }}>
        <Link href="/" style={{
          fontSize: 13, fontWeight: 500, color: 'var(--gray-cont-sec)',
          textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontSize: 16 }}>←</span> Library
        </Link>
      </div>

      {/* ── Hero ── */}
      <div style={{
        padding: '48px 24px 40px',
        borderBottom: '1px solid var(--gray-brd-prim)',
      }}>
        <h1 style={{
          fontFamily: `"${heroFont}", system-ui, sans-serif`,
          fontSize: 'clamp(48px, 8vw, 120px)',
          fontWeight: defaultVariant?.weight ?? 400,
          fontStyle: defaultVariant?.isItalic ? 'italic' : 'normal',
          lineHeight: 1,
          margin: '0 0 20px',
          color: 'var(--gray-cont-prim)',
          letterSpacing: '-0.02em',
        }}>
          {family.name}
        </h1>

        {/* Meta row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span className="v2-badge" style={{ fontSize: 13, padding: '6px 10px', height: 'auto' }}>
            {family.category.join(' · ')}
          </span>
          <span className="v2-badge" style={{ fontSize: 13, padding: '6px 10px', height: 'auto' }}>
            {family.collection}
          </span>
          <span className="v2-badge" style={{ fontSize: 13, padding: '6px 10px', height: 'auto' }}>
            {sorted.length} style{sorted.length !== 1 ? 's' : ''}
          </span>
          {isVariable && (
            <span className="v2-badge" style={{ fontSize: 13, padding: '6px 10px', height: 'auto', color: 'var(--gray-cont-sec)' }}>
              Variable
            </span>
          )}
          {family.downloadLink && (
            <a
              href={family.downloadLink}
              target="_blank"
              rel="noopener noreferrer"
              className="v2-button v2-button-active"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              Get font ↗
            </a>
          )}
        </div>
      </div>

      {/* ── Sticky controls ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        backgroundColor: 'var(--gray-surface-prim)',
        borderBottom: '1px solid var(--gray-brd-prim)',
        padding: '12px 24px',
        display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center',
        backdropFilter: 'blur(8px)',
      }}>
        {/* Preview text input */}
        <input
          value={previewText}
          onChange={e => setPreviewText(e.target.value)}
          placeholder="Type to preview…"
          style={{
            flex: '1 1 200px', minWidth: 160, maxWidth: 320,
            padding: '8px 12px', borderRadius: 10,
            border: '1px solid var(--gray-brd-prim)',
            backgroundColor: 'var(--gray-surface-sec)',
            color: 'var(--gray-cont-prim)',
            fontSize: 13, fontFamily: 'inherit',
          }}
        />

        {/* Size */}
        <SliderControl label="Size" value={fontSize} min={12} max={200} step={1}
          format={v => `${v}px`} onChange={setFontSize} />

        {/* Spacing */}
        <SliderControl label="Spacing" value={letterSpacing} min={-5} max={20} step={0.5}
          format={v => `${v > 0 ? '+' : ''}${v}px`} onChange={setLetterSpacing} />

        {/* Line height */}
        <SliderControl label="Leading" value={lineHeight} min={0.8} max={3} step={0.1}
          format={v => v.toFixed(1)} onChange={setLineHeight} />

        {/* Alignment */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['left', 'center', 'right'] as const).map(a => (
            <button key={a} onClick={() => setAlign(a)} style={{
              width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
              backgroundColor: align === a ? 'var(--gray-cont-prim)' : 'var(--gray-fill-sec)',
              color: align === a ? 'var(--gray-surface-prim)' : 'var(--gray-cont-sec)',
              fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {a === 'left' ? '⬛' : a === 'center' ? '▣' : '▪'}
            </button>
          ))}
        </div>

        {/* Reset */}
        <button onClick={() => {
          setFontSize(48); setLineHeight(1.2); setLetterSpacing(0); setAlign('left')
          setPreviewText(DEFAULT_TEXT)
        }} style={{
          padding: '6px 12px', borderRadius: 8, border: '1px solid var(--gray-brd-prim)',
          backgroundColor: 'transparent', color: 'var(--gray-cont-sec)',
          fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Reset
        </button>
      </div>

      {/* ── Variant rows ── */}
      <div>
        {sorted.map((variant) => {
          const css = variantCssFamily(family, variant.id)
          const label = variant.styleName || `${weightLabel(variant.weight)}${variant.isItalic ? ' Italic' : ''}`
          return (
            <VariantRow
              key={variant.id}
              label={label}
              fontFamily={`"${css}", system-ui, sans-serif`}
              weight={variant.weight}
              isItalic={variant.isItalic}
              fontSize={fontSize}
              lineHeight={lineHeight}
              letterSpacing={letterSpacing}
              align={align}
              text={previewText}
              onChange={setPreviewText}
            />
          )
        })}
      </div>

      {/* ── Info section ── */}
      <div style={{
        padding: '40px 24px 80px',
        borderTop: '1px solid var(--gray-brd-prim)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 40,
      }}>
        {/* Left: about */}
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--gray-cont-prim)' }}>
            About this font
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <InfoRow label="Foundry" value={family.foundry} />
            <InfoRow label="Category" value={family.category.join(', ')} />
            <InfoRow label="Collection" value={family.collection} />
            <InfoRow label="Styles" value={`${sorted.length}`} />
            {isVariable && <InfoRow label="Type" value="Variable font" />}
            {family.downloadLink && (
              <InfoRow label="Download" value={
                <a href={family.downloadLink} target="_blank" rel="noopener noreferrer"
                  style={{ color: 'var(--gray-cont-prim)', textDecoration: 'underline' }}>
                  Get font ↗
                </a>
              } />
            )}
          </div>
        </div>

        {/* Middle: languages & tags */}
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--gray-cont-prim)' }}>
            Details
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {family.languages.length > 0 && (
              <InfoRow label="Languages" value={family.languages.join(', ')} />
            )}
            {family.styleTags.length > 0 && (
              <InfoRow label="Style" value={family.styleTags.join(', ')} />
            )}
            {isVariable && defaultVariant?.variableAxes && defaultVariant.variableAxes.length > 0 && (
              <InfoRow label="Axes" value={defaultVariant.variableAxes.map(a => a.name).join(', ')} />
            )}
          </div>
        </div>

        {/* Right: OT features */}
        {defaultVariant?.openTypeFeatures && defaultVariant.openTypeFeatures.length > 0 && (
          <div>
            <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--gray-cont-prim)' }}>
              OpenType features
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {defaultVariant.openTypeFeatures.slice(0, 12).map(f => (
                <span key={f} className="v2-badge" style={{ fontSize: 12, padding: '4px 8px', height: 'auto', color: 'var(--gray-cont-sec)' }}>
                  {typeof f === 'string' ? f : (f as any).title ?? (f as any).tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Variant row ────────────────────────────────────────────────────────────

function VariantRow({
  label, fontFamily, weight, isItalic,
  fontSize, lineHeight, letterSpacing, align, text, onChange,
}: {
  label: string
  fontFamily: string
  weight: number
  isItalic: boolean
  fontSize: number
  lineHeight: number
  letterSpacing: number
  align: 'left' | 'center' | 'right'
  text: string
  onChange: (t: string) => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // Auto-resize
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [text, fontSize, lineHeight, letterSpacing])

  return (
    <div style={{ borderBottom: '1px solid var(--gray-brd-prim)', padding: '0 24px' }}>
      <div style={{
        fontSize: 11, fontWeight: 500, color: 'var(--gray-cont-tert)',
        padding: '10px 0 6px', fontFamily: 'inherit',
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {label} · {weight}
      </div>
      <textarea
        ref={ref}
        value={text}
        onChange={e => onChange(e.target.value)}
        rows={1}
        style={{
          width: '100%', display: 'block',
          fontFamily, fontSize, lineHeight, letterSpacing: `${letterSpacing}px`,
          fontWeight: weight,
          fontStyle: isItalic ? 'italic' : 'normal',
          textAlign: align,
          color: 'var(--gray-cont-prim)',
          backgroundColor: 'transparent',
          border: 'none', outline: 'none', resize: 'none',
          padding: '8px 0 20px',
          overflowY: 'hidden',
        }}
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  )
}

// ─── Slider control ─────────────────────────────────────────────────────────

function SliderControl({ label, value, min, max, step, format, onChange }: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 160 }}>
      <span style={{ fontSize: 12, color: 'var(--gray-cont-tert)', whiteSpace: 'nowrap', width: 52 }}>{label}</span>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: 'var(--gray-cont-prim)', cursor: 'pointer' }}
      />
      <span style={{ fontSize: 12, color: 'var(--gray-cont-sec)', whiteSpace: 'nowrap', width: 36, textAlign: 'right' }}>
        {format(value)}
      </span>
    </div>
  )
}

// ─── Info row ────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--gray-brd-prim)', paddingBottom: 10 }}>
      <span style={{ fontSize: 13, color: 'var(--gray-cont-tert)', minWidth: 80 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--gray-cont-prim)' }}>{value}</span>
    </div>
  )
}
