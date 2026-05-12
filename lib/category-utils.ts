export type Collection = 'Text' | 'Display' | 'Brutal'

const canonicalMap: Record<string, string> = {
  // Core
  'sans': 'Sans',
  'sans serif': 'Sans',
  'sans-serif': 'Sans',
  'serif': 'Serif',
  'slab': 'Slab',
  'slab serif': 'Slab',
  'mono': 'Mono',
  'monospace': 'Mono',
  // Display-ish
  'fatface': 'Fatface',
  'script': 'Script',
  'handwritten': 'Handwritten',
  'stencil': 'Stencil',
  'pixel': 'Pixel',
  'vintage': 'Vintage',
  // Brutal-ish
  'experimental': 'Experimental',
  'symbol': 'Symbol',
  'bitmap': 'Bitmap',
  'decorative': 'Decorative',
  'artistic': 'Artistic',
  'conceptual': 'Conceptual',
}

export function toTitleCase(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function normalizeCategory(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/[_-]+/g, ' ')
  const mapped = canonicalMap[key]
  return mapped ? mapped : toTitleCase(raw)
}

export function normalizeCategoryList(list: string[] | undefined | null): string[] {
  if (!list || !Array.isArray(list)) return []
  const out = new Set<string>()
  list.forEach(item => {
    const c = normalizeCategory(item)
    if (c) out.add(c)
  })
  return Array.from(out)
}

