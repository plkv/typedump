import { fetchText, mapLimit } from '../../discover/lib.mjs'
import { imageSize } from '../lib.mjs'

// Rellence's site is server-rendered PHP. The typefaces index has a block per
// family, each linking to a page with ?font= picking the member (albra?font=
// albra-sans); one page holds a whole superfamily and is one typeface here,
// named by the words its members share (Para Central, Para Grand → Para).
// A typeface page is set in live text with one AVIF header, which the crawler
// can't size or convert, so the pictures come from the homepage feed: posts of
// specimens and work in use, each linking to the typeface it shows. Posts about
// custom work, the foundry itself or typefaces no longer listed are skipped.
//
// Nothing on the site dates a typeface: the pages state a version only, the
// webfonts were all rebuilt in 2026, and the feed is undated.
const SITE = 'https://rellence.com'
const RASTER = /\.(jpe?g|png|gif|webp)$/i

function typefaces(html) {
  const groups = new Map()
  for (const m of html.matchAll(/<h2>\s*<a href="([a-z-]+)\?font=[a-z-]+"[^>]*>\s*([^<]+?)\s*<\/a>/g)) {
    groups.set(m[1], [...(groups.get(m[1]) || []), m[2].split(/\s+/)])
  }
  return [...groups].map(([slug, names]) => {
    const shared = names[0].filter((word, i) => names.every(n => n[i] === word))
    return { slug, name: (shared.length ? shared : names[0]).join(' ') }
  })
}

function feed(html) {
  return html
    .split('<div class="post ')
    .slice(1)
    .map(post => ({
      slug: (post.match(/href="https:\/\/rellence\.com\/([a-z-]+)[^"]*" class="feed_overlay"/) || [])[1],
      src: (post.match(/<img[^>]+src="([^"]+)"/) || [])[1],
    }))
    .filter(p => p.slug && p.src && RASTER.test(p.src))
    .map(p => ({ slug: p.slug, src: new URL(p.src, `${SITE}/`).href }))
}

export default {
  id: 'rellence',
  label: 'Rellence',
  url: SITE,
  async run({ maxImages }) {
    const [index, home] = await Promise.all([fetchText(`${SITE}/typefaces`), fetchText(`${SITE}/`)])
    const families = typefaces(index)
    const slugs = new Set(families.map(f => f.slug))
    const posts = feed(home).filter(p => slugs.has(p.slug))
    const srcs = [...new Set(posts.map(p => p.src))]
    const sizes = new Map(await mapLimit(srcs, 4, async src => [src, await imageSize(src)]))
    return families.map(({ slug, name }) => ({
      name,
      url: `${SITE}/${slug}`,
      date: null,
      images: [...new Set(posts.filter(p => p.slug === slug).map(p => p.src))]
        .filter(src => sizes.get(src))
        .slice(0, maxImages)
        .map(src => ({ src, ...sizes.get(src) })),
    }))
  },
}
