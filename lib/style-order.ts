import { COLLECTIONS } from '@/lib/types'

// The "Style" sort walks the catalogue the way a specimen book would: by
// skeleton, then by how readable the face is, then by class. Sans text
// grotesques come first, then neo-grotesques, humanists and geometrics, then
// the same sans skeletons in Display and Brutal, then the serifs by class.
export const CATEGORY_ORDER = ['Sans', 'Serif', 'Semi Serif', 'Mono', 'Script', 'Decorative', 'Pixel']

// Classes first (what the letters are), then construction, proportion and
// weight, then hand, then character. A family is placed by its tags' ranks
// compared in order, so [Grotesque, Narrow] sits before [Grotesque, Wide].
export const STYLE_ORDER = [
  'Grotesque', 'New Face', 'Neutral', 'Humanist', 'Gill', 'Geometry', 'Futura', 'Bauhaus', 'Banded',
  'Old Face', 'Transitional', 'Modern', 'Slab',
  'Tech', 'Squared', 'Modular', 'Rounded', 'Low Poly', 'Cut', 'Sharp', 'Inktrap', 'Stencil', 'Stroked',
  'Narrow', 'Wide', 'Fatface', 'Contrast',
  'Calligraphy', 'Handwritten',
  'Curly', 'Wavy', 'Vintage', 'Multi Style', 'Pixel',
]

const rank = (order: readonly string[], value: string) => {
  const i = order.indexOf(value)
  return i === -1 ? order.length : i
}

interface Classified {
  name: string
  categories: string[]
  collection: string
  styleTags: string[]
}

function styleKey(font: Classified): number[] {
  const category = Math.min(...(font.categories.length ? font.categories : ['']).map(c => rank(CATEGORY_ORDER, c)))
  const tags = font.styleTags.map(t => rank(STYLE_ORDER, t)).sort((a, b) => a - b)
  return [category, rank(COLLECTIONS, font.collection), ...tags]
}

export function compareByStyle(a: Classified, b: Classified): number {
  const ka = styleKey(a)
  const kb = styleKey(b)
  for (let i = 0; i < Math.max(ka.length, kb.length); i++) {
    // A family with fewer tags comes first among equals: the plainer face.
    const d = (ka[i] ?? -1) - (kb[i] ?? -1)
    if (d !== 0) return d
  }
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
}
