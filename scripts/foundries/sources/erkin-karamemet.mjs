import { fetchJSON } from '../../discover/lib.mjs'

// Erkin Karamemet's site is WordPress with the Lay theme, which renders each
// post in the browser from a grid stored on the post; the REST API returns that
// grid as JSON, with every image cell's file and size, in page order. The
// specimens are SVG outlines of set type. The "typeface" category also holds the
// families Erkin drew for Dinamo, tagged "dinamo", and an early one with no tag;
// the foundry's own releases are tagged "ek" (or "ek-" plus a co-designer).
const SITE = 'https://erkinkaramemet.com'
const API = `${SITE}/wp-json/wp/v2`

const ENTITIES = { amp: '&', nbsp: ' ', lt: '<', gt: '>', quot: '"', apos: "'" }

function text(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&([a-z]+);/g, (m, e) => ENTITIES[e] ?? m)
    .trim()
}

function cells(node, out = []) {
  if (Array.isArray(node)) node.forEach(n => cells(n, out))
  else if (node && typeof node === 'object') {
    if (node.type === 'img' && node.cont) out.push(node)
    else Object.values(node).forEach(n => cells(n, out))
  }
  return out
}

export default {
  id: 'erkin-karamemet',
  label: 'Erkin Karamemet',
  url: SITE,
  async run({ maxImages }) {
    const [category] = await fetchJSON(`${API}/categories?slug=typeface`)
    const tags = await fetchJSON(`${API}/tags?per_page=100&_fields=id,slug`)
    const own = new Set(tags.filter(t => /^ek(-|$)/.test(t.slug)).map(t => t.id))
    const posts = await fetchJSON(`${API}/posts?categories=${category.id}&per_page=100&_fields=slug,date,title,link,tags,grid`)

    return posts
      .filter(p => p.tags.some(t => own.has(t)))
      .map(p => {
        const seen = new Set()
        const specimens = cells(JSON.parse(p.grid).cont)
          .filter(c => c.w && c.h && !seen.has(c.cont) && seen.add(c.cont))
          .slice(0, maxImages)
        return {
          name: text(p.title.rendered),
          url: p.link,
          date: p.date.slice(0, 10),
          images: specimens.map(c => ({ src: new URL(c.cont, SITE).href, width: +c.w, height: +c.h })),
        }
      })
  },
}
