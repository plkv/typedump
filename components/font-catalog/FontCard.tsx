'use client'

import { useRef, useEffect, useState, memo } from 'react'
import { Slider } from '@/components/ui/slider'
import { ControlledTextPreview } from '@/components/ui/font/ControlledTextPreview'
import { familyToSlug } from '@/lib/font-slug'
import { getFontFeatureSettings, getFontVariationSettings } from '@/lib/font-style-utils'
import { IconReset, IconChevronDown } from '@/components/icons'

// ─── Font readiness ─────────────────────────────────────────────────────────

// One `loadingdone` listener for the whole catalogue rather than one per card.
// 207 cards subscribing to the same event each would be 207 listeners doing
// identical work on every font that lands.
const readinessSubscribers = new Set<() => void>()
let readinessHooked = false

function onFontsChanged(cb: () => void): () => void {
  readinessSubscribers.add(cb)
  if (!readinessHooked && typeof document !== 'undefined' && document.fonts) {
    readinessHooked = true
    document.fonts.addEventListener('loadingdone', () => {
      readinessSubscribers.forEach(fn => fn())
    })
  }
  return () => { readinessSubscribers.delete(cb) }
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FontData {
  id: number
  name: string
  family: string
  style: string
  category: string
  styles: number
  type: 'Variable' | 'Static'
  author: string
  fontFamily: string
  availableWeights: number[]
  hasItalic: boolean
  filename: string
  url?: string
  /** Cut-down file the card renders at rest; see scripts/build-preview-subsets.py */
  previewUrl?: string
  downloadLink?: string
  variableAxes?: Array<{ name: string; axis: string; min: number; max: number; default: number }>
  openTypeFeatures?: string[]
  _familyFonts?: any[]
  _availableStyles?: Array<{ weight: number; styleName: string; isItalic: boolean; font?: any }>
  collection: 'Text' | 'Display' | 'Brutal'
  styleTags: string[]
  categories: string[]
  languages?: string[]
  altPairs?: [string, string][]
  specialChars?: string
}

export interface StyleAlternate { tag: string; title: string }
export interface VariableAxis { tag: string; name: string; min: number; max: number; default: number }
export interface EffectiveStyle {
  weight: number
  italic: boolean
  variableAxes: Record<string, number>
  otFeatures: Record<string, boolean>
}

export interface FontCardProps {
  font: FontData
  isMobile: boolean
  fontSelection: { weight: number; italic: boolean; cssFamily?: string; styleName?: string }
  isLoaded: boolean
  isAnimated: boolean
  isExpanded: boolean
  previewContent: string
  /** When true, render the read-only default→alternate + special-glyph showcase. */
  alternatesMode?: boolean
  cursorPosition: number
  otFeatures: Record<string, boolean>
  variableAxesState: Record<string, number>
  styleAlternates: StyleAlternate[]
  variableAxesDef: VariableAxis[]
  effectiveStyle: EffectiveStyle
  textSize: number
  lineHeight: number
  textAlign: 'left' | 'center' | 'right'
  // Callbacks
  onSelectRef: (el: HTMLSelectElement | null) => void
  onInputRef: (el: HTMLInputElement | null) => void
  onStyleChange: (weight: number, italic: boolean, cssFamily?: string) => void
  onTextChange: (text: string, cursorPos: number) => void
  onFocus: () => void
  onToggleExpand: () => void
  onToggleOTFeature: (tag: string) => void
  onVariableAxisChange: (tag: string, value: number) => void
  onTagFilter?: (kind: 'collection' | 'category' | 'style', value: string) => void
  isTagActive?: (kind: 'collection' | 'category' | 'style', value: string) => boolean
}

// ─── Component ───────────────────────────────────────────────────────────────

function FontCardImpl({
  font, isMobile, fontSelection, isLoaded, isAnimated, isExpanded,
  previewContent, alternatesMode, cursorPosition, otFeatures, variableAxesState,
  styleAlternates, variableAxesDef, effectiveStyle,
  textSize, lineHeight, textAlign,
  onSelectRef, onInputRef, onStyleChange, onTextChange, onFocus, onToggleExpand,
  onToggleOTFeature, onVariableAxisChange, onTagFilter, isTagActive,
}: FontCardProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    onInputRef(inputRef.current)
  })

  // True until proven otherwise, so the server-rendered card and the first
  // client frame agree and nothing flashes a shimmer that was never needed.
  // The same alias the preview's own fontFamily resolves to. font.family is the
  // human name ("Geist"); the sheet declares hashed aliases ("Geist-4b3734"),
  // so matching on the human name found no declared face and every card
  // reported itself ready.
  const previewFamily =
    fontSelection.cssFamily || font.fontFamily?.match(/"([^"]+)"/)?.[1] || font.family
  const [fontReady, setFontReady] = useState(true)

  useEffect(() => {
    if (!previewFamily || typeof document === 'undefined' || !document.fonts) return
    // Read FontFace.status directly rather than document.fonts.check(): check()
    // answers "would this family be used", which is true the moment the
    // @font-face is declared, loaded or not — measured returning true for a
    // face sitting at status 'unloaded', so the shimmer never once appeared.
    //
    // And status only, never load(). Asking to load would start fetching all
    // 207 faces the moment the cards mount, which is the 16MB this catalogue
    // was pulled back from — the browser fetches a face when rendered content
    // actually uses it, and content-visibility keeps off-screen cards out of
    // that.
    const recheck = () => {
      let declared = false
      let loaded = false
      document.fonts.forEach(f => {
        if (f.family.replace(/^["']|["']$/g, '') !== previewFamily) return
        declared = true
        if (f.status === 'loaded') loaded = true
      })
      // A family this sheet does not declare is somebody else's problem — a
      // system stack, say — and has nothing to wait for.
      setFontReady(!declared || loaded)
    }
    recheck()
    return onFontsChanged(recheck)
  }, [previewFamily, textSize])

  const downloadLink = font.downloadLink ||
    font._familyFonts?.find(f => f.downloadLink?.trim())?.downloadLink

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (isExpanded && !e.currentTarget.contains(e.relatedTarget as Node)) {
      onToggleExpand()
    }
  }

  return (
    <div className="transition-colors v2-card" onBlur={handleBlur} data-card-id={font.id}>
      <div className="p-4">

        {/* ── Header row ── */}
        <div className="flex justify-between items-start gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center mb-2 flex-row flex-wrap gap-2">

              {/* Font name → detail page */}
              <a
                href={`/font/${familyToSlug(font.name)}`}
                className="v2-button v2-button-inactive flex items-center"
                style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
                onClick={e => e.stopPropagation()}
              >
                {font.name}
              </a>

              {/* Style selector */}
              {font._availableStyles && font._availableStyles.length > 1 && (
                <div className="relative v2-dropdown">
                  <select
                    ref={onSelectRef}
                    value={`${fontSelection.weight}|${fontSelection.italic}|${fontSelection.cssFamily || ''}`}
                    onChange={e => {
                      const [weight, italic, cssFamily] = e.target.value.split('|')
                      onStyleChange(Number(weight), italic === 'true', cssFamily)
                    }}
                    className="appearance-none cursor-pointer"
                    style={{
                      height: '100%',
                      width: '100%',
                      padding: '0 36px 0 12px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontFamily: '"Instrument Sans UI", sans-serif',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'var(--gray-cont-prim)',
                    }}
                  >
                    {font._availableStyles.map((style, i) => (
                      <option
                        key={`${style.weight}-${style.isItalic}-${i}`}
                        value={`${style.weight}|${style.isItalic}|${(style as any).cssFamily || ''}`}
                      >
                        {style.styleName}
                      </option>
                    ))}
                  </select>
                  <IconChevronDown
                    size={20}
                    style={{
                      position: 'absolute', right: '8px', top: '50%',
                      transform: 'translateY(-50%)', pointerEvents: 'none',
                      color: 'var(--gray-cont-tert)',
                    }}
                  />
                </div>
              )}

              {/* Author */}
              <span className="text-author break-words" style={{ minWidth: 0 }}>
                by {font.author}
              </span>
            </div>
          </div>

          {/* Download */}
          {downloadLink && (
            <div className="flex items-center gap-2">
              <button
                className="v2-badge v2-button-active"
                onClick={() => {
                  ;(window as any).gtag?.('event', 'get_font', { font_name: font.name })
                  window.open(downloadLink, '_blank')
                }}
                style={{ cursor: 'pointer' }}
              >
                Get font
              </button>
            </div>
          )}
        </div>

        {/* ── Preview ── */}
        {alternatesMode ? (() => {
          const sharedFont: React.CSSProperties = {
            fontFamily: fontSelection.cssFamily
              ? `"${fontSelection.cssFamily}", system-ui, sans-serif`
              : font.fontFamily,
            fontWeight: effectiveStyle.weight,
            fontStyle: effectiveStyle.italic ? 'italic' : 'normal',
            fontVariationSettings: getFontVariationSettings(effectiveStyle.variableAxes),
          }
          const pairs = font.altPairs || []
          const specials = font.specialChars || ''
          const hasAny = pairs.length > 0 || specials.length > 0
          return (
            <div className="relative" style={{ paddingTop: '16px', paddingBottom: '16px' }}>
              {hasAny ? (
                <div
                  style={{
                    ...sharedFont,
                    fontSize: `${textSize}px`,
                    lineHeight: `${lineHeight}%`,
                    color: 'var(--gray-cont-prim)',
                    textAlign,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'baseline',
                    justifyContent: textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start',
                    columnGap: `${textSize * 0.34}px`,
                    rowGap: `${textSize * 0.1}px`,
                    // No opacity gate and no reveal animation here. With
                    // `font-display: block` the browser already withholds the
                    // text until the face is ready, so this was a second,
                    // uncoordinated reveal racing the first — whichever won,
                    // the text flashed. One mechanism, and it is the browser's,
                    // because only it knows when the glyphs can actually paint.
                  }}
                >
                  {/* default (muted) → alternate (solid) pairs */}
                  {pairs.map(([ch, feat], i) => (
                    <span key={`p${i}`} style={{ display: 'inline-flex', columnGap: `${textSize * 0.06}px`, alignItems: 'baseline' }}>
                      <span style={{ color: 'var(--gray-cont-tert)', fontFeatureSettings: 'normal' }}>{ch}</span>
                      <span style={{ fontFeatureSettings: `"${feat}" 1` }}>{ch}</span>
                    </span>
                  ))}
                  {/* line break between pairs and specials */}
                  {pairs.length > 0 && specials.length > 0 && (
                    <span aria-hidden style={{ flexBasis: '100%', height: 0 }} />
                  )}
                  {/* special glyphs */}
                  {[...specials].map((ch, i) => (
                    <span key={`s${i}`} style={{ fontFeatureSettings: 'normal' }}>{ch}</span>
                  ))}
                </div>
              ) : (
                <span className="text-author">No alternates or special glyphs</span>
              )}
            </div>
          )
        })() : (
        <div
          className={`relative${fontReady ? '' : ' preview-loading'}`}
          style={{ paddingTop: '16px', paddingBottom: '16px' }}
        >
          {!fontReady && <div className="preview-shimmer" aria-hidden="true" />}
          <ControlledTextPreview
            ref={inputRef as any}
            value={previewContent}
            cursorPosition={cursorPosition}
            onChange={(v, pos) => onTextChange(v, pos)}
            onCursorChange={pos => onTextChange(previewContent, pos)}
            onFocus={onFocus}
            highlightMissingGlyphs
            className="whitespace-pre-line break-words cursor-text focus:outline-none w-full bg-transparent border-0"
            style={{
              fontSize: `${textSize}px`,
              lineHeight: `${lineHeight}%`,
              paddingTop: `${textSize * 0.2}px`,
              paddingBottom: `${textSize * 0.2}px`,
              fontFamily: fontSelection.cssFamily
                ? `"${fontSelection.cssFamily}", system-ui, sans-serif`
                : font.fontFamily,
              fontWeight: effectiveStyle.weight,
              fontStyle: effectiveStyle.italic ? 'italic' : 'normal',
              color: 'var(--gray-cont-prim)',
              // No opacity gate or reveal — see the note on the other preview.
              textAlign,
              // 'normal' resets the body-level UI stylistic sets so they never
              // bleed into the font specimen.
              fontFeatureSettings: getFontFeatureSettings(effectiveStyle.otFeatures) ?? 'normal',
              fontVariationSettings: getFontVariationSettings(effectiveStyle.variableAxes),
            }}
            multiline
          />
        </div>
        )}

        {/* ── Tags row: collection + categories + style tags (clickable filters) ── */}
        {(() => {
          const tags: Array<{ kind: 'collection' | 'category' | 'style'; value: string }> = [
            { kind: 'collection', value: font.collection },
            ...(font.categories || []).map(v => ({ kind: 'category' as const, value: v })),
            ...(font.styleTags || []).map(v => ({ kind: 'style' as const, value: v })),
          ]
          if (!tags.length) return null
          return (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map(({ kind, value }) => {
                const active = isTagActive?.(kind, value)
                return (
                  <button
                    key={`${kind}:${value}`}
                    type="button"
                    className={`v2-tag${onTagFilter ? ' v2-tag-clickable' : ''}${active ? ' v2-tag-active' : ''}`}
                    onClick={onTagFilter ? (e) => { e.stopPropagation(); onTagFilter(kind, value) } : undefined}
                  >
                    {value}
                  </button>
                )
              })}
            </div>
          )
        })()}

        {/* ── Expanded: variable axes + OT features ── */}
        {isExpanded && (styleAlternates.length > 0 || variableAxesDef.length > 0) && (
          <div className="mt-6 v2-card-expand-grid">

            {variableAxesDef.length > 0 && (
              <div>
                <div className="text-author" style={{ marginBottom: 8 }}>Variable Axes</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {variableAxesDef.map(axis => {
                    const val = variableAxesState[axis.tag] ??
                      (axis.tag === 'wght' ? effectiveStyle.weight : axis.default)
                    const clamped = Math.max(axis.min, Math.min(axis.max, val))
                    const resetTarget = axis.tag === 'wght' ? fontSelection.weight : axis.default
                    const isChanged = Math.abs(clamped - resetTarget) > 0.5
                    return (
                      <div key={axis.tag}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ color: 'var(--gray-cont-prim)', fontSize: 14, fontWeight: 500 }}>{axis.name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ color: 'var(--gray-cont-prim)', fontSize: 14, fontWeight: 500 }}>
                              {Math.round(clamped)}
                            </span>
                            <button
                              aria-label={`Reset ${axis.name}`}
                              onClick={() => onVariableAxisChange(axis.tag, resetTarget)}
                              style={{ opacity: isChanged ? 1 : 0.2, color: 'var(--gray-cont-prim)', lineHeight: 1 }}
                            >
                              <IconReset size={20} />
                            </button>
                          </div>
                        </div>
                        <Slider
                          value={[clamped]}
                          onValueChange={([v]) => {
                            let next = v
                            if (axis.tag === 'ital') next = next < 0.1 ? 0 : next > 0.9 ? 1 : next
                            onVariableAxisChange(axis.tag, next)
                          }}
                          onReset={() => onVariableAxisChange(axis.tag, resetTarget)}
                          min={axis.min}
                          max={axis.max}
                          step={axis.tag === 'wght' ? 1 : axis.tag === 'slnt' ? 0.1 : 0.5}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {styleAlternates.length > 0 && (
              <div>
                <div className="text-author" style={{ marginBottom: 8 }}>Stylistic Alternates</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {styleAlternates.map(f => (
                    <button
                      key={f.tag}
                      onClick={() => onToggleOTFeature(f.tag)}
                      className={`v2-button ${otFeatures[f.tag] ? 'v2-button-active' : 'v2-button-inactive'}`}
                      style={{ height: 32, padding: '0 12px', fontSize: 13 }}
                    >
                      {f.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

/**
 * The catalogue holds every family on one page, so a keystroke in any preview
 * used to re-render all 207 cards — about 31ms of blocking work per letter,
 * which is the stutter a reader reported while typing. Paired with the
 * `useDeferredValue` in CatalogPage this fixes it: while the keys are still
 * coming, only the card being typed into sees new text, and the rest compare
 * equal and are skipped. They catch up in one pass when the typing stops.
 *
 * The comparison ignores the callback props on purpose. CatalogPage builds all
 * nine of them as inline arrows per card per render, so they are new objects
 * every time and a default shallow compare would never skip anything. They are
 * safe to ignore because each closes over `font.id` and state setters, and the
 * card the reader is actually interacting with always re-renders first: focus
 * changes `focusedFontId`, which changes its text, which fails this comparison.
 */
export const FontCard = memo(FontCardImpl, (a, b) =>
  a.font === b.font &&
  a.isMobile === b.isMobile &&
  a.fontSelection === b.fontSelection &&
  a.isLoaded === b.isLoaded &&
  a.isAnimated === b.isAnimated &&
  a.isExpanded === b.isExpanded &&
  a.previewContent === b.previewContent &&
  a.alternatesMode === b.alternatesMode &&
  a.cursorPosition === b.cursorPosition &&
  a.otFeatures === b.otFeatures &&
  a.variableAxesState === b.variableAxesState &&
  a.styleAlternates === b.styleAlternates &&
  a.variableAxesDef === b.variableAxesDef &&
  a.effectiveStyle === b.effectiveStyle &&
  a.textSize === b.textSize &&
  a.lineHeight === b.lineHeight &&
  a.textAlign === b.textAlign
)
