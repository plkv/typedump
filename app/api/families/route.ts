import { NextResponse } from 'next/server'
import { staticDb } from '@/lib/static-db'

export async function GET() {
  try {
    const families = staticDb.getAllFamilies()
    return NextResponse.json(
      {
        success: true,
        families,
        totalFamilies: families.length,
        totalFiles: families.reduce((n, f) => n + f.variants.length, 0),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
    )
  } catch (error) {
    console.error('Families list error:', error)
    return NextResponse.json(
      { error: 'Failed to build families', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
