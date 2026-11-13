import { fetchText, mapLimit, normName } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// Oh No's site is server-rendered (Craft). The fonts index menu lists one page
// per typeface; a page holding two families (Vulf Sans and Vulf Mono) is one
// typeface here, as the foundry sells and shows it. A page's pictures are its
// feature specimens (mostly SVG, set in the face) and then its in-use gallery,
// all <img> originals on a DigitalOcean Space with no sized variants; the
// _transforms thumbnails of collections are skipped. Typefaces released since
// the gallery stopped being filled have no raster in-use pictures; for those
// the gallery comes from the "Process of" post the page links to.
//
// Nothing on a typeface page states a date, and the files' Last-Modified was
// reset by a 2023 migration. The "Process of" post goes up with the release, so
// its date in the blog's RSS (which carries the whole archive) dates the
// typeface to within days. Pages for two families link the post for the first
// one. Retail links none and is matched to its post by title.
const SITE = 'https://ohnotype.co'
const RASTER = /\.(jpe?g|png|gif|webp)$/i

function specimens(html) {
  return [...new Set([...html.matchAll(/class="font__feature-image"[^]*?<img\b[^>]*?\s(?:data-)?src="([^"]+)"/g)].map(m => m[1]))]
}

// The site shuffles a page's gallery on every load, so the pictures are sorted
// here; otherwise every run would reorder the row and look like a change.
function pictures(html) {
  const srcs = [...html.matchAll(/<img\b[^>]*?\s(?:data-)?src="([^"]+)"/g)]
    .map(m => m[1])
    .filter(src => RASTER.test(src) && !src.includes('/_transforms/'))
  return [...new Set(srcs)].sort()
}

async function processPosts() {
  const rss = await fetchText(`${SITE}/blog.rss`)
  return rss
    .split('<item>')
    .slice(1)
    .map(item => ({
      title: (item.match(/<title>([^<]+)<\/title>/) || [])[1] || '',
      link: (item.match(/<link>([^<]+)<\/link>/) || [])[1],
      date: new Date(`${(item.match(/<pubDate>\w+, ([^:]+) \d\d:/) || [])[1]} UTC`).toISOString().slice(0, 10),
    }))
    .filter(p => /^The Process of /.test(p.title))
}

export default {
  id: 'ohno',
  label: 'Oh No Type Co.',
  url: SITE,
  async run({ maxImages }) {
    const [index, posts] = await Promise.all([fetchText(`${SITE}/fonts`), processPosts()])
    const typefaces = [...index.matchAll(/class="menu__link menu__link--internal" href="(https:\/\/ohnotype\.co\/fonts\/[^"]+)">([^<]+)</g)]
      .map(m => ({ url: m[1], name: m[2].trim() }))
    return mapLimit(typefaces, 4, async ({ url, name }) => {
      const html = await fetchText(url)
      const linked = (html.match(/class="menu__link" href="(https:\/\/ohnotype\.co\/blog\/[^"]+)">Process/) || [])[1]
      const post = posts.find(p => p.link === linked) || posts.find(p => normName(p.title.slice(15)) === normName(name))
      let gallery = pictures(html)
      if (!gallery.length && post) gallery = pictures(await fetchText(post.link))
      const srcs = [...new Set([...specimens(html), ...gallery])].slice(0, maxImages)
      const images = await mapLimit(srcs, 4, async src => ({ src, ...(await imageSize(src)) }))
      return { name, url, date: post?.date ?? null, images: images.filter(i => i.width) }
    })
  },
}
