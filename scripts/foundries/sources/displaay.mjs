import { fetchText, mapLimit } from '../../discover/lib.mjs'

// Displaay's site is React Router rendered on the server. Every page streams
// its loader data inline as a turbo-stream: one flat JSON array in which
// objects and arrays hold indexes into the array instead of values. The root
// loader lists every retail typeface with its release; custom work lives under
// /custom and is not in it.
//
// A typeface page is set in live text, so its only picture is the share card
// in its SEO record (2400×1260). The homepage adds an "in use" strip whose
// captions link the typeface each photo shows. Both come from the CMS with
// their size; the image host serves originals only.
//
// publishedAt is the release as the foundry entered it: the first of the month
// for older families, the day for those released since the 2025 relaunch.
const SITE = 'https://displaay.net'

function loaderData(html) {
  const stream = [...html.matchAll(/streamController\.enqueue\(("(?:[^"\\]|\\.)*")\)/g)]
    .map(m => JSON.parse(m[1]))
    .join('')
  const flat = JSON.parse(stream.split('\n')[0])
  const seen = new Map()
  const value = i => {
    if (i < 0) return null
    if (seen.has(i)) return seen.get(i)
    const v = flat[i]
    if (Array.isArray(v)) {
      // A string head marks a typed value: ["D", ms] is a Date.
      if (typeof v[0] === 'string') return v[0] === 'D' ? new Date(v[1]).toISOString() : null
      const out = []
      seen.set(i, out)
      for (const x of v) out.push(value(x))
      return out
    }
    if (v && typeof v === 'object') {
      const out = {}
      seen.set(i, out)
      for (const [k, x] of Object.entries(v)) out[flat[+k.slice(1)]] = value(x)
      return out
    }
    return v
  }
  return value(0).loaderData
}

function picture(image) {
  return image?.url && image.width && image.height ? { src: image.url, width: image.width, height: image.height } : null
}

export default {
  id: 'displaay',
  label: 'Displaay',
  url: SITE,
  async run({ maxImages }) {
    const home = loaderData(await fetchText(`${SITE}/`))
    const inUse = (home['routes/_index'].inUseData || []).filter(p => p.isVisible !== false)
    return mapLimit(home.root.basicTypefaces, 4, async t => {
      const url = new URL(t.link.url, SITE).href
      const page = loaderData(await fetchText(url))['routes/typeface'].typeface
      const photos = inUse.filter(p => (p.description || '').includes(`"href":"${t.link.url}"`))
      const seen = new Set()
      return {
        name: t.name,
        url,
        date: t.publishedAt ? t.publishedAt.slice(0, 10) : null,
        images: [page.seo?.image, ...photos.map(p => p.image)]
          .map(picture)
          .filter(i => i && !seen.has(i.src) && seen.add(i.src))
          .slice(0, maxImages),
      }
    })
  },
}
