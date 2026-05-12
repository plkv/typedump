/**
 * Re-extracts openTypeFeatureTags for all font variants using corrected GSUB parsing,
 * then patches public/fonts/fonts-data.json in place.
 *
 * Fixes:
 *   - Removed blind name-ID-256+ scan that picked up fvar instance names as ss names
 *   - Fixed featOff offset: relative to FeatureList, not GSUB start
 *   - Added lookup count guard: features with 0 lookups are excluded
 *
 * Usage: node scripts/patch-ot-features.mjs
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dataPath = join(root, 'public/fonts/fonts-data.json')
const fontsDir = join(root, 'public/fonts')

// ── Binary helpers ────────────────────────────────────────────────────────────

function tagAt(dv, off) {
  return String.fromCharCode(dv.getUint8(off), dv.getUint8(off+1), dv.getUint8(off+2), dv.getUint8(off+3))
}

function buildNameReader(dv, nameOff) {
  const count = dv.getUint16(nameOff + 2)
  const stringOffset = dv.getUint16(nameOff + 4)
  const records = nameOff + 6
  const map = new Map()
  for (let i = 0; i < count; i++) {
    const o = records + i * 12
    const platformID = dv.getUint16(o)
    const length = dv.getUint16(o + 8)
    const offset = dv.getUint16(o + 10)
    const nameID = dv.getUint16(o + 6)
    if (length === 0) continue
    const start = nameOff + stringOffset + offset
    const bytes = new Uint8Array(dv.buffer, start, length)
    let val
    if (platformID === 3) {
      let s = ''
      for (let j = 0; j + 1 < bytes.length; j += 2) s += String.fromCharCode((bytes[j] << 8) | bytes[j+1])
      val = s.trim()
    } else {
      val = new TextDecoder('utf-8', { fatal: false }).decode(bytes).trim()
    }
    if (val && (!map.has(nameID) || platformID === 3)) map.set(nameID, val)
  }
  return (id) => map.get(id) || ''
}

// Returns { tag → name } for ssNN features that have actual lookups and a FeatureParams name.
// Falls back to generic "Stylistic Set N" for unnamed but real features.
function extractSsFeatures(buffer) {
  const dv = new DataView(buffer)
  const numTables = dv.getUint16(4)
  let gsubOff = 0, nameOff = 0
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16
    const t = tagAt(dv, rec)
    const off = dv.getUint32(rec + 8)
    if (t === 'GSUB') gsubOff = off
    if (t === 'name') nameOff = off
  }
  if (!gsubOff) return {}
  const readName = nameOff ? buildNameReader(dv, nameOff) : () => ''

  const featureListOffset = dv.getUint16(gsubOff + 6)
  if (!featureListOffset) return {}
  const flOff = gsubOff + featureListOffset
  const featureCount = dv.getUint16(flOff)

  const res = {}
  let p = flOff + 2
  for (let i = 0; i < featureCount; i++) {
    const tag = tagAt(dv, p)
    const featOff = dv.getUint16(p + 4)
    const ftBase = flOff + featOff          // relative to FeatureList
    const lookupCount = dv.getUint16(ftBase + 2)

    if (lookupCount > 0 && /^(ss\d\d|cv\d\d)$/.test(tag) && !res[tag]) {
      let title = ''
      const featureParams = dv.getUint16(ftBase)
      if (featureParams && /^ss\d\d$/.test(tag)) {
        const params = ftBase + featureParams
        const uiNameID = dv.getUint16(params + 2)
        if (uiNameID) title = readName(uiNameID)
      }
      if (!title) {
        const n = parseInt(tag.slice(2), 10)
        title = /^ss/.test(tag) ? `Stylistic Set ${n}` : `Character Variant ${n}`
      }
      res[tag] = title
    }
    p += 6
  }
  return res
}

// ── Patch ─────────────────────────────────────────────────────────────────────

const data = JSON.parse(readFileSync(dataPath, 'utf8'))
let updated = 0, cleared = 0, skipped = 0

for (const family of data.families) {
  for (const variant of family.variants) {
    const fontPath = join(fontsDir, variant.filename)
    let buffer
    try {
      buffer = readFileSync(fontPath).buffer
    } catch {
      console.warn(`  ⚠ missing: ${variant.filename}`)
      skipped++
      continue
    }

    let features = {}
    try {
      features = extractSsFeatures(buffer)
    } catch (e) {
      console.warn(`  ⚠ parse error ${variant.filename}: ${e.message}`)
    }

    const tags = Object.entries(features)
      .map(([tag, title]) => ({ tag, title }))
      .sort((a, b) => a.tag.localeCompare(b.tag))

    const prev = JSON.stringify(variant.openTypeFeatureTags ?? [])
    const next = JSON.stringify(tags)

    if (prev !== next) {
      if (tags.length === 0) cleared++
      else updated++
      variant.openTypeFeatureTags = tags.length ? tags : undefined
    }
  }
}

writeFileSync(dataPath, JSON.stringify(data, null, 2))
console.log(`Done. updated: ${updated}, cleared: ${cleared}, skipped: ${skipped}`)
