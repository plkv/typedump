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
    src: v.url || `/fonts/${v.filename}`,
    weight,
    isItalic: v.isItalic,
    format: v.format,
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
