/**
 * Reliable per-character glyph coverage detection via canvas width comparison.
 *
 * For a given family, a character is considered MISSING when rendering it with
 * that family (plus a generic fallback) produces the exact same advance width as
 * the generic fallback alone — i.e. the browser fell back for that glyph. Testing
 * against three different generics (monospace / sans-serif / serif) makes false
 * positives vanishingly unlikely: a present glyph differs from at least one
 * generic, a missing glyph matches all three.
 *
 * Note: requires the family to be LOADED. Recompute after `document.fonts`
 * finishes loading (the preview component bumps an epoch on `loadingdone`).
 */

let sharedCtx: CanvasRenderingContext2D | null = null
function ctx(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null
  if (!sharedCtx) sharedCtx = document.createElement('canvas').getContext('2d')
  return sharedCtx
}

/** Extract the first family name from a CSS font-family list (handles quotes). */
export function firstFamily(fontFamily: string): string {
  const m = fontFamily.match(/^\s*"([^"]+)"/) || fontFamily.match(/^\s*'([^']+)'/) || fontFamily.match(/^\s*([^,]+)/)
  return (m ? (m[1] ?? m[0]) : '').trim()
}

const GENERICS = ['monospace', 'sans-serif', 'serif']
const SIZE = 72

export function makeMissingChecker(family: string): (ch: string) => boolean {
  const c = ctx()
  const fam = family ? `"${family}"` : ''
  const cache = new Map<string, boolean>()
  return (ch: string): boolean => {
    if (!c || !fam || !ch) return false
    // Whitespace and line breaks are never "missing"
    if (ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r' || ch === ' ') return false
    const cached = cache.get(ch)
    if (cached !== undefined) return cached
    let missing = true
    for (const g of GENERICS) {
      c.font = `${SIZE}px ${fam}, ${g}`
      const wFam = c.measureText(ch).width
      c.font = `${SIZE}px ${g}`
      const wGen = c.measureText(ch).width
      if (Math.abs(wFam - wGen) > 0.1) { missing = false; break }
    }
    cache.set(ch, missing)
    return missing
  }
}

export interface GlyphSegment { text: string; missing: boolean }

/** Split text into runs of consecutive present / missing characters. */
export function segmentByCoverage(text: string, family: string): GlyphSegment[] {
  const missingOf = makeMissingChecker(family)
  const segs: GlyphSegment[] = []
  for (const ch of text) {
    const missing = missingOf(ch)
    const last = segs[segs.length - 1]
    if (last && last.missing === missing) last.text += ch
    else segs.push({ text: ch, missing })
  }
  return segs
}
