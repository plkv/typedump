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
  /** Lead paragraph shown on the page. Plain description, no keyword filler. */
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
    intro: 'Serif typefaces have small strokes at the ends of the letters. This list covers old-style faces with a diagonal axis and low contrast, transitional and modern cuts with a more upright axis, and heavy slabs. Every family is free to download, and the licence is listed on its page.',
    match: f => hasCategory(f, 'Serif'), catalogHref: '/?category=Serif',
  },
  {
    slug: 'sans', label: 'Sans Serif Fonts', h1: 'Free sans serif fonts',
    intro: 'Sans serif typefaces have no strokes at the ends of the letters, which is why most interfaces, signage and screen text use them. This list covers neutral workhorses, geometric and humanist designs, and display sans with more character.',
    match: f => hasCategory(f, 'Sans'), catalogHref: '/?category=Sans',
  },
  {
    slug: 'mono', label: 'Monospace Fonts', h1: 'Free monospace fonts',
    intro: 'Monospaced typefaces give every character the same width, so code, tables and terminal output stay aligned. Several of the families here also come in multiple weights or as variable fonts.',
    match: f => hasCategory(f, 'Mono'), catalogHref: '/?category=Mono',
  },
  {
    slug: 'pixel', label: 'Pixel Fonts', h1: 'Free pixel fonts',
    intro: 'Pixel and bitmap typefaces are drawn on a visible grid. They fit game interfaces, low-resolution screens and layouts where the grid is meant to show. All are free to download.',
    match: f => hasCategory(f, 'Pixel'), catalogHref: '/?category=Pixel',
  },
  {
    slug: 'script', label: 'Script Fonts', h1: 'Free script fonts',
    intro: 'Script typefaces imitate handwriting, from formal connected copperplate to loose hand-drawn lettering. They work at large sizes, in logotypes, invitations and headlines. At body sizes they get hard to read.',
    match: f => hasCategory(f, 'Script'), catalogHref: '/?category=Script',
  },
  {
    slug: 'semi-serif', label: 'Semi Serif Fonts', h1: 'Free semi serif fonts',
    intro: 'Semi serif typefaces sit between sans and serif: mostly clean stems, with partial, flared or brush-drawn terminals. They keep the neutrality of a sans and add some of the texture of a serif.',
    match: f => hasCategory(f, 'Semi Serif'), catalogHref: '/?category=Semi%20Serif',
  },
  {
    slug: 'variable', label: 'Variable Fonts', h1: 'Free variable fonts',
    intro: 'Variable fonts hold every weight, width or optical size in one file, on continuous axes. You set exact values instead of picking from fixed styles, and the page loads one file instead of several. Each family here lists its axes so you can test them in the browser.',
    match: isVariable, catalogHref: '/',
  },
  {
    slug: 'text', label: 'Text Fonts', h1: 'Free fonts for body text',
    intro: 'Neutral, readable typefaces for setting long passages: interfaces, articles, documentation. They hold up at small sizes and usually come with a full weight range.',
    match: f => f.collection === 'Text', catalogHref: '/?collection=Text',
  },
  {
    slug: 'display', label: 'Display Fonts', h1: 'Free display fonts',
    intro: 'Display typefaces are drawn to be seen large, in posters, headlines and brand lockups. They carry more character and finer detail than text faces, so they lose legibility at body sizes.',
    match: f => f.collection === 'Display', catalogHref: '/?collection=Display',
  },
  {
    slug: 'experimental', label: 'Experimental Fonts', h1: 'Free experimental fonts',
    intro: 'Odd, broken and deliberately strange typefaces: distorted, modular, pixelated or layered. Mostly used in art direction, posters and covers.',
    match: f => f.collection === 'Brutal', catalogHref: '/?collection=Brutal',
  },
  {
    slug: 'cyrillic', label: 'Cyrillic Fonts', h1: 'Free Cyrillic fonts',
    intro: 'Typefaces with Cyrillic coverage, for Russian, Ukrainian, Bulgarian, Serbian and other languages that use the script. You can type Cyrillic into the preview before downloading.',
    match: f => hasLanguage(f, 'Cyrillic'), catalogHref: '/?language=Cyrillic',
  },
  {
    slug: 'greek', label: 'Greek Fonts', h1: 'Free Greek fonts',
    intro: 'Typefaces that include a Greek character set alongside Latin, so both scripts come from one family and nothing drops to a system fallback.',
    match: f => hasLanguage(f, 'Greek'), catalogHref: '/?language=Greek',
  },
  {
    slug: 'vietnamese', label: 'Vietnamese Fonts', h1: 'Free Vietnamese fonts',
    intro: 'Typefaces that cover the Vietnamese diacritics: stacked tone marks and modified vowels drawn as part of the font.',
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
  const title = `${count} free ${landing.label.toLowerCase()} to download | typedump`
  const description = `${landing.intro.split('. ')[0]}. Browse ${count} free, open-source ${landing.label.toLowerCase()} on typedump. Preview in the browser, check the licence, download.`
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
