import { fetchText, mapLimit, parseSitemap } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// Contrast Foundry's site is Next.js rendered on the server; each typeface page
// carries its whole record in __NEXT_DATA__. The sitemap is the only list of
// every typeface (the homepage shows a selection). Script versions of CoFo Sans
// Pro have pages of their own and are skipped. A page's pictures are its
// "in use" gallery, originals on S3 with no sized variants, mostly WebP. A few
// gallery entries point at files S3 refuses; their size can't be read and they
// drop out.
//
// The record states only the year (year_create). The files on S3 carry the
// date they were uploaded, and the earliest upload in that year dates a family
// released since the site went up to within days. The 2020 move to this site
// re-uploaded the older families' files on a couple of days; a day on which
// several families were uploaded says nothing about any of them and is skipped.
// A family with no upload left in its year gets 1 January.
const SITE = 'https://contrastfoundry.com'
const SCRIPTS = /\s(Arabic|Armenian|Cyrillic|Devanagari|Georgian|Greek|Hebrew|Latin)$/
const BULK = 3 // families uploaded on one day that make it a migration

function record(html) {
  const data = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s)
  return data && JSON.parse(data[1]).props.pageProps.fontData
}

async function uploaded(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15000) })
    const stamp = res.ok && res.headers.get('last-modified')
    return stamp ? new Date(stamp).toISOString().slice(0, 10) : null
  } catch {
    return null
  }
}

// The specimen, the variable font and one file per style were uploaded with
// the family; gallery pictures are often added later.
function files(f) {
  return [
    ...(f.in_use_images_urls || []).map(i => i.url),
    f.specimen_url?.file_url,
    f.variable_font?.file_url,
    ...(f.font_styles || []).map(s => s.licenses?.[0]?.files?.[0]?.url),
  ].filter(Boolean)
}

export default {
  id: 'contrast-foundry',
  label: 'Contrast Foundry',
  url: SITE,
  async run({ maxImages }) {
    const slugs = parseSitemap(await fetchText(`${SITE}/sitemap.xml`))
      .map(e => (e.loc.match(/^https:\/\/contrastfoundry\.com\/typeface\/([^/?#]+)$/) || [])[1])
      .filter(Boolean)
    const records = (await mapLimit([...new Set(slugs)], 4, async slug => record(await fetchText(`${SITE}/typeface/${slug}`)))).filter(Boolean)
    const names = new Set(records.map(f => f.name))
    const families = records.filter(f => !(SCRIPTS.test(f.name) && names.has(f.name.replace(SCRIPTS, ''))))

    const rows = await mapLimit(families, 4, async f => {
      const srcs = [...new Set((f.in_use_images_urls || []).map(i => i.url))].slice(0, maxImages)
      const images = await mapLimit(srcs, 4, async src => ({ src, ...(await imageSize(src)) }))
      const stamps = (await mapLimit(files(f), 4, uploaded)).filter(Boolean)
      return { f, images: images.filter(i => i.width && i.height), stamps: [...new Set(stamps)] }
    })

    const perDay = new Map()
    for (const { f, stamps } of rows) for (const day of stamps) perDay.set(day, (perDay.get(day) || 0) + 1)

    return rows.map(({ f, images, stamps }) => {
      const year = f.year_create && String(f.year_create)
      const own = stamps.filter(d => d.startsWith(year) && perDay.get(d) < BULK).sort()
      return {
        name: f.name,
        url: `${SITE}/typeface/${f.slug}`,
        date: year ? own[0] || `${year}-01-01` : null,
        images,
      }
    })
  },
}
