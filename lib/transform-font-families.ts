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
      type RawStyle = { weight: number; styleName: string; isItalic: boolean; cssFamily: string; _filename: string }

      const rawStyles: RawStyle[] = variants
        .map(v => ({
          weight: v.weight || 400,
          styleName: v.styleName || 'Regular',
          isItalic: v.isItalic,
          cssFamily: `${alias}__v_${shortHash(v.blobUrl || v.filename || v.id).slice(0, 6)}`,
          _filename: (v.originalFilename || v.filename || '').replace(/\.[^.]+$/, ''),
        }))
        .sort((a, b) => a.weight !== b.weight ? a.weight - b.weight : (a.isItalic ? 1 : -1))

      // Check for any styleName collision
      const nameCounts = new Map<string, number>()
      for (const s of rawStyles) nameCounts.set(s.styleName, (nameCounts.get(s.styleName) || 0) + 1)
      const hasCollision = Array.from(nameCounts.values()).some(c => c > 1)

      if (hasCollision) {
        // Extract style names from filenames using LCP + LCS stripping across ALL variants
        const filenames = rawStyles.map(s => s._filename)

        function lcp(strs: string[]): string {
          if (!strs.length) return ''
          let p = strs[0]
          for (const s of strs.slice(1)) while (!s.startsWith(p)) p = p.slice(0, -1)
          return p
        }
        function lcs(strs: string[]): string {
          const rev = strs.map(s => [...s].reverse().join(''))
          return [...lcp(rev)].reverse().join('')
        }

        const prefixLen = lcp(filenames).length
        const suffixLen = lcs(filenames).length

        for (const s of rawStyles) {
          const core = s._filename
            .slice(prefixLen, suffixLen ? -suffixLen : undefined)
            .replace(/^[-_\s]+/, '').replace(/[-_\s]+$/, '')
          if (core) {
            s.styleName = core
              .replace(/([a-z])([A-Z])/g, '$1 $2')
              .replace(/[-_]/g, ' ')
              .replace(/\b\w/g, c => c.toUpperCase())
              .trim()
          } else {
            s.styleName = styleNameFromWeight(s.weight, s.isItalic)
          }
        }

        // If filename extraction still leaves collisions, fall back to weight-based names
        const nameCounts2 = new Map<string, number>()
        for (const s of rawStyles) nameCounts2.set(s.styleName, (nameCounts2.get(s.styleName) || 0) + 1)
        if (Array.from(nameCounts2.values()).some(c => c > 1)) {
          for (const s of rawStyles) s.styleName = styleNameFromWeight(s.weight, s.isItalic)
        }
      }

      // Final dedupe by styleName, keeping first occurrence (already sorted by weight asc)
      const seenNames = new Set<string>()
      availableStyles = rawStyles
        .filter(s => seenNames.has(s.styleName) ? false : (seenNames.add(s.styleName), true))
        .map(({ _filename: _f, ...rest }) => rest)

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
        cssFamily: `${alias}__v_${shortHash(v.blobUrl || v.filename || v.id).slice(0, 6)}`,
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
