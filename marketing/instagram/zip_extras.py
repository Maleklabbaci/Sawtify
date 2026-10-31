#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
zip_extras.py — empaquette les déclinaisons 1:1 et 9:16 d'un carrousel
dans slides/<slug>/extras-1x1-et-9x16.zip (même nom que dans Drive).

    python3 zip_extras.py 03 07 11
    python3 zip_extras.py --all
"""
from __future__ import annotations

import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SLIDES = ROOT / "slides"

NOTE = """SAWTIFY — déclinaisons Instagram
────────────────────────────────────────────
1x1/   1080×1080  → post carré (feed)
9x16/  1080×1920  → story / reel (slide 4:5 posée sur fond de marque)

Les slides principales (4:5, 1080×1350) sont les fichiers 01.png … NN.png
à la racine du dossier Drive du jour : c'est ce format qu'il faut publier
pour un carrousel Instagram classique.

sawtify.space
"""


def build(slug_dir: Path) -> Path | None:
    square = sorted(p for p in (slug_dir / "square").glob("[0-9][0-9].png"))
    story = sorted(p for p in (slug_dir / "story").glob("[0-9][0-9].png"))
    if not square and not story:
        return None
    out = slug_dir / "extras-1x1-et-9x16.zip"
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("LIRE-MOI.txt", NOTE)
        for p in square:
            z.write(p, f"1x1/{p.name}")
        for p in story:
            z.write(p, f"9x16/{p.name}")
    print(f"  ✓ {out.relative_to(ROOT)} ({out.stat().st_size/1e6:.1f} Mo, "
          f"{len(square)}+{len(story)} images)")
    return out


def main() -> int:
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 1
    if args == ["--all"]:
        targets = [d for d in sorted(SLIDES.iterdir())
                   if d.is_dir() and (d / "square").exists()]
    else:
        targets = []
        for a in args:
            m = [d for d in sorted(SLIDES.iterdir())
                 if d.is_dir() and d.name.startswith(a.zfill(2))]
            targets.extend(m)
    for d in targets:
        print(f"▶ {d.name}")
        build(d)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
