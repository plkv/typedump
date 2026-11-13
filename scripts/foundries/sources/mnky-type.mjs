import { fetchText, mapLimit } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// MNKY Type's site is server-rendered (Kirby). The root redirects to a random
// typeface; every typeface page carries the full library as the options of its
// typeface picker. A page's pictures are its in-use photographs and a specimen,
// <img> originals under the page's own media folder, which keeps out the
// neighbouring typefaces. Kirby serves no resized variants without a thumb
// preset, so the originals go through as they are.
//
// Nothing on the site states a release date. The media URLs carry upload stamps,
// but every picture was re-uploaded on the same day in August 2025, and the
// webfonts' head.created dates come from a shared build template, so the date
// stays null.
//
// The host runs mod_security, which refuses requests without a browser
// User-Agent; fetchText sends one.
const SITE = 'https://mnkytype.com'

function typefaces(html) {
  return [...html.matchAll(/<option data-link="(https:\/\/mnkytype\.com\/[^"]+)" value="([^"]+)"[^>]*>([^<]+)<\/option>/g)]
    .map(m => ({ url: m[1], slug: m[2], name: m[3].trim() }))
}

function pictures(html, slug) {
  const own = new RegExp(`<img src="(${SITE}/media/pages/${slug}/[^"]+\\.(?:jpe?g|png|gif|webp))"`, 'gi')
  return [...new Set([...html.matchAll(own)].map(m => m[1]))]
}

export default {
  id: 'mnky-type',
  label: 'MNKY Type',
  url: SITE,
  async run({ maxImages }) {
    const home = await fetchText(`${SITE}/`)
    return mapLimit(typefaces(home), 4, async ({ url, slug, name }) => {
      const srcs = pictures(await fetchText(url), slug).slice(0, maxImages)
      const images = await mapLimit(srcs, 4, async src => ({ src, ...(await imageSize(src)) }))
      return { name, url, date: null, images: images.filter(i => i.width) }
    })
  },
}
