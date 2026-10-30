#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Planche d'aperçu de toute la série (une ligne par carrousel)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
SLIDES = ROOT / "slides"
PREFIXES = ("03", "04", "05", "06", "07")
TW, TH, GAP, PAD, LB = 236, 295, 12, 26, 34

groups = [d for d in sorted(SLIDES.iterdir()) if d.is_dir() and d.name[:2] in PREFIXES]
cols = max(len(list(g.glob("[0-9][0-9].png"))) for g in groups)
Wt = PAD * 2 + cols * TW + (cols - 1) * GAP
Ht = PAD * 2 + len(groups) * (TH + LB + 16) - 16
sheet = Image.new("RGB", (Wt, Ht), (12, 9, 18))
draw = ImageDraw.Draw(sheet)
font_path = ROOT / "fonts" / "SpaceGrotesk-Bold.ttf"
f = ImageFont.truetype(str(font_path), 15) if font_path.exists() else ImageFont.load_default()

y = PAD
for g in groups:
    label = g.name.split("-", 1)[1].replace("-", " ").upper()
    draw.text((PAD, y + 9), label, font=f, fill=(190, 170, 220))
    y += LB
    for k in range(1, cols + 1):
        p = g / f"{k:02d}.png"
        if p.exists():
            sheet.paste(Image.open(p).resize((TW, TH), Image.LANCZOS),
                        (PAD + (k - 1) * (TW + GAP), y))
    y += TH + 16

out = SLIDES / "apercu-serie-premium.png"
sheet.save(out, optimize=True)
print("✓", out.relative_to(ROOT), sheet.size, f"({len(groups)} carrousels)")
