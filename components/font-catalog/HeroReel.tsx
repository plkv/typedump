"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

/**
 * The strip of rendered font videos along the foot of the hero, after the
 * gallery on plkv.works: an endless row that drifts on its own, can be dragged
 * with momentum, pauses under the pointer, and opens the font a clip shows
 * when tapped.
 *
 * Only clips actually on screen play. The loop renders the set two or three
 * times over, so leaving every <video> running meant thirty decoders for the
 * six or so anyone can see.
 */

type Clip = { src: string; font: string; slug: string; ratio: number }

// The picks from promo-video/out/picks, re-encoded into out/picks-web (H.264,
// 640px tall, CRF 27: 11MB down to 2.1MB; Akt, a 925KB marquee, was then dropped) and copied to public/hero. 4:5 and
// 6:5 clips. Ordered by background colour so no two neighbours are alike,
// counting the wrap from the last back to the first: the order maximises the
// smallest colour difference between neighbours (ΔE in Lab, worst pair 79),
// which alternates the dark grounds with the light ones and keeps the red
// Lineal and the orange Momo Trust Sans apart. The loop starts at Anthony, so
// the first screen opens on the brightest grounds.
const CLIPS: Clip[] = [
  { src: "Anthony", font: "Anthony", slug: "anthony", ratio: 6 / 5 },
  { src: "Lineal", font: "Lineal", slug: "lineal", ratio: 6 / 5 },
  { src: "GeneralSans", font: "General Sans", slug: "general-sans", ratio: 6 / 5 },
  { src: "FtAnima", font: "ft anima", slug: "ft-anima", ratio: 4 / 5 },
  { src: "LTRemark", font: "LT Remark", slug: "lt-remark", ratio: 4 / 5 },
  { src: "Memoir", font: "Memoir", slug: "memoir", ratio: 6 / 5 },
  { src: "Besley", font: "Besley", slug: "besley", ratio: 4 / 5 },
  { src: "MistralSingleLine", font: "Mistral SingleLine", slug: "mistral-singleline", ratio: 6 / 5 },
  { src: "MontaguSlab", font: "Montagu Slab", slug: "montagu-slab", ratio: 4 / 5 },
  { src: "Pliant", font: "Pliant", slug: "pliant", ratio: 6 / 5 },
  { src: "Lilex", font: "Lilex", slug: "lilex", ratio: 6 / 5 },
  { src: "MomoSignature", font: "Momo Signature", slug: "momo-signature", ratio: 4 / 5 },
  { src: "Mephisto", font: "Mephisto", slug: "mephisto", ratio: 4 / 5 },
  { src: "Newsreader", font: "Newsreader", slug: "newsreader", ratio: 4 / 5 },
  { src: "TikTok", font: "TikTok Sans", slug: "tiktok-sans", ratio: 4 / 5 },
  { src: "PicNic", font: "PicNic", slug: "picnic", ratio: 4 / 5 },
  { src: "Director", font: "Director", slug: "director", ratio: 6 / 5 },
  { src: "AmericaXIX", font: "America XIX", slug: "america-xix", ratio: 4 / 5 },
  { src: "Coconat", font: "Coconat", slug: "coconat", ratio: 4 / 5 },
  { src: "MomoTrust", font: "Momo Trust Sans", slug: "momo-trust-sans", ratio: 6 / 5 },
]

// Bump when any clip in public/hero is re-rendered: the files are served with a
// year's immutable caching (see public/_headers), so the query is what tells a
// returning browser that a clip changed.
const MEDIA_VERSION = 2
const clipUrl = (src: string) => `/hero/${src}.mp4?v=${MEDIA_VERSION}`
const posterUrl = (src: string) => `/hero/${src}.jpg?v=${MEDIA_VERSION}`

// Clips are fetched whole and played from a blob, not handed to <video> by URL.
// A <video> asks for its file in byte ranges, and Chrome keeps 206 responses
// out of the disk cache: measured, a second visit re-downloaded every clip,
// eight of eight. A plain fetch is cached like any file.
//
// The first request asks the cache alone (only-if-cached), which answers at
// once either way — so the reel knows, rather than guesses from a timer,
// whether a clip is on disk. One blob per clip, shared by every copy of it in
// the loop.
type Loaded = { url: string; cached: boolean }
const clips = new Map<string, Promise<Loaded>>()
const settled = new Set<string>()

