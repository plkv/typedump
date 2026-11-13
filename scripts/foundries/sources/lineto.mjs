import { fetchText, mapLimit } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// Lineto's site is Nuxt; every page carries its whole store as a devalue
// payload in __NUXT_DATA__. The typefaces index links one page per retail
// family (Akkurat and Akkurat Mono are sold and shown apart); ?set= links are
// the same page in another script. A typeface page is a live specimen built
// from a template of boxes, mostly type set in the webfonts. Other boxes hold
// uploads: a box holds one in `file` or several in `files`, and a box can nest
// boxes. Most uploads are outlined SVG specimens (Akkurat, Brown, Le Corbusier
// have nothing else); the rest are photos, MP4 loops and HTML toys, which
// show no picture. A box targeted at mobile often repeats a desktop one in
// another crop, but some hold pictures of their own (Tabletten's GIFs), so
// they follow the rest. Sizes come with the upload, but not always.
//
// The page's og:image is a capture of the specimen's first screen rendered by
// the site itself, so every family gets at least that picture of its type. The
// same service renders the family's technical tab (waterfall and character
// set); it closes the list, so families told in video or HTML (Geigy, Cyan,
// Prisma) still get a second picture of their own type. The journal's few
// articles are histories of the sources, and the "tomorrow" cards on the page
// are other families', so neither is read.
//
// The family record has a releaseDate for the families launched since about
// 2020 (to the day); a re-mastered older family carries the date of its
// re-release there. The credits under About state the year the foundry gives:
// "released by Lineto in 2024", or the design year as "Designed by … (2004)".
// The record's date counts when it falls in that year; otherwise the year
// alone, as 1 January.
const SITE = 'https://lineto.com'
const PICTURE = /^image\/(png|jpeg|gif|webp|svg\+xml)$/

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

// The uploads of the boxes shown on mobile only, or of the others.
function boxFiles(boxes = [], mobile) {
  return boxes.flatMap(b => [
    ...((b.target === 'mobile') === mobile ? [...(b.file ? [b.file] : []), ...(b.files || [])] : []),
    ...boxFiles(b.boxes, mobile),
  ])
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

// The og:image capture, then the same capture of the technical tab.
function captures(html, family) {
  const meta = name => html.match(new RegExp(`<meta property="og:image${name}" content="([^"]+)"`))?.[1]
  const [src, width, height] = [meta(''), meta(':width'), meta(':height')]
  if (!src || !width || !height) return [[], []]
  const page = { src: src.replace(/&amp;/g, '&'), width: +width, height: +height }
  const technical = { ...page, src: page.src.replace(/(fullPath=[^&]+)/, '$1/technical') }
  return [[page], family.tabs?.showTechnical ? [technical] : []]
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
      const boxes = [...(template.titleBoxes || []), ...(template.fontFamilyBoxes || []), ...(template.fontCutBoxes || [])]
      // The same picture is often uploaded twice, once per side, under new keys.
      const seen = new Set()
      const files = [...boxFiles(boxes, false), ...boxFiles(boxes, true)]
        .filter(f => PICTURE.test(f.type) && !seen.has(`${f.name} ${f.size}`) && seen.add(`${f.name} ${f.size}`))
      // Unsized uploads are probed one at a time, keeping the run at four requests.
      const uploads = await mapLimit(files, 1, async f =>
        f.width && f.height ? { src: f.url, width: f.width, height: f.height } : { src: f.url, ...(await imageSize(f.url)) },
      )
      const [page, technical] = captures(html, family)
      return {
        name: family.name,
        url,
        date: releaseDate(family, details.about?.credits?.text || ''),
        images: [...page, ...uploads.filter(i => i.width), ...technical].slice(0, maxImages),
      }
    })
  },
}
