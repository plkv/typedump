"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, ChevronRight, Trash2, Upload, Edit2, Save, X } from "lucide-react"
import { toast } from "sonner"

interface FontFile {
  name: string
  family: string
  style: string
  weight: number
  isVariable: boolean
  format: string
  fileSize: number
  uploadedAt: string
  filename: string
  url?: string
  category: string
  foundry: string
  languages: string[]
  openTypeFeatures: string[]
  variableAxes?: Array<{
    name: string
    axis: string
    min: number
    max: number
    default: number
  }>
  downloadLink?: string
  defaultStyle?: boolean
  styleName?: string
}

interface FontFamily {
  name: string
  fonts: FontFile[]
  // Derived properties from fonts in family
  category: string
  foundry: string
  languages: string[]
  isVariable: boolean
  totalSize: number
  openTypeFeatures: string[]
  downloadLink?: string
}

interface FontFamilyAccordionProps {
  fontFamilies: FontFamily[]
  darkMode: boolean
  onFontUpdate: (filename: string, updates: Partial<FontFile>) => Promise<void>
  onFontDelete: (filename: string) => Promise<void>
  onFamilyUpdate: (familyName: string, updates: Partial<FontFamily>) => Promise<void>
  onFamilyDelete: (familyName: string) => Promise<void>
  onUploadToFamily: (familyName: string, file: File) => Promise<void>
}

const CATEGORIES = [
  "Sans Serif", "Serif", "Monospace", "Display", "Script", "Handwriting", "Pixel", "Symbol", "Decorative"
]

const LANGUAGES = [
  "Latin", "Cyrillic", "Greek", "Arabic", "Hebrew", "Armenian", "Georgian", "Thai", "Vietnamese", 
  "Chinese", "Japanese", "Korean", "Hindi", "Bengali", "Tamil", "Gujarati"
]

const WEIGHT_OPTIONS = [
  { name: "Thin", value: 100 },
  { name: "Extra Light", value: 200 },
  { name: "Light", value: 300 },
  { name: "Regular", value: 400 },
  { name: "Medium", value: 500 },
  { name: "Semi Bold", value: 600 },
  { name: "Bold", value: 700 },
  { name: "Extra Bold", value: 800 },
  { name: "Black", value: 900 }
]

