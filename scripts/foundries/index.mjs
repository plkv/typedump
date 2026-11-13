#!/usr/bin/env node
// Foundry crawler. Walks the sites of foundries worth watching, collects each
// typeface with its pictures and release date, keeps the pictures that show
// type, and writes public/foundry-fonts.json, newest first, for the /foundries page.
//
//   node scripts/foundries/index.mjs
//
// Reading the type in a picture takes macOS Vision (text-count.swift), so this
// runs on a Mac: locally, or daily on GitHub's macOS runner
// (.github/workflows/foundries.yml). Verdicts are cached by URL in
// text-cache.json; both it and the image copies are committed, so a build on
// any machine has every picture.
//
// The pictures the page shows are our own copies in public/foundry-images/,
// cut to twice the carousel's height as WebP. Foundries serve originals of up
// to 9 MB, which a page of 140 rows cannot carry; GIFs stay animated.
import { readFileSync, writeFileSync, existsSync, readdirSync, rmSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { mapLimit } from '../discover/lib.mjs'
import { imageSize } from './lib.mjs'

import grilli from './sources/grilli.mjs'
import dinamo from './sources/dinamo.mjs'
import floriankarsten from './sources/florian-karsten.mjs'
import brownfox from './sources/brownfox.mjs'
import ohno from './sources/ohno.mjs'
import radimpesko from './sources/radim-pesko.mjs'
import swisstypefaces from './sources/swiss-typefaces.mjs'
import pangrampangram from './sources/pangram-pangram.mjs'
import nan from './sources/nan.mjs'
import intervaltype from './sources/interval-type.mjs'
import basement from './sources/basement.mjs'
import massdriver from './sources/mass-driver.mjs'
import giuliaboggio from './sources/giulia-boggio.mjs'
import rellence from './sources/rellence.mjs'
import weltkern from './sources/weltkern.mjs'
import contrastfoundry from './sources/contrast-foundry.mjs'
import displaay from './sources/displaay.mjs'
import pizzatypefaces from './sources/pizza-typefaces.mjs'
import futurefonts from './sources/future-fonts.mjs'
import cctype from './sources/cctype.mjs'
import productiontype from './sources/production-type.mjs'
import sourcetype from './sources/source-type.mjs'
import typekiosk from './sources/typekiosk.mjs'
import alttf from './sources/alt-tf.mjs'
import typedepartment from './sources/type-department.mjs'
import contemporarytype from './sources/contemporary-type.mjs'
import familytype from './sources/family-type.mjs'
import nonfoundry from './sources/non-foundry.mjs'
import luzitype from './sources/luzi-type.mjs'
import mnkytype from './sources/mnky-type.mjs'
import lineto from './sources/lineto.mjs'
import klim from './sources/klim.mjs'
import fatype from './sources/fatype.mjs'
import optimo from './sources/optimo.mjs'
import binnenland from './sources/binnenland.mjs'
import plainform from './sources/plain-form.mjs'
import studiofeixen from './sources/studio-feixen.mjs'
import milieugrotesque from './sources/milieu-grotesque.mjs'
import camelot from './sources/camelot.mjs'
import nouvellenoire from './sources/nouvelle-noire.mjs'
import kometa from './sources/kometa.mjs'
import peregrin from './sources/peregrin.mjs'
import djr from './sources/djr.mjs'
import commercialtype from './sources/commercial-type.mjs'
import britishstandardtype from './sources/british-standard-type.mjs'
import erkinkaramemet from './sources/erkin-karamemet.mjs'
import typetoday from './sources/type-today.mjs'
import groteskly from './sources/groteskly.mjs'

const SOURCES = [
  grilli, dinamo, floriankarsten, brownfox, ohno, radimpesko, swisstypefaces, pangrampangram,
  nan, intervaltype, basement, massdriver, giuliaboggio, rellence, weltkern, contrastfoundry,
  displaay, pizzatypefaces, futurefonts, cctype, productiontype, sourcetype, typekiosk, alttf,
  typedepartment, contemporarytype, familytype, nonfoundry, luzitype, mnkytype, lineto, klim, fatype,
  optimo, binnenland, plainform, studiofeixen, milieugrotesque, camelot, nouvellenoire, kometa,
  peregrin, djr, commercialtype, britishstandardtype, erkinkaramemet, typetoday,
  groteskly,
]
// The page is a feed of what is new, so its size is capped and the oldest fall
// off: copies outside these limits are deleted, which keeps public/foundry-images
// near 2,400 pictures however many foundries are added.
const MAX_IMAGES = 8 // per typeface
const MIN_PER_FOUNDRY = 4 // newest typefaces each foundry keeps, however old or undated
const MAX_PER_FOUNDRY = 20 // newest typefaces from one foundry
const MAX_TYPEFACES = 300 // on the page: every foundry's first few, then the newest of the rest
const CANDIDATES = 40 // per typeface before the text check; photos without type drop out
// A strip wider than this (an OpenType figures demo, a one-line banner) turns
// into a band thousands of pixels long at the carousel's height.
const MAX_ASPECT = 4

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..')
const CACHE = join(HERE, 'text-cache.json')
const IMAGES = join(ROOT, 'public', 'foundry-images')
const OUTPUT = join(ROOT, 'public', 'foundry-fonts.json')
// Hand-picked pictures for a typeface whose own are wrong or missing, keyed by
// its page URL: { "images": [urls], "note": why }. Empty images hides it.
const OVERRIDES = join(HERE, 'overrides.json')
// The catalogue's categories (Sans, Serif, Semi Serif, Script, Mono, Pixel,
// Decorative), judged by eye from each typeface's pictures and keyed by its page
// URL. A typeface not judged yet takes what its name says, or none.
const CATEGORIES = join(HERE, 'categories.json')
const NAMED = [
  [/\bmono(spaced?)?\b/i, 'Mono'],
  [/\b(pixel|bitmap)\b/i, 'Pixel'],
  [/\bscript\b/i, 'Script'],
  [/\b(serif|slab|antiqua)\b/i, 'Serif'],
  [/\b(sans|grotesk|grotesque|grotesca|gothic)\b/i, 'Sans'],
]
const HEIGHT = 640 // the carousel is 320px tall; twice that for dense screens

const log = (...a) => console.log('[foundries]', ...a)

// A picture shows type when text covers a twentieth of it, or when a line is
// at least 4% of its height and the text covers 1%. The second clause keeps a
// single big word; together they drop the shop sign behind a portrait and the
// magazine lying on a kitchen counter.
const showsType = ({ line, area }) => area >= 0.05 || (line >= 0.04 && area >= 0.01)

// Vision cannot open SVG, and a vector on a foundry's page is a specimen set
// in the face, so SVGs skip the text check and are rasterised on copy.
const isSvg = src => /\.svg(\?|$)/i.test(src)

function measureText(srcs) {
  const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {}
  const todo = srcs.filter(src => !(src in cache))
  if (todo.length) {
    log(`reading type in ${todo.length} new images`)
    const run = spawnSync('swift', [join(HERE, 'text-count.swift')], {
      input: todo.join('\n'),
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    })
    if (run.status !== 0) throw new Error(`text-count.swift: ${run.stderr}`)
    for (const row of run.stdout.trim().split('\n').filter(Boolean).map(l => JSON.parse(l))) {
      // An image that failed to load is not cached, so the next run tries it again.
      if (row.line >= 0) cache[row.src] = { line: row.line, area: row.area }
    }
    // One image per line, sorted, so a day's new verdicts are a small diff.
    const sorted = Object.keys(cache).sort().map(src => `${JSON.stringify(src)}: ${JSON.stringify(cache[src])}`)
    writeFileSync(CACHE, `{\n${sorted.join(',\n')}\n}\n`)
  }
  return cache
}

// A transparent picture was drawn for the foundry's own page ground, which the
// carousel does not have: dark type gets white behind it, light type black, so
// it reads on both themes. The ink is the opaque pixels' average brightness,
// read off a thumbnail.
async function ground(image) {
  if (!(await image.metadata()).hasAlpha) return '#fff'
  const { data } = await image.clone().resize(64, 64, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let ink = 0
  let weight = 0
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] / 255
    ink += a * (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2])
    weight += a
  }
  return weight && ink / weight > 160 ? '#000' : '#fff'
}

