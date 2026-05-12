"use client"

import * as React from "react"

interface SliderProps {
  value: number[]
  onValueChange: (value: number[]) => void
  min?: number
  max?: number
  step?: number
  className?: string
  disabled?: boolean
  onReset?: () => void
}

const THUMB_HALF = 12 // half of 24px thumb width

function Slider({ value, onValueChange, min = 0, max = 100, step = 1, className, disabled, onReset }: SliderProps) {
  const trackRef = React.useRef<HTMLDivElement>(null)
  const isDragging = React.useRef(false)
  const currentVal = value[0] ?? min
  const pct = Math.max(0, Math.min(100, ((currentVal - min) / (max - min)) * 100))

  // thumb travels within [THUMB_HALF, trackWidth - THUMB_HALF]
  const thumbPos = `calc(${THUMB_HALF}px + (100% - ${THUMB_HALF * 2}px) * ${pct / 100})`
  const fillWidth = thumbPos // fill ends at thumb center

  const clamp = (v: number) => Math.max(min, Math.min(max, v))
  const snap = (v: number) => clamp(Math.round(v / step) * step)

  const ptrToVal = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return currentVal
    const effectiveWidth = rect.width - THUMB_HALF * 2
    const x = Math.max(0, Math.min(effectiveWidth, clientX - rect.left - THUMB_HALF))
    return snap(min + (x / effectiveWidth) * (max - min))
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    e.currentTarget.setPointerCapture(e.pointerId)
    isDragging.current = true
    onValueChange([ptrToVal(e.clientX)])
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || disabled) return
    onValueChange([ptrToVal(e.clientX)])
  }

  const onPointerUp = () => { isDragging.current = false }

  const onDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onReset) return
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const thumbCenterX = rect.left + THUMB_HALF + (rect.width - THUMB_HALF * 2) * pct / 100
    if (Math.abs(e.clientX - thumbCenterX) <= THUMB_HALF) onReset()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (e.key === 'Home') { e.preventDefault(); onValueChange([min]); return }
    if (e.key === 'End') { e.preventDefault(); onValueChange([max]); return }
    const delta: Record<string, number> = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step }
    const d = delta[e.key]
    if (d !== undefined) { e.preventDefault(); onValueChange([clamp(currentVal + d)]) }
  }

  return (
    <div
      ref={trackRef}
      className={className}
      tabIndex={disabled ? undefined : 0}
      role="slider"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={currentVal}
      aria-disabled={disabled}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      style={{
        position: 'relative', height: 20, borderRadius: 10,
        backgroundColor: 'var(--v2-inactive-bg)',
        cursor: disabled ? 'not-allowed' : 'grab',
        opacity: disabled ? 0.5 : 1,
        userSelect: 'none', touchAction: 'none', outline: 'none',
        overflow: 'hidden',
      } as React.CSSProperties}
    >
      {/* fill — ends at thumb center, left side rounded, right side flat */}
      <div style={{
        position: 'absolute', left: 0, top: 0, height: '100%',
        width: fillWidth,
        backgroundColor: 'var(--gray-cont-prim)',
        borderRadius: '10px 0 0 10px',
        pointerEvents: 'none',
      }} />
      {/* thumb: dark outer (24×20) + white inner (20×16) inset 2px */}
      <div style={{
        position: 'absolute', left: thumbPos, top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 24, height: 20,
        backgroundColor: 'var(--gray-cont-prim)',
        borderRadius: 10,
        zIndex: 1, pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', inset: '2px 2px',
          backgroundColor: 'var(--gray-surface-prim)',
          borderRadius: 8, pointerEvents: 'none',
        }} />
      </div>
    </div>
  )
}

export { Slider }
