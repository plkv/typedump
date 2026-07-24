import type { FontFamily } from '@/lib/models/FontFamily'
import { variantAlias } from './font-alias.mjs'
import { fontFaceRule } from './font-face.mjs'

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
    const wAxis = v.variableAxes?.find(a => (a as any).tag === 'wght' || a.axis === 'wght')
    const weight = v.isVariable && wAxis
      ? `${Math.floor(wAxis.min)} ${Math.ceil(wAxis.max)}`
      : `${v.weight}`

    return fontFaceRule({
      family: variantCssFamily(family, v.id),
      src: v.blobUrl || `/fonts/${v.filename}`,
      weight,
      isItalic: v.isItalic,
      format: v.filename.split('.').pop() ?? 'ttf',
      // block, not swap: the hero glyph is huge, a swap flash would be jarring.
      fontDisplay: 'block',
    })
  }).join('\n')
}
