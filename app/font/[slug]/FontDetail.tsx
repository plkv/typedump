'use client'

import { useState, useEffect, useRef } from 'react'
import type { FontFamily } from '@/lib/models/FontFamily'
import { variantCssFamily } from '@/lib/font-face-css'
import { Navbar } from '@/components/font-catalog/Navbar'
import { IconReset, IconAlignLeft, IconAlignCenter, IconAlignRight, IconChevronDown } from '@/components/icons'
import { Slider } from '@/components/ui/slider'
import { getFontFeatureSettings, getFontVariationSettings } from '@/lib/font-style-utils'
import { cleanAuthor } from '@/lib/author'
import { ControlledTextPreview } from '@/components/ui/font/ControlledTextPreview'
import { segmentByCoverage } from '@/lib/glyph-coverage'


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

// Case is applied for display only — the text the reader typed is untouched, so
// switching back to Default returns exactly what they wrote.
//
// Small caps is deliberately not `font-variant-caps`, which a browser fakes by
// shrinking the capitals when the font has none. On a site whose whole point is
// showing what a face actually holds, drawn small caps and squashed capitals
// must not look the same, so the control asks for the `smcp` feature directly
// and is offered only to the 13 families that carry it (see
// scripts/detect-small-caps.py).
const CASE_MODES = ['Default', 'Uppercase', 'Lowercase', 'Small caps'] as const
type CaseMode = typeof CASE_MODES[number]

function caseStyle(mode: CaseMode): React.CSSProperties {
  switch (mode) {
    case 'Uppercase': return { textTransform: 'uppercase' }
    case 'Lowercase': return { textTransform: 'lowercase' }
    case 'Small caps': return { textTransform: 'lowercase', fontFeatureSettings: '"smcp" 1, "c2sc" 1' }
    default: return {}
  }
}

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

// Reading samples for the size accordion. Each is roughly as long as its size
// can carry on one screen, so the block shortens as the type grows. They talk
// about type on purpose: a sample nobody wants to read teaches nothing about
// whether a face is readable.
const SIZE_SAMPLES: Array<{ size: number; text: string }> = [
  { size: 48, text: 'A face earns its keep at the size you actually set it.' },
  { size: 36, text: 'Set the same sentence twice, once large and once small. The small setting is the one that tells you whether a typeface will hold up.' },
  { size: 30, text: 'Counters close, joints thicken, and the gaps between letters start doing more work than the letters. What looked confident in a headline can turn muddy three sizes down.' },
  { size: 24, text: 'Most of the type anyone meets in a day sits between 16 and 24 pixels: the body of an article, a form label, the terms nobody reads. A face that survives down there is worth more than one that only photographs well at 200.' },
  { size: 20, text: 'Read a few lines rather than a few words. Rhythm only shows up over a paragraph, and so do the things that get tiring: a narrow e, an ambiguous l and 1, an italic that leans harder than the roman, numerals that sit too high against lowercase. None of it is visible in a single word set large.' },
  { size: 16, text: 'This is the size where a typeface either works or quietly does not. Stems thin out, terminals blunt, and the spacing decides how fast anyone gets through a sentence. Check the punctuation while you are here, because commas and quotes carry more of the reading than their size suggests, and check a number or two: 0 against O, 1 against l, 3 against 8. If the paragraph still reads easily at this size, the rest of the family will usually take care of itself.' },
  { size: 14, text: 'Below sixteen the decisions stop being yours. Hinting, the screen and the reader\u2019s own settings take over, strokes land between pixels, and a face that looked crisp one size up can go soft. Set a caption here, or a table, or the legal line nobody reads, and see whether the words still separate cleanly.' },
]

interface FontSearchItem { name: string; author: string }

