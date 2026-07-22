import type { MetadataRoute } from 'next'
import { staticDb } from '@/lib/static-db'
import { familyToSlug } from '@/lib/font-slug'

// Keep in sync with app/fonts/[slug]/page.tsx
const LANDING_SLUGS = [
  'serif', 'sans', 'mono', 'pixel', 'script', 'semi-serif', 'variable',
  'text', 'display', 'experimental', 'cyrillic', 'greek', 'vietnamese',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const families = staticDb.getAllFamilies()

  const fontPages: MetadataRoute.Sitemap = families.map(f => ({
    url: `https://www.typedump.com/font/${familyToSlug(f.name)}`,
    lastModified: new Date(f.updatedAt),
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  const landingPages: MetadataRoute.Sitemap = LANDING_SLUGS.map(slug => ({
    url: `https://www.typedump.com/fonts/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.9,
  }))

  return [
    {
      url: 'https://www.typedump.com',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...landingPages,
    ...fontPages,
  ]
}
