import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/debug/', '/test/'],
      },
    ],
    sitemap: 'https://www.typedump.com/sitemap.xml',
  }
}
