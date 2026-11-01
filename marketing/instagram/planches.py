"""Planches de contrôle : une par carrousel + une vue d'ensemble des 30 couvertures.

    python3 planches.py            # tout
    python3 planches.py --only workshop-07

planche.jpg        = les slides du carrousel côte à côte (340 × 425 par slide)
planche-30-…jpg    = les 30 couvertures en grille 5 × 6
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
OUT = HERE / "slides" / "carousel"
TW, TH = 340, 425           # vignette d'une slide
GAP, PAD = 12, 16


def _vignettes(folder: Path) -> list[Image.Image]:
    files = sorted(p for p in folder.glob("*.jpg") if p.name != "planche.jpg")
    return [Image.open(p).convert("RGB").resize((TW, TH), Image.LANCZOS) for p in files]


def planche(folder: Path) -> Path:
    vig = _vignettes(folder)
    if not vig:
        raise SystemExit(f"aucune slide dans {folder}")
    w = PAD * 2 + len(vig) * TW + (len(vig) - 1) * GAP
    h = PAD * 2 + TH
    sheet = Image.new("RGB", (w, h), (250, 249, 255))
    x = PAD
    for v in vig:
        sheet.paste(v, (x, PAD))
        x += TW + GAP
    out = folder / "planche.jpg"
    sheet.save(out, quality=92, optimize=True)
    return out


def overview() -> Path:
    folders = sorted(d for d in OUT.iterdir() if d.is_dir())
    cols, rows = 5, 6
    cw, ch = 216, 270                    # vignette couverture de la planche générale
    w = PAD * 2 + cols * cw + (cols - 1) * GAP
    h = PAD * 2 + rows * ch + (rows - 1) * GAP
    sheet = Image.new("RGB", (w, h), (26, 15, 46))
    draw = ImageDraw.Draw(sheet)
    for idx, folder in enumerate(folders):
        first = folder / "01.jpg"
        if not first.exists():
            continue
        v = Image.open(first).convert("RGB").resize((cw, ch), Image.LANCZOS)
        r, c = divmod(idx, cols)
        sheet.paste(v, (PAD + c * (cw + GAP), PAD + r * (ch + GAP)))
    out = OUT / "planche-30-couvertures.jpg"
    sheet.save(out, quality=92, optimize=True)
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default=None)
    a = ap.parse_args()
    for folder in sorted(d for d in OUT.iterdir() if d.is_dir()):
        if a.only and a.only not in folder.name:
            continue
        print("✓", planche(folder).name, folder.name)
    if not a.only:
        print("✓", overview().name)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
