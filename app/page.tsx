import { staticDb } from '@/lib/static-db'
import { transformFamilies } from '@/lib/transform-font-families'
import CatalogPage from '@/components/font-catalog/CatalogPage'

export default function Page() {
  const families = staticDb.getAllFamilies()
  const initialFonts = transformFamilies(families)
  return (
    <>
      {/* Only the catalogue needs the full @font-face sheet (cards + the
          collection preview buttons). The detail page ships its own inline
          faces and the landing pages have no previews, so fonts.css is no
          longer loaded globally. Versioned so a data change busts its 1y cache. */}
      <link rel="stylesheet" href={`/fonts/fonts.css?v=${encodeURIComponent(staticDb.lastUpdated)}`} />
      {/* Filters come from the query string, read on the client. Reading them
          here instead would make this page dynamic, and the site is a static
          export — every page is a file, so there is no server to read a URL. */}
      <CatalogPage initialFonts={initialFonts} initialFilters={{}} />
    </>
  )
}
