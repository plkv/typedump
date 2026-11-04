/**
 * Renders one hero-reel clip from an HTML frame and encodes it into
 * public/hero, the way the reel expects it: H.264, 640px tall, CRF 27,
 * 30fps, no audio, plus a 48x40 poster the cell shows while the clip loads.
 *
 * A frame page sets its own size (768x640 for 6:5, 512x640 for 4:5) and
 * exposes window.FRAMES and window.setFrame(n). Frames go through a real
 * browser so OpenType features and feature variations apply.
 *
 *   npm i --no-save puppeteer-core
 *   node scripts/hero-clips/render.mjs GeistSerif
 */
import puppeteer from 'puppeteer-core'
import { execFileSync } from 'child_process'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const name = process.argv[2]
const here = dirname(fileURLToPath(import.meta.url))
const hero = join(here, '../../public/hero')
const frames = mkdtempSync(join(tmpdir(), 'clip-'))
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--allow-file-access-from-files'] })
const page = await browser.newPage()
await page.goto('file://' + join(here, name + '.html'))
const { width, height } = await page.evaluate(() => ({ width: document.body.offsetWidth, height: document.body.offsetHeight }))
await page.setViewport({ width, height, deviceScaleFactor: 2 })
await page.evaluate(() => document.fonts.ready)
const count = await page.evaluate(() => window.FRAMES)
for (let i = 0; i < count; i++) {
  await page.evaluate(i => window.setFrame(i), i)
  await page.screenshot({ path: join(frames, `f${String(i).padStart(3, '0')}.png`) })
}
await browser.close()

execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '30', '-i', join(frames, 'f%03d.png'),
  '-vf', `scale=${width}:${height}:flags=lanczos`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '27',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', join(hero, name + '.mp4')])
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', join(frames, 'f000.png'), '-vf', `scale=${width / 16}:${height / 16}`,
  '-q:v', '8', join(hero, name + '.jpg')])
rmSync(frames, { recursive: true })
console.log(`${name}: ${count} frames -> public/hero/${name}.mp4`)
