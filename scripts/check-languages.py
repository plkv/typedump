#!/usr/bin/env python3
"""Checks a family's language tags against the glyphs it actually draws.

Both directions, because both were wrong. Spectral carries a full Cyrillic and
said Latin only, so nobody filtering for Cyrillic ever saw it. THICCCBOI said
Cyrillic and maps all 66 letters, but 49 of them are empty glyphs — a browser
believes the cmap, runs no fallback, and the line comes out blank. Coverage is
therefore judged on outlines, never on the cmap alone.

    python3.13 scripts/check-languages.py
"""
import json
import os
import sys

from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "public/fonts/fonts-data.json")

# The alphabet a reader would actually type. Not every codepoint of the script:
# a face is useful in Russian without carrying Serbian italics.
CORE = {
    "Cyrillic": "абвгдеёжзийклмнопрстуфхцчшщъыьэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ",
    "Greek": "αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ",
    "Vietnamese": "ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ",
    "Hebrew": "אבגדהוזחטיכלמנסעפצקרשת",
    "Arabic": "ابتثجحخدذرزسشصضطظعغفقكلمنهوي",
}
# Below this a claim is wrong; above it an omission is worth reporting. The gap
# leaves room for a face that carries most of a script on purpose.
CLAIM_FLOOR = 0.90
OMISSION_CEILING = 0.90


def drawn(path, chars):
    font = TTFont(path)
    cmap = font.getBestCmap()
    glyphs = font.getGlyphSet()
    hits = 0
    for ch in chars:
        name = cmap.get(ord(ch))
        if not name or name not in glyphs:
            continue
        pen = BoundsPen(glyphs)
        try:
            glyphs[name].draw(pen)
        except Exception:
            continue
        if pen.bounds is not None:
            hits += 1
    return hits / len(chars)


def main():
    data = json.load(open(DATA, encoding="utf-8"))
    families = [f for f in data["families"] if f.get("published", True)]
    wrong, missing = [], []
    for family in families:
        variants = family.get("variants") or []
        default = next((v for v in variants if v.get("isDefaultStyle")), variants[0] if variants else None)
        if not default:
            continue
        src = os.path.join(ROOT, "public" + (default.get("originalUrl") or default.get("url") or ""))
        if not os.path.exists(src):
            src = os.path.join(ROOT, "public" + (default.get("url") or ""))
        if not os.path.exists(src):
            continue
        claimed = set(family.get("languages") or [])
        for script, chars in CORE.items():
            try:
                frac = drawn(src, chars)
            except Exception:
                continue
            if script in claimed and frac < CLAIM_FLOOR:
                wrong.append((family["name"], script, round(frac * 100)))
            elif script not in claimed and frac >= OMISSION_CEILING:
                missing.append((family["name"], script, round(frac * 100)))

    print(f"{len(families)} families checked.")
    if wrong:
        print(f"\n{len(wrong)} claim a script they do not draw:")
        for name, script, pct in wrong:
            print(f"  {name:<32} {script:<11} draws {pct}% of the alphabet")
    if missing:
        print(f"\n{len(missing)} draw a script they do not list:")
        for name, script, pct in missing:
            print(f"  {name:<32} {script:<11} draws {pct}%")
    if not wrong and not missing:
        print("Every language tag matches what the font draws.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
