#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""planche_styles.py — planches de contrôle « les styles créés » (v6).

    python3 planche_styles.py

Sorties dans slides/carousel/ :
  planche-styles-v6.jpg   = 10 directions × (couverture A + couverture B + 3 slides)
  planche-couvertures-ab.jpg = les 10 paires A/B en grand, une ligne par direction
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
OUT = HERE / "slides" / "carousel"
FONTS = HERE / "fonts"

INK = (26, 15, 46)
DEEP = (46, 16, 101)
VIO = (109, 40, 217)
LIL = (237, 233, 254)
PAPER = (245, 243, 255)
AURA = (255, 94, 58)
SOFT = (124, 108, 156)

ORDER = ["magazine", "affiche", "cinema", "bento", "diptyque", "fiche",
         "ticket", "frise", "manifeste", "geometrie"]

LABEL = {
    "magazine": "Magazine", "affiche": "Affiche", "cinema": "Cinéma",
    "bento": "Bento", "diptyque": "Diptyque", "fiche": "Fiche_technique",
    "ticket": "Ticket", "frise": "Frise", "manifeste": "Manifeste",
    "geometrie": "Géométrie",
}

DESC = {
    "magazine": "papier, filets fins, sommaire, folio",
    "affiche": "aplats francs, Anton XXL, onde, tampon",
    "cinema": "photo plein cadre, letterbox, scrims",
    "bento": "tuiles arrondies inégales, icônes",
    "diptyque": "deux moitiés, pli central, repères",
    "fiche": "fiche technique, grille alpha, réf. SWT",
    "ticket": "reçu, perforations, code-barres",
    "frise": "rail vertical, jalons, cercles orange",
    "manifeste": "fond encre, mots empilés, pavé",
    "geometrie": "disques lilas/violet, bords francs",
}

DIRS = {
    "magazine": "Magazine", "affiche": "Affiche", "cinema": "Cinéma",
    "bento": "Bento", "diptyque": "Diptyque", "fiche": "Fiche",
    "ticket": "Ticket", "frise": "Frise", "manifeste": "Manifeste",
    "geometrie": "Géométrie",
}


def direction_for(i: int) -> str:
    seg, pos = divmod(i, len(ORDER))
    return ORDER[(pos + seg * 3) % len(ORDER)]


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / name), size)


def fit(draw, text, name, size, width, tracking=0, floor=11):
    """Réduit la taille jusqu'à ce que le texte tienne dans `width`."""
    while size > floor:
        f = font(name, size)
        w = sum(draw.textlength(c, font=f) for c in text) + tracking * max(0, len(text) - 1)
        if w <= width:
            return f
        size -= 1
    return font(name, floor)


def wrap(draw, text, f, width):
    words, lines, cur = text.split(), [], ""
    for wd in words:
        t = (cur + " " + wd).strip()
        if draw.textlength(t, font=f) <= width:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = wd
    if cur:
        lines.append(cur)
    return lines


def track(draw, xy, text, f, fill, tracking=0):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=f, fill=fill)
        x += draw.textlength(ch, font=f) + tracking
    return x


def pubs():
    out = []
    for d in sorted(p for p in OUT.iterdir() if p.is_dir()):
        slides = sorted(p for p in d.glob("*.jpg") if p.name[:2].isdigit())
        out.append((d, slides))
    return out


def pick():
    """direction -> (pub, slides) : la publication la plus fournie pour chaque DA."""
    best = {}
    for i, (d, slides) in enumerate(pubs()):
        k = direction_for(i)
        if k not in best or len(slides) > len(best[k][1]):
            best[k] = (d, slides)
    return best


def thumb(path: Path, w: int, h: int) -> Image.Image:
    return Image.open(path).convert("RGB").resize((w, h), Image.LANCZOS)


def sheet_styles() -> Path:
    TW, TH, GAP = 200, 250, 12
    LAB = 400
    PAD = 40
    head = 132
    w = PAD * 2 + LAB + 5 * TW + 4 * GAP
    h = PAD + head + len(ORDER) * (TH + 26) + 8
    sheet = Image.new("RGB", (w, h), INK)
    d = ImageDraw.Draw(sheet)

    d.text((PAD, PAD + 6), "SAWTIFY", font=font("Anton-Regular.ttf", 40), fill=PAPER)
    d.text((PAD + 196, PAD + 20), "v6", font=font("SpaceGrotesk-Bold.ttf", 22), fill=AURA)
    d.text((PAD, PAD + 58), "10 directions artistiques · 30 carrousels · 180 slides",
           font=font("SpaceGrotesk-Medium.ttf", 20), fill=(178, 165, 210))
    track(d, (PAD, PAD + 92), "COUVERTURE A   ·   COUVERTURE B   ·   INTERIEUR", font("SpaceGrotesk-Medium.ttf", 14), SOFT, 1.6)

    best = pick()
    y = PAD + head
    for idx, k in enumerate(ORDER):
        d.text((PAD, y + 2), f"{idx+1:02d}", font=font("Anton-Regular.ttf", 46), fill=VIO)
        avail = LAB - 96
        f_lab = fit(d, LABEL[k].upper(), "Anton-Regular.ttf", 30, avail, floor=20)
        d.text((PAD + 76, y + 10), LABEL[k].upper(), font=f_lab, fill=PAPER)
        f_desc = fit(d, DESC[k], "SpaceGrotesk-Regular.ttf", 15, avail, floor=12)
        d.text((PAD + 76, y + 52), DESC[k], font=f_desc, fill=(178, 165, 210))
        d.line([(PAD + 76, y + 78), (PAD + LAB - 30, y + 78)], fill=(70, 48, 118), width=1)
        f_ex = fit(d, best[k][0].name, "SpaceGrotesk-Regular.ttf", 13, avail, floor=9)
        d.text((PAD + 76, y + 90), best[k][0].name, font=f_ex, fill=SOFT)

        d_, slides = best[k]
        imgs = [slides[0]]                                  # couverture A
        # couverture B : autre publication de la même direction, 1res slides de la 2e série
        alt = [s for j, (dd, s) in enumerate(pubs())
               if direction_for(j) == k and dd != d_]
        if alt:
            imgs.append(alt[0][0])
        inner = slides[1:]
        if inner:
            step = max(1, (len(inner) - 1) / 2)
            picks = [inner[0], inner[int(round(step))], inner[-1]]
        else:
            picks = []
        imgs += picks
        x = PAD + LAB
        for n, p in enumerate(imgs[:5]):
            sheet.paste(thumb(p, TW, TH), (x, y))
            if n < 2:
                d.rectangle([x, y, x + TW, y + 18], fill=DEEP)
                d.text((x + 8, y + 3), "A" if n == 0 else "B",
                       font=font("SpaceGrotesk-Bold.ttf", 12), fill=PAPER)
            x += TW + GAP
        y += TH + 26

    out = OUT / "planche-styles-v6.jpg"
    sheet.save(out, quality=92, optimize=True)
    return out


def sheet_ab() -> Path:
    TW, TH = 300, 375
    PAD, GAP = 40, 16
    LAB = 270
    cw = LAB + 2 * TW + GAP
    w = PAD * 2 + 2 * cw + 40
    rows = 5
    head = 120
    h = PAD + head + rows * (TH + 56)
    sheet = Image.new("RGB", (w, h), INK)
    d = ImageDraw.Draw(sheet)

    d.text((PAD, PAD), "SAWTIFY · v6", font=font("Anton-Regular.ttf", 38), fill=PAPER)
    d.text((PAD, PAD + 52), "Couvertures A / B — deux traitements par direction, aucune répétition entre deux jours voisins",
           font=font("SpaceGrotesk-Medium.ttf", 18), fill=(178, 165, 210))

    best = pick()
    all_pubs = pubs()
    for idx, k in enumerate(ORDER):
        col, row = divmod(idx, rows)
        x0 = PAD + col * (cw + 40)
        y0 = PAD + head + row * (TH + 56)
        d.text((x0, y0), f"{idx+1:02d}", font=font("Anton-Regular.ttf", 34), fill=VIO)
        d.text((x0, y0 + 44), LABEL[k].upper(),
               font=fit(d, LABEL[k].upper(), "Anton-Regular.ttf", 24, LAB - 40, floor=17), fill=PAPER)
        f_d = font("SpaceGrotesk-Regular.ttf", 12)
        for ln, line in enumerate(wrap(d, DESC[k], f_d, LAB - 40)[:2]):
            d.text((x0, y0 + 76 + ln * 16), line, font=f_d, fill=(178, 165, 210))
        variants = []
        for j, (dd, ss) in enumerate(all_pubs):
            if direction_for(j) == k:
                variants.append(ss[0])
        variants = variants[:2]
        x = x0 + LAB
        for n, p in enumerate(variants):
            sheet.paste(thumb(p, TW, TH), (x, y0))
            d.rectangle([x, y0, x + 34, y0 + 22], fill=AURA if n == 0 else VIO)
            d.text((x + 10, y0 + 5), "A" if n == 0 else "B",
                   font=font("SpaceGrotesk-Bold.ttf", 13), fill=PAPER)
            x += TW + GAP

    out = OUT / "planche-couvertures-ab.jpg"
    sheet.save(out, quality=92, optimize=True)
    return out


if __name__ == "__main__":
    for p in (sheet_styles(), sheet_ab()):
        print("✓", p.name, p.stat().st_size // 1024, "Ko")
