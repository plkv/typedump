import { fetchText, mapLimit } from '../../discover/lib.mjs'

// Lineto's site is Nuxt; every page carries its whole store as a devalue
// payload in __NUXT_DATA__. The typefaces index links one page per retail
// family (Akkurat and Akkurat Mono are sold and shown apart); ?set= links are
// the same page in another script. A typeface page is a live specimen built
// from a template of boxes, mostly type set in the webfonts; some boxes hold
// uploaded pictures, which carry their size. The page's og:image is a capture
// of the specimen's first screen rendered by the site itself, so every family
// gets at least that picture of its type.
//
// The family record has a releaseDate for the families launched since about
// 2020 (to the day); a re-mastered older family carries the date of its
// re-release there. The credits under About state the year the foundry gives:
// "released by Lineto in 2024", or the design year as "Designed by … (2004)".
// The record's date counts when it falls in that year; otherwise the year
// alone, as 1 January.
const SITE = 'https://lineto.com'
const RASTER = /^image\/(png|jpeg|gif|webp)$/

// Nuxt serialises its state with devalue: a flat array where objects and
// arrays hold indices into it, and wrappers like ["Reactive", i] mark refs.
function payload(html) {
  const raw = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)[1]
  const data = JSON.parse(raw)
  const memo = new Map()
  const hydrate = i => {
    if (i < 0) return undefined
    if (memo.has(i)) return memo.get(i)
    const v = data[i]
    if (Array.isArray(v)) {
      if (['Reactive', 'ShallowReactive', 'Ref', 'ShallowRef'].includes(v[0])) return hydrate(v[1])
      if (v[0] === 'Set') return v.slice(1).map(hydrate)
      if (typeof v[0] === 'string') return null
      const out = []
      memo.set(i, out)
      for (const x of v) out.push(hydrate(x))
      return out
    }
    if (v && typeof v === 'object') {
      const out = {}
      memo.set(i, out)
      for (const [k, x] of Object.entries(v)) out[k] = hydrate(x)
      return out
    }
    return v
  }
  return hydrate(0)
}

function boxFiles(boxes = []) {
  return boxes.flatMap(b => [...(b.files || []), ...boxFiles(b.boxes)])
}

// "(2022–26)" is a design period; its last year is the release.
function releaseDate(family, credits) {
  const text = credits.replace(/<[^>]+>/g, '')
  const released = text.match(/(?:released|published)[^.]*?\b((?:19|20)\d\d)\b/i)
  const period = text.match(/\(((?:19|20)\d\d)(?:\s*[–-]\s*(\d{2,4}))?\)/)
  const year = released?.[1] ?? (period && (period[2] ? period[1].slice(0, 4 - period[2].length) + period[2] : period[1]))
  if (!year) return family.releaseDate
  return family.releaseDate?.startsWith(year) ? family.releaseDate : `${year}-01-01`
}

function capture(html) {
  const meta = name => html.match(new RegExp(`<meta property="og:image${name}" content="([^"]+)"`))?.[1]
  const [src, width, height] = [meta(''), meta(':width'), meta(':height')]
  return src && width && height ? [{ src: src.replace(/&amp;/g, '&'), width: +width, height: +height }] : []
}

export default {
  id: 'lineto',
  label: 'Lineto',
  url: SITE,
  async run({ maxImages }) {
    const index = await fetchText(`${SITE}/typefaces`)
    const slugs = [...new Set([...index.matchAll(/href="\/typefaces\/([^"?]+)"/g)].map(m => m[1]))]
    return mapLimit(slugs, 4, async slug => {
      const url = `${SITE}/typefaces/${slug}`
      const html = await fetchText(url)
      const { font, specimen } = payload(html).pinia
      const [id, details] = Object.entries(font.fontFamilyDetails)[0]
      const family = font.fontFamilies.find(f => String(f.id) === id)
      const template = specimen.specimenTemplates[family.specimenTemplateId] || {}
      const files = boxFiles([...(template.titleBoxes || []), ...(template.fontFamilyBoxes || []), ...(template.fontCutBoxes || [])])
        .filter(f => RASTER.test(f.type) && f.width && f.height)
      const seen = new Set()
      return {
        name: family.name,
        url,
        date: releaseDate(family, details.about?.credits?.text || ''),
        images: [
          ...capture(html),
          ...files.filter(f => !seen.has(f.key) && seen.add(f.key)).map(f => ({ src: f.url, width: f.width, height: f.height })),
        ].slice(0, maxImages),
      }
    })
  },
}