function loadClip(src: string, onMiss: () => void): Promise<Loaded> {
  let p = clips.get(src)
  if (!p) {
    p = (async () => {
      let res: Response | null = null
      try {
        res = await fetch(src, { cache: "only-if-cached", mode: "same-origin" })
      } catch {
        res = null
      }
      const cached = !!res?.ok
      if (!cached) {
        onMiss()
        res = await fetch(src)
      }
      const url = URL.createObjectURL(await res!.blob())
      settled.add(src)
      return { url, cached }
    })()
    clips.set(src, p)
  } else if (!settled.has(src)) {
    // Another copy of the clip is still loading; if that was a miss, this
    // cell waits on the network too and should show its poster. Once the blob
    // is in hand — coming back to the hero, say — there is nothing to wait for.
    p.then(r => { if (!r.cached) onMiss() })
  }
  return p
}

const N = CLIPS.length
const GAP = 8
const AUTO_DRIFT = -0.4 // px per 60fps frame, as on plkv.works
const FRICTION = 0.95
const CLICK_SLOP = 5
// How long the hero may stay out of sight before its clips are unloaded.
const UNLOAD_AFTER_MS = 15000

const canHover = () =>
  typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches

// The hover from plkv.works (lib/tilt there): the cell tilts toward the
// cursor's corner, lifts and grows a little. Mouse only — a tap sends a
// mouseenter with no mouseleave and would leave a cell stuck tilted.
const TILT_MAX_DEG = 10
const HOVER_SCALE = 1.05
const HOVER_LIFT_PX = 6
const clampHalf = (v: number) => Math.max(-0.5, Math.min(0.5, v))

function applyTilt(el: HTMLElement, x: number, y: number) {
  if (!canHover()) return
  const r = el.getBoundingClientRect()
  const px = clampHalf((x - r.left) / r.width - 0.5)
  const py = clampHalf((y - r.top) / r.height - 0.5)
  el.style.willChange = "transform"
  el.style.transform =
    `perspective(760px) translateY(-${HOVER_LIFT_PX}px) rotateX(${(-py * TILT_MAX_DEG).toFixed(2)}deg) ` +
    `rotateY(${(px * TILT_MAX_DEG).toFixed(2)}deg) scale(${HOVER_SCALE})`
  el.style.zIndex = "10"
}

function clearTilt(el: HTMLElement) {
  el.style.transform = ""
  el.style.zIndex = ""
  el.style.willChange = ""
}

