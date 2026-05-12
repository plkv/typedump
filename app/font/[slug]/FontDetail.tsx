'use client'

import { useState, useEffect, useRef } from 'react'
import type { FontFamily } from '@/lib/models/FontFamily'
import { variantCssFamily } from '@/lib/font-face-css'
import { Navbar } from '@/components/font-catalog/Navbar'
import { IconReset, IconAlignLeft, IconAlignCenter, IconAlignRight } from '@/components/icons'
import { Slider } from '@/components/ui/slider'
import { getFontFeatureSettings, getFontVariationSettings } from '@/lib/font-style-utils'


function weightLabel(w: number) {
  const map: Record<number, string> = {
    100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular',
    500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black',
  }
  return map[w] ?? `${w}`
}

// ─── main component ──────────────────────────────────────────────────────────

const TEXT_PRESETS = ['Names', 'Key Glyphs', 'Basic', 'Paragraph', 'Brands'] as const
type TextPreset = typeof TEXT_PRESETS[number]

function getPresetContent(preset: TextPreset, fontName: string): string {
  switch (preset) {
    case 'Names': return fontName
    case 'Key Glyphs': return 'RKFJIGCQ aueoyrgsltf 0123469 ≪"(@&?;€$© ->…'
    case 'Basic': return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 !@#$%^&*()_+-=[]{}|;\':",./<>?'
    case 'Paragraph': {
      const paragraphs = [
        'Balenciaga, Our Legacy, and Acne Studios continue to redefine avant-garde style, pushing silhouettes beyond conventional logic. Designers like Demna and Jonny Johansson layer irony with tailoring, mixing XXL coats, micro-bags, raw denim, and surreal proportions.',
        'The global market trades on symbols: AAPL at $212.45, ETH climbing +5.6%, EUR/USD swinging. Every decimal moves billions. Exchanges speak a secret dialect of IPO, ETF, CAGR, ROI.',
        'Every startup dreams of unicorn status: $1B valuation, growth curve slashing up at 45°. Founders pitch "AI-powered SaaS" or "climate-tech with blockchain backbone," their decks filled with KPIs, TAM, CAC vs LTV.',
      ]
      return paragraphs[Math.floor(Math.random() * paragraphs.length)]
    }
    case 'Brands': {
      const brandSets = [
        'Maison Margiela • Off-White • Y/Project • Rimowa • A-Cold-Wall* • Figma • Balenciaga • OpenAI • Byredo',
        'Figma • Arc\'teryx • Rimowa • Aimé Leon Dore • Balenciaga • Klarna • Off-White • SpaceX • Notion',
        'Byredo • Maison Margiela • Notion • Figma • Off-White • Rimowa • OpenAI • Balenciaga • Arc\'teryx',
      ]
      return brandSets[Math.floor(Math.random() * brandSets.length)]
    }
  }
}

interface FontSearchItem { name: string; author: string }

