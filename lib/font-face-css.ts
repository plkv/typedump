import type { FontFamily } from '@/lib/models/FontFamily'
import { variantAlias } from './font-alias.mjs'

/**
 * Alias for one specific variant file.
 *
 * Keyed by the variant's URL, not its id, so it matches the aliases the
 * catalogue and public/fonts/fonts.css produce. (It used to hash the id, which
 * silently produced a name nothing else in the app could resolve.)
 */
export function variantCssFamily(family: FontFamily, variantId: string) {
  const v = family.variants.find(x => x.id === variantId)
  return variantAlias(family.name, v?.blobUrl || v?.filename || variantId)
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
