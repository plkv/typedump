"use client"

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react"
import { Slider } from "@/components/ui/slider"
import { canonicalFamilyName } from "@/lib/font-naming"
import { shortHash } from "@/lib/hash"
import { Navbar } from "@/components/font-catalog/Navbar"
import { FontCard } from "@/components/font-catalog/FontCard"
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
  collection: 'Text' | 'Display' | 'Weirdo'
  styleTags: string[]
  categories: string[]
  languages?: string[]
}

const textPresets = ["Names", "Key Glyphs", "Basic", "Paragraph", "Brands"]
// Languages will be dynamically generated from current collection
const weights = [100, 200, 300, 400, 500, 600, 700, 800, 900]

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

export default function CatalogPage({ initialFonts }: { initialFonts: FontData[] }) {
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false) // matches SSR; set correctly in useEffect below
  const [isMobile, setIsMobile] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const selectRefs = useRef<Record<number, HTMLSelectElement | null>>({})
  
  // Font Data State — initialFonts comes from server component, no fetch needed
  const [fonts, setFonts] = useState<FontData[]>(initialFonts)
  const [isLoadingFonts, setIsLoadingFonts] = useState(initialFonts.length === 0)
  const [loadedFonts, setLoadedFonts] = useState<Set<number>>(new Set())
  const [animatedFonts, setAnimatedFonts] = useState<Set<number>>(new Set()) // Track fonts that have been animated once
  const [customText, setCustomText] = useState("")
  const [selectedCollections, setSelectedCollections] = useState<string[]>([])
  const [selectedPreset, setSelectedPreset] = useState("Names")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedStyles, setSelectedStyles] = useState<string[]>([])
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])
  const [selectedWeights, setSelectedWeights] = useState<number[]>([])
  const [isItalic, setIsItalic] = useState(false)
  const [fontWeightSelections, setFontWeightSelections] = useState<Record<number, { weight: number; italic: boolean; cssFamily?: string; styleName?: string }>>(
    {},
  )
  const [textSize, setTextSize] = useState([56])
  const [lineHeight, setLineHeight] = useState([120])

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
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")
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

  // Color theme functions
  const cycleColorTheme = () => {
    setCurrentColorTheme((prev) => (prev + 1) % colorThemes.length)
  }

  const resetToBlackAndWhite = () => {
    setCurrentColorTheme(0)
  }

  const getCurrentTheme = () => colorThemes[currentColorTheme]
  
  // Stable preview font per collection (don't change during session)
  const previewFontsRef = useRef<Record<'Text'|'Display'|'Weirdo', string>>({ Text: '', Display: '', Weirdo: '' })
  const getStablePreviewFontForCollection = (collection: "Text" | "Display" | "Weirdo") => {
    if (!previewFontsRef.current[collection]) {
      const candidates = fonts.filter(f => f.collection === collection)
      if (candidates.length) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)]
        previewFontsRef.current[collection] = pick?.fontFamily || "Inter Variable, system-ui, sans-serif"
      }
    }
    return previewFontsRef.current[collection] || "Inter Variable, system-ui, sans-serif"
  }
  const [fontOTFeatures, setFontOTFeatures] = useState<Record<number, Record<string, boolean>>>({})
  const [fontVariableAxes, setFontVariableAxes] = useState<Record<number, Record<string, number>>>({})
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const [focusedFontId, setFocusedFontId] = useState<number | null>(null)

  const [editingElementRef, setEditingElementRef] = useState<HTMLDivElement | null>(null)
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

    // Generate CSS for each font - handle multiple files per family
    const fontCSS = fonts.map(font => {
      if (font._familyFonts && font._familyFonts.length > 1) {
        // For families with multiple files, create @font-face for each file
        return font._familyFonts.map((fontFile: any) => {
          const isItalic = (fontFile.style || '').toLowerCase().includes('italic') || (fontFile.style || '').toLowerCase().includes('oblique')
          const fontWeight = fontFile.weight || 400
          
          return `
            @font-face {
              font-family: "${font.family}";
              src: url("${fontFile.url || fontFile.blobUrl || `/fonts/${fontFile.filename}`}");
              font-weight: ${fontWeight};
              font-style: ${isItalic ? 'italic' : 'normal'};
              font-display: swap;
            }`
        }).join('\n')
      } else {
        // Single font file
        const isItalic = (font.style || '').toLowerCase().includes('italic') || (font.style || '').toLowerCase().includes('oblique')
        return `
          @font-face {
            font-family: "${font.family}";
            src: url("${font.url || `/fonts/${font.filename}`}");
            font-weight: ${font.availableWeights?.[0] || 400};
            font-style: ${isItalic ? 'italic' : 'normal'};
            font-display: swap;
          }`
      }
    }).join('\n')

    // Inject CSS
    if (fontCSS) {
      const styleElement = document.createElement('style')
      styleElement.setAttribute('data-font-css', 'true')
      styleElement.textContent = fontCSS
      document.head.appendChild(styleElement)
    }
  }, [])

  // Helper function to get stylistic alternates from font's OpenType features
  const getStyleAlternates = (fontId: number) => {
    const font = fonts.find((f) => f.id === fontId)
    if (!font) return []
    // Prefer server-parsed structured tags if available - use Map to deduplicate by tag
    const tagMap = new Map<string, string>()
    const pushTags = (ff: any) => {
      const list = (ff && (ff as any).openTypeFeatureTags) as Array<{ tag: string; title: string }> | undefined
      if (Array.isArray(list)) list.forEach(({ tag, title }) => {
        if (/^ss\d\d$|^salt$/i.test(tag) && !tagMap.has(tag)) {
          tagMap.set(tag, title)
        }
      })
    }
    pushTags(font)
    font._familyFonts?.forEach(pushTags)
    if (tagMap.size > 0) {
      return Array.from(tagMap.entries())
        .map(([tag, title]) => ({ tag, title }))
        .sort((a, b) => a.tag.localeCompare(b.tag))
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

          allAxes.set(axis.axis, { tag: axis.axis, name: axis.name, min, max, default: defaultValue })
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

  const toggleWeight = (weight: number) => {
    setSelectedWeights((prev) => (prev.includes(weight) ? prev.filter((w) => w !== weight) : [...prev, weight]))
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
      
      // Filter by weights and italic (existing logic)
      if (selectedWeights.length === 0 && !isItalic) return true

      if (selectedWeights.length === 0 && isItalic) {
        return font.hasItalic
      }

      if (selectedWeights.length > 0) {
        const hasSelectedWeight = selectedWeights.some((weight) => font.availableWeights.includes(weight))

        if (isItalic) {
          return hasSelectedWeight && font.hasItalic
        }

        return hasSelectedWeight
      }

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

  const resetFilters = () => {
    setCustomText("")
    setSelectedPreset("Names")
    setSelectedCollections([]) // Reset collection filters
    setSelectedCategories([])
    setSelectedStyles([])
    setSelectedLanguages([])
    setSelectedWeights([])
    setIsItalic(false)
    setSortBy("Date") // Reset sort to default (New)
    setFontWeightSelections({})
    setTextSize([56])
    setLineHeight([120])
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
          el.focus()
          const pos = Math.min(textCursorPosition[focusedFontId] || 0, el.value.length)
          el.setSelectionRange(pos, pos)
        } catch {}
      }
    }
  }, [customText, textCursorPosition, focusedFontId])

  // Keep focus across expand/collapse toggles and when focusing new input
  useEffect(() => {
    if (focusedFontId != null) {
      const el = inputRefs.current[focusedFontId]
      if (el) {
        try {
          el.focus()
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
    // Sort by unified vocab order (no collection-specific filtering)
    return arr.sort((a,b)=>{
      const order = (window as any).__appearanceOrder__ as string[] | undefined
      if (order && order.length) {
        const ia = order.findIndex(x=>x.toLowerCase()===a.toLowerCase())
        const ib = order.findIndex(x=>x.toLowerCase()===b.toLowerCase())
        return (ia===-1? 1e6:ia) - (ib===-1? 1e6:ib)
      }
      return a.localeCompare(b)
    })
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
    return arr.sort((a,b)=>{
      const order = (window as any).__categoryOrder__ as string[] | undefined
      if (order && order.length) {
        const ia = order.findIndex(x=>x.toLowerCase()===a.toLowerCase())
        const ib = order.findIndex(x=>x.toLowerCase()===b.toLowerCase())
        return (ia===-1? 1e6:ia) - (ib===-1? 1e6:ib)
      }
      return a.localeCompare(b)
    })
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
    
    // Sync weight axis changes with dropdown selection
    if (axis === "wght") {
      setFontWeightSelections((prev) => ({
        ...prev,
        [fontId]: {
          ...(prev[fontId] || { weight: 400, italic: false }),
          weight: Math.round(value), // Round to nearest integer for weight
        },
      }))
    }
    // Sync italic axis to preview italic flag
    if (axis === 'ital') {
      const isItal = Number(value) >= 1
      setFontWeightSelections((prev) => ({
        ...prev,
        [fontId]: { ...(prev[fontId] || { weight: 400, italic: false }), italic: isItal },
      }))
    }
    if (axis === 'slnt') {
      const isItal = Math.abs(Number(value)) > 0.01
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

    // Base axes: ensure variable fonts always carry an explicit wght so browser doesn't use font's internal default
    const axesOut: Record<string, number> = { ...stateAxes }
    if (isFamilyVariable && axesOut.wght == null) {
      axesOut.wght = selectedWeights.length > 0 ? selectedWeights[0] : (fontSelection.weight || 400)
    }

    // Resolve weight/italic with sidebar filters taking precedence when set
    const weight = selectedWeights.length > 0
      ? selectedWeights[0]
      : (axesOut.wght || fontSelection.weight || 400)
    // If variable italic axes present, derive italic from axes when meaningful
    let italic = isItalic || fontSelection.italic || false
    if (isFamilyVariable) {
      const italVal = Number(stateAxes['ital'])
      const slntVal = Number(stateAxes['slnt'])
      if (isFinite(italVal)) italic = italic || italVal >= 1
      if (isFinite(slntVal)) italic = italic || Math.abs(slntVal) > 0.01
    }

    const result = { weight, italic, variableAxes: axesOut, otFeatures }
    return result
  }

  // Load fonts only if not provided by server (fallback)
  useEffect(() => {
    if (initialFonts.length === 0) loadFonts()
  }, [loadFonts, initialFonts.length])

  // useLayoutEffect fires before paint — no sidebar flash on desktop
  useLayoutEffect(() => {
    const isDesktop = window.innerWidth >= 768
    setIsMobile(!isDesktop)
    setSidebarOpen(isDesktop)
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Load unified appearance order vocabulary on mount
  useEffect(() => {
    const loadAppearanceOrder = async () => {
      try {
        const response = await fetch('/api/tags/vocab?type=appearance')
        if (response.ok) {
          const data = await response.json()
          if (data.success && Array.isArray(data.vocabulary)) {
            // Store unified appearance order globally (no collection key)
            (window as any).__appearanceOrder__ = data.vocabulary
          }
        }
      } catch (error) {
        console.warn('Failed to load appearance order vocabulary:', error)
      }
    }
    loadAppearanceOrder()
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

  // Removed special font readiness and reporting; render normally

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--gray-surface-sec)', color: getCurrentTheme().fg }}>
      {/* Fallback character styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .fallback-char{opacity:.4!important;color:var(--gray-cont-tert)!important;}
      ` }} />

      <Navbar
        sidebarOpen={sidebarOpen}
        onSidebarToggle={() => setSidebarOpen(true)}
        isMobile={isMobile}
        theme={getCurrentTheme()}
      />

      {/* Контейнер для сайдбара и каталога */}
      <div className="flex-1 flex overflow-hidden">
      {/* Mobile overlay — only when JS confirms mobile+open */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/*
        Sidebar wrapper: always in DOM so SSR includes it.
        CSS controls initial visibility:
          – desktop (≥768px): visible via media query, no JS flash
          – mobile: hidden by default, shown when sidebarOpen=true via JS class
      */}
      <div
        className={`catalog-sidebar-wrap${sidebarOpen ? ' catalog-sidebar-open' : ''}`}
        style={{ height: '100%' }}
      >
        <div
          className={`${isMobile ? 'fixed z-50' : 'relative'} left-0 top-0 bottom-0 h-full`}
          style={{
            paddingLeft: isMobile ? '0' : '16px',
            paddingBottom: isMobile ? '0' : '16px',
            height: '100%'
          }}
        >
          <aside
            className="w-[280px] flex-shrink-0 flex flex-col h-full v2-card"
            style={{
              color: getCurrentTheme().fg
            }}
          >
            <div
              className={`sticky top-0 z-10 flex items-center ${isMobile ? 'p-2' : 'p-4'} flex-shrink-0`}
              style={{
                backgroundColor: 'var(--v2-card-bg)',
                borderBottom: "1px solid var(--gray-brd-prim)",
                color: getCurrentTheme().fg,
                borderTopLeftRadius: isMobile ? '0' : '16px',
                borderTopRightRadius: isMobile ? '0' : '16px',
                gap: '12px'
              }}
            >
            <button onClick={() => setSidebarOpen(false)} className="icon-btn">
              <span className="material-symbols-outlined" style={{ fontWeight: 400, fontSize: "20px" }}>
                side_navigation
              </span>
            </button>
            <span className="text-sidebar-title flex-1">{getFilteredFonts().length} font families</span>
            <button onClick={resetFilters} className="icon-btn">
              <span className="material-symbols-outlined" style={{ fontWeight: 400, fontSize: "20px" }}>
                refresh
              </span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className={`${isMobile ? 'p-2' : 'p-4'} space-y-8`}>

              <div>
                <div className="flex gap-2">
                  {(["Text", "Display", "Weirdo"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        // Toggle collection filter
                        setSelectedCollections(prev =>
                          prev.includes(mode)
                            ? prev.filter(c => c !== mode)
                            : [...prev, mode]
                        )
                        // Scroll to top of the list when changing filters
                        setTimeout(() => {
                          const mainElement = document.querySelector('main')
                          if (mainElement) {
                            mainElement.scrollTo({ top: 0, behavior: 'smooth' })
                          }
                        }, 100)
                      }}
                      className={`v2-approach-button ${selectedCollections.includes(mode) ? 'v2-button-active' : 'v2-button-inactive'}`}
                    >
                      <span
                        className="segmented-control-ag"
                        style={{
                          textAlign: "center",
                          fontFeatureSettings: "'ss03' on, 'cv06' on, 'cv11' on",
                          fontFamily: getStablePreviewFontForCollection(mode),
                          fontSize: "24px",
                          fontStyle: "normal",
                          fontWeight: 500,
                          lineHeight: "24px",
                        }}
                      >
                        Ag
                      </span>
                      <span>{mode}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sidebar-title mb-3">Text presets</h3>
                <div className="flex flex-wrap gap-2">
                  {textPresets.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => {
                        setSelectedPreset(preset)
                        if (preset === "Paragraph") setTextSize([20]); else setTextSize([56])
                        if (preset === "Names") setCustomText(""); else if (fonts[0]) setCustomText(getPresetContent(preset, fonts[0].name))
                      }}
                      className={`v2-button ${selectedPreset === preset ? 'v2-button-active' : 'v2-button-inactive'}`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hidden for now - will work on color themes later
              <div>
                <h3 className="text-sidebar-title mb-3">Color themes</h3>
                <div className="flex gap-2">
                  <button
                    onClick={cycleColorTheme}
                    className="btn-sm"
                    style={{
                      backgroundColor: getCurrentTheme().bg !== 'var(--gray-surface-prim)' ? getCurrentTheme().bg : undefined,
                      color: getCurrentTheme().fg !== 'var(--gray-cont-prim)' ? getCurrentTheme().fg : undefined,
                      border: getCurrentTheme().bg !== 'var(--gray-surface-prim)' ? `1px solid ${getCurrentTheme().fg}` : undefined
                    }}
                  >
                    Add color
                  </button>
                  <button
                    onClick={resetToBlackAndWhite}
                    className={`btn-sm ${currentColorTheme === 0 ? 'active' : ''}`}
                  >
                    B&W
                  </button>
                </div>
              </div>
              */}

              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-sidebar-title flex-shrink-0">Text size</h3>
                  <Slider
                    value={textSize}
                    onValueChange={setTextSize}
                    max={120}
                    min={12}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sidebar-title flex-shrink-0" style={{ color: "var(--gray-cont-tert)" }}>
                    {textSize[0]}px
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-sidebar-title flex-shrink-0">Line height</h3>
                  <Slider
                    value={lineHeight}
                    onValueChange={setLineHeight}
                    max={160}
                    min={90}
                    step={10}
                    className="flex-1"
                  />
                  <span className="text-sidebar-title flex-shrink-0" style={{ color: "var(--gray-cont-tert)" }}>
                    {lineHeight[0]}%
                  </span>
                </div>
              </div>

              {/* Сортировка */}
              <div>
                <h3 className="text-sidebar-title mb-3">Sort by</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSort("Date")}
                    className={`v2-button ${sortBy === "Date" ? 'v2-button-active' : 'v2-button-inactive'}`}
                  >
                    {sortBy === "Date" && sortDirection === "desc" ? "New" :
                     sortBy === "Date" && sortDirection === "asc" ? "Old" : "New"}
                  </button>
                  <button
                    onClick={() => handleSort("Alphabetical")}
                    className={`v2-button ${sortBy === "Alphabetical" ? 'v2-button-active' : 'v2-button-inactive'}`}
                  >
                    {sortBy === "Alphabetical" && sortDirection === "asc" ? "A–Z" :
                     sortBy === "Alphabetical" && sortDirection === "desc" ? "Z–A" : "A–Z"}
                  </button>
                  <button
                    onClick={() => handleSort("Random")}
                    className={`v2-button ${sortBy === "Random" ? 'v2-button-active' : 'v2-button-inactive'}`}
                  >
                    Random
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-sidebar-title mb-3">Font categories</h3>
                <div className="flex flex-wrap gap-2">
                  {getCollectionCategories().map((category) => (
                    <button
                      key={category}
                      onClick={() => toggleCategory(category)}
                      className={`v2-button ${selectedCategories.includes(category) ? 'v2-button-active' : 'v2-button-inactive'}`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sidebar-title mb-3">Appearance</h3>
                <div className="flex flex-wrap gap-2">
                  {getAvailableStyleTags().length > 0 ? getAvailableStyleTags().map((style) => (
                    <button
                      key={style}
                      onClick={() => toggleStyle(style)}
                      className={`v2-button ${selectedStyles.includes(style) ? 'v2-button-active' : 'v2-button-inactive'}`}
                    >
                      {style}
                    </button>
                  )) : (
                    <span className="text-sm" style={{ color: "var(--gray-cont-tert)" }}>
                      No style tags available
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sidebar-title mb-3">Language support</h3>
                <div className="flex flex-wrap gap-2">
                  {getCollectionLanguages().length > 0 ? getCollectionLanguages().map((language) => (
                    <button
                      key={language}
                      onClick={() =>
                        setSelectedLanguages((prev) =>
                          prev.includes(language) ? prev.filter((l) => l !== language) : [...prev, language],
                        )
                      }
                      className={`v2-button ${selectedLanguages.includes(language) ? 'v2-button-active' : 'v2-button-inactive'}`}
                    >
                      {language}
                    </button>
                  )) : (
                    <span className="text-sm" style={{ color: "var(--gray-cont-tert)" }}>No languages available{selectedCollections.length > 0 ? ` in ${selectedCollections.join(', ')} collection${selectedCollections.length > 1 ? 's' : ''}` : ''}</span>
                  )}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sidebar-title">Style</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {weights.map((weight) => (
                    <button
                      key={weight}
                      onClick={() => toggleWeight(weight)}
                      className={`v2-button ${selectedWeights.includes(weight) ? 'v2-button-active' : 'v2-button-inactive'}`}
                    >
                      {weight}
                    </button>
                  ))}
                  <button
                    onClick={() => setIsItalic(!isItalic)}
                    className={`v2-button ${isItalic ? 'v2-button-active' : 'v2-button-inactive'}`}
                  >
                    Italic
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto pb-16" style={{ backgroundColor: 'transparent' }}>
          {/* SEO H1 - visually hidden but accessible to search engines */}
          <h1 className="sr-only">Free Font Collection - Professional Typography for Designers</h1>
          <div className={`min-h-[100vh] ${isMobile ? 'p-2 space-y-2' : 'px-4 pb-4 space-y-4'}`}>
            {isLoadingFonts ? (
              // Show skeleton cards during loading to prevent layout shift
              Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="v2-card"
                  style={{
                    padding: '24px',
                    minHeight: '200px'
                  }}
                >
                  <div className="v2-shimmer" style={{
                    height: '40px',
                    width: '200px',
                    borderRadius: '8px',
                    marginBottom: '16px'
                  }} />
                  <div className="v2-shimmer" style={{
                    height: '80px',
                    width: '100%',
                    borderRadius: '8px'
                  }} />
                </div>
              ))
            ) : fonts.length === 0 ? (
              <div className="p-6 text-center">
                <div style={{ color: "var(--gray-cont-tert)" }}>
                  Temporary maintenance in progress. Font catalog will be restored shortly.
                </div>
              </div>
            ) : (
              getFilteredFonts().map((font) => {
              const fontSelection = fontWeightSelections[font.id] || (() => {
                // Use structured style data for default selection
                if (font._availableStyles && font._availableStyles.length > 0) {
                  // Prefer Regular style first, then first non-italic, then first available
                  const regularStyle = font._availableStyles.find(style => 
                    style.styleName === 'Regular' || (style.weight === 400 && !style.isItalic)
                  )
                  const nonItalicStyle = font._availableStyles.find(style => !style.isItalic)
                  const defaultStyle = regularStyle || nonItalicStyle || font._availableStyles[0]
                  
                  return {
                    weight: defaultStyle.weight,
                    italic: defaultStyle.isItalic,
                    cssFamily: (defaultStyle as any).cssFamily,
                    styleName: defaultStyle.styleName,
                  }
                }
                // Fallback for compatibility
                return { weight: 400, italic: false }
              })()
              const effectiveStyle = getEffectiveStyle(font.id)
              return (
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
              )
            })
            )}
            
            {/* Footer at end of catalog (styled like About) */}
            <footer 
              style={{ 
                display: "flex",
                padding: "24px",
                flexDirection: "column",
                alignItems: "flex-start",
                alignSelf: "stretch",
                borderTop: "1px solid var(--gray-brd-prim)" 
              }}
            >
              <div className="flex justify-between items-center w-full">
                <span className="text-sm" style={{ color: "var(--gray-cont-tert)" }}>
                  © typedump, 2025–Future
                </span>
                <span className="text-sm" style={{ color: "var(--gray-cont-tert)", textAlign: "right" }}>
                  Made by <a href="https://magicxlogic.com/" target="_blank" rel="noopener noreferrer" className="hover:underline">Magic x Logic</a>
                </span>
              </div>
            </footer>
          </div>
        </main>
      </div>

    </div>
  )
}