export function FontDetail({ family, fonts = [] }: { family: FontFamily; fonts?: FontSearchItem[] }) {
  const [selectedPreset, setSelectedPreset] = useState<TextPreset>('Names')
  const [previewText, setPreviewText] = useState(() => family.name)
  const [fontSize, setFontSize] = useState(80)
  const [lineHeight, setLineHeight] = useState(1.2)
  const [letterSpacing, setLetterSpacing] = useState(0)
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('left')
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null)
  const [rowOtFeatures, setRowOtFeatures] = useState<Record<string, Record<string, boolean>>>({})
  const [rowVarAxes, setRowVarAxes] = useState<Record<string, Record<string, number>>>({})
  const isVariable = family.isVariable || family.variants.some(v => v.isVariable)

  // Sort variants: non-italic first, then italic; by weight asc
  const sorted = [...family.variants].sort((a, b) => {
    if (a.isItalic !== b.isItalic) return a.isItalic ? 1 : -1
    return a.weight - b.weight
  })

  // For variable fonts: synthesize named weight rows from the wght axis range
  const WEIGHT_NAMES: Record<number, string> = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' }

  type StyleAlt = { tag: string; title: string }
  type AxisDef = { name: string; tag: string; min: number; max: number; default: number }
  type RowSpec = { key: string; label: string; cssFamily: string; weight: number; isItalic: boolean; styleAlternates: StyleAlt[]; axesDef: AxisDef[] }

  const variantRows: RowSpec[] = (() => {
    const regularVar = sorted.find(v => v.isVariable && !v.isItalic) ?? sorted.find(v => v.isVariable)
    const italicVar = sorted.find(v => v.isVariable && v.isItalic)
    const wAxis = regularVar?.variableAxes?.find(a => (a as any).tag === 'wght' || a.axis === 'wght')

    const toAxesDef = (v: typeof sorted[0], nominalWeight?: number): AxisDef[] =>
      (v.variableAxes ?? []).map(a => {
        const tag = (a as any).tag ?? a.axis
        const isWght = tag === 'wght'
        return { name: a.name, tag, min: a.min, max: a.max, default: isWght && nominalWeight != null ? nominalWeight : a.default }
      })

    const toStyleAlts = (v: typeof sorted[0]): StyleAlt[] =>
      (v.openTypeFeatureTags ?? []).filter(f => /^(ss\d\d|cv\d\d)$/.test(f.tag))

    if (isVariable && regularVar && wAxis) {
      const weights = [100, 200, 300, 400, 500, 600, 700, 800, 900].filter(w => w >= wAxis.min && w <= wAxis.max)
      const alts = toStyleAlts(regularVar)
      const rows: RowSpec[] = weights.map(w => ({
        key: `${w}-false`,
        label: WEIGHT_NAMES[w] ?? `${w}`,
        cssFamily: variantCssFamily(family, regularVar.id),
        weight: w, isItalic: false,
        styleAlternates: alts, axesDef: toAxesDef(regularVar, w),
      }))
      if (italicVar) {
        const iAlts = toStyleAlts(italicVar)
        rows.push(...weights.map(w => ({
          key: `${w}-true`,
          label: `${WEIGHT_NAMES[w] ?? w} Italic`,
          cssFamily: variantCssFamily(family, italicVar.id),
          weight: w, isItalic: true,
          styleAlternates: iAlts, axesDef: toAxesDef(italicVar, w),
        })))
      }
      return rows
    }

    return sorted.map(v => ({
      key: `${v.weight}-${v.isItalic}`,
      label: v.styleName || `${weightLabel(v.weight)}${v.isItalic ? ' Italic' : ''}`,
      cssFamily: variantCssFamily(family, v.id),
      weight: v.weight, isItalic: v.isItalic,
      styleAlternates: toStyleAlts(v), axesDef: toAxesDef(v),
    }))
  })()

  const defaultVariant = family.variants.find(v => v.isDefaultStyle) ?? sorted[0]
  const heroFont = defaultVariant ? variantCssFamily(family, defaultVariant.id) : 'system-ui'

  const allAlternateTags = [...new Set(
    family.variants.flatMap(v =>
      (v.openTypeFeatureTags ?? []).filter(f => /^(ss\d\d|cv\d\d)$/.test(f.tag)).map(f => f.tag)
    )
  )]
  const typeInfo = [
    isVariable && 'Variable',
    allAlternateTags.length > 0 && `${allAlternateTags.length} Alternates`,
  ].filter(Boolean).join(', ')

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-surface-sec)' }}>

      <Navbar back fonts={fonts} />

      {/* ── Spacer for fixed navbar ── */}
      <div style={{ paddingTop: '88px' }} />

      {/* ── Hero ── */}
      <div style={{
        padding: '48px 24px 56px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
      }}>
        <div style={{
          fontFamily: `"${heroFont}", system-ui, sans-serif`,
          fontSize: 'clamp(48px, 20vw, 180px)',
          fontWeight: defaultVariant?.weight ?? 400,
          fontStyle: defaultVariant?.isItalic ? 'italic' : 'normal',
          lineHeight: 1.1,
          color: 'var(--gray-cont-prim)',
          textAlign: 'center',
          wordBreak: 'break-word',
        }}>
          {family.name}
        </div>
        <div style={{
          fontFamily: '"Inter Variable", sans-serif',
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--gray-cont-tert)',
        }}>
          by {family.foundry}
        </div>
        {family.downloadLink && (
          <a
            href={family.downloadLink}
            target="_blank"
            rel="noopener noreferrer"
            className="v2-badge v2-button-active"
            style={{ textDecoration: 'none', marginTop: '4px' }}
            onClick={() => (window as any).gtag?.('event', 'get_font', { font_name: family.name })}
          >
            Get font
          </a>
        )}
      </div>

      {/* ── Variant rows ── */}
      <div style={{ padding: '0 16px 12px' }}>
        <div className="v2-card" style={{ overflow: 'hidden' }}>

          {/* Presets row */}
          <div style={{ padding: '16px', borderBottom: '1px solid var(--gray-brd-prim)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            {TEXT_PRESETS.map(preset => (
              <button key={preset}
                onClick={() => { setSelectedPreset(preset); setPreviewText(getPresetContent(preset, family.name)) }}
                className={`v2-button ${selectedPreset === preset ? 'v2-button-active' : 'v2-button-inactive'}`}
              >
                {preset}
              </button>
            ))}
            <div className="font-detail-align-row">
              <div className="font-detail-align-group">
                {([
                  { a: 'left',   Icon: IconAlignLeft },
                  { a: 'center', Icon: IconAlignCenter },
                  { a: 'right',  Icon: IconAlignRight },
                ] as const).map(({ a, Icon }) => (
                  <button key={a} onClick={() => setAlign(a)}
                    className={`v2-button ${align === a ? 'v2-button-active' : 'v2-button-inactive'}`}
                    style={{ width: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Icon size={20} />
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setFontSize(80); setLineHeight(1.2); setLetterSpacing(0); setAlign('left'); setSelectedPreset('Names'); setPreviewText(family.name); setRowOtFeatures({}); setRowVarAxes({}); setExpandedRowKey(null) }}
                className="v2-button v2-button-inactive"
                style={{ padding: 0, width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <IconReset size={20} />
              </button>
            </div>
          </div>

          {/* Controls row */}
          <div className="font-detail-controls">
            <SliderControl label="Size" value={fontSize} min={12} max={200} step={1}
              format={v => `${v}px`} onChange={setFontSize} onReset={() => setFontSize(80)} />
            <SliderControl label="Letter Space" value={letterSpacing} min={-5} max={20} step={0.5}
              format={v => `${v > 0 ? '+' : ''}${v}px`} onChange={setLetterSpacing} onReset={() => setLetterSpacing(0)} />
            <SliderControl label="Leading" value={lineHeight} min={0.8} max={3} step={0.1}
              format={v => v.toFixed(1)} onChange={setLineHeight} onReset={() => setLineHeight(1.2)} />
          </div>
          {variantRows.map((vr, i) => {
            const isExpanded = expandedRowKey === vr.key
            const hasSettings = vr.styleAlternates.length > 0 || vr.axesDef.length > 0
            const otFeatures = rowOtFeatures[vr.key] ?? {}
            const varAxes = rowVarAxes[vr.key] ?? {}
            const varSettings = getFontVariationSettings({ wght: vr.weight, ...varAxes })
            const featureSettings = getFontFeatureSettings(otFeatures)
            return (
              <VariantRow
                key={vr.key}
                label={vr.label}
                fontFamily={`"${vr.cssFamily}", system-ui, sans-serif`}
                weight={vr.weight}
                isItalic={vr.isItalic}
                fontSize={fontSize}
                lineHeight={lineHeight}
                letterSpacing={letterSpacing}
                align={align}
                text={previewText}
                onChange={setPreviewText}
                isLast={i === variantRows.length - 1}
                fontVariationSettings={varSettings}
                fontFeatureSettings={featureSettings}
                hasSettings={hasSettings}
                isExpanded={isExpanded}
                onToggleExpand={() => setExpandedRowKey(isExpanded ? null : vr.key)}
                styleAlternates={vr.styleAlternates}
                otFeatures={otFeatures}
                onToggleOtFeature={tag => setRowOtFeatures(prev => ({
                  ...prev,
                  [vr.key]: { ...(prev[vr.key] ?? {}), [tag]: !(prev[vr.key]?.[tag]) }
                }))}
                axesDef={vr.axesDef}
                varAxes={varAxes}
                onAxisChange={(tag, val) => setRowVarAxes(prev => ({
                  ...prev,
                  [vr.key]: { ...(prev[vr.key] ?? {}), [tag]: val }
                }))}
              />
            )
          })}
        </div>
      </div>

      {/* ── Info section ── */}
      <div className="font-detail-info-grid" style={{
        padding: '0 16px 80px',
        display: 'grid',
        gap: 12,
      }}>

        {/* Left: About + description */}
        <div className="v2-card" style={{ padding: '20px 24px 24px' }}>
          <div className="text-author" style={{ marginBottom: 12 }}>About</div>
          <p style={{
            fontFamily: '"Inter Variable", sans-serif',
            fontSize: 14, fontWeight: 400, lineHeight: 1.6,
            color: 'var(--gray-cont-prim)',
            margin: 0,
          }}>
            {family.description || `${family.name} is a ${family.category.join(', ').toLowerCase()} typeface${family.foundry !== 'Unknown' ? ` by ${family.foundry}` : ''}. It includes ${sorted.length} style${sorted.length !== 1 ? 's' : ''}${isVariable ? ' and supports variable font axes' : ''}.`}
          </p>
        </div>

        {/* Right: Details table */}
        <div className="v2-card" style={{ padding: '20px 24px 24px' }}>
          <div className="text-author" style={{ marginBottom: 12 }}>Details</div>
          <div className="info-table" style={{ display: 'flex', flexDirection: 'column' }}>
            {family.publishedAt && (
              <InfoRow label="Released" value={new Date(family.publishedAt).getFullYear().toString()} />
            )}
            {typeInfo && <InfoRow label="Type" value={typeInfo} />}
            {family.designerInfo?.designer && (
              <InfoRow label="Author" value={
                family.designerInfo.designerURL
                  ? <a href={family.designerInfo.designerURL} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gray-cont-prim)' }}>{family.designerInfo.designer} ↗</a>
                  : family.designerInfo.designer
              } />
            )}
            {family.foundry && family.foundry !== 'Unknown' && (
              <InfoRow label="Author" value={
                family.designerInfo?.vendorURL
                  ? <a href={family.designerInfo.vendorURL} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gray-cont-prim)' }}>{family.foundry} ↗</a>
                  : family.foundry
              } />
            )}
            {family.licenseInfo?.type && (
              <InfoRow label="License" value={
                family.licenseInfo.url
                  ? <a href={family.licenseInfo.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gray-cont-prim)' }}>{family.licenseInfo.type} ↗</a>
                  : family.licenseInfo.type
              } />
            )}
            {(family.languages || []).length > 0 && (
              <InfoRow label="Languages" value={(family.languages || []).join(', ')} />
            )}
            {(() => {
              const tags = [family.collection, ...family.category, ...family.styleTags].filter(Boolean)
              return tags.length > 0 ? <InfoRow label="Tags" value={tags.join(', ')} /> : null
            })()}
          </div>
        </div>

      </div>

      {/* ── Footer ── */}
      <footer style={{ padding: '16px 24px' }}>
        <span style={{ fontFamily: '"Inter Variable", sans-serif', fontSize: 13, fontWeight: 500, color: 'var(--gray-cont-tert)' }}>
          © 2026 TypeDump. Built and curated by{' '}
          <a href="https://plkv.works/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gray-cont-prim)' }}>Stas Polyakov</a>
        </span>
      </footer>

    </div>
  )
}

// ─── Hero preview ────────────────────────────────────────────────────────────

function HeroPreview({
  text, onChange, fontFamily, fontSize, lineHeight, letterSpacing, fontWeight, fontStyle, align,
}: {
  text: string
  onChange: (t: string) => void
  fontFamily: string
  fontSize: number
  lineHeight: number
  letterSpacing: number
  fontWeight: number
  fontStyle: string
  align: 'left' | 'center' | 'right'
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [text, fontSize, lineHeight, letterSpacing])

  return (
    <textarea
      ref={ref}
      value={text}
      onChange={e => onChange(e.target.value)}
      rows={1}
      style={{
        width: '100%', display: 'block',
        fontFamily, fontSize: `${fontSize}px`,
        lineHeight, letterSpacing: `${letterSpacing}px`,
        fontWeight, fontStyle,
        textAlign: align,
        color: 'var(--gray-cont-prim)',
        backgroundColor: 'transparent',
        border: 'none', outline: 'none', resize: 'none',
        padding: '16px 0',
        overflowY: 'hidden',
      }}
      spellCheck={false}
      autoComplete="off"
    />
  )
}

// ─── Variant row ────────────────────────────────────────────────────────────

function VariantRow({
  label, fontFamily, weight, isItalic,
  fontSize, lineHeight, letterSpacing, align, text, onChange, isLast,
  fontVariationSettings, fontFeatureSettings,
  hasSettings, isExpanded, onToggleExpand,
  styleAlternates, otFeatures, onToggleOtFeature,
  axesDef, varAxes, onAxisChange,
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
  isLast?: boolean
  fontVariationSettings?: string
  fontFeatureSettings?: string
  hasSettings?: boolean
  isExpanded?: boolean
  onToggleExpand?: () => void
  styleAlternates?: Array<{ tag: string; title: string }>
  otFeatures?: Record<string, boolean>
  onToggleOtFeature?: (tag: string) => void
  axesDef?: Array<{ name: string; tag: string; min: number; max: number; default: number }>
  varAxes?: Record<string, number>
  onAxisChange?: (tag: string, val: number) => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [text, fontSize, lineHeight, letterSpacing, fontVariationSettings])

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (isExpanded && !e.currentTarget.contains(e.relatedTarget as Node)) {
      onToggleExpand?.()
    }
  }

  return (
    <div style={{ borderBottom: isLast && !isExpanded ? 'none' : '1px solid var(--gray-brd-prim)', padding: '0 16px' }} onBlur={handleBlur}>
      {/* Label row — clickable if has settings */}
      <div
        className="text-author"
        onClick={hasSettings ? onToggleExpand : undefined}
        style={{
          padding: '10px 0 6px',
          cursor: hasSettings ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <span>{label} · {weight}</span>
        {hasSettings && (
          <span style={{ color: 'var(--gray-cont-tert)', fontSize: 12, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}>▾</span>
        )}
      </div>

      {/* Preview textarea */}
      <textarea
        ref={ref}
        value={text}
        onChange={e => onChange(e.target.value)}
        onFocus={() => { if (hasSettings && !isExpanded) onToggleExpand?.() }}
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
          padding: '20px 0 28px',
          overflowY: 'hidden',
          fontVariationSettings,
          fontFeatureSettings,
        }}
        spellCheck={false}
        autoComplete="off"
      />

      {/* Expanded settings — always rendered, animated via CSS grid */}
      <div style={{
        display: 'grid',
        gridTemplateRows: isExpanded ? '1fr' : '0fr',
        transition: 'grid-template-rows 0.25s ease',
      }}>
        <div style={{ minHeight: 0, overflow: 'hidden' }}>
          <div style={{ paddingBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
              {axesDef && axesDef.length > 0 && (
                <div>
                  <div className="text-author" style={{ marginBottom: 8 }}>Variable Axes</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {axesDef.map(axis => {
                      const val = varAxes?.[axis.tag] ?? axis.default
                      const clamped = Math.max(axis.min, Math.min(axis.max, val))
                      const isChanged = Math.abs(clamped - axis.default) > 0.5
                      return (
                        <div key={axis.tag}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ color: 'var(--gray-cont-prim)', fontSize: 14, fontWeight: 500 }}>{axis.name}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ color: 'var(--gray-cont-prim)', fontSize: 14, fontWeight: 500 }}>{Math.round(clamped)}</span>
                              <button
                                onClick={() => onAxisChange?.(axis.tag, axis.default)}
                                style={{ opacity: isChanged ? 1 : 0.2, color: 'var(--gray-cont-prim)', lineHeight: 1 }}
                              >
                                <IconReset size={20} />
                              </button>
                            </div>
                          </div>
                          <Slider
                            value={[clamped]}
                            onValueChange={([v]) => onAxisChange?.(axis.tag, v)}
                            onReset={() => onAxisChange?.(axis.tag, axis.default)}
                            min={axis.min} max={axis.max}
                            step={axis.tag === 'slnt' ? 0.1 : 0.5}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {styleAlternates && styleAlternates.length > 0 && (
                <div>
                  <div className="text-author" style={{ marginBottom: 8 }}>Stylistic Alternates</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {styleAlternates.map(f => (
                      <button
                        key={f.tag}
                        onClick={() => onToggleOtFeature?.(f.tag)}
                        className={`v2-button ${otFeatures?.[f.tag] ? 'v2-button-active' : 'v2-button-inactive'}`}
                        style={{ height: 32, padding: '0 12px', fontSize: 13 }}
                      >
                        {f.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Slider control ─────────────────────────────────────────────────────────

function SliderControl({ label, value, min, max, step, format, onChange, onReset }: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
  onReset?: () => void
}) {
  return (
    <div className="font-detail-slider">
      <div className="font-detail-slider-header">
        <span className="text-author">{label}</span>
        <span className="text-author">{format(value)}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        onReset={onReset}
        min={min} max={max} step={step}
      />
    </div>
  )
}

// ─── Info row ────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--gray-brd-prim)', padding: '10px 0' }}>
      <span className="text-author" style={{ minWidth: 80 }}>{label}</span>
      <span className="text-sidebar-title">{value}</span>
    </div>
  )
}
