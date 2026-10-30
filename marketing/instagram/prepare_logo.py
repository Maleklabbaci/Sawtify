#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Détoure le logo Sawtify (fond violet uni) et prépare les déclinaisons
utilisées par les carrousels.

    python3 prepare_logo.py

Sorties (dans assets/) :
    logo-mark.png        mascotte détourée, fond transparent, rognée
    logo-mark-pad.png    même image avec 12 % de marge (pour les tuiles)
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "assets" / "sawtify-logo-source.jpg"
OUT = ROOT / "assets"

BG = (107, 36, 233)          # violet du fond
T0, T1 = 40.0, 105.0          # seuils de détourage (distance RGB)


def cut_out(im: Image.Image) -> Image.Image:
    im = im.convert("RGB")
    w, h = im.size
    px = im.load()
    alpha = Image.new("L", (w, h), 0)
    ap = alpha.load()
    bgr, bgg, bgb = BG
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            d = math.sqrt((r - bgr) ** 2 + (g - bgg) ** 2 + (b - bgb) ** 2)
            if d <= T0:
                a = 0
            elif d >= T1:
                a = 255
            else:
                t = (d - T0) / (T1 - T0)
                a = int(255 * (t * t * (3 - 2 * t)))   # smoothstep
            ap[x, y] = a
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.6))

    out = im.convert("RGBA")
    # décontamination : les pixels de bord gardent une teinte violette
    op = out.load()
    for y in range(h):
        for x in range(w):
            a = ap[x, y]
            r, g, b = px[x, y]
            if 0 < a < 255:
                f = a / 255.0
                op[x, y] = (
                    min(255, max(0, int((r - bgr * (1 - f)) / max(f, 0.25)))),
                    min(255, max(0, int((g - bgg * (1 - f)) / max(f, 0.25)))),
                    min(255, max(0, int((b - bgb * (1 - f)) / max(f, 0.25)))),
                    a,
                )
            else:
                op[x, y] = (r, g, b, a) if a == 255 else (r, g, b, 0)
    out.putalpha(alpha)
    return out


def main():
    src = Image.open(SRC)
    cut = cut_out(src)
    bbox = cut.getbbox()
    cut = cut.crop(bbox)
    side = max(cut.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(cut, ((side - cut.width) // 2, (side - cut.height) // 2), cut)

    mark = square.resize((640, 640), Image.LANCZOS)
    mark.save(OUT / "logo-mark.png")

    pad = Image.new("RGBA", (820, 820), (0, 0, 0, 0))
    pad.paste(mark.resize((600, 600), Image.LANCZOS), (110, 110))
    pad.save(OUT / "logo-mark-pad.png")
    print("✓ assets/logo-mark.png", mark.size, "| bbox source:", bbox)


if __name__ == "__main__":
    main()
