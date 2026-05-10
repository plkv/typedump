/**
 * FontVariant - Individual font file within a family
 * Inherits settings from FontFamily parent
 */

export interface FontVariant {
  // Core identity
  id: string
  familyId: string
  filename: string
  
  // Variant-specific properties
  weight: number
  isItalic: boolean
  styleName: string // e.g. "Regular", "Bold Italic", "Light"
  
  // File storage
  blobUrl: string
  fileSize: number
  format: string // e.g. "woff2", "ttf", "otf"
  
  // Font technical properties
  isVariable: boolean
  variableAxes?: VariableAxis[]
  openTypeFeatures: string[]
  openTypeFeatureTags?: Array<{ tag: string; title: string }>

  // Font metrics
  fontMetrics?: FontMetrics
  glyphCount?: number
  
  // File metadata
  uploadedAt: string
  originalFilename: string
  checksum?: string
  
  // Parsing metadata
  parsedAt?: string
  parsingVersion?: string
  
  // Status
  isDefaultStyle: boolean
  published: boolean
}

export interface VariableAxis {
  name: string  // Human readable name
  axis: string  // 4-char tag (e.g. "wght", "slnt")
  min: number
  max: number
  default: number
}

export interface FontMetrics {
  ascender: number
  descender: number
  lineGap: number
  xHeight?: number
  capHeight?: number
  unitsPerEm: number
}

export interface CreateFontVariantInput {
  familyId: string
  filename: string
  weight: number
  isItalic: boolean
  styleName?: string
  blobUrl: string
  fileSize: number
  format: string
  isVariable: boolean
  variableAxes?: VariableAxis[]
  openTypeFeatures?: string[]
  fontMetrics?: FontMetrics
  glyphCount?: number
  originalFilename?: string
  isDefaultStyle?: boolean
}

export interface UpdateFontVariantInput {
  id: string
  weight?: number
  isItalic?: boolean
  styleName?: string
  isDefaultStyle?: boolean
  published?: boolean
  variableAxes?: VariableAxis[]
  openTypeFeatures?: string[]
  fontMetrics?: FontMetrics
}

/**
 * Utility functions for FontVariant operations
 */
