#!/usr/bin/env python3
"""Records each variable font's own named instances into fonts-data.json.

A variable font names the points on its axes that its designer considered
styles, and those names and values are the truth about what the family holds.
The site had been generating a 100-900 ladder instead and clipping it to the
axis range, which is right only when the font happens to use the common values.
Sunday Collaborative Alphabet runs its weight axis 10 to 200 and calls 200
"Black"; the ladder offered 100 and 200 and labelled them Thin and ExtraLight.

    python3.13 scripts/record-named-instances.py
"""
import json
import os
import sys

from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "public/fonts/fonts-data.json")


def instances(path):
    font = TTFont(path)
    if "fvar" not in font:
        return []
    names = font["name"]
    # Only instances that sit at the default of every axis but weight. Sprat
    # names eighteen: six weights across condensed, regular and extended. The
    # style list carries a weight and nothing else, so listing all eighteen
    # would offer "Condensed Thin" and quietly set the weight without touching
    # the width. The other widths are on the slider where they belong.
    defaults = {a.axisTag: a.defaultValue for a in font["fvar"].axes}
    out = []
    for inst in font["fvar"].instances:
        label = names.getDebugName(inst.subfamilyNameID)
        if not label:
            continue
        coords = inst.coordinates
        wght = coords.get("wght")
        if wght is None:
            continue
        italic = bool(coords.get("ital")) or bool(coords.get("slnt")) or "italic" in label.lower()
        off_axis = any(
            tag not in ("wght", "ital", "slnt") and abs(val - defaults.get(tag, val)) > 0.01
            for tag, val in coords.items()
        )
        if off_axis:
            continue
        out.append({"name": label.strip(), "weight": round(float(wght)), "isItalic": italic})
    return out


def main():
    data = json.load(open(DATA, encoding="utf-8"))
    touched = cleared = 0
    for family in data["families"]:
        for v in family.get("variants") or []:
            src = os.path.join(ROOT, "public" + (v.get("url") or ""))
            if not os.path.exists(src):
                continue
            try:
                found = instances(src)
            except Exception:
                found = []
            if found:
                v["namedInstances"] = found
                touched += 1
            elif "namedInstances" in v:
                v.pop("namedInstances")
                cleared += 1

    json.dump(data, open(DATA, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    open(DATA, "a").write("\n")
    print(f"{touched} variants carry named instances, {cleared} cleared.")


if __name__ == "__main__":
    sys.exit(main())
