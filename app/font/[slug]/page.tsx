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
  const styleCount = family.variants.length
  const isVariable = family.isVariable || family.variants.some(v => v.isVariable)
  // The faces this one stands in for, most-searched first. "free alternative to
  // X" and "fonts like X" are the queries; put that wording where it counts.
  const replaces = (family.alternativeTo ?? []).map(a => a.name)

  // Match how people actually search: "<name> font download", "<name> free font"
  // — and, when the family answers one, "free alternative to <face>".
  const title = replaces.length
    ? `${family.name} font — free alternative to ${replaces[0]} | typedump`
    : `${family.name} font, free download | typedump`

  // Keep the hand-written description as the meta description (it's the best copy
  // we have); only fall back to a generated one, and lead it with search intent.
  const generated = [
    `Download ${family.name}, a free ${isVariable ? 'variable ' : ''}${category.toLowerCase()} typeface`,
    family.foundry && family.foundry !== 'Unknown' ? ` by ${family.foundry}` : '',
    `. ${styleCount} style${styleCount !== 1 ? 's' : ''}`,
    family.licenseInfo?.type ? `, ${family.licenseInfo.type} licensed` : '',
    `. Preview it in your browser on typedump.`,
  ].join('')
  // The alternative claim goes FIRST, not last. Descriptions are cut at 160
  // characters, and the hand-written copy carries this line at the end — so the
  // one sentence people search for was the one sentence always truncated away.
  // No name in front: the hand-written description already opens with it, and
  // repeating it spends characters the 160-limit does not have.
  const altLead = replaces.length
    ? `Free alternative to ${replaces.slice(0, 3).join(', ')}. `
    : ''
  const rawDesc = altLead + (family.description ?? generated)
  const description = rawDesc.length > 160 ? rawDesc.slice(0, 157) + '…' : rawDesc

  const url = `https://www.typedump.com/font/${slug}`
  return {
    title,
    description,
    keywords: [
      `${family.name} font`, `${family.name} download`, `${family.name} free font`,
      `free ${category.toLowerCase()} font`, 'free fonts', 'open source fonts',
    ].join(', '),
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
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

  const url = `https://www.typedump.com/font/${slug}`
  const isVariable = family.isVariable || family.variants.some(v => v.isVariable)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: family.name,
    applicationCategory: 'Font',
    description: family.description ?? `${family.name} by ${family.foundry}`,
    author: { '@type': 'Organization', name: family.foundry },
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
    operatingSystem: 'Web',
    url,
    isAccessibleForFree: true,
    encodingFormat: 'font/woff2',
    inLanguage: family.languages,
    keywords: [...family.category, ...family.styleTags, family.collection, isVariable ? 'variable font' : '']
      .filter(Boolean).join(', '),
    ...(family.licenseInfo?.url ? { license: family.licenseInfo.url } : {}),
  }

  // Breadcrumbs help Google render a path in the SERP instead of a bare URL.
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Free fonts', item: 'https://www.typedump.com' },
      { '@type': 'ListItem', position: 2, name: `${family.category[0] ?? 'Fonts'} fonts`, item: `https://www.typedump.com/fonts/${(family.category[0] ?? 'sans').toLowerCase().replace(/\s+/g, '-')}` },
      { '@type': 'ListItem', position: 3, name: family.name, item: url },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <style dangerouslySetInnerHTML={{ __html: fontFaceCSS }} />
      <FontDetail family={family} fonts={fonts} />
    </>
  )
}
