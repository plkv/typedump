#!/usr/bin/env node
// Font-discovery crawler. Sweeps a handful of free-font sources over plain
// HTTP (no LLM, no paid API), drops anything already in our catalog, keeps the
// last N months, and writes public/discovered-fonts.json for the /new page.
//
//   node scripts/discover/index.mjs            # 3-month window, no commit
//   node scripts/discover/index.mjs --months=6
//   node scripts/discover/index.mjs --push     # commit + push the JSON (launchd)
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { normName, monthsAgoISO, ogImage, fetchText, mapLimit } from './lib.mjs'

import googleFonts from './sources/google-fonts.mjs'
import fontesk from './sources/fontesk.mjs'
import bestfreefonts from './sources/bestfreefonts.mjs'
import collletttivo from './sources/collletttivo.mjs'
import fontshare from './sources/fontshare.mjs'
import uncut from './sources/uncut.mjs'

const SOURCES = [googleFonts, fontesk, bestfreefonts, collletttivo, fontshare, uncut]
const MAX_FONTS = 200 // total ceiling, keeps the page light
const MAX_PER_SOURCE = 40 // no single firehose (Fontesk) may crowd out curated foundries

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
const args = process.argv.slice(2)
const months = Number((args.find(a => a.startsWith('--months=')) || '').split('=')[1]) || 3
const sinceArg = (args.find(a => a.startsWith('--since=')) || '').split('=')[1]
const ytd = args.includes('--ytd')
const doPush = args.includes('--push')

// The recency floor (YYYY-MM-DD). --since wins, then --ytd (Jan 1 this year),
// else a rolling N-month window.
const floor = sinceArg
  ? sinceArg
  : ytd
    ? `${new Date().getFullYear()}-01-01`
    : monthsAgoISO(months)

function log(...a) {
  console.log(`[discover]`, ...a)
}

function loadCatalogNames() {
  const raw = JSON.parse(readFileSync(join(ROOT, 'public', 'fonts', 'fonts-data.json'), 'utf8'))
  const fams = raw.families || raw
  return new Set(fams.map(f => normName(f.name)))
}

async function main() {
  const have = loadCatalogNames()
  log(`catalog: ${have.size} families | floor: ${floor}`)

  // 1. Run every source; a failing source contributes nothing, never throws.
  const results = await Promise.all(
    SOURCES.map(async s => {
      try {
        const items = await s.run({ months, floor })
        log(`${s.id}: ${items.length} raw`)
        return items.map(it => ({ ...it, _priority: s._priority ?? s.priority ?? 50, _sourceLabel: s.label }))
      } catch (e) {
        log(`${s.id}: FAILED (${e.message})`)
        return []
      }
    })
  )
  const raw = results.flat()

  // 2. Drop what we already have, anything without a usable name, and any
  //    personal-use-only font — we only surface commercially-usable licenses.
  const fresh = raw.filter(
    it => it.name && !have.has(normName(it.name)) && !/personal use/i.test(it.license || '')
  )

  // 3. Recency: keep dated entries at or after the floor; keep dateless ones
  //    (e.g. Fontshare "new") as a secondary group.
  const inWindow = fresh.filter(it => (it.date ? it.date >= floor : true))

  // 4. Dedupe by normalized name across sources. Prefer the entry that is
  //    dated, then higher-priority (smaller number = upstream foundry).
  const byName = new Map()
  const score = it => (it.date ? 1000 : 0) - (it._priority ?? 50)
  for (const it of inWindow) {
    const k = normName(it.name)
    const prev = byName.get(k)
    if (!prev || score(it) > score(prev)) byName.set(k, it)
  }
  const dedup = [...byName.values()]

  const byDate = (a, b) => {
    if (!!a.date !== !!b.date) return a.date ? -1 : 1
    if (a.date && b.date) return b.date.localeCompare(a.date)
    return 0
  }

  // 5. Cap each source so one firehose can't bury the curated foundries,
  //    then sort the whole set newest-first and apply the page ceiling.
  const perSource = new Map()
  for (const it of dedup) {
    const arr = perSource.get(it.source) || []
    arr.push(it)
    perSource.set(it.source, arr)
  }
  let fonts = []
  for (const arr of perSource.values()) {
    arr.sort(byDate)
    fonts.push(...arr.slice(0, MAX_PER_SOURCE))
  }
  fonts.sort(byDate)
  fonts = fonts.slice(0, MAX_FONTS)

  // 6. Best-effort preview thumbnails. Google fonts render live on the page;
  //    for the rest we read og:image from the font's own page (one request).
  const needImg = fonts.filter(f => !f.image && !f.googleFamily)
  log(`fetching ${needImg.length} preview thumbnails`)
  await mapLimit(needImg, 6, async f => {
    try {
      const html = await fetchText(f.url, { timeout: 15000 })
      f.image = ogImage(html, f.url)
    } catch {
      /* leave image null; card falls back to a text specimen */
    }
  })

  // 7. Emit a lean payload for the page.
  const out = {
    generatedAt: new Date().toISOString(),
    months,
    since: floor,
    count: fonts.length,
    fonts: fonts.map(f => ({
      name: f.name,
      author: f.author || '',
      source: f.source,
      sourceLabel: f._sourceLabel,
      url: f.url,
      date: f.date || null,
      image: f.image || null,
      googleFamily: f.googleFamily || null,
      category: f.category || null,
      license: f.license || null,
    })),
  }
  const outPath = join(ROOT, 'public', 'discovered-fonts.json')
  writeFileSync(outPath, JSON.stringify(out, null, 2))
  log(`wrote ${out.count} fonts → public/discovered-fonts.json`)

  if (doPush) {
    try {
      execFileSync('git', ['add', 'public/discovered-fonts.json'], { cwd: ROOT })
      const changed = execFileSync('git', ['status', '--porcelain', 'public/discovered-fonts.json'], { cwd: ROOT }).toString().trim()
      if (changed) {
        execFileSync('git', ['commit', '-m', `Discover: ${out.count} new fonts (${out.generatedAt.slice(0, 10)})`], { cwd: ROOT })
        execFileSync('git', ['push'], { cwd: ROOT })
        log('committed + pushed')
      } else {
        log('no change, skipping commit')
      }
    } catch (e) {
      log(`push failed: ${e.message}`)
    }
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
