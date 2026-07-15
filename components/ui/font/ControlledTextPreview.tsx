/**
 * ControlledTextPreview - Eliminates cursor jumping issues
 * Replaces contentEditable with controlled React inputs
 */

import React, { useLayoutEffect, useEffect, useMemo, useRef, useState, forwardRef } from 'react'
import { firstFamily, segmentByCoverage } from '@/lib/glyph-coverage'

interface ControlledTextPreviewProps {
  value: string
  cursorPosition: number
  onChange: (value: string, cursorPosition: number) => void
  onCursorChange?: (cursorPosition: number) => void
  onClick?: () => void
  onFocus?: () => void
  onBlur?: () => void
  className?: string
  style?: React.CSSProperties
  placeholder?: string
  multiline?: boolean
  readOnly?: boolean
  /** Color characters not present in the font (rendered via fallback) differently. */
  highlightMissingGlyphs?: boolean
  /** Color for missing glyphs (default: tertiary content token). */
  missingGlyphColor?: string
}

export const ControlledTextPreview = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  ControlledTextPreviewProps
>(({
  value,
  cursorPosition,
  onChange,
  onCursorChange,
  onClick,
  onFocus,
  onBlur,
  className = '',
  style = {},
  placeholder = '',
  multiline = false,
  readOnly = false,
  highlightMissingGlyphs = false,
  missingGlyphColor = 'var(--gray-cont-tert)',
}, ref) => {
  const [isFocused, setIsFocused] = useState(false)

  // Bump whenever any web font finishes loading, so glyph coverage is recomputed
  // AND the multiline textarea is re-measured (lazily-loaded fonts change metrics
  // after the initial auto-resize, which would otherwise clip the text).
  const [fontEpoch, setFontEpoch] = useState(0)
  useEffect(() => {
    if (typeof document === 'undefined' || !(document as any).fonts) return
    const bump = () => setFontEpoch(e => e + 1)
    document.fonts.addEventListener('loadingdone', bump)
    return () => document.fonts.removeEventListener('loadingdone', bump)
  }, [])

  const family = highlightMissingGlyphs ? firstFamily(String(style.fontFamily || '')) : ''
  const segments = useMemo(
    () => (highlightMissingGlyphs ? segmentByCoverage(String(value ?? ''), family) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [highlightMissingGlyphs, value, family, fontEpoch],
  )
  const hasMissing = !!segments && segments.some(s => s.missing)
  
  // Sync cursor position with React state after renders
  useLayoutEffect(() => {
    const element = ref && 'current' in ref ? ref.current : null
    if (!element || !isFocused || document.activeElement !== element) return
    
    try {
      // Set cursor position
      if ('setSelectionRange' in element) {
        // Don't collapse an active range selection (e.g. user selected all text)
        if ((element.selectionEnd ?? 0) > (element.selectionStart ?? 0)) return
        const safePosition = Math.min(cursorPosition, value.length)
        element.setSelectionRange(safePosition, safePosition)
      }
    } catch (error) {
      console.warn('Failed to set cursor position:', error)
    }
  }, [value, cursorPosition, isFocused, ref])
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const newCursorPosition = e.target.selectionStart || 0
    onChange(newValue, newCursorPosition)
  }
  
  const handleSelect = (e: React.SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.currentTarget
    const newCursorPosition = target.selectionStart || 0
    // Only report cursor movement to avoid unintended value updates on click/focus
    if (typeof onCursorChange === 'function') onCursorChange(newCursorPosition)
  }
  
  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Track cursor position on keyboard navigation
    const target = e.currentTarget
    const newCursorPosition = target.selectionStart || 0
    if (typeof onCursorChange === 'function') onCursorChange(newCursorPosition)
  }
  
  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setIsFocused(true)
    onFocus?.()
  }
  
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setIsFocused(false)
    onBlur?.()
  }
  
  const baseProps = {
    value,
    onChange: handleChange,
    onSelect: handleSelect,
    onKeyUp: handleKeyUp,
    onClick,
    onFocus: handleFocus,
    onBlur: handleBlur,
    className,
    style,
    placeholder,
    readOnly
  }
  
  if (multiline) {
    // Auto-resize textarea to fit content height (prevent inner scrollbars)
    const taRef = useRef<HTMLTextAreaElement | null>(null)
    const overlayRef = useRef<HTMLDivElement | null>(null)
    // Bridge forwarded ref and local ref
    const setRefs = (el: HTMLTextAreaElement | null) => {
      taRef.current = el
      if (typeof ref === 'function') ref(el)
      else if (ref && 'current' in ref) (ref as any).current = el
    }
    // User-driven changes (text, size, family…) get a full re-measure that can
    // shrink OR grow — reset to auto, read scrollHeight, apply.
    useLayoutEffect(() => {
      const el = taRef.current
      if (!el) return
      try {
        el.style.height = 'auto'
        el.style.overflow = 'hidden'
        el.style.resize = 'none'
        el.style.height = `${el.scrollHeight}px`
      } catch {}
    }, [value, style?.fontSize, style?.lineHeight, style?.fontFamily, style?.fontWeight, style?.fontVariationSettings])

    // Font load (global 'loadingdone') → GROW-ONLY. A lazily-loaded real font can
    // be taller than the fallback we first measured, which would clip the text.
    // We must NOT collapse to 'auto' here: loadingdone fires for every card as you
    // scroll, and transiently shrinking off-screen textareas (e.g. tall multiline
    // "Brands" previews above the viewport) breaks scroll anchoring and jerks the
    // page to the top. Only expand when the content actually overflows the current
    // box; already-correct textareas are untouched, so repeated bumps are no-ops.
    useLayoutEffect(() => {
      const el = taRef.current
      if (!el) return
      try {
        el.style.overflow = 'hidden'
        el.style.resize = 'none'
        if (el.scrollHeight > el.clientHeight) {
          el.style.height = `${el.scrollHeight}px`
        }
      } catch {}
    }, [fontEpoch])

    // Mirror the textarea's exact box (UA/Tailwind padding + border) onto the
    // overlay so glyphs line up pixel-for-pixel regardless of default styles.
    useLayoutEffect(() => {
      const ta = taRef.current, ov = overlayRef.current
      if (!ta || !ov) return
      const cs = getComputedStyle(ta)
      ov.style.paddingTop = cs.paddingTop
      ov.style.paddingRight = cs.paddingRight
      ov.style.paddingBottom = cs.paddingBottom
      ov.style.paddingLeft = cs.paddingLeft
      ov.style.borderTopWidth = cs.borderTopWidth
      ov.style.borderLeftWidth = cs.borderLeftWidth
      ov.style.letterSpacing = cs.letterSpacing
      ov.scrollTop = ta.scrollTop
    })

    // When any character is missing, overlay a color-matched backdrop and hide
    // the textarea's own text (keep the caret visible) so missing glyphs can be
    // colored individually. No overlay when nothing is missing → zero overhead.
    const overlayActive = highlightMissingGlyphs && hasMissing
    if (overlayActive) {
      const textColor = (style.color as string) || 'inherit'
      return (
        <div style={{ position: 'relative', width: '100%' }}>
          <div
            ref={overlayRef}
            aria-hidden
            style={{
              ...style,
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              margin: 0,
              boxSizing: 'border-box',
              pointerEvents: 'none',
              overflow: 'hidden',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'break-word',
              color: textColor,
            }}
          >
            {segments!.map((s, i) =>
              s.missing
                ? <span key={i} style={{ color: missingGlyphColor }}>{s.text}</span>
                : <span key={i}>{s.text}</span>
            )}
          </div>
          <textarea
            ref={setRefs}
            {...baseProps}
            rows={1}
            style={{
              ...style,
              width: '100%',
              overflow: 'hidden',
              resize: 'none',
              position: 'relative',
              background: 'transparent',
              color: 'transparent',
              WebkitTextFillColor: 'transparent',
              caretColor: textColor,
            }}
          />
        </div>
      )
    }

    return (
      <textarea
        ref={setRefs}
        {...baseProps}
        rows={1}
        style={{ ...style, width: '100%', overflow: 'hidden', resize: 'none' }}
      />
    )
  }
  
  return (
    <input
      ref={ref as React.ForwardedRef<HTMLInputElement>}
      type="text"
      {...baseProps}
    />
  )
})

ControlledTextPreview.displayName = 'ControlledTextPreview'
