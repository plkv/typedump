import { normName } from '../../discover/lib.mjs'

// Giulia Boggio's site is Next.js over Fontdue, whose GraphQL API is public.
// The shop lists the top-level collections (families and superfamilies); their
// children are the members of a superfamily and are not listed on their own.
// A collection's pictures are the specimen gallery of its page, in page order,
// with their original size; Fontdue's image resizer serves them at a set width.
// The "Fonts In Use" page reads a public Hygraph dataset whose entries name the
// typefaces they show. It also covers typefaces sold elsewhere, so an entry
// counts only when it names a family of the shop.
//
// Each family states a design year ("2021", or a span whose first year is the
// release). Fontdue IDs carry the time the record was created (milliseconds
// since its epoch, shifted left 23 bits, which the image upload stamps confirm),
// so the creation date counts when it falls in the design year and pins the
// release to the day; otherwise the family gets 1 January of that year.
const SITE = 'https://www.giuliaboggio.xyz'
const FONTDUE = 'https://giulia-b.fontdue.com/graphql'
const HYGRAPH = 'https://eu-west-2.cdn.hygraph.com/content/cmn1jn5bc01sd07w1xn8cj1af/master'
const FONTDUE_EPOCH = 1506968000000
const WIDTH = 1400

const COLLECTIONS = `{ viewer { fontCollections(first: 100) { edges { node {
  id name designYear visibility parent { id } slug { name }
  images { url(width: ${WIDTH}) original: url meta { width height mimeType } }
} } } } }`

// Hygraph converts AVIF and WebP uploads to JPEG on request.
const IN_USE = `{ fontsOrders {
  order(first: 100) { ...use }
  order2(first: 100) { ...use }
} }
fragment use on FontInUse {
  fonts { name }
  thumbnail { width height url(transformation: { image: { resize: { width: ${WIDTH}, fit: max } }, document: { output: { format: jpg } } }) }
}`

async function query(endpoint, q) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
    signal: AbortSignal.timeout(25000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const { data, errors } = await res.json()
  if (errors) throw new Error(errors[0].message)
  return data
}

function scaled(src, w, h) {
  const width = Math.min(w, WIDTH)
  return { src, width, height: Math.round((h * width) / w) }
}

// GIFs keep their original file: the resizer would flatten the animation.
function specimen({ url, original, meta }) {
  if (meta.mimeType === 'image/gif') return { src: original, width: meta.width, height: meta.height }
  return scaled(url, meta.width, meta.height)
}

function releaseDate({ id, designYear }) {
  const year = ((designYear || '').replace(/[^\d-]/g, '').match(/\d{4}/) || [])[0]
  if (!year) return null
  const ms = BigInt(Buffer.from(id, 'base64').toString().split(':')[1]) >> 23n
  const created = new Date(FONTDUE_EPOCH + Number(ms)).toISOString().slice(0, 10)
  return created.startsWith(year) ? created : `${year}-01-01`
}

export default {
  id: 'giulia-boggio',
  label: 'Giulia Boggio',
  url: SITE,
  async run({ maxImages }) {
    const [{ viewer }, inUse] = await Promise.all([
      query(FONTDUE, COLLECTIONS),
      query(HYGRAPH, IN_USE).catch(() => ({ fontsOrders: [] })),
    ])
    const uses = inUse.fontsOrders.flatMap(o => [...(o.order || []), ...(o.order2 || [])]).filter(u => u.thumbnail)
    return viewer.fontCollections.edges
      .map(e => e.node)
      .filter(c => !c.parent && c.slug && c.visibility === 'VISIBLE')
      .map(c => {
        const photos = uses
          .filter(u => u.fonts.some(f => normName(f.name) === normName(c.name)))
          .map(u => scaled(u.thumbnail.url, u.thumbnail.width, u.thumbnail.height))
        const seen = new Set()
        return {
          name: c.name,
          url: `${SITE}/fonts/${c.slug.name}`,
          date: releaseDate(c),
          images: [...c.images.map(specimen), ...photos]
            .filter(i => !seen.has(i.src) && seen.add(i.src))
            .slice(0, maxImages),
        }
      })
  },
}
