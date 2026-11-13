import { fetchText, mapLimit } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// Plain Form's site is server-rendered (Kirby) with Fontdue for the shop. The
// typefaces index names each retail family in a bold link; Disc, sold through
// Future Fonts, is only on the home page and stays out. A typeface page opens on
// a parallax of reference pictures, then a block holding every file uploaded to
// the page, the specimen cover, figures between the type testers and an "In use"
// strip of Fonts In Use pictures. The "Notes on design" article the page links
// shows the process. Plain Form's pictures are originals; Kirby makes no sized
// copies that a URL can ask for. Fonts In Use serves any picture at 1400px wide
// (upto-700xauto/…/@2x/), used for its larger originals except GIFs.
//
// The page states only a "Release year", given here as YYYY-01-01. Kirby's
// media stamps were all reset by a later deploy and articles carry no date.
const SITE = 'https://plain-form.com'
const RASTER = /\.(jpe?g|png|gif|webp)$/i

function families(html) {
  const seen = new Set()
  return [...html.matchAll(/<strong><a href="\/typefaces\/([^"]+)"[^>]*>([^<]+)</g)]
    .map(m => ({ slug: m[1], name: m[2].trim() }))
    .filter(f => !seen.has(f.slug) && seen.add(f.slug))
}

function imgs(html) {
  return [...html.matchAll(/<img\b[^>]*?\ssrc="([^"]+)"/g)].map(m => m[1].trim()).filter(src => RASTER.test(src))
}

function sized(src) {
  const full = src.match(/^(https:\/\/assets\.fontsinuse\.com\/.+?)\/full-(\d+)x\d+\/([^/]+)\/(.+)$/)
  if (!full || +full[2] <= 1600 || /\.gif$/i.test(src)) return src
  return `${full[1]}/upto-700xauto/${full[3]}/@2x/${full[4]}`
}

function releaseDate(html) {
  const year = html.match(/<h3>Release year<\/h3>\s*(\d{4})/)
  return year ? `${year[1]}-01-01` : null
}

async function articleImages(url) {
  try {
    const slug = new URL(url).pathname.split('/').pop()
    return imgs(await fetchText(url)).filter(src => src.includes(`/media/pages/articles/${slug}/`))
  } catch {
    return []
  }
}

export default {
  id: 'plain-form',
  label: 'Plain Form',
  url: SITE,
  async run({ maxImages }) {
    const index = await fetchText(`${SITE}/typefaces`)
    const pages = await mapLimit(families(index), 4, async ({ slug, name }) => {
      const url = `${SITE}/typefaces/${slug}`
      const html = await fetchText(url)
      const main = html.slice(html.indexOf('<div class="topimg'), html.indexOf('<section id="footer"'))
      const details = main.slice(main.indexOf('class="font-details"'), main.indexOf('id="type-testers"'))
      const articles = [...new Set([...details.matchAll(/href="(https:\/\/plain-form\.com\/articles\/[^"]+)"/g)].map(m => m[1]))]
      const notes = await mapLimit(articles, 1, articleImages)
      const srcs = [...new Set([...imgs(main), ...notes.flat()].map(sized))]
      return { name, url, date: releaseDate(html), srcs }
    })
    // The server takes about a second per picture, so all families share one
    // queue rather than each waiting on its own.
    const found = pages.filter(Boolean)
    const all = found.flatMap(p => p.srcs)
    const sizes = await mapLimit(all, 4, imageSize)
    const size = new Map(all.map((src, i) => [src, sizes[i]]))
    return found.map(({ srcs, ...family }) => ({
      ...family,
      images: srcs
        .filter(src => size.get(src))
        .map(src => ({ src, ...size.get(src) }))
        .slice(0, maxImages),
    }))
  },
}
