/**
 * Generates public/fonts/fonts.css from fonts-data.json.
 * Run: node scripts/generate-font-css.mjs
 * Add to package.json prebuild: "node scripts/generate-font-css.mjs"
 */
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
// Same helpers the running app uses, so the aliases here match what it asks for.
import { familyAlias, variantAlias } from '../lib/font-alias.mjs'
import { fontFaceRule } from '../lib/font-face.mjs'

const __dir = dirname(fileURLToPath(import.meta.url))
const root = join(__dir, '..')
const dataPath = join(root, 'public/fonts/fonts-data.json')
const outPath = join(root, 'public/fonts/fonts.css')

const data = JSON.parse(readFileSync(dataPath, 'utf8'))

function buildFontFace(familyName, v) {
  let weight
  if (v.isVariable) {
    const wAxis = (v.variableAxes || []).find(a => a.axis === 'wght')
    if (wAxis) {
      const min = Math.max(1, Math.min(1000, Math.floor(wAxis.min)))
      const max = Math.max(1, Math.min(1000, Math.ceil(wAxis.max)))
      weight = (isFinite(min) && isFinite(max) && max > min) ? `${min} ${max}` : '100 900'
    } else {
      weight = '100 900'
    }
  } else {
    weight = String(v.weight || 400)
  }

  const face = (src, unicodeRange) => fontFaceRule({
    family: familyName,
    src,
    unicodeRange,
    weight,
    isItalic: v.isItalic,
    format: v.format,
    // `swap`, so the specimen paints in the fallback straight away and the card
    // can shimmer over it while the real face arrives. `block` was here before
    // and hid the text outright: nothing to shimmer, and a blank card reads as
    // broken rather than as loading. The swap does re-draw the line — every
    // face in this catalogue is 1.05x to 1.39x wider than the system fallback,
    // so it grows on arrival — but the shimmer is what marks the text as
    // provisional, which is the point of showing it at all.
    fontDisplay: 'swap',
  })
  const full = v.url || `/fonts/${v.filename}`
  // The cut-down preview file when there is one. This sheet declares every
  // face in the catalogue, so it — not the per-card injection — is what the
  // browser actually fetches while scrolling. Pointing it at the full files
  // was the 16MB.
  if (!v.previewUrl) return face(full)
  if (!v.previewRange) return face(v.previewUrl)
  // A script too big for the preview (see build-preview-subsets.py): the cut
  // for what it holds, the full file for everything else. The two ranges must
  // not overlap. document.fonts.load() fetches every face covering its text,
  // not just the one that would draw it, so a full file declared for all of
  // Unicode came down for a Latin card — Pretendard's 2MB on every visit.
  return face(full, complement(v.previewRange)) + '\n' + face(v.previewUrl, v.previewRange)
}

// `U+20-7E,U+A0-17F` → everything else in Unicode, in the same notation.
function complement(range) {
  const spans = range.split(',').map(r => r.replace('U+', '').split('-').map(h => parseInt(h, 16)))
  const out = []
  let next = 0
  for (const [a, b = a] of spans) {
    if (a > next) out.push([next, a - 1])
    next = b + 1
  }
  if (next <= 0x10FFFF) out.push([next, 0x10FFFF])
  return out.map(([a, b]) => a === b ? `U+${a.toString(16).toUpperCase()}` : `U+${a.toString(16).toUpperCase()}-${b.toString(16).toUpperCase()}`).join(',')
}

const chunks = []
for (const fam of data.families) {
  if (!fam.published) continue
  const variants = (fam.variants || []).filter(v => v.published !== false)
  if (!variants.length) continue

  const alias = familyAlias(fam.name)

  for (const v of variants) {
    if (!v.url && !v.filename) continue
    chunks.push(buildFontFace(alias, v))
    // The app hashes the variant's blobUrl, which is this same `url` value.
    chunks.push(buildFontFace(variantAlias(fam.name, v.url || v.filename || v.id || ''), v))
  }

  // Some licences make the @font-face conditional on a credit sitting with it.
  // Jean-Luc's asks for this text immediately under the declaration block, and
  // the permission to web-embed at all depends on it being there.
  if (fam.cssNotice) chunks.push(`/*\n${fam.cssNotice}\n*/`)
}

const css = chunks.join('\n')
writeFileSync(outPath, css, 'utf8')
console.log(`Generated ${outPath} — ${chunks.length / 2} font-faces, ${(css.length / 1024).toFixed(1)}KB`)
