import { fetchText, mapLimit } from '../../discover/lib.mjs'

// Weltkern's site is Laravel + Inertia: every page carries its props as JSON in
// the data-page attribute of #app. The typefaces index lists the retail
// families; a family that has a Greek and Cyrillic edition names it as its
// language sibling (Lausanne → Lausanne Pan), which is listed too and skipped
// here. A family page holds its showcase cards, gallery, banner and content
// blocks (galleries, slideshows; merch "products" blocks are skipped), then the
// in-use posts that tag it, each with a cover and blocks of its own. Every
// picture comes with its original size; the ?width= params on the URLs are
// ignored by the server, which always returns the original file.
//
// The credits on a family page state the release: "Published on 21 03 21"
// (day, month, two-digit year) for the older ones, "Released by WELTKERN® in
// 2024" or "V1: Released by … in 2019" for the rest, whose earliest year is
// taken. Record IDs are UUIDv7, so they carry the time the record was created;
// the site moved here in February 2024, and for families added since, a
// creation date in the release year pins it to the day. Others get 1 January.
const SITE = 'https://weltkern.com'
const RASTER = /\.(jpe?g|png|gif|webp)$/i
const PICTURE_BLOCKS = new Set(['image', 'gallery', 'slideshow'])

function props(html) {
  const m = html.match(/<div id="app" data-page="([^"]*)"/)
  const json = m[1].replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  return JSON.parse(json).props
}

function blockPictures(blocks) {
  return (blocks || []).filter(b => PICTURE_BLOCKS.has(b.type)).flatMap(b => [b.image, ...(b.images || [])])
}

function pictures(t, uses) {
  const ownUses = uses.filter(u => (u.typefaces_uuids || []).includes(t.id))
  const all = [
    ...(t.images || []),
    ...(t.cards || []).map(c => c.config?.image),
    t.banner,
    ...blockPictures(t.blocks),
    ...ownUses.flatMap(u => [u.cover, ...blockPictures(u.blocks)]),
  ]
  const seen = new Set()
  return all
    .filter(i => i?.src && i.width && i.height)
    .map(i => ({ src: i.src.split('?')[0], width: i.width, height: i.height }))
    .filter(i => RASTER.test(i.src) && !seen.has(i.src) && seen.add(i.src))
}

function releaseDate(t) {
  const credits = (t.blocks || []).map(b => b.text?.text || '').join('\n')
  const published = credits.match(/Published on (\d\d) (\d\d) (\d\d)\b/)
  if (published) return `20${published[3]}-${published[2]}-${published[1]}`
  const years = credits
    .split('\n')
    .filter(line => /releas/i.test(line))
    .flatMap(line => line.match(/\b(?:19|20)\d\d\b/g) || [])
  if (!years.length) return null
  const year = String(Math.min(...years))
  const created = new Date(parseInt(t.id.replace(/-/g, '').slice(0, 12), 16)).toISOString().slice(0, 10)
  return created.startsWith(year) ? created : `${year}-01-01`
}

export default {
  id: 'weltkern',
  label: 'WELTKERN®',
  url: SITE,
  async run({ maxImages }) {
    const { typefaces } = props(await fetchText(`${SITE}/typefaces`))
    const siblings = new Set(typefaces.map(t => t.language_sibling?.url).filter(Boolean))
    const families = typefaces.filter(t => t.kind === 'family' && !siblings.has(t.url))
    return mapLimit(families, 4, async ({ url }) => {
      const page = props(await fetchText(url))
      const t = page.typeface
      return {
        name: t.title,
        url,
        date: releaseDate(t),
        images: pictures(t, page.font_in_uses || []).slice(0, maxImages),
      }
    })
  },
}
