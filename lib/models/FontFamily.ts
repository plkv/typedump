/**
 * FontFamily - Hierarchical data model for font families
 * Replaces flat font storage with proper parent-child relationships
 */

import { FontVariant } from './FontVariant'

export interface FontFamily {
  // Core identity
  id: string
  name: string
  
  // Global family settings (inherited by all variants)
  collection: 'Text' | 'Display' | 'Brutal'
  styleTags: string[]
  languages: string[]
  category: string[]
  foundry: string
  
  // Family metadata
  defaultVariantId?: string  // ID of the default variant
  isVariable: boolean
  description?: string
  
  // Font variants (children)
  variants: FontVariant[]
  
  // Publishing settings
  published: boolean
  publishedAt?: string
  
  // Admin metadata
  createdAt: string
  updatedAt: string
  
  // Enhanced metadata
  designerInfo?: {
    designer?: string
    designerURL?: string
    manufacturer?: string
    vendorURL?: string
    trademark?: string
  }
  
  // Download settings
  downloadLink?: string
  licenseInfo?: {
    type?: string
    url?: string
    description?: string
  }
}

export interface CreateFontFamilyInput {
  name: string
  collection?: 'Text' | 'Display' | 'Brutal'
  foundry?: string
  styleTags?: string[]
  languages?: string[]
  category?: string[]
  description?: string
  designerInfo?: FontFamily['designerInfo']
  licenseInfo?: FontFamily['licenseInfo']
}

export interface UpdateFontFamilyInput {
  id: string
  name?: string
  collection?: 'Text' | 'Display' | 'Brutal'
  foundry?: string
  styleTags?: string[]
  languages?: string[]
  category?: string[]
  description?: string
  defaultVariantId?: string
  published?: boolean
  downloadLink?: string
  designerInfo?: FontFamily['designerInfo']
  licenseInfo?: FontFamily['licenseInfo']
}

/**
 * Utility functions for FontFamily operations
 */
export class FontFamilyUtils {
  /**
   * Create a new font family with default values
   */
  static create(input: CreateFontFamilyInput): FontFamily {
    const now = new Date().toISOString()
    
    return {
      id: `family_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: input.name,
      collection: input.collection || 'Text',
      styleTags: input.styleTags || [],
      languages: input.languages || ['Latin'],
      category: input.category || ['Sans'],
      foundry: input.foundry || 'Unknown',
      isVariable: false, // Will be determined when variants are added
      variants: [],
      published: false,
      createdAt: now,
      updatedAt: now,
      description: input.description,
      designerInfo: input.designerInfo,
      licenseInfo: input.licenseInfo
    }
  }
  
  /**
   * Update an existing font family
   */
  static update(family: FontFamily, updates: Omit<UpdateFontFamilyInput, 'id'>): FontFamily {
    return {
      ...family,
      ...updates,
      updatedAt: new Date().toISOString()
    }
  }
  
  /**
   * Get the default variant for a family
   */
  static getDefaultVariant(family: FontFamily): FontVariant | undefined {
    if (family.defaultVariantId) {
      return family.variants.find(v => v.id === family.defaultVariantId)
    }
    
    // Fallback logic: non-italic regular weight
    return family.variants.find(v => !v.isItalic && v.weight === 400) ||
           family.variants.find(v => !v.isItalic) ||
           family.variants[0]
  }
  
  /**
   * Get all available weights in the family
   */
  static getAvailableWeights(family: FontFamily): number[] {
    const weights = new Set(family.variants.map(v => v.weight))
    return Array.from(weights).sort((a, b) => a - b)
  }
  
  /**
   * Check if family has italic variants
   */
  static hasItalic(family: FontFamily): boolean {
    return family.variants.some(v => v.isItalic)
  }
  
  /**
   * Update the isVariable flag based on variants
   */
  static updateVariableStatus(family: FontFamily): FontFamily {
    const isVariable = family.variants.some(v => v.isVariable)
    return { ...family, isVariable }
  }
  
  /**
   * Get variants by weight and italic style
   */
  static getVariantsByStyle(
    family: FontFamily, 
    weight?: number, 
    isItalic?: boolean
  ): FontVariant[] {
    return family.variants.filter(variant => {
      if (weight !== undefined && variant.weight !== weight) return false
      if (isItalic !== undefined && variant.isItalic !== isItalic) return false
      return true
    })
  }
  
  /**
   * Validate family data integrity
   */
  static validate(family: FontFamily): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!family.name.trim()) {
      errors.push('Family name is required')
    }
    
    if (!family.id.trim()) {
      errors.push('Family ID is required')
    }
    
    if (!['Text', 'Display', 'Brutal'].includes(family.collection)) {
      errors.push('Invalid collection type')
    }
    
    if (family.variants.length === 0) {
      errors.push('Family must have at least one variant')
    }
    
    // Validate default variant exists
    if (family.defaultVariantId) {
      const defaultExists = family.variants.some(v => v.id === family.defaultVariantId)
      if (!defaultExists) {
        errors.push('Default variant ID does not exist in variants')
      }
    }
    
    return { isValid: errors.length === 0, errors }
  }
}