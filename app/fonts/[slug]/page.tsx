import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { staticDb } from '@/lib/static-db'
import { familyToSlug } from '@/lib/font-slug'
import type { FontFamily } from '@/lib/models/FontFamily'
import { Navbar } from '@/components/font-catalog/Navbar'

const SITE = 'https://www.typedump.com'

const isVariable = (f: FontFamily) => f.isVariable || f.variants.some(v => v.isVariable)
const hasCategory = (f: FontFamily, c: string) => (f.category || []).includes(c)
const hasLanguage = (f: FontFamily, l: string) => (f.languages || []).includes(l)

interface Landing {
  slug: string
  h1: string
  /** Plain-language lead paragraph — real guidance, not keyword filler. */
  intro: string
  /** Short label used in <title> and meta. */
  label: string
  match: (f: FontFamily) => boolean
  /** Catalog URL that reproduces this filter. */
  catalogHref: string
}

const LANDINGS: Landing[] = [
  {
    slug: 'serif', label: 'Serif Fonts', h1: 'Free serif fonts',
    intro: 'Serif typefaces carry small strokes at the ends of their letterforms. They range from old-style faces with a diagonal axis and gentle contrast, through transitional and modern cuts, to heavy slabs. Every family here is free to download and use, with the licence shown on each page.',
    match: f => hasCategory(f, 'Serif'), catalogHref: '/?category=Serif',
  },
  {
    slug: 'sans', label: 'Sans Serif Fonts', h1: 'Free sans serif fonts',
    intro: 'Sans serif typefaces drop the terminal strokes for cleaner, more neutral letterforms — the default choice for interfaces, signage and most screen text. This list covers neutral workhorses, geometric and humanist designs, and expressive display sans.',
    match: f => hasCategory(f, 'Sans'), catalogHref: '/?category=Sans',
  },
  {
    slug: 'mono', label: 'Monospace Fonts', h1: 'Free monospace fonts',
    intro: 'Monospaced typefaces give every character the same width, which keeps code, tabular data and terminal output aligned. Each family below is free to download, with variable and multi-weight options where available.',
    match: f => hasCategory(f, 'Mono'), catalogHref: '/?category=Mono',
  },
  {
    slug: 'pixel', label: 'Pixel Fonts', h1: 'Free pixel fonts',
    intro: 'Pixel and bitmap typefaces are drawn on a visible grid. They suit game UI, low-resolution displays and deliberately raw, screen-native design work. All are free to download.',
    match: f => hasCategory(f, 'Pixel'), catalogHref: '/?category=Pixel',
  },
  {
    slug: 'script', label: 'Script Fonts', h1: 'Free script fonts',
    intro: 'Script typefaces imitate handwriting — from formal connected copperplate to loose, hand-drawn lettering. They work best large, in logotypes, invitations and headlines rather than body text.',
    match: f => hasCategory(f, 'Script'), catalogHref: '/?category=Script',
  },
  {
    slug: 'semi-serif', label: 'Semi Serif Fonts', h1: 'Free semi serif fonts',
    intro: 'Semi serif typefaces sit between sans and serif: mostly clean stems with partial, flared or brush-drawn terminals. A useful middle ground when a pure sans feels flat and a full serif feels too traditional.',
    match: f => hasCategory(f, 'Semi Serif'), catalogHref: '/?category=Semi%20Serif',
  },
  {
    slug: 'variable', label: 'Variable Fonts', h1: 'Free variable fonts',
    intro: 'Variable fonts ship every weight, width or optical size in a single file with continuous axes, so you can dial in exact styles and load less. Each family here exposes its axes so you can test them in the browser before downloading.',
    match: isVariable, catalogHref: '/',
  },
  {
    slug: 'text', label: 'Text Fonts', h1: 'Free fonts for body text',
    intro: 'Neutral, readable typefaces built for setting long passages — interfaces, articles and documentation. They hold up at small sizes and usually offer a full weight range.',
    match: f => f.collection === 'Text', catalogHref: '/?collection=Text',
  },
  {
    slug: 'display', label: 'Display Fonts', h1: 'Free display fonts',
    intro: 'Display typefaces are made to be seen large — posters, headlines and brand lockups. They carry more character and finer detail than text faces, which is exactly why they should not be used for body copy.',
    match: f => f.collection === 'Display', catalogHref: '/?collection=Display',
  },
  {
    slug: 'experimental', label: 'Experimental Fonts', h1: 'Free experimental fonts',
    intro: 'Odd, broken and deliberately strange typefaces — distorted, modular, pixelated or layered. Made for work that wants to look nothing like a default.',
    match: f => f.collection === 'Brutal', catalogHref: '/?collection=Brutal',
  },
  {
    slug: 'cyrillic', label: 'Cyrillic Fonts', h1: 'Free Cyrillic fonts',
    intro: 'Typefaces with Cyrillic coverage, for Russian, Ukrainian, Bulgarian, Serbian and other languages using the script. Preview Cyrillic text directly in the browser before you download.',
    match: f => hasLanguage(f, 'Cyrillic'), catalogHref: '/?language=Cyrillic',
  },
  {
    slug: 'greek', label: 'Greek Fonts', h1: 'Free Greek fonts',
    intro: 'Typefaces that include a Greek character set alongside Latin, so you can set both scripts in one family without a fallback.',
    match: f => hasLanguage(f, 'Greek'), catalogHref: '/?language=Greek',
  },
  {
    slug: 'vietnamese', label: 'Vietnamese Fonts', h1: 'Free Vietnamese fonts',
    intro: 'Typefaces with the diacritic coverage Vietnamese needs — stacked tone marks and modified vowels drawn properly rather than pieced together from fallbacks.',
    match: f => hasLanguage(f, 'Vietnamese'), catalogHref: '/?language=Vietnamese',
  },
]