// Each copy is named by a hash of its source URL, so a rerun only fetches new
// pictures, and copies no longer on the page are removed. `held` are rows
// carried over from the last run whose copies must stay.
async function localCopies(fonts, held) {
  mkdirSync(IMAGES, { recursive: true })
  const name = src => `${createHash('sha1').update(src).digest('hex').slice(0, 16)}.webp`
  const wanted = new Set([
    ...fonts.flatMap(f => f.images.map(i => name(i.src))),
    ...held.flatMap(f => f.images.map(i => i.src.split('/').pop())),
  ])
  for (const file of readdirSync(IMAGES)) if (!wanted.has(file)) rmSync(join(IMAGES, file))

  const copy = async img => {
    const file = join(IMAGES, name(img.src))
    if (!existsSync(file)) {
      const res = await fetch(img.src)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const input = Buffer.from(await res.arrayBuffer())
      // sharp's pixel limit counts every frame; long GIFs of a few hundred
      // frames pass it and still come out near 2 MB at this height.
      const image = isSvg(img.src)
        ? sharp(input, { density: Math.min(2400, Math.max(72, (72 * HEIGHT) / (img.height || HEIGHT))) })
        : sharp(input, { animated: true, limitInputPixels: false })
      await image
        .flatten({ background: await ground(image) })
        .resize({ height: HEIGHT, withoutEnlargement: true })
        .webp({ quality: 75 })
        .toFile(file)
    }
    const meta = await sharp(file).metadata()
    return { src: `/foundry-images/${name(img.src)}`, width: meta.width, height: meta.pageHeight ?? meta.height }
  }
  const todo = fonts.reduce((n, f) => n + f.images.filter(i => !existsSync(join(IMAGES, name(i.src)))).length, 0)
  if (todo) log(`copying ${todo} new images`)
  return mapLimit(fonts, 2, async f => ({ ...f, images: (await mapLimit(f.images, 4, copy)).filter(Boolean) }))
}

