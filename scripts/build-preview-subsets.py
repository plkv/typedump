#!/usr/bin/env python3
"""Build the small font files the catalogue cards use at rest.

A card sitting in the list shows one line of Latin in one instance. It was
downloading the whole family instead — every glyph of every script, and the
entire variable axis space. Measured across the catalogue that is 16.4MB, with
122 of the 207 requests taking over a second and the worst at 8.7s, which is
why cards sat grey while scrolling.

Keeping only the characters a preview can actually display brings the same 207
files to 7.6MB, and removes the long tail outright: Pretendard 2009KB -> 51KB
(it carries Korean), Dela Gothic One 1157KB -> 16KB (Japanese), Bagel Fat One
431KB -> 15KB. Faces that are genuinely heavy to draw — Crédible, Comico —
barely move, which is correct.

The full file is still shipped: it is what the download link serves, and what
the detail page uses.

Run locally and commit the output; the deploy host has no fontTools.

    python3 scripts/build-preview-subsets.py
"""
import datetime
import io
import json
import os
import sys

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "public/fonts/fonts-data.json")
OUT_DIR = os.path.join(ROOT, "public/fonts/preview")

# Everything a preview can show without the reader typing: the presets, every
# letter used by a font NAME in the catalogue, and the Latin blocks around them
# so an accented name never falls back mid-word.
PRESET_CHARS = (
    'RKFJIGCQ aueoyrgsltf 0123469 ≪"(@&?;€$© ->…'
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    '!@#$%^&*()_+-=[]{}|;\':",./<>?'
    'Balenciaga Our Legacy Acne Studios Demna XXL AAPL ETH EUR USD IPO ETF '
    'CAGR ROI KPIs TAM CAC LTV SaaS 45° +5.6% $212.45'
    'Maison Margiela Off-White Y/Project Rimowa A-Cold-Wall* Figma Byredo '
    'Arc’teryx Aimé Leon Dore Notion OpenAI SpaceX Klarna •—’“”'
)

# Alternates the "Alternates" preset shows without expanding a card. Keeping
# them costs little and losing them would silently empty that preset.
KEEP_FEATURES = [
    "kern", "liga", "calt", "salt", "ccmp", "locl",
    *[f"ss{n:02d}" for n in range(1, 21)],
    *[f"cv{n:02d}" for n in range(1, 21)],
]


# Scripts a reader can type into a preview, and which cost almost nothing to
# keep. The catalogue advertises this coverage and filters by it, so cutting it
# would leave someone filtering to "Cyrillic" and then typing into a fallback.
SCRIPT_RANGES = {
    "Cyrillic": [(0x0400, 0x04FF)],
    "Greek": [(0x0370, 0x03FF)],
    "Vietnamese": [(0x1EA0, 0x1EF9), (0x0300, 0x0341)],
}
# Deliberately NOT kept: Korean, Japanese, Chinese, Arabic, Hebrew. Those are
# where the weight actually was — Pretendard's Korean is 2MB of the 2.01MB file
# — and a Latin card preview never shows them. Five families are affected; they
# still ship the full font for the download link and the detail page.


def preview_charset(families):
    """Characters every preview needs, whatever the font."""
    chars = set(PRESET_CHARS)
    chars.update("".join(f["name"] for f in families))
    chars.update(chr(c) for c in range(0x20, 0x7F))    # ASCII
    chars.update(chr(c) for c in range(0xA0, 0x180))   # Latin-1 + Extended-A
    return "".join(sorted(chars))


def charset_for(family, base):
    """The base set plus the scripts this particular family claims to cover."""
    chars = set(base)
    for language in family.get("languages") or []:
        for start, end in SCRIPT_RANGES.get(language, []):
            chars.update(chr(c) for c in range(start, end + 1))
    return "".join(sorted(chars))


def default_variant(family):
    variants = family.get("variants") or []
    return next((v for v in variants if v.get("isDefaultStyle")), None) or (
        variants[0] if variants else None
    )


def build(font_path, text):
    """Cut the glyphs, keep the axes.

    Pinning each font to its default instance is far smaller again — 3.6MB
    against 7.6 — but then the card needs the full file back the moment anyone
    touches a weight slider, and swapping a face under a live alias is not
    something CSS guarantees. Keeping the axis space means one file serves both
    the resting card and every control on it, with nothing to swap and nothing
    to get wrong. The pathological files were never the axes anyway: they were
    Korean and Japanese glyph sets nobody sees in a Latin preview.
    """
    font = TTFont(font_path)
    opts = Options()
    opts.layout_features = KEEP_FEATURES
    opts.hinting = False
    opts.desubroutinize = True
    opts.name_IDs = [1, 2]
    opts.notdef_outline = False
    subsetter = Subsetter(options=opts)
    subsetter.populate(text=text)
    subsetter.subset(font)
    buf = io.BytesIO()
    font.flavor = "woff2"
    font.save(buf)
    return buf.getvalue()


def main():
    data = json.load(open(DATA, encoding="utf-8"))
    families = data["families"] if isinstance(data, dict) else data
    text = preview_charset(families)
    os.makedirs(OUT_DIR, exist_ok=True)

    built = skipped = 0
    before = after = 0
    failures = []

    for family in families:
        variant = default_variant(family)
        if not variant:
            continue
        src_url = variant.get("url") or ""
        src = os.path.join(ROOT, "public" + src_url)
        if not src_url.startswith("/fonts/") or not os.path.exists(src):
            skipped += 1
            continue
        name = os.path.basename(src_url)
        out = os.path.join(OUT_DIR, name)
        try:
            payload = build(src, charset_for(family, text))
        except Exception as exc:  # a font we cannot cut still works at full size
            failures.append((family["name"], str(exc)[:60]))
            variant.pop("previewUrl", None)
            continue
        # Only worth a second file if it is meaningfully smaller.
        original = os.path.getsize(src)
        if len(payload) >= original * 0.9:
            variant.pop("previewUrl", None)
            skipped += 1
            continue
        with open(out, "wb") as fh:
            fh.write(payload)
        variant["previewUrl"] = f"/fonts/preview/{name}"
        before += original
        after += len(payload)
        built += 1

    # The catalogue links its stylesheet as fonts.css?v=<lastUpdated>, so a new
    # set of preview files has to move that stamp or browsers keep the old sheet
    # pointing at the full fonts — which is exactly what happened the first time.
    if isinstance(data, dict):
        data["lastUpdated"] = datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")

    json.dump(data, open(DATA, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    open(DATA, "a").write("\n")

    print(f"built {built} preview files, skipped {skipped}")
    print(f"  {before / 1048576:.1f}MB of originals -> {after / 1048576:.2f}MB of previews")
    if failures:
        print(f"  {len(failures)} could not be cut (they keep using the full file):")
        for name, err in failures[:8]:
            print(f"    {name}: {err}")


if __name__ == "__main__":
    sys.exit(main())