const findLanding = (slug: string) => LANDINGS.find(l => l.slug === slug)

export function generateStaticParams() {
  return LANDINGS.map(l => ({ slug: l.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const landing = findLanding(slug)
  if (!landing) return {}
  const count = staticDb.getAllFamilies().filter(landing.match).length
  const title = `${count} Free ${landing.label} — Download | typedump`
  const description = `${landing.intro.split('. ')[0]}. Browse ${count} free, open-source ${landing.label.toLowerCase()} on typedump — preview in the browser, check the licence, download.`
  const url = `${SITE}/fonts/${landing.slug}`
  return {
    title,
    description: description.length > 160 ? description.slice(0, 157) + '…' : description,
    keywords: [
      `free ${landing.label.toLowerCase()}`, `${landing.label.toLowerCase()} download`,
      `open source ${landing.label.toLowerCase()}`, 'free fonts', 'font download',
    ].join(', '),
    alternates: { canonical: url },
    openGraph: {
      title, description, url, siteName: 'typedump', type: 'website',
      images: [{ url: '/og-image.webp', width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: ['/og-image.webp'] },
  }
}

export default async function FontsLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const landing = findLanding(slug)
  if (!landing) notFound()

  const families = staticDb.getAllFamilies()
    .filter(landing.match)
    .sort((a, b) => a.name.localeCompare(b.name))
  const url = `${SITE}/fonts/${landing.slug}`

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Free ${landing.label}`,
    description: landing.intro,
    url,
    numberOfItems: families.length,
    itemListElement: families.map((f, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE}/font/${familyToSlug(f.name)}`,
      name: f.name,
    })),
  }
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Free fonts', item: SITE },
      { '@type': 'ListItem', position: 2, name: `Free ${landing.label}`, item: url },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <Navbar fonts={families.map(f => ({ name: f.name, author: f.foundry }))} back />

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '96px 24px 120px' }}>
        <h1 style={{
          fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 700, lineHeight: 1.1,
          color: 'var(--gray-cont-prim)', margin: 0,
        }}>
          {landing.h1}
        </h1>

        <p style={{ fontSize: 16, lineHeight: 1.55, color: 'var(--gray-cont-sec)', marginTop: 16, maxWidth: 680 }}>
          {landing.intro}
        </p>

        <p style={{ fontSize: 14, color: 'var(--gray-cont-tert)', marginTop: 12 }}>
          {families.length} famil{families.length === 1 ? 'y' : 'ies'} · free to download ·{' '}
          <a href={landing.catalogHref} style={{ color: 'var(--gray-cont-prim)' }}>
            open in the catalogue to preview and filter →
          </a>
        </p>

        <ul style={{
          listStyle: 'none', padding: 0, marginTop: 40,
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12,
        }}>
          {families.map(f => {
            const styles = f.variants.length
            return (
              <li key={f.id}>
                <a
                  href={`/font/${familyToSlug(f.name)}`}
                  className="v2-card"
                  style={{
                    display: 'block', padding: '14px 16px', textDecoration: 'none',
                    color: 'var(--gray-cont-prim)',
                  }}
                >
                  <span style={{ display: 'block', fontSize: 16, fontWeight: 600 }}>{f.name}</span>
                  <span style={{ display: 'block', fontSize: 13, color: 'var(--gray-cont-tert)', marginTop: 2 }}>
                    {f.foundry !== 'Unknown' ? `${f.foundry} · ` : ''}
                    {styles} style{styles !== 1 ? 's' : ''}
                    {isVariable(f) ? ' · variable' : ''}
                    {f.licenseInfo?.type ? ` · ${f.licenseInfo.type}` : ''}
                  </span>
                </a>
              </li>
            )
          })}
        </ul>

        {/* Sibling links: real internal linking between topical pages */}
        <nav style={{ marginTop: 56 }} aria-label="Other font categories">
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-cont-tert)', marginBottom: 10 }}>
            Browse other free fonts
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {LANDINGS.filter(l => l.slug !== landing.slug).map(l => (
              <a key={l.slug} href={`/fonts/${l.slug}`} className="v2-tag" style={{ textDecoration: 'none' }}>
                {l.h1}
              </a>
            ))}
          </div>
        </nav>
      </main>
    </>
  )
}
