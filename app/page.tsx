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
  return <CatalogPage initialFonts={initialFonts} initialFilters={params} />
}
