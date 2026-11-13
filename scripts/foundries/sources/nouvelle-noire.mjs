import { fetchJSON, fetchText, mapLimit } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// Nouvelle Noire's site is WordPress with WooCommerce. Every weight is a product
// of its own; the family product that bundles them sits in the font_package
// category, which the public Store API filters on. A family page opens with a
// row of header pictures, each an <img> with a WordPress srcset; content images
// in the description carry a wp-image class. Other <img> tags are the PDF and
// social icons. Families from before 2020 mostly have no pictures at all.
//
// A page's information table states "Release: 2023" (or "2010–11", where the
// first year counts). The product's WordPress post date falls in that year for
// families launched since the 2017 site, and gives the day; for older ones, and
// where the post was made a year later, the date is 1 January of the release
// year.
const SITE = 'https://nouvellenoire.ch'
const STORE = `${SITE}/wp-json/wc/store/v1/products`
const POSTS = `${SITE}/wp-json/wp/v2/product`
const RASTER = /\.(jpe?g|png|gif|webp)$/i

function best(srcset) {
  const candidates = srcset
    .split(',')
    .map(c => c.trim().split(/\s+/))
    .map(([src, w]) => ({ src, w: parseInt(w) || 0 }))
    .sort((a, b) => a.w - b.w)
  return (
    candidates.filter(c => c.w >= 1200 && c.w <= 1600).pop() ||
    candidates.find(c => c.w > 1600) ||
    candidates.pop()
  ).src
}

// WordPress names resized copies name-WxH.ext and big originals name-scaled.ext.
const original = src => src.replace(/-(\d+x\d+|scaled)(\.\w+)$/, '$2')

function pictures(html) {
  const seen = new Set()
  return [...html.matchAll(/<img\b[^>]*>/g)]
    .map(m => m[0])
    .map(tag => {
      const srcset = (tag.match(/\ssrcset="([^"]+)"/) || [])[1]
      if (srcset) return best(srcset)
      return /class="[^"]*wp-image-\d+/.test(tag) ? (tag.match(/\ssrc="([^"]+)"/) || [])[1] : null
    })
    .filter(src => src && RASTER.test(src))
    .filter(src => !seen.has(original(src)) && seen.add(original(src)))
}

async function sized(src) {
  const m = src.match(/-(\d+)x(\d+)\.\w+$/)
  return m ? { src, width: +m[1], height: +m[2] } : { src, ...(await imageSize(src)) }
}

function releaseDate(html, posted) {
  const year = (html.match(/Release:\s*<\/div>\s*<div[^>]*>\s*(?:<p>)?\s*(\d{4})/) || [])[1]
  if (!year) return posted?.slice(0, 10) ?? null
  return posted?.startsWith(year) ? posted.slice(0, 10) : `${year}-01-01`
}

export default {
  id: 'nouvelle-noire',
  label: 'Nouvelle Noire',
  url: SITE,
  async run({ maxImages }) {
    const families = await fetchJSON(`${STORE}?category=font_package&per_page=100`)
    const posts = await fetchJSON(`${POSTS}?include=${families.map(f => f.id).join(',')}&per_page=100&_fields=id,date`)
    const posted = new Map(posts.map(p => [p.id, p.date]))
    return mapLimit(families, 4, async f => {
      const html = await fetchText(f.permalink)
      const srcs = pictures(html).slice(0, maxImages)
      return {
        name: f.name,
        url: f.permalink,
        date: releaseDate(html, posted.get(f.id)),
        images: (await mapLimit(srcs, 4, sized)).filter(i => i?.width && i?.height),
      }
    })
  },
}
