import { NextRequest } from 'next/server'
import { staticDb } from '@/lib/static-db'
import { buildFontCSS } from '@/lib/font-css'

function hashString(input: string): string {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i)
    h |= 0
  }
  return `W/"${(h >>> 0).toString(16)}-${input.length}"`
}

export async function GET(_req: NextRequest) {
  try {
    const families = staticDb.getAllFamilies()
    const css = buildFontCSS(families)
    const etag = hashString(css)

    return new Response(css, {
      status: 200,
      headers: {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
        ETag: etag,
      },
    })
  } catch (e) {
    console.error('font-css error', e)
    return new Response('/* Failed to build font CSS */', {
      status: 500,
      headers: { 'Content-Type': 'text/css; charset=utf-8' },
    })
  }
}
