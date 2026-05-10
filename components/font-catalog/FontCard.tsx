'use client'

import { useRef, useEffect } from 'react'
import { Slider } from '@/components/ui/slider'
import { ControlledTextPreview } from '@/components/ui/font/ControlledTextPreview'
import { familyToSlug } from '@/lib/font-slug'
import { getFontFeatureSettings, getFontVariationSettings } from '@/lib/font-style-utils'

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
  downloadLink?: string
  variableAxes?: Array<{ name: string; axis: string; min: number; max: number; default: number }>
  openTypeFeatures?: string[]
  _familyFonts?: any[]
  _availableStyles?: Array<{ weight: number; styleName: string; isItalic: boolean; font?: any }>
  collection: 'Text' | 'Display' | 'Weirdo'
  styleTags: string[]
  categories: string[]
  languages?: string[]
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
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FontCard({
  font, isMobile, fontSelection, isLoaded, isAnimated, isExpanded,
  previewContent, cursorPosition, otFeatures, variableAxesState,
  styleAlternates, variableAxesDef, effectiveStyle,
  textSize, lineHeight, textAlign,
  onSelectRef, onInputRef, onStyleChange, onTextChange, onFocus, onToggleExpand,
  onToggleOTFeature, onVariableAxisChange,
}: FontCardProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    onInputRef(inputRef.current)
  })

  const downloadLink = font.downloadLink ||
    font._familyFonts?.find(f => f.downloadLink?.trim())?.downloadLink

  return (
    <div className="transition-colors v2-card">
      <div className="p-4">

        {/* ── Header row ── */}
        <div className="flex justify-between items-start gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center mb-2 flex-row flex-wrap gap-2">

              {/* Font name → detail page */}
              <a
                href={`/font/${familyToSlug(font.name)}`}
                className="v2-badge flex items-center"
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
                      padding: '10px 36px 10px 12px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontFamily: '"Inter Variable", sans-serif',
                      fontSize: '14px',
                      fontWeight: 500,
                      lineHeight: '20px',
                      color: 'var(--gray-cont-prim)',
                      height: '40px',
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
                  <span
                    className="material-symbols-outlined absolute right-0 top-1/2"
                    style={{
                      fontWeight: 400, fontSize: '20px', pointerEvents: 'none',
                      transform: 'translateY(-50%)', padding: '8px',
                      color: 'var(--gray-cont-tert)',
                    }}
                  >
                    expand_more
                  </span>
                </div>
              )}

              {/* Author */}
              <span className="text-author truncate max-w-[200px]" title={`by ${font.author}`}>
                by {font.author}
              </span>
            </div>
          </div>

          {/* Download */}
          {downloadLink && (
            <div className="flex items-center gap-2">
              <button
                className="v2-badge v2-button-active"
                onClick={() => window.open(downloadLink, '_blank')}
                style={{ cursor: 'pointer' }}
              >
                Get font
              </button>
            </div>
          )}
        </div>

        {/* ── Preview ── */}
        <div className="relative" style={{ paddingTop: '16px', paddingBottom: '16px' }}>
          {!isLoaded && (
            <div
              className="v2-shimmer absolute inset-0 rounded"
              style={{ height: `${textSize * (lineHeight / 100) + textSize * 0.4}px`, minHeight: '40px', zIndex: 1, pointerEvents: 'none' }}
            />
          )}
          <ControlledTextPreview
            ref={inputRef as any}
            value={previewContent}
            cursorPosition={cursorPosition}
            onChange={(v, pos) => onTextChange(v, pos)}
            onCursorChange={pos => onTextChange(previewContent, pos)}
            onFocus={onFocus}
            className={`whitespace-pre-line break-words cursor-text focus:outline-none w-full bg-transparent border-0 ${!isAnimated && isLoaded ? 'v2-font-fade-in' : ''}`}
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
              opacity: isLoaded ? 1 : 0,
              textAlign,
              fontFeatureSettings: getFontFeatureSettings(effectiveStyle.otFeatures),
              fontVariationSettings: getFontVariationSettings(effectiveStyle.variableAxes),
            }}
            multiline
          />
        </div>

        {/* ── Tags row: categories + style tags ── */}
        {(() => {
          const tags = [font.collection, ...(font.categories || []), ...(font.styleTags || [])]
          if (!tags.length) return null
          return (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map(tag => (
                <span key={tag} className="v2-tag">{tag}</span>
              ))}
            </div>
          )
        })()}

        {/* ── Expanded: OT features + variable axes ── */}
        {isExpanded && (styleAlternates.length > 0 || variableAxesDef.length > 0) && (
          <div className="mt-6 space-y-4 pt-4" style={{ borderTop: '1px solid var(--gray-brd-prim)' }}>

            {styleAlternates.length > 0 && (
              <div>
                <div className="text-sidebar-title mb-2" style={{ color: 'var(--gray-cont-tert)' }}>
                  Stylistic Alternates
                </div>
                <div className="flex flex-wrap gap-2">
                  {styleAlternates.map(f => (
                    <button
                      key={f.tag}
                      onClick={() => onToggleOTFeature(f.tag)}
                      className={`btn-sm ${otFeatures[f.tag] ? 'active' : ''}`}
                      title={f.title}
                    >
                      {f.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {variableAxesDef.length > 0 && (
              <div>
                <div className="text-sidebar-title mb-2" style={{ color: 'var(--gray-cont-tert)' }}>
                  Variable Axes
                </div>
                <div className="w-full max-w-[280px]">
                  {variableAxesDef.map(axis => {
                    const val = variableAxesState[axis.tag] ??
                      (axis.tag === 'wght' ? effectiveStyle.weight : axis.default)
                    const clamped = Math.max(axis.min, Math.min(axis.max, val))
                    // For wght, reset to the font's initial selection weight — not the embedded axis default,
                    // which is often wrong (parser sets it to min/max from a single variant file).
                    const resetTarget = axis.tag === 'wght' ? fontSelection.weight : axis.default
                    const isChanged = Math.abs(clamped - resetTarget) > 0.5
                    return (
                      <div key={axis.tag} className="mb-3 last:mb-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sidebar-title flex-shrink-0 w-16">{axis.name}</span>
                          <Slider
                            value={[clamped]}
                            onValueChange={([v]) => {
                              let next = v
                              if (axis.tag === 'ital') next = next < 0.1 ? 0 : next > 0.9 ? 1 : next
                              onVariableAxisChange(axis.tag, next)
                            }}
                            min={axis.min}
                            max={axis.max}
                            step={axis.tag === 'wght' ? 1 : axis.tag === 'slnt' ? 0.1 : 0.5}
                            className="flex-1"
                          />
                          <span className="text-sidebar-title flex-shrink-0 w-8 text-right" style={{ color: 'var(--gray-cont-tert)' }}>
                            {Math.round(clamped * 10) / 10}
                          </span>
                          <button
                            onClick={() => onVariableAxisChange(axis.tag, resetTarget)}
                            title="Reset to default"
                            style={{
                              opacity: isChanged ? 1 : 0.2,
                              color: 'var(--gray-cont-tert)',
                              lineHeight: 1,
                              flexShrink: 0,
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px', fontWeight: 400 }}>replay</span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
