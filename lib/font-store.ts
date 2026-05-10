/**
 * Centralized Font Store - Replaces 20+ useState hooks
 * Single source of truth for all font-related state
 */

import { create } from 'zustand'
import { FontFamily, FontFamilyUtils } from './models/FontFamily'
import { FontVariant, FontVariantUtils } from './models/FontVariant'

// Filter state interfaces
export interface FilterState {
  selectedCategories: string[]
  selectedStyles: string[]
  selectedLanguages: string[]
  selectedWeights: number[]
  selectedCollection: 'Text' | 'Display' | 'Weirdo'
}

export interface PreviewState {
  customText: string
  selectedPreset: string
  textSize: number
  lineHeight: number
  viewMode: 'grid' | 'list'
  sortBy: string
  sortDirection: 'asc' | 'desc'
  
  // Font-specific settings
  fontWeightSelections: Record<string, { weight: number; italic: boolean }>
  fontOTFeatures: Record<string, Record<string, boolean>>
  fontVariableAxes: Record<string, Record<string, number>>
  
  // Cursor state for controlled inputs
  textCursorPosition: number
}

export interface UIState {
  sidebarOpen: boolean
  isLoadingFonts: boolean
  expandedCards: Set<string>
  editingElementRef: HTMLDivElement | null
}

// Computed data types
export interface ComputedFontData {
  id: string
  name: string
  family: FontFamily
  defaultVariant: FontVariant
  availableWeights: number[]
  hasItalic: boolean
  isVariable: boolean
  
  // For UI compatibility with existing components
  fontFamily: string
  url: string
  styles: number
  category: string
  author: string
  type: 'Variable' | 'Static'
  collection: 'Text' | 'Display' | 'Weirdo'
  styleTags: string[]
  categories: string[]
  languages: string[]
  variableAxes?: FontVariant['variableAxes']
  openTypeFeatures: string[]
}

interface FontStore {
  // Core data
  families: FontFamily[]
  
  // State
  filters: FilterState
  preview: PreviewState
  ui: UIState
  
  // Actions
  loadFonts: () => Promise<void>
  updateFamily: (familyId: string, updates: Partial<FontFamily>) => void
  updateVariant: (variantId: string, updates: Partial<FontVariant>) => void
  
  // Filter actions
  setSelectedCollection: (collection: 'Text' | 'Display' | 'Weirdo') => void
  toggleCategory: (category: string) => void
  toggleStyle: (style: string) => void
  toggleLanguage: (language: string) => void
  toggleWeight: (weight: number) => void
  clearFilters: () => void
  
  // Preview actions
  setCustomText: (text: string, cursorPosition?: number) => void
  setSelectedPreset: (preset: string) => void
  setTextSize: (size: number) => void
  setLineHeight: (height: number) => void
  setViewMode: (mode: 'grid' | 'list') => void
  setSortBy: (sortBy: string, direction?: 'asc' | 'desc') => void
  
  // Font control actions
  setFontWeight: (familyId: string, weight: number, italic: boolean) => void
  toggleOTFeature: (familyId: string, feature: string) => void
  setVariableAxis: (familyId: string, axis: string, value: number) => void
  
  // UI actions
  setSidebarOpen: (open: boolean) => void
  toggleExpandedCard: (familyId: string) => void
  setEditingElementRef: (ref: HTMLDivElement | null) => void
  
  // Computed selectors (eliminate filter bugs)
  getFilteredFamilies: () => ComputedFontData[]
  getAvailableCategories: () => string[]
  getAvailableStyles: () => string[]
  getAvailableLanguages: () => string[]
  getAvailableWeights: () => number[]
}

const initialFilterState: FilterState = {
  selectedCategories: [],
  selectedStyles: [],
  selectedLanguages: [],
  selectedWeights: [],
  selectedCollection: 'Text'
}

const initialPreviewState: PreviewState = {
  customText: '',
  selectedPreset: 'Names',
  textSize: 72,
  lineHeight: 120,
  viewMode: 'list',
  sortBy: 'Date',
  sortDirection: 'desc',
  fontWeightSelections: {},
  fontOTFeatures: {},
  fontVariableAxes: {},
  textCursorPosition: 0
}

