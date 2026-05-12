import type { FontFamily } from '@/lib/models/FontFamily'
import { canonicalFamilyName } from '@/lib/font-naming'
import { shortHash } from '@/lib/hash'

export function variantCssFamily(family: FontFamily, variantId: string) {
  const alias = canonicalFamilyName(family.name)
  const fHash = shortHash(alias).slice(0, 6)
  const vHash = shortHash(variantId).slice(0, 6)
  return `${alias}-${fHash}__v_${vHash}`
}

export function buildFontFaceCSS(family: FontFamily): string {
  return family.variants.map(v => {
    const css = variantCssFamily(family, v.id)
    const url = v.blobUrl || `/fonts/${v.filename}`

    const wAxis = v.variableAxes?.find(a => (a as any).tag === 'wght' || a.axis === 'wght')
    const weight = v.isVariable && wAxis
      ? `${Math.floor(wAxis.min)} ${Math.ceil(wAxis.max)}`
      : `${v.weight}`

    const ext = v.filename.split('.').pop()?.toLowerCase() ?? 'ttf'
    const fmt = ext === 'woff2' ? 'woff2' : ext === 'woff' ? 'woff' : ext === 'otf' ? 'opentype' : 'truetype'

    return `@font-face{font-family:"${css}";src:url("${url}") format("${fmt}");font-weight:${weight};font-style:${v.isItalic ? 'italic' : 'normal'};font-display:block;}`
  }).join('\n')
}
