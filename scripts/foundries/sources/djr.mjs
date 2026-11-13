import { fetchText, mapLimit, ogImage } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// DJR's site is server-rendered (Craft). The nav's Fonts menu lists every
// retail family under Series and Singles. A series has its own hand-built page:
// specimen pictures in /assets/<family>/, a "From Fonts In Use" grid, and a
// press sample as og:image. Most singles were Font of the Month releases and
// link straight to the note announcing them, whose pictures are the specimen.
// A menu link that leaves the site (Megascope redirects to the Typeset app, a
// Svelte page with no canonical link) falls back to the family's release note.
// Specimen art is mostly SVG and is skipped. Fonts In Use thumbnails are 440px
// squares, and some of them are missing (404).
//
// No page states a release date and asset files lost their Last-Modified in a
// 2020 move. The notes archive (/notes/list, every post since May 2016 with its
// date) carries the releases: a family dates to the earliest "NEW: X" or "Font
// of the Month: X" post, or the note the menu links to, whichever is first. A
// post for a v2 or a script extension is not a release. Families older than the
// archive (Trilby, Turnip, Input, Condor) get null.
const SITE = 'https://djr.com'
const RASTER = /\.(jpe?g|png|gif|webp)(\?|$)/i
const WIDTH = 1600

const sleep = ms => new Promise(r => setTimeout(r, ms))

// The server stalls now and then; two quick retries cover it without
// stretching a run.
async function page(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetchText(url)
    } catch (e) {
      if (attempt === 3) throw e
      await sleep(attempt * 2000)
    }
  }
}

function families(home) {
  const menu = home.slice(home.indexOf('>Series<'), home.indexOf('/font-of-the-month-club" class'))
  return [...menu.matchAll(/<a class="text-djr-gray[^"]*" href="([^"]+)">([^<]+)<\/a>/g)].map(m => ({
    href: m[1],
    name: m[2].trim(),
  }))
}

function notes(list) {
  const text = s => s.replace(/<[^>]+>/g, '').replace(/&rsquo;|&#8217;/g, '’').replace(/&amp;/g, '&').trim()
  return [...list.matchAll(/<dt>([\d-]+)<\/dt>\s*<dd><a href="([^"]+)">([\s\S]*?)<\/a>/g)].map(m => ({
    date: m[1],
    url: m[2],
    title: text(m[3]),
  }))
}

const named = (s, name) => s.startsWith(name) && !/[\p{L}\d]/u.test(s[name.length] || '')

// "Gimlet" must not pick up posts about Gimlet Sans or Gimlet X-Ray, which the
// menu lists as families of their own.
function releaseNotes(posts, name, names) {
  const longer = names.filter(n => n !== name && n.startsWith(`${name} `))
  return posts
    .filter(p => /font of the month|^NEW:/i.test(p.title) && !/\bv\d|Cyrillic|Greek|Arabic|Hebrew|Armenian/.test(p.title))
    .filter(p => {
      const subjects = [p.title, p.title.split(':').slice(1).join(':').trim()]
      return subjects.some(s => named(s, name) && !longer.some(l => named(s, l)))
    })
}

function largest(srcset) {
  const candidates = srcset
    .split(',')
    .map(c => c.trim().split(/\s+/))
    .map(([src, w]) => ({ src, w: parseInt(w) || 0 }))
    .sort((a, b) => a.w - b.w)
  return (candidates.filter(c => c.w <= WIDTH).at(-1) || candidates[0]).src
}

function pictures(html, url, isNote) {
  const main = html.slice(html.search(/<main[\s>]/), html.indexOf('</main>'))
  const srcs = [...main.matchAll(/<img\b[^>]*>/g)].map(m => {
    const srcset = m[0].match(/\ssrcset="([^"]+)"/)
    return srcset ? largest(srcset[1]) : (m[0].match(/\ssrc="([^"]+)"/) || [])[1]
  })
  const og = isNote ? null : ogImage(html, url)
  return [...new Set([og, ...srcs].filter(Boolean).map(s => new URL(s.replace(/&amp;/g, '&'), url).href))].filter(s =>
    RASTER.test(s),
  )
}

export default {
  id: 'djr',
  label: 'DJR',
  url: SITE,
  async run({ maxImages }) {
    const [home, list] = await Promise.all([page(`${SITE}/`), page(`${SITE}/notes/list`)])
    const posts = notes(list)
    const fams = families(home)
    const names = fams.map(f => f.name)
    return mapLimit(fams, 4, async ({ href, name }) => {
      const releases = releaseNotes(posts, name, names)
      const linked = posts.find(p => p.url === href)
      const dates = [linked?.date, releases.at(-1)?.date].filter(Boolean).sort()
      let url = href
      let html = await page(href)
      if (!html.includes('rel="canonical" href="https://djr.com/') && releases.length) {
        url = releases.at(-1).url
        html = await page(url)
      }
      const srcs = pictures(html, url, url.includes('/notes/')).slice(0, maxImages)
      const images = await mapLimit(srcs, 4, async src => ({ src, ...(await imageSize(src)) }))
      return {
        name,
        url,
        date: dates[0] ?? null,
        images: images.filter(i => i.width && i.height),
      }
    })
  },
}