export function FontDetail({ family, fonts = [] }: { family: FontFamily; fonts?: FontSearchItem[] }) {
  const [selectedPreset, setSelectedPreset] = useState<TextPreset>('Names')
  const [caseMode, setCaseMode] = useState<CaseMode>('Default')
  const [previewText, setPreviewText] = useState(() => family.name)
  const [fontSize, setFontSize] = useState(40)
  const [lineHeight, setLineHeight] = useState(1.2)
  const [letterSpacing, setLetterSpacing] = useState(0)
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('left')
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null)
  const [sizesOpen, setSizesOpen] = useState(false)
  const [sampleKey, setSampleKey] = useState<string | null>(null)
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

  const ALT_TAG = /^(ss\d\d|cv\d\d)$/
  const altTagTitle = (tag: string): string => {
    const m = /^(ss|cv)(\d\d)$/.exec(tag)
    if (!m) return tag
    const n = parseInt(m[2], 10)
    return `${m[1] === 'ss' ? 'Stylistic Set' : 'Character Variant'} ${n}`
  }
  // Some fonts carry their alternates only in family-level altPairs ([glyph, tag])
  // and never got titled openTypeFeatureTags from the parser. Derive the tag list
  // from altPairs so those specimens still expose their stylistic sets.
  const altPairTags: StyleAlt[] = [...new Set(
    (family.altPairs ?? [])
      .map(p => (Array.isArray(p) ? p[1] : (p as { tag?: string })?.tag) ?? '')
      .filter(t => ALT_TAG.test(t))
  )].sort().map(tag => ({ tag, title: altTagTitle(tag) }))

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

    const toStyleAlts = (v: typeof sorted[0]): StyleAlt[] => {
      const tagged = (v.openTypeFeatureTags ?? []).filter(f => ALT_TAG.test(f.tag))
      return tagged.length ? tagged : altPairTags
    }

    if (isVariable && regularVar && wAxis) {
      // The font's own named instances first. A variable font names the points
      // on its axes that its designer treats as styles, and those names and
      // numbers are what the family actually holds. The 100-900 ladder below is
      // only right when a font happens to use the usual values: Sunday
      // Collaborative Alphabet runs its weight axis 10 to 200 and calls 200
      // Black, and the ladder listed 100 and 200 as Thin and ExtraLight.
      const upright = (regularVar.namedInstances ?? []).filter(i => !i.isItalic)
      const slanted = (italicVar?.namedInstances ?? []).filter(i => i.isItalic)

      if (upright.length) {
        const alts = toStyleAlts(regularVar)
        const rows: RowSpec[] = upright.map(i => ({
          key: `${i.weight}-false`,
          label: i.name,
          cssFamily: variantCssFamily(family, regularVar.id),
          weight: i.weight, isItalic: false,
          styleAlternates: alts, axesDef: toAxesDef(regularVar, i.weight),
        }))
        if (italicVar && slanted.length) {
          const iAlts = toStyleAlts(italicVar)
          rows.push(...slanted.map(i => ({
            key: `${i.weight}-true`,
            label: i.name,
            cssFamily: variantCssFamily(family, italicVar.id),
            weight: i.weight, isItalic: true,
            styleAlternates: iAlts, axesDef: toAxesDef(italicVar, i.weight),
          })))
        }
        return rows
      }

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

  // The samples are set in the style the page opens on, so the accordion shows
  // the face as someone would actually meet it rather than in whatever weight
  // happens to sort first.
  const defaultSampleRow =
    variantRows.find(r => !r.isItalic && /^regular\b/i.test(r.label)) ??
    variantRows.find(r => !r.isItalic) ??
    variantRows[0]
  const sampleRow = variantRows.find(r => r.key === sampleKey) ?? defaultSampleRow

  const defaultVariant = family.variants.find(v => v.isDefaultStyle) ?? sorted[0]
  const heroFont = defaultVariant ? variantCssFamily(family, defaultVariant.id) : 'system-ui'

  // npm copy snippet
  const npmFile = defaultVariant
    ? defaultVariant.filename.replace(/\.(otf|ttf|woff)$/, '.woff2')
    : null
  const npmSnippet = npmFile
    ? `npm i typedump\nimport font from 'typedump/fonts/${npmFile}'`
    : `npm i typedump`
  const [npmCopied, setNpmCopied] = useState(false)
  const handleNpmCopy = () => {
    navigator.clipboard.writeText(npmSnippet).then(() => {
      setNpmCopied(true)
      setTimeout(() => setNpmCopied(false), 2000)
    })
  }

  const taggedAlternates = [...new Set(
    family.variants.flatMap(v =>
      (v.openTypeFeatureTags ?? []).filter(f => ALT_TAG.test(f.tag)).map(f => f.tag)
    )
  )]
  // Fall back to altPairs-derived tags only when no titled tags exist, so the 73
  // already-working families keep their exact badge counts untouched.
  const allAlternateTags = taggedAlternates.length ? taggedAlternates : altPairTags.map(a => a.tag)
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
        <h1 style={{
          fontFamily: `"${heroFont}", system-ui, sans-serif`,
          fontSize: 'clamp(48px, 20vw, 180px)',
          fontWeight: defaultVariant?.weight ?? 400,
          fontStyle: defaultVariant?.isItalic ? 'italic' : 'normal',
          lineHeight: 1.1,
          color: 'var(--gray-cont-prim)',
          textAlign: 'center',
          wordBreak: 'break-word',
          margin: 0,
          // Reset the interface font's stylistic sets so they never bleed into
          // the specimen — the hero must render the font's own default glyphs.
          fontFeatureSettings: 'normal',
        }}>
          <HeroName name={family.name} family={heroFont} />
        </h1>
        <div style={{
          fontFamily: '"Instrument Sans UI", sans-serif',
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--gray-cont-tert)',
        }}>
          by {cleanAuthor(family.foundry)}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: '4px', flexWrap: 'wrap' }}>
          <button
            onClick={handleNpmCopy}
            className="v2-badge v2-button-inactive"
            style={{ cursor: 'pointer', border: 'none' }}
            title={npmSnippet}
          >
            {npmCopied ? 'Copied!' : 'Copy import'}
          </button>
          {family.downloadLink && (
            <a
              href={family.downloadLink}
              target="_blank"
              rel="noopener noreferrer"
              className="v2-badge v2-button-active"
              style={{ textDecoration: 'none' }}
              onClick={() => (window as any).gtag?.('event', 'get_font', { font_name: family.name })}
            >
              Get font
            </a>
          )}
        </div>
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
                  <button key={a} aria-label={`Align ${a}`} aria-pressed={align === a} onClick={() => setAlign(a)}
                    className={`v2-button ${align === a ? 'v2-button-active' : 'v2-button-inactive'}`}
                    style={{ width: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Icon size={20} />
                  </button>
                ))}
              </div>
              <button
                aria-label="Reset preview settings"
                onClick={() => { setFontSize(80); setLineHeight(1.2); setLetterSpacing(0); setAlign('left'); setSelectedPreset('Names'); setCaseMode('Default'); setPreviewText(family.name); setRowOtFeatures({}); setRowVarAxes({}); setExpandedRowKey(null) }}
                className="v2-button v2-button-inactive"
                style={{ padding: 0, width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <IconReset size={20} />
              </button>
            </div>
          </div>

          {/* Case row */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gray-brd-prim)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CASE_MODES.map(mode => {
              const unavailable = mode === 'Small caps' && !family.hasSmallCaps
              return (
                <button
                  key={mode}
                  onClick={() => !unavailable && setCaseMode(mode)}
                  disabled={unavailable}
                  title={unavailable ? 'This font has no small caps of its own' : undefined}
                  className={`v2-button ${caseMode === mode ? 'v2-button-active' : 'v2-button-inactive'}`}
                  style={unavailable ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}
                >
                  {mode}
                </button>
              )
            })}
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
            // Axis defaults first, then the row's weight, then whatever the
            // reader has moved. An axis left unstated is decided by CSS
            // instead: font-stretch: normal lands on 100 and gets clamped into
            // the axis range, which is not where the font rests.
            const axisDefaults = Object.fromEntries(
              vr.axesDef.filter(a => a.tag !== 'wght').map(a => [a.tag, a.default])
            )
            const varSettings = getFontVariationSettings({ ...axisDefaults, wght: vr.weight, ...varAxes })
            // 'normal' resets the body-level UI stylistic sets on the specimen.
            const rowFeatures = getFontFeatureSettings(otFeatures) ?? 'normal'
            // Small caps rides on the same property as the row's own feature
            // toggles, so the two are merged rather than one silently replacing
            // the other.
            const cs = caseStyle(caseMode)
            const featureSettings = cs.fontFeatureSettings
              ? (rowFeatures === 'normal' ? String(cs.fontFeatureSettings) : `${rowFeatures}, ${cs.fontFeatureSettings}`)
              : rowFeatures
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
                textTransform={cs.textTransform}
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

      {/* ── Reading sizes ── */}
      {sampleRow && (
        <div style={{ padding: '0 16px 12px' }}>
          <div className="v2-card" style={{ overflow: 'hidden' }}>
            <div className="font-detail-sizes-head">
              <button
                onClick={() => setSizesOpen(o => !o)}
                aria-expanded={sizesOpen}
                className="text-author font-detail-sizes-toggle"
              >
                Reading sizes
              </button>
              {variantRows.length > 1 && (
                <div className="relative v2-dropdown">
                  <select
                    aria-label="Style for the reading samples"
                    // The row actually in use, not the untouched state: with an
                    // empty value the browser showed the first option, so the
                    // picker said Thin while the samples were set in Regular.
                    value={sampleRow.key}
                    onChange={e => setSampleKey(e.target.value)}
                    className="appearance-none cursor-pointer"
                    style={{
                      height: '100%', width: '100%', padding: '0 36px 0 12px',
                      backgroundColor: 'transparent', border: 'none', outline: 'none',
                      fontFamily: '"Instrument Sans UI", sans-serif',
                      fontSize: 14, fontWeight: 500, color: 'var(--gray-cont-prim)',
                    }}
                  >
                    {variantRows.map(r => (
                      <option key={r.key} value={r.key}>{r.label}</option>
                    ))}
                  </select>
                  <IconChevronDown size={20} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--gray-cont-tert)' }} />
                </div>
              )}
            </div>

            {/* Always mounted, height animated: a section that unmounts cannot
                transition, and max-height guesses a number that is wrong for
                every font. The 0fr-to-1fr row does it on the real height. */}
            <div className="font-detail-sizes-wrap" data-open={sizesOpen}>
              <div className="font-detail-sizes-inner">
                <div className="font-detail-sizes">
                  {SIZE_SAMPLES.map(sample => (
                    <div
                      key={sample.size}
                      className="font-detail-size-row"
                      data-wide={sample.size >= 30 ? 'true' : 'false'}
                    >
                      <div className="text-author" style={{ color: 'var(--gray-cont-tert)', paddingTop: 2 }}>
                        {sample.size}px
                      </div>
                      <p style={{
                        margin: 0,
                        fontFamily: `"${sampleRow.cssFamily}", system-ui, sans-serif`,
                        fontWeight: sampleRow.weight,
                        fontStyle: sampleRow.isItalic ? 'italic' : 'normal',
                        // Same rule as the specimen rows: state every axis, or
                        // CSS resolves the unstated ones somewhere else.
                        fontVariationSettings: getFontVariationSettings({
                          ...Object.fromEntries(sampleRow.axesDef.filter(a => a.tag !== 'wght').map(a => [a.tag, a.default])),
                          wght: sampleRow.weight,
                        }) ?? undefined,
                        fontSize: sample.size,
                        lineHeight: sample.size >= 36 ? 1.15 : 1.4,
                        letterSpacing: sample.size >= 36 ? '-0.01em' : 0,
                      }}>
                        {sample.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
            fontFamily: '"Instrument Sans UI", sans-serif',
            // 450, not 400: every other word on this page — the labels, the
            // table values, the buttons — is 500, so body copy at 400 was the
            // one light thing on the page and read as washed out.
            fontSize: 14, fontWeight: 450, lineHeight: 1.6,
            color: 'var(--gray-cont-prim)',
            margin: 0,
          }}>
            {family.description || `${family.name} is a ${family.category.join(', ').toLowerCase()} typeface${family.foundry !== 'Unknown' ? ` by ${family.foundry}` : ''}. It includes ${sorted.length} style${sorted.length !== 1 ? 's' : ''}${isVariable ? ' and supports variable font axes' : ''}.`}
          </p>
          {/* Generated, not stored. The claim used to be a sentence appended to
              each description by hand, which drifted: 37 families still carried
              one that no source supported, and the rest named the faces in a
              different order from the data. Built from `alternativeTo` there is
              one claim per page and it cannot disagree with the row opposite.
              Written as a full sentence so the family's own name sits beside
              the words people search. */}
          {(family.alternativeTo || []).length > 0 && (
            <p style={{
              fontFamily: '"Instrument Sans UI", sans-serif',
              // 450, not 400: every other word on this page — the labels, the
            // table values, the buttons — is 500, so body copy at 400 was the
            // one light thing on the page and read as washed out.
            fontSize: 14, fontWeight: 450, lineHeight: 1.6,
              color: 'var(--gray-cont-prim)',
              margin: '12px 0 0',
            }}>
              {family.name} is a free alternative to {listPhrase((family.alternativeTo || []).map(a => a.name))}.
            </p>
          )}
        </div>

        {/* Right: Details table */}
        <div className="v2-card" style={{ padding: '20px 24px 24px' }}>
          <div className="text-author" style={{ marginBottom: 12 }}>Details</div>
          <div className="info-table" style={{ display: 'flex', flexDirection: 'column' }}>
            {family.publishedAt && (
              <InfoRow label="Released" value={new Date(family.publishedAt).getFullYear().toString()} />
            )}
            {typeInfo && <InfoRow label="Type" value={typeInfo} />}
            {family.foundry && family.foundry !== 'Unknown' && (
              <InfoRow label="Author" value={
                <span>
                  {family.foundry.split(', ').map(cleanAuthor).map((part, i, arr) => (
                    <span key={part}>
                      <a href={`/?author=${encodeURIComponent(part)}`} style={{ color: 'var(--gray-cont-prim)' }}>{part}</a>
                      {i < arr.length - 1 && ', '}
                    </span>
                  ))}
                </span>
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
              <InfoRow label="Languages" value={
                <span>
                  {(family.languages || []).map((lang, i, arr) => (
                    <span key={lang}>
                      <a href={`/?language=${encodeURIComponent(lang)}`} style={{ color: 'var(--gray-cont-prim)' }}>{lang}</a>
                      {i < arr.length - 1 && ', '}
                    </span>
                  ))}
                </span>
              } />
            )}
            {(() => {
              const tags = [
                ...(family.collection ? [{ label: family.collection, param: 'collection' }] : []),
                ...(family.category || []).map(c => ({ label: c, param: 'category' })),
                ...(family.styleTags || []).map(s => ({ label: s, param: 'style' })),
              ]
              if (!tags.length) return null
              return (
                <InfoRow label="Tags" value={
                  <span>
                    {tags.map((t, i) => (
                      <span key={`${t.param}-${t.label}`}>
                        <a href={`/?${t.param}=${encodeURIComponent(t.label)}`} style={{ color: 'var(--gray-cont-prim)' }}>{t.label}</a>
                        {i < tags.length - 1 && ', '}
                      </span>
                    ))}
                  </span>
                } />
              )
            })()}
          </div>
        </div>

      </div>

      {/* ── Footer ── */}
      <footer style={{ padding: '16px 24px' }}>
        <span style={{ fontFamily: '"Instrument Sans UI", sans-serif', fontSize: 13, fontWeight: 500, color: 'var(--gray-cont-tert)' }}>
          © 2026 TypeDump. Built and curated by{' '}
          <a href="https://plkv.works/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gray-cont-prim)' }}>Stas Polyakov</a>
        </span>
      </footer>

    </div>
  )
}

// ─── Hero heading ───────────────────────────────────────────────────────────

// The <h1> is both the page's heading and its largest specimen, so a character
// the font lacks used to sit there in the primary colour as though the face had
// drawn it. Greys the missing runs the way every other preview does.
//
// Starts as plain text and only segments in an effect: coverage needs a canvas
// and a loaded face, neither of which exists on the server, and rendering the
// spans straight away would make the first client frame disagree with the
// server's HTML.
function HeroName({ name, family }: { name: string; family: string }) {
  const [segments, setSegments] = useState<Array<{ text: string; missing: boolean }> | null>(null)

  useEffect(() => {
    if (!family) return
    const recompute = () => setSegments(segmentByCoverage(name, family))
    recompute()
    if (typeof document === 'undefined' || !document.fonts) return
    document.fonts.addEventListener('loadingdone', recompute)
    return () => document.fonts.removeEventListener('loadingdone', recompute)
  }, [name, family])

  if (!segments) return <>{name}</>
  return (
    <>
      {segments.map((s, i) =>
        s.missing
          ? <span key={i} style={{ color: 'var(--gray-cont-tert)' }}>{s.text}</span>
          : <span key={i}>{s.text}</span>
      )}
    </>
  )
}

// ─── Variant row ────────────────────────────────────────────────────────────

function VariantRow({
  label, fontFamily, weight, isItalic,
  fontSize, lineHeight, letterSpacing, align, text, onChange, isLast,
  fontVariationSettings, fontFeatureSettings, textTransform,
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
  textTransform?: React.CSSProperties['textTransform']
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
  // Auto-height and re-measure on font load now live inside
  // ControlledTextPreview, which this row renders.
  const [cursor, setCursor] = useState(0)

  // The number after the style name is only a weight when the family's weight
  // axis uses the usual ladder. Riottosa numbers its axis 0-100, where
  // "Regular Condensed · 0" and "Bold Condensed · 100" read as mistakes.
  const wghtAxis = axesDef?.find(a => a.tag === 'wght')
  const showsWeightNumber = !wghtAxis || wghtAxis.min >= 100

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
        <span>{showsWeightNumber ? `${label} · ${weight}` : label}</span>
        {hasSettings && (
          <IconChevronDown size={16} style={{ color: 'var(--gray-cont-tert)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }} />
        )}
      </div>

      {/* Preview textarea */}
      <ControlledTextPreview
        value={text}
        cursorPosition={cursor}
        onChange={(v, pos) => { onChange(v); setCursor(pos) }}
        onCursorChange={setCursor}
        onFocus={() => { if (hasSettings && !isExpanded) onToggleExpand?.() }}
        onEscape={() => { if (isExpanded) onToggleExpand?.() }}
        multiline
        highlightMissingGlyphs
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
          textTransform,
        }}
      />

      {/* Expanded settings — always rendered, animated via CSS grid */}
      <div style={{
        display: 'grid',
        gridTemplateRows: isExpanded ? '1fr' : '0fr',
        transition: 'grid-template-rows 0.25s ease',
      }}>
        <div style={{ minHeight: 0, overflow: 'hidden' }}>
          <div style={{ paddingBottom: 16 }}>
            <div className="v2-card-expand-grid">
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
                                aria-label={`Reset ${axis.name}`}
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

/** "A", "A and B", "A, B and C" — a list a person would read aloud. */
function listPhrase(items: string[]) {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

// ─── Info row ────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--gray-brd-prim)', padding: '10px 0' }}>
      {/* 124px, not 80: "Free alternative to" is the longest label the table
          carries and at 80 it wrapped to three lines, doubling the row height
          and breaking the rhythm of the ones around it. */}
      {/* The space after the label is real text, not the flex gap. The gap is
          drawn, never written, so the two cells ran together when the row was
          read as text: "Free alternative toSF Pro". That is the exact phrase
          people search, and a crawler was seeing it welded shut. */}
      <span className="text-author" style={{ minWidth: 124, flex: 'none' }}>{label}{' '}</span>
      <span className="text-sidebar-title">{value}</span>
    </div>
  )
}
