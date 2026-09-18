#!/usr/bin/env python3
"""Unmaps characters whose glyph draws nothing, so the browser can fall back.

Sunday Masthead, LT Crewmate and Neo-castel all map U+2022 to an empty glyph.
A browser takes the cmap at its word: the font claims to cover the bullet, so
no fallback runs and the character simply vanishes from the line. Removing the
dead entry is the only way to get the fallback back — CSS has no way to say
"this glyph is blank".

Only the .woff2 files the site serves are touched. The .ttf/.otf behind the
download button stays exactly as its designer shipped it.

    python3.13 scripts/drop-blank-mappings.py
"""
import json
import os
import sys

from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "public/fonts/fonts-data.json")

# Only characters a reader meets without typing anything: the preset previews
# and the punctuation around them. Plenty of fonts map a control code or an
# unused letter to an empty glyph, and rewriting 271 files to tidy away what
# nobody can see would be churn, not a fix.
VISIBLE = set(
    "\u2022\u2013\u2014@&?;$\u20ac\u00a9\u00ae%*+=<>/\\|#^~\u2026\u2018\u2019\u201c\u201d\u00ab\u00bb\u00b0"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    "!(),.:'\"[]{}-_"
)


def blank_chars(font):
    cmap = font.getBestCmap()
    glyphs = font.getGlyphSet()
    out = {}
    for code, name in cmap.items():
        if chr(code) not in VISIBLE or name not in glyphs:
            continue
        pen = BoundsPen(glyphs)
        try:
            glyphs[name].draw(pen)
        except Exception:
            continue
        if pen.bounds is None:
            out[code] = name
    return out


def strip(path, dry_run):
    font = TTFont(path)
    dead = blank_chars(font)
    if not dead:
        return []
    for table in font["cmap"].tables:
        for code in dead:
            table.cmap.pop(code, None)
    if not dry_run:
        font.flavor = "woff2"
        font.save(path)
    return sorted(dead.items())


def main():
    dry_run = "--dry-run" in sys.argv
    data = json.load(open(DATA, encoding="utf-8"))
    touched = 0
    for family in data["families"]:
        for variant in family.get("variants") or []:
            for url in (variant.get("url"), variant.get("previewUrl")):
                path = os.path.join(ROOT, "public" + (url or ""))
                if not url or not url.endswith(".woff2") or not os.path.exists(path):
                    continue
                try:
                    dead = strip(path, dry_run)
                except Exception as exc:
                    print(f"  {family['name']}: {exc}")
                    continue
                if dead:
                    touched += 1
                    shown = ", ".join(f"U+{c:04X} {n}" for c, n in dead[:6])
                    print(f"  {family['name']:<30} {os.path.basename(path):<44} {shown}")
    print(f"\n{touched} served files had a character mapped to an empty glyph."
          + (" (dry run, nothing written)" if dry_run else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
