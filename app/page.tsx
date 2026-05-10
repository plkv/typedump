import { staticDb } from '@/lib/static-db'
import { transformFamilies } from '@/lib/transform-font-families'
import CatalogPage from '@/components/font-catalog/CatalogPage'

export default function Page() {
  const families = staticDb.getAllFamilies()
  const initialFonts = transformFamilies(families)
  return <CatalogPage initialFonts={initialFonts} />
}
