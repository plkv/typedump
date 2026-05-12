/**
 * Production Data Export & Analysis Script
 * Extracts all current font data for migration planning
 */

interface ProductionFont {
  id: string
  filename: string
  family: string
  style: string
  weight: number
  format: string
  fileSize: number
  blobUrl: string
  
  // Admin customizations
  collection: string
  downloadLink?: string
  styleTags: string[]
  
  // Parsed metadata
  languages: string[]
  category: string | string[]
  variableAxes?: any[]
  openTypeFeatures: string[]
  
  // Admin edits
  editableCreationDate?: string
  editableVersion?: string
  editableLicenseType?: string
  
  // Family relationships
  familyId?: string
  isDefaultStyle?: boolean
  
  uploadedAt: string
}

async function exportProductionData() {
  console.log('🔄 Fetching production data...')
  
  try {
    const response = await fetch('https://baseline-fonts.vercel.app/api/fonts-clean/list')
    const data = await response.json()
    
    if (!data.success || !data.fonts) {
      throw new Error('Failed to fetch production data')
    }
    
    const fonts = data.fonts as ProductionFont[]
    console.log(`✅ Fetched ${fonts.length} fonts`)
    
    // Analysis
    const analysis = {
      totalFonts: fonts.length,
      uniqueFamilies: new Set(fonts.map(f => f.family)).size,
      collections: {
        Text: fonts.filter(f => f.collection === 'Text').length,
        Display: fonts.filter(f => f.collection === 'Display').length,
        Brutal: fonts.filter(f => f.collection === 'Brutal').length,
      },
      adminCustomizations: {
        withDownloadLinks: fonts.filter(f => f.downloadLink && f.downloadLink.trim()).length,
        withStyleTags: fonts.filter(f => f.styleTags && f.styleTags.length > 0).length,
        withEditedMetadata: fonts.filter(f => 
          f.editableCreationDate || f.editableVersion || f.editableLicenseType
        ).length,
      },
      formats: fonts.reduce((acc, f) => {
        acc[f.format] = (acc[f.format] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      variableFonts: fonts.filter(f => f.variableAxes && f.variableAxes.length > 0).length,
    }
    
    // Family analysis
    const families = fonts.reduce((acc, font) => {
      const familyName = font.family
      if (!acc[familyName]) {
        acc[familyName] = []
      }
      acc[familyName].push(font)
      return acc
    }, {} as Record<string, ProductionFont[]>)
    
    const familyAnalysis = {
      totalFamilies: Object.keys(families).length,
      singleStyleFamilies: Object.values(families).filter(f => f.length === 1).length,
      multiStyleFamilies: Object.values(families).filter(f => f.length > 1).length,
      largestFamily: Math.max(...Object.values(families).map(f => f.length)),
    }
    
    const exportData = {
      exportDate: new Date().toISOString(),
      analysis,
      familyAnalysis,
      fonts,
      families,
    }
    
    console.log('\n📊 PRODUCTION DATA ANALYSIS:')
    console.log(`Total Fonts: ${analysis.totalFonts}`)
    console.log(`Unique Families: ${analysis.uniqueFamilies}`)
    console.log(`Collections: Text=${analysis.collections.Text}, Display=${analysis.collections.Display}, Brutal=${analysis.collections.Brutal}`)
    console.log(`Admin Customizations: ${analysis.adminCustomizations.withEditedMetadata} fonts`)
    console.log(`Variable Fonts: ${analysis.variableFonts}`)
    console.log(`Family Distribution: ${familyAnalysis.singleStyleFamilies} single + ${familyAnalysis.multiStyleFamilies} multi-style`)
    
    return exportData
    
  } catch (error) {
    console.error('❌ Export failed:', error)
    throw error
  }
}

// Export for use in other scripts
export { exportProductionData, type ProductionFont }

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  exportProductionData()
    .then(data => {
      console.log('✅ Export completed')
      console.log('Data ready for migration planning')
    })
    .catch(console.error)
}