export class FontVariantUtils {
  /**
   * Create a new font variant
   */
  static create(input: CreateFontVariantInput): FontVariant {
    const now = new Date().toISOString()
    
    return {
      id: `variant_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      familyId: input.familyId,
      filename: input.filename,
      weight: input.weight,
      isItalic: input.isItalic,
      styleName: input.styleName || FontVariantUtils.generateStyleName(input.weight, input.isItalic),
      blobUrl: input.blobUrl,
      fileSize: input.fileSize,
      format: input.format,
      isVariable: input.isVariable,
      variableAxes: input.variableAxes || [],
      openTypeFeatures: input.openTypeFeatures || [],
      fontMetrics: input.fontMetrics,
      glyphCount: input.glyphCount,
      uploadedAt: now,
      originalFilename: input.originalFilename || input.filename,
      isDefaultStyle: input.isDefaultStyle || false,
      published: true // Default to published
    }
  }
  
  /**
   * Update an existing font variant
   */
  static update(variant: FontVariant, updates: Omit<UpdateFontVariantInput, 'id'>): FontVariant {
    return {
      ...variant,
      ...updates,
      // Auto-update styleName if weight or italic changes
      styleName: updates.weight !== undefined || updates.isItalic !== undefined
        ? FontVariantUtils.generateStyleName(
            updates.weight ?? variant.weight,
            updates.isItalic ?? variant.isItalic
          )
        : variant.styleName
    }
  }
  
  /**
   * Generate style name from weight and italic
   */
  static generateStyleName(weight: number, isItalic: boolean): string {
    const weightName = FontVariantUtils.getWeightName(weight)
    return isItalic ? `${weightName} Italic` : weightName
  }
  
  /**
   * Get weight name from numeric weight
   */
  static getWeightName(weight: number): string {
    if (weight <= 100) return 'Thin'
    if (weight <= 200) return 'Extra Light'
    if (weight <= 300) return 'Light'
    if (weight <= 400) return 'Regular'
    if (weight <= 500) return 'Medium'
    if (weight <= 600) return 'Semi Bold'
    if (weight <= 700) return 'Bold'
    if (weight <= 800) return 'Extra Bold'
    return 'Black'
  }
  
  /**
   * Get file extension from format
   */
  static getFileExtension(format: string): string {
    const formatMap: Record<string, string> = {
      'woff2': '.woff2',
      'woff': '.woff',
      'truetype': '.ttf',
      'opentype': '.otf',
      'embedded-opentype': '.eot'
    }
    return formatMap[format.toLowerCase()] || '.ttf'
  }
  
  /**
   * Check if variant has specific OpenType feature
   */
  static hasFeature(variant: FontVariant, feature: string): boolean {
    return variant.openTypeFeatures.includes(feature)
  }
  
  /**
   * Get variable axis by tag
   */
  static getAxis(variant: FontVariant, axisTag: string): VariableAxis | undefined {
    return variant.variableAxes?.find(axis => axis.axis === axisTag)
  }
  
  /**
   * Get weight range for variable fonts
   */
  static getWeightRange(variant: FontVariant): { min: number; max: number } | null {
    if (!variant.isVariable) return null
    
    const weightAxis = FontVariantUtils.getAxis(variant, 'wght')
    if (!weightAxis) return null
    
    return { min: weightAxis.min, max: weightAxis.max }
  }
  
  /**
   * Check if variant supports italic through variable axis
   */
  static supportsVariableItalic(variant: FontVariant): boolean {
    if (!variant.isVariable) return false
    return FontVariantUtils.getAxis(variant, 'slnt') !== undefined ||
           FontVariantUtils.getAxis(variant, 'ital') !== undefined
  }
  
  /**
   * Get CSS font-face declaration
   */
  static toCSSFontFace(variant: FontVariant, familyName: string): string {
    // Use weight range for variable fonts per spec: e.g. "100 900"
    const weightRange = FontVariantUtils.getWeightRange(variant)
    let fontWeight: string
    if (variant.isVariable && weightRange) {
      const min = Math.max(1, Math.min(1000, Math.floor(weightRange.min)))
      const max = Math.max(1, Math.min(1000, Math.ceil(weightRange.max)))
      // Defensive: if range collapsed or invalid, fall back to a broad range so font-variation-settings can take effect
      if (!isFinite(min) || !isFinite(max) || max <= min) {
        fontWeight = '100 900'
      } else {
        fontWeight = `${min} ${max}`
      }
    } else if (variant.isVariable && !weightRange) {
      // If variable but axis data missing, still expose broad range for CSS variable rendering
      fontWeight = '100 900'
    } else {
      fontWeight = `${variant.weight}`
    }

    // Guess format() from variant.format if available
    const formatMap: Record<string, string> = {
      'woff2': 'woff2',
      'woff': 'woff',
      'truetype': 'truetype',
      'opentype': 'opentype',
      'ttf': 'truetype',
      'otf': 'opentype',
    }
    const fmt = (variant.format || '').toLowerCase()
    const formatHint = formatMap[fmt] ? ` format("${formatMap[fmt]}")` : ''

    return `@font-face{font-family:"${familyName}";src:url("${variant.blobUrl}")${formatHint};font-weight:${fontWeight};font-style:${variant.isItalic ? 'italic' : 'normal'};font-display:swap;}`
  }
  
  /**
   * Validate variant data
   */
  static validate(variant: FontVariant): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!variant.id.trim()) {
      errors.push('Variant ID is required')
    }
    
    if (!variant.familyId.trim()) {
      errors.push('Family ID is required')
    }
    
    if (!variant.filename.trim()) {
      errors.push('Filename is required')
    }
    
    if (!variant.blobUrl.trim()) {
      errors.push('Blob URL is required')
    }
    
    if (variant.weight < 1 || variant.weight > 1000) {
      errors.push('Weight must be between 1 and 1000')
    }
    
    if (variant.fileSize <= 0) {
      errors.push('File size must be positive')
    }
    
    // Validate variable axes
    if (variant.isVariable && variant.variableAxes) {
      variant.variableAxes.forEach((axis, index) => {
        if (!axis.axis || axis.axis.length !== 4) {
          errors.push(`Variable axis ${index}: axis tag must be 4 characters`)
        }
        if (axis.min >= axis.max) {
          errors.push(`Variable axis ${index}: min must be less than max`)
        }
        if (axis.default < axis.min || axis.default > axis.max) {
          errors.push(`Variable axis ${index}: default must be between min and max`)
        }
      })
    }
    
    return { isValid: errors.length === 0, errors }
  }
}
