import { fetchText, mapLimit } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// type.today is a Next.js shop selling many foundries' faces. Every page embeds
// the whole store in __NEXT_DATA__ (about 10 MB, 0.8 MB gzipped): the home page
// lists all fonts with their year and collection, and a font page adds the
// journal posts about it. One row per collection (a family sold in several
// widths), else per font, newest year first and in the shop's own order within
// it. The pictures and the day come from the "New typeface: …" post, whose
// body is a run of specimen images; a face without one has only its share card,
// a template with the name in a corner, and is left out. The designer line sometimes opens with a Cyrillic В for the
// B of "By". robots.txt asks for two seconds between requests and keeps
// /api/ off limits, so the pages are read one at a time.
const SITE = 'https://type.today'
const CANDIDATES = 32
const DELAY = 2000

const ENTITIES = { amp: '&', nbsp: ' ', lt: '<', gt: '>', quot: '"', apos: "'" }

function text(s) {
  return s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&([a-z]+);/g, (m, e) => ENTITIES[e] ?? m).trim()
}

function state(html) {
  const json = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s)?.[1]
  if (!json) throw new Error('no __NEXT_DATA__')
  return JSON.parse(json).props.initialState
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

export default {
  id: 'type-today',
  label: 'type.today',
  url: SITE,
  async run({ maxImages }) {
    const { fonts, font_collections } = state(await fetchText(`${SITE}/en`, { timeout: 60000 }))
    const collections = new Map(Object.values(font_collections.models).map(c => [c.id, c.attributes]))
    const live = Object.values(fonts.models)
      .filter(m => !m.attributes.archived)
      .sort((a, b) => (b.attributes.year || 0) - (a.attributes.year || 0) || a.attributes.priority - b.attributes.priority)

    const groups = new Map()
    for (const m of live) {
      const key = m.relationships.font_collection?.data?.id ?? `font:${m.attributes.slug}`
      if (!groups.has(key)) groups.set(key, { key, fonts: [] })
      groups.get(key).fonts.push(m)
    }

    const rows = []
    for (const { key, fonts: members } of [...groups.values()].slice(0, CANDIDATES)) {
      const font = members[0].attributes
      const collection = collections.get(key)
      if (rows.length) await sleep(DELAY)
      const full = state(await fetchText(`${SITE}/en/${font.slug}`, { timeout: 60000 })).fonts.fullModels[font.slug]
      const release = (full?.posts || []).map(p => p.attributes).find(p => /^New typefaces?:/i.test(p.title))
      const srcs = release ? [...release.body.matchAll(/<img[^>]+src="([^"]+)"/g)].map(m => m[1]) : []
      const designer = font.share_description?.replace(/^[BВ]y\s+/i, '')
      const name = text(collection?.title.replace(/\s+Collection$/, '') || font.title)
      rows.push({
        name: designer ? `${name} by ${designer}` : name,
        url: collection ? `${SITE}/en/collection/${collection.slug}` : `${SITE}/en/${font.slug}`,
        date: release?.date ?? null,
        images: (await mapLimit([...new Set(srcs)].slice(0, maxImages), 4, async src => ({ src, ...(await imageSize(src)) }))).filter(i => i.width),
      })
    }
    return rows
  },
}
