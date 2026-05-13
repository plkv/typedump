"use client"

import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from "react"
import { Slider } from "@/components/ui/slider"
import { canonicalFamilyName } from "@/lib/font-naming"
import { shortHash } from "@/lib/hash"
import { Navbar } from "@/components/font-catalog/Navbar"
import { FontCard } from "@/components/font-catalog/FontCard"
import { IconXMark, IconReset } from "@/components/icons"
// catalog.css is imported globally in layout.tsx


// Font interface for our API data
interface FontData {
  id: number
  name: string
  family: string
  style: string
  category: string
  styles: number
  type: "Variable" | "Static"
  author: string
  fontFamily: string
  availableWeights: number[]
  hasItalic: boolean
  filename: string
  url?: string
  downloadLink?: string
  variableAxes?: Array<{
    name: string
    axis: string
    min: number
    max: number
    default: number
  }>
  openTypeFeatures?: string[]
  _familyFonts?: any[] // Store original font data for style selection
  _availableStyles?: Array<{
    weight: number
    styleName: string
    isItalic: boolean
    font?: any // Reference to original font for static fonts
  }> // Structured style data for style selection
  collection: 'Text' | 'Display' | 'Brutal'
  styleTags: string[]
  categories: string[]
  languages?: string[]
}

const textPresets = ["Names", "Key Glyphs", "Basic", "Paragraph", "Brands"]

const getPresetContent = (preset: string, fontName: string) => {
  switch (preset) {
    case "Names":
      return fontName
    case "Key Glyphs":
      return 'RKFJIGCQ aueoyrgsltf 0123469 ≪"(@&?;€$© ->…'
    case "Basic":
      return "ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 !@#$%^&*()_+-=[]{}|;':\",./<>?"
    case "Paragraph":
      const paragraphs = [
        "Balenciaga, Our Legacy, and Acne Studios continue to redefine avant-garde style, pushing silhouettes beyond conventional logic. Designers like Demna and Jonny Johansson layer irony with tailoring, mixing XXL coats, micro-bags, raw denim, and surreal proportions. Runway shows in Paris, Milan, and New York thrive on spectacle: flashing lights, fragmented beats, and cryptic slogans. What once felt absurd now becomes street uniform, merging couture with hoodie culture. Numbers matter too: limited drops of 500 units, resale prices soaring +300%, collectors chasing hype like traders. Fashion turns volatility into its core language.",
        "The global market trades on symbols: AAPL at $212.45, ETH climbing +5.6%, EUR/USD swinging. Every decimal moves billions. Exchanges speak a secret dialect of IPO, ETF, CAGR, ROI. Investors chase 12% annual yield, hedge funds leverage ×10, while regulators warn of bubbles. Platforms like Robinhood and Revolut blur banking and gaming, reducing risk to a tap, turning volatility into entertainment. Graphs spike red → green → red, headlines shout \"RECORD CLOSE!\" and algorithms decide faster than humans blink. Finance becomes performance, a theater of numbers where % defines power more than words.",
        "Every startup dreams of unicorn status: $1B valuation, growth curve slashing up at 45°. Founders pitch \"AI-powered SaaS\" or \"climate-tech with blockchain backbone,\" their decks filled with KPIs, TAM, CAC vs LTV. Venture capitalists reply with buzz: pre-seed, Series A, ARR, burn rate. Acceleration feels like survival; one quarter without +20% and the board panics. Yet behind the charts are restless teams in coworking hubs, 3 a.m. Slack pings, endless beta launches. Success is both hype and math, a fragile balance between story and spreadsheet, where a single slide decides millions wired.",
        "Barcelona glows with contradictions: Gaudí's Sagrada Família still climbing skyward since 1882, while Torre Glòries mirrors LED grids in real time. Eixample blocks form geometric order, yet life spills chaotic with scooters, cava bottles, and late-night vermut. Remote workers fill cafés, toggling between Figma boards and Zoom calls, chasing deadlines across GMT+1. The port counts containers and cruise ships, the beach counts sunsets and tourists. Art, sport, fintech, and fashion overlap in one Mediterranean arena. Every corner feels alive with accents, from Passeig de Gràcia boutiques to hidden tapas bars in El Raval."
      ]
      return paragraphs[Math.floor(Math.random() * paragraphs.length)]
    case "Brands":
      const brandSets = [
        "Maison Margiela • Off-White • Y/Project • Rimowa • A-Cold-Wall* • Figma • Balenciaga • OpenAI • Byredo",
        "Figma • Arc'teryx • Rimowa • Aimé Leon Dore • Balenciaga • Klarna • Off-White • SpaceX • Notion",
        "OpenAI • Arc'teryx • Maison Margiela • A-Cold-Wall* • Y/Project • Klarna • Byredo • Balenciaga • SpaceX",
        "Byredo • Maison Margiela • Notion • Figma • Off-White • Rimowa • OpenAI • Balenciaga • Arc'teryx"
      ]
      return brandSets[Math.floor(Math.random() * brandSets.length)]
    default:
      return fontName
  }
}

type InitialFilters = Record<string, string | string[] | undefined>

