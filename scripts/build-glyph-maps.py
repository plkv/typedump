#!/usr/bin/env python3
"""Write each family's glyph map for the character set on its font page.

Reads the default style's original file, keeps every mapped character the
font actually draws (an empty outline in the cmap is a promise, not a glyph;
see check-languages.py), groups them by Unicode category and writes
public/glyphs/<file stem>.json. Not under /fonts/: that path is cached for a
year, and a map has to change when a file does.

Run locally and commit the output, like the preview subsets.

    python3 scripts/build-glyph-maps.py
"""
import json
import os
import unicodedata

from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "public/fonts/fonts-data.json")
OUT_DIR = os.path.join(ROOT, "public/glyphs")

# Unicode general category -> the group the page shows it under, in page order.
GROUPS = ["Uppercase", "Lowercase", "Figures", "Punctuation", "Currency", "Symbols", "Other"]
CATEGORY = {
    "Lu": "Uppercase", "Lt": "Uppercase",
    "Ll": "Lowercase",
    "Nd": "Figures", "No": "Figures", "Nl": "Figures",
    "Sc": "Currency",
    "Sm": "Symbols", "So": "Symbols", "Sk": "Symbols",
}


def group_of(ch):
    cat = unicodedata.category(ch)
    if cat in CATEGORY:
        return CATEGORY[cat]
    if cat.startswith("P"):
        return "Punctuation"
    if cat.startswith(("C", "Z", "M")):
        return None  # controls, spaces and lone combining marks show as nothing
    return "Other"


def glyph_map(path):
    font = TTFont(path)
    cmap = font.getBestCmap()
    glyphs = font.getGlyphSet()
    groups = {g: [] for g in GROUPS}
    for cp in sorted(cmap):
        ch = chr(cp)
        group = group_of(ch)
        name = cmap[cp]
        if not group or name not in glyphs:
            continue
        pen = BoundsPen(glyphs)
        try:
            glyphs[name].draw(pen)
        except Exception:
            continue
        if pen.bounds is None:
            continue
        groups[group].append(ch)
    return [[g, "".join(chars)] for g, chars in groups.items() if chars]


def default_variant(family):
    variants = family.get("variants") or []
    return next((v for v in variants if v.get("isDefaultStyle")), variants[0] if variants else None)


def main():
    families = json.load(open(DATA, encoding="utf-8"))["families"]
    os.makedirs(OUT_DIR, exist_ok=True)
    written = failed = 0
    for family in families:
        v = default_variant(family)
        if not v:
            continue
        src = os.path.join(ROOT, "public" + (v.get("originalUrl") or v.get("url") or ""))
        if not os.path.exists(src):
            src = os.path.join(ROOT, "public" + (v.get("url") or ""))
        if not os.path.exists(src):
            continue
        stem = os.path.splitext(v["filename"])[0]
        try:
            groups = glyph_map(src)
        except Exception as e:
            failed += 1
            print(f"  {family['name']}: {str(e)[:60]}")
            continue
        with open(os.path.join(OUT_DIR, stem + ".json"), "w", encoding="utf-8") as fh:
            json.dump(groups, fh, ensure_ascii=False, separators=(",", ":"))
        written += 1
    print(f"wrote {written} glyph maps, {failed} failed")


if __name__ == "__main__":
    main()
