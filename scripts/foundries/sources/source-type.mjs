import { fetchText, mapLimit } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// Source Type's site is server-rendered by its own CMS. The typefaces index has
// a Retail block, which lists the families on sale, and a Research &
// Collaborations block of artist projects and essays, which is left out. A
// typeface page is a run of sections (cover, source material and feature
// carousels, closing picture) ahead of a footer that teases related typefaces.
// Pictures are lazy <img> elements under /images/. The path takes ?w= to
// resize, but the resizer renders on request and has taken minutes for a
// single picture, so the originals are used. Hero sections hold a landscape
// picture and a portrait crop of it for phones; the crop is skipped. Covers are
// Lottie animations and have no picture.
//
// Most pages say "first released by Source Type in 2023", a year only. Images
// carry the time they were uploaded as Last-Modified, and a family's pictures go
// up in the weeks before its launch, so the earliest upload dates the release
// when it falls in the stated year. Pictures re-uploaded later (UN-11) leave
// 1 January of that year. A page that states no year (Karl, Chroma, Diplomat
// while in beta) gets null.
//
// The server slows to a crawl now and then and a page times out, so a page gets
// three tries a few seconds apart.
const SITE = 'https://www.sourcetype.com'

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function page(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetchText(url)
    } catch (e) {
      if (attempt === 3) throw e
      await sleep(attempt * 5000)
    }
  }
}

function retail(html) {
  const block = html.slice(html.indexOf('typeface-previews--retail'))
  const end = block.indexOf('class="typeface-block"')
  return [...new Set([...block.slice(0, end).matchAll(/data-href="(\/typefaces\/\d+\/[^"]+)"/g)].map(m => m[1]))]
}

function pictures(html) {
  const body = html.slice(html.indexOf('<body'), html.indexOf('<footer'))
  const paths = [...body.matchAll(/<img\b[^>]*>/g)]
    .map(m => m[0])
    .filter(tag => !tag.includes('lazyimage--portrait'))
    .map(tag => (tag.match(/\s(?:data-)?src="(\/images\/[^"?]+\.(?:jpe?g|png|gif|webp))[?"]/i) || [])[1])
    .filter(Boolean)
  return [...new Set(paths)].map(path => SITE + path)
}

async function uploaded(src) {
  try {
    const res = await fetch(src, { method: 'HEAD', signal: AbortSignal.timeout(15000) })
    const d = new Date(res.headers.get('last-modified'))
    return isNaN(d) ? null : d.toISOString().slice(0, 10)
  } catch {
    return null
  }
}

async function releaseDate(html, srcs) {
  const year = (html.match(/released by Source Type in (\d{4})/i) || [])[1]
  if (!year) return null
  const uploads = (await mapLimit(srcs, 2, uploaded)).filter(Boolean).sort()
  return uploads[0]?.startsWith(year) ? uploads[0] : `${year}-01-01`
}

export default {
  id: 'source-type',
  label: 'Source Type',
  url: SITE,
  async run({ maxImages }) {
    const index = await page(`${SITE}/typefaces/`)
    return mapLimit(retail(index), 2, async path => {
      const url = SITE + path
      const html = await page(url)
      const srcs = pictures(html)
      const images = await mapLimit(srcs.slice(0, maxImages), 2, async src => ({ src, ...(await imageSize(src)) }))
      return {
        name: html.match(/<title>([^<]+?) - Typefaces/)[1].trim(),
        url,
        date: await releaseDate(html, srcs),
        images: images.filter(img => img.width),
      }
    })
  },
}
