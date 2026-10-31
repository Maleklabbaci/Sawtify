#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
───────────────────────────────────────────────────────────────────────────
 apercu_jours.py — planche des 30 couvertures (1 par jour du calendrier)
───────────────────────────────────────────────────────────────────────────
   python3 apercu_jours.py            # lit PLAN-PUBLICATION.csv
   python3 apercu_jours.py --out ma-planche.png
───────────────────────────────────────────────────────────────────────────
"""
from __future__ import annotations

import argparse
import csv
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
SLIDES = ROOT / "slides"

COLS = 6
TW, TH = 252, 315
GAP = 14
PAD = 34
LABEL = 40
HEADER = 132


def load_font(size: int, bold: bool = True):
    name = "SpaceGrotesk-Bold.ttf" if bold else "SpaceGrotesk-Medium.ttf"
    p = ROOT / "fonts" / name
    if p.exists():
        return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="apercu-30-jours.png")
    args = ap.parse_args()

    rows = list(csv.DictReader(open(SLIDES / "PLAN-PUBLICATION.csv", encoding="utf-8")))
    n = len(rows)
    rows_n = (n + COLS - 1) // COLS
    Wt = PAD * 2 + COLS * TW + (COLS - 1) * GAP
    Ht = HEADER + PAD + rows_n * (TH + LABEL) + PAD

    sheet = Image.new("RGB", (Wt, Ht), (13, 9, 20))
    d = ImageDraw.Draw(sheet)

    d.text((PAD, 30), "SAWTIFY · 30 JOURS · 1 CARROUSEL PAR JOUR", font=load_font(40),
           fill=(255, 255, 255))
    d.text((PAD, 82), "novembre 2026 — 6 identités visuelles : ticket crème, éditorial graphite, "
           "ruban diagonal, + variantes jour/nuit", font=load_font(19, bold=False),
           fill=(178, 160, 205))

    x0 = PAD
    y0 = HEADER
    for k, r in enumerate(rows):
        cx = x0 + (k % COLS) * (TW + GAP)
        cy = y0 + (k // COLS) * (TH + LABEL)
        p = SLIDES / r["slug"] / "01.png"
        if p.exists():
            sheet.paste(Image.open(p).convert("RGB").resize((TW, TH), Image.LANCZOS), (cx, cy))
        else:
            d.rectangle([cx, cy, cx + TW, cy + TH], fill=(30, 25, 40))
            d.text((cx + 20, cy + TH // 2), "à rendre", font=load_font(16, False), fill=(120, 110, 140))
        label = f"{r['jour']} · {r['date'][5:]}"
        d.text((cx + 2, cy + TH + 12), label, font=load_font(18), fill=(214, 200, 236))

    out = SLIDES / args.out
    sheet.save(out, optimize=True)
    print(f"✓ {out.relative_to(ROOT)} {sheet.size} ({n} couvertures)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
