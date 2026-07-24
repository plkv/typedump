/**
 * Shared @font-face assembly. Three call sites emit @font-face rules — the
 * fonts.css generator, the font detail page's inline block, and the
 * /api/font-css route. They intentionally differ in a few inputs (font-display
 * swap vs block; how the weight range is derived), so this module only owns the
 * parts that must be identical: the src format() hint and the final rule string.
 * Plain .mjs so the TS app and the node build script share one implementation.
 */

const FORMAT_BY_KEY = {
  woff2: 'woff2',
  woff: 'woff',
  truetype: 'truetype',
  opentype: 'opentype',
  ttf: 'truetype',
  otf: 'opentype',
}

/** ` format("woff2")` from a format keyword or a file extension; '' if unknown. */
export function formatHint(formatOrExt) {
  const k = String(formatOrExt || '').toLowerCase()
  return FORMAT_BY_KEY[k] ? ` format("${FORMAT_BY_KEY[k]}")` : ''
}

/**
 * One @font-face rule. Callers pass the already-decided values (family alias,
 * src url, font-weight string, italic flag, format keyword/ext, font-display).
 */
export function fontFaceRule({ family, src, weight, isItalic, format, fontDisplay = 'swap' }) {
  return `@font-face{font-family:"${family}";src:url("${src}")${formatHint(format)};`
    + `font-weight:${weight};font-style:${isItalic ? 'italic' : 'normal'};font-display:${fontDisplay};}`
}
