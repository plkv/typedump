import { fetchJSON } from '../../discover/lib.mjs'

// British Standard Type is a Vue app on Prismic, whose content API is public.
// The "typefaces" feed lists the families in the site's own order, each as a
// card (one SVG, and the name in title case, where the documents shout it) and
// a link to the family document. A family document is a
// list of slices; the specimens are SVG outlines of set type, and the landscape
// body holds the desktop ones (the portrait body repeats them for phones).
// Its credits read "Release: 2024"; the first publication of the document gives
// the day when it falls in that year, otherwise the year alone is all there is.
const SITE = 'https://www.britishstandardtype.xyz'
const API = 'https://british-standard-type.cdn.prismic.io/api/v2'

function images(node, out = []) {
  if (Array.isArray(node)) node.forEach(n => images(n, out))
  else if (node && typeof node === 'object') {
    if (typeof node.url === 'string' && node.dimensions && /\.svg(\?|$)/.test(node.url)) out.push(node)
    else Object.values(node).forEach(n => images(n, out))
  }
  return out
}

export default {
  id: 'british-standard-type',
  label: 'British Standard Type',
  url: `${SITE}/typefaces`,
  async run({ maxImages }) {
    const { refs } = await fetchJSON(API)
    const ref = refs.find(r => r.isMasterRef).ref
    const search = async q => (await fetchJSON(`${API}/documents/search?ref=${ref}&pageSize=100&q=${encodeURIComponent(q)}`)).results
    const [feed] = await search('[[at(my.project_feed.uid,"typefaces")]]')
    const projects = await search('[[at(document.type,"project")]]')
    const byUid = new Map(projects.map(p => [p.uid, p]))

    return feed.data.body
      .filter(s => s.slice_type === 'project' && byUid.has(s.primary.link?.uid))
      .map(({ primary }) => {
        const doc = byUid.get(primary.link.uid)
        const release = JSON.stringify(doc.data).match(/Release:\s*(\d{4})/)?.[1]
        const published = doc.first_publication_date.slice(0, 10)
        const seen = new Set()
        const specimens = [primary.cards_image, ...images(doc.data.body_landscape)]
          .filter(img => img?.url && !seen.has(img.url.split('?')[0]) && seen.add(img.url.split('?')[0]))
          .slice(0, maxImages)
        return {
          name: primary.cards_title.replace(/\s+Family$/, ''),
          url: `${SITE}/typefaces/${doc.uid}`,
          date: !release || published.startsWith(release) ? published : `${release}-01-01`,
          images: specimens.map(img => ({ src: img.url.split('?')[0], width: img.dimensions.width, height: img.dimensions.height })),
        }
      })
  },
}
