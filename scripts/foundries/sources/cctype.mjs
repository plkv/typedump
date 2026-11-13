import { fetchText, mapLimit, parseSitemap } from '../../discover/lib.mjs'

// CC Type is Koto's foundry. The site is Next.js over a private Sanity dataset
// with a Fontdue store, so there is no public API; the sitemap lists one page
// per typeface (/typefaces/<slug>) and each page is server-rendered. Its
// pictures are <img> elements whose srcSet runs Sanity originals through Next's
// image optimiser; the Sanity URL is taken out of it and resized on Sanity's
// CDN instead. Asset filenames carry the original size. Lettering overlays are
// SVG and are skipped; the hero video's poster is an <img> and counts. The
// <head> (preloads and the og card) is left out.
//
// The page's technical information gives "Release date 2026", a year only.
// Sanity's CDN serves each asset with the time it was uploaded as
// Last-Modified, and the pictures go up in the weeks before launch, so the
// earliest upload dates the release when it falls in the stated year; otherwise
// the release is 1 January of that year.
const SITE = 'https://cctype.com'
const WIDTH = 1400

function pictures(html) {
  const body = html.slice(html.indexOf('<body'))
  const files = body.matchAll(/cdn\.sanity\.io%2Fimages%2F([a-z0-9]+%2F[a-z0-9-]+)%2F(\w+-(\d+)x(\d+)\.(jpe?g|png|gif|webp))/g)
  const seen = new Set()
  return [...files]
    .filter(m => !seen.has(m[2]) && seen.add(m[2]))
    .map(([, path, file, w, h, ext]) => {
      const base = `https://cdn.sanity.io/images/${decodeURIComponent(path)}/${file}`
      if (ext === 'gif') return { src: base, width: +w, height: +h }
      const width = Math.min(+w, WIDTH)
      return { src: `${base}?w=${width}&fit=max&auto=format`, width, height: Math.round((h * width) / w) }
    })
}

async function uploaded(src) {
  try {
    const res = await fetch(src.split('?')[0], { method: 'HEAD', signal: AbortSignal.timeout(15000) })
    const d = new Date(res.headers.get('last-modified'))
    return isNaN(d) ? null : d.toISOString().slice(0, 10)
  } catch {
    return null
  }
}

async function releaseDate(html, images) {
  const year = (html.match(/Release date<\/span>(?:\s*<[^>]+>)*\s*(\d{4})/) || [])[1]
  if (!year) return null
  const uploads = (await mapLimit(images, 4, img => uploaded(img.src))).filter(Boolean).sort()
  return uploads[0]?.startsWith(year) ? uploads[0] : `${year}-01-01`
}

export default {
  id: 'cctype',
  label: 'CC Type',
  url: SITE,
  async run({ maxImages }) {
    const pages = parseSitemap(await fetchText(`${SITE}/sitemap.xml`))
      .map(e => e.loc)
      .filter(loc => /\/typefaces\/[^/]+$/.test(loc))
    return mapLimit(pages, 4, async url => {
      const html = await fetchText(url)
      const images = pictures(html)
      return {
        name: (html.match(/<title>([^<]+?)\s+[–|-]\s/) || [])[1]?.trim(),
        url,
        date: await releaseDate(html, images),
        images: images.slice(0, maxImages),
      }
    })
  },
}
