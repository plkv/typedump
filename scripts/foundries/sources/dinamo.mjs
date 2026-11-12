import { fetchText, mapLimit, normName } from '../../discover/lib.mjs'

// Dinamo's site is server-rendered (Craft). The catalogue's typeface panel
// lists the retail families; its "Latest Releases" menu adds the betas still
// being unlocked. A typeface page is a long run of <picture> elements served by
// an image handler whose URL is base64 JSON naming the file, the resize and a
// version stamp. Teasers for news posts sit in the same markup under
// basic-teaser; their thumbnails are skipped and the posts read instead.
//
// Nothing on the site states a release date. The version stamp is when a file
// was uploaded, so the earliest stamp in the typeface's own media folder
// (media/Typefaces/Camera-Rounded/ for camera-rounded) dates it to within weeks.
// Families from before the 2020 relaunch all land around then.
const SITE = 'https://abcdinamo.com'
const IMG = 'https://img.abcdinamo.com/'
const WIDTH = 1200

function decode(url) {
  if (!url.startsWith(IMG)) return null
  try {
    return JSON.parse(Buffer.from(url.slice(IMG.length), 'base64').toString())
  } catch {
    return null
  }
}

function resized(payload) {
  const edits = { ...payload.edits, resize: { fit: 'contain', width: WIDTH } }
  return IMG + Buffer.from(JSON.stringify({ ...payload, edits })).toString('base64')
}

function slugs(html) {
  const panel = [...html.matchAll(/href="https:\/\/abcdinamo\.com\/typefaces\/([^"]+)" class="typeface-panel__item"/g)]
  const latest = html.slice(html.indexOf('Latest Releases'), html.indexOf('Show me everything'))
  const releases = [...latest.matchAll(/href="https:\/\/abcdinamo\.com\/typefaces\/([^"]+)"/g)]
  return [...new Set([...panel, ...releases].map(m => m[1]))]
}

// Pages for recent releases are set in live text with a single hero picture;
// the photographs are in the news post announcing the release, which the page
// links to as a teaser.
function newsLinks(html) {
  return [...new Set([...html.matchAll(/href="(https:\/\/abcdinamo\.com\/news\/[^"]+)" class="boxes__box basic-teaser/g)].map(m => m[1]))]
}

function pictures(html) {
  return [...html.matchAll(/<div\s+class="([^"]*media-box[^"]*)"[^>]*>\s*<picture.*?<\/picture>/gs)]
    .filter(m => !m[1].includes('basic-teaser'))
    .map(m => {
      const block = m[0]
      const candidates = [...block.matchAll(/srcset="([^"]+)"/g)]
        .flatMap(s => s[1].split(','))
        .map(c => c.trim().split(/\s+/))
        .map(([src, w]) => ({ src, w: parseInt(w) || 0 }))
      const best = candidates.sort((a, b) => b.w - a.w)[0]
      if (!best) return null
      const img = block.match(/<img[^>]+width="(\d+)"[^>]+height="(\d+)"/)
      const size = img ? { width: +img[1], height: +img[2] } : {}
      const payload = decode(best.src)
      return payload ? { src: resized(payload), payload, ...size } : { src: best.src, ...size }
    })
    .filter(Boolean)
}

// Every handler URL on the page counts, the hero's included, which is often the
// only picture filed under the typeface itself.
function releaseDate(slug, html) {
  const payloads = [...html.matchAll(/https:\/\/img\.abcdinamo\.com\/[A-Za-z0-9+/=]+/g)]
    .map(m => decode(m[0]))
    .filter(p => p?.version)
  const own = payloads.filter(p => {
    const folder = p.key.match(/^media\/Typefaces\/([^/]+)\//)
    return folder && normName(folder[1]).startsWith(normName(slug))
  })
  const stamps = (own.length ? own : payloads).map(p => p.version)
  return stamps.length ? new Date(Math.min(...stamps) * 1000).toISOString().slice(0, 10) : null
}

export default {
  id: 'dinamo',
  label: 'Dinamo',
  url: SITE,
  async run({ maxImages }) {
    const catalogue = await fetchText(`${SITE}/catalogue`)
    return mapLimit(slugs(catalogue), 4, async slug => {
      const url = `${SITE}/typefaces/${slug}`
      const html = await fetchText(url)
      const title = (html.match(/<title>([^<]+?)\s+—/) || [])[1]
      const posts = await mapLimit(newsLinks(html), 2, async link => pictures(await fetchText(link)))
      const pics = [...pictures(html), ...posts.flat()]
      const seen = new Set()
      return {
        name: `ABC ${title.trim()}`,
        url,
        date: releaseDate(slug, html),
        images: pics
          .filter(p => !seen.has(p.payload?.key ?? p.src) && seen.add(p.payload?.key ?? p.src))
          .slice(0, maxImages)
          .map(({ payload, ...img }) => img),
      }
    })
  },
}