async function main() {
  // A foundry whose site fails or comes back empty keeps its rows from the last
  // run, so an outage or a block on the runner's address does not wipe it.
  const previous = existsSync(OUTPUT) ? JSON.parse(readFileSync(OUTPUT, 'utf8')).fonts : []
  const held = []
  const results = await Promise.all(
    SOURCES.map(async s => {
      let fonts = []
      try {
        fonts = (await s.run({ maxImages: CANDIDATES })).filter(f => f && f.images.length)
        log(`${s.id}: ${fonts.length} typefaces, ${fonts.reduce((n, f) => n + f.images.length, 0)} images`)
      } catch (e) {
        log(`${s.id}: FAILED (${e.message})`)
      }
      if (!fonts.length) held.push(...previous.filter(f => f.foundry === s.label))
      return fonts.map(f => ({ ...f, foundry: s.label, foundryUrl: s.url }))
    })
  )
  if (held.length) log(`holding ${held.length} typefaces from the last run`)

  const overrides = existsSync(OVERRIDES) ? JSON.parse(readFileSync(OVERRIDES, 'utf8')) : {}
  const picked = new Set(Object.values(overrides).flatMap(o => o.images))
  const all = await mapLimit(results.flat(), 4, async f => {
    const o = overrides[f.url]
    if (!o) return f
    return { ...f, images: (await mapLimit(o.images, 4, async src => ({ src, ...(await imageSize(src)) }))).filter(i => i.width) }
  })
  const trusted = src => isSvg(src) || picked.has(src)
  const text = measureText([...new Set(all.flatMap(f => f.images.map(i => i.src)).filter(src => !trusted(src)))])
  const withType = all
    .map(f => ({
      ...f,
      images: f.images
        .filter(i => picked.has(i.src) || i.width / i.height <= MAX_ASPECT)
        .filter(i => trusted(i.src) || (text[i.src] && showsType(text[i.src]))),
    }))
    .filter(f => f.images.length)

  // Ranked by date alone, a foundry whose faces are older or undated would
  // fall off the page entirely; each keeps its newest few before the rest
  // compete for the remaining places.
  const newest = (a, b) => (b.date || '').localeCompare(a.date || '')
  const perFoundry = new Map()
  const ranked = [...withType, ...held].sort(newest).map(f => {
    const rank = (perFoundry.get(f.foundry) || 0) + 1
    perFoundry.set(f.foundry, rank)
    return { f, rank }
  })
  const firsts = ranked.filter(r => r.rank <= MIN_PER_FOUNDRY)
  const rest = ranked.filter(r => r.rank > MIN_PER_FOUNDRY && r.rank <= MAX_PER_FOUNDRY)
  const chosen = [...firsts, ...rest.slice(0, Math.max(0, MAX_TYPEFACES - firsts.length))]
    .map(r => ({ ...r.f, images: r.f.images.slice(0, MAX_IMAGES) }))
  const keptHeld = chosen.filter(f => f.images[0]?.src.startsWith('/foundry-images/'))
  const fresh = chosen.filter(f => !keptHeld.includes(f))
  const fonts = [...(await localCopies(fresh, keptHeld)), ...keptHeld]
    .filter(f => f.images.length)
    .sort(newest)

  const judged = existsSync(CATEGORIES) ? JSON.parse(readFileSync(CATEGORIES, 'utf8')) : {}
  for (const f of fonts) {
    const named = NAMED.find(([re]) => re.test(f.name))
    f.category = judged[f.url] ?? (named ? [named[1]] : [])
  }

  const kept = fonts.reduce((n, f) => n + f.images.length, 0)
  log(`kept ${kept} images with type across ${fonts.length} typefaces`)
  // Rewritten only when the rows change, so a quiet day is not a commit.
  if (JSON.stringify(fonts) === JSON.stringify(previous)) return log('no change')
  const out = { generatedAt: new Date().toISOString(), count: fonts.length, fonts }
  writeFileSync(OUTPUT, JSON.stringify(out, null, 2))
  log(`wrote ${out.count} typefaces → public/foundry-fonts.json`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