export default function CatalogPage({ initialFonts, initialFilters }: { initialFonts: FontData[], initialFilters?: InitialFilters }) {
  const toArr = (v: string | string[] | undefined) => v ? (Array.isArray(v) ? v : [v]) : []
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false) // matches SSR; set correctly in useEffect below
  const [catalogVisible, setCatalogVisible] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const selectRefs = useRef<Record<number, HTMLSelectElement | null>>({})
  
  // Font Data State — initialFonts comes from server component, no fetch needed
  const [fonts, setFonts] = useState<FontData[]>(initialFonts)
  const [isLoadingFonts, setIsLoadingFonts] = useState(initialFonts.length === 0)
  const [loadedFonts, setLoadedFonts] = useState<Set<number>>(new Set())
  const [animatedFonts, setAnimatedFonts] = useState<Set<number>>(new Set()) // Track fonts that have been animated once
  const [customText, setCustomText] = useState("")
  const [selectedCollections, setSelectedCollections] = useState<string[]>(() => toArr(initialFilters?.collection))
  const [selectedPreset, setSelectedPreset] = useState("Names")
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => toArr(initialFilters?.category))
  const [selectedStyles, setSelectedStyles] = useState<string[]>(() => toArr(initialFilters?.style))
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(() => toArr(initialFilters?.language))
  const [selectedAuthor, setSelectedAuthor] = useState<string>(() => typeof initialFilters?.author === 'string' ? initialFilters.author : '')
  const [previewWeight, setPreviewWeight] = useState(400)
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [fontWeightSelections, setFontWeightSelections] = useState<Record<number, { weight: number; italic: boolean; cssFamily?: string; styleName?: string }>>(
    {},
  )
  const [textSize, setTextSize] = useState([80])
  const [lineHeight, setLineHeight] = useState([120])
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center')

  // Color Theme State
  const [currentColorTheme, setCurrentColorTheme] = useState(0) // 0 = default B&W theme

  // Color themes based on Spotify brand image
  const colorThemes = [
    { name: 'Default', bg: 'var(--gray-surface-prim)', fg: 'var(--gray-cont-prim)' }, // Default B&W
    { name: 'Pink', bg: '#FF6B9D', fg: '#2D1B32' }, // Pink background, dark foreground
    { name: 'Orange', bg: '#FF8C42', fg: '#2D1B32' }, // Orange background, dark foreground
    { name: 'Blue', bg: '#4A9EFF', fg: '#FFFFFF' }, // Blue background, light foreground
    { name: 'Red', bg: '#FF3B3B', fg: '#FFFFFF' }, // Red background, light foreground
    { name: 'Purple', bg: '#6B46C1', fg: '#FFFFFF' }, // Purple background, light foreground
    { name: 'Yellow', bg: '#FFD93D', fg: '#D73502' }, // Yellow background, red foreground
    { name: 'Navy', bg: '#1E3A5F', fg: '#FF6B9D' }, // Navy background, pink foreground
    { name: 'Maroon', bg: '#8B2635', fg: '#FFFFFF' }, // Maroon background, light foreground
    { name: 'Green', bg: '#22C55E', fg: '#FFFFFF' } // Green background, light foreground
  ]

  const [sortBy, setSortBy] = useState("Date")
  const randomSeedRef = useRef<number>((Date.now() % 100000) / 100000)

  const seeded = (id: number) => {
    const seed = randomSeedRef.current || 0.123456
    // simple deterministic hash on id + seed
    const x = Math.sin(id * (seed * 1000 + 1)) * 10000
    return x - Math.floor(x)
  }
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc") // New = desc, Old = asc
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())

  const getCurrentTheme = () => colorThemes[currentColorTheme]
  
  // Stable preview font per collection (don't change during session)
  const previewFontsRef = useRef<Record<'Text'|'Display'|'Brutal', string>>({ Text: '', Display: '', Brutal: '' })
  const getStablePreviewFontForCollection = (collection: "Text" | "Display" | "Brutal") => {
    if (!previewFontsRef.current[collection]) {
      const candidates = fonts.filter(f => f.collection === collection)
      if (candidates.length) {
        // Prefer variable fonts — only they get a family-level @font-face registration.
        // Static fonts register variant-level aliases (alias__v_hash) which don't match fontFamily.
        const pool = candidates.filter(f => f.type === 'Variable')
        const pick = (pool.length ? pool : candidates)[Math.floor(Math.random() * (pool.length || candidates.length))]
        previewFontsRef.current[collection] = pick?.fontFamily || "Inter Variable, system-ui, sans-serif"
      }
    }
    return previewFontsRef.current[collection] || "Inter Variable, system-ui, sans-serif"
  }
  const [fontOTFeatures, setFontOTFeatures] = useState<Record<number, Record<string, boolean>>>({})
  const [fontVariableAxes, setFontVariableAxes] = useState<Record<number, Record<string, number>>>({})
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const heroRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const catalogCardsRef = useRef<HTMLDivElement>(null)
  const [focusedFontId, setFocusedFontId] = useState<number | null>(null)


  const [textCursorPosition, setTextCursorPosition] = useState<Record<number, number>>({})

  // Load fonts — only runs as fallback when server didn't provide initialFonts
  const loadFonts = useCallback(async () => {
    try {
      setIsLoadingFonts(true)
      const response = await fetch('/api/fonts-clean/list')
      if (!response.ok) {
        console.error('Fallback font list fetch failed:', response.status)
        return
      }
      const data = await response.json()
      if (!data.success || !data.fonts) {
        console.error('No font data in fallback response')
        return
      }

      // Group flat font list by family name
      const fontsByFamily = new Map<string, any[]>()
      for (const font of data.fonts) {
        const key = font.family || font.name
        if (!fontsByFamily.has(key)) fontsByFamily.set(key, [])
        fontsByFamily.get(key)!.push(font)
      }

      const catalogFonts: FontData[] = Array.from(fontsByFamily.entries()).map(([familyName, familyFonts], index) => {
        const rep =
          familyFonts.find((f: any) => f.isDefaultStyle) ||
          familyFonts.find((f: any) => !f.style?.toLowerCase().includes('italic') && !f.style?.toLowerCase().includes('oblique')) ||
          familyFonts[0]
        if (!rep) return null

        const isVariable = familyFonts.some((f: any) => f.isVariable)
        const hasItalic = familyFonts.some((f: any) =>
          f.style?.toLowerCase().includes('italic') || f.style?.toLowerCase().includes('oblique')
        )
        const familyAlias = `${canonicalFamilyName(familyName)}-${shortHash(canonicalFamilyName(familyName)).slice(0, 6)}`

        let availableWeights: number[]
        let availableStyles: FontData['_availableStyles'] = []

        if (isVariable) {
          const weightAxes = familyFonts
            .flatMap((f: any) => f.variableAxes || [])
            .filter((a: any) => a.axis === 'wght')
          if (weightAxes.length > 0) {
            const min = Math.min(...weightAxes.map((a: any) => a.min))
            const max = Math.max(...weightAxes.map((a: any) => a.max))
            availableWeights = [100, 200, 300, 400, 500, 600, 700, 800, 900].filter(w => w >= min && w <= max)
          } else {
            availableWeights = [100, 200, 300, 400, 500, 600, 700, 800, 900]
          }
          availableStyles = availableWeights.map(weight => ({ weight, styleName: getStyleNameFromWeight(weight, false), isItalic: false }))
          if (hasItalic) {
            availableStyles = [
              ...availableStyles,
              ...availableWeights.map(weight => ({ weight, styleName: getStyleNameFromWeight(weight, true), isItalic: true })),
            ]
          }
          const seen = new Set<string>()
          availableStyles = availableStyles.filter(s => {
            const k = `${s.weight}|${s.isItalic ? 1 : 0}`
            return seen.has(k) ? false : (seen.add(k), true)
          })
        } else {
          availableStyles = familyFonts.map((f: any) => ({
            weight: f.weight || 400,
            styleName: f.style || 'Regular',
            isItalic: f.style?.toLowerCase().includes('italic') || f.style?.toLowerCase().includes('oblique') || false,
            cssFamily: `${familyAlias}__v_${shortHash(f.id || f.filename).slice(0, 6)}`,
          })).sort((a: any, b: any) => a.weight !== b.weight ? a.weight - b.weight : (a.isItalic ? 1 : -1))
          availableWeights = [...new Set(availableStyles.map((s: any) => s.weight))].sort((a: number, b: number) => a - b)
        }

        const cat = Array.isArray(rep.category) ? (rep.category[0] || 'Sans') : (rep.category || 'Sans')
        return {
          id: index + 1,
          name: familyName,
          family: familyName,
          style: `${familyFonts.length} style${familyFonts.length !== 1 ? 's' : ''}`,
          category: cat,
          styles: availableStyles.length || familyFonts.length,
          type: isVariable ? 'Variable' : 'Static',
          author: rep.foundry || 'Unknown',
          fontFamily: `"${familyAlias}", system-ui, sans-serif`,
          availableWeights,
          hasItalic,
          filename: rep.filename,
          url: rep.url || rep.blobUrl,
          downloadLink: rep.downloadLink,
          variableAxes: rep.variableAxes,
          openTypeFeatures: rep.openTypeFeatures,
          _familyFonts: familyFonts.map((f: any) => ({
            ...f,
            openTypeFeatureTags: f.openTypeFeatureTags || f.openTypeFeatureTagsParsed || undefined,
          })),
          _availableStyles: availableStyles,
          collection: rep.collection || 'Text',
          styleTags: rep.styleTags || [],
          languages: Array.isArray(rep.languages) ? rep.languages : ['Latin'],
          categories: Array.isArray(rep.category) ? rep.category : [cat],
        } as FontData
      }).filter(Boolean) as FontData[]

      setFonts(catalogFonts)
      loadFontCSS(catalogFonts)
    } catch (error) {
      console.error('Failed to load fonts:', error)
    } finally {
      setIsLoadingFonts(false)
    }
  }, [])

  // Load font CSS dynamically
  const loadFontCSS = useCallback((fonts: FontData[]) => {
    // Remove existing font styles
    const existingStyles = document.querySelectorAll('style[data-font-css]')
    existingStyles.forEach(style => style.remove())

    const isVariable = (font: FontData) => font.type === 'Variable' || !!(font.variableAxes && font.variableAxes.length)

    // Generate CSS for each font - handle multiple files per family
    const fontCSS = fonts.map(font => {
      if (font._familyFonts && font._familyFonts.length > 0 && !isVariable(font)) {
        // Static multi-file family: each file gets its own unique @font-face alias.
        // Using font-weight: 100 900 prevents browser synthesis across aliases.
        return font._familyFonts.map((fontFile: any) => {
          const alias = fontFile.cssFamily
          if (!alias) return ''
          const isItalic = fontFile.isItalic ||
            (fontFile.style || '').toLowerCase().includes('italic') ||
            (fontFile.style || '').toLowerCase().includes('oblique')
          const src = fontFile.url || fontFile.blobUrl || `/fonts/${fontFile.filename}`
          return `@font-face{font-family:"${alias}";src:url("${src}");font-weight:100 900;font-style:${isItalic ? 'italic' : 'normal'};font-display:swap;}`
        }).filter(Boolean).join('\n')
      } else if (isVariable(font)) {
        // Variable font: register under the shared family alias with actual weight range
        const src = font.url || `/fonts/${font.filename}`
        const wMin = font.availableWeights?.[0] ?? 100
        const wMax = font.availableWeights?.[font.availableWeights.length - 1] ?? 900
        const alias = font.fontFamily?.match(/"([^"]+)"/)?.[1] || font.family
        return `@font-face{font-family:"${alias}";src:url("${src}");font-weight:${wMin} ${wMax};font-style:normal oblique 0deg 20deg;font-display:swap;}`
      } else {
        // Single static file
        const src = font.url || `/fonts/${font.filename}`
        const alias = font._familyFonts?.[0]?.cssFamily ||
          font.fontFamily?.match(/"([^"]+)"/)?.[1] || font.family
        const isItalic = (font.style || '').toLowerCase().includes('italic')
        return `@font-face{font-family:"${alias}";src:url("${src}");font-weight:100 900;font-style:${isItalic ? 'italic' : 'normal'};font-display:swap;}`
      }
    }).join('\n')

    // Inject CSS
    if (fontCSS.trim()) {
      const styleElement = document.createElement('style')
      styleElement.setAttribute('data-font-css', 'true')
      styleElement.textContent = fontCSS
      document.head.appendChild(styleElement)
    }
  }, [])

  // Helper function to filter out junk OT feature titles (weight instance names, filenames, URLs)
  const isRealAlternateTitle = (title: string): boolean => {
    if (!title || title.length < 2) return false
    if (title.trimEnd().endsWith(':')) return false  // "Name:" garbage
    if (/https?:\/\/|www\./.test(title)) return false
    if (/\d+\.\d+[;.]/.test(title) || /;\s*[A-Z]/.test(title)) return false  // version strings
    if (/^[A-Z][A-Za-z]+-[A-Z]/.test(title)) return false  // filename: "HostGrotesk-Regular"
    if (/^ss\d+$/i.test(title)) return false  // tag echoed as title
    if (/^\d+(pt|px|em)$/i.test(title)) return false  // size instances
    const weightOnly = /^(thin|extralight|extra\s?light|light|regular|medium|semibold|semi\s?bold|demibold|demi\s?bold|bold|extrabold|extra\s?bold|black|book|ultra)([\s-](italic|oblique))?$/i
    if (weightOnly.test(title.trim())) return false
    const axisOnly = /^(weight|italic|roman|oblique|width|slant|optical\s?size|optical|informality|bounce|spacing|element\s?shape|element\s?grid|upright)$/i
    if (axisOnly.test(title.trim())) return false
    // "FontName Weight" or "Font Name Weight [Italic]" — ends with weight + optional italic suffix
    const endsWithWeight = /\s(thin|extralight|extra\s?light|light|regular|medium|semibold|semi\s?bold|bold|extrabold|extra\s?bold|black|book)([\s-](italic|oblique|ital))?\s*$/i
    if (endsWithWeight.test(title)) return false
    // "ital" abbreviation as full title or suffix
    if (/^ital$/i.test(title.trim()) || /\sital$/i.test(title.trim())) return false
    // CamelCase font instance names: "MonoThin", "FontNameBold", etc.
    if (/^[A-Z][A-Za-z]*(Thin|ExtraLight|Light|Regular|Medium|SemiBold|DemiBold|Bold|ExtraBold|Black|Book)$/.test(title.trim())) return false
    return true
  }

  const cleanAlternateTitle = (tag: string, title: string): string => {
    const cleaned = title.replace(/^name\s*:\s*/i, '').trim()
    if (isRealAlternateTitle(cleaned)) return cleaned
    if (tag === 'salt') return 'Alternates'
    const m = tag.match(/^ss(\d+)$/i)
    return m ? `Set ${parseInt(m[1])}` : tag.toUpperCase()
  }

  // Helper function to get stylistic alternates from font's OpenType features
  const getStyleAlternates = (fontId: number) => {
    const font = fonts.find((f) => f.id === fontId)
    if (!font) return []
    // Prefer server-parsed structured tags if available - use Map to deduplicate by tag
    const tagMap = new Map<string, string>()
    const pushTags = (ff: any) => {
      const list = (ff && (ff as any).openTypeFeatureTags) as Array<{ tag: string; title: string }> | undefined
      if (Array.isArray(list)) list.forEach(({ tag, title }) => {
        if (/^ss\d\d$|^salt$/i.test(tag) && !tagMap.has(tag) && isRealAlternateTitle(title)) {
          tagMap.set(tag, cleanAlternateTitle(tag, title))
        }
      })
    }
    pushTags(font)
    font._familyFonts?.forEach(pushTags)
    if (tagMap.size > 0) {
      const seenTitles = new Set<string>()
      return Array.from(tagMap.entries())
        .map(([tag, title]) => ({ tag, title }))
        .sort((a, b) => a.tag.localeCompare(b.tag))
        .filter(({ title }) => seenTitles.has(title) ? false : (seenTitles.add(title), true))
    }

    // Fallback: parse from strings heuristically
    const allFeatures = new Map<string, string>()
    const pushFeature = (feat: any) => {
      let raw = ''
      if (typeof feat === 'string') raw = feat
      else if (feat && typeof feat === 'object') raw = (feat.tag || feat.name || feat.title || '').toString()
      if (!raw) return
      processStyleFeature(raw, allFeatures)
    }
    if (Array.isArray((font as any).openTypeFeatures)) (font as any).openTypeFeatures.forEach(pushFeature)
    if (Array.isArray((font as any).features)) (font as any).features.forEach(pushFeature)
    if (font._familyFonts) {
      font._familyFonts.forEach(familyFont => {
        if (Array.isArray((familyFont as any).openTypeFeatures)) (familyFont as any).openTypeFeatures.forEach(pushFeature)
        if (Array.isArray((familyFont as any).features)) (familyFont as any).features.forEach(pushFeature)
      })
    }
    return Array.from(allFeatures.entries()).map(([tag, title]) => ({ tag, title })).sort((a, b) => a.tag.localeCompare(b.tag))
  }
  
  // Helper function to process stylistic features
  const processStyleFeature = (feature: string, allFeatures: Map<string, string>) => {
    // Look for stylistic sets (ss01, ss02, etc.) and stylistic alternates
    const f = (feature || '').toLowerCase()
    if (f.includes('stylistic set') || f.includes('stylistic alternates') || /ss\d+/.test(f)) {
      // Convert readable names to OpenType tags while preserving descriptive names
      let tag = ''
      let title = feature
      
      if (f.includes('stylistic alternates')) tag = 'salt'
      else if (f.includes('stylistic set 1')) tag = 'ss01'
      else if (f.includes('stylistic set 2')) tag = 'ss02'
      else if (f.includes('stylistic set 3')) tag = 'ss03'
      else if (f.includes('stylistic set 4')) tag = 'ss04'
      else if (f.includes('stylistic set 5')) tag = 'ss05'
      else if (f.includes('stylistic set 6')) tag = 'ss06'
      else if (f.includes('stylistic set 7')) tag = 'ss07'
      else if (f.includes('stylistic set 8')) tag = 'ss08'
      else if (f.includes('stylistic set 9')) tag = 'ss09'
      else if (f.includes('stylistic set 10')) tag = 'ss10'
      else if (/ss\d+/.test(f)) {
        const match = f.match(/ss\d+/i)
        if (match) tag = (match[0] || '').toLowerCase()
      }
      
      if (tag) {
        allFeatures.set(tag, title)
      }
    }
  }

  // Helper function to get other OpenType features (non-stylistic)
  const getOtherOTFeatures = (fontId: number) => {
    const font = fonts.find((f) => f.id === fontId)
    if (!font?._familyFonts) return []
    
    // Mapping from readable feature names to OpenType tags with descriptive titles
    const featureMapping: Record<string, { tag: string; title: string }> = {
      'standard ligatures': { tag: 'liga', title: 'Standard Ligatures' },
      'discretionary ligatures': { tag: 'dlig', title: 'Discretionary Ligatures' },
      'contextual ligatures': { tag: 'clig', title: 'Contextual Ligatures' },
      'kerning': { tag: 'kern', title: 'Kerning' },
      'fractions': { tag: 'frac', title: 'Fractions' },
      'ordinals': { tag: 'ordn', title: 'Ordinals' },
      'superscript': { tag: 'sups', title: 'Superscript' },
      'subscript': { tag: 'subs', title: 'Subscript' },
      'small capitals': { tag: 'smcp', title: 'Small Capitals' },
      'all small caps': { tag: 'c2sc', title: 'All Small Caps' },
      'case-sensitive forms': { tag: 'case', title: 'Case-Sensitive Forms' },
      'slashed zero': { tag: 'zero', title: 'Slashed Zero' },
      'tabular nums': { tag: 'tnum', title: 'Tabular Numbers' },
      'proportional nums': { tag: 'pnum', title: 'Proportional Numbers' },
      'lining figures': { tag: 'lnum', title: 'Lining Figures' },
      'oldstyle figures': { tag: 'onum', title: 'Oldstyle Figures' }
    }
    
    // Prefer structured tags first
    const tagList: Array<{ tag: string; title: string }> = []
    const pushTags = (ff: any) => {
      const list = (ff && (ff as any).openTypeFeatureTags) as Array<{ tag: string; title: string }> | undefined
      if (Array.isArray(list)) list.forEach(({ tag, title }) => { if (!/^ss\d\d$|^salt$/i.test(tag)) tagList.push({ tag, title }) })
    }
    font._familyFonts?.forEach(pushTags)
    if (tagList.length > 0) return tagList.sort((a, b) => a.tag.localeCompare(b.tag))

    const allFeatures = new Map<string, string>()
    font._familyFonts.forEach(familyFont => {
      if (Array.isArray((familyFont as any).openTypeFeatures)) {
        (familyFont.openTypeFeatures as any[]).forEach((feature: any) => {
          const lowerFeature = typeof feature === 'string' ? feature.toLowerCase() : ''
          if (lowerFeature && !lowerFeature.includes('stylistic')) {
            const mapping = featureMapping[lowerFeature]
            if (mapping) {
              allFeatures.set(mapping.tag, mapping.title)
            }
          }
        })
      }
    })
    return Array.from(allFeatures.entries()).map(([tag, title]) => ({ tag, title })).sort((a, b) => a.tag.localeCompare(b.tag))
  }

  const getFontFeatures = (font: FontData): string[] => {
    const features: string[] = []
    if (font.type === 'Variable') features.push('Variable')
    const axes = (font._familyFonts || []).flatMap((ff: any) => ff.variableAxes || [])
    if (axes.some((a: any) => (a.tag || a.axis) === 'wdth')) features.push('Variable width')
    const otTags = (font._familyFonts || []).flatMap((ff: any) => (ff.openTypeFeatureTags || []).map((t: any) => t?.tag || t))
    if (otTags.some((t: string) => /^ss\d+$/i.test(t) || t === 'salt')) features.push('Alternates')
    return features
  }

  const getVariableAxes = (fontId: number) => {
    const font = fonts.find((f) => f.id === fontId)
    if (!font?._familyFonts) return []
    
    // Get variable axes from font metadata
    const allAxes = new Map<string, { tag: string, name: string, min: number, max: number, default: number }>()
    font._familyFonts.forEach(familyFont => {
      if (familyFont.variableAxes) {
        familyFont.variableAxes.forEach((axis: any) => {
          // Use axis tag as key to avoid duplicates
          const min = Number(axis.min)
          const max = Number(axis.max)
          // Filter out degenerate axes (no range)
          if (!isFinite(min) || !isFinite(max) || max <= min) return

          // Parse default value with fallback
          let defaultValue = Number(axis.default)
          if (!isFinite(defaultValue)) {
            // If default is not valid, use min for axes with negative values, otherwise use min
            defaultValue = min < 0 ? 0 : min
          }

          const tag = axis.tag || axis.axis
          if (!tag) return
          allAxes.set(tag, { tag, name: axis.name, min, max, default: defaultValue })
        })
      }
    })
    
    return Array.from(allAxes.values())
  }

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    )
  }

  const toggleStyle = (style: string) => {
    setSelectedStyles((prev) => (prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]))
  }



  const updateFontSelection = (fontId: number, weight: number, italic: boolean, cssFamily?: string) => {
    setFontWeightSelections((prev) => ({
      ...prev,
      [fontId]: { weight, italic, cssFamily: cssFamily || prev[fontId]?.cssFamily, styleName: prev[fontId]?.styleName },
    }))
    // Ensure variable fonts reflect dropdown in wght axis for rendering
    setFontVariableAxes((prev) => ({
      ...prev,
      [fontId]: { ...(prev[fontId] || {}), wght: weight },
    }))
  }

  const handleSort = (sortType: "Random" | "Date" | "Alphabetical") => {
    if (sortBy === sortType) {
      // Toggle direction if same sort type
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      // Set new sort type with default direction
      setSortBy(sortType)
      setSortDirection(sortType === "Date" ? "desc" : sortType === "Alphabetical" ? "asc" : "desc") // Date: desc, Alpha: asc, Random: desc
    }
  }

  // Pure filter predicate — no sorting, used by both getFilteredFonts and filterAvailability
  const fontPassesFilters = (
    font: FontData,
    cols: string[], cats: string[], stags: string[], langs: string[], feats: string[], wt: number | null, authorQ = ''
  ): boolean => {
    if (cols.length > 0 && !cols.includes(font.collection || 'Text')) return false
    if (cats.length > 0 && !cats.every(c => (font.categories || []).includes(c))) return false
    if (stags.length > 0 && !stags.every(s => (font.styleTags || []).includes(s))) return false
    if (langs.length > 0 && !langs.some(l => (font.languages || []).includes(l))) return false
    if (feats.length > 0) {
      const fontFeats = getFontFeatures(font)
      if (!feats.every(f => fontFeats.includes(f))) return false
    }
    if (wt !== null && !font.availableWeights.includes(wt)) return false
    if (authorQ && !(font.author || '').toLowerCase().includes(authorQ.toLowerCase())) return false
    return true
  }

  // Which filter options still yield results — drives disabled state in sidebar
  const filterAvailability = useMemo(() => {
    const c = selectedCollections, ca = selectedCategories, st = selectedStyles
    const la = selectedLanguages, fe = selectedFeatures, wt = previewWeight, au = selectedAuthor

    // For OR-groups: check against fonts passing all OTHER groups
    const forCols  = fonts.filter(f => fontPassesFilters(f, [],  ca, st, la, fe, wt, au))
    const forLangs = fonts.filter(f => fontPassesFilters(f, c, ca, st, [], fe, wt, au))
    const forWt    = fonts.filter(f => fontPassesFilters(f, c, ca, st, la, fe, null, au))

    // For AND-groups: check against current full result
    const current  = fonts.filter(f => fontPassesFilters(f, c, ca, st, la, fe, wt, au))

    return {
      collections: new Set(forCols.map(f => f.collection || 'Text')),
      categories:  new Set(current.flatMap(f => f.categories || [])),
      styles:      new Set(current.flatMap(f => f.styleTags || [])),
      languages:   new Set(forLangs.flatMap(f => f.languages || [])),
      features:    new Set(current.flatMap(f => getFontFeatures(f))),
      weights:     new Set(forWt.flatMap(f => f.availableWeights)),
    }
  }, [fonts, selectedCollections, selectedCategories, selectedStyles, selectedLanguages, selectedFeatures, previewWeight, selectedAuthor])

  const getFilteredFonts = () => {
    const filtered = fonts.filter((font) => {
      // Filter by collection - if none selected, show all; if some selected, show only those
      const fontCollection = font.collection || 'Text' // Default to 'Text' if no collection set

      if (selectedCollections.length > 0 && !selectedCollections.includes(fontCollection)) {
        return false
      }
      
      // Filter by selected categories (AND logic)
      if (selectedCategories.length > 0) {
        const matchesAllCategories = selectedCategories.every(cat => font.categories.includes(cat))
        if (!matchesAllCategories) return false
      }
      
      // Filter by selected style tags (AND logic)
      if (selectedStyles.length > 0) {
        const hasMatchingStyle = selectedStyles.every(style => {
          // Check styleTags if available
          if (font.styleTags && Array.isArray(font.styleTags)) {
            return font.styleTags.includes(style)
          }
          // Fallback: check against inferred tags
          if (style === 'Display' && font.collection === 'Display') return true
          if (style === 'Serif' && font.categories?.includes('Serif')) return true  
          if (style === 'Sans Serif' && font.categories?.includes('Sans')) return true
          if (style === 'Monospace' && font.categories?.includes('Mono')) return true
          if (style === 'Script' && font.categories?.includes('Script')) return true
          if (style === 'Decorative' && font.categories?.includes('Decorative')) return true
          return false
        })
        if (!hasMatchingStyle) return false
      }
      
      // Filter by selected languages
      if (selectedLanguages.length > 0) {
        const hasMatchingLanguage = selectedLanguages.some(lang =>
          font.languages && font.languages.includes(lang)
        )
        if (!hasMatchingLanguage) return false
      }

      if (selectedFeatures.length > 0) {
        const fontFeats = getFontFeatures(font)
        if (!selectedFeatures.every(f => fontFeats.includes(f))) return false
      }

      if (!font.availableWeights.includes(previewWeight)) return false

      if (selectedAuthor && !(font.author || '').toLowerCase().includes(selectedAuthor.toLowerCase())) return false

      return true
    })

    // Apply sorting based on sortBy and sortDirection
    if (sortBy === "Random") {
      return filtered.sort((a, b) => seeded(a.id) - seeded(b.id))
    }
    return filtered.sort((a, b) => {
      let result = 0
      
      if (sortBy === "Alphabetical") {
        // Enhanced alphabetical sorting with numbers and symbols at the top
        result = a.name.localeCompare(b.name, undefined, { 
          numeric: true, 
          sensitivity: 'base',
          ignorePunctuation: false 
        })
      } else {
        // Date sorting - use newest date across family
        const ad = Array.isArray(a._familyFonts) ? Math.max(...a._familyFonts.map((f:any)=> f.uploadedAt ? new Date(f.uploadedAt).getTime() : 0)) : 0
        const bd = Array.isArray(b._familyFonts) ? Math.max(...b._familyFonts.map((f:any)=> f.uploadedAt ? new Date(f.uploadedAt).getTime() : 0)) : 0
        const aDate = isFinite(ad) ? ad : 0
        const bDate = isFinite(bd) ? bd : 0
        result = aDate - bDate // Default ascending (oldest first)
      }
      
      // Apply direction (flip result for descending)
      return sortDirection === "desc" ? -result : result
    })
  }

  const hasActiveFilters =
    selectedCollections.length > 0 ||
    selectedCategories.length > 0 ||
    selectedStyles.length > 0 ||
    selectedLanguages.length > 0 ||
    selectedAuthor !== '' ||
    selectedFeatures.length > 0 ||
    previewWeight !== 400 ||
    sortBy !== 'Date' ||
    textSize[0] !== 80 ||
    lineHeight[0] !== 120 ||
    textAlign !== 'center' ||
    selectedPreset !== 'Names' ||
    customText !== ''

  const resetFilters = () => {
    setCustomText("")
    setSelectedPreset("Names")
    setSelectedCollections([]) // Reset collection filters
    setSelectedCategories([])
    setSelectedStyles([])
    setSelectedLanguages([])
    setSelectedAuthor('')
    setPreviewWeight(400)
    setSelectedFeatures([])
    setSortBy("Date") // Reset sort to default (New)
    setFontWeightSelections({})
    setTextSize([80])
    setLineHeight([120])
    setTextAlign('center')
    setExpandedCards(new Set())
    setFontOTFeatures({})
    setFontVariableAxes({})
  }

  const getPreviewContent = (fontName: string) => {
    if (customText.trim()) {
      return customText
    }
    return getPresetContent(selectedPreset, fontName)
  }


  // Restore focus to the currently edited preview input after state updates
  useEffect(() => {
    if (focusedFontId != null) {
      const el = inputRefs.current[focusedFontId]
      if (el) {
        try {
          el.focus({ preventScroll: true })
          const pos = Math.min(textCursorPosition[focusedFontId] || 0, el.value.length)
          el.setSelectionRange(pos, pos)
        } catch {}
      }
    }
  }, [customText, textCursorPosition, focusedFontId])

  // Close expanded cards on click outside
  useEffect(() => {
    if (expandedCards.size === 0) return
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      let inside = false
      expandedCards.forEach(id => {
        const el = document.querySelector(`[data-card-id="${id}"]`)
        if (el?.contains(target)) inside = true
      })
      if (!inside) setExpandedCards(new Set())
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [expandedCards])

  // Keep focus across expand/collapse toggles and when focusing new input
  useEffect(() => {
    if (focusedFontId != null) {
      const el = inputRefs.current[focusedFontId]
      if (el) {
        try {
          el.focus({ preventScroll: true })
          const pos = Math.min(textCursorPosition[focusedFontId] || 0, el.value.length)
          el.setSelectionRange(pos, pos)
        } catch {}
      }
    }
  }, [expandedCards, focusedFontId, textCursorPosition])

  // Get all available style tags from ALL fonts (unified across collections), ordered by Manage Tags vocab
  const getAvailableStyleTags = () => {
    const allTags = new Set<string>()
    fonts.forEach(font => {
      // Include tags from ALL fonts regardless of collection
      if (font.styleTags && Array.isArray(font.styleTags)) {
        font.styleTags.forEach(tag => allTags.add(tag))
      }
    })
    const arr = Array.from(allTags)
    return arr.sort((a, b) => a.localeCompare(b))
  }

  // Get dynamic categories based on fonts actually present in selected collections (or all if none selected)
  const getCollectionCategories = () => {
    // Get all categories from fonts in the selected collections (or all if none selected)
    const actualCategories = new Set<string>()
    fonts.forEach(font => {
      const fontCollection = font.collection || 'Text'
      const shouldInclude = selectedCollections.length === 0 || selectedCollections.includes(fontCollection)
      if (shouldInclude && font.categories) {
        font.categories.forEach(category => actualCategories.add(category))
      }
    })

    const arr = Array.from(actualCategories)
    return arr.sort((a, b) => a.localeCompare(b))
  }

  const getCollectionLanguages = () => {
    // Get all languages from fonts in the selected collections (or all if none selected)
    const actualLanguages = new Set<string>()
    fonts.forEach(font => {
      const fontCollection = font.collection || 'Text'
      const shouldInclude = selectedCollections.length === 0 || selectedCollections.includes(fontCollection)
      if (shouldInclude) {
        // Check if font has language data
        if (font.languages && Array.isArray(font.languages) && font.languages.length > 0) {
          font.languages.forEach((language: string) => actualLanguages.add(language))
        } else {
          // Fallback: if no language data, assume Latin for most fonts
          actualLanguages.add('Latin')
        }
      }
    })

    // Define preferred order for common languages
    const languageOrder = ['Latin', 'Cyrillic', 'Greek', 'Arabic', 'Hebrew', 'Chinese', 'Japanese', 'Korean', 'Thai', 'Vietnamese', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Georgian']

    // Return languages in preferred order, but only those that actually exist
    const orderedLanguages = languageOrder.filter(lang => actualLanguages.has(lang))

    // Add any remaining languages that exist but aren't in the preferred order
    const remainingLanguages = Array.from(actualLanguages)
      .filter(lang => !languageOrder.includes(lang))
      .sort()

    return [...orderedLanguages, ...remainingLanguages];
  }

  // Helper function to convert weight number to style name
  const getStyleNameFromWeight = (weight: number, isItalic: boolean): string => {
    let styleName = 'Regular'
    
    if (weight <= 150) styleName = 'Thin'
    else if (weight <= 250) styleName = 'ExtraLight'
    else if (weight <= 350) styleName = 'Light'
    else if (weight <= 450) styleName = 'Regular'
    else if (weight <= 550) styleName = 'Medium'
    else if (weight <= 650) styleName = 'SemiBold'
    else if (weight <= 750) styleName = 'Bold'
    else if (weight <= 850) styleName = 'ExtraBold'
    else styleName = 'Black'
    
    return isItalic ? `${styleName} Italic` : styleName
  }

  // Post-render font fallback detection using DOM and canvas measurement
  useEffect(() => {
    const detectAndHighlightFallbackChars = () => {
      // Find all contentEditable preview divs
      const previewDivs = document.querySelectorAll('div[contenteditable="true"]')
      
      previewDivs.forEach((div) => {
        const element = div as HTMLElement
        const fontFamily = element.style.fontFamily
        if (!fontFamily) return

        // Create canvas for measurement
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const fontSize = 20 // Match approximate preview size
        const originalText = element.textContent || ''
        
        // Check each character to build fallback map
        const uniqueChars = [...new Set(originalText.split(''))]
        const fallbackChars = new Set<string>()
        
        for (const char of uniqueChars) {
          // Skip basic Latin characters and whitespace
          if (/^[a-zA-Z0-9\s\.,!?;:'"-]$/.test(char)) continue
          
          try {
            // Measure with intended font
            ctx.font = `${fontSize}px ${fontFamily}`
            const intendedWidth = ctx.measureText(char).width
            
            // Measure with fallback only
            ctx.font = `${fontSize}px sans-serif`  
            const fallbackWidth = ctx.measureText(char).width
            
            // If widths are very close, likely using fallback
            if (Math.abs(intendedWidth - fallbackWidth) < 1) {
              fallbackChars.add(char)
            }
          } catch (error) {
            continue
          }
        }
        
        // Only proceed if we have fallback characters
        if (fallbackChars.size === 0) {
          // Clean up any existing highlighting
          element.innerHTML = originalText
          return
        }
        
        // Create highlighted HTML by wrapping fallback characters
        // Use class-only styling to avoid CSS variable injection into text content
        let highlightedHTML = originalText
        
        for (const char of fallbackChars) {
          const escapedChar = char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const regex = new RegExp(escapedChar, 'g')
          highlightedHTML = highlightedHTML.replace(
            regex,
            `<span class="fallback-char">${char}</span>`
          )
        }
        
        // Only update if content actually changed and element is not currently focused
        // Also prevent updates if text already contains HTML/CSS artifacts  
        if (highlightedHTML !== originalText && 
            highlightedHTML !== element.innerHTML && 
            document.activeElement !== element &&
            !originalText.includes('var(--') && 
            !originalText.includes(';">')) {
          element.innerHTML = highlightedHTML
        }
      })
    }
    
    // Run detection after fonts load and on text changes
    const timer = setTimeout(detectAndHighlightFallbackChars, 100)
    return () => clearTimeout(timer)
  }, [fonts, customText])

  // Placeholder function - now handled by useEffect
  const highlightMissingCharacters = (text: string, fontId: number) => {
    return text
  }

  const handlePreviewEdit = (element: HTMLDivElement, newText: string) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      setCustomText(newText)
      return
    }
    
    const range = selection.getRangeAt(0)
    const cursorOffset = range.startOffset

    // Store the cursor position before state update
    const preserveCursor = () => {
      requestAnimationFrame(() => {
        if (element && selection) {
          try {
            let textNode = element.firstChild
            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
              const newRange = document.createRange()
              const safeOffset = Math.min(cursorOffset, textNode.textContent?.length || 0)
              newRange.setStart(textNode, safeOffset)
              newRange.setEnd(textNode, safeOffset)
              selection.removeAllRanges()
              selection.addRange(newRange)
            } else {
              // If no text node exists, create one and position cursor
              if (element.textContent !== newText) {
                element.textContent = newText
                textNode = element.firstChild
                if (textNode) {
                  const newRange = document.createRange()
                  const safeOffset = Math.min(cursorOffset, newText.length)
                  newRange.setStart(textNode, safeOffset)
                  newRange.setEnd(textNode, safeOffset)
                  selection.removeAllRanges()
                  selection.addRange(newRange)
                }
              }
            }
          } catch (error) {
            console.warn('Cursor position restoration failed:', error)
            element.focus()
          }
        }
      })
    }

    setCustomText(newText)
    preserveCursor()
  }

  const toggleCardExpansion = (fontId: number) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(fontId)) {
        newSet.delete(fontId)
      } else {
        newSet.add(fontId)
      }
      return newSet
    })
  }

  const toggleOTFeature = (fontId: number, feature: string) => {
    setFontOTFeatures((prev) => ({
      ...prev,
      [fontId]: {
        ...prev[fontId],
        [feature]: !prev[fontId]?.[feature],
      },
    }))
  }

  const updateVariableAxis = (fontId: number, axis: string, value: number) => {
    setFontVariableAxes((prev) => ({
      ...prev,
      [fontId]: {
        ...prev[fontId],
        [axis]: value,
      },
    }))
    
    // Sync italic axis to preview italic flag
    if (axis === 'ital') {
      const isItal = Number(value) >= 1
      setFontWeightSelections((prev) => ({
        ...prev,
        [fontId]: { ...(prev[fontId] || { weight: 400, italic: false }), italic: isItal },
      }))
    }
  }

  const getEffectiveStyle = (fontId: number) => {
    const font = fonts.find(f => f.id === fontId)
    const fontSelection = fontWeightSelections[fontId] || { weight: 400, italic: false }
    const stateAxes = fontVariableAxes[fontId] || {}
    const otFeatures = fontOTFeatures[fontId] || {}
    const isFamilyVariable = (font?.type === 'Variable') || !!(font?.variableAxes && font.variableAxes.length)

    const axesOut: Record<string, number> = { ...stateAxes }
    if (isFamilyVariable && axesOut.wght === undefined) {
      axesOut.wght = previewWeight
    }

    const weight = isFamilyVariable ? (axesOut.wght ?? previewWeight) : (fontSelection.weight || previewWeight || 400)
    let italic = fontSelection.italic || false
    if (isFamilyVariable) {
      const italVal = Number(stateAxes['ital'])
      if (isFinite(italVal)) italic = italic || italVal >= 1
    }

    const result = { weight, italic, variableAxes: axesOut, otFeatures }
    return result
  }


  // Load fonts only if not provided by server (fallback)
  useEffect(() => {
    if (initialFonts.length === 0) loadFonts()
    else loadFontCSS(initialFonts)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Scroll to top when navigated via logo click (not via browser back)
  useEffect(() => {
    if (sessionStorage.getItem('catalog-scroll-reset') === '1') {
      sessionStorage.removeItem('catalog-scroll-reset')
      mainRef.current?.scrollTo({ top: 0 })
      // Re-enable scroll restoration so browser back button works normally
      history.scrollRestoration = 'auto'
    }
  }, [])

  useLayoutEffect(() => {
    setIsMobile(window.innerWidth < 768)
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])


  // Track font loading for individual fonts
  useEffect(() => {
    if (!fonts || fonts.length === 0) return

    const checkFontLoaded = async (font: FontData) => {
      try {
        // Get the CSS family name from font selection or default
        const fontSelection = fontWeightSelections[font.id]
        const cssFamily = fontSelection?.cssFamily || font.fontFamily

        if (!cssFamily) {
          // If no cssFamily, mark as loaded immediately
          setLoadedFonts(prev => new Set(prev).add(font.id))
          return
        }

        // Load this specific font only — don't block on document.fonts.ready (waits for all 150+)
        const fontSpec = `16px "${cssFamily}"`
        if (!document.fonts.check(fontSpec)) {
          await document.fonts.load(fontSpec)
        }
        setLoadedFonts(prev => new Set(prev).add(font.id))
      } catch (error) {
        // On error, mark as loaded anyway to remove shimmer
        setLoadedFonts(prev => new Set(prev).add(font.id))
      }
    }

    // Check all fonts that aren't already marked as loaded
    const fontsToCheck = fonts.filter(font => !loadedFonts.has(font.id))
    fontsToCheck.forEach(font => {
      checkFontLoaded(font)
    })
  }, [fonts, fontWeightSelections, loadedFonts])

  // Track fonts that should be animated (only on first load)
  useEffect(() => {
    loadedFonts.forEach(fontId => {
      if (!animatedFonts.has(fontId)) {
        setAnimatedFonts(prev => new Set(prev).add(fontId))
      }
    })
  }, [loadedFonts, animatedFonts])

  // Scroll-driven hero fade + scale
  // Scroll-driven hero fade + save position
  useEffect(() => {
    const main = mainRef.current
    const hero = heroRef.current
    if (!main || !hero) return
    // Restore scroll position from sessionStorage
    const saved = sessionStorage.getItem('catalog-scroll')
    if (saved) main.scrollTop = parseInt(saved, 10)
    const onScroll = () => {
      sessionStorage.setItem('catalog-scroll', String(main.scrollTop))
      const heroHeight = hero.offsetHeight
      const progress = Math.min(main.scrollTop / (heroHeight * 0.35), 1)
      hero.style.opacity = String(1 - progress)
      hero.style.transform = `scale(${1 - progress * 0.05})`
      setCatalogVisible(main.scrollTop > heroHeight * 0.15)
    }
    main.addEventListener('scroll', onScroll, { passive: true })
    return () => main.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToCatalog = useCallback(() => {
    const main = mainRef.current
    const cards = catalogCardsRef.current
    if (!main || !cards) return
    const mainRect = main.getBoundingClientRect()
    const cardsRect = cards.getBoundingClientRect()
    const target = main.scrollTop + (cardsRect.top - mainRect.top) - 86
    main.scrollTo({ top: target, behavior: 'smooth' })
  }, [])

  // Removed special font readiness and reporting; render normally

  return (
    <div className="h-screen overflow-hidden" style={{ backgroundColor: 'var(--gray-surface-sec)', color: getCurrentTheme().fg }}>
      {/* Fallback character styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .fallback-char{opacity:.4!important;color:var(--gray-cont-tert)!important;}
      ` }} />

      <Navbar fonts={fonts.map(f => ({ name: f.name, author: f.author }))} />

      {/* Main font list */}
      <main
        ref={mainRef}
        className="h-full overflow-y-auto"
        style={{ paddingTop: '80px', paddingBottom: '140px' }}
      >
        <h1 className="sr-only">Free Font Collection - Professional Typography for Designers</h1>

        {/* Hero section */}
        <div ref={heroRef} className="catalog-hero px-2">
          <div className="catalog-hero-content">
            <p className="catalog-hero-text">
              <span className="hero-line" style={{ animationDelay: '0.05s' }}><span style={{ color: 'var(--gray-cont-tert)' }}>TypeDump</span> is a curated index of open-source typefaces, hand-picked for designers, vibe coders, and developers. </span><span className="hero-line" style={{ animationDelay: '0.35s' }}>Text fonts built for interfaces and long reads; display faces with a strong point of view; fresh type for identity and culture. </span><span className="hero-line" style={{ animationDelay: '0.65s' }}>Preview any font in the browser, explore variable axes and stylistic alternates, find similar styles. Totally free.</span>
            </p>
            <div className="catalog-hero-buttons hero-buttons-reveal" style={{ animationDelay: '0.95s' }}>
              <a
                href="https://www.npmjs.com/package/typedump"
                target="_blank"
                rel="noopener noreferrer"
                className="v2-button v2-button-inactive"
                style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
              >
                Install MCP
              </a>
              <button
                className="v2-button v2-button-active"
                onClick={scrollToCatalog}
              >
                Browse catalog
              </button>
            </div>
          </div>
        </div>

        <div ref={catalogCardsRef} className="px-2 space-y-2" style={{ animation: 'v2FadeIn 0.5s ease-out forwards', position: 'relative', zIndex: 2 }}>
          {isLoadingFonts ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={`skeleton-${i}`} className="v2-card" style={{ padding: '24px', minHeight: '200px' }}>
                <div className="v2-shimmer" style={{ height: '40px', width: '200px', borderRadius: '8px', marginBottom: '16px' }} />
                <div className="v2-shimmer" style={{ height: '80px', width: '100%', borderRadius: '8px' }} />
              </div>
            ))
          ) : fonts.length === 0 ? (
            <div className="p-6 text-center">
              <div style={{ color: "var(--gray-cont-tert)" }}>
                Temporary maintenance in progress. Font catalog will be restored shortly.
              </div>
            </div>
          ) : (
            getFilteredFonts().map((font, idx) => {
              const fontSelection = fontWeightSelections[font.id] || (() => {
                if (font._availableStyles && font._availableStyles.length > 0) {
                  const byWeight = font._availableStyles.find(s => s.weight === previewWeight && !s.isItalic)
                    ?? font._availableStyles.find(s => s.weight === previewWeight)
                  const regular = font._availableStyles.find(s => s.styleName === 'Regular' || (s.weight === 400 && !s.isItalic))
                  const nonItalic = font._availableStyles.find(s => !s.isItalic)
                  const defaultStyle = byWeight || regular || nonItalic || font._availableStyles[0]
                  return {
                    weight: defaultStyle.weight,
                    italic: defaultStyle.isItalic,
                    cssFamily: (defaultStyle as any).cssFamily,
                    styleName: defaultStyle.styleName,
                  }
                }
                return { weight: 400, italic: false }
              })()
              const effectiveStyle = getEffectiveStyle(font.id)
              const staggerDelay = `${Math.min(idx * 0.05, 0.5)}s`
              return (
                <div key={font.id} className="v2-card-reveal" style={{ animationDelay: staggerDelay }}>
                <FontCard
                  key={font.id}
                  font={font as any}
                  isMobile={isMobile}
                  fontSelection={fontSelection}
                  isLoaded={loadedFonts.has(font.id)}
                  isAnimated={animatedFonts.has(font.id)}
                  isExpanded={expandedCards.has(font.id)}
                  previewContent={getPreviewContent(font.name)}
                  cursorPosition={textCursorPosition[font.id] || 0}
                  otFeatures={fontOTFeatures[font.id] || {}}
                  variableAxesState={fontVariableAxes[font.id] || {}}
                  styleAlternates={getStyleAlternates(font.id)}
                  variableAxesDef={getVariableAxes(font.id)}
                  effectiveStyle={effectiveStyle}
                  textSize={textSize[0]}
                  lineHeight={lineHeight[0]}
                  textAlign={textAlign}
                  onSelectRef={el => { selectRefs.current[font.id] = el }}
                  onInputRef={el => { inputRefs.current[font.id] = el }}
                  onStyleChange={(weight, italic, cssFamily) => {
                    updateFontSelection(font.id, weight, italic, cssFamily)
                    setFontVariableAxes(prev => ({ ...prev, [font.id]: { ...prev[font.id], wght: weight } }))
                  }}
                  onTextChange={(text, pos) => {
                    setTextCursorPosition(prev => ({ ...prev, [font.id]: pos }))
                    if (text !== customText) {
                      const presetVal = getPresetContent(selectedPreset, font.name)
                      if (!(customText.trim() === '' && text === presetVal)) setCustomText(text)
                    }
                  }}
                  onFocus={() => {
                    setFocusedFontId(font.id)
                    if (!expandedCards.has(font.id)) toggleCardExpansion(font.id)
                  }}
                  onToggleExpand={() => toggleCardExpansion(font.id)}
                  onToggleOTFeature={tag => toggleOTFeature(font.id, tag)}
                  onVariableAxisChange={(tag, val) => updateVariableAxis(font.id, tag, val)}
                />
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <footer style={{ marginTop: 80, padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{
            fontFamily: '"Inter Variable", sans-serif',
            fontSize: 13,
            fontWeight: 400,
            color: 'var(--gray-cont-tert)',
          }}>
            © 2026 TypeDump
          </span>
          <span style={{
            fontFamily: '"Inter Variable", sans-serif',
            fontSize: 13,
            fontWeight: 400,
            color: 'var(--gray-cont-tert)',
          }}>
            Built and curated by{' '}
            <a href="https://plkv.works/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gray-cont-prim)' }}>Stas Polyakov</a>
          </span>
        </footer>
      </main>


      {/* Invisible click-outside handler */}
      <div
        onClick={() => setSidebarOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'var(--v2-dim)',
          opacity: sidebarOpen ? 1 : 0,
          pointerEvents: sidebarOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s',
        }}
      />

      {/* Bottom bar — expands upward */}
      <div
        className={catalogVisible ? 'v2-nav-enter-bottom' : 'v2-nav-pre-bottom'}
        style={{
          position: 'fixed',
          bottom: '16px',
          left: '50%',
          width: 'calc(100% - 32px)',
          maxWidth: '440px',
          zIndex: 50,
        }}
      >
        {/*
          BOTTOM BAR STRUCTURE — DO NOT REORDER
          Card is position:fixed bottom:16px → grows upward → DOM order = visual top→bottom

          1. Header        (grid 0fr→1fr)  visible when OPEN   — count + reset + close
          2. Collections-A (grid 1fr→0fr)  visible when CLOSED — collapses on open
          3. Filter body   (grid 0fr→1fr)  visible when OPEN   — collections-B is first item inside scroll
          4. Trigger       (grid 1fr→0fr)  visible when CLOSED — "More filters" button

          Collections are duplicated: A shows in calm state, B scrolls with filters when open.
        */}
        <div className="v2-card v2-overlay" style={{ overflow: 'hidden', maxHeight: 'calc(100vh - 94px)' }}>

          {/* Header — appears above when open */}
          <div style={{
            display: 'grid',
            gridTemplateRows: sidebarOpen ? '1fr' : '0fr',
            transition: 'grid-template-rows 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            <div style={{ overflow: 'hidden' }}>
              <div className="flex items-center p-4" style={{ gap: '12px' }}>
                <span className="text-sidebar-title flex-1">{getFilteredFonts().length} font families</span>
                <div className="flex gap-2">
                  {hasActiveFilters && (
                    <button onClick={resetFilters} className="v2-button v2-button-inactive" style={{ width: '40px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <IconReset size={20} />
                    </button>
                  )}
                  <button onClick={() => setSidebarOpen(false)} className="v2-button v2-button-inactive" style={{ width: '40px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <IconXMark size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Collections — visible in closed state, collapses when open */}
          <div style={{
            display: 'grid',
            gridTemplateRows: sidebarOpen ? '0fr' : '1fr',
            transition: 'grid-template-rows 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            <div style={{ overflow: 'hidden' }}>
              <div className="flex gap-2 px-4 pt-4 pb-1">
                {(["Text", "Display", "Brutal"] as const).map((mode) => (
                  <button
                    key={mode}
                    disabled={!selectedCollections.includes(mode) && !filterAvailability.collections.has(mode)}
                    onClick={() => {
                      setSelectedCollections(prev =>
                        prev.includes(mode) ? prev.filter(c => c !== mode) : [...prev, mode]
                      )
                      setTimeout(scrollToCatalog, 100)
                    }}
                    className={`v2-approach-button ${selectedCollections.includes(mode) ? 'v2-button-active' : 'v2-button-inactive'}${!selectedCollections.includes(mode) && !filterAvailability.collections.has(mode) ? ' v2-filter-disabled' : ''}`}
                  >
                    <span style={{
                      fontFeatureSettings: "'ss03' on, 'cv06' on, 'cv11' on",
                      fontFamily: getStablePreviewFontForCollection(mode),
                      fontSize: "24px", fontWeight: 500, lineHeight: "24px",
                    }}>Ag</span>
                    <span>{mode}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Filter body — appears when open, collections first inside scroll */}
          <div style={{
            display: 'grid',
            gridTemplateRows: sidebarOpen ? '1fr' : '0fr',
            transition: 'grid-template-rows 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            <div style={{ overflow: 'hidden' }}>
              <div className="overflow-y-auto scrollbar-hide" style={{ maxHeight: 'calc(100vh - 150px)' }}>
                <div className="px-4 py-4 space-y-8" style={{ paddingBottom: '40px' }}>

                  <div className="flex gap-2">
                    {(["Text", "Display", "Brutal"] as const).map((mode) => (
                      <button
                        key={mode}
                        disabled={!selectedCollections.includes(mode) && !filterAvailability.collections.has(mode)}
                        onClick={() => {
                          setSelectedCollections(prev =>
                            prev.includes(mode) ? prev.filter(c => c !== mode) : [...prev, mode]
                          )
                          setTimeout(scrollToCatalog, 100)
                        }}
                        className={`v2-approach-button ${selectedCollections.includes(mode) ? 'v2-button-active' : 'v2-button-inactive'}${!selectedCollections.includes(mode) && !filterAvailability.collections.has(mode) ? ' v2-filter-disabled' : ''}`}
                      >
                        <span style={{
                          fontFeatureSettings: "'ss03' on, 'cv06' on, 'cv11' on",
                          fontFamily: getStablePreviewFontForCollection(mode),
                          fontSize: "24px", fontWeight: 500, lineHeight: "24px",
                        }}>Ag</span>
                        <span>{mode}</span>
                      </button>
                    ))}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sidebar-title">Text size</h3>
                      <span className="text-sidebar-title" style={{ color: "var(--gray-cont-tert)" }}>{textSize[0]}px</span>
                    </div>
                    <Slider value={textSize} onValueChange={setTextSize} max={120} min={12} step={1} onReset={() => setTextSize([80])} />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sidebar-title">Line height</h3>
                      <span className="text-sidebar-title" style={{ color: "var(--gray-cont-tert)" }}>{lineHeight[0]}%</span>
                    </div>
                    <Slider value={lineHeight} onValueChange={setLineHeight} max={160} min={90} step={10} onReset={() => setLineHeight([120])} />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sidebar-title">Weight</h3>
                      <span className="text-sidebar-title" style={{ color: "var(--gray-cont-tert)" }}>{previewWeight}</span>
                    </div>
                    <Slider value={[previewWeight]} onValueChange={([v]) => setPreviewWeight(v)} min={100} max={900} step={100} onReset={() => setPreviewWeight(400)} />
                  </div>

                  <div className="flex gap-2">
                    {(['left', 'center', 'right'] as const).map((a) => (
                      <button
                        key={a}
                        onClick={() => setTextAlign(a)}
                        className={`v2-button flex-1 ${textAlign === a ? 'v2-button-active' : 'v2-button-inactive'}`}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', fontWeight: 400 }}>
                          {a === 'left' ? 'format_align_left' : a === 'center' ? 'format_align_center' : 'format_align_right'}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div>
                    <h3 className="text-sidebar-title mb-3">Text presets</h3>
                    <div className="flex flex-wrap gap-2">
                      {textPresets.map((preset) => (
                        <button
                          key={preset}
                          onClick={() => {
                            setSelectedPreset(preset)
                            if (preset === "Paragraph") setTextSize([20]); else setTextSize([80])
                            if (preset === "Names") setCustomText(""); else if (fonts[0]) setCustomText(getPresetContent(preset, fonts[0].name))
                          }}
                          className={`v2-button ${selectedPreset === preset ? 'v2-button-active' : 'v2-button-inactive'}`}
                        >{preset}</button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sidebar-title mb-3">Sort by</h3>
                    <div className="flex gap-2">
                      <button onClick={() => handleSort("Date")} className={`v2-button ${sortBy === "Date" ? 'v2-button-active' : 'v2-button-inactive'}`}>
                        {sortBy === "Date" && sortDirection === "desc" ? "New" : "Old"}
                      </button>
                      <button onClick={() => handleSort("Alphabetical")} className={`v2-button ${sortBy === "Alphabetical" ? 'v2-button-active' : 'v2-button-inactive'}`}>
                        {sortBy === "Alphabetical" && sortDirection === "asc" ? "A–Z" : "Z–A"}
                      </button>
                      <button onClick={() => handleSort("Random")} className={`v2-button ${sortBy === "Random" ? 'v2-button-active' : 'v2-button-inactive'}`}>
                        Random
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sidebar-title mb-3">Font categories</h3>
                    <div className="flex flex-wrap gap-2">
                      {getCollectionCategories().map((category) => {
                        const isActive = selectedCategories.includes(category)
                        const isAvail = isActive || filterAvailability.categories.has(category)
                        return (
                          <button key={category} disabled={!isAvail} onClick={() => toggleCategory(category)}
                            className={`v2-button ${isActive ? 'v2-button-active' : 'v2-button-inactive'}${!isAvail ? ' v2-filter-disabled' : ''}`}
                          >{category}</button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sidebar-title mb-3">Appearance</h3>
                    <div className="flex flex-wrap gap-2">
                      {getAvailableStyleTags().length > 0 ? getAvailableStyleTags().map((style) => {
                        const isActive = selectedStyles.includes(style)
                        const isAvail = isActive || filterAvailability.styles.has(style)
                        return (
                          <button key={style} disabled={!isAvail} onClick={() => toggleStyle(style)}
                            className={`v2-button ${isActive ? 'v2-button-active' : 'v2-button-inactive'}${!isAvail ? ' v2-filter-disabled' : ''}`}
                          >{style}</button>
                        )
                      }) : <span className="text-sm" style={{ color: "var(--gray-cont-tert)" }}>No style tags available</span>}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sidebar-title mb-3">Language support</h3>
                    <div className="flex flex-wrap gap-2">
                      {getCollectionLanguages().length > 0 ? getCollectionLanguages().map((language) => {
                        const isActive = selectedLanguages.includes(language)
                        const isAvail = isActive || filterAvailability.languages.has(language)
                        return (
                          <button key={language} disabled={!isAvail}
                            onClick={() => setSelectedLanguages(prev =>
                              prev.includes(language) ? prev.filter(l => l !== language) : [...prev, language]
                            )}
                            className={`v2-button ${isActive ? 'v2-button-active' : 'v2-button-inactive'}${!isAvail ? ' v2-filter-disabled' : ''}`}
                          >{language}</button>
                        )
                      }) : <span className="text-sm" style={{ color: "var(--gray-cont-tert)" }}>
                        No languages available{selectedCollections.length > 0 ? ` in ${selectedCollections.join(', ')}` : ''}
                      </span>}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sidebar-title mb-3">Features</h3>
                    <div className="flex flex-wrap gap-2">
                      {(['Variable', 'Variable width', 'Alternates'] as const).map(feature => {
                        const isActive = selectedFeatures.includes(feature)
                        const isAvail = isActive || filterAvailability.features.has(feature)
                        return (
                          <button key={feature} disabled={!isAvail}
                            onClick={() => setSelectedFeatures(prev =>
                              prev.includes(feature) ? prev.filter(f => f !== feature) : [...prev, feature]
                            )}
                            className={`v2-button ${isActive ? 'v2-button-active' : 'v2-button-inactive'}${!isAvail ? ' v2-filter-disabled' : ''}`}
                          >{feature}</button>
                        )
                      })}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* Trigger row — collapses when open */}
          <div style={{
            display: 'grid',
            gridTemplateRows: sidebarOpen ? '0fr' : '1fr',
            transition: 'grid-template-rows 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            <div style={{ overflow: 'hidden' }}>
              <div className="flex items-center gap-2 px-4 pt-1 pb-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="v2-button v2-button-inactive flex items-center gap-2 flex-1"
                  style={{ cursor: 'pointer', justifyContent: 'center' }}
                >
                  {(() => {
                    const count = selectedCategories.length + selectedStyles.length + selectedLanguages.length + selectedFeatures.length + (previewWeight !== 400 ? 1 : 0)
                    return count > 0 ? <>More filters · {count}</> : <>More filters</>
                  })()}
                </button>
                {hasActiveFilters && (
                  <button onClick={resetFilters} className="v2-button v2-button-inactive" title="Reset all filters" style={{ width: '40px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <IconReset size={20} />
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}