export default function FontFamilyAccordion({
  fontFamilies,
  darkMode,
  onFontUpdate,
  onFontDelete,
  onFamilyUpdate,
  onFamilyDelete,
  onUploadToFamily
}: FontFamilyAccordionProps) {
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set())
  const [editingFamily, setEditingFamily] = useState<string | null>(null)
  const [editingFont, setEditingFont] = useState<string | null>(null)
  const [familyEdits, setFamilyEdits] = useState<Partial<FontFamily>>({})
  const [fontEdits, setFontEdits] = useState<Partial<FontFile>>({})
  const [uploading, setUploading] = useState<string | null>(null)


  const toggleFamily = (familyName: string) => {
    const newExpanded = new Set(expandedFamilies)
    if (newExpanded.has(familyName)) {
      newExpanded.delete(familyName)
    } else {
      newExpanded.add(familyName)
    }
    setExpandedFamilies(newExpanded)
  }

  const startEditingFamily = (family: FontFamily) => {
    setEditingFamily(family.name)
    setFamilyEdits({
      name: family.name,
      category: family.category,
      foundry: family.foundry,
      languages: family.languages,
      downloadLink: family.downloadLink
    })
  }

  const saveFamily = async (familyName: string) => {
    console.log('🔧 Saving family:', familyName, 'with edits:', familyEdits)
    
    // Find the original family data to compare changes
    const originalFamily = fontFamilies.find(f => f.name === familyName)
    if (!originalFamily) {
      console.error('❌ Original family not found:', familyName)
      toast.error("Family not found")
      return
    }
    
    // Only include fields that actually changed
    const changes: any = {}
    if (familyEdits.name && familyEdits.name !== originalFamily.name) {
      changes.name = familyEdits.name
    }
    if (familyEdits.foundry && familyEdits.foundry !== originalFamily.foundry) {
      changes.foundry = familyEdits.foundry
    }
    if (familyEdits.category && familyEdits.category !== originalFamily.category) {
      changes.category = familyEdits.category  
    }
    if (familyEdits.languages && JSON.stringify(familyEdits.languages) !== JSON.stringify(originalFamily.languages)) {
      changes.languages = familyEdits.languages
    }
    if (familyEdits.downloadLink !== originalFamily.downloadLink) {
      changes.downloadLink = familyEdits.downloadLink
    }
    
    console.log('🔍 Detected changes:', changes)
    console.log('🔍 Original data:', originalFamily)
    
    if (Object.keys(changes).length === 0) {
      console.warn('⚠️ No actual changes detected')
      toast.info("No changes to save")
      return
    }
    
    try {
      await onFamilyUpdate(familyName, changes)
      setEditingFamily(null)
      setFamilyEdits({})
      toast.success("Family updated successfully")
    } catch (error) {
      console.error('❌ Family save error:', error)
      toast.error("Failed to update family")
    }
  }

  const cancelFamilyEdit = () => {
    setEditingFamily(null)
    setFamilyEdits({})
  }

  const startEditingFont = (font: FontFile) => {
    setEditingFont(font.filename)
    setFontEdits({
      name: font.name,
      weight: font.weight,
      style: font.style
    })
  }

  const saveFont = async (filename: string) => {
    try {
      await onFontUpdate(filename, fontEdits)
      setEditingFont(null)
      setFontEdits({})
      toast.success("Font updated successfully")
    } catch (error) {
      toast.error("Failed to update font")
    }
  }

  const cancelFontEdit = () => {
    setEditingFont(null)
    setFontEdits({})
  }

  const handleUploadToFamily = async (familyName: string, file: File) => {
    setUploading(familyName)
    try {
      await onUploadToFamily(familyName, file)
      toast.success("Font added to family successfully")
    } catch (error) {
      toast.error("Failed to add font to family")
    } finally {
      setUploading(null)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB'
    return Math.round(bytes / (1024 * 1024)) + ' MB'
  }

  const getFontFamilyStyle = (family: FontFamily) => {
    // Try to use one of the fonts from the family for display
    const font = family.fonts[0]
    if (font?.url) {
      return {
        fontFamily: `"${family.name}", sans-serif`
      }
    }
    return {}
  }

  return (
    <div className="space-y-4">
      {fontFamilies.map((family) => {
        const isExpanded = expandedFamilies.has(family.name)
        const isEditingThisFamily = editingFamily === family.name

        return (
          <div key={family.name} className={`rounded-lg border transition-all duration-200 bg-card border-border ${isExpanded ? 'ring-2 ring-blue-500/20' : ''}`}>
            
            {/* Family Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFamily(family.name)}
                    className="p-1"
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </Button>

                  {isEditingThisFamily ? (
                    <input
                      type="text"
                      value={familyEdits.name || family.name}
                      onChange={(e) => setFamilyEdits(prev => ({ ...prev, name: e.target.value }))}
                      className="text-xl font-semibold bg-transparent border border-border rounded px-2 py-1 text-card-foreground"
                      style={getFontFamilyStyle(family)}
                    />
                  ) : (
                    <h3 
                      className="text-xl font-semibold text-card-foreground"
                      style={getFontFamilyStyle(family)}
                    >
                      {family.name}
                    </h3>
                  )}

                  <Badge variant="secondary">{family.fonts.length} font{family.fonts.length !== 1 ? 's' : ''}</Badge>
                  <Badge>{family.category}</Badge>
                  {family.isVariable && <Badge variant="outline">Variable</Badge>}
                </div>

                <div className="flex items-center gap-2">
                  {isEditingThisFamily ? (
                    <>
                      <Button size="sm" onClick={() => saveFamily(family.name)} className="gap-1">
                        <Save className="w-3 h-3" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelFamilyEdit} className="gap-1">
                        <X className="w-3 h-3" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => startEditingFamily(family)} className="gap-1">
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          console.log('🔍 Family delete button clicked for:', family.name)
                          onFamilyDelete(family.name)
                        }}
                        className="gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete Family
                      </Button>
                      <div>
                        <input
                          type="file"
                          accept=".ttf,.otf,.woff,.woff2"
                          id={`upload-${family.name}`}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleUploadToFamily(family.name, file)
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => document.getElementById(`upload-${family.name}`)?.click()}
                          disabled={uploading === family.name}
                          className="gap-1"
                        >
                          <Upload className="w-3 h-3" />
                          {uploading === family.name ? 'Adding...' : 'Add Font'}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Family Info */}
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className={`font-medium text-muted-foreground`}>Author/Foundry</div>
                  {isEditingThisFamily ? (
                    <input
                      type="text"
                      value={familyEdits.foundry || family.foundry}
                      onChange={(e) => setFamilyEdits(prev => ({ ...prev, foundry: e.target.value }))}
                      className="bg-transparent border border-border rounded px-1 py-0.5 w-full"
                    />
                  ) : (
                    <div>{family.foundry}</div>
                  )}
                </div>
                <div>
                  <div className={`font-medium text-muted-foreground`}>Category</div>
                  {isEditingThisFamily ? (
                    <Select 
                      value={familyEdits.category || family.category} 
                      onValueChange={(value) => setFamilyEdits(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger className="h-6 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div>{family.category}</div>
                  )}
                </div>
                <div>
                  <div className={`font-medium text-muted-foreground`}>Total Size</div>
                  <div>{formatFileSize(family.totalSize)}</div>
                </div>
                <div>
                  <div className={`font-medium text-muted-foreground`}>Type</div>
                  <div>{family.isVariable ? 'Variable' : 'Static'}</div>
                </div>
              </div>

              {/* Language Support */}
              <div className="mt-3">
                <div className={`text-xs font-medium mb-1 text-muted-foreground`}>
                  Language Support
                </div>
                {isEditingThisFamily ? (
                  <div className="flex flex-wrap gap-1">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang}
                        onClick={() => {
                          const currentLangs = familyEdits.languages || family.languages
                          const newLangs = currentLangs.includes(lang)
                            ? currentLangs.filter(l => l !== lang)
                            : [...currentLangs, lang]
                          setFamilyEdits(prev => ({ ...prev, languages: newLangs }))
                        }}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                          (familyEdits.languages || family.languages).includes(lang)
                            ? 'ds-bg-fill-2 ds-border ds-text-prim'
                            : 'ds-bg-surface-2 ds-border ds-text-sec ds-hover-fill-1'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {family.languages.slice(0, 8).map(lang => (
                      <Badge key={lang} variant="outline" className="text-xs">{lang}</Badge>
                    ))}
                    {family.languages.length > 8 && (
                      <Badge variant="outline" className="text-xs">+{family.languages.length - 8} more</Badge>
                    )}
                  </div>
                )}
              </div>

              {/* OpenType Features */}
              <div className="mt-3">
                <div className={`text-xs font-medium mb-1 text-muted-foreground`}>
                  OpenType Features
                </div>
                <div className="flex flex-wrap gap-1">
                  {family.openTypeFeatures.slice(0, 8).map(feature => (
                    <Badge key={feature} variant="outline" className="text-xs">{feature}</Badge>
                  ))}
                  {family.openTypeFeatures.length > 8 && (
                    <Badge variant="outline" className="text-xs">+{family.openTypeFeatures.length - 8} more</Badge>
                  )}
                </div>
              </div>

              {/* Variable Axes Info */}
              {family.isVariable && family.fonts[0]?.variableAxes && (
                <div className="mt-3">
                  <div className={`text-xs font-medium mb-1 text-muted-foreground`}>
                    Variable Axes
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {family.fonts[0].variableAxes.map(axis => (
                      <Badge key={axis.axis} variant="outline" className="text-xs">
                        {axis.name} ({axis.min}-{axis.max})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Download Link */}
              {isEditingThisFamily && (
                <div className="mt-3">
                  <div className={`text-xs font-medium mb-1 ${darkMode ? 'text-stone-400' : 'text-gray-500'}`}>
                    Download Link (Optional)
                  </div>
                  <input
                    type="url"
                    value={familyEdits.downloadLink || family.downloadLink || ''}
                    onChange={(e) => setFamilyEdits(prev => ({ ...prev, downloadLink: e.target.value }))}
                    placeholder="https://..."
                    className="w-full bg-transparent border border-stone-600 rounded px-2 py-1 text-sm"
                  />
                </div>
              )}
            </div>

            {/* Individual Fonts */}
            {isExpanded && (
              <div className="p-4 space-y-3">
                <div className={`text-sm font-medium ${darkMode ? 'text-stone-300' : 'text-gray-700'}`}>
                  Individual Fonts ({family.fonts.length})
                </div>
                
                {family.fonts.map((font) => {
                  console.log(`🔍 Rendering font:`, font.filename, 'style:', font.style, 'weight:', font.weight)
                  const isEditingThisFont = editingFont === font.filename

                  return (
                    <div
                      key={`${font.filename}-${font.style}-${Date.now()}`}
                      className={`p-3 rounded border ${darkMode ? 'bg-stone-750 border-stone-600' : 'bg-gray-50 border-gray-200'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isEditingThisFont ? (
                            <input
                              type="text"
                              value={fontEdits.name || font.name}
                              onChange={(e) => setFontEdits(prev => ({ ...prev, name: e.target.value }))}
                              className="font-medium bg-transparent border border-stone-600 rounded px-1 py-0.5"
                            />
                          ) : (
                            <span className="font-medium">{font.name}</span>
                          )}
                          
                          {font.defaultStyle && (
                            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-300">
                              DEFAULT
                            </Badge>
                          )}

                          {isEditingThisFont ? (
                            <Select 
                              value={String(fontEdits.weight || font.weight)} 
                              onValueChange={(value) => setFontEdits(prev => ({ ...prev, weight: parseInt(value) }))}
                            >
                              <SelectTrigger className="w-32 h-6 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {WEIGHT_OPTIONS.map(weight => (
                                  <SelectItem key={weight.value} value={String(weight.value)}>
                                    {weight.name} ({weight.value})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="secondary" key={`${font.filename}-${font.style}-${font.weight}`}>
                              {font.style} ({font.weight})
                            </Badge>
                          )}

                          <Badge variant="outline">{font.format.toUpperCase()}</Badge>
                          <Badge variant="outline">{formatFileSize(font.fileSize)}</Badge>
                        </div>

                        <div className="flex items-center gap-2">
                          {isEditingThisFont ? (
                            <>
                              <Button size="sm" onClick={() => saveFont(font.filename)} className="gap-1">
                                <Save className="w-3 h-3" />
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelFontEdit} className="gap-1">
                                <X className="w-3 h-3" />
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => startEditingFont(font)} className="gap-1">
                                <Edit2 className="w-3 h-3" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  console.log('🔍 Delete button clicked for:', font.filename)
                                  onFontDelete(font.filename)
                                }}
                                className="gap-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Variable Font Axes Editing */}
                      {isEditingThisFont && font.isVariable && font.variableAxes && font.variableAxes.length > 0 && (
                        <div className="mt-3 p-3 border rounded bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700">
                          <div className="text-sm font-medium mb-3 text-stone-700 dark:text-stone-300">
                            Variable Font Axes
                          </div>
                          <div className="space-y-3">
                            {font.variableAxes.map((axis, index) => (
                              <div key={axis.axis} className="grid grid-cols-4 gap-3 items-center">
                                <div>
                                  <label className="text-xs text-stone-600 dark:text-stone-400 mb-1 block">
                                    Axis Name
                                  </label>
                                  <input
                                    type="text"
                                    value={(fontEdits.variableAxes?.[index]?.name) ?? axis.name}
                                    onChange={(e) => {
                                      const newAxes = [...(fontEdits.variableAxes || font.variableAxes || [])]
                                      newAxes[index] = { ...newAxes[index], name: e.target.value }
                                      setFontEdits(prev => ({ ...prev, variableAxes: newAxes }))
                                    }}
                                    className="w-full px-2 py-1 text-xs border rounded border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700"
                                    placeholder="Axis Name"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-stone-600 dark:text-stone-400 mb-1 block">
                                    Tag
                                  </label>
                                  <input
                                    type="text"
                                    value={axis.axis}
                                    disabled
                                    className="w-full px-2 py-1 text-xs border rounded border-stone-300 dark:border-stone-600 bg-stone-100 dark:bg-stone-800 text-stone-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-stone-600 dark:text-stone-400 mb-1 block">
                                    Range
                                  </label>
                                  <div className="text-xs text-stone-600 dark:text-stone-400 px-2 py-1">
                                    {axis.min}–{axis.max}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs text-stone-600 dark:text-stone-400 mb-1 block">
                                    Default Value
                                  </label>
                                  <input
                                    type="number"
                                    value={(fontEdits.variableAxes?.[index]?.default) ?? axis.default}
                                    onChange={(e) => {
                                      const newAxes = [...(fontEdits.variableAxes || font.variableAxes || [])]
                                      newAxes[index] = { ...newAxes[index], default: Number(e.target.value) }
                                      setFontEdits(prev => ({ ...prev, variableAxes: newAxes }))
                                    }}
                                    min={axis.min}
                                    max={axis.max}
                                    className="w-full px-2 py-1 text-xs border rounded border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Style Name Editing */}
                      {isEditingThisFont && (
                        <div className="mt-3 p-3 border rounded bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-stone-600 dark:text-stone-400 mb-1 block">
                                Style Name Override
                              </label>
                              <input
                                type="text"
                                value={fontEdits.styleName ?? font.styleName ?? ''}
                                onChange={(e) => setFontEdits(prev => ({ ...prev, styleName: e.target.value }))}
                                className="w-full px-2 py-1 text-xs border rounded border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700"
                                placeholder={`Default: ${font.style}`}
                              />
                            </div>
                            <div className="flex items-end">
                              <label className="flex items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={fontEdits.defaultStyle ?? font.defaultStyle ?? false}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      // If setting as default, warn about other defaults in family
                                      const otherDefaults = family.fonts.filter(f => 
                                        f.filename !== font.filename && f.defaultStyle
                                      )
                                      if (otherDefaults.length > 0) {
                                        const proceed = confirm(`This will remove default status from ${otherDefaults.length} other font(s) in this family. Continue?`)
                                        if (!proceed) return
                                      }
                                    }
                                    setFontEdits(prev => ({ ...prev, defaultStyle: e.target.checked }))
                                  }}
                                  className="rounded"
                                />
                                <span className="text-stone-600 dark:text-stone-400">
                                  Set as default style for family
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Font Preview */}
                      <div className="mt-3">
                        <div 
                          className="text-lg leading-relaxed"
                          style={{
                            fontFamily: font.url ? `"${font.family}-${font.filename}", sans-serif` : 'sans-serif',
                            fontWeight: font.weight,
                            fontStyle: font.style.toLowerCase().includes('italic') || font.style.toLowerCase().includes('oblique') ? 'italic' : 'normal'
                          }}
                        >
                          The quick brown fox jumps over the lazy dog
                        </div>
                        {font.url && (
                          <style>
                            {`@font-face {
                              font-family: "${font.family}-${font.filename}";
                              src: url("${font.url}") format("${font.format === 'otf' ? 'opentype' : font.format}");
                              font-weight: ${font.weight};
                              font-style: ${font.style.toLowerCase().includes('italic') || font.style.toLowerCase().includes('oblique') ? 'italic' : 'normal'};
                            }`}
                          </style>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}