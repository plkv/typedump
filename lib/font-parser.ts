import opentype from 'opentype.js'

export interface FontMetadata {
  name: string
  family: string
  style: string
  weight: number
  isVariable: boolean
  format: string
  fileSize: number
  uploadedAt: string
  filename: string
  path: string
  url?: string
  // Additional fields for UI compatibility
  styles: number
  features: string[]
  category: string
  price: string
  availableStyles: string[]
  availableWeights: number[]
  variableAxes?: Array<{
    name: string
    axis: string
    min: number
    max: number
    default: number
  }>
  openTypeFeatures: string[]
  openTypeFeatureTags?: Array<{ tag: string; title: string }>
  languages: string[]
  foundry?: string
  // Publishing status
  published?: boolean
  // Download link
  downloadLink?: string
  // Family management
  defaultStyle?: boolean // Is this the default style for the family?
  styleName?: string // Custom style name override
  // Enhanced metadata from OpenType
  version?: string
  copyright?: string
  license?: string
  glyphCount?: number
  embeddingPermissions?: string
  fontMetrics?: object
  panoseClassification?: string
  creationDate?: string
  modificationDate?: string
  designerInfo?: object
  description?: string
  collection?: string
  familyId?: string
  isDefaultStyle?: boolean
  italicStyle?: boolean
  styleTags?: string[]
  relatedStyles?: string[]
  originalFilename?: string
  storage?: string
  warning?: string
  note?: string
}

