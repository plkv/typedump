import { fetchText, mapLimit } from '../../discover/lib.mjs'
import { imageSize, woffDates } from '../lib.mjs'

// Camelot's site is server-rendered PHP. The desktop menu lists the families,
// each tagged with the folder its files live in (mf-graebenbach-roman for
// /graebenbach). A family page is all live text and SVG character sets, so the
// pictures come from elsewhere: the home grid has a few tiles pointing at a
// family, and the In Use page groups its galleries by that same folder. Families
// nobody has shown in use yet have no pictures.
//
// No page states a release date. Each family page embeds its fonts as WOFF, and
// the head table records when the font was created. A rebuild resets that
// (Gräbenbach reads 2023 though it was in use in 2016), and a companion built
// from its parent's sources inherits the parent's (Lelo Mono reads 2016, as Lelo
// does). In-use pictures are named with their upload time in Unix seconds
// (Visarte11473324317.jpeg is 8 September 2016), and a family was out before
// anyone used it. The date is the earlier of the two: right to the day for most
// families, an upper bound for rebuilt ones, early for companions. The site's
// in-use pictures went up in mid-2016, so families older than that read 2016.
const SITE = 'https://camelot-typefaces.com'
const RASTER = /\.(jpe?g|png|gif|webp)$/i

const abs = path => new URL(path, `${SITE}/`).href
const slugOf = href => href.replace(/^(https?:\/\/)?camelot-typefaces\.com/, '').replace(/^\//, '').replace(/[#?].*$/, '').replace(/\/$/, '')

function families(html) {
  return [...html.matchAll(/<li class="mf-([^"]+)">\s*<a href="\/([^"]+)" id="[^"]*" class="single-font-desktop">\s*([^<]+?)\s*<\/a>/g)]
    .map(m => ({ folder: m[1], slug: m[2], name: m[3] }))
}

// The grid repeats each tile's picture for mobile without the link, so only the
// desktop tiles, whose background carries the picture, are read.
function homeTiles(html) {
  return html
    .split('#### START ####')
    .slice(1)
    .map(block => ({
      src: (block.match(/background-image:\s*url\(([^)]+)\)/) || [])[1],
      slugs: [...block.matchAll(/href="([^"]+)"/g)].map(m => slugOf(m[1])),
    }))
    .filter(t => t.src && RASTER.test(t.src))
}

function inUse(html) {
  return html
    .split('<div class="inUseContainer ')
    .slice(1)
    .map(block => ({
      folder: block.match(/^([^"]+)"/)[1],
      srcs: [...block.matchAll(/data-flickity-lazyload="([^"]+)"/g)].map(m => m[1]).filter(src => RASTER.test(src)),
    }))
}

// One more try for a page that timed out; the server has slow spells.
async function page(url) {
  try {
    return await fetchText(url)
  } catch {
    return fetchText(url)
  }
}

const uploaded = src => {
  const stamp = (src.match(/(\d{10})\.\w+$/) || [])[1]
  return stamp ? new Date(stamp * 1000).toISOString().slice(0, 10) : null
}

function fontCreated(html) {
  const dates = [...html.matchAll(/base64,(d09GRg[A-Za-z0-9+/=]+)/g)].map(m => woffDates(Buffer.from(m[1], 'base64'))?.created)
  return dates.filter(Boolean).sort()[0] ?? null
}

export default {
  id: 'camelot',
  label: 'Camelot Typefaces',
  url: SITE,
  async run({ maxImages }) {
    const [home, inUsePage] = await Promise.all([fetchText(`${SITE}/`), fetchText(`${SITE}/inuse`)])
    const tiles = homeTiles(home)
    const galleries = inUse(inUsePage)
    const list = families(home)
    // The server stalls when its megabyte family pages and the picture probes
    // overlap, so the pages are read first and the probes run three at a time.
    const created = await mapLimit(list, 2, async ({ slug }) => fontCreated(await page(`${SITE}/${slug}`)))
    return mapLimit(list, 1, async ({ folder, slug, name }, i) => {
      const used = galleries.filter(g => g.folder === folder).flatMap(g => g.srcs)
      const srcs = [...new Set([...tiles.filter(t => t.slugs.includes(slug)).map(t => t.src), ...used].map(abs))].slice(0, maxImages)
      const dates = [created[i], ...used.map(uploaded)].filter(Boolean).sort()
      return {
        name,
        url: `${SITE}/${slug}`,
        date: dates[0] ?? null,
        images: (await mapLimit(srcs, 3, async src => ({ src, ...(await imageSize(src)) }))).filter(i => i.width && i.height),
      }
    })
  },
}