const initialUIState: UIState = {
  sidebarOpen: true,
  isLoadingFonts: false,
  expandedCards: new Set(),
  editingElementRef: null
}

export const useFontStore = create<FontStore>((set, get) => ({
  // Initial state
  families: [],
  filters: initialFilterState,
  preview: initialPreviewState,
  ui: initialUIState,
  
  // Core actions
  loadFonts: async () => {
    set((state) => ({ ui: { ...state.ui, isLoadingFonts: true } }))

    try {
      // Prefer normalized families endpoint
      let families: FontFamily[] | null = null
      try {
        const resFamilies = await fetch('/api/families', { cache: 'no-store' })
        if (resFamilies.ok) {
          const d = await resFamilies.json()
          if (d.success && Array.isArray(d.families)) {
            families = d.families
          }
        }
      } catch (_) {
        // fall back silently
      }

      if (!families) {
        // Fallback to legacy flat list and convert
        const response = await fetch('/api/fonts-clean/list', { cache: 'no-store' })
        const data = await response.json()
        if (data.success && Array.isArray(data.fonts)) {
          families = convertToFamilies(data.fonts)
        }
      }

      if (families) {
        set({ families })
      }
    } catch (error) {
      console.error('Failed to load fonts:', error)
    } finally {
      set((state) => ({ ui: { ...state.ui, isLoadingFonts: false } }))
    }
  },
  
  updateFamily: (familyId, updates) => {
    set(state => ({
      families: state.families.map(family =>
        family.id === familyId 
          ? FontFamilyUtils.update(family, updates)
          : family
      )
    }))
  },
  
  updateVariant: (variantId, updates) => {
    set(state => ({
      families: state.families.map(family => ({
        ...family,
        variants: family.variants.map(variant =>
          variant.id === variantId
            ? FontVariantUtils.update(variant, updates)
            : variant
        )
      }))
    }))
  },
  
  // Filter actions
  setSelectedCollection: (collection) => {
    set(state => ({
      filters: {
        ...initialFilterState,
        selectedCollection: collection
      }
    }))
  },
  
  toggleCategory: (category) => {
    set(state => ({
      filters: {
        ...state.filters,
        selectedCategories: state.filters.selectedCategories.includes(category)
          ? state.filters.selectedCategories.filter(c => c !== category)
          : [...state.filters.selectedCategories, category]
      }
    }))
  },
  
  toggleStyle: (style) => {
    set(state => ({
      filters: {
        ...state.filters,
        selectedStyles: state.filters.selectedStyles.includes(style)
          ? state.filters.selectedStyles.filter(s => s !== style)
          : [...state.filters.selectedStyles, style]
      }
    }))
  },
  
  toggleLanguage: (language) => {
    set(state => ({
      filters: {
        ...state.filters,
        selectedLanguages: state.filters.selectedLanguages.includes(language)
          ? state.filters.selectedLanguages.filter(l => l !== language)
          : [...state.filters.selectedLanguages, language]
      }
    }))
  },
  
  toggleWeight: (weight) => {
    set(state => ({
      filters: {
        ...state.filters,
        selectedWeights: state.filters.selectedWeights.includes(weight)
          ? state.filters.selectedWeights.filter(w => w !== weight)
          : [...state.filters.selectedWeights, weight]
      }
    }))
  },
  
  clearFilters: () => {
    set(state => ({
      filters: { ...initialFilterState, selectedCollection: state.filters.selectedCollection }
    }))
  },
  
  // Preview actions
  setCustomText: (text, cursorPosition = text.length) => {
    set(state => ({
      preview: { 
        ...state.preview, 
        customText: text,
        textCursorPosition: cursorPosition
      }
    }))
  },
  
  setSelectedPreset: (preset) => {
    set(state => ({
      preview: { ...state.preview, selectedPreset: preset }
    }))
  },
  
  setTextSize: (size) => {
    set(state => ({
      preview: { ...state.preview, textSize: size }
    }))
  },
  
  setLineHeight: (height) => {
    set(state => ({
      preview: { ...state.preview, lineHeight: height }
    }))
  },
  
  setViewMode: (mode) => {
    set(state => ({
      preview: { ...state.preview, viewMode: mode }
    }))
  },
  
  setSortBy: (sortBy, direction = 'desc') => {
    set(state => ({
      preview: { ...state.preview, sortBy, sortDirection: direction }
    }))
  },
  
  // Font control actions
  setFontWeight: (familyId, weight, italic) => {
    set(state => ({
      preview: {
        ...state.preview,
        fontWeightSelections: {
          ...state.preview.fontWeightSelections,
          [familyId]: { weight, italic }
        }
      }
    }))
  },
  
  toggleOTFeature: (familyId, feature) => {
    set(state => {
      const currentFeatures = state.preview.fontOTFeatures[familyId] || {}
      return {
        preview: {
          ...state.preview,
          fontOTFeatures: {
            ...state.preview.fontOTFeatures,
            [familyId]: {
              ...currentFeatures,
              [feature]: !currentFeatures[feature]
            }
          }
        }
      }
    })
  },
  
  setVariableAxis: (familyId, axis, value) => {
    set(state => {
      const currentAxes = state.preview.fontVariableAxes[familyId] || {}
      return {
        preview: {
          ...state.preview,
          fontVariableAxes: {
            ...state.preview.fontVariableAxes,
            [familyId]: {
              ...currentAxes,
              [axis]: value
            }
          }
        }
      }
    })
  },
  
  // UI actions
  setSidebarOpen: (open) => {
    set(state => ({
      ui: { ...state.ui, sidebarOpen: open }
    }))
  },
  
  toggleExpandedCard: (familyId) => {
    set(state => {
      const newExpandedCards = new Set(state.ui.expandedCards)
      if (newExpandedCards.has(familyId)) {
        newExpandedCards.delete(familyId)
      } else {
        newExpandedCards.add(familyId)
      }
      return {
        ui: { ...state.ui, expandedCards: newExpandedCards }
      }
    })
  },
  
  setEditingElementRef: (ref) => {
    set(state => ({
      ui: { ...state.ui, editingElementRef: ref }
    }))
  },
  
  // Computed selectors
  getFilteredFamilies: () => {
    const state = get()
    const { families, filters } = state
    
    // Convert families to computed font data
    const computedFonts: ComputedFontData[] = families
      .filter(family => family.collection === filters.selectedCollection)
      .filter(family => family.published)
      .map(family => {
        const defaultVariant = FontFamilyUtils.getDefaultVariant(family)
        if (!defaultVariant) return null
        
        return {
          id: family.id,
          name: family.name,
          family,
          defaultVariant,
          availableWeights: FontFamilyUtils.getAvailableWeights(family),
          hasItalic: FontFamilyUtils.hasItalic(family),
          isVariable: family.isVariable,
          
          // UI compatibility
          fontFamily: `"${family.name}", system-ui, sans-serif`,
          url: defaultVariant.blobUrl,
          styles: family.variants.length,
          category: family.category[0] || 'Sans',
          author: family.foundry,
          type: family.isVariable ? 'Variable' : 'Static',
          collection: family.collection,
          styleTags: family.styleTags,
          categories: family.category,
          languages: family.languages,
          variableAxes: defaultVariant.variableAxes,
          openTypeFeatures: defaultVariant.openTypeFeatures
        }
      })
      .filter((font): font is NonNullable<typeof font> => font !== null) as ComputedFontData[]
    
    // Apply filters
    return computedFonts.filter(font => {
      // Category filter
      if (filters.selectedCategories.length > 0) {
        const hasMatchingCategory = filters.selectedCategories.some(cat =>
          font.categories.includes(cat)
        )
        if (!hasMatchingCategory) return false
      }
      
      // Style filter
      if (filters.selectedStyles.length > 0) {
        const hasMatchingStyle = filters.selectedStyles.some(style =>
          font.styleTags.includes(style)
        )
        if (!hasMatchingStyle) return false
      }
      
      // Language filter
      if (filters.selectedLanguages.length > 0) {
        const hasMatchingLanguage = filters.selectedLanguages.some(lang =>
          font.languages.includes(lang)
        )
        if (!hasMatchingLanguage) return false
      }
      
      // Weight filter
      if (filters.selectedWeights.length > 0) {
        const hasMatchingWeight = filters.selectedWeights.some(weight =>
          font.availableWeights.includes(weight)
        )
        if (!hasMatchingWeight) return false
      }
      
      return true
    })
  },
  
  getAvailableCategories: () => {
    const state = get()
    const categories = new Set<string>()
    
    state.families
      .filter(family => family.collection === state.filters.selectedCollection)
      .forEach(family => {
        family.category.forEach(cat => categories.add(cat))
      })
    
    return Array.from(categories).sort()
  },
  
  getAvailableStyles: () => {
    const state = get()
    const styles = new Set<string>()
    
    state.families
      .filter(family => family.collection === state.filters.selectedCollection)
      .forEach(family => {
        family.styleTags.forEach(style => styles.add(style))
      })
    
    return Array.from(styles).sort()
  },
  
  getAvailableLanguages: () => {
    const state = get()
    const languages = new Set<string>()
    
    state.families
      .filter(family => family.collection === state.filters.selectedCollection)
      .forEach(family => {
        family.languages.forEach(lang => languages.add(lang))
      })
    
    return Array.from(languages).sort()
  },
  
  getAvailableWeights: () => {
    const state = get()
    const weights = new Set<number>()
    
    state.families
      .filter(family => family.collection === state.filters.selectedCollection)
      .forEach(family => {
        FontFamilyUtils.getAvailableWeights(family).forEach(weight => weights.add(weight))
      })
    
    return Array.from(weights).sort((a, b) => a - b)
  }
}))

