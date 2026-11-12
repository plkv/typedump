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

import grilli from './sources/grilli.mjs'
import dinamo from './sources/dinamo.mjs'
import floriankarsten from './sources/florian-karsten.mjs'
import brownfox from './sources/brownfox.mjs'
import ohno from './sources/ohno.mjs'
import radimpesko from './sources/radim-pesko.mjs'
import swisstypefaces from './sources/swiss-typefaces.mjs'
import pangrampangram from './sources/pangram-pangram.mjs'

const SOURCES = [grilli, dinamo, floriankarsten, brownfox, ohno, radimpesko, swisstypefaces, pangrampangram]
const MAX_IMAGES = 16 // per typeface on the page
const CANDIDATES = 40 // per typeface before the text check; photos without type drop out

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..')
const CACHE = join(HERE, 'text-cache.json')
const IMAGES = join(ROOT, 'public', 'foundry-images')
const OUTPUT = join(ROOT, 'public', 'foundry-fonts.json')
const HEIGHT = 640 // the carousel is 320px tall; twice that for dense screens

const log = (...a) => console.log('[foundries]', ...a)

// A picture shows type when text covers a twentieth of it, or when a line is
// at least 4% of its height and the text covers 1%. The second clause keeps a
// single big word; together they drop the shop sign behind a portrait and the
// magazine lying on a kitchen counter.
const showsType = ({ line, area }) => area >= 0.05 || (line >= 0.04 && area >= 0.01)

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
      // sharp's pixel limit counts every frame; long GIFs of a few hundred
      // frames pass it and still come out near 2 MB at this height.
      await sharp(Buffer.from(await res.arrayBuffer()), { animated: true, limitInputPixels: false })
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

  const all = results.flat()
  const text = measureText([...new Set(all.flatMap(f => f.images.map(i => i.src)))])
  const withType = all
    .map(f => ({ ...f, images: f.images.filter(i => text[i.src] && showsType(text[i.src])).slice(0, MAX_IMAGES) }))
    .filter(f => f.images.length)
  const fonts = [...(await localCopies(withType, held)), ...held]
    .filter(f => f.images.length)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))

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
