/**
 * ControlledTextPreview - Eliminates cursor jumping issues
 * Replaces contentEditable with controlled React inputs
 */

import React, { useLayoutEffect, useRef, useState, forwardRef } from 'react'

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
  readOnly = false
}, ref) => {
  const [isFocused, setIsFocused] = useState(false)
  
  // Sync cursor position with React state after renders
  useLayoutEffect(() => {
    const element = ref && 'current' in ref ? ref.current : null
    if (!element || !isFocused || document.activeElement !== element) return
    
    try {
      // Set cursor position
      if ('setSelectionRange' in element) {
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
    // Bridge forwarded ref and local ref
    const setRefs = (el: HTMLTextAreaElement | null) => {
      taRef.current = el
      if (typeof ref === 'function') ref(el)
      else if (ref && 'current' in ref) (ref as any).current = el
    }
    useLayoutEffect(() => {
      const el = taRef.current
      if (!el) return
      try {
        el.style.height = 'auto'
        el.style.overflow = 'hidden'
        el.style.resize = 'none'
        el.style.height = `${el.scrollHeight}px`
      } catch {}
    }, [value])
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
