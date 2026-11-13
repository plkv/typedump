import { fetchJSON, fetchText, mapLimit } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// NaN's site is WordPress (WooCommerce) rendered on the server. The fonts index
// opens with a plain list of the retail families, then the free ones; a
// superfamily (NaN Rage) is listed once, its sub-families and the font pack are
// left to their own pages. A family page is a gallery of WordPress attachments,
// shown twice (desktop and mobile sliders), followed by tiles of the family's
// "in use" cases. Gallery files are originals up to 8000px wide, so their
// attachment IDs go to the REST media endpoint, which lists the sizes WordPress
// made of each; the in-use previews are plain uploads and are measured.
//
// Each family is a "font" post in the REST API, published when the family went
// on sale, so its date is the release to the day. Pictures are re-uploaded with
// each redesign and their dates say nothing.
const SITE = 'https://www.nan.xyz'
const API = `${SITE}/wp-json/wp/v2`
const WIDTH = 1200
const RASTER = /\/wp-content\/uploads\/[^?"]+\.(jpe?g|png|gif|webp)$/i

function families(html) {
  const list = html.slice(html.indexOf('<main'), html.indexOf('class="block-section'))
  const seen = new Set()
  return [...list.matchAll(/<a href="https:\/\/www\.nan\.xyz\/fonts\/([^"/]+)\/?">([^<]+)<\/a>/g)]
    .map(m => ({ slug: m[1], name: m[2].replace(/&shy;|­/g, '').replace(/&amp;/g, '&').trim() }))
    .filter(f => !seen.has(f.slug) && seen.add(f.slug))
}

// The smallest size at least WIDTH wide, else the original. GIFs stay
// original: WordPress resizes them to their first frame.
function sized(media) {
  const sizes = Object.values(media.media_details?.sizes || {})
  if (/\.gif$/i.test(media.source_url) || !sizes.length) {
    const { width, height } = media.media_details || {}
    return { src: media.source_url, width, height }
  }
  const pick = sizes.filter(s => s.width >= WIDTH).sort((a, b) => a.width - b.width)[0]
    || sizes.sort((a, b) => b.width - a.width)[0]
  return { src: pick.source_url, width: pick.width, height: pick.height }
}

async function pictures(html) {
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'))
  const tags = [...main.matchAll(/<img\b[^>]*>/g)].map(m => ({
    id: (m[0].match(/wp-image-(\d+)/) || [])[1],
    src: (m[0].match(/\ssrc="([^"]+)"/) || [])[1],
  })).filter(t => t.src && RASTER.test(t.src))
  const ids = [...new Set(tags.map(t => t.id).filter(Boolean))]
  const media = ids.length
    ? await fetchJSON(`${API}/media?include=${ids.join(',')}&per_page=100&_fields=id,source_url,media_details`)
    : []
  const byId = new Map(media.map(m => [String(m.id), m]))
  const seen = new Set()
  return tags
    .filter(t => !seen.has(t.id ?? t.src) && seen.add(t.id ?? t.src))
    .map(t => (byId.has(t.id) ? sized(byId.get(t.id)) : { src: t.src }))
}

export default {
  id: 'nan',
  label: 'NaN',
  url: SITE,
  async run({ maxImages }) {
    const [index, posts] = await Promise.all([
      fetchText(`${SITE}/fonts/`),
      fetchJSON(`${API}/font?per_page=100&_fields=slug,date`),
    ])
    const dates = new Map(posts.map(p => [p.slug, p.date.slice(0, 10)]))
    return mapLimit(families(index), 4, async ({ slug, name }) => {
      const url = `${SITE}/fonts/${slug}/`
      const pics = (await pictures(await fetchText(url))).slice(0, maxImages)
      const images = await mapLimit(pics, 4, async img => (img.width ? img : { ...img, ...(await imageSize(img.src)) }))
      return {
        name,
        url,
        date: dates.get(slug) ?? null,
        images: images.filter(i => i?.width && i.height),
      }
    })
  },
}
