/**
 * Single source of truth for CSS font-family aliases.
 *
 * These aliases are built in two places that must agree exactly: the running
 * app (which asks for a family by name) and scripts/generate-font-css.mjs
 * (which writes the @font-face rules into public/fonts/fonts.css). They used to
 * be two separate implementations with different canonicalisation and different
 * hash functions, so no rule in fonts.css ever matched what the app requested.
 * Plain .mjs so both the TypeScript app and the plain-node build script can
 * import the very same code.
 */

/** Normalise a family name: strip quotes, collapse whitespace. Spaces are kept. */
export function canonicalFamilyName(name) {
  try {
    return String(name)
      .normalize('NFKC')
      .replace(/["']/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  } catch {
    return String(name || '').replace(/["']/g, '').replace(/\s+/g, ' ').trim()
  }
}

/** Stable 8-char hash. Call sites slice it to 6. */
export function shortHash(input) {
  let h = 0
  const s = String(input)
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  const hex = (h >>> 0).toString(16)
  return hex.padStart(8, '0')
}

/** Family-level alias, e.g. `Plus Jakarta Sans-8593da`. */
export function familyAlias(familyName) {
  const canonical = canonicalFamilyName(familyName)
  return `${canonical}-${shortHash(canonical).slice(0, 6)}`
}

/**
 * Per-variant alias, e.g. `Plus Jakarta Sans-8593da__v_a412e3`.
 * `key` must be the variant's URL (the app hashes blobUrl, which is the same
 * value the data file stores as `url`).
 */
export function variantAlias(familyName, key) {
  return `${familyAlias(familyName)}__v_${shortHash(key).slice(0, 6)}`
}
