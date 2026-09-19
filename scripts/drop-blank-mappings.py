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
    # Letters of the scripts a reader can type into a preview. THICCCBOI maps
    # all 66 Cyrillic letters and draws 17 of them, so typing Russian into its
    # card produced a line of nothing at all rather than a fallback.
    "\u0430\u0431\u0432\u0433\u0434\u0435\u0451\u0436\u0437\u0438\u0439\u043a\u043b\u043c\u043d\u043e"
    "\u043f\u0440\u0441\u0442\u0443\u0444\u0445\u0446\u0447\u0448\u0449\u044a\u044b\u044c\u044d\u044e\u044f"
    "\u0410\u0411\u0412\u0413\u0414\u0415\u0401\u0416\u0417\u0418\u0419\u041a\u041b\u041c\u041d\u041e"
    "\u041f\u0420\u0421\u0422\u0423\u0424\u0425\u0426\u0427\u0428\u0429\u042a\u042b\u042c\u042d\u042e\u042f"
    "\u03b1\u03b2\u03b3\u03b4\u03b5\u03b6\u03b7\u03b8\u03b9\u03ba\u03bb\u03bc\u03bd\u03be\u03bf\u03c0"
    "\u03c1\u03c3\u03c4\u03c5\u03c6\u03c7\u03c8\u03c9"
    "\u0391\u0392\u0393\u0394\u0395\u0396\u0397\u0398\u0399\u039a\u039b\u039c\u039d\u039e\u039f\u03a0"
    "\u03a1\u03a3\u03a4\u03a5\u03a6\u03a7\u03a8\u03a9"
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
