#!/usr/bin/env node
/**
 * Checks the catalogue against the tag vocabulary before it is published.
 *
 * Every rule here was a real correction at some point: a tag invented on the
 * spot, a serif left without its class, `Modern` on a sans, a font whose card
 * shows the browser's fallback because the face has no lowercase. Running this
 * costs a second; finding it afterwards costs a review round.
 *
 *   node scripts/check-taxonomy.mjs            # whole catalogue
 *   node scripts/check-taxonomy.mjs --new-only # only families added vs origin/main
 */
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(root, 'public/fonts/fonts-data.json')

const TAGS = new Set(['Banded', 'Bauhaus', 'Calligraphy', 'Handwritten', 'Contrast', 'Curly',
  'Cut', 'Fatface', 'Futura', 'Geometry', 'Gill', 'Grotesque', 'Humanist', 'Inktrap', 'Low Poly',
  'Modern', 'Transitional', 'Slab', 'Modular', 'Multi Style', 'Narrow', 'Neutral', 'New Face',
  'Old Face', 'Pixel', 'Rounded', 'Sharp', 'Squared', 'Stencil', 'Stroked', 'Tech', 'Vintage',
  'Wavy', 'Wide'])
// Decorative is the honest answer for a face whose letters are assembled from
// shapes rather than built on any of the other skeletons — calling Trezybec a
// sans told a reader nothing and put it under a filter it does not belong to.
const CATEGORIES = new Set(['Sans', 'Serif', 'Semi Serif', 'Script', 'Mono', 'Pixel', 'Decorative'])
const COLLECTIONS = new Set(['Text', 'Display', 'Brutal'])
const SERIF_ONLY = new Set(['Modern', 'Transitional', 'Slab'])
const SERIF_CLASS = new Set(['Old Face', 'Transitional', 'Modern', 'Slab'])

const data = JSON.parse(readFileSync(DATA, 'utf8'))
let families = data.families

if (process.argv.includes('--new-only')) {
  try {
    const base = JSON.parse(execSync('git show origin/main:public/fonts/fonts-data.json', {
      cwd: root, encoding: 'utf8', maxBuffer: 1 << 28,
    }))
    const known = new Set(base.families.map(f => f.name))
    families = families.filter(f => !known.has(f.name))
    console.log(`Checking ${families.length} families not on origin/main.\n`)
  } catch {
    console.log('Could not read origin/main; checking everything.\n')
  }
}

const problems = []
const note = (family, text) => problems.push({ family, text })

for (const f of families) {
  const tags = new Set(f.styleTags || [])
  const cats = new Set(f.category || [])
  const isSerif = cats.has('Serif')

  for (const t of tags) if (!TAGS.has(t)) note(f.name, `tag not in the vocabulary: "${t}"`)
  for (const c of cats) if (!CATEGORIES.has(c)) note(f.name, `category not in the vocabulary: "${c}"`)
  if (!COLLECTIONS.has(f.collection)) note(f.name, `collection "${f.collection}"`)
  if (!tags.size) note(f.name, 'no style tags')
  if (!cats.size) note(f.name, 'no category')

  for (const t of tags) {
    if (SERIF_ONLY.has(t) && !isSerif && !cats.has('Semi Serif')) {
      note(f.name, `"${t}" on a non-serif (${[...cats].join(', ') || 'no category'})`)
    }
  }
  const cls = [...tags].filter(t => SERIF_CLASS.has(t))
  if (cls.length > 1) note(f.name, `more than one serif class: ${cls.join(', ')}`)
  if (isSerif && !cls.length) note(f.name, 'serif with no class from {Old Face, Transitional, Modern, Slab}')
  if (tags.has('Pixel') && !['Display', 'Brutal'].includes(f.collection)) {
    note(f.name, `Pixel tag on a ${f.collection} family`)
  }

  if (!(f.downloadLink || '').trim()) note(f.name, 'no downloadLink')
  else if (/fonts\.google\.com/.test(f.downloadLink)) note(f.name, 'downloadLink points at Google Fonts, not upstream')

  for (const v of f.variants || []) {
    for (const key of ['url', 'previewUrl']) {
      const p = v[key]
      if (p && !existsSync(join(root, 'public' + p))) note(f.name, `${key} missing on disk: ${p}`)
    }
  }
}

if (!problems.length) {
  console.log(`${families.length} families checked. Nothing to report.`)
  process.exit(0)
}

const byFamily = new Map()
for (const p of problems) {
  if (!byFamily.has(p.family)) byFamily.set(p.family, [])
  byFamily.get(p.family).push(p.text)
}
console.log(`${families.length} families checked, ${byFamily.size} with something to look at:\n`)
for (const [name, list] of [...byFamily].sort()) {
  console.log(`  ${name}`)
  for (const t of list) console.log(`    - ${t}`)
}
console.log(`\nGlyph coverage is not checked here — it needs the font files parsed.`)
console.log(`Run: python3 scripts/check-glyphs.py`)
process.exit(1)
