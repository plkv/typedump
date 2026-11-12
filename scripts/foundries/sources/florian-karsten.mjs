import { fetchText, mapLimit } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// Florian Karsten Typefaces is a small server-rendered Kirby site with no API,
// robots.txt or sitemap. The catalogue lists every family with its page; the
// open-source ones (Space Grotesk, Montagu Slab) sit in it alongside the paid.
// A typeface page opens with a slideshow of specimen images straight from its
// content folder (content/1-fk-grotesk/slideshow/), then live-text testers and
// thumbnails of the other families, which are left out. Some slides are videos
// whose poster is linked by the page slug, a path that 404s; the same file is
// served from the content folder, so the still is taken from there.
//
// The page's info table states a "Release date" as month and year. Relaunched
// families list each major version ("December 2018 (1.0.0), June 2020
// (2.0.0)"); the first is the original release. Dates land on the 1st.
const SITE = 'https://fonts.floriankarsten.com'

function families(html) {
  return [...html.matchAll(/<div class="type-family">[\s\S]*?<span>([^<]+)<\/span>[\s\S]*?<a href="([^"]+)" class="preview">/g)]
    .map(m => ({ name: m[1].trim(), url: m[2] }))
}

function slides(html, url) {
  const folder = (html.match(/\/content\/\d+-[^/"]+\//) || [])[0]
  return [...html.matchAll(/(<img src|poster)="([^"]+\/slideshow\/[^"]+)"/g)].map(m =>
    m[1] === 'poster' && folder ? m[2].replace(`${url}/`, `${SITE}${folder}`) : m[2],
  )
}

function releaseDate(html) {
  const m = html.match(/Release date<\/span>\s*<span><p>([A-Za-z]+) (\d{4})/)
  const d = m && new Date(`1 ${m[1]} ${m[2]} UTC`)
  return d && !isNaN(d) ? d.toISOString().slice(0, 10) : null
}

export default {
  id: 'florian-karsten',
  label: 'Florian Karsten',
  url: SITE,
  async run({ maxImages }) {
    const catalogue = await fetchText(`${SITE}/catalogue`)
    return mapLimit(families(catalogue), 4, async ({ name, url }) => {
      const html = await fetchText(url)
      const srcs = [...new Set(slides(html, url))].slice(0, maxImages)
      const images = await mapLimit(srcs, 4, async src => ({ src, ...(await imageSize(src)) }))
      return { name, url, date: releaseDate(html), images: images.filter(i => i.width) }
    })
  },
}
