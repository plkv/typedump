import { staticDb } from '@/lib/static-db'
import { transformFamilies } from '@/lib/transform-font-families'
import CatalogPage from '@/components/font-catalog/CatalogPage'

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function Page({ searchParams }: Props) {
  const params = await searchParams
  const families = staticDb.getAllFamilies()
  const initialFonts = transformFamilies(families)
  return (
    <>
      {/* Only the catalogue needs the full @font-face sheet (cards + the
          collection preview buttons). The detail page ships its own inline
          faces and the landing pages have no previews, so fonts.css is no
          longer loaded globally. Versioned so a data change busts its 1y cache. */}
      <link rel="stylesheet" href={`/fonts/fonts.css?v=${encodeURIComponent(staticDb.lastUpdated)}`} />
      <CatalogPage initialFonts={initialFonts} initialFilters={params} />
    </>
  )
}
