'use client'

import { useMemo, useState } from 'react'
import { IconChevronDown } from '@/components/icons'
import { FoundryRow, type FoundryFont } from './FoundryRow'

const ALL = ''

const SORTS = {
  newest: { label: 'Newest', compare: (a: FoundryFont, b: FoundryFont) => (b.date || '').localeCompare(a.date || '') },
  foundry: {
    label: 'Foundry A–Z',
    compare: (a: FoundryFont, b: FoundryFont) =>
      a.foundry.localeCompare(b.foundry) || (b.date || '').localeCompare(a.date || ''),
  },
}
type Sort = keyof typeof SORTS

function Select({ label, value, onChange, children }: {
  label: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="relative v2-dropdown foundries-filter">
      <select aria-label={label} value={value} onChange={e => onChange(e.target.value)} className="foundries-filter-select">
        {children}
      </select>
      <IconChevronDown size={20} className="foundries-filter-chevron" />
    </div>
  )
}

// Counted on the whole feed, not the filtered one: picking a foundry should not
// make the other foundries vanish from the list you would switch to.
const count = (fonts: FoundryFont[], key: (f: FoundryFont) => string[]) => {
  const n = new Map<string, number>()
  for (const f of fonts) for (const k of key(f)) n.set(k, (n.get(k) || 0) + 1)
  return [...n].sort(([a], [b]) => a.localeCompare(b))
}

export function FoundryFeed({ fonts }: { fonts: FoundryFont[] }) {
  const [foundry, setFoundry] = useState(ALL)
  const [category, setCategory] = useState(ALL)
  const [sort, setSort] = useState<Sort>('newest')

  const foundries = useMemo(() => count(fonts, f => [f.foundry]), [fonts])
  const categories = useMemo(() => count(fonts, f => f.category), [fonts])
  const shown = useMemo(
    () =>
      fonts
        .filter(f => (foundry === ALL || f.foundry === foundry) && (category === ALL || f.category.includes(category)))
        .sort(SORTS[sort].compare),
    [fonts, foundry, category, sort],
  )

  return (
    <>
      <main className="foundries-list px-2 space-y-2">
        {shown.map(font => (
          <FoundryRow key={font.url} font={font} />
        ))}
      </main>
      <div className="foundries-filters v2-card v2-overlay">
        <Select label="Foundry" value={foundry} onChange={setFoundry}>
          <option value={ALL}>Foundry</option>
          {foundries.map(([name, n]) => (
            <option key={name} value={name}>{`${name} (${n})`}</option>
          ))}
        </Select>
        <Select label="Category" value={category} onChange={setCategory}>
          <option value={ALL}>Category</option>
          {categories.map(([name, n]) => (
            <option key={name} value={name}>{`${name} (${n})`}</option>
          ))}
        </Select>
        <Select label="Order" value={sort} onChange={v => setSort(v as Sort)}>
          {Object.entries(SORTS).map(([key, s]) => (
            <option key={key} value={key}>{s.label}</option>
          ))}
        </Select>
      </div>
    </>
  )
}
