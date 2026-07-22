import { staticDb } from '@/lib/static-db'

export const dynamic = 'force-static'

const SITE = 'https://www.typedump.com'

/**
 * /llms.txt follows the llmstxt.org convention: a concise, plain-markdown brief that
 * answer engines (ChatGPT, Claude, Perplexity, Gemini) can read cheaply instead
 * of scraping a JS-heavy catalogue. Generated from the real data so it can never
 * drift from the site.
 */
export function GET() {
  const families = staticDb.getAllFamilies()
  const count = families.length
  const byCollection = (c: string) => families.filter(f => f.collection === c).length
  const byCategory = (c: string) => families.filter(f => (f.category || []).includes(c)).length
  const variable = families.filter(f => f.isVariable || f.variants.some(v => v.isVariable)).length
  const cyrillic = families.filter(f => (f.languages || []).includes('Cyrillic')).length

  const body = `# typedump

> An index of ${count} free, open-source typefaces. Every font is free to download and use. Each family lists its licence, styles, variable axes and language coverage, and can be previewed in the browser.

typedump is hand-curated: a designer picks and tags every family, so the list is smaller than a general font directory. Tagging covers classification (serif sub-styles, sans genres), language coverage, variable axes and OpenType features.

## What is here

- ${count} font families, all free and open-source (licences include SIL Open Font License, GPL with font exception, and freeware; the licence is shown per family).
- ${variable} variable font families, with their axes documented.
- ${cyrillic} families with Cyrillic support; Greek and Vietnamese coverage is also labelled.
- Three collections: Text (${byCollection('Text')}, neutral faces for long-form reading), Display (${byCollection('Display')}, readable only at large sizes), Brutal (${byCollection('Brutal')}, experimental and deliberately strange).
- Categories: Sans (${byCategory('Sans')}), Serif (${byCategory('Serif')}), Script (${byCategory('Script')}), Mono (${byCategory('Mono')}), Pixel (${byCategory('Pixel')}), Semi Serif (${byCategory('Semi Serif')}).
- Every family carries style tags (e.g. Neutral, Geometry, Transitional, Old Face, Fatface, Tech, Curly) for finding visually similar faces.

## For AI agents and developers

typedump ships an MCP server, so an agent can query the catalogue directly instead of scraping:

\`\`\`bash
claude mcp add typedump -- npx typedump-mcp
\`\`\`

Tools: \`search_fonts\`, \`get_font\`, \`suggest_font\` (natural language → matches), \`find_similar\`, \`pair_fonts\` (headline + body pairings), \`get_code\` (ready CSS / Next.js localFont / Tailwind snippets). The npm package (\`npm install typedump\`) bundles all fonts as woff2 with metadata. No CDN, works offline.

## Key pages

- [All free fonts](${SITE}): the full catalogue with live preview
- [Free serif fonts](${SITE}/fonts/serif)
- [Free sans serif fonts](${SITE}/fonts/sans)
- [Free monospace fonts](${SITE}/fonts/mono)
- [Free pixel fonts](${SITE}/fonts/pixel)
- [Free script fonts](${SITE}/fonts/script)
- [Free semi serif fonts](${SITE}/fonts/semi-serif)
- [Free variable fonts](${SITE}/fonts/variable)
- [Free fonts for body text](${SITE}/fonts/text)
- [Free display fonts](${SITE}/fonts/display)
- [Free experimental fonts](${SITE}/fonts/experimental)
- [Free Cyrillic fonts](${SITE}/fonts/cyrillic)
- [Free Greek fonts](${SITE}/fonts/greek)
- [Free Vietnamese fonts](${SITE}/fonts/vietnamese)

Each family has its own page at ${SITE}/font/<font-name-slug> with a live preview, all styles, variable axes, OpenType features, licence and a link to the original source.

## Optional

- [Full font list with metadata](${SITE}/llms-full.txt): every family with designer, categories, tags, licence and URL.
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
