/**
 * Generates public/fonts/fonts.css from fonts-data.json.
 * Run: node scripts/generate-font-css.mjs
 * Add to package.json prebuild: "node scripts/generate-font-css.mjs"
 */
import { readFileSync, writeFileSync } from 'fs'
import { createHash } from 'crypto'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const root = join(__dir, '..')
const dataPath = join(root, 'public/fonts/fonts-data.json')
const outPath = join(root, 'public/fonts/fonts.css')

const data = JSON.parse(readFileSync(dataPath, 'utf8'))

const formatMap = { woff2: 'woff2', woff: 'woff', truetype: 'truetype', opentype: 'opentype', ttf: 'truetype', otf: 'opentype' }

function shortHash(s) {
  return createHash('md5').update(s).digest('hex').slice(0, 6)
}

function canonicalName(name) {
  return name.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

function buildFontFace(familyName, v) {
  const url = v.url || `/fonts/${v.filename}`
  const fmt = (v.format || '').toLowerCase()
  const fmtHint = formatMap[fmt] ? ` format("${formatMap[fmt]}")` : ''

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

  const style = v.isItalic ? 'italic' : 'normal'
  return `@font-face{font-family:"${familyName}";src:url("${url}")${fmtHint};font-weight:${weight};font-style:${style};font-display:swap;}`
}

const chunks = []
for (const fam of data.families) {
  if (!fam.published) continue
  const variants = (fam.variants || []).filter(v => v.published !== false)
  if (!variants.length) continue

  const canonical = canonicalName(fam.name)
  const alias = `${canonical}-${shortHash(canonical)}`

  for (const v of variants) {
    if (!v.url && !v.filename) continue
    chunks.push(buildFontFace(alias, v))
    const variantAlias = `${alias}__v_${shortHash(v.url || v.filename || v.id || '')}`
    chunks.push(buildFontFace(variantAlias, v))
  }
}

const css = chunks.join('\n')
writeFileSync(outPath, css, 'utf8')
console.log(`Generated ${outPath} — ${chunks.length / 2} font-faces, ${(css.length / 1024).toFixed(1)}KB`)
