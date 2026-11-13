'use client'

import { useEffect, useRef, useState } from 'react'

export interface FoundryFont {
  name: string
  url: string
  date: string | null
  foundry: string
  foundryUrl: string
  category: string[]
  images: Array<{ src: string; width?: number; height?: number }>
}

// A row further than this from the viewport lets go of its pictures, so the
// page holds only the few rows around the screen in memory, animated ones
// included. Far enough that a row has its pictures back before it scrolls in.
const KEEP_MARGIN = '1500px 0px'

// Every row shares one observer rather than holding one each. It watches the
// row itself: the row is the box content-visibility keeps laid out, while what
// is inside an off-screen row has no layout to intersect.
const rows = new Map<Element, (near: boolean) => void>()
let observer: IntersectionObserver | null = null

function watch(el: Element, onChange: (near: boolean) => void) {
  observer ??= new IntersectionObserver(
    entries => entries.forEach(e => rows.get(e.target)?.(e.isIntersecting)),
    { rootMargin: KEEP_MARGIN },
  )
  rows.set(el, onChange)
  observer.observe(el)
  return () => {
    rows.delete(el)
    observer?.unobserve(el)
  }
}

// Month and year only: where a foundry states no date the crawler reads it off
// upload stamps, good to within weeks, not days.
const released = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })

export function FoundryRow({ font }: { font: FoundryFont }) {
  const ref = useRef<HTMLDivElement>(null)
  // Starts loaded so the server render carries the sources; lazy loading
  // keeps rows below the fold from fetching until the observer has spoken.
  const [near, setNear] = useState(true)

  useEffect(() => (ref.current ? watch(ref.current, setNear) : undefined), [])

  return (
    <div ref={ref} className="v2-card foundry-row">
      <div className="foundry-row-head">
        <a className="v2-button v2-button-inactive foundry-row-name" href={font.url} target="_blank" rel="noopener noreferrer">
          {font.name}
        </a>
        <div className="foundry-row-meta">
          <a className="foundry-row-foundry" href={font.foundryUrl} target="_blank" rel="noopener noreferrer">
            {font.foundry}
          </a>
          {font.date && <span>{released(font.date)}</span>}
        </div>
        <a className="v2-badge v2-button-active foundry-row-get" href={font.url} target="_blank" rel="noopener noreferrer">
          Get font
        </a>
      </div>
      <div className="foundry-carousel">
        {font.images.map(img => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={img.src}
            className="foundry-shot"
            src={near ? img.src : undefined}
            width={img.width}
            height={img.height}
            alt={font.name}
            loading="lazy"
            decoding="async"
          />
        ))}
      </div>
    </div>
  )
}
