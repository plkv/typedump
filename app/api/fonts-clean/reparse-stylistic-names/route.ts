import { NextRequest, NextResponse } from 'next/server'
import { fontStorageClean } from '@/lib/font-storage-clean'

export async function POST(request: NextRequest) {
  try {
    console.log('🎨 Re-parsing existing fonts for custom stylistic set names...')
    
    // Get all existing fonts
    const allFonts = await fontStorageClean.getAllFonts()
    console.log(`Found ${allFonts.length} fonts to re-parse`)
    
    const results = []
    let updatedCount = 0
    let errorCount = 0
    
    for (const font of allFonts) {
      try {
        console.log(`\n🔍 Processing: ${font.family} - ${font.style} (${font.filename})`)
        
        // Download the original font file from blob storage
        const response = await fetch(font.blobUrl)
        if (!response.ok) {
          throw new Error(`Failed to download font: ${response.statusText}`)
        }
        
        const buffer = await response.arrayBuffer()
        console.log(`  📁 Downloaded ${buffer.byteLength} bytes`)
        
        // Re-parse the font with our enhanced parser
        const { parseFontFile } = await import('@/lib/font-parser')
        const parsedData = await parseFontFile(buffer, font.filename, font.fileSize)
        
        // Check if the new parsing found different OpenType features
        const oldFeatures = font.openTypeFeatures || []
        const newFeatures = parsedData.openTypeFeatures || []
        
        // Look specifically for improvements in stylistic set names
        const oldStylisticSets = oldFeatures.filter(f => f.includes('Stylistic Set'))
        const newStylisticSets = newFeatures.filter(f => f.includes('Stylistic Set') || 
          (f.includes('ss') && !f.includes('Stylistic Set'))) // Custom names don't contain "Stylistic Set"
        
        let hasUpdates = false
        const changes: any[] = []
        
        // Check for new/different stylistic features
        newFeatures.forEach(newFeature => {
          if (!oldFeatures.includes(newFeature)) {
            // If it's a stylistic feature that's different, it's likely a custom name
            if (newFeature.match(/ss\d+/) || 
                (newFeature.includes('Stylistic') && !oldFeatures.some(old => 
                  old.includes('Stylistic Set') && newFeature.includes('Stylistic Set')))) {
              hasUpdates = true
              changes.push({
                type: 'stylistic_improvement',
                old: oldFeatures.find(f => f.includes('Stylistic Set')) || 'generic',
                new: newFeature
              })
            }
          }
        })
        
        // Also check if we found any completely new features
        if (newFeatures.length !== oldFeatures.length || 
            newFeatures.some(f => !oldFeatures.includes(f))) {
          hasUpdates = true
          changes.push({
            type: 'feature_update',
            oldCount: oldFeatures.length,
            newCount: newFeatures.length,
            newFeatures: newFeatures.filter(f => !oldFeatures.includes(f))
          })
        }
        
        if (hasUpdates || (parsedData as any).openTypeFeatureTags) {
          console.log(`  ✨ Found improvements for ${font.family}:`)
          changes.forEach(change => {
            if (change.type === 'stylistic_improvement') {
              console.log(`    🎨 Stylistic: "${change.old}" → "${change.new}"`)
            } else {
              console.log(`    🆕 Features: ${change.oldCount} → ${change.newCount}`)
              console.log(`    📝 New: ${change.newFeatures?.join(', ')}`)
            }
          })
          
          // Update the font in the database
          const success = await fontStorageClean.updateFont(font.id, {
            openTypeFeatures: newFeatures,
            // Persist structured tags if available
            // @ts-ignore
            openTypeFeatureTags: (parsedData as any).openTypeFeatureTags
          })
          
          if (success) {
            updatedCount++
            results.push({
              id: font.id,
              family: font.family,
              style: font.style,
              changes,
              success: true
            })
            console.log(`    ✅ Updated successfully`)
          } else {
            console.log(`    ❌ Failed to update database`)
            results.push({
              id: font.id,
              family: font.family,
              style: font.style,
              changes,
              success: false,
              error: 'Database update failed'
            })
          }
        } else {
          console.log(`  ℹ️ No improvements found`)
          results.push({
            id: font.id,
            family: font.family,
            style: font.style,
            changes: [],
            success: true,
            message: 'No changes needed'
          })
        }
        
      } catch (error) {
        errorCount++
        console.log(`  ❌ Error processing ${font.filename}: ${error}`)
        results.push({
          id: font.id,
          family: font.family,
          style: font.style,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    console.log(`\n🎉 Re-parsing complete!`)
    console.log(`   📊 Total fonts: ${allFonts.length}`)
    console.log(`   ✅ Updated: ${updatedCount}`)
    console.log(`   ❌ Errors: ${errorCount}`)
    console.log(`   ℹ️ No changes: ${allFonts.length - updatedCount - errorCount}`)
    
    return NextResponse.json({
      success: true,
      message: `Re-parsed ${allFonts.length} fonts, updated ${updatedCount}`,
      stats: {
        total: allFonts.length,
        updated: updatedCount,
        errors: errorCount,
        noChanges: allFonts.length - updatedCount - errorCount
      },
      results: results.filter(r => r.changes && r.changes.length > 0) // Only return fonts with changes
    })
    
  } catch (error) {
    console.error('❌ Re-parsing error:', error)
    return NextResponse.json({
      success: false,
      error: 'REPARSE_FAILED',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
