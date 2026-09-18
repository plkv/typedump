#!/usr/bin/env python3
"""Checks that a feature's label names glyphs the feature actually changes.

A stylistic set's title is what the reader clicks. ZT Talk shipped with ss02
labelled "Alt g" while the feature substitutes a, f and the ampersand and
leaves g alone, because the label was written from a guess instead of from
the font. This reads the GSUB and compares.

    python3.13 scripts/check-feature-titles.py
"""
import json
import os
import re
import sys

from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "public/fonts/fonts-data.json")

# Glyph names a title's word may legitimately point at.
WORDS = {
    "zero": {"zero"},
    "numbers": {"zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"},
    "figures": {"zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"},
    "digits": {"zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"},
    "ampersand": {"ampersand"},
    "asterisk": {"asterisk"},
}


def inputs(font):
    """Every glyph each feature can take as input, by feature tag."""
    found = {}
    for table_tag in ("GSUB",):
        if table_tag not in font:
            continue
        table = font[table_tag].table
        if not table.FeatureList or not table.LookupList:
            continue
        lookups = table.LookupList.Lookup

        def walk(index, depth=0):
            out = set()
            if depth > 4 or index >= len(lookups):
                return out
            for sub in lookups[index].SubTable:
                for attr in ("mapping", "alternates", "ligatures"):
                    if hasattr(sub, attr):
                        out |= set(getattr(sub, attr))
                for attr in ("SubstLookupRecord", "ChainSubClassSet", "SubRuleSet"):
                    if hasattr(sub, attr):
                        for rec in getattr(sub, attr) or []:
                            for inner in getattr(rec, "SubstLookupRecord", []) or []:
                                out |= walk(inner.LookupListIndex, depth + 1)
                if hasattr(sub, "Coverage") and getattr(sub, "Coverage", None):
                    cov = sub.Coverage
                    if hasattr(cov, "glyphs"):
                        out |= set(cov.glyphs)
            return out

        for record in table.FeatureList.FeatureRecord:
            got = set()
            for index in record.Feature.LookupListIndex:
                got |= walk(index)
            found.setdefault(record.FeatureTag, set()).update(got)
    return found


def touches(glyphs, claimed):
    """True when the feature changes that glyph, an accented form of it, or a
    suffixed variant. Adieresis is an A; zero.tf is a zero."""
    for name in glyphs:
        base = name.split(".")[0]
        if base == claimed or base.startswith(claimed) and base[len(claimed):].isalpha():
            return True
    return False


def claims(title):
    """Glyph names the title promises to change."""
    wanted = set()
    # \w, not [A-Za-z]: splitting on ASCII alone cut "gótica" into "g" and
    # "tica" and read the g as a promise about the letter g. A single letter
    # counts only when it stands on its own, so "pa+f" claims nothing either.
    for word in re.findall(r"\w+", re.sub(r"['‘’]", " ", title), re.UNICODE):
        if len(word) == 1 and not re.search(rf"(?:^|\s){re.escape(word)}(?:\s|$)", title):
            continue
        low = word.lower()
        if low in WORDS:
            wanted |= WORDS[low]
        elif len(word) == 1 and word.isalpha():
            wanted.add(word)
    return wanted


SKIP = {"alt", "alts", "alternate", "alternates", "alternative", "stylistic", "set",
        "character", "variant", "lowercase", "uppercase", "single", "double", "storey",
        "with", "tail", "top", "serif", "no", "round", "rounded", "square", "wider",
        "slashed", "straight", "bar", "tabular", "dot", "dots", "sign", "registered",
        "inclusive", "and", "or", "the", "a", "i"}


def main():
    data = json.load(open(DATA, encoding="utf-8"))
    problems = []
    checked = 0
    for family in data["families"]:
        for variant in family.get("variants") or []:
            tags = variant.get("openTypeFeatureTags") or []
            if not tags:
                continue
            src = os.path.join(ROOT, "public" + (variant.get("originalUrl") or variant.get("url") or ""))
            if not os.path.exists(src):
                src = os.path.join(ROOT, "public" + (variant.get("url") or ""))
            if not os.path.exists(src):
                continue
            try:
                available = inputs(TTFont(src))
            except Exception:
                continue
            for entry in tags:
                tag, title = entry.get("tag"), entry.get("title") or ""
                if not tag or tag not in available:
                    continue
                # A title that is just the tag or a generic "Stylistic Set N"
                # promises nothing, so there is nothing to contradict.
                if re.fullmatch(r"(ss|cv)\d+|Stylistic Set \d+|Character Variant \d+|Alternates?", title.strip(), re.I):
                    continue
                checked += 1
                wanted = {g for g in claims(title) if g.lower() not in SKIP or len(g) == 1}
                wanted = {g for g in wanted if not (len(g) == 1 and g.lower() in ("a", "i") and f" {g} " not in f" {title} ")}
                if not wanted:
                    continue
                missing = sorted(g for g in wanted if not touches(available[tag], g))
                if missing and len(missing) == len(wanted):
                    got = sorted(x for x in available[tag] if len(x) <= 12)[:10]
                    problems.append((family["name"], tag, title, missing, got))

    if not problems:
        print(f"{checked} labelled features checked. Every label names a glyph its feature changes.")
        return 0
    print(f"{checked} labelled features checked, {len(problems)} whose label names nothing the feature touches:\n")
    for name, tag, title, missing, got in problems:
        print(f"  {name:<34} {tag}  {title!r}")
        print(f"  {'':<34} claims {', '.join(missing)} — actually changes {', '.join(got)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