export async function parseFontFile(buffer: ArrayBuffer, originalName: string, fileSize: number): Promise<FontMetadata> {
  console.log(`🔍 Parsing font: ${originalName} (${fileSize} bytes)`)
  
  try {
    // Validate buffer
    if (!buffer || buffer.byteLength === 0) {
      throw new Error('Empty or invalid font buffer')
    }
    
    if (buffer.byteLength < 100) {
      throw new Error('Font file too small to be valid')
    }
    
    console.log(`📦 Font buffer size: ${buffer.byteLength} bytes`)
    
    const font = opentype.parse(buffer)
    
    if (!font) {
      throw new Error('OpenType.js failed to parse font')
    }
    
    console.log(`✅ OpenType.js successfully parsed font: ${font.names?.fontFamily?.en || 'Unknown'}`)
    
    // Extract font names and metadata
    console.log('📋 Font names available:', Object.keys(font.names || {}))
    
    const name = font.names.fontFamily?.en || font.names.fullName?.en || originalName
    const family = font.names.fontFamily?.en || name
    const rawStyle = font.names.fontSubfamily?.en || 'Regular'
    const style = rawStyle.trim() || 'Regular' // Fix empty/whitespace styles
    
    // Detect italic/oblique styles
    const isItalicStyle = /\b(italic|oblique|slanted)\b/i.test(style) || 
                         /\b(italic|oblique|slanted)\b/i.test(family)
    
    // Generate family ID for grouping (consistent across styles)
    const baseFamilyName = family.replace(/\s+(italic|oblique|slanted)$/i, '').trim()
    const familyId = `family_${baseFamilyName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
    
    // Enhanced foundry detection with whitespace cleanup
    let foundry = 'Unknown'
    if (font.names.manufacturer?.en && font.names.manufacturer.en.trim()) foundry = font.names.manufacturer.en.trim()
    else if (font.names.designer?.en && font.names.designer.en.trim()) foundry = font.names.designer.en.trim()
    else if (font.names.vendorURL?.en && font.names.vendorURL.en.trim()) foundry = font.names.vendorURL.en.trim()
    else if (font.names.designerURL?.en && font.names.designerURL.en.trim()) foundry = font.names.designerURL.en.trim()
    else if (font.names.description?.en && font.names.description.en.trim() && font.names.description.en.trim().length < 100) foundry = font.names.description.en.trim()
    
    console.log(`👤 Foundry detection: "${foundry}"`)
    
    // Enhanced weight detection - check both style and family name
    let weight = 400
    const styleStr = style.toLowerCase()
    const familyStr = family.toLowerCase()
    const combinedStr = `${styleStr} ${familyStr}`
    
    if (combinedStr.includes('thin') || combinedStr.includes('ultralight')) weight = 100
    else if (combinedStr.includes('extralight')) weight = 200
    else if (combinedStr.includes('light')) weight = 300  
    else if (combinedStr.includes('medium')) weight = 500
    else if (combinedStr.includes('semibold') || combinedStr.includes('semi') || combinedStr.includes('demi')) weight = 600
    else if (combinedStr.includes('extrabold')) weight = 800
    else if (combinedStr.includes('bold')) weight = 700
    else if (combinedStr.includes('black') || combinedStr.includes('heavy')) weight = 900
    
    // Check if variable font (basic detection)
    const isVariable = font.tables?.fvar !== undefined

    const format = originalName.toLowerCase().endsWith('.otf') ? 'otf' : 'ttf'

    // Enhanced category detection with collection-specific categories
    const familyLower = family.toLowerCase()
    let category = 'Sans' // Default for Text collection
    let detectedCollection: 'Text' | 'Display' | 'Brutal' = 'Text'
    
    // Detect collection and category together
    if (familyLower.includes('display') || familyLower.includes('decorative') || 
        familyLower.includes('script') || familyLower.includes('handwriting') ||
        familyLower.includes('vintage') || familyLower.includes('stencil')) {
      detectedCollection = 'Display'
      if (familyLower.includes('script') || familyLower.includes('handwriting')) {
        category = familyLower.includes('handwriting') ? 'Handwritten' : 'Script'
      } else if (familyLower.includes('vintage')) {
        category = 'Vintage'
      } else if (familyLower.includes('stencil')) {
        category = 'Stencil'
      } else if (familyLower.includes('serif') && !familyLower.includes('sans')) {
        category = 'Serif-based'
      } else {
        category = 'Sans-based'
      }
    } else if (familyLower.includes('pixel') || familyLower.includes('bitmap') ||
               familyLower.includes('experimental') || familyLower.includes('symbol')) {
      detectedCollection = 'Brutal'
      if (familyLower.includes('pixel') || familyLower.includes('bitmap')) {
        category = 'Bitmap'
      } else if (familyLower.includes('symbol')) {
        category = 'Symbol'
      } else {
        category = 'Experimental'
      }
    } else {
      // Text collection categories
      detectedCollection = 'Text'
      if (familyLower.includes('mono') || familyLower.includes('code') || familyLower.includes('console')) {
        category = 'Mono'
      } else if (familyLower.includes('slab')) {
        category = 'Slab'
      } else if (familyLower.includes('serif') && !familyLower.includes('sans')) {
        category = 'Serif'
      } else {
        category = 'Sans'
      }
    }
    
    console.log(`⚖️ Font: "${family}" -> Weight: ${weight}, Category: ${category}`)

    // Extract comprehensive OpenType features
    const openTypeFeatures: string[] = []
    const featureList = font.tables?.gsub?.features || []
    const supportedFeatures = new Set<string>()
    
    // Extract stylistic set names only from GSUB FeatureParams (UINameID → name table lookup)
    // Name IDs 256+ are NOT reliably ss names — in variable fonts they hold fvar instance names.
    const customStylisticNames: { [key: string]: string } = {}
    try {
      const ssNames = extractStylisticSetNamesFromGSUB(buffer)
      Object.assign(customStylisticNames, ssNames)
    } catch (e) {
      console.warn('GSUB FeatureParams parse failed (non-fatal):', e)
    }
    
    // Map OpenType feature tags to readable names (comprehensive list)
    // Now we'll check for custom names first, then fall back to generic ones
    const featureNames: { [key: string]: string } = {
      'kern': 'Kerning',
      'liga': 'Standard Ligatures', 
      'dlig': 'Discretionary Ligatures',
      'clig': 'Contextual Ligatures',
      'hlig': 'Historical Ligatures',
      'smcp': 'Small Capitals',
      'c2sc': 'Small Capitals From Capitals',
      'case': 'Case-Sensitive Forms',
      'cpsp': 'Capital Spacing',
      'swsh': 'Swash',
      'cswh': 'Contextual Swash',
      'salt': 'Stylistic Alternates',
      'calt': 'Contextual Alternates',
      // Stylistic sets - use custom names if available, otherwise fall back to generic
      'ss01': customStylisticNames['ss01'] || 'Stylistic Set 1',
      'ss02': customStylisticNames['ss02'] || 'Stylistic Set 2',
      'ss03': customStylisticNames['ss03'] || 'Stylistic Set 3',
      'ss04': customStylisticNames['ss04'] || 'Stylistic Set 4',
      'ss05': customStylisticNames['ss05'] || 'Stylistic Set 5',
      'ss06': customStylisticNames['ss06'] || 'Stylistic Set 6',
      'ss07': customStylisticNames['ss07'] || 'Stylistic Set 7',
      'ss08': customStylisticNames['ss08'] || 'Stylistic Set 8',
      'ss09': customStylisticNames['ss09'] || 'Stylistic Set 9',
      'ss10': customStylisticNames['ss10'] || 'Stylistic Set 10',
      'ss11': customStylisticNames['ss11'] || 'Stylistic Set 11',
      'ss12': customStylisticNames['ss12'] || 'Stylistic Set 12',
      'ss13': customStylisticNames['ss13'] || 'Stylistic Set 13',
      'ss14': customStylisticNames['ss14'] || 'Stylistic Set 14',
      'ss15': customStylisticNames['ss15'] || 'Stylistic Set 15',
      'ss16': customStylisticNames['ss16'] || 'Stylistic Set 16',
      'ss17': customStylisticNames['ss17'] || 'Stylistic Set 17',
      'ss18': customStylisticNames['ss18'] || 'Stylistic Set 18',
      'ss19': customStylisticNames['ss19'] || 'Stylistic Set 19',
      'ss20': customStylisticNames['ss20'] || 'Stylistic Set 20',
      'cv01': 'Character Variant 1',
      'cv02': 'Character Variant 2',
      'cv03': 'Character Variant 3',
      'cv04': 'Character Variant 4',
      'cv05': 'Character Variant 5',
      'cv06': 'Character Variant 6',
      'cv07': 'Character Variant 7',
      'cv08': 'Character Variant 8',
      'cv09': 'Character Variant 9',
      'cv10': 'Character Variant 10',
      'onum': 'Oldstyle Figures',
      'pnum': 'Proportional Figures',
      'tnum': 'Tabular Figures',
      'lnum': 'Lining Figures',
      'zero': 'Slashed Zero',
      'frac': 'Fractions',
      'sups': 'Superscript',
      'subs': 'Subscript',
      'ordn': 'Ordinals'
    }

    // Extract features from GSUB and GPOS tables
    const extractFeatures = (table: any, tableName: string) => {
      if (!table) {
        console.log(`❌ No ${tableName} table found`)
        return
      }

      console.log(`🔍 Scanning ${tableName} table for features...`)

      // Modern OpenType.js structure uses 'features' array directly
      if (table.features && Array.isArray(table.features)) {
        console.log(`  Found ${table.features.length} features in ${tableName}`)
        table.features.forEach((feature: any) => {
          const tag = feature.tag || feature.featureTag
          if (tag && !supportedFeatures.has(tag)) {
            supportedFeatures.add(tag)
            // Add feature name from mapping, or use tag itself for unmapped features
            const featureName = featureNames[tag] || tag.toUpperCase()
            openTypeFeatures.push(featureName)
            console.log(`    ✅ ${tag} -> ${featureName}`)
          }
        })
      }

      // Legacy OpenType.js structure
      if (table.featureList) {
        // Try different possible structures
        if (table.featureList.featureRecords) {
          table.featureList.featureRecords.forEach((record: any) => {
            const tag = record.featureTag || record.tag
            if (tag && !supportedFeatures.has(tag)) {
              supportedFeatures.add(tag)
              const featureName = featureNames[tag] || tag.toUpperCase()
              openTypeFeatures.push(featureName)
              console.log(`    ✅ ${tag} -> ${featureName}`)
            }
          })
        }

        // Also check direct feature list
        if (Array.isArray(table.featureList)) {
          table.featureList.forEach((feature: any) => {
            if (feature.tag && !supportedFeatures.has(feature.tag)) {
              supportedFeatures.add(feature.tag)
              const featureName = featureNames[feature.tag] || feature.tag.toUpperCase()
              openTypeFeatures.push(featureName)
              console.log(`    ✅ ${feature.tag} -> ${featureName}`)
            }
          })
        }
      }

      if (!table.features && !table.featureList) {
        console.log(`  No features found in ${tableName} table`)
      }
    }

    // Check GSUB table (substitution features like ligatures)
    if (font.tables?.gsub) {
      extractFeatures(font.tables.gsub, 'GSUB')
    }
    
    // Check GPOS table (positioning features like kerning)
    if (font.tables?.gpos) {
      extractFeatures(font.tables.gpos, 'GPOS')
    }

    // Add basic features that most fonts have
    if (font.tables?.kern && !supportedFeatures.has('kern')) {
      openTypeFeatures.push('Kerning')
      supportedFeatures.add('kern')
    }
    
    // Add common ligature support if GSUB table exists
    if (font.tables?.gsub && !supportedFeatures.has('liga')) {
      openTypeFeatures.push('Standard Ligatures')
      supportedFeatures.add('liga')
    }

    // Enhanced style variations - extract from variable axes and named instances
    let availableStyles = [style].filter(s => s && s.trim())
    let availableWeights = [weight].filter(w => w && !isNaN(w))

    // Variable font axes (if available)
    const variableAxes = []
    if (isVariable && font.tables?.fvar) {
      try {
        // Common axis tag to name mapping
        const axisNames: { [key: string]: string } = {
          'wght': 'Weight',
          'wdth': 'Width', 
          'slnt': 'Slant',
          'opsz': 'Optical Size',
          'ital': 'Italic',
          'grad': 'Grade',
          'XHGT': 'X Height',
          'XOPQ': 'X Opaque',
          'YOPQ': 'Y Opaque',
          'YTLC': 'Y Transparent LC',
          'YTUC': 'Y Transparent UC',
          'YTAS': 'Y Transparent Ascender',
          'YTDE': 'Y Transparent Descender',
          'YTFI': 'Y Transparent Figure'
        }
        
        for (const axis of font.tables.fvar.axes || []) {
          const tag = String(axis.tag || 'unkn')
          
          // Get axis name - handle various formats
          let axisName = ''
          if (axis.name && typeof axis.name === 'string') {
            axisName = axis.name
          } else if (axis.name && axis.name.en) {
            axisName = axis.name.en
          } else if (axisNames[tag]) {
            axisName = axisNames[tag]
          } else {
            axisName = tag.toUpperCase()
          }
          
          // Set proper defaults based on axis type
          // Use axis.defaultValue if available, otherwise use sensible fallbacks
          let defaultValue: number
          const parsedDefault = Number(axis.defaultValue)
          const hasValidDefault = axis.defaultValue !== undefined && axis.defaultValue !== null && isFinite(parsedDefault)

          if (hasValidDefault) {
            defaultValue = parsedDefault
          } else {
            // Fallback defaults by axis type
            if (tag === 'wght') {
              defaultValue = 400 // Weight defaults to 400
            } else if (tag === 'wdth') {
              defaultValue = 100 // Width defaults to 100%
            } else if (tag === 'slnt' || tag === 'ital') {
              defaultValue = 0 // Slant/Italic defaults to 0
            } else if (tag === 'opsz') {
              defaultValue = 12 // Optical size defaults to 12pt
            } else {
              // For unknown axes, use min value or 0
              defaultValue = Number(axis.minValue) || 0
            }
          }
          
          const safeAxis = {
            name: String(axisName || tag.toUpperCase()),
            axis: tag,
            min: Number(axis.minValue) || 0,
            max: Number(axis.maxValue) || (tag === 'wght' ? 900 : 1000),
            default: defaultValue
          }
          
          // Validate the axis object has no circular references
          JSON.stringify(safeAxis) // This will throw if there are circular refs
          variableAxes.push(safeAxis)
        }
        console.log(`🎛️ Extracted ${variableAxes.length} variable axes:`, variableAxes)
      } catch (axisError) {
        console.error('⚠️ Error processing variable axes:', axisError)
        // Continue without variable axes if there's an error
      }
    }

    // Enhanced style and weight generation for variable fonts
    if (isVariable && variableAxes.length > 0) {
      try {
        // Find weight and slant axes
        const weightAxis = variableAxes.find(axis => 
          axis.axis.toLowerCase() === 'wght' || axis.name.toLowerCase().includes('weight')
        )
        const slantAxis = variableAxes.find(axis => 
          axis.axis.toLowerCase() === 'slnt' || axis.axis.toLowerCase() === 'ital' || 
          axis.name.toLowerCase().includes('slant') || axis.name.toLowerCase().includes('italic')
        )

        if (weightAxis) {
          // Generate comprehensive weight and style variations
          const min = Math.round(weightAxis.min)
          const max = Math.round(weightAxis.max)
          
          console.log(`🔢 Weight axis range: ${min} - ${max}`)
          
          // Define standard weight points and their names
          const standardWeights = [
            { weight: 100, name: 'Thin' },
            { weight: 200, name: 'ExtraLight' },
            { weight: 300, name: 'Light' },
            { weight: 400, name: 'Regular' },
            { weight: 500, name: 'Medium' },
            { weight: 600, name: 'SemiBold' },
            { weight: 700, name: 'Bold' },
            { weight: 800, name: 'ExtraBold' },
            { weight: 900, name: 'Black' }
          ]
          
          // Extract all weights and styles within the axis range
          const variableWeights: number[] = []
          const variableStyles: string[] = []
          
          standardWeights.forEach(({ weight: w, name }) => {
            if (w >= min && w <= max) {
              variableWeights.push(w)
              variableStyles.push(name)
              
              // Add italic version if slant axis exists
              if (slantAxis) {
                variableStyles.push(`${name} Italic`)
              }
            }
          })
          
          // If no standard weights fit, create custom range
          if (variableWeights.length === 0) {
            // Create 5-9 evenly distributed points within the actual range
            const steps = Math.min(9, Math.max(5, Math.floor((max - min) / 50) + 1))
            for (let i = 0; i < steps; i++) {
              const w = Math.round(min + (max - min) * i / (steps - 1))
              variableWeights.push(w)
              
              const name = w <= 250 ? 'ExtraLight' :
                          w <= 350 ? 'Light' :
                          w <= 450 ? 'Regular' :
                          w <= 550 ? 'Medium' :
                          w <= 650 ? 'SemiBold' :
                          w <= 750 ? 'Bold' :
                          w <= 850 ? 'ExtraBold' : 'Black'
              
              if (!variableStyles.includes(name)) {
                variableStyles.push(name)
                
                if (slantAxis && !variableStyles.includes(`${name} Italic`)) {
                  variableStyles.push(`${name} Italic`)
                }
              }
            }
          }
          
          // Update arrays with comprehensive lists
          availableWeights = [...new Set([...availableWeights, ...variableWeights])].sort((a, b) => a - b)
          availableStyles = [...new Set([...availableStyles, ...variableStyles])]
          
          console.log(`📊 Generated ${variableWeights.length} weights: ${variableWeights}`)
          console.log(`🎨 Generated ${variableStyles.length} styles: ${variableStyles}`)
        }

        // Extract named instances if available (these are predefined style variations)
        if (font.tables?.fvar?.instances) {
          console.log(`🏷️ Found ${font.tables.fvar.instances.length} named instances`)
          
          font.tables.fvar.instances.forEach((instance: any) => {
            try {
              let instanceName = ''
              
              if (instance.name) {
                if (typeof instance.name === 'string') {
                  instanceName = instance.name
                } else if (instance.name.en) {
                  instanceName = instance.name.en
                }
              }
              
              if (instanceName && instanceName.trim() && !availableStyles.includes(instanceName)) {
                availableStyles.push(instanceName.trim())
                console.log(`  ✅ Added named instance: ${instanceName}`)
              }
              
              // Extract weight from coordinates if available
              if (instance.coordinates && instance.coordinates.wght) {
                const instanceWeight = Math.round(Number(instance.coordinates.wght))
                if (instanceWeight && !availableWeights.includes(instanceWeight)) {
                  availableWeights.push(instanceWeight)
                }
              }
            } catch (instanceError) {
              console.warn('⚠️ Error processing named instance:', instanceError)
            }
          })
          
          // Sort weights after adding named instances
          availableWeights.sort((a, b) => a - b)
        }
        
      } catch (variableError) {
        console.error('⚠️ Error generating variable font styles:', variableError)
        // Keep original single style if variable processing fails
      }
    }

    // Ensure stylistic set titles discovered via GSUB are present
    Object.entries(customStylisticNames).forEach(([tag, title]) => {
      if (title && !openTypeFeatures.includes(title)) openTypeFeatures.push(title)
    })

    // Enhanced language support detection with actual glyph checking
    const languages: string[] = []

    // Helper function to check if font has specific characters
    const hasChars = (chars: string[]): boolean => {
      if (!font.glyphs) return false
      return chars.every(char => {
        const codePoint = char.codePointAt(0)
        if (codePoint === undefined) return false
        try {
          const glyph = font.charToGlyph(String.fromCodePoint(codePoint))
          // Check if glyph exists and is not .notdef (index 0)
          return glyph && glyph.index !== undefined && glyph.index !== 0
        } catch {
          return false
        }
      })
    }

    // Define characteristic characters for each language
    const languageTests = {
      'Latin': ['A', 'a', 'E', 'e'], // Basic Latin
      'Cyrillic': ['А', 'Б', 'В', 'а', 'б', 'в'], // А, Б, В (Cyrillic)
      'Greek': ['Α', 'Β', 'Γ', 'α', 'β', 'γ'], // Alpha, Beta, Gamma
      'Arabic': ['ا', 'ب', 'ت', 'ث'], // Alef, Ba, Ta, Tha
      'Hebrew': ['א', 'ב', 'ג', 'ד'], // Alef, Bet, Gimel, Dalet
      'Chinese': ['中', '文', '字'], // Common Chinese characters
      'Japanese': ['あ', 'い', 'カ', 'キ'], // Hiragana + Katakana
      'Korean': ['가', '나', '다'], // Hangul syllables
      'Thai': ['ก', 'ข', 'ค'], // Thai consonants
      'Vietnamese': ['ă', 'â', 'đ', 'ơ', 'ư'], // Vietnamese diacritics
      'Armenian': ['Ա', 'Բ', 'Գ'], // Armenian letters
      'Georgian': ['ა', 'ბ', 'გ'], // Georgian letters
      'Devanagari': ['क', 'ख', 'ग'], // Hindi/Sanskrit
      'Bengali': ['ক', 'খ', 'গ'], // Bengali
    }

    // Check each language by testing for characteristic glyphs
    for (const [lang, testChars] of Object.entries(languageTests)) {
      if (hasChars(testChars)) {
        languages.push(lang)
        console.log(`✅ Language detected: ${lang} (verified glyphs)`)
      }
    }

    // Fallback to Latin if no languages detected (shouldn't happen for valid fonts)
    if (languages.length === 0) {
      console.warn('⚠️ No language support detected, defaulting to Latin')
      languages.push('Latin')
    }

    console.log(`🌍 Final language support:`, languages)
    
    // Extract additional comprehensive metadata
    let version: string | undefined
    let copyright: string | undefined
    let license: string | undefined
    let glyphCount: number | undefined
    let embeddingPermissions: string | undefined
    let fontMetrics: any = {}
    let panoseClassification: string | undefined
    let creationDate: string | undefined
    let modificationDate: string | undefined
    let designerInfo: any = {}
    let description: string | undefined
    
    // Font version from head table or name table
    if (font.tables?.head?.fontRevision) {
      const rev = font.tables.head.fontRevision
      version = `${Math.floor(rev)}.${Math.round((rev % 1) * 1000)}`
    } else if (font.names?.version?.en) {
      version = font.names.version.en.replace(/^Version\s+/i, '')
    }
    
    // Copyright information
    if (font.names?.copyright?.en) {
      copyright = font.names.copyright.en.trim()
    }
    
    // License information
    if (font.names?.license?.en) {
      license = font.names.license.en.trim()
    } else if (font.names?.licenseURL?.en) {
      license = `See: ${font.names.licenseURL.en}`
    }
    
    // Glyph count
    if (font.glyphs && font.glyphs.length) {
      glyphCount = font.glyphs.length
    } else if (font.numGlyphs) {
      glyphCount = font.numGlyphs
    }
    
    // Embedding permissions from OS/2 table
    if (font.tables?.os2?.fsType !== undefined) {
      const fsType = font.tables.os2.fsType
      if (fsType === 0) {
        embeddingPermissions = 'Unrestricted'
      } else if (fsType & 0x0002) {
        embeddingPermissions = 'Restricted License'
      } else if (fsType & 0x0004) {
        embeddingPermissions = 'Preview & Print'
      } else if (fsType & 0x0008) {
        embeddingPermissions = 'Editable'
      } else {
        embeddingPermissions = 'Unknown'
      }
    }
    
    // Font metrics from various tables
    if (font.tables?.hhea || font.tables?.os2) {
      const hhea = font.tables.hhea
      const os2 = font.tables.os2
      
      fontMetrics = {
        ascender: hhea?.ascender || os2?.sTypoAscender || 0,
        descender: hhea?.descender || os2?.sTypoDescender || 0,
        lineGap: hhea?.lineGap || os2?.sTypoLineGap || 0,
        xHeight: os2?.sxHeight || 0,
        capHeight: os2?.sCapHeight || 0,
        unitsPerEm: font.tables?.head?.unitsPerEm || 1000
      }
    }
    
    // Panose classification for precise categorization
    if (font.tables?.os2?.panose) {
      const panose = font.tables.os2.panose
      const familyType = panose[0]
      const serifStyle = panose[1]
      
      if (familyType === 2) { // Text and Display
        if (serifStyle >= 11 && serifStyle <= 15) {
          panoseClassification = 'Sans Serif'
        } else if (serifStyle >= 2 && serifStyle <= 10) {
          panoseClassification = 'Serif'
        }
      } else if (familyType === 3) {
        panoseClassification = 'Script'
      } else if (familyType === 4) {
        panoseClassification = 'Decorative'
      } else if (familyType === 5) {
        panoseClassification = 'Symbol'
      }
    }
    
    // Creation and modification dates from head table
    if (font.tables?.head) {
      const head = font.tables.head
      
      // OpenType dates are seconds since 12:00 midnight, January 1, 1904
      const openTypeEpoch = new Date('1904-01-01T00:00:00Z').getTime()
      
      if (head.created && Array.isArray(head.created) && head.created.length === 2) {
        const seconds = (head.created[0] << 32) | head.created[1]
        creationDate = new Date(openTypeEpoch + seconds * 1000).toISOString()
      }
      
      if (head.modified && Array.isArray(head.modified) && head.modified.length === 2) {
        const seconds = (head.modified[0] << 32) | head.modified[1]
        modificationDate = new Date(openTypeEpoch + seconds * 1000).toISOString()
      }
    }
    
    // Enhanced date extraction from text fields (copyright, description, etc.)
    if (!creationDate) {
      const textFields = [
        copyright,
        font.names?.description?.en,
        font.names?.trademark?.en,
        font.names?.version?.en
      ].filter(Boolean)
      
      for (const text of textFields) {
        if (text) {
          // Match various date formats: 2023, 2023-2024, ©2023, (c)2023, etc.
          const dateMatches = text.match(/(?:©|\(c\)|copyright\s+)?\s*(\d{4})(?:\s*[-–—]\s*(\d{4}))?/i)
          if (dateMatches) {
            const year = parseInt(dateMatches[1])
            if (year >= 1970 && year <= new Date().getFullYear()) {
              // Create a flexible date - if only year, use January 1st
              creationDate = `${year}-01-01T00:00:00.000Z`
              console.log(`📅 Extracted creation year from text: ${year}`)
              break
            }
          }
        }
      }
    }
    
    // Extended designer information
    designerInfo = {
      designer: font.names?.designer?.en || undefined,
      designerURL: font.names?.designerURL?.en || undefined,
      manufacturer: font.names?.manufacturer?.en || undefined,
      vendorURL: font.names?.vendorURL?.en || undefined,
      trademark: font.names?.trademark?.en || undefined
    }
    
    // Font description
    if (font.names?.description?.en) {
      description = font.names.description.en.trim()
    }

    console.log(`🎯 Extracted ${openTypeFeatures.length} OpenType features:`, openTypeFeatures)
    console.log(`🌍 Language support:`, languages)

    // Build comprehensive openTypeFeatureTags including ALL detected features
    const openTypeFeatureTags: Array<{ tag: string; title: string }> = []
    // Include stylistic sets (ss01-ss99), character variants (cv01-cv99), and salt
    const stylisticPattern = /^(ss\d{2}|salt|calt|cv\d{2}|swsh|cswh)$/

    supportedFeatures.forEach(tag => {
      if (stylisticPattern.test(tag)) {
        // Generate title for stylistic features
        let title = customStylisticNames[tag] || featureNames[tag]

        // Auto-generate titles for unmapped stylistic sets (ss21-ss99)
        if (!title && /^ss\d{2}$/.test(tag)) {
          const setNumber = parseInt(tag.substring(2), 10)
          title = `Stylistic Set ${setNumber}`
        }

        // Auto-generate titles for character variants (cv01-cv99)
        if (!title && /^cv\d{2}$/.test(tag)) {
          const variantNumber = parseInt(tag.substring(2), 10)
          title = `Character Variant ${variantNumber}`
        }

        // Fallback to uppercase tag
        if (!title) {
          title = tag.toUpperCase()
        }

        openTypeFeatureTags.push({ tag, title })
      }
    })

    // Sort by tag for consistent ordering
    openTypeFeatureTags.sort((a, b) => a.tag.localeCompare(b.tag))

    console.log(`🎨 Built ${openTypeFeatureTags.length} feature tags:`, openTypeFeatureTags)

    // Create metadata with safe, serializable values only
    const metadata: FontMetadata = {
      name: String(family || 'Unknown Font'),
      family: String(family || 'Unknown Family'),
      style: String(style || 'Regular'),
      weight: Number(weight) || 400,
      isVariable: Boolean(isVariable),
      format: String(format || 'ttf'),
      fileSize: Number(fileSize) || 0,
      uploadedAt: new Date().toISOString(),
      filename: String(originalName),
      path: `/fonts/uploads/${originalName}`,
      // UI compatibility fields
      styles: availableStyles.length || 1,
      features: supportedFeatures.size > 0 ? Array.from(supportedFeatures) : ['liga', 'kern'],
      category: String(category || 'Sans Serif'),
      price: 'Free',
      availableStyles: availableStyles.filter(s => typeof s === 'string'),
      availableWeights: availableWeights.filter(w => typeof w === 'number' && !isNaN(w)),
      variableAxes: variableAxes.length > 0 ? variableAxes : undefined,
      openTypeFeatures: openTypeFeatures.length > 0 ? openTypeFeatures : ['Standard Ligatures', 'Kerning'],
      openTypeFeatureTags: openTypeFeatureTags.length > 0 ? openTypeFeatureTags : undefined,
      languages: languages.filter(l => typeof l === 'string'),
      foundry: String(foundry || 'Unknown'),
      published: true, // New fonts are published by default
      defaultStyle: weight === 400 && (style === 'Regular' || style === 'Normal'), // 400 weight Regular/Normal is default
      // Enhanced metadata
      version: version || undefined,
      copyright: copyright || undefined,
      license: license || undefined,
      glyphCount: glyphCount || undefined,
      embeddingPermissions: embeddingPermissions || undefined,
      fontMetrics: Object.keys(fontMetrics).length > 0 ? fontMetrics : undefined,
      panoseClassification: panoseClassification || undefined,
      creationDate: creationDate || undefined,
      modificationDate: modificationDate || undefined,
      designerInfo: Object.values(designerInfo).some(v => v) ? designerInfo : undefined,
      description: description || undefined,
      // User-customizable style tags (separate from technical availableStyles)
      styleTags: [] as string[],
      // Collection classification - use detected collection
      collection: detectedCollection,
      // Font family management
      familyId: familyId,
      isDefaultStyle: weight === 400 && (style === 'Regular' || style === 'Normal') && !isItalicStyle,
      italicStyle: isItalicStyle,
      relatedStyles: [] as string[]
    }
    
    // Final safety check - ensure the entire object is serializable
    try {
      JSON.stringify(metadata)
      console.log('✅ Font metadata is safe and serializable')
      return metadata
    } catch (serializationError) {
      console.error('❌ Font metadata contains circular references:', serializationError)
      // Return a minimal safe fallback
      return {
        name: String(family || 'Unknown Font'),
        family: String(family || 'Unknown Family'), 
        style: 'Regular',
        weight: 400,
        isVariable: false,
        format: String(format || 'ttf'),
        fileSize: Number(fileSize) || 0,
        uploadedAt: new Date().toISOString(),
        filename: String(originalName),
        path: `/fonts/uploads/${originalName}`,
        styles: 1,
        features: ['liga', 'kern'],
        category: 'Sans Serif',
        price: 'Free',
        availableStyles: ['Regular'],
        availableWeights: [400],
        openTypeFeatures: ['Standard Ligatures', 'Kerning'],
        languages: ['Latin'],
        foundry: 'Unknown',
        published: true
      }
    }
  } catch (error) {
    console.error('❌ Font parsing error:', error)
    console.error('📁 File details:', { 
      name: originalName, 
      size: fileSize,
      bufferSize: buffer?.byteLength || 0
    })
    
    // Check if it's a valid font file extension
    const validExtensions = ['.ttf', '.otf', '.woff', '.woff2']
    const hasValidExtension = validExtensions.some(ext => 
      originalName.toLowerCase().endsWith(ext)
    )
    
    if (!hasValidExtension) {
      throw new Error(`Invalid font file format. Supported formats: ${validExtensions.join(', ')}`)
    }
    
    // If OpenType.js fails but it's a valid extension, provide detailed error
    const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error'
    throw new Error(`Font parsing failed: ${errorMessage}. The file might be corrupted or use an unsupported font format variant.`)
  }
}

// --- Internal: GSUB + name parsing for Stylistic Set UI names ---
function extractStylisticSetNamesFromGSUB(buffer: ArrayBuffer): Record<string, string> {
  const dv = new DataView(buffer)
  const tagAt = (off: number) => String.fromCharCode(dv.getUint8(off), dv.getUint8(off+1), dv.getUint8(off+2), dv.getUint8(off+3))
  // SFNT header
  const numTables = dv.getUint16(4)
  let gsubOff = 0
  let nameOff = 0
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16
    const tag = tagAt(rec)
    const offset = dv.getUint32(rec + 8)
    if (tag === 'GSUB') gsubOff = offset
    if (tag === 'name') nameOff = offset
  }
  if (!gsubOff || !nameOff) return {}
  const readName = buildNameReader(dv, nameOff)
  const res: Record<string,string> = {}
  // GSUB header: Version(4), ScriptList(2), FeatureList(2), LookupList(2)
  const featureListOffset = dv.getUint16(gsubOff + 6)
  if (!featureListOffset) return {}
  const flOff = gsubOff + featureListOffset
  const featureCount = dv.getUint16(flOff)
  let p = flOff + 2
  for (let i = 0; i < featureCount; i++) {
    const tag = tagAt(p)
    const featOff = dv.getUint16(p + 4)
    // featOff is relative to FeatureList (flOff), not GSUB start
    const ftBase = flOff + featOff
    const lookupCount = dv.getUint16(ftBase + 2)
    // Skip features with no actual substitution lookups
    if (lookupCount === 0) { p += 6; continue }
    if (/^ss\d\d$/.test(tag)) {
      const featureParams = dv.getUint16(ftBase)
      if (featureParams) {
        const params = ftBase + featureParams
        const uiNameID = dv.getUint16(params + 2)
        if (uiNameID) {
          const label = readName(uiNameID)
          if (label) res[tag] = label
        }
      }
    }
    p += 6
  }
  return res
}

function buildNameReader(dv: DataView, nameOff: number) {
  const format = dv.getUint16(nameOff)
  const count = dv.getUint16(nameOff + 2)
  const stringOffset = dv.getUint16(nameOff + 4)
  const records = nameOff + 6
  // Prefer platform 3 entries, but accept first seen
  const map = new Map<number, string>()
  const decodeUTF16BE = (bytes: Uint8Array) => {
    let s = ''
    for (let i = 0; i + 1 < bytes.length; i += 2) s += String.fromCharCode((bytes[i] << 8) | bytes[i+1])
    return s
  }
  const readStr = (platformID: number, length: number, offset: number) => {
    const start = nameOff + stringOffset + offset
    const bytes = new Uint8Array(dv.buffer, start, length)
    return platformID === 3 ? decodeUTF16BE(bytes) : new TextDecoder('utf-8', { fatal: false }).decode(bytes)
  }
  for (let i = 0; i < count; i++) {
    const o = records + i * 12
    const platformID = dv.getUint16(o)
    const encodingID = dv.getUint16(o + 2)
    const languageID = dv.getUint16(o + 4)
    const nameID = dv.getUint16(o + 6)
    const length = dv.getUint16(o + 8)
    const offset = dv.getUint16(o + 10)
    if (length === 0) continue
    const val = readStr(platformID, length, offset).trim()
    if (!val) continue
    if (!map.has(nameID) || platformID === 3) map.set(nameID, val)
  }
  return (id: number) => map.get(id) || ''
}