export function HeroReel() {
  const router = useRouter()
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [sets, setSets] = useState(3)
  const [dragging, setDragging] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)

  const offset = useRef(0)
  const period = useRef(1)
  const inertia = useRef(0)
  const paused = useRef(false)
  // Whether the hero is on screen at all. Once it has faded under the catalogue
  // the strip stops drifting and its clips stop playing: nothing there is seen,
  // and the reader is busy scrolling cards over it.
  const active = useRef(true)
  const startLoop = useRef<() => void>(() => {})
  const drag = useRef({ down: false, startX: 0, startOffset: 0, moved: false, lastX: 0, lastT: 0, v: 0 })

  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduceMotion(q.matches)
    sync()
    q.addEventListener("change", sync)
    return () => q.removeEventListener("change", sync)
  }, [])

  // Where each cell sits along the track, unshifted, and the length of the
  // whole strip — every copy of the set laid end to end.
  const lefts = useRef<number[]>([])
  const shifts = useRef<number[]>([])
  const total = useRef(1)

  // The offset only needs to stay a manageable number: a shift of a whole
  // strip puts every cell back on the same spot, so nothing moves.
  const wrap = useCallback((x: number) => {
    const t = total.current || 1
    const m = x % t
    return m > 0 ? m - t : m
  }, [])

  // The track moves as one, and each cell that slides out past the left edge
  // is carried, on its own, to the far end of the strip, out of sight on the
  // right. Moving the whole track back by a set instead put other copies of
  // the clips on screen at once — copies that had been far off, paused or not
  // yet loaded — and the row blinked until they caught up.
  const paint = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const x = offset.current
    track.style.transform = `translate3d(${x}px,0,0)`
    const t = total.current
    const lead = period.current
    const cells = track.children as HTMLCollectionOf<HTMLElement>
    for (let i = 0; i < lefts.current.length && i < cells.length; i++) {
      const shift = -Math.floor((lefts.current[i] + x + lead) / t) * t
      if (shift !== shifts.current[i]) {
        shifts.current[i] = shift
        // The individual translate property, not transform: transform is the
        // hover tilt's.
        cells[i].style.translate = shift ? `${shift}px 0` : ""
      }
    }
  }, [])

  // Cells carry their aspect ratio in CSS, so one set's width is known as soon
  // as the row has a height — no waiting on media to load.
  const measure = useCallback(() => {
    const vp = viewportRef.current
    const track = trackRef.current
    if (!vp || !track) return
    const cells = Array.from(track.children) as HTMLElement[]
    const p = cells.slice(0, N).reduce((s, c) => s + c.offsetWidth + GAP, 0)
    if (p > 0) period.current = p
    // A cell leaves at one set's width past the left edge and comes back that
    // far before the right one, so the strip must outrun the screen by two.
    setSets(Math.max(2, Math.ceil(vp.clientWidth / period.current) + 2))
    lefts.current = cells.map(c => c.offsetLeft)
    shifts.current = cells.map(() => NaN)
    total.current = period.current * (cells.length / N)
    offset.current = wrap(offset.current)
    paint()
  }, [paint, wrap])

  // Again after a change in the number of sets, once the new cells exist.
  useEffect(() => { measure() }, [sets, measure])

  useEffect(() => {
    measure()
    const ro = new ResizeObserver(() => requestAnimationFrame(measure))
    if (viewportRef.current) ro.observe(viewportRef.current)
    return () => ro.disconnect()
  }, [measure])

  useEffect(() => {
    if (reduceMotion) return
    let raf = 0
    let last = 0
    const step = (now: number) => {
      // Off screen the loop does not idle, it ends; sync() starts it again
      // when the hero comes back.
      if (!active.current) { raf = 0; return }
      const frames = Math.min((now - last) / 1000, 0.05) * 60
      last = now
      if (!drag.current.down && !paused.current) {
        inertia.current *= FRICTION
        offset.current = wrap(offset.current + AUTO_DRIFT * frames + inertia.current)
        paint()
      }
      raf = requestAnimationFrame(step)
    }
    startLoop.current = () => {
      if (raf) return
      last = performance.now()
      raf = requestAnimationFrame(step)
    }
    startLoop.current()
    return () => {
      cancelAnimationFrame(raf)
      raf = 0
      startLoop.current = () => {}
    }
  }, [reduceMotion, paint, wrap])

  // Play what is on screen, pause the rest — and pause everything once the
  // hero has faded out under the catalogue, or six clips go on decoding behind
  // the cards for as long as anyone browses. Positions are read on a short
  // timer rather than through an IntersectionObserver: an observer reports
  // only changes, and its first report came back "not visible" before layout
  // settled, so on a phone, where a clip can sit on screen without crossing
  // an edge, nothing ever started.
  useEffect(() => {
    const track = trackRef.current
    const root = viewportRef.current
    if (!track || !root) return
    const videos = Array.from(track.querySelectorAll("video"))
    if (reduceMotion) {
      // Nothing plays; each cell shows the clip's first frame.
      videos.forEach(v => {
        const cell = v.parentElement
        loadClip(v.dataset.src!, () => cell?.classList.add("is-waiting")).then(({ url }) => {
          v.src = url
        })
      })
      return
    }
    const hero = root.closest<HTMLElement>(".catalog-hero")
    let hiddenSince = 0
    const sync = () => {
      // Any opacity at all counts: the clips start as the hero begins to come
      // back, not once it is nearly whole.
      const heroShown = !document.hidden && (!hero || Number(getComputedStyle(hero).opacity) > 0)
      if (heroShown !== active.current) {
        active.current = heroShown
        if (heroShown) startLoop.current()
        hiddenSince = heroShown ? 0 : performance.now()
      }
      if (!heroShown) {
        // Paused first, switched off only later. A paused <video> keeps its
        // decoder and buffers, and the reader may browse the catalogue for an
        // hour, so after a while the source is taken away to release them. But
        // not at once: a reader who scrolls down and straight back up found a
        // row of empty cells while every clip loaded again.
        const unload = performance.now() - hiddenSince > UNLOAD_AFTER_MS
        for (const v of videos) {
          if (!v.getAttribute("src")) continue
          v.pause()
          if (!unload) continue
          v.removeAttribute("src")
          v.load()
          v.classList.remove("is-ready")
          // The file is still in memory and comes back in a moment; until it
          // does, the cell shows the blurred frame rather than nothing.
          v.parentElement?.classList.add("is-waiting")
        }
        return
      }
      const w = window.innerWidth
      const h = window.innerHeight
      for (const v of videos) {
        const r = v.getBoundingClientRect()
        const near = r.right > -200 && r.left < w + 200 && r.bottom > 0 && r.top < h
        if (near && !v.getAttribute("src")) {
          if (v.dataset.loading) continue
          v.dataset.loading = "1"
          const cell = v.parentElement
          loadClip(v.dataset.src!, () => cell?.classList.add("is-waiting")).then(({ url }) => {
            delete v.dataset.loading
            // The hero may have gone while the file was on its way.
            if (!active.current) return
            v.src = url
            v.muted = true
            v.defaultMuted = true
            v.play().catch(() => {})
          })
        } else if (near && v.paused) {
          // React does not carry the muted attribute through hydration, and a
          // browser only autoplays a clip it knows is silent.
          v.muted = true
          v.defaultMuted = true
          v.play().catch(() => {})
        } else if (!near && !v.paused) {
          v.pause()
        }
      }
    }
    const first = requestAnimationFrame(sync)
    const timer = window.setInterval(sync, 400)
    // The timer alone noticed a return to the top up to 400ms late, the row
    // still stopped while the copy was back. Scrolling of any scroller —
    // the catalogue scrolls inside <main> — checks again on the next frame.
    let pending = 0
    const onScroll = () => {
      if (!pending) pending = requestAnimationFrame(() => { pending = 0; sync() })
    }
    document.addEventListener("scroll", onScroll, { capture: true, passive: true })
    document.addEventListener("visibilitychange", sync)
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(pending)
      clearInterval(timer)
      document.removeEventListener("scroll", onScroll, { capture: true })
      document.removeEventListener("visibilitychange", sync)
    }
  }, [sets, reduceMotion])

  // A sideways swipe on a trackpad, or Shift with a mouse wheel, moves the row
  // like a drag. Vertical scrolling is left alone: the page scrolls past the
  // hero with it. The trackpad brings its own momentum, so no inertia is added.
  // Registered by hand because React's wheel listener is passive and cannot
  // stop the browser's back/forward swipe.
  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const onWheel = (e: WheelEvent) => {
      const dx = e.shiftKey && e.deltaX === 0 ? e.deltaY : e.deltaX
      if (Math.abs(dx) <= Math.abs(e.shiftKey ? 0 : e.deltaY)) return
      e.preventDefault()
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? vp.clientWidth : 1
      inertia.current = 0
      offset.current = wrap(offset.current - dx * unit)
      paint()
    }
    vp.addEventListener("wheel", onWheel, { passive: false })
    return () => vp.removeEventListener("wheel", onWheel)
  }, [paint, wrap])

  const onPointerDown = (e: React.PointerEvent) => {
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
    const d = drag.current
    d.down = true
    d.startX = d.lastX = e.clientX
    d.startOffset = offset.current
    d.lastT = e.timeStamp
    d.moved = false
    d.v = 0
    inertia.current = 0
    setDragging(true)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d.down) return
    const dx = e.clientX - d.startX
    if (Math.abs(dx) > CLICK_SLOP) d.moved = true
    offset.current = wrap(d.startOffset + dx)
    paint()
    const dt = e.timeStamp - d.lastT
    if (dt > 0) d.v = ((e.clientX - d.lastX) / dt) * 16
    d.lastX = e.clientX
    d.lastT = e.timeStamp
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d.down) return
    d.down = false
    setDragging(false)
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
    if (d.moved) {
      inertia.current = d.v
      return
    }
    // Pointer capture swallows the anchor's own click, so a tap is routed here.
    const cell = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)
      ?.closest<HTMLElement>("[data-slug]")
    if (cell) {
      clearTilt(cell)
      router.push(`/font/${cell.dataset.slug}`)
    }
  }

  return (
    <div
      ref={viewportRef}
      className={`hero-reel${dragging ? " is-dragging" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onMouseEnter={() => { if (canHover()) paused.current = true }}
      onMouseLeave={() => { paused.current = false }}
      aria-label="Fonts in motion"
    >
      <div ref={trackRef} className="hero-reel-track">
        {Array.from({ length: sets }).flatMap((_, s) =>
          CLIPS.map((c, i) => (
            <a
              key={`${s}-${i}`}
              href={`/font/${c.slug}`}
              data-slug={c.slug}
              className="hero-reel-cell"
              aria-label={c.font}
              style={{ aspectRatio: String(c.ratio) }}
              // A pointer tap is routed in onPointerUp; a keyboard Enter
              // (detail 0) is left to follow the link.
              onClick={e => { if (e.detail !== 0) e.preventDefault() }}
              onMouseMove={e => { if (!drag.current.down) applyTilt(e.currentTarget, e.clientX, e.clientY) }}
              onMouseLeave={e => clearTilt(e.currentTarget)}
              draggable={false}
              tabIndex={s === 0 ? 0 : -1}
              aria-hidden={s === 0 ? undefined : true}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="hero-reel-poster" src={posterUrl(c.src)} alt="" aria-hidden draggable={false} />
              <video
                className="hero-reel-video"
                data-src={clipUrl(c.src)}
                muted
                loop
                playsInline
                preload="auto"
                onLoadedData={e => e.currentTarget.classList.add("is-ready")}
                aria-hidden
              />
            </a>
          ))
        )}
      </div>
    </div>
  )
}
