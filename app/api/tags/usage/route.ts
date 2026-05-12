import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'
import { toTitleCase } from '@/lib/category-utils'

type Coll = 'Text'|'Display'|'Brutal'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = (searchParams.get('type') as any) || 'appearance'
    const fonts = await fontStorageClean.getAllFonts()
    const usage: Record<Coll, Set<string>> = { Text: new Set(), Display: new Set(), Brutal: new Set() }
    for (const f of fonts as any[]) {
      const coll: Coll = (f.collection as Coll) || 'Text'
      if (type === 'category') {
        const cats: string[] = Array.isArray(f.category) ? f.category : (typeof f.category === 'string' ? [f.category] : [])
        cats.forEach((t: string) => usage[coll].add(toTitleCase(t)))
      } else {
        const tagsSrc = (f as any).styleTags || (f as any).tags
        const tags: string[] = Array.isArray(tagsSrc) ? tagsSrc : (typeof tagsSrc === 'string' ? [tagsSrc] : [])
        tags.forEach((t: string) => usage[coll].add(toTitleCase(t)))
      }
    }
    const out = {
      success: true,
      type,
      usage: {
        Text: Array.from(usage.Text).sort((a,b)=>a.localeCompare(b)),
        Display: Array.from(usage.Display).sort((a,b)=>a.localeCompare(b)),
        Brutal: Array.from(usage.Brutal).sort((a,b)=>a.localeCompare(b)),
      }
    }
    return NextResponse.json(out)
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  }
}
