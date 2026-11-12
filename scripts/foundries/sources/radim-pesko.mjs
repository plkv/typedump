import { fetchText, mapLimit } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// Radim Peško's site is a server-rendered Rails app from 2010. A typeface page
// holds a live text preview and little else: icons linking to the projects it
// was used in (/work/…, one photograph each, sized in the markup). The pictures
// live in the news posts, which the RSS feed lists. A post belongs to a family
// when its title names it (the release posts) or its text links to the family
// page (the in-use posts). The image store keeps only an original and a 200px
// thumb; the same file is often uploaded several times under new ids, so
// pictures are deduped by file name.
//
// Release posts carry a credits block with "Release: February 2014", which
// dates a family to the month (a bare year becomes YYYY-01-01). Where no block
// names the family, the date of the first post titled with it stands in: the
// day that release was announced, which for families from the 2010 launch
// library is a later re-release (Fugue redrawn, F Grotesk Thin). Families with
// neither get null. The family list is the menu on the home page, minus the
// commissions whose page says they are not available for licensing.
const SITE = 'https://radimpesko.com'

const ENTITIES = { amp: '&', nbsp: ' ', lt: '<', gt: '>', quot: '"', apos: "'" }

function text(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&([a-z]+);/g, (m, e) => ENTITIES[e] ?? m)
    .trim()
}

function words(s) {
  return ` ${s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()} `
}

function fileName(src) {
  return src.split('?')[0].split('/').pop()
}

async function post(link) {
  const html = await fetchText(link)
  const item = html.match(/<li class='news_item selected'.*?<\/li>/s)?.[0] || ''
  const [, d, m, y] = item.match(/<p class='date'>\s*(\d\d)\/(\d\d)\/(\d{4})/) || []
  const releases = [...item.matchAll(/<p>((?:(?!<\/p>).)*Release:(?:(?!<\/p>).)*)<\/p>/gs)].map(([, p]) => {
    const names = text(p.split(/<br\s*\/?>/)[0].replace(/^Name:/, '')).split(/,|&| and /)
    const [, month, year] = text(p).match(/Release:\s*(?:([A-Z][a-z]+)\s+)?(\d{4})/) || []
    const mm = month ? String(new Date(`${month} 1, 2000`).getMonth() + 1).padStart(2, '0') : '01'
    return { names: names.map(words), date: year && mm !== 'NaN' ? `${year}-${mm}-01` : null }
  })
  const gallery = html.match(/<ul class='news_item_images'>(.*?)<\/ul>/s)?.[1] || ''
  return {
    date: y ? `${y}-${m}-${d}` : null,
    title: words(text(item.match(/<p class='title'>(.*?)<\/p>/s)?.[1] || '')),
    slugs: new Set([...item.matchAll(/\/fonts\/([a-z0-9-]+)/g)].map(m => m[1])),
    releases,
    images: [...gallery.matchAll(/src="([^"]+)"/g)].map(m => new URL(m[1], SITE).href),
  }
}

async function project(path) {
  const html = await fetchText(`${SITE}${path}`)
  const img = html.match(/<img[^>]+height="(\d+)"[^>]+src="(\/system\/photos\/[^"]+)"[^>]+width="(\d+)"/)
  return img ? [{ src: `${SITE}${img[2]}`, width: +img[3], height: +img[1] }] : []
}

export default {
  id: 'radim-pesko',
  label: 'Radim Peško',
  url: SITE,
  async run({ maxImages }) {
    const home = await fetchText(SITE)
    const slugs = [...new Set([...home.matchAll(/<li class='family'[^>]*>\s*<a href="\/fonts\/([^"]+)"/g)].map(m => m[1]))]
    const rss = await fetchText(`${SITE}/news.xml`)
    const links = [...new Set([...rss.matchAll(/<link>(https:\/\/radimpesko\.com\/news\/\d+)<\/link>/g)].map(m => m[1]))]
    const posts = (await mapLimit(links, 4, post)).filter(Boolean).sort((a, b) => (a.date < b.date ? -1 : 1))

    const families = await mapLimit(slugs, 4, async slug => {
      const url = `${SITE}/fonts/${slug}`
      const html = await fetchText(url)
      const about = text(html.match(/<div class='description'>(.*?)<\/div>/s)?.[1] || '')
      if (/not available for (licensing|purchase)/i.test(about)) return null
      const name = text(html.match(/<div class='inside'>\s*([^<]+?)\s*<\/div>/)?.[1] || '')
      const key = words(name)
      const titled = posts.filter(p => p.title.includes(key))
      const linked = posts.filter(p => !titled.includes(p) && p.slugs.has(slug))
      const release = posts.flatMap(p => p.releases).find(r => r.date && r.names.includes(key))
      const work = [...new Set([...html.matchAll(/<li class='project'.*?href="(\/work\/[^"]+)"/gs)].map(m => m[1]))]
      return { name, url, date: release?.date ?? titled[0]?.date ?? null, titled, linked, work }
    })

    return mapLimit(families.filter(Boolean), 4, async ({ titled, linked, work, ...family }) => {
      const pictures = [
        ...titled.flatMap(p => p.images).map(src => ({ src })),
        ...(await mapLimit(work, 4, project)).flat().filter(Boolean),
        ...linked.flatMap(p => p.images).map(src => ({ src })),
      ]
      const seen = new Set()
      const unique = pictures.filter(p => !seen.has(fileName(p.src)) && seen.add(fileName(p.src))).slice(0, maxImages)
      return {
        ...family,
        images: await mapLimit(unique, 4, async img => (img.width ? img : { ...img, ...(await imageSize(img.src)) })),
      }
    })
  },
}
