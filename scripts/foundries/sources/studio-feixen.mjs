import { fetchJSON, fetchText, mapLimit } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// Studio Feixen sells its fonts on fonts.studiofeixen.ch, a WordPress site with
// Easy Digital Downloads; the studio site at studiofeixen.ch shows commissions
// only. Each typeface has a minisite page ("Minisite – Noi Grotesk") built on
// its own template, and each family sold has a download category
// (studio-feixen-sans, noi-grotesk). A minisite counts once a category is named
// after it: the Mag minisite is a placeholder for a family not on sale yet.
// Serif, Edgy and Writer are part of the Studio Feixen Sans minisite.
//
// Minisites are built from Lottie animations and videos. Their raster pictures
// are the specimen cover in the "book" block and, in the mobile footer, the
// specimen thumbnail of each family, its own among them; the rest are site UI
// GIFs and icons. So a family has one or two pictures.
//
// The release date is the earlier of the minisite page's date and the first
// product in the family's category (EDD's public products API): products date
// the older families (Studio Feixen Sans 2019, Noi Grotesk 2021), the minisite
// the newer ones, whose products were recreated after launch.
const SITE = 'https://fonts.studiofeixen.ch'
const RASTER = /(?:data-lazy-src|src)="(https:[^"]+\.(?:jpe?g|png|gif|webp))"/

function firstRasterAfter(html, marker) {
  const at = html.search(marker)
  if (at < 0) return null
  return (html.slice(at).match(RASTER) || [])[1] || null
}

function ownThumb(html, slug) {
  const keys = slug.split('-')
  const block = [...html.matchAll(/class="mobilecontent mobilespecimen(\w+) mobile"/g)].find(m => keys.includes(m[1]))
  return block ? firstRasterAfter(html.slice(block.index), /mobilespecimen/) : null
}

function decode(text) {
  return text.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).replace(/&amp;/g, '&')
}

export default {
  id: 'studio-feixen',
  label: 'Studio Feixen',
  url: 'https://www.studiofeixen.ch',
  async run({ maxImages }) {
    const [pages, edd] = await Promise.all([
      fetchJSON(`${SITE}/wp-json/wp/v2/pages?per_page=100&_fields=slug,title,date,link,template`),
      fetchJSON(`${SITE}/edd-api/products/?number=-1`, { timeout: 60000 }),
    ])
    const firstSale = new Map()
    for (const { info } of edd.products) {
      for (const c of info.category || []) {
        const date = info.create_date.slice(0, 10)
        if (!firstSale.has(c.slug) || date < firstSale.get(c.slug)) firstSale.set(c.slug, date)
      }
    }
    const minisites = pages
      .filter(p => /^minisite-/.test(p.template))
      .map(p => ({ ...p, category: [...firstSale.keys()].find(c => c === p.slug || c.endsWith(`-${p.slug}`)) }))
      .filter(p => p.category)
    return mapLimit(minisites, 2, async ({ slug, title, date, link, category }) => {
      const html = await fetchText(link)
      const srcs = [...new Set([firstRasterAfter(html, /class="book item-\d+"/), ownThumb(html, slug)].filter(Boolean))]
      const images = await mapLimit(srcs.slice(0, maxImages), 2, async src => ({ src, ...(await imageSize(src)) }))
      const sale = firstSale.get(category)
      return {
        name: decode(title.rendered).replace(/^Minisite\s*[–—-]\s*/, '').trim(),
        url: link.replace(/\/$/, ''),
        date: [date.slice(0, 10), sale].sort()[0],
        images: images.filter(i => i.width),
      }
    })
  },
}
