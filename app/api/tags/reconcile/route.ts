import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { fontStorageClean } from '@/lib/font-storage-clean'
import { toTitleCase } from '@/lib/category-utils'

type Coll = 'Text'|'Display'|'Brutal'
const keyOf = (type: 'appearance'|'category', collection: Coll) => `tags:vocab:${type}:${collection}`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(()=>({})) as { removeUnused?: boolean }
    const removeUnused = !!body.removeUnused
    const fonts = await fontStorageClean.getAllFonts()

    const used: Record<'appearance'|'category', Record<Coll, Set<string>>> = {
      appearance: { Text: new Set(), Display: new Set(), Brutal: new Set() },
      category: { Text: new Set(), Display: new Set(), Brutal: new Set() },
    }
    for (const f of fonts as any[]) {
      const coll: Coll = (f.collection as Coll) || 'Text'
      const styleSrc = (f as any).styleTags || (f as any).tags
      const styleTags: string[] = Array.isArray(styleSrc) ? styleSrc : (typeof styleSrc === 'string' ? [styleSrc] : [])
      const categories: string[] = Array.isArray(f.category) ? f.category : (typeof f.category === 'string' ? [f.category] : [])
      styleTags.forEach((t: string) => used.appearance[coll].add(toTitleCase(t)))
      categories.forEach((t: string) => used.category[coll].add(toTitleCase(t)))
    }

    const result: any = { success: true, updated: [] as any[] }
    for (const type of ['appearance','category'] as const) {
      for (const coll of ['Text','Display','Brutal'] as Coll[]) {
        const key = keyOf(type, coll)
        const curr = (await kv.get<string[]>(key)) || []
        const currSet = new Set(curr)
        const usedSet = used[type][coll]
        let next: string[]
        if (removeUnused) {
          next = Array.from(usedSet).sort((a,b)=>a.localeCompare(b))
        } else {
          next = Array.from(new Set([ ...curr, ...Array.from(usedSet) ])).sort((a,b)=>a.localeCompare(b))
        }
        if (JSON.stringify(next) !== JSON.stringify(curr)) {
          await kv.set(key, next)
          result.updated.push({ type, collection: coll, size: next.length })
        }
      }
    }
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  }
}
