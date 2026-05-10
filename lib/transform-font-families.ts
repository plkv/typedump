import type { FontFamily } from '@/lib/models/FontFamily'
import { canonicalFamilyName } from '@/lib/font-naming'
import { shortHash } from '@/lib/hash'
import type { FontData } from '@/components/font-catalog/FontCard'

function styleNameFromWeight(weight: number, isItalic: boolean): string {
  let name = 'Regular'
  if (weight <= 150) name = 'Thin'
  else if (weight <= 250) name = 'ExtraLight'
  else if (weight <= 350) name = 'Light'
  else if (weight <= 450) name = 'Regular'
  else if (weight <= 550) name = 'Medium'
  else if (weight <= 650) name = 'SemiBold'
  else if (weight <= 750) name = 'Bold'
  else if (weight <= 850) name = 'ExtraBold'
  else name = 'Black'
  return isItalic ? `${name} Italic` : name
}

export function transformFamilies(families: FontFamily[]): FontData[] {
  return families.map((family, index) => {
    const variants = family.variants || []
    const rep =
      variants.find(v => v.isDefaultStyle) ||
      variants.find(v => !v.isItalic) ||
      variants[0]
    if (!rep) return null

    const isVariable = family.isVariable || variants.some(v => v.isVariable)
    const alias = `${canonicalFamilyName(family.name)}-${shortHash(canonicalFamilyName(family.name)).slice(0, 6)}`

    let availableWeights: number[] = []
    let availableStyles: FontData['_availableStyles'] = []

    if (isVariable) {
      const weightAxes = variants
        .flatMap(v => v.variableAxes || [])
        .filter(a => a.axis === 'wght')
      if (weightAxes.length > 0) {
        const min = Math.min(...weightAxes.map(a => a.min))
        const max = Math.max(...weightAxes.map(a => a.max))
        availableWeights = [100, 200, 300, 400, 500, 600, 700, 800, 900].filter(w => w >= min && w <= max)
      } else {
        availableWeights = [100, 200, 300, 400, 500, 600, 700, 800, 900]
      }
      availableStyles = availableWeights.map(weight => ({
        weight,
        styleName: styleNameFromWeight(weight, false),
        isItalic: false,
      }))
      const hasItalicAxis = variants.some(v =>
        (v.variableAxes || []).some(a => a.axis === 'ital' || a.axis === 'slnt')
      )
      if (variants.some(v => v.isItalic) || hasItalicAxis) {
        availableStyles = [
          ...availableStyles,
          ...availableWeights.map(weight => ({
            weight,
            styleName: styleNameFromWeight(weight, true),
            isItalic: true,
          })),
        ]
      }
      // Dedupe
      const seen = new Set<string>()
      availableStyles = availableStyles.filter(s => {
        const k = `${s.weight}|${s.isItalic ? 1 : 0}`
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
    } else {
      availableStyles = variants
        .map(v => ({
          weight: v.weight || 400,
          styleName: v.styleName || 'Regular',
          isItalic: v.isItalic,
          cssFamily: `${alias}__v_${shortHash(v.id).slice(0, 6)}`,
        }))
        .sort((a, b) => a.weight !== b.weight ? a.weight - b.weight : (a.isItalic ? 1 : -1))
      availableWeights = [...new Set(availableStyles.map(s => s.weight))].sort((a, b) => a - b)
    }

    const hasItalic = variants.some(v => v.isItalic)
    const category = Array.isArray(family.category) ? family.category[0] || 'Sans' : family.category?.[0] || 'Sans'

    return {
      id: index + 1,
      name: family.name,
      family: family.name,
      style: `${variants.length} style${variants.length !== 1 ? 's' : ''}`,
      category,
      styles: availableStyles.length || variants.length,
      type: isVariable ? 'Variable' : 'Static',
      author: family.foundry || 'Unknown',
      fontFamily: `"${alias}", system-ui, sans-serif`,
      availableWeights,
      hasItalic,
      filename: rep.originalFilename || rep.filename,
      url: rep.blobUrl,
      downloadLink: (family as any).downloadLink,
      variableAxes: rep.variableAxes as any,
      openTypeFeatures: rep.openTypeFeatures,
      _familyFonts: variants.map(v => ({
        weight: v.weight,
        style: v.styleName,
        isItalic: v.isItalic,
        blobUrl: v.blobUrl,
        url: v.blobUrl,
        cssFamily: `${alias}__v_${shortHash(v.id).slice(0, 6)}`,
        downloadLink: (v as any).downloadLink,
        variableAxes: v.variableAxes,
        openTypeFeatures: v.openTypeFeatures,
        openTypeFeatureTags: v.openTypeFeatureTags,
        uploadedAt: v.uploadedAt || null,
      })),
      _availableStyles: availableStyles,
      collection: family.collection || 'Text',
      styleTags: family.styleTags || [],
      languages: Array.isArray(family.languages) ? family.languages : ['Latin'],
      categories: Array.isArray(family.category) ? family.category : [category],
    } as FontData
  }).filter(Boolean) as FontData[]
}
