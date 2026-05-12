/**
 * Clean Font Management Types - New Architecture
 * Single source of truth for all font-related data structures
 */

// Font organization types
export type FontCollection = 'Text' | 'Display' | 'Brutal'

// Core font data model - simplified and consistent
export interface Font {
  // Identity
  id: string
  name: string          // Display name (same as family for now)
  family: string        // Font family name
  
  // File information
  blob: string          // Vercel Blob URL
  format: 'ttf' | 'otf' | 'woff' | 'woff2'
  size: number          // File size in bytes
  filename: string      // Original filename
  
  // Typography metadata (from OpenType parsing)
  weight: number        // 100-900
  style: string         // Regular, Bold, Italic, etc.
  isVariable: boolean
  variableAxes: VariableAxis[]
  features: string[]    // OpenType features
  languages: string[]   // Supported languages
  
  // Organization  
  collection: FontCollection
  tags: string[]        // User-defined tags for filtering
  category: FontCategory[]  // Sans, Serif, Mono, etc.
  
  // Admin/Meta
  published: boolean
  downloadUrl?: string  // Custom download URL set by admin
  uploadedAt: Date
  
  // Optional extended metadata
  designer?: string
  foundry?: string
  version?: string
  license?: string
  copyright?: string
}

// Variable font axis definition
export interface VariableAxis {
  name: string          // Human readable name
  tag: string           // CSS axis tag (wght, slnt, etc.)
  min: number
  max: number
  default: number
}

// Font categories - simplified taxonomy
export type FontCategory = 
  | 'Sans' | 'Serif' | 'Slab' | 'Mono'           // Text
  | 'Script' | 'Handwritten' | 'Display'         // Display  
  | 'Decorative' | 'Experimental' | 'Symbol'     // Brutal

// Family grouping (derived from fonts, not stored separately)
export interface FontFamily {
  name: string
  fonts: Font[]
  defaultFontId: string  // ID of the default style
  collection: FontCollection
  tags: string[]         // Aggregated from all fonts in family
  categories: FontCategory[]  // Aggregated from all fonts in family
}

// Filter state
export interface FilterState {
  collection: FontCollection
  categories: FontCategory[]
  tags: string[]
  languages: string[]
  weights: number[]
  isVariable?: boolean
  search?: string
}

// UI state
export interface UIState {
  // Text controls
  textSize: number
  lineHeight: number
  customText: string
  preset: 'Names' | 'Key Glyphs' | 'Basic' | 'Paragraph' | 'Brands'
  
  // Display options
  sortBy: 'name' | 'date' | 'family'
  sortDirection: 'asc' | 'desc'
  
  // Interaction state
  expandedCards: Set<string>
  selectedFont?: string
}

// API response types
export interface FontResponse {
  success: boolean
  fonts: Font[]
  total: number
}

export interface FontUploadRequest {
  file: File
  collection?: FontCollection
  tags?: string[]
}

export interface FontUpdateRequest {
  name?: string
  collection?: FontCollection
  tags?: string[]
  downloadUrl?: string
  published?: boolean
}