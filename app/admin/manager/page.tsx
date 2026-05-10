"use client"

import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Toaster, toast } from 'sonner'
import { canonicalFamilyName } from '@/lib/font-naming'
import { shortHash } from '@/lib/hash'

type CleanFont = {
  id: string
  family: string
  filename: string
  weight?: number
  style?: string
  isVariable?: boolean
  variableAxes?: Array<{ name: string; axis: string; min: number; max: number; default: number }>
  openTypeFeatures?: string[]
  foundry?: string
  version?: string
  license?: string
  uploadedAt?: string
  collection?: 'Text' | 'Display' | 'Weirdo'
  styleTags?: string[]
  languages?: string[]
  category?: string[]
  downloadLink?: string
}

type Family = {
  name: string
  fonts: CleanFont[]
  stylesCount: number
  uploadedAt: string
  collection: 'Text' | 'Display' | 'Weirdo'
  styleTags: string[]
  languages: string[]
  category: string[]
  foundry?: string
  downloadLink?: string
}

export default function AdminManager() {
  const [loading, setLoading] = useState(false)
  const [fonts, setFonts] = useState<CleanFont[]>([])
  const [query, setQuery] = useState('')
  const [collectionFilter, setCollectionFilter] = useState<'all' | 'Text' | 'Display' | 'Weirdo'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'alpha'>('date')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<Record<string, { collection: Family['collection']; styleTags: string[]; languages: string[]; category?: string[] }>>({})
  const [uploading, setUploading] = useState(false)
  const [uploadFamily, setUploadFamily] = useState('')
  const [uploadCollection, setUploadCollection] = useState<'Text'|'Display'|'Weirdo'>('Text')
  const [dragOver, setDragOver] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [manageTagsOpen, setManageTagsOpen] = useState(false)
  const [manageType, setManageType] = useState<'appearance'|'category'>('appearance')
  const [tagEdits, setTagEdits] = useState<string[]>([])
  const [tagsLoading, setTagsLoading] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({})
  const [renamingIdx, setRenamingIdx] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [reparsingAxes, setReparsingAxes] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      // Use merged families (legacy + clean) so Admin shows all families the catalog sees
      const res = await fetch(`/api/families?t=${Date.now()}`, { cache: 'no-store' })
      const data = await res.json()
      const families = Array.isArray(data.families) ? data.families : []
      const flat: CleanFont[] = families.flatMap((fam: any) => (fam.variants||[]).map((v: any) => ({
        id: v.id,
        family: fam.name,
        filename: v.filename,
        weight: v.weight,
        style: v.styleName,
        isVariable: v.isVariable,
        variableAxes: v.variableAxes,
        openTypeFeatures: v.openTypeFeatures,
        foundry: fam.foundry,
        version: fam.version,
        license: fam.license,
        uploadedAt: v.uploadedAt || fam.updatedAt || fam.createdAt,
        collection: fam.collection,
        styleTags: fam.styleTags || [],
        languages: fam.languages || [],
        category: fam.category || [],
        downloadLink: fam.downloadLink,
      })))
      setFonts(flat)
    } finally {
      setLoading(false)
    }
  }

  const reparseAxes = async () => {
    if (!confirm('Re-parse variable axes for all fonts? This will fix default slider values but may take a few minutes.')) {
      return
    }

    setReparsingAxes(true)
    try {
      const res = await fetch('/api/fonts-clean/reparse-axes', {
        method: 'POST',
      })
      const result = await res.json()

      if (result.success) {
        toast.success(`✅ Re-parsed ${result.updatedCount} variable fonts`)
        if (result.errors && result.errors.length > 0) {
          console.error('Re-parse errors:', result.errors)
          toast.error(`⚠️ ${result.errorCount} fonts had errors (check console)`)
        }
        // Reload fonts to show updated data
        await load()
      } else {
        toast.error(`❌ Re-parse failed: ${result.error}`)
      }
    } catch (error: any) {
      console.error('Re-parse error:', error)
      toast.error(`❌ Failed to re-parse: ${error.message}`)
    } finally {
      setReparsingAxes(false)
    }
  }

  useEffect(() => { load() }, [])

  // Load vocabularies from KV only (no auto-merge). Catalog usage is shown in modal via server summary.
  useEffect(()=>{
    const loadKV = async () => {
      try {
        const loadOne = async (type: 'appearance'|'category') => {
          const res = await fetch(`/api/tags/vocab?type=${type}`, { cache:'no-store' })
          const data = await res.json()
          return Array.isArray(data.list) ? data.list : []
        }
        const [app, cat] = await Promise.all([
          loadOne('appearance'), loadOne('category')
        ])
        setAppearanceVocab({ Text: app, Display: app, Weirdo: app })
        setCategoryVocab({ Text: cat, Display: cat, Weirdo: cat })
      } catch {}
    }
    loadKV()
  }, [])

  // On modal open or scope change, fetch authoritative summary: vocab (ordered) + usage counts + missing
  useEffect(()=>{
    if (!manageTagsOpen) return
    setTagsLoading(true)
    ;(async ()=>{
      try {
        const res = await fetch(`/api/tags/summary?type=${manageType}`, { cache: 'no-store' })
        const data = await res.json()
        const vocab: string[] = Array.isArray(data.vocab) ? data.vocab : []
        const usageArr: Array<{ tag: string; count: number }> = Array.isArray(data.usage) ? data.usage : []
        const map: Record<string, number> = {}
        usageArr.forEach(u => { map[u.tag] = u.count })
        setUsageCounts(map)
        setTagEdits(vocab)
      } catch {
        // fallback to existing vocab state if summary fails
        setTagEdits(manageType==='appearance' ? appearanceVocab['Text'] : categoryVocab['Text'])
      } finally {
        setTagsLoading(false)
      }
    })()
  }, [manageTagsOpen, manageType])

  // Vocabularies persisted in KV; fallback to dataset on first load
  const [appearanceVocab, setAppearanceVocab] = useState<Record<'Text'|'Display'|'Weirdo', string[]>>({ Text: [], Display: [], Weirdo: [] })
  const [categoryVocab, setCategoryVocab] = useState<Record<'Text'|'Display'|'Weirdo', string[]>>({ Text: [], Display: [], Weirdo: [] })

  useEffect(()=>{
    const fetchVocab = async () => {
      const loadOne = async (type: 'appearance'|'category') => {
        const res = await fetch(`/api/tags/vocab?type=${type}`, { cache:'no-store' })
        const data = await res.json()
        return Array.isArray(data.list) ? data.list : []
      }
      const defaultsAppearance = new Set<string>()
      fonts.forEach(f=>{ (f.styleTags||[]).forEach((t)=> defaultsAppearance.add(t)) })
      const defaultsCategory = new Set<string>()
      fonts.forEach(f=>{ (f.category||[]).forEach((t)=> defaultsCategory.add(t)) })

      const app = await loadOne('appearance')
      const cat = await loadOne('category')
      const appList = (app.length ? app : Array.from(defaultsAppearance)).sort((a: string, b: string)=>a.localeCompare(b))
      const catList = (cat.length ? cat : Array.from(defaultsCategory)).sort((a: string, b: string)=>a.localeCompare(b))
      setAppearanceVocab({
        Text: appList,
        Display: appList,
        Weirdo: appList,
      })
      setCategoryVocab({
        Text: catList,
        Display: catList,
        Weirdo: catList,
      })
    }
    fetchVocab()
  }, [fonts])

  const normalizeTag = (t: string) => {
    const s = t.trim().replace(/\s+/g, ' ')
    // Title Case simple
    return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
  }

  const families = useMemo<Family[]>(() => {
    const m = new Map<string, CleanFont[]>()
    for (const f of fonts) {
      const k = f.family || 'Unknown'
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(f)
    }
    const arr: Family[] = Array.from(m.entries()).map(([name, list]) => {
      const uploadedAt = list.map(f => f.uploadedAt || '').sort().reverse()[0] || ''
      const stylesCount = list.length
      const representative = list[0]
      const collection = (representative.collection as any) || 'Text'
      // Aggregate styleTags from all fonts in family (like catalog does)
      const allStyleTags = new Set<string>()
      list.forEach(f => {
        if (Array.isArray(f.styleTags)) {
          f.styleTags.forEach(tag => allStyleTags.add(tag))
        }
      })
      const styleTags = Array.from(allStyleTags)
      // Aggregate languages from all fonts in family
      const allLanguages = new Set<string>()
      list.forEach(f => {
        if (Array.isArray(f.languages)) {
          f.languages.forEach(lang => allLanguages.add(lang))
        }
      })
      const languages = Array.from(allLanguages.size ? allLanguages : new Set(['Latin']))
      // Aggregate categories from all fonts in family
      const allCategories = new Set<string>()
      list.forEach(f => {
        if (Array.isArray(f.category)) {
          f.category.forEach(cat => allCategories.add(cat))
        }
      })
      const category = Array.from(allCategories)
      const foundry = representative.foundry
      // Assume family-level download link shared across variants
      const downloadLink = (list.find(f => (f as any).downloadLink)?.downloadLink as any) || undefined
      return { name, fonts: list, stylesCount, uploadedAt, collection, styleTags, languages, category, foundry, downloadLink }
    })
    // basic filter/sort
    const filtered = arr.filter(f => (collectionFilter === 'all' ? true : f.collection === collectionFilter))
      .filter(f => (categoryFilter === 'all' ? true : (f.category || []).includes(categoryFilter)))
      .filter(f => (query ? f.name.toLowerCase().includes(query.toLowerCase()) : true))
    if (sortBy === 'alpha') filtered.sort((a, b) => a.name.localeCompare(b.name))
    else filtered.sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''))
    return filtered
  }, [fonts, collectionFilter, categoryFilter, sortBy, query])

  // Build category vocabulary from families
  const categoryVocabulary = useMemo<string[]>(() => {
    const cats = new Set<string>()
    for (const fam of families) {
      (fam.category || []).forEach(c => cats.add(c))
    }
    return Array.from(cats).sort((a,b)=>a.localeCompare(b))
  }, [families])

  // Build language vocabulary from data
  const languageVocabulary = useMemo<string[]>(() => {
    const langs = new Set<string>()
    for (const f of fonts) (f.languages || []).forEach(l => langs.add(l))
    if (!langs.size) return ['Latin']
    return Array.from(langs).sort((a, b) => a.localeCompare(b))
  }, [fonts])

  const toggleExpand = (name: string) => {
    setExpanded(prev => { const s = new Set(prev); s.has(name) ? s.delete(name) : s.add(name); return s })
  }

  const startEdit = (fam: Family) => {
    setEditing(prev => ({ ...prev, [fam.name]: { collection: fam.collection, styleTags: [...fam.styleTags], languages: [...fam.languages], name: fam.name, foundry: fam.foundry || '', downloadLink: fam.downloadLink || '' } as any }))
    setExpanded(prev => new Set(prev).add(fam.name))
  }

  const saveEdit = async (fam: Family) => {
    const e = editing[fam.name]
    if (!e) return
    // apply updates to all fonts in family
    const updates: any = { collection: e.collection, styleTags: e.styleTags, languages: e.languages }
    if ((editing[fam.name] as any)?.category) updates.category = (editing[fam.name] as any).category
    if ((editing[fam.name] as any)?.foundry !== undefined) updates.foundry = (editing[fam.name] as any).foundry
    if ((editing[fam.name] as any)?.downloadLink !== undefined) updates.downloadLink = (editing[fam.name] as any).downloadLink
    const targetName = (editing[fam.name] as any)?.name || fam.name

    // Check if target family already exists (merge operation)
    const existingFamily = families.find(f => f.name === targetName && f.name !== fam.name)
    const isMerge = existingFamily && targetName !== fam.name

    await Promise.all(fam.fonts.map(async f => {
      const body: any = { id: f.id, updates: { ...updates } }
      if (targetName && targetName !== fam.name) body.updates.family = targetName
      const res = await fetch('/api/fonts-clean/update', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) {
        // ignore legacy-only variants for now
      }
    }))
    setEditing(prev => { const c = { ...prev }; delete c[fam.name]; return c })
    // Optimistic local update to avoid full reload
    setFonts(prev => prev.map(f => f.family === fam.name ? { ...f, family: targetName, foundry: updates.foundry ?? f.foundry, collection: e.collection, styleTags: e.styleTags, languages: e.languages, category: (updates.category || (f as any).category || []), downloadLink: updates.downloadLink ?? (f as any).downloadLink } : f))

    // Show appropriate success message
    if (isMerge) {
      try {
        toast.success(`Merged "${fam.name}" into "${targetName}" (${fam.fonts.length} variants + ${existingFamily.fonts.length} variants = ${fam.fonts.length + existingFamily.fonts.length} total)`)
      } catch {}
    } else {
      try { toast.success('Family updated') } catch {}
    }
  }

  const deleteFamily = async (fam: Family) => {
    if (!confirm(`Delete family ${fam.name} and all ${fam.fonts.length} styles?`)) return
    await Promise.all(fam.fonts.map(async f => {
      const resp = await fetch('/api/fonts-clean/delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: f.id }) })
      if (!resp.ok) {
        // fallback to legacy delete by filename
        try { await fetch(`/api/fonts/delete?filename=${encodeURIComponent(f.filename)}`, { method: 'DELETE' }) } catch {}
      }
    }))
    setFonts(prev => prev.filter(f => f.family !== fam.name))
    try { toast.success('Family deleted') } catch {}
  }

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget
    const files = inputEl?.files
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const fd = new FormData()
      Array.from(files).forEach(f => fd.append('files', f))
      if (uploadFamily.trim()) fd.append('family', uploadFamily.trim())
      fd.append('collection', uploadCollection)
      const res = await fetch('/api/fonts-clean/bulk-upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!data.success) alert('Upload failed')
      await load()
    } finally {
      setUploading(false)
      try { if (inputEl) inputEl.value = '' } catch {}
    }
  }

  const handleFiles = async (files: File[]) => {
    if (!files.length) return
    setUploading(true)
    try {
      const fd = new FormData()
      files.forEach(f => fd.append('files', f))
      if (uploadFamily.trim()) fd.append('family', uploadFamily.trim())
      fd.append('collection', uploadCollection)
      const res = await fetch('/api/fonts-clean/bulk-upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!data.success) alert('Upload failed')
      await load()
    } finally {
      setUploading(false)
      setPendingFiles([])
    }
  }

  return (
    <main className="p-6 space-y-6">
      <Toaster richColors position="top-right" />
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Admin — Font Manager</h1>
          <div className="flex gap-2 items-center">
          <input placeholder="Search family" value={query} onChange={e => setQuery(e.target.value)} className="btn-md" />
          <select className="btn-md" value={collectionFilter} onChange={e => setCollectionFilter(e.target.value as any)}>
            <option value="all">All</option>
            <option value="Text">Text</option>
            <option value="Display">Display</option>
            <option value="Weirdo">Weirdo</option>
          </select>
          <select className="btn-md" value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
            <option value="date">Date</option>
            <option value="alpha">A–Z</option>
          </select>
          <select className="btn-md" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="all">All categories</option>
            {categoryVocabulary.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button
            className="btn-md"
            onClick={reparseAxes}
            disabled={reparsingAxes}
            style={{ opacity: reparsingAxes ? 0.5 : 1 }}
          >
            {reparsingAxes ? 'Re-parsing...' : 'Re-parse Axes'}
          </button>
          <Dialog open={manageTagsOpen} onOpenChange={(o)=>{ setManageTagsOpen(o); if(!o) setTagEdits([]) }}>
            <DialogTrigger className="btn-md">Manage Tags</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manage Tags</DialogTitle>
              </DialogHeader>
              <div className="flex gap-2 mb-2">
                <select className="btn-md" value={manageType} onChange={e=>{ setManageType(e.target.value as any); setTagEdits([]) }}>
                  <option value="appearance">Appearance</option>
                  <option value="category">Category</option>
                </select>
              </div>
              <div className="space-y-2" style={{ maxHeight: 320, overflowY: 'auto' }}>
                {tagsLoading && (
                  <div className="text-sm" style={{ color: 'var(--gray-cont-tert)' }}>Loading…</div>
                )}
                {!tagsLoading && tagEdits.map((t, idx) => {
                  const usedBy = usageCounts[t] || 0
                  const isRenaming = renamingIdx === idx
                  return (
                    <div key={idx} className="flex gap-2 items-center" draggable={!isRenaming} onDragStart={()=>{ if (!isRenaming) setDragIdx(idx) }} onDragOver={(e)=>e.preventDefault()} onDrop={()=>{
                      if (dragIdx===null || isRenaming) return; const list = [...tagEdits]
                      const [m] = list.splice(dragIdx,1); list.splice(idx,0,m); setTagEdits(list); setDragIdx(null)
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--gray-cont-tert)', cursor: isRenaming ? 'default' : 'grab' }}>drag_indicator</span>
                      <input className="btn-md flex-1" value={tagEdits[idx] || ''} onChange={(e)=>{
                        setTagEdits(prev=>{ const base = [...prev]; base[idx] = normalizeTag(e.target.value); return base })
                      }} disabled={isRenaming} />
                      <span className="text-sidebar-title" style={{ color: 'var(--gray-cont-tert)' }}>{usedBy}</span>
                      {isRenaming ? (
                        <>
                          <input
                            className="btn-md"
                            placeholder="New tag name"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            autoFocus
                          />
                          <button className="btn-sm" onClick={async ()=>{
                            if (!renameValue.trim()) {
                              toast.error('New tag name cannot be empty')
                              return
                            }
                            const oldTag = tagEdits[idx]
                            const newTag = normalizeTag(renameValue)

                            try {
                              toast.loading(`Renaming "${oldTag}" to "${newTag}"...`)
                              const res = await fetch('/api/tags/rename', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ oldTag, newTag, type: manageType })
                              })
                              const data = await res.json()

                              if (data.success) {
                                toast.success(`Renamed "${oldTag}" to "${newTag}" (${data.updatedCount} fonts updated)`)
                                // Refresh vocabulary and usage
                                const summaryRes = await fetch(`/api/tags/summary?type=${manageType}`, { cache: 'no-store' })
                                const summaryData = await summaryRes.json()
                                const vocab: string[] = Array.isArray(summaryData.vocab) ? summaryData.vocab : []
                                const usageArr: Array<{ tag: string; count: number }> = Array.isArray(summaryData.usage) ? summaryData.usage : []
                                const map: Record<string, number> = {}
                                usageArr.forEach(u => { map[u.tag] = u.count })
                                setUsageCounts(map)
                                setTagEdits(vocab)

                                // Reload fonts
                                await load()
                              } else {
                                toast.error(data.error || 'Rename failed')
                              }
                            } catch (e) {
                              toast.error('Failed to rename tag')
                            } finally {
                              setRenamingIdx(null)
                              setRenameValue('')
                            }
                          }}>Save</button>
                          <button className="btn-sm" onClick={()=>{ setRenamingIdx(null); setRenameValue('') }}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="btn-sm" onClick={()=>{ setRenamingIdx(idx); setRenameValue(tagEdits[idx]) }}>Rename</button>
                          <button className="btn-sm" onClick={()=>setTagEdits(prev=>{ const base = [...prev]; base.splice(idx,1); return base })}>Remove</button>
                        </>
                      )}
                    </div>
                  )
                })}
                {!tagsLoading && (
                  <button className="btn-sm" onClick={()=>setTagEdits(prev=>[...prev, 'New Tag'])}>+ Add Tag</button>
                )}
                {/* Missing used tags not in vocab: quick add list */}
                <div className="mt-2">
                  <div className="text-sidebar-title" style={{ color: 'var(--gray-cont-tert)' }}>Used but not in list</div>
                  {!tagsLoading && (
                    <MissingUsed type={manageType} current={tagEdits} onAdd={(t)=>setTagEdits(prev=>[...prev, normalizeTag(t)])} />
                  )}
                </div>
              </div>
              <DialogFooter>
                <DialogClose className="btn-md">Cancel</DialogClose>
                <button className="btn-md" onClick={async()=>{
                  // Build new ordered, normalized, de-duplicated list from current edits (allow empty)
                  const base = tagEdits.slice()
                  const seen = new Set<string>()
                  const newList: string[] = []
                  base.forEach((t)=>{ const n = normalizeTag(t); const key = n.toLowerCase(); if (n && !seen.has(key)) { seen.add(key); newList.push(n) } })
                  const keep = new Set(newList.map(x=>x.toLowerCase()))
                  // Apply pruning across families server-side for consistency
                  await fetch('/api/tags/apply', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type: manageType, list: newList }) })
                  // Persist vocabulary order to KV
                  await fetch('/api/tags/vocab', { method: 'PATCH', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ type: manageType, list: newList }) })
                  setTagEdits(newList)
                  try { toast.success('Tags saved') } catch {}
                  await load()
                  // refresh vocab
                  const res = await fetch(`/api/tags/vocab?type=${manageType}`, { cache:'no-store' })
                  const data = await res.json()
                  const list = Array.isArray(data.list) ? data.list : []
                  if (manageType==='appearance') setAppearanceVocab({ Text: list, Display: list, Weirdo: list })
                  else setCategoryVocab({ Text: list, Display: list, Weirdo: list })
                  // Update global order used by catalog pages without full reload
                  if (typeof window !== 'undefined') {
                    if (manageType === 'appearance') {
                      ;(window as any).__appearanceOrder__ = list
                    } else {
                      ;(window as any).__categoryOrder__ = list
                    }
                  }
                }}>Save</button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button className="btn-md" onClick={async()=>{ try{ const res = await fetch('/api/fonts-clean/reparse-languages', { method:'POST' }); const j = await res.json(); toast.success(`Reparsed languages: ${j.updated||0} updated`) } catch(e){ console.error(e); } finally { await load() } }}>Reparse Languages</button>
          <button className="btn-md" onClick={async()=>{ try{ const res = await fetch('/api/fonts-clean/reparse-stylistic-names', { method:'POST' }); const j = await res.json(); toast.success(`Reparsed features: ${j?.stats?.updated||0} updated`) } catch(e){ console.error(e); } finally { await load() } }}>Reparse Features</button>
          <button className="btn-md" onClick={async()=>{ try{ await fetch('/api/tags/reconcile', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ removeUnused: false }) }); toast.success('Tags reconciled') } catch(e){ console.error(e) } }}>Reconcile Tags</button>
        </div>
      </header>

      {/* Upload zone (prominent, at top) */}
      <section className="p-4 rounded-md space-y-3" style={{ border: '1px dashed var(--gray-brd-prim)', background: 'var(--gray-surface-sec)' }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const files = Array.from(e.dataTransfer.files || []); if (files.length) setPendingFiles(files) }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-font-name">Upload Fonts</h2>
            <div className="text-sm" style={{ color: 'var(--gray-cont-tert)' }}>
              Drag & drop font files here or select files. Supports single static, multi-file family, and variable fonts.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input className="btn-md" placeholder="Optional family name" value={uploadFamily} onChange={e => setUploadFamily(e.target.value)} />
            <select className="btn-md" value={uploadCollection} onChange={e=> setUploadCollection(e.target.value as any)}>
              <option>Text</option>
              <option>Display</option>
              <option>Weirdo</option>
            </select>
            <label className="btn-md cursor-pointer">
              <input type="file" multiple accept=".ttf,.otf,.woff,.woff2" onChange={onUpload} style={{ display: 'none' }} />
              {uploading ? 'Uploading…' : 'Select Files'}
            </label>
          </div>
        </div>
        {pendingFiles.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-sm" style={{ color: 'var(--gray-cont-prim)' }}>{pendingFiles.length} files ready</div>
            <div className="flex gap-2">
              <button className="btn-md" onClick={() => handleFiles(pendingFiles)} disabled={uploading}>{uploading ? 'Uploading…' : 'Upload Now'}</button>
              <button className="btn-md" onClick={() => setPendingFiles([])} disabled={uploading}>Clear</button>
            </div>
          </div>
        )}
        <div className="text-xs" style={{ color: dragOver ? 'var(--gray-cont-prim)' : 'var(--gray-cont-tert)' }}>
          {dragOver ? 'Release to add to queue' : 'Parsed metadata: family, styles (weight/italic), author, version, release date, license, categories, languages, variable axes, OpenType features.'}
        </div>
      </section>

      {/* Families list */}
      <section className="space-y-3">
        {loading && <div>Loading…</div>}
        {!loading && families.map(fam => {
          const alias = `${canonicalFamilyName(fam.name)}-${shortHash(canonicalFamilyName(fam.name)).slice(0,6)}`
          const isOpen = expanded.has(fam.name)
          const ed = editing[fam.name]
          return (
            <div key={fam.name} className="p-3 rounded-md" style={{ border: '1px solid var(--gray-brd-prim)' }}>
              <div className="flex items-center justify-between">
                <button onClick={() => toggleExpand(fam.name)} className="menu-tab">
                  <span style={{ fontFamily: `"${alias}", system-ui, sans-serif`, fontWeight: 600 }}>{fam.name}</span>
                  <span style={{ color: 'var(--gray-cont-tert)', marginLeft: 8 }}>
                    • {fam.stylesCount} styles • {new Date(fam.uploadedAt || Date.now()).toLocaleDateString()}
                    {fam.foundry && (
                      <span> • {fam.foundry.length > 16 ? fam.foundry.substring(0, 16) + '...' : fam.foundry}</span>
                    )}
                  </span>
                  {fam.downloadLink && (
                    <span className="text-xs ml-2 px-2 py-0.5 rounded" style={{ border: '1px solid var(--gray-brd-prim)', color: 'var(--gray-cont-tert)' }}>
                      {(() => {
                        try {
                          return new URL(fam.downloadLink).hostname.replace(/^www\./, '')
                        } catch {
                          return 'Download'
                        }
                      })()}
                    </span>
                  )}
                </button>
                <div className="flex gap-2">
                  {!ed && <button className="btn-sm" onClick={() => startEdit(fam)}>Edit</button>}
                  <button className="btn-sm" onClick={() => deleteFamily(fam)}>Delete</button>
                </div>
              </div>
              {isOpen && (
                <div className="mt-3 space-y-3">
                  {/* Family metadata editing: name, author, download link */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                    {ed ? (
                      <input className="btn-md" placeholder="Font name" value={(ed as any).name ?? fam.name} onChange={e=> setEditing(p=>({ ...p, [fam.name]: { ...(p[fam.name]||{} as any), name: e.target.value } }))} />
                    ) : (
                      <div className="text-font-name">{fam.name}</div>
                    )}
                    {ed ? (
                      <input className="btn-md" placeholder="Author / Foundry" value={(ed as any).foundry ?? fam.foundry ?? ''} onChange={e=> setEditing(p=>({ ...p, [fam.name]: { ...(p[fam.name]||{} as any), foundry: e.target.value } }))} />
                    ) : (
                      <div className="text-author">{fam.foundry || 'Unknown'}</div>
                    )}
                    {ed ? (
                      <input className="btn-md" placeholder="Download link (https://...)" value={(ed as any).downloadLink ?? fam.downloadLink ?? ''} onChange={e=> setEditing(p=>({ ...p, [fam.name]: { ...(p[fam.name]||{} as any), downloadLink: e.target.value } }))} />
                    ) : (
                      fam.downloadLink ? <a className="btn-md" href={fam.downloadLink} target="_blank" rel="noreferrer">Open download</a> : <div className="text-sm" style={{ color: 'var(--gray-cont-tert)' }}>No download link</div>
                    )}
                  </div>
                  {/* Default style selection */}
                  <div className="flex items-center gap-2">
                    <div className="text-sidebar-title" style={{ color: 'var(--gray-cont-tert)' }}>Default style</div>
                    <select className="btn-md" onChange={(e)=> setEditing(p=>({ ...p, [fam.name]: { ...(p[fam.name]||{} as any), defaultStyleId: e.target.value } }))} defaultValue={(ed as any)?.defaultStyleId || fam.fonts.find(f => (f as any).isDefaultStyle)?.id || (fam.fonts[0]?.id || '')}>
                      {fam.fonts.map(f => (
                        <option key={f.id} value={f.id}>{f.style || 'Regular'} ({f.weight || 400}{(f as any).italicStyle ? ' Italic' : ''})</option>
                      ))}
                    </select>
                    <button className="btn-sm" onClick={async()=>{
                      const styleId = (editing[fam.name] as any)?.defaultStyleId || fam.fonts[0].id
                      try {
                        await fetch('/api/fonts-clean/set-default', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ familyName: (editing[fam.name] as any)?.name || fam.name, styleId }) })
                        toast.success('Default style saved')
                      } catch {}
                    }}>Set</button>
                  </div>
                  <div className="text-sidebar-title" style={{ color: 'var(--gray-cont-tert)' }}>Files</div>
                  <div className="text-sm" style={{ color: 'var(--gray-cont-prim)' }}>
                    {fam.fonts.map(f => (
                      <div key={f.id} className="grid grid-cols-1 md:grid-cols-6 gap-2 border-b border-[var(--gray-brd-prim)] py-1 items-center">
                        <span title="Filename" className="truncate">{f.filename}</span>
                        <input className="btn-md" defaultValue={f.style || 'Regular'} onBlur={async (e)=>{
                          const newStyle = e.currentTarget.value.trim()
                          if (!newStyle || newStyle === (f.style||'Regular')) return
                          await fetch('/api/fonts-clean/update', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id: f.id, updates: { style: newStyle } }) })
                          toast.success('Style name updated')
                          // update local
                          setFonts(prev=> prev.map(x=> x.id===f.id ? { ...x, style: newStyle } as any : x))
                        }} />
                        <span title="Weight">{f.weight || 400}{(f as any).italicStyle ? ' Italic' : ''}</span>
                        <span title="Version">{(f as any).version || '—'}</span>
                        <span title="License">{(f as any).license || '—'}</span>
                        <button className="btn-sm" onClick={async()=>{
                          if (!confirm(`Delete style ${f.style || 'Regular'}?`)) return
                          await fetch('/api/fonts-clean/delete-style', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ styleId: f.id }) })
                          toast.success('Style deleted')
                          // Refresh list
                          await load()
                        }}>Delete</button>
                      </div>
                    ))}
                  </div>
                  {/* Collection row */}
                  <div className="flex gap-2 flex-wrap items-center">
                    <div className="text-sidebar-title" style={{ color: 'var(--gray-cont-tert)' }}>Collection</div>
                    {(['Text','Display','Weirdo'] as const).map(c => (
                      <button key={c} className={`btn-sm ${ (editing[fam.name]?.collection ?? fam.collection) === c ? 'active' : '' }`} onClick={()=>{
                        if (!editing[fam.name]) startEdit(fam)
                        setEditing(p=>({ ...p, [fam.name]: { ...(p[fam.name]||{ collection: fam.collection, styleTags: fam.styleTags, languages: fam.languages }), collection: c }}))
                      }}>{c}</button>
                    ))}
                  </div>

                  {/* Languages row */}
                  <div className="flex gap-2 flex-wrap items-center">
                    <div className="text-sidebar-title" style={{ color: 'var(--gray-cont-tert)' }}>Languages</div>
                    {languageVocabulary.map(l => (
                      <button key={l} className={`btn-sm ${ (editing[fam.name]?.languages ?? fam.languages).includes(l) ? 'active' : '' }`} onClick={()=>{
                        const base = editing[fam.name]?.languages ?? fam.languages
                        const next = base.includes(l) ? base.filter(x=>x!==l) : [...base, l]
                        if (!editing[fam.name]) startEdit(fam)
                        setEditing(p=>({ ...p, [fam.name]: { ...(p[fam.name]||{ collection: fam.collection, styleTags: fam.styleTags, languages: fam.languages }), languages: next }}))
                      }}>{l}</button>
                    ))}
                  </div>

                  {/* Category row */}
                  <div className="flex gap-2 flex-wrap items-center">
                    <div className="text-sidebar-title" style={{ color: 'var(--gray-cont-tert)' }}>Category</div>
                    {categoryVocab[(editing[fam.name]?.collection ?? fam.collection)]?.map(t => (
                      <button key={t} className={`btn-sm ${ (((editing[fam.name] as any)?.category ?? (fam as any).category ?? []) as string[]).map((x:string)=>String(x||'').toLowerCase()).includes(String(t||'').toLowerCase()) ? 'active' : '' }`} onClick={()=>{
                        const base = ((((editing[fam.name] as any)?.category ?? (fam as any).category) || []) as string[]).map(x=>String(x||''))
                        const has = base.map(x=>x.toLowerCase()).includes(String(t||'').toLowerCase())
                        const next = has ? base.filter(x=>x.toLowerCase()!==String(t||'').toLowerCase()) : [...base, t]
                        if (!editing[fam.name]) startEdit(fam)
                        setEditing(p=>({ ...p, [fam.name]: { ...(p[fam.name]||{ collection: fam.collection, styleTags: fam.styleTags, languages: fam.languages }), category: next }}))
                      }}>{t}</button>
                    ))}
                  </div>

                  {/* Appearance row */}
                  <div className="flex gap-2 flex-wrap items-center">
                    <div className="text-sidebar-title" style={{ color: 'var(--gray-cont-tert)' }}>Appearance</div>
                    {appearanceVocab[(editing[fam.name]?.collection ?? fam.collection)]?.map(t => (
                      <button key={t} className={`btn-sm ${ (editing[fam.name]?.styleTags ?? fam.styleTags).map(x=>String(x||'').toLowerCase()).includes(String(t||'').toLowerCase()) ? 'active' : '' }`} onClick={()=>{
                        const base = (editing[fam.name]?.styleTags ?? fam.styleTags).map(x=>String(x||''))
                        const normalized = normalizeTag(t)
                        const has = base.map(x=>x.toLowerCase()).includes(normalized.toLowerCase())
                        const next = has ? base.filter(x=>x.toLowerCase()!==normalized.toLowerCase()) : [...base, normalized]
                        if (!editing[fam.name]) startEdit(fam)
                        setEditing(p=>({ ...p, [fam.name]: { ...(p[fam.name]||{ collection: fam.collection, styleTags: fam.styleTags, languages: fam.languages }), styleTags: next }}))
                      }}>{t}</button>
                    ))}
                  </div>
                  {ed && (
                    <div className="flex gap-2">
                      <button className="btn-md" onClick={() => {
                        // If category edited, persist alongside other fields
                        const edState = editing[fam.name]
                        if (edState?.category) {
                          fam.fonts.forEach(font=>{
                            fetch('/api/fonts-clean/update', { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: font.id, updates: { category: edState.category } }) })
                          })
                        }
                        saveEdit(fam)
                      }}>Save</button>
                      <button className="btn-md" onClick={() => setEditing(p => { const c = { ...p }; delete c[fam.name]; return c })}>Cancel</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </section>

      {/* Upload zone */}
      <section className="p-4 rounded-md" style={{ border: '1px solid var(--gray-brd-prim)' }}>
        <h2 className="text-font-name mb-2">Upload Fonts</h2>
        <div className="text-sm mb-2" style={{ color: 'var(--gray-cont-tert)' }}>
          Supports single static file, multi-file family, single variable font, or multi-file variable family.
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input className="btn-md flex-1" placeholder="Optional: Group files under family name" value={uploadFamily} onChange={e => setUploadFamily(e.target.value)} />
          <label className="btn-md cursor-pointer">
            <input type="file" multiple accept=".ttf,.otf,.woff,.woff2" onChange={onUpload} style={{ display: 'none' }} />
            {uploading ? 'Uploading…' : 'Select Files'}
          </label>
        </div>
        <div className="text-xs" style={{ color: 'var(--gray-cont-tert)' }}>
          Files are parsed for family name, styles (weight, italic), author, version, release date, license, categories, language support, variable axes, and OpenType features.
        </div>
      </section>
    </main>
  )
}

function MissingUsed({ type, current, onAdd }: { type: 'appearance'|'category', current: string[], onAdd: (t:string)=>void }) {
  const [missing, setMissing] = useState<string[]>([])
  useEffect(()=>{
    (async ()=>{
      try {
        const res = await fetch(`/api/tags/summary?type=${type}`, { cache:'no-store' })
        const data = await res.json()
        const currL = (current||[]).map(x=>x.toLowerCase())
        const miss = (Array.isArray(data.missing)? data.missing:[]).filter((t:string)=>!currL.includes(t.toLowerCase()))
        setMissing(miss)
      } catch { setMissing([]) }
    })()
  }, [type, JSON.stringify(current)])
  if (!missing.length) return null
  return (
    <div className="flex gap-1 flex-wrap mt-1">
      {missing.map((t)=>(<button key={t} className="btn-sm" onClick={()=>onAdd(t)}>+ {t}</button>))}
    </div>
  )
}
