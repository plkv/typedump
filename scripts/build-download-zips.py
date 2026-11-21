#!/usr/bin/env python3
"""Pack the zip that "Get font" downloads for every family served from here.

A family whose downloadLink is /downloads/<slug>.zip has no site of its own to
send people to (its upstream is only a repository, shown as an icon beside the
button, or gone). The zip holds what someone installing it needs: the original
files for the desktop, the woff2 files for the web, and the licence.

Runs after `next build` and writes straight into out/, so the zips are built
from the files in the repository and never committed twice. Standard library
only: the copyright notices stay in each font's own metadata, which the OFL
accepts in place of a separate notice.

    python3 scripts/build-download-zips.py
"""
import json
import os
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "public/fonts/fonts-data.json")
OUT = os.path.join(ROOT, "out")
OFL = open(os.path.join(ROOT, "scripts/assets/OFL-1.1.txt"), encoding="utf-8").read()


def licence_text(family):
    info = family.get("licenseInfo") or {}
    kind = info.get("type") or "See the designer's page"
    lines = [
        f"{family['name']}",
        f"Designed by {family.get('foundry', '').strip()}",
        f"Licence: {kind}" + (f" ({info['url']})" if info.get("url") else ""),
    ]
    if family.get("gitLink"):
        lines.append(f"Source: {family['gitLink']}")
    lines += ["", "Downloaded from typedump.com. The copyright notice of each font is in its own metadata.", ""]
    if kind.upper().startswith("OFL"):
        lines.append(OFL)
    return "\n".join(lines)


def main():
    families = json.load(open(DATA, encoding="utf-8"))["families"]
    os.makedirs(os.path.join(OUT, "downloads"), exist_ok=True)
    built = 0
    for family in families:
        link = family.get("downloadLink") or ""
        if not (link.startswith("/downloads/") and link.endswith(".zip")):
            continue
        folder = family["name"].replace("/", "-")
        path = os.path.join(OUT, link.lstrip("/"))
        with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
            for v in family["variants"]:
                desktop = v.get("originalUrl")
                if desktop and os.path.exists(os.path.join(ROOT, "public" + desktop)):
                    z.write(os.path.join(ROOT, "public" + desktop), f"{folder}/desktop/{os.path.basename(desktop)}")
                web = v.get("url") or ""
                if web.endswith((".woff2", ".woff")) and os.path.exists(os.path.join(ROOT, "public" + web)):
                    z.write(os.path.join(ROOT, "public" + web), f"{folder}/web/{os.path.basename(web)}")
            z.writestr(f"{folder}/LICENSE.txt", licence_text(family))
        built += 1
    print(f"built {built} download zips")


if __name__ == "__main__":
    main()
