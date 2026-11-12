import type { Metadata } from 'next'
import { Navbar } from '@/components/font-catalog/Navbar'
import { FoundryRow, type FoundryFont } from './FoundryRow'

// Written by scripts/foundries/index.mjs, newest first; read at build time.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const data = require('../../public/foundry-fonts.json') as { generatedAt: string; fonts: FoundryFont[] }

// Retail faces from other foundries, kept for reference and out of search.
export const metadata: Metadata = {
  title: 'Foundries | typedump',
  robots: { index: false, follow: false },
}

export default function FoundriesPage() {
  return (
    <div className="foundries-page">
      <Navbar back />
      <main className="foundries-list px-2 space-y-2">
        {data.fonts.map(font => (
          <FoundryRow key={font.url} font={font} />
        ))}
      </main>
    </div>
  )
}
