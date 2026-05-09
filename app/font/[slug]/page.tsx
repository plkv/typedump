import { notFound } from 'next/navigation'
import { staticDb } from '@/lib/static-db'
import { slugMatchesFamily } from '@/lib/font-slug'
import { FontDetail } from './FontDetail'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const { familyToSlug } = await import('@/lib/font-slug')
  return staticDb.getAllFamilies().map(f => ({ slug: familyToSlug(f.name) }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const family = staticDb.getAllFamilies().find(f => slugMatchesFamily(slug, f.name))
  if (!family) return {}
  return {
    title: `${family.name} — Typedump`,
    description: `${family.name} by ${family.foundry}. ${family.category.join(', ')} · ${family.variants.length} style${family.variants.length !== 1 ? 's' : ''}`,
  }
}

export default async function FontPage({ params }: Props) {
  const { slug } = await params
  const family = staticDb.getAllFamilies().find(f => slugMatchesFamily(slug, f.name))
  if (!family) notFound()
  return <FontDetail family={family} />
}
