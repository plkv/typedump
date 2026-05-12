# typedump — Claude Working Memory

## Project
Font catalog and collection manager. Live at https://baseline-fonts.vercel.app  
Repo: https://github.com/plkv/baseline-fonts.git  
Working directory: `/Users/plkv/Work Life Balance/TypeDump/baseline-fonts/`

## Preferences & Rules

- **No commits without asking.** Always show the diff and wait for confirmation.
- **No computer/browser control unless explicitly asked.**
- **No hardcoded arrays or inline styles.** If order or values are needed, they belong in data or constants — not scattered inline.
- **No patches — fix root causes.**
- **Don't add error handling or abstractions beyond what the task requires.**
- **Default to no comments** — only add when WHY is non-obvious.

## Architecture

### Data flow
```
public/fonts/fonts-data.json
  → lib/static-db.ts          (reads JSON at build time, sync)
  → lib/transform-font-families.ts  (maps to FontData[])
  → app/page.tsx              (server component, passes initialFonts)
  → components/font-catalog/CatalogPage.tsx  (client, renders everything)
```

`fonts-data.json` is the **single source of truth** locally. It has a `families` array — each family has `variants[]`.

Vercel KV + Blob are used in production for uploads and metadata persistence, but **not** for ordering, vocabulary, or filter logic. Don't introduce KV dependencies for anything that can live in code or data.

### Key files
| File | What it does |
|------|-------------|
| `app/page.tsx` | Server component — reads staticDb, passes `initialFonts` |
| `components/font-catalog/CatalogPage.tsx` | Main catalog UI — all filter state, font rendering |
| `components/font-catalog/FontCard.tsx` | Individual font card with controls |
| `components/font-catalog/Navbar.tsx` | Top nav |
| `lib/static-db.ts` | Reads `public/fonts/fonts-data.json` synchronously |
| `lib/transform-font-families.ts` | Maps family data → `FontData[]` for the catalog |
| `lib/font-parser.ts` | OpenType.js parsing — extracts metadata, language support |
| `lib/font-storage-clean.ts` | Vercel Blob + KV abstraction for uploads |
| `lib/font-store.ts` | Zustand store (used in admin, not in main catalog) |
| `app/catalog.css` | Design system CSS — `.v2-*` component classes |

### Font metadata model (fonts-data.json)
Each family has:
```json
{
  "name": "Cormorant",
  "collection": "Text",           // "Text" | "Display" | "Weirdo"
  "category": ["Serif"],          // font type — used by Font categories filter
  "styleTags": ["Old Style"],     // appearance — used by Appearance filter
  "languages": ["Latin", "Cyrillic", "Vietnamese"],
  "variants": [...]
}
```

`category` and `styleTags` are the two distinct tag dimensions. They are different things:
- **category** — structural type (Sans, Serif, Script, Mono, Pixel, Decorative, etc.)
- **styleTags** — aesthetic character (Narrow, Fatface, Vintage, Geometry, etc.)

`collection` is a third dimension shown as cards in the sidebar (Text / Display / Weirdo).

### Font Detail page (`/font/[slug]`)
Key file: `app/font/[slug]/FontDetail.tsx` (client component).

**Layout (top → bottom):**
1. `Navbar`
2. Back button (`.font-detail-back`, desktop only)
3. Hero — font name at 180px
4. Variant rows card (`v2-card`):
   - Presets row (Text presets buttons)
   - Controls row (Size/Spacing/Leading sliders + align buttons + reset)
   - `VariantRow` × N — each row: label · weight → textarea preview → animated settings panel
5. Info section — 2-column grid: About card (description) + Details card (table)

**Text presets** — same 5 presets as `CatalogPage`:
```ts
['Names', 'Key Glyphs', 'Basic', 'Paragraph', 'Brands']
```
- Names → `family.name`
- Key Glyphs → `'RKFJIGCQ aueoyrgsltf 0123469 ≪"(@&?;€$© ->…'`
- Basic → full A-Z a-z 0-9 symbols string
- Paragraph → random fashion/finance/tech paragraph
- Brands → random luxury/tech brand list with • separators

Default preset = **Names** (shows the font's own name as preview).

**Variant rows:**
- Variable fonts: synthesized weight rows from wght axis range (100/200/…/900 filtered to axis min/max)
- Static fonts: one row per variant file
- Row key: `"${weight}-${isItalic}"` (e.g. `"400-false"`)
- Clicking the textarea → opens settings panel for that row (if hasSettings)
- Clicking the label → toggles the panel (for closing)

**Per-row settings panel:**
- Background `--gray-surface-sec`, border-radius 12, animated via CSS grid `0fr→1fr`
- Variable Axes slider per axis (incl. wght with default = row's nominal weight)
- Stylistic Alternates buttons (tags matching `/^(ss\d\d|cv\d\d)$/`)
- Buttons: `v2-button v2-button-inactive/active` (not `btn-sm` — same bg as panel)

**fontVariationSettings computation:**
```ts
getFontVariationSettings({ wght: vr.weight, ...varAxes })
// varAxes spread overrides nominal weight when user moves the slider
```

**Reset button** resets: fontSize=48, lineHeight=1.2, letterSpacing=0, align=left, preset=Names, previewText=family.name, rowOtFeatures={}, rowVarAxes={}, expandedRowKey=null.

### Filter logic in CatalogPage
- **Collections** — OR logic
- **Font categories** — AND logic (font must have all selected)
- **Appearance (styleTags)** — AND logic
- **Languages** — OR logic
- **Weights** — OR logic
- **Italic** — boolean

Filter availability uses faceted search: for OR-groups (collections, languages, weights) the candidate pool is all fonts matching the other groups; for AND-groups (categories, styleTags) it uses the current filtered result. Selected options are never disabled.

### Sidebar filter ordering
Both **Font categories** and **Appearance** tags are sorted **alphabetically** (`localeCompare`). No custom sort order — the list is derived dynamically from actual font data.

### Language detection
Languages are detected by checking for actual glyph presence in font files using `font.charToGlyph()` from opentype.js — not by filename or metadata. The union of all variants in a family is used. Run detection across all files when re-parsing.

### CSS design system
All component styles live in `app/catalog.css` under `.v2-*` classes. Colors use CSS custom properties from the token system (`--gray-cont-prim`, `--gray-surface-prim`, etc.) — never hardcoded hex values.

Key classes:
- `.v2-button`, `.v2-button-active`, `.v2-button-inactive`
- `.v2-badge` — bordered pill tag
- `.v2-card` — card background + radius
- `.v2-filter-disabled` — opacity 0.3, pointer-events none
- `.v2-shimmer` — loading skeleton animation
- `.v2-sidebar`, `.catalog-sidebar-wrap`, `.catalog-sidebar-open` — sidebar layout

### Sidebar visibility (CSS-first, no flash)
The sidebar is always in the DOM. Visibility is controlled by CSS:
- `.catalog-sidebar-wrap` — `display: none` by default
- `@media (min-width: 768px)` — `display: block` (no JS needed on desktop)
- `.catalog-sidebar-open` — `display: block !important` (JS adds on mobile)

## Stack
- Next.js 15.5.7 / React 19 / TypeScript
- Radix UI + Tailwind CSS 4 + Material Symbols
- Zustand (admin state), opentype.js (font parsing)
- Vercel Blob + Vercel KV (production storage)
- Local dev: `public/fonts/fonts-data.json` + font files in `public/fonts/`

## Deployment
```bash
git add <files>
git commit -m "message"
git push origin main   # Vercel auto-deploys
```
Always ask before pushing. Don't bump version numbers unless asked.
