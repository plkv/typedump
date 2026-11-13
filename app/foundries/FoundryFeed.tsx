'use client'

import { useMemo, useState } from 'react'
import { FilterBar, FilterChip, FilterGroup } from '@/components/font-catalog/FilterBar'
import { FoundryRow, type FoundryFont } from './FoundryRow'

const newest = (a: FoundryFont, b: FoundryFont) => (b.date || '').localeCompare(a.date || '')

const SORTS = {
  New: newest,
  'Foundry A–Z': (a: FoundryFont, b: FoundryFont) => a.foundry.localeCompare(b.foundry) || newest(a, b),
}
type Sort = keyof typeof SORTS
const DEFAULT_SORT: Sort = 'New'

const toggle = (list: string[], item: string) => (list.includes(item) ? list.filter(x => x !== item) : [...list, item])
const sorted = (values: Iterable<string>) => [...new Set(values)].sort((a, b) => a.localeCompare(b))

// The same rules as the catalogue: foundries are OR (any of those picked),
// categories AND (all of them). An OR group offers what the other groups
// leave; an AND group offers what the current result still holds.
export function FoundryFeed({ fonts }: { fonts: FoundryFont[] }) {
  const [open, setOpen] = useState(false)
  const [foundries, setFoundries] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT)

  const inFoundries = (f: FoundryFont) => !foundries.length || foundries.includes(f.foundry)
  const inCategories = (f: FoundryFont) => categories.every(c => f.category.includes(c))

  const shown = fonts.filter(f => inFoundries(f) && inCategories(f)).sort(SORTS[sort])
  const allFoundries = useMemo(() => sorted(fonts.map(f => f.foundry)), [fonts])
  const allCategories = useMemo(() => sorted(fonts.flatMap(f => f.category)), [fonts])
  const foundriesLeft = new Set(fonts.filter(inCategories).map(f => f.foundry))
  const categoriesLeft = new Set(shown.flatMap(f => f.category))

  const reset = () => {
    setFoundries([])
    setCategories([])
    setSort(DEFAULT_SORT)
  }

  return (
    <>
      <main className="foundries-list px-2 space-y-2">
        {shown.map(font => (
          <FoundryRow key={font.url} font={font} />
        ))}
      </main>
      <FilterBar
        open={open}
        onOpenChange={setOpen}
        title={`${shown.length} typefaces`}
        trigger="Filters"
        activeCount={foundries.length + categories.length}
        canReset={foundries.length + categories.length > 0 || sort !== DEFAULT_SORT}
        onReset={reset}
      >
        <FilterGroup title="Sort by">
          {(Object.keys(SORTS) as Sort[]).map(s => (
            <FilterChip key={s} active={sort === s} onClick={() => setSort(s)}>{s}</FilterChip>
          ))}
        </FilterGroup>
        <FilterGroup title="Font categories">
          {allCategories.map(c => (
            <FilterChip key={c} active={categories.includes(c)} available={categoriesLeft.has(c)} onClick={() => setCategories(prev => toggle(prev, c))}>
              {c}
            </FilterChip>
          ))}
        </FilterGroup>
        <FilterGroup title="Foundries">
          {allFoundries.map(f => (
            <FilterChip key={f} active={foundries.includes(f)} available={foundriesLeft.has(f)} onClick={() => setFoundries(prev => toggle(prev, f))}>
              {f}
            </FilterChip>
          ))}
        </FilterGroup>
      </FilterBar>
    </>
  )
}
