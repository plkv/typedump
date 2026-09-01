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

  return fontFaceRule({
    family: familyName,
    // The cut-down preview file when there is one. This sheet declares every
    // face in the catalogue, so it — not the per-card injection — is what the
    // browser actually fetches while scrolling. Pointing it at the full files
    // was the 16MB.
    src: v.previewUrl || v.url || `/fonts/${v.filename}`,
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
}

const css = chunks.join('\n')
writeFileSync(outPath, css, 'utf8')
console.log(`Generated ${outPath} — ${chunks.length / 2} font-faces, ${(css.length / 1024).toFixed(1)}KB`)
