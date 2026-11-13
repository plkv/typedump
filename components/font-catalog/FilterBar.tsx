'use client'

import type { ReactNode } from 'react'
import { IconXMark, IconReset } from '@/components/icons'

/*
  The frosted filter bar at the foot of the catalogue and the foundries feed.
  The card is position:fixed at bottom 16px and grows upward, so DOM order is
  visual order, top to bottom. DO NOT REORDER:

  1. Header   (0fr→1fr)  shown when OPEN   — count, reset, close
  2. Calm row (1fr→0fr)  shown when CLOSED — collapses on open
  3. Body     (0fr→1fr)  shown when OPEN   — the filter groups, scrolling
  4. Trigger  (1fr→0fr)  shown when CLOSED — the button that opens it
*/
export function FilterBar({
  open,
  onOpenChange,
  visible = true,
  title,
  trigger,
  activeCount,
  canReset,
  onReset,
  calm,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  // The catalogue holds the bar back while its hero is on screen.
  visible?: boolean
  title: ReactNode
  trigger: string
  activeCount: number
  canReset: boolean
  onReset: () => void
  calm?: ReactNode
  children: ReactNode
}) {
  const reset = canReset && (
    <button aria-label="Reset all filters" title="Reset all filters" onClick={onReset} className="v2-button v2-button-inactive filter-bar-icon">
      <IconReset size={20} />
    </button>
  )

  return (
    <>
      {/* Invisible click-outside handler */}
      <div className="filter-bar-dim" data-open={open} onClick={() => onOpenChange(false)} />

      <div className={`filter-bar ${visible ? 'v2-nav-enter-bottom' : 'v2-nav-pre-bottom'}`}>
        <div className="v2-card v2-overlay filter-bar-card">
          <div className="filter-bar-fold" data-shown={open}>
            <div>
              <div className="flex items-center p-4 gap-3">
                <span className="text-sidebar-title flex-1">{title}</span>
                <div className="flex gap-2">
                  {reset}
                  <button aria-label="Close filters" onClick={() => onOpenChange(false)} className="v2-button v2-button-inactive filter-bar-icon">
                    <IconXMark size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {calm && (
            <div className="filter-bar-fold" data-shown={!open}>
              <div>
                <div className="flex gap-2 px-4 pt-4 pb-1">{calm}</div>
              </div>
            </div>
          )}

          <div className="filter-bar-fold" data-shown={open}>
            <div>
              {/* Own GPU layer so scrolling this list repaints on its own plane
                  instead of dirtying the frosted panel's backdrop-filter above
                  it — otherwise the blur re-rasterizes every frame and flickers. */}
              <div className="overflow-y-auto scrollbar-hide filter-bar-scroll">
                <div className="px-4 py-4 space-y-8 filter-bar-body">{children}</div>
              </div>
            </div>
          </div>

          <div className="filter-bar-fold" data-shown={!open}>
            <div>
              <div className={`flex items-center gap-2 px-4 pb-4 ${calm ? 'pt-1' : 'pt-4'}`}>
                <button onClick={() => onOpenChange(true)} className="v2-button v2-button-inactive flex items-center justify-center gap-2 flex-1">
                  {trigger}
                  {activeCount > 0 && <span className="filter-bar-count">{activeCount}</span>}
                </button>
                {reset}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-sidebar-title mb-3">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

// A filter option: selected options are never disabled, so a choice can
// always be taken back.
export function FilterChip({ active, available = true, onClick, children }: {
  active: boolean
  available?: boolean
  onClick: () => void
  children: ReactNode
}) {
  const disabled = !active && !available
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`v2-button ${active ? 'v2-button-active' : 'v2-button-inactive'}${disabled ? ' v2-filter-disabled' : ''}`}
    >
      {children}
    </button>
  )
}
