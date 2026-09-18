#!/usr/bin/env python3
"""Brings typedump-npm in step with the catalogue.

The npm package is what the MCP server reads, so a font that is on the site but
not in the package is invisible to every editor integration. The two had drifted
44 families apart before anyone noticed, because syncing them was a thing
somebody remembered to do by hand.

The package carries the full face as woff2 — not the cut preview the cards use,
because a consumer installing the package wants the whole font — so anything
missing is converted here from the original file.

    python3 scripts/sync-npm-mirror.py            # report and write
    python3 scripts/sync-npm-mirror.py --dry-run  # report only
"""
import json
import os
import shutil
import sys

from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE_DATA = os.path.join(ROOT, "public/fonts/fonts-data.json")
SITE_FONTS = os.path.join(ROOT, "public/fonts")
PKG = os.path.abspath(os.path.join(ROOT, "..", "typedump-npm"))
PKG_DATA = os.path.join(PKG, "data/fonts-data.json")
PKG_FONTS = os.path.join(PKG, "fonts")


def woff2_name(url):
    """The package's filename for a variant, whatever the site stores it as."""
    base = os.path.basename(url or "")
    if not base:
        return ""
    return os.path.splitext(base)[0] + ".woff2"


def ensure_woff2(src_url, dry_run):
    """Make sure the package has this face as woff2. Returns (name, action)."""
    name = woff2_name(src_url)
    if not name:
        return "", "no file"
    dest = os.path.join(PKG_FONTS, name)
    if os.path.exists(dest):
        return name, "already there"
    src = os.path.join(ROOT, "public" + src_url)
    if not os.path.exists(src):
        return name, "source missing"
    if dry_run:
        return name, "would convert"
    if src.lower().endswith(".woff2"):
        shutil.copyfile(src, dest)
        return name, "copied"
    font = TTFont(src)
    font.flavor = "woff2"
    font.save(dest)
    return name, "converted"


def main():
    dry_run = "--dry-run" in sys.argv
    if not os.path.isdir(PKG):
        print(f"No package at {PKG}")
        return 1

    site = json.load(open(SITE_DATA, encoding="utf-8"))
    # npmMirror: false keeps a font on the site but out of the package, for
    # licences that allow showing a face but not redistributing the file.
    families = [
        f
        for f in site["families"]
        if f.get("published", True) and f.get("npmMirror", True)
    ]

    out = []
    actions = {}
    missing = []

    for family in families:
        copy = json.loads(json.dumps(family))
        variants = []
        for v in copy.get("variants") or []:
            if v.get("published") is False:
                continue
            name, action = ensure_woff2(v.get("url"), dry_run)
            actions[action] = actions.get(action, 0) + 1
            if action == "source missing" or not name:
                missing.append(f"{family['name']} — {v.get('url')}")
                continue
            v["url"] = f"/fonts/{name}"
            v["format"] = "woff2"
            # The cut preview belongs to the cards, not to a package consumer.
            v.pop("previewUrl", None)
            variants.append(v)
        if not variants:
            continue
        copy["variants"] = variants
        out.append(copy)

    payload = {"families": out, "lastUpdated": site.get("lastUpdated")}
    before = len(json.load(open(PKG_DATA, encoding="utf-8"))["families"]) if os.path.exists(PKG_DATA) else 0

    if not dry_run:
        json.dump(payload, open(PKG_DATA, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        open(PKG_DATA, "a").write("\n")

    print(f"families {before} -> {len(out)}")
    print("font files: " + ", ".join(f"{v} {k}" for k, v in sorted(actions.items())))
    if missing:
        print(f"\n{len(missing)} variants had no source file and were dropped:")
        for m in missing[:10]:
            print(f"  {m}")
    if dry_run:
        print("\n(dry run, nothing written)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
