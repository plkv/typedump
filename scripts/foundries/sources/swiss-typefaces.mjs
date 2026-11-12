import { fetchText, mapLimit } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// Swiss Typefaces' site is server-rendered (Django). The catalogue at /fonts/
// links one page per retail family; superfamilies such as Suisse or SangBleu
// keep their subfamilies on that one page. A typeface page shows its specimens
// and in-use photographs as slideshows and figures, each twice: a wide one for
// desktop and one marked @2-hidden for phones, so the phone copies are dropped.
// The specimens themselves are SVG and can't be shown; what remains are the
// in-use photographs (pre-cut 1236px-tall JPEGs whose size is in the markup),
// GIFs and PNGs set in the page body, and the Fonts In Use thumbnails at the end.
//
// Nothing on the site states a release date. The files under /media/ul/ keep
// the Last-Modified of their upload, so the earliest one on the page dates it
// to within days for families launched since 2020 (Raskal, Only). Older
// families land on the 2018 relaunch or the 2019 redesign of their specimens.
// The Fonts In Use thumbnails are left out of this: they are synced, not
// uploaded with the page.
const SITE = 'https://www.swisstypefaces.com'

function families(html) {
  return [...new Map([...html.matchAll(/href="\/fonts\/([^"/]+)\/" name="([^"]+)"/g)].map(m => [m[1], m[2]]))]
}

function pictures(html) {
  const desktop = html
    .replace(/class="\s*small-slide-show @2-hidden"[\s\S]*?<\/slide-show>/g, '')
    .replace(/class="figure-block block\s+@2-hidden">[\s\S]*?<\/figure>/g, '')
  return [...desktop.matchAll(/<img[^>]+src="(\/media\/ul\/[^"]+\.(?:jpe?g|png|gif|webp))"[^>]*>/gi)].map(m => {
    const size = m[0].match(/width="(\d+)"\s+height="(\d+)"/)
    return { src: SITE + m[1], ...(size && { width: +size[1], height: +size[2] }) }
  })
}

async function releaseDate(html) {
  const uploads = [...new Set([...html.matchAll(/<img[^>]+src="(\/media\/ul\/[^"]+)"/g)].map(m => m[1]))]
    .filter(src => !src.startsWith('/media/ul/fonts/uses/'))
  const stamps = await mapLimit(uploads, 2, async src => {
    const res = await fetch(SITE + src, { method: 'HEAD' })
    return Date.parse(res.headers.get('last-modified'))
  })
  const valid = stamps.filter(Boolean)
  return valid.length ? new Date(Math.min(...valid)).toISOString().slice(0, 10) : null
}

export default {
  id: 'swiss-typefaces',
  label: 'Swiss Typefaces',
  url: SITE,
  async run({ maxImages }) {
    const catalogue = await fetchText(`${SITE}/fonts/`)
    return mapLimit(families(catalogue), 2, async ([slug, name]) => {
      const url = `${SITE}/fonts/${slug}/`
      const html = await fetchText(url)
      const seen = new Set()
      const pics = pictures(html).filter(p => !seen.has(p.src) && seen.add(p.src))
      // A few Fonts In Use thumbnails are WebP under a .png name, or JPEGs
      // whose frame header sits past the bytes imageSize reads.
      const sized = await mapLimit(pics, 2, async p => (p.width ? p : { ...p, ...(await imageSize(p.src)) }))
      return {
        name,
        url,
        date: await releaseDate(html),
        images: sized.filter(p => p?.width).slice(0, maxImages),
      }
    })
  },
}
