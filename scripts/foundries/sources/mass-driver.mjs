import { fetchText, mapLimit, normName, ogImage } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// Mass-Driver's site is server-rendered, with Fontdue behind the store. The
// catalogue lists each family with its years ("2021–24"); sub-families (MD UI
// XS, MD System Mono) are listed apart but share their parent's page, which is
// one typeface here. A typeface page is mostly live text and SVG: its rasters
// are the OG card, a hero image or two in /static/, and the design-process
// article it links to, which is where the specimens and sketches are. The
// "From human hands" link in the footer of every page is skipped. Images are
// Fontdue CDN and /static/ originals with no sized variants.
//
// Dates: a "New Release: <family>" post in the releases feed dates a release to
// the day. Otherwise the linked article dates it when it went up in the
// family's first catalogue year (the articles for MD Nichrome, Primer and
// Lórien did), and the year alone is all there is for the rest (YYYY-01-01).
const SITE = 'https://mass-driver.com'
const RASTER = /\.(jpe?g|png|gif|webp)(\?|$)/i

const decode = s => s.replace(/&amp;/g, '&')
const absolute = src => new URL(decode(src), `${SITE}/`).href

function families(html) {
  const byUrl = new Map()
  for (const m of html.matchAll(/catalog__family__info">([^<]+)<\/p>\s*<ul>\s*<li>\s*<a href="(\/typefaces\/[^"]+)"/g)) {
    const year = +(m[1].match(/\b(\d{4})\b/) || [])[1] || Infinity
    byUrl.set(m[2], Math.min(byUrl.get(m[2]) ?? Infinity, year))
  }
  return [...byUrl].map(([path, year]) => ({ url: SITE + path, year: isFinite(year) ? year : null }))
}

async function feed(path) {
  const rss = await fetchText(SITE + path)
  return rss.split('<item>').slice(1).map(item => ({
    title: decode((item.match(/<title>([^<]+)<\/title>/) || [])[1] || ''),
    link: (item.match(/<link>([^<]+)<\/link>/) || [])[1],
    date: new Date((item.match(/<pubDate>([^<]+)<\/pubDate>/) || [])[1]).toISOString().slice(0, 10),
  }))
}

function rasters(html) {
  return [...html.matchAll(/(?:\ssrc="|url\(["']?)([^"')]+)/g)]
    .map(m => m[1])
    .filter(src => RASTER.test(src))
    .map(absolute)
}

export default {
  id: 'mass-driver',
  label: 'Mass-Driver',
  url: SITE,
  async run({ maxImages }) {
    const [catalogue, posts, releases] = await Promise.all([fetchText(`${SITE}/typefaces/`), feed('/rss'), feed('/rss-releases')])
    return mapLimit(families(catalogue), 4, async ({ url, year }) => {
      const html = await fetchText(url)
      const content = html.slice(html.indexOf('<body'), html.indexOf('<footer'))
      const name = decode((html.match(/<title>(.+?) &middot; Mass-Driver/) || [])[1] || '').trim()
      const release = releases.find(r => normName(r.title.replace(/^New Release:\s*/, '')) === normName(name))
      const linked = [...new Set([...content.matchAll(/href="((?:https:\/\/mass-driver\.com)?\/article\/[^"]+)"/g)].map(m => absolute(m[1])))]
      const articles = [...new Set([...linked, release?.link].filter(Boolean))]
      const articleDate = posts.filter(p => linked.includes(p.link) && +p.date.slice(0, 4) === year).map(p => p.date).sort()[0]
      const fromArticles = await mapLimit(articles, 2, async link => {
        const page = await fetchText(link)
        return rasters(page.slice(page.indexOf('<body'), page.indexOf('<footer')))
      })
      const srcs = [...new Set([ogImage(html, url), ...rasters(content), ...fromArticles.flat()].filter(Boolean))].slice(0, maxImages)
      const images = await mapLimit(srcs, 4, async src => ({ src, ...(await imageSize(src)) }))
      return {
        name,
        url,
        date: release?.date ?? articleDate ?? (year ? `${year}-01-01` : null),
        images: images.filter(i => i.width && i.height),
      }
    })
  },
}