/**
 * Convert flat font data to hierarchical families
 * This function bridges the gap between old API format and new data model
 */
function convertToFamilies(fonts: any[]): FontFamily[] {
  // Group fonts by family name
  const fontsByFamily = new Map<string, any[]>()
  
  fonts.forEach(font => {
    const familyName = font.family || font.name
    if (!fontsByFamily.has(familyName)) {
      fontsByFamily.set(familyName, [])
    }
    fontsByFamily.get(familyName)!.push(font)
  })
  
  // Convert each group to FontFamily
  return Array.from(fontsByFamily.entries()).map(([familyName, familyFonts]) => {
    // Choose representative font for family settings
    const representative = familyFonts.find(f => f.isDefaultStyle) ||
                          familyFonts.find(f => !f.style?.toLowerCase().includes('italic')) ||
                          familyFonts[0]
    
    // Create variants from all fonts in family
    const variants: FontVariant[] = familyFonts.map(font => ({
      id: font.id || `variant_${font.filename}`,
      familyId: familyName,
      filename: font.filename,
      weight: font.weight || 400,
      isItalic: font.style?.toLowerCase().includes('italic') || false,
      styleName: font.style || 'Regular',
      blobUrl: font.url || font.blobUrl,
      fileSize: font.fileSize || 0,
      format: font.format || 'woff2',
      isVariable: font.isVariable || false,
      variableAxes: font.variableAxes || [],
      openTypeFeatures: font.openTypeFeatures || [],
      // pass structured feature tags if present
      // @ts-ignore
      openTypeFeatureTags: font.openTypeFeatureTags || [],
      fontMetrics: font.fontMetrics,
      glyphCount: font.glyphCount,
      uploadedAt: font.uploadedAt || new Date().toISOString(),
      originalFilename: font.originalFilename || font.filename,
      isDefaultStyle: font.isDefaultStyle || false,
      published: true
    }))
    
    // Create family
    const family: FontFamily = {
      id: `family_${familyName}`,
      name: familyName,
      collection: representative.collection || 'Text',
      styleTags: representative.styleTags || [],
      languages: representative.languages || ['Latin'],
      category: Array.isArray(representative.category) 
        ? representative.category 
        : [representative.category || 'Sans'],
      foundry: representative.foundry || 'Unknown',
      defaultVariantId: variants.find(v => v.isDefaultStyle)?.id,
      isVariable: variants.some(v => v.isVariable),
      variants,
      published: true,
      createdAt: representative.uploadedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: representative.description,
      designerInfo: representative.designerInfo,
      downloadLink: representative.downloadLink
    }
    
    return family
  })
}
