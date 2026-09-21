# Tag vocabulary

Stas's definitions. They are the authority; the tag names on their own are
misleading, which is why this file exists.

## Categories

`Sans` · `Serif` · `Semi Serif` · `Script` · `Mono` · `Pixel` · `Decorative`

A category answers **what the letters are built on**, not what the font is for —
that is the collection's job. `Decorative` is for a face built on none of the
other skeletons: letters assembled from shapes, blades or runes rather than
written or drawn. Trezybec sat under `Sans` for months and the word did no
work there; a reader filtering for a sans did not want it, and a reader
looking at it learned nothing. Reach for it only after looking at the
letterforms — Gap Sans, Kulturë and LCT Ciburial are all tagged `Modular` or
`Squared` and are still plainly sanses.

**Semi Serif** means exactly two things and nothing else: some glyphs carry
serifs and some do not, or the family runs from sans to serif (a variable axis,
say). It does **not** mean small serifs — Bodoni's hairlines are a full Serif.
A flaring brush stroke is `Banded`, and `Banded` is a sans.

Two categories on one family are correct when the family genuinely contains
styles of both — Redaction is Serif plus its pixel degrade cuts, Sono runs a
sans-to-mono axis. Do not collapse those. It is only wrong when a single-style
font carries two categories that cannot both apply.

## Collections

By **readability and purpose**, not by mood. One per family.

- `Text` — neutral enough to set at body size and read.
- `Display` — works only large; too much character or too fine for running text.
- `Brutal` — crooked, experimental, raw, pixel, deliberately broken.

Ask "does this read as body copy?" before defaulting anything to Display.

## The serif class — mutually exclusive, exactly one, Serif only

Read the `o` for the axis of stress, then the contrast, then the serif shape.

| tag | axis | contrast | serifs |
|---|---|---|---|
| `Old Face` | diagonal | low | bracketed, tapering |
| `Transitional` | near vertical | moderate | bracketed (Baskerville, Times) |
| `Modern` | vertical | extreme, hairline | unbracketed (Bodoni, Didot) |
| `Slab` | — | low | thick, blocky |

`Modern` is **never** applied to a sans. For a sans reach for `New Face`,
`Neutral`, `Geometry`, `Tech`, `Wide`, `Fatface`.

`Old Face` is the one of the four that also applies to a sans, where it means
literally grotesque: protruding elements on the `a`, a little curlier.

## Style tags

- `Banded` — a **sans** drawn with a brush, the stroke widening toward its free
  end, thickness varying on the round letters. Canon: Optima. Mistaking that
  flare for a serif is what once filled Semi Serif with sanses.
- `Bauhaus` — built on the Bauhaus/Poch basis, visible in `m`, `u`, `a`.
- `Calligraphy` — neat handwriting. `Handwritten` — crooked handwriting. They
  are opposite ends of one scale; one or the other, not both.
- `Contrast` — contrasting joints and strokes, usually on a serif.
- `Curly` — the opposite of Neutral: an eccentric standout element, sometimes
  small. Abordage's looping `y` tail. Not the same as `Gill`.
- `Cut` — sliced, sharply cut strokes.
- `Fatface` — very heavy weights. **Not a serif signal**: JeanLuc and Tuoi Tre
  are high-contrast fatfaces and both are Sans.
- `Futura` — Futura-like geometric sans. `Geometry` — geometric generally.
- `Gill` — Gill-like humanist sharp grotesque.
- `Inktrap` — notches at the stroke junctions.
- `Low Poly` — low-polygon roundings.
- `Modular` — assembled from modules, usually geometric or brutal.
- `Multi Style` — several styles at once within one family. Two words.
- `Narrow` / `Wide` — narrower or wider than usual.
- `Neutral` — improved legibility, minimal character, good for text.
- `New Face` — neutral geometry without grotesque play, Inter-like.
- `Pixel` — pixelised glyphs in some styles. Always Display or Brutal.
- `Rounded` — the stroke **end** is rounded. About terminals, not geometry.
- `Sharp` — pointed, triangular terminals or serifs.
- `Squared` — squared-off letters, usually Display or Brutal.
- `Stencil` — interrupted strokes. `Stroked` — outline letters, not filled.
- `Tech` — bent, technical shapes: the `t` bends rather than curving.
- `Vintage` — references an old look. `Wavy` — wavy strokes.
- `Grotesque`, `Humanist` — sans sub-classes, added 29.08.2026 (Scoutie Sans,
  Valley Sans).

## The mistakes that keep recurring

- High contrast does not imply Serif. Look for actual serifs.
- `Rounded` is about terminals; an eccentric tail is `Curly`.
- A characterful face is not automatically Display — Strichpunkt was Display and
  belonged in Text, Abordage was Display and belonged in Brutal.
- Baskerville-like means `Transitional`, not `Modern`.
