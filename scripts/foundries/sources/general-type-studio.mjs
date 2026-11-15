import { fetchText } from '../../discover/lib.mjs'
import { fontdueCreated } from '../lib.mjs'

// General Type Studio's site is Fontdue's own template, and its GraphQL API is
// public. A typeface page is all live text in the webfont; the pictures are on
// the home page, a grid of specimens drawn inline as SVG outlines, each linked
// to its typeface (/fonts/<slug>). An SVG goes out as a data URI. The grid is
// shuffled on every request, so a face's specimens are put in a fixed order
// by their content, and the feed does not change from day to day. The shop's
// collections give the names; their children (Cambon Narrow, Mier A) are
// widths and versions sold within a family, and stay out.
//
// No collection states a year. The day its Fontdue record was created is the
// release: Aro's is 6 June 2023, released June 2023 per Fonts In Use. Mier,
// Cambon and Pilat date from the shop's opening in June 2018.
const SITE = 'https://www.generaltypestudio.com'
const FONTDUE = 'https://generaltype.fontdue.com/graphql'

const COLLECTIONS = `{ viewer { fontCollections(first: 100) { edges { node {
  id name visibility parent { id } slug { name }
} } } } }`

async function collections() {
  const res = await fetch(FONTDUE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: COLLECTIONS }),
    signal: AbortSignal.timeout(25000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const { data, errors } = await res.json()
  if (errors) throw new Error(errors[0].message)
  return data.viewer.fontCollections.edges.map(e => e.node).filter(c => !c.parent && c.slug && c.visibility === 'VISIBLE')
}

function specimen(svg) {
  const [width, height] = (svg.match(/viewBox="[\d.-]+[\s,]+[\d.-]+[\s,]+([\d.]+)[\s,]+([\d.]+)"/) || []).slice(1).map(Number)
  return { src: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`, width: Math.round(width), height: Math.round(height) }
}

export default {
  id: 'general-type-studio',
  label: 'General Type Studio',
  url: SITE,
  async run({ maxImages }) {
    const [home, families] = await Promise.all([fetchText(SITE), collections()])
    const bySlug = new Map()
    for (const [, slug, item] of home.matchAll(/<a class="home__item" href="\/fonts\/([^"]+)">([\s\S]*?)<\/a>/g)) {
      const svg = item.match(/<svg\b[\s\S]*?<\/svg>/)?.[0]
      if (svg) bySlug.set(slug, [...(bySlug.get(slug) || []), specimen(svg)])
    }
    return families.map(c => ({
      name: c.name,
      url: `${SITE}/fonts/${c.slug.name}`,
      date: fontdueCreated(c.id),
      images: (bySlug.get(c.slug.name) || [])
        .filter(i => i.width)
        .sort((a, b) => (a.src < b.src ? -1 : 1))
        .slice(0, maxImages),
    }))
  },
}
