#!/usr/bin/env python3
"""Compares what the catalogue says about a font with what its file holds.

Jaro offered nine weights because the data said "variable" and the code assumed
that meant variable in weight; its only axis is optical size. That class of
mistake — the record promising something the file has not got — is invisible
until someone picks the control and nothing happens. So: open every font and
check the claims against the tables.

    python3 scripts/check-font-claims.py
    python3 scripts/check-font-claims.py --new-only
"""
import json
import os
import subprocess
import sys

from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "public/fonts/fonts-data.json")

# One codepoint that only that script uses, enough to tell coverage apart.
# The registered feature tags a specimen site can meaningfully offer. Anything
# outside this is a label or a named instance that ended up in the same list.
KNOWN_FEATURES = {
    "aalt", "calt", "case", "ccmp", "clig", "c2sc", "dlig", "dnom", "frac",
    "hist", "kern", "liga", "lnum", "locl", "mark", "mkmk", "numr", "onum",
    "ordn", "pnum", "rlig", "salt", "sinf", "smcp", "subs", "sups", "swsh",
    "titl", "tnum", "zero", "afrc", "nalt", "unic",
}

SCRIPT_PROBE = {
    "Cyrillic": 0x0416,   # Ж
    # Γ, not Ω: U+03A9 turns up in fonts that carry no Greek at all, because
    # it doubles as the ohm sign. Special Gothic has it and 43 of the 48 Greek
    # letters missing.
    "Greek": 0x0393,      # Γ
    "Vietnamese": 0x1EA1, # ạ
    "Arabic": 0x0627,     # ا
    "Hebrew": 0x05D0,     # א
    "Chinese": 0x4E2D,    # 中
    "Japanese": 0x3042,   # あ
    "Korean": 0xAC00,     # 가
    "Latin": 0x0041,      # A
}


def read(path):
    font = TTFont(path)
    axes = {}
    if "fvar" in font:
        for a in font["fvar"].axes:
            axes[a.axisTag] = (a.minValue, a.maxValue, a.defaultValue)
    features = set()
    for table in ("GSUB", "GPOS"):
        if table in font and font[table].table.FeatureList:
            for rec in font[table].table.FeatureList.FeatureRecord:
                features.add(rec.FeatureTag)
    covered = set()
    for t in font["cmap"].tables:
        covered |= set(t.cmap)
    italic = bool(font["post"].italicAngle) if "post" in font else False
    return axes, features, covered, italic


def main():
    data = json.load(open(DATA, encoding="utf-8"))
    families = data["families"]
    if "--new-only" in sys.argv:
        try:
            base = json.loads(subprocess.run(
                ["git", "show", "origin/main:public/fonts/fonts-data.json"],
                cwd=ROOT, capture_output=True, text=True, check=True).stdout)
            known = {f["name"] for f in base["families"]}
            families = [f for f in families if f["name"] not in known]
        except Exception:
            pass

    problems = {}

    def note(name, text):
        problems.setdefault(name, []).append(text)

    for family in families:
        variants = family.get("variants") or []
        for v in variants:
            src = os.path.join(ROOT, "public" + (v.get("url") or ""))
            if not os.path.exists(src):
                continue
            try:
                axes, features, covered, italic_file = read(src)
            except Exception as exc:
                note(family["name"], f"file will not parse: {str(exc)[:50]}")
                continue

            label = v.get("styleName") or v.get("filename") or "?"

            # An axis whose ends meet — Aboreto's wght runs 400 to 400 — is a
            # variable font in name only, and recording it as static is the
            # honest description, so it is not worth a complaint.
            real_axes = {t: r for t, r in axes.items() if r[0] != r[1]}

            # Axes the record claims
            declared = {}
            for a in v.get("variableAxes") or []:
                tag = a.get("tag") or a.get("axis")
                if tag:
                    declared[tag] = (a.get("min"), a.get("max"), a.get("default"))
            for tag, (lo, hi, dflt) in declared.items():
                if tag not in axes:
                    note(family["name"], f"{label}: claims axis {tag}, the file has none")
                    continue
                flo, fhi, fdf = axes[tag]
                if lo is not None and abs(float(lo) - flo) > 0.5 or hi is not None and abs(float(hi) - fhi) > 0.5:
                    note(family["name"], f"{label}: axis {tag} declared {lo}–{hi}, file says {flo:g}–{fhi:g}")
            for tag in real_axes:
                if tag not in declared:
                    note(family["name"], f"{label}: file has axis {tag}, the record does not list it")

            if v.get("isVariable") and not real_axes:
                note(family["name"], f"{label}: marked variable, the file has no axis that moves")
            if real_axes and not v.get("isVariable"):
                note(family["name"], f"{label}: file is variable, the record says it is not")

            # OpenType features the record claims. Only real four-letter tags:
            # openTypeFeatures also carries human names ("Kerning", "Standard
            # Ligatures") which are labels for the same thing, not tags, and
            # comparing those against the tables reports every font as broken.
            claimed = set()
            for t in (v.get("openTypeFeatures") or []) + (v.get("openTypeFeatureTags") or []):
                tag = t.get("tag") if isinstance(t, dict) else t
                if not isinstance(tag, str):
                    continue
                tag = tag.strip().lower()
                # Named instances leak into this list too — "Bold", "Thin",
                # "12pt", "Airy" are four characters and alphanumeric but are
                # not features. Only names from the registered set count.
                if tag in KNOWN_FEATURES or (len(tag) == 4 and tag[:2] in ("ss", "cv") and tag[2:].isdigit()):
                    claimed.add(tag)
            absent = sorted(claimed - {f.lower() for f in features})
            if absent:
                note(family["name"], f"{label}: claims features the file lacks: {', '.join(absent[:6])}")

            # Not judged by post.italicAngle: plenty of genuine italics ship
            # with it left at 0, and six families here were flagged whose
            # italics are separate, properly drawn files. The thing worth
            # catching is an italic pointing at the same file as the upright.
            if v.get("isItalic"):
                twin = next((o for o in variants
                             if not o.get("isItalic") and o.get("url") == v.get("url")), None)
                if twin:
                    note(family["name"], f"{label}: same file as {twin.get('styleName')}, so not a separate italic")

        # Scripts the family claims, judged on its default variant
        default = next((v for v in variants if v.get("isDefaultStyle")), variants[0] if variants else None)
        src = os.path.join(ROOT, "public" + (default or {}).get("url", "")) if default else ""
        if src and os.path.exists(src):
            try:
                _, _, covered, _ = read(src)
                for lang in family.get("languages") or []:
                    probe = SCRIPT_PROBE.get(lang)
                    if probe and probe not in covered:
                        note(family["name"], f"claims {lang}, no glyph for {chr(probe)}")
            except Exception:
                pass

    print(f"{len(families)} families checked, {len(problems)} with something to look at.\n")
    for name in sorted(problems):
        print(f"  {name}")
        for t in problems[name][:6]:
            print(f"    - {t}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
