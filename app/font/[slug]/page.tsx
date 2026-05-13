import { notFound } from 'next/navigation'
import { staticDb } from '@/lib/static-db'
import { slugMatchesFamily } from '@/lib/font-slug'
import { buildFontFaceCSS } from '@/lib/font-face-css'
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

  const category = family.category[0] ?? 'font'
  const title = `${family.name} — Free ${category} Font | typedump`
  const rawDesc = family.description
    ?? `${family.name} by ${family.foundry}. ${family.category.join(', ')} · ${family.variants.length} style${family.variants.length !== 1 ? 's' : ''}.`
  const description = rawDesc.length > 160 ? rawDesc.slice(0, 157) + '…' : rawDesc

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://baseline-fonts.vercel.app/font/${slug}`,
      siteName: 'typedump',
      images: [{ url: '/og-image.webp', width: 1200, height: 630, alt: `${family.name} font preview` }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.webp'],
    },
  }
}

export default async function FontPage({ params }: Props) {
  const { slug } = await params
  const family = staticDb.getAllFamilies().find(f => slugMatchesFamily(slug, f.name))
  if (!family) notFound()
  const fontFaceCSS = buildFontFaceCSS(family)
  const fonts = staticDb.getAllFamilies().map(f => ({ name: f.name, author: f.foundry }))

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: family.name,
    applicationCategory: 'Font',
    description: family.description ?? `${family.name} by ${family.foundry}`,
    author: { '@type': 'Organization', name: family.foundry },
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    operatingSystem: 'Web',
    url: `https://baseline-fonts.vercel.app/font/${slug}`,
    ...(family.licenseInfo?.url ? { license: family.licenseInfo.url } : {}),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <style dangerouslySetInnerHTML={{ __html: fontFaceCSS }} />
      <FontDetail family={family} fonts={fonts} />
    </>
  )
}
