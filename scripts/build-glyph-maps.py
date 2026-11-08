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
import re
import unicodedata

from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "public/fonts/fonts-data.json")
OUT_DIR = os.path.join(ROOT, "public/glyphs")

# Letters are grouped by script and case ("Latin uppercase", "Cyrillic
# lowercase"), scripts in this order and any others after them as they occur;
# everything that is not a letter falls into the kinds below, after the
# letters. The script is read from the character's Unicode name (script_of).
SCRIPT_ORDER = ["Latin", "Cyrillic", "Greek"]
SCRIPT_NAMES = {"HANGUL": "Korean", "CJK": "Chinese", "HIRAGANA": "Japanese", "KATAKANA": "Japanese"}
KINDS = ["Figures", "Punctuation", "Currency", "Symbols"]
CASE = {"Lu": "uppercase", "Lt": "uppercase", "Ll": "lowercase"}


def group_of(ch):
    cat = unicodedata.category(ch)
    if cat.startswith("N"):
        return "Figures"
    if cat.startswith("P"):
        return "Punctuation"
    if cat == "Sc":
        return "Currency"
    if cat.startswith("S"):
        return "Symbols"
    if cat.startswith(("C", "Z", "M")):
        return None  # controls, spaces and lone combining marks show as nothing
    script = script_of(unicodedata.name(ch, ""))
    if not script:
        return "Symbols"  # letter-like signs with no script: ª º Ω ℓ, modifiers
    return f"{script} {CASE[cat]}" if cat in CASE else script


def script_of(name):
    """'LATIN SMALL LETTER A' -> Latin, 'FULLWIDTH LATIN CAPITAL LETTER A' ->
    Latin, 'HANGUL SYLLABLE GA' -> Korean; None for 'OHM SIGN'."""
    m = re.match(r"^(.*?)\s*(?:CAPITAL |SMALL )?(?:LETTER|LIGATURE|SYLLABLE|IDEOGRAPH|CHARACTER)\b", name)
    if not m:
        return None
    head = re.sub(r"\b(FULLWIDTH|HALFWIDTH|MODIFIER|SUBSCRIPT|SUPERSCRIPT|TURNED|REVERSED|OLD)\b", "", m.group(1)).split()
    if not head:
        return None
    for word in head:
        if word in SCRIPT_NAMES:
            return SCRIPT_NAMES[word]
    return head[0].title()


def order_key(group, first_seen):
    if group in KINDS:
        return (2, KINDS.index(group))
    script, _, case = group.partition(" ")
    rank = SCRIPT_ORDER.index(script) if script in SCRIPT_ORDER else len(SCRIPT_ORDER) + first_seen[script]
    return (1, rank, {"uppercase": 0, "lowercase": 1}.get(case, 2))


def glyph_map(path):
    font = TTFont(path)
    cmap = font.getBestCmap()
    glyphs = font.getGlyphSet()
    groups, first_seen = {}, {}
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
        groups.setdefault(group, []).append(ch)
        first_seen.setdefault(group.partition(" ")[0], len(first_seen))
    return [[g, "".join(groups[g])] for g in sorted(groups, key=lambda g: order_key(g, first_seen))]


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
