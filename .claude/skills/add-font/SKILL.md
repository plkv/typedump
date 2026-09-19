---
name: add-font
description: Add a typeface to the TypeDump catalogue, or check one that is already in it — file preparation, the fonts-data.json record, tagging, description, alternatives, the npm/MCP mirror, and the checks to run before publishing. Use whenever a font is being added, a batch is being reviewed, or tags, descriptions, downloadLink or alternativeTo are being written or corrected.
---

# Adding a font to TypeDump

The catalogue is one file: `public/fonts/fonts-data.json`. Everything else — the
site, the stylesheet, the npm package, `llms.txt` — is generated from it. Get the
record right and the rest follows.

## 1. Prepare the file

Take the **upstream variable file** where one exists, not a static instance and
not the Google Fonts copy. Convert to woff2:

```bash
python3 -c "from fontTools.ttLib import TTFont; f=TTFont('IN.ttf'); f.flavor='woff2'; f.save('public/fonts/OUT.woff2')"
```

Keep the original `.ttf`/`.otf` next to it — the download link and the detail
page use it.

## 2. Write the record

Copy the shape of an existing entry (Geist is the cleanest) rather than
inventing fields. Required: `name`, `collection`, `category`, `styleTags`,
`languages`, `downloadLink`, `variants[]`. Each variant needs `filename`, `url`,
`weight`, `styleName`, `isItalic`, `isDefaultStyle` on exactly one of them.

**`downloadLink` is the upstream repository or the project's own site** — from
`repository_url` / `minisite_url` in METADATA.pb when the font comes from Google
Fonts. Never a Google Fonts URL.

## 3. Tag it

Read `taxonomy.md` next to this file. It carries the definitions; they are not
guessable from the tag names.

Tag by **looking at the letterforms**, never from the name, the foundry blurb or
a general impression. Render a specimen first:

```bash
python3 -c "
from PIL import Image, ImageDraw, ImageFont
img=Image.new('RGB',(1400,140),'white'); d=ImageDraw.Draw(img)
d.text((14,20),'Hamburgefonstiv 123',font=ImageFont.truetype('FILE.ttf',64),fill='black')
img.save('/tmp/spec.png')"
```

Then read the diagnostic glyphs: the axis of the `o`, the contrast, the serif
shape, the stroke terminals. The recurring mistakes are all "did not actually
look": high contrast is not a serif, a soft look is not Rounded, a characterful
face is not automatically Display.

## 4. Description

One paragraph, plain, in the voice of someone who has used the font. Say what it
is for and what is unusual about it — variable axes, alternates, scripts, an
optical size. No marketing, no em-dashes, no slogans.

## 5. Alternatives (`alternativeTo`)

Only fill this in when the font is a credible substitute for a face people
actually search for:

```json
"alternativeTo": [{ "name": "Söhne", "foundry": "Klim", "motive": "paid", "gets": "wght 100–900, Cyrillic" }]
```

- `motive` is `"paid"` (the original costs money) or `"original"` (the original
  is everywhere and the reader wants something less worn out).
- **Every claim needs a source.** A resemblance you assert from memory is not
  one. Check it against the foundry's own page or a documented lineage.
- **Never map one unknown free font to another unknown free font.** The point is
  discoverability: the target has to be a name people type.
- A clone is fine. The value is that the free one may do something better —
  more weights, more scripts, real italics — and `gets` is where that goes.

Generated from this field: the page title, the meta description, the sentence
under About, and both `llms.txt` files. Nothing is written by hand in those.

## 6. Regenerate

```bash
node scripts/generate-font-css.mjs        # public/fonts/fonts.css
python3.13 scripts/build-preview-subsets.py  # cut previews + bumps lastUpdated
```

`lastUpdated` is the cache key for `fonts.css?v=`. If the subsets script does not
run, browsers keep the old stylesheet and point at the old files.

## 7. Mirror to npm (MCP)

```bash
python3.13 scripts/sync-npm-mirror.py --dry-run   # what would change
python3.13 scripts/sync-npm-mirror.py             # do it
```

The package is what the MCP server reads, so a font that is on the site and not
in the package is invisible to every editor integration. The two drifted 44
families apart once because syncing them was something to remember rather than
run. The package carries the full face as woff2, not the cut preview the cards
use — someone installing it wants the whole font.

Then, in `typedump-npm`: bump the version (`npm version <x.y.z>
--no-git-tag-version`, no tag — the package has no git of its own), `npm run
build`, and `npm publish`. Publishing is Stas's, and only when asked.

## 8. Check before publishing

```bash
node scripts/check-taxonomy.mjs
python3.13 scripts/check-glyphs.py
python3.13 scripts/check-font-claims.py
python3.13 scripts/check-feature-titles.py
python3.13 scripts/check-languages.py
python3.13 scripts/drop-blank-mappings.py --dry-run
```

`python3.13`, not `python3`: Homebrew moved the default to 3.14 and fontTools is
installed under 3.13, so the bare name now finds an interpreter without it.

They report unknown tags, serifs missing their mandatory class, `Modern` on a
non-serif, `Pixel` outside Display/Brutal, missing categories, empty
`downloadLink`, files referenced but absent, and fonts with no lowercase or no
digits — the last one matters because the card's default preview is the font's
own name.

`check-feature-titles.py` reads the GSUB and checks that a stylistic set's
label names a glyph the feature actually substitutes. ZT Talk shipped with
ss02 labelled "Alt g" while the feature changes a, f and the ampersand,
because the label was a guess. Never write one without looking.

`check-languages.py` compares the language tags with the glyphs the font
actually draws, both ways. Spectral carried a full Cyrillic and said Latin
only, so nobody filtering for Cyrillic ever saw it; THICCCBOI said Cyrillic
and maps all 66 letters while 49 of them are empty. Never take the cmap's
word for coverage.

`drop-blank-mappings.py` finds characters mapped to an empty glyph. A browser
believes the cmap, so it runs no fallback and the character vanishes from the
line — Sunday Masthead swallowed every bullet in the Brands preset that way.
Run it without `--dry-run` to unmap them; it edits only the served `.woff2`,
never the original behind the download button.

Then: build, look at the cards, and only then commit.
