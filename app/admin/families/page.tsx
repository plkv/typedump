"use client"

import { useEffect, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { FontFamily } from '@/lib/models/FontFamily'

export default function FamilyAdmin() {
  const [families, setFamilies] = useState<FontFamily[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Record<string, Partial<FontFamily>>>({})
  const [migrationStatus, setMigrationStatus] = useState<'pending' | 'migrating' | 'complete'>('pending')

  const loadFamilies = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/families-v2?t=${Date.now()}`, { cache: 'no-store' })
      const data = await res.json()
      if (data.success) {
        setFamilies(data.families)
        if (data.families.length > 0) {
          setMigrationStatus('complete')
        }
      }
    } catch (error) {
      console.error('Failed to load families:', error)
    } finally {
      setLoading(false)
    }
  }

  const migrateData = async () => {
    if (migrationStatus === 'migrating') return

    setMigrationStatus('migrating')
    try {
      const res = await fetch('/api/families-v2/migrate', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success(`Migration complete: ${data.result.families} families, ${data.result.variants} variants`)
        setMigrationStatus('complete')
        await loadFamilies()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Migration failed:', error)
      toast.error(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setMigrationStatus('pending')
    }
  }

  const saveFamily = async (family: FontFamily) => {
    const edits = editing[family.id]
    if (!edits) return

    try {
      const res = await fetch(`/api/families-v2/${family.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: edits })
      })

      if (res.ok) {
        toast.success('Family updated successfully')
        setEditing(prev => {
          const updated = { ...prev }
          delete updated[family.id]
          return updated
        })
        await loadFamilies()
      } else {
        const error = await res.json()
        throw new Error(error.error)
      }
    } catch (error) {
      console.error('Save failed:', error)
      toast.error(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const deleteFamily = async (family: FontFamily) => {
    if (!confirm(`Delete family "${family.name}" and all its variants?`)) return

    try {
      const res = await fetch(`/api/families-v2/${family.id}`, { method: 'DELETE' })

      if (res.ok) {
        toast.success('Family deleted successfully')
        await loadFamilies()
      } else {
        const error = await res.json()
        throw new Error(error.error)
      }
    } catch (error) {
      console.error('Delete failed:', error)
      toast.error(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const updateEditing = (familyId: string, field: string, value: any) => {
    setEditing(prev => ({
      ...prev,
      [familyId]: {
        ...prev[familyId],
        [field]: value
      }
    }))
  }

  useEffect(() => {
    loadFamilies()
  }, [])

  return (
    <div className="min-h-screen" style={{ background: 'var(--gray-surface-prim)', color: 'var(--gray-cont-prim)' }}>
      <Toaster richColors />

      <header className="border-b p-4" style={{ borderColor: 'var(--gray-brd-prim)' }}>
        <h1 className="text-2xl font-bold">Family-Level Font Management</h1>
        <p style={{ color: 'var(--gray-cont-tert)' }}>Manage font families as first-class entities</p>
      </header>

      <div className="p-4 space-y-6">
        {/* Migration Section */}
        {migrationStatus !== 'complete' && (
          <div className="p-4 rounded border" style={{ borderColor: 'var(--gray-brd-prim)', background: 'var(--gray-surface-sec)' }}>
            <h2 className="text-lg font-semibold mb-2">Data Migration</h2>
            <p className="mb-4" style={{ color: 'var(--gray-cont-sec)' }}>
              Convert your existing file-first data to family-first structure for better organization.
            </p>
            <button
              className="btn-md bg-blue-600 hover:bg-blue-700 text-white"
              onClick={migrateData}
              disabled={migrationStatus === 'migrating'}
            >
              {migrationStatus === 'migrating' ? 'Migrating...' : 'Start Migration'}
            </button>
          </div>
        )}

        {/* Families List */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Font Families ({families.length})</h2>
            <button className="btn-md" onClick={loadFamilies} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          <div className="space-y-4">
            {families.map(family => {
              const isEditing = !!editing[family.id]
              const edits = editing[family.id] || {}

              return (
                <div key={family.id} className="p-4 rounded border" style={{ borderColor: 'var(--gray-brd-prim)', background: 'var(--gray-surface-sec)' }}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Left Column - Family Info */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Family Name</label>
                        {isEditing ? (
                          <input
                            className="w-full p-2 rounded border"
                            style={{ borderColor: 'var(--gray-brd-prim)', background: 'var(--gray-surface-prim)' }}
                            value={edits.name ?? family.name}
                            onChange={(e) => updateEditing(family.id, 'name', e.target.value)}
                          />
                        ) : (
                          <div className="text-lg font-semibold">{family.name}</div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Collection</label>
                        {isEditing ? (
                          <select
                            className="w-full p-2 rounded border"
                            style={{ borderColor: 'var(--gray-brd-prim)', background: 'var(--gray-surface-prim)' }}
                            value={edits.collection ?? family.collection}
                            onChange={(e) => updateEditing(family.id, 'collection', e.target.value)}
                          >
                            <option value="Text">Text</option>
                            <option value="Display">Display</option>
                            <option value="Brutal">Brutal</option>
                          </select>
                        ) : (
                          <span className="px-2 py-1 rounded text-sm" style={{ background: 'var(--gray-surface-tert)' }}>
                            {family.collection}
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Foundry</label>
                        {isEditing ? (
                          <input
                            className="w-full p-2 rounded border"
                            style={{ borderColor: 'var(--gray-brd-prim)', background: 'var(--gray-surface-prim)' }}
                            value={edits.foundry ?? family.foundry}
                            onChange={(e) => updateEditing(family.id, 'foundry', e.target.value)}
                          />
                        ) : (
                          <div>{family.foundry}</div>
                        )}
                      </div>
                    </div>

                    {/* Right Column - Tags & Metadata */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Style Tags</label>
                        {isEditing ? (
                          <input
                            className="w-full p-2 rounded border"
                            style={{ borderColor: 'var(--gray-brd-prim)', background: 'var(--gray-surface-prim)' }}
                            value={(edits.styleTags ?? family.styleTags).join(', ')}
                            onChange={(e) => updateEditing(family.id, 'styleTags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                            placeholder="Sans Serif, Modern, Clean"
                          />
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {family.styleTags.map(tag => (
                              <span key={tag} className="px-2 py-1 rounded text-xs" style={{ background: 'var(--gray-surface-tert)' }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Languages</label>
                        {isEditing ? (
                          <input
                            className="w-full p-2 rounded border"
                            style={{ borderColor: 'var(--gray-brd-prim)', background: 'var(--gray-surface-prim)' }}
                            value={(edits.languages ?? family.languages).join(', ')}
                            onChange={(e) => updateEditing(family.id, 'languages', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                            placeholder="Latin, Cyrillic, Greek"
                          />
                        ) : (
                          <div>{family.languages.join(', ')}</div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Categories</label>
                        {isEditing ? (
                          <input
                            className="w-full p-2 rounded border"
                            style={{ borderColor: 'var(--gray-brd-prim)', background: 'var(--gray-surface-prim)' }}
                            value={(edits.category ?? family.category).join(', ')}
                            onChange={(e) => updateEditing(family.id, 'category', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                            placeholder="Sans, Display, Modern"
                          />
                        ) : (
                          <div>{family.category.join(', ')}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Variants */}
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--gray-brd-sec)' }}>
                    <h4 className="font-medium mb-2">Variants ({family.variants.length})</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                      {family.variants.map(variant => (
                        <div key={variant.id} className="p-2 rounded" style={{ background: 'var(--gray-surface-tert)' }}>
                          <div className="font-medium">{variant.styleName}</div>
                          <div style={{ color: 'var(--gray-cont-tert)' }}>
                            {variant.weight}{variant.isItalic ? ' Italic' : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--gray-brd-sec)' }}>
                    {isEditing ? (
                      <>
                        <button
                          className="btn-md bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => saveFamily(family)}
                        >
                          Save
                        </button>
                        <button
                          className="btn-md"
                          onClick={() => setEditing(prev => {
                            const updated = { ...prev }
                            delete updated[family.id]
                            return updated
                          })}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn-md"
                          onClick={() => setEditing(prev => ({ ...prev, [family.id]: {} }))}
                        >
                          Edit Family
                        </button>
                        <button
                          className="btn-md bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => deleteFamily(family)}
                        >
                          Delete Family
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {families.length === 0 && !loading && (
            <div className="text-center py-12" style={{ color: 'var(--gray-cont-tert)' }}>
              <p>No families found. Run migration to convert existing fonts to family structure.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}