import type { MetadataRoute } from 'next'
import { staticDb } from '@/lib/static-db'
import { familyToSlug } from '@/lib/font-slug'

export default function sitemap(): MetadataRoute.Sitemap {
  const families = staticDb.getAllFamilies()

  const fontPages: MetadataRoute.Sitemap = families.map(f => ({
    url: `https://baseline-fonts.vercel.app/font/${familyToSlug(f.name)}`,
    lastModified: new Date(f.updatedAt),
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  return [
    {
      url: 'https://baseline-fonts.vercel.app',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...fontPages,
  ]
}
