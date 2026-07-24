import type { FontFamily } from '@/lib/models/FontFamily'
import { FontVariantUtils } from '@/lib/models/FontVariant'
import { familyAlias, variantAlias } from './font-alias.mjs'

function escapeCssString(input: string): string {
  return input.replace(/"/g, '\\"')
}

// Use direct blob URLs in CSS to avoid server-only Buffer usage and runtime constraints

export function buildFontCSS(families: FontFamily[]): string {
  const chunks: string[] = []
  for (const fam of families) {
    const familyName = escapeCssString(familyAlias(fam.name))
    for (const v of fam.variants) {
      if (!v.blobUrl) continue
      chunks.push(`/* ${familyName} :: ${v.styleName} ${v.weight}${v.isItalic ? ' Italic' : ''} */`)
      // Direct blob source for base alias
      chunks.push(FontVariantUtils.toCSSFontFace(v, familyName))
      // Per-variant alias allows selecting a specific file even when weight/style collide
      const vAlias = escapeCssString(variantAlias(fam.name, v.blobUrl || v.filename || v.id))
      chunks.push(FontVariantUtils.toCSSFontFace(v, vAlias))
    }
  }
  return chunks.join('\n')
}
