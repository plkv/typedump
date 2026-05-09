/**
 * Downloads all fonts from Vercel Blob to public/fonts/
 * Run once to migrate from cloud storage to git-based storage.
 * Usage: node scripts/download-all-fonts.mjs
 */

import { writeFile, mkdir, readFile, writeFile as wf } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const FONTS_DIR = join(ROOT, 'public', 'fonts')
const API_URL = 'https://baseline-fonts.vercel.app/api/families-v2'

async function main() {
  await mkdir(FONTS_DIR, { recursive: true })

  console.log('Fetching font catalog...')
  const res = await fetch(API_URL)
  const data = await res.json()
  const families = data.families

  console.log(`Found ${families.length} families`)

  const allVariants = families.flatMap(f =>
    (f.variants || []).map(v => ({ family: f.name, ...v }))
  )
  console.log(`Total files to download: ${allVariants.length}\n`)

  let ok = 0, skip = 0, fail = 0

  for (const variant of allVariants) {
    const url = variant.blobUrl
    const filename = variant.filename

    if (!url || !filename) {
      console.log(`  SKIP (no url): ${variant.family}`)
      skip++
      continue
    }

    const dest = join(FONTS_DIR, filename)

    // Check if already downloaded
    try {
      await readFile(dest)
      process.stdout.write(`  already exists: ${filename}\n`)
      skip++
      continue
    } catch {}

    try {
      process.stdout.write(`  downloading: ${filename}... `)
      const r = await fetch(url)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const buf = await r.arrayBuffer()
      await writeFile(dest, Buffer.from(buf))
      console.log(`✓ (${Math.round(buf.byteLength / 1024)}KB)`)
      ok++
    } catch (e) {
      console.log(`✗ ${e.message}`)
      fail++
    }
  }

  console.log(`\nDone: ${ok} downloaded, ${skip} skipped, ${fail} failed`)

  // Save full metadata JSON, replacing blobUrl with local static path
  const cleanFamilies = families.map(f => ({
    ...f,
    variants: (f.variants || []).map(v => ({
      ...v,
      blobUrl: undefined,
      url: `/fonts/${v.filename}`,
    }))
  }))

  const metaPath = join(FONTS_DIR, 'fonts-data.json')
  await wf(metaPath, JSON.stringify({ families: cleanFamilies, lastUpdated: new Date().toISOString() }, null, 2))
  console.log(`\nMetadata saved to public/fonts/fonts-data.json`)
}

main().catch(e => { console.error(e); process.exit(1) })
