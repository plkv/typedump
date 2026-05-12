import type { FontFamily } from '@/lib/models/FontFamily'
import { FontVariantUtils } from '@/lib/models/FontVariant'
import { canonicalFamilyName } from '@/lib/font-naming'
import { shortHash } from '@/lib/hash'

function escapeCssString(input: string): string {
  return input.replace(/"/g, '\\"')
}

// Use direct blob URLs in CSS to avoid server-only Buffer usage and runtime constraints

export function buildFontCSS(families: FontFamily[]): string {
  const chunks: string[] = []
  for (const fam of families) {
    const canonical = canonicalFamilyName(fam.name)
    const alias = `${canonical}-${shortHash(canonical).slice(0,6)}`
    const familyName = escapeCssString(alias)
    for (const v of fam.variants) {
      if (!v.blobUrl) continue
      chunks.push(`/* ${familyName} :: ${v.styleName} ${v.weight}${v.isItalic ? ' Italic' : ''} */`)
      // Direct blob source for base alias
      chunks.push(FontVariantUtils.toCSSFontFace(v, familyName))
      // Per-variant alias allows selecting a specific file even when weight/style collide
      const variantAlias = `${familyName}__v_${shortHash(v.blobUrl || v.filename || v.id).slice(0,6)}`
      chunks.push(FontVariantUtils.toCSSFontFace(v, variantAlias))
    }
  }
  return chunks.join('\n')
}
