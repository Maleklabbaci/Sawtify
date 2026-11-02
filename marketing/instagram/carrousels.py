#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rend les carrousels du programme : 5 slides × (darija + français).

    python3 carrousels.py            → jours 1..5
    python3 carrousels.py 6 10       → jours 6 à 10
"""
import sys
from pathlib import Path

from PIL import Image

import gabarits as G
import lettre as L

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "slides"
W, H = L.W, L.H

LANGS = {"dz": True, "fr": False}
FONTS = {"dz": L.WEIGHT, "fr": L.WEIGHT_LAT}
PILL = {"dz": L.AMR_B, "fr": L.SG_B}
LIMITS = {"A": (972, 620), "B": None, "1": None}


def shared_size(slides, lang, comp, rtl):
    fonts = FONTS[lang]
    if comp == "A":
        mw, mh = LIMITS["A"]
        return min(G.fit_custom(sp, fonts, rtl, mw, mh, cap=136) for sp in slides)
    return min(L.fit_size(sp, fonts, rtl) for sp in slides)


def prep(spec, comp):
    """Adapte la copie au gabarit (ancres de pastilles pour la lettre)."""
    spec = dict(spec)
    if comp == "1":
        items = []
        for i, p in enumerate(spec.get("pills", ())):
            p = dict(p)
            p.setdefault("anchor", (0, "right") if i == 0 else (2, "left"))
            items.append(p)
        spec["pills"] = items
    return spec


def render_day(day):
    comp = day["comp"]
    n = day["n"]
    for lang, rtl in LANGS.items():
        slides = [prep(sp, comp) for sp in day[lang]]
        fonts, pf = FONTS[lang], PILL[lang]
        size = shared_size(slides, lang, comp, rtl)
        d = OUT / f"jour-J{n:02d}" / lang
        d.mkdir(parents=True, exist_ok=True)
        for i, spec in enumerate(slides):
            page = f"{i + 1:02d} / 05"
            seed = 3 + n * 7 + i
            if comp == "1":
                img = L.slide(spec, seed=seed, rtl=rtl, fonts=fonts,
                              page=page, pill_font=pf, shared_size=size)
            elif comp == "A":
                img = G.var_a(spec, seed=seed, rtl=rtl, fonts=fonts, page=page,
                              pf=pf, size=size)
            else:
                img = G.var_b(spec, seed=seed, rtl=rtl, fonts=fonts, page=page,
                              pf=pf, size=size)
            img = img.convert("RGB").resize((W, H), Image.LANCZOS)
            img.save(d / f"{i + 1:02d}.jpg", quality=95, optimize=True,
                     subsampling=1)
        print(f"  ✓ J{n:02d} {lang} · {comp} · {size} px")


def planche(n):
    tw, th, g = 300, 375, 8
    sheet = Image.new("RGB", (5 * (tw + g) + g, 2 * (th + g) + g), (22, 16, 34))
    for r, lang in enumerate(("dz", "fr")):
        for i in range(5):
            f = OUT / f"jour-J{n:02d}" / lang / f"{i + 1:02d}.jpg"
            sheet.paste(Image.open(f).convert("RGB").resize((tw, th), Image.LANCZOS),
                        (g + i * (tw + g), g + r * (th + g)))
    p = OUT / f"planche-J{n:02d}.jpg"
    sheet.save(p, quality=92, optimize=True)
    return p


if __name__ == "__main__":
    import programme
    a = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    b = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    for day in programme.DAYS:
        if a <= day["n"] <= b:
            print(f"J{day['n']:02d} · {day['theme']} · {day['comp']}")
            render_day(day)
            print("  →", planche(day["n"]).name)
