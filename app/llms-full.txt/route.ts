import { staticDb } from '@/lib/static-db'
import { familyToSlug } from '@/lib/font-slug'

export const dynamic = 'force-static'

const SITE = 'https://www.typedump.com'

/**
 * /llms-full.txt — the complete catalogue as plain text, so an answer engine can
 * cite specific families (name, designer, classification, licence, URL) without
 * rendering the client-side catalogue.
 */
export function GET() {
  const families = staticDb.getAllFamilies().sort((a, b) => a.name.localeCompare(b.name))

  const lines = families.map(f => {
    const variable = f.isVariable || f.variants.some(v => v.isVariable)
    const axes = Array.from(new Set(
      f.variants.flatMap(v => (v.variableAxes || []).map(a => (a as any).tag || (a as any).axis)).filter(Boolean)
    ))
    const parts = [
      `### ${f.name}`,
      `- URL: ${SITE}/font/${familyToSlug(f.name)}`,
      f.foundry && f.foundry !== 'Unknown' ? `- Designer/foundry: ${f.foundry}` : '',
      `- Category: ${(f.category || []).join(', ')}`,
      `- Collection: ${f.collection}`,
      (f.styleTags || []).length ? `- Style tags: ${f.styleTags.join(', ')}` : '',
      `- Styles: ${f.variants.length}${variable ? ` (variable${axes.length ? `, axes: ${axes.join(', ')}` : ''})` : ''}`,
      `- Languages: ${(f.languages || ['Latin']).join(', ')}`,
      f.licenseInfo?.type ? `- Licence: ${f.licenseInfo.type} (free to use)` : '- Licence: free to use',
      f.downloadLink ? `- Source: ${f.downloadLink}` : '',
      f.description ? `- About: ${f.description}` : '',
    ].filter(Boolean)
    return parts.join('\n')
  })

  const body = `# typedump — full font list

${families.length} free, open-source font families. Every entry below is free to download and use; the licence is stated per family. Live preview and download links are on each font's page.

Catalogue: ${SITE}
MCP server for agents: \`claude mcp add typedump -- npx typedump-mcp\`

---

${lines.join('\n\n')}
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
