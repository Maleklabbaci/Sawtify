#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
pistes.py — trois directions graphiques franchement différentes (1 slide chacune).

  A · PRESSE      papier chaud, Amiri (naskh) + Playfair italique, photo en colonne
  B · RUE         aplat violet profond, Lalezar, grille stricte, chiffre XXL
  C · PHOTO       photo pleine page, duotone, texte petit, beaucoup d'air

    python3 pistes.py            → slides/pistes/A.jpg B.jpg C.jpg
    python3 pistes.py --board    → slides/pistes/board.jpg
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

import typekit as tk
from typekit import draw as tdraw
from typekit import width as twidth

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "slides" / "pistes"
LOGO = ROOT / "assets" / "logo-mark-trim.png"
PHOTOS = ROOT / "photos"

W, H = 1080, 1350
SS = 2
M = 76

INK = (20, 18, 26)
PAPER = (244, 240, 230)
VERM = (214, 72, 15)
VIO = (91, 31, 206)
VIO_D = (61, 18, 148)
CREAM = (245, 241, 232)
MUT = (120, 110, 100)

AMIRI_B = "Amiri-Bold.ttf"
AMIRI_R = "Amiri-Regular.ttf"
LALEZAR = "Lalezar-Regular.ttf"
PLAYFAIR_I = "Playfair-BoldItalic.ttf"
PLAYFAIR_B = "Playfair-Bold.ttf"
GROTESK = "SpaceGrotesk-Bold.ttf"
GROTESK_M = "SpaceGrotesk-Medium.ttf"


# ── outils ────────────────────────────────────────────────────────────────
def canvas(fill=PAPER):
    return Image.new("RGBA", (W * SS, H * SS), fill + (255,))


def latin(base, text, x, y, size, fill, name=GROTESK, align="left", track=0.0):
    d = ImageDraw.Draw(base)
    f = tk._pil(name, size)
    total = sum(d.textlength(c, font=f) / SS for c in text) + track * max(0, len(text) - 1)
    px = x - (total / 2 if align == "center" else total if align == "right" else 0)
    for c in text:
        d.text((px * SS, y * SS), c, font=f, fill=fill, anchor="ls")
        px += d.textlength(c, font=f) / SS + track
    return total


def _c(color):
    return color if len(color) == 4 else color + (255,)


def rule(base, x0, y, x1, color, wpx=1.4):
    ImageDraw.Draw(base).line([x0 * SS, y * SS, x1 * SS, y * SS],
                              fill=_c(color), width=max(1, int(wpx * SS)))


def vrule(base, x, y0, y1, color, wpx=1.4):
    ImageDraw.Draw(base).line([x * SS, y0 * SS, x * SS, y1 * SS],
                              fill=_c(color), width=max(1, int(wpx * SS)))


def logo(base, x, y, mark=40, color=INK, word="SAWTIFY", wsize=12.0, track=3.2,
         on_dark=False):
    """Verrou : mascotte + wordmark sur la même ligne de base."""
    src = Image.open(LOGO).convert("RGBA")
    if on_dark:
        h = mark
        px = x
        cy = y - h / 2
    else:
        d = ImageDraw.Draw(base)
        cy = y - mark / 2
        d.ellipse([x * SS, (cy - mark / 2) * SS, (x + mark) * SS,
                   (cy + mark / 2) * SS], fill=VIO + (255,))
        h = mark * 0.62
        px = x + (mark - src.width * h / src.height) / 2
    w = src.width * h / src.height
    im = src.resize((max(1, int(w * SS)), max(1, int(h * SS))), Image.LANCZOS)
    base.alpha_composite(im, (int(px * SS), int((cy - h / 2) * SS)))
    tx = x + mark + 13
    latin(base, word, tx, y - 2, wsize, color, GROTESK, "left", track)
    return tx - x + twidth(word, GROTESK, wsize) + track * (len(word) - 1)


def page_no(base, n, total, color=MUT, x=None):
    x = x if x is not None else W - M
    latin(base, f"{n:02d} / {total:02d}", x, H - 58, 10.5, color, GROTESK, "right", 2.2)


def cover(im, size, fx=0.5, fy=0.35):
    """Recadre au format demandé sans déformer (fx/fy = point d'intérêt)."""
    tw, th = int(size[0]), int(size[1])
    k = max(tw / im.width, th / im.height)
    im = im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.LANCZOS)
    l = int(max(0, min(im.width - tw, im.width * fx - tw / 2)))
    t = int(max(0, min(im.height - th, im.height * fy - th / 2)))
    return im.crop((l, t, l + tw, t + th))


def duotone(path, dark, light):
    im = Image.open(path).convert("L")
    im = ImageOps.autocontrast(im, cutoff=1)
    return ImageOps.colorize(im, black=dark, white=light).convert("RGBA")


def fit_block(text, name, size, max_w, floor=14):
    while size > floor and twidth(text, name, size) > max_w:
        size -= 1
    return size


# ── A · PRESSE ────────────────────────────────────────────────────────────
def piste_a():
    b = canvas(PAPER)
    ph = duotone(PHOTOS / "man-studio.jpg", (58, 48, 42), (250, 246, 237))
    ph = cover(ph, (400, H), fx=0.30, fy=0.24).resize((400 * SS, H * SS), Image.LANCZOS)
    b.alpha_composite(ph, (0, 0))
    vrule(b, 400, 0, H, VERM, 3)

    logo(b, 452, 100, mark=42, color=INK)
    latin(b, "ALGER · 2026", W - M, 96, 10.5, MUT, GROTESK, "right", 2.6)
    rule(b, 452, 128, W - M, (20, 18, 26, 45), 1)

    latin(b, "N° 01", W - M, 188, 10.5, MUT, GROTESK, "right", 2.4)
    tdraw(b, "سلسلة السوم", W - M, 238, 30, VERM, AMIRI_B, align="right")

    y = 340
    for line in ("قبل ما تشري،", "سمع الصوت", "بدارجة."):
        tdraw(b, line, W - M, y, 78, INK, AMIRI_B, align="right")
        y += 88

    rule(b, 452, 604, W - M, (20, 18, 26, 60), 1.2)

    y = 662
    for line in ("خمس مية دينار، توصلك في 24 ساعة،",
                 "تسمعها قبل ما تخلّص.",
                 "بلا مواعيد، بلا حساب."):
        tdraw(b, line, W - M, y, 26, (52, 46, 56), AMIRI_R, align="right")
        y += 44

    latin(b, "la darija, bien dite.", 452, 880, 34, VERM, PLAYFAIR_I, "left", 0)

    rule(b, 452, 1040, W - M, INK, 1.4)
    latin(b, "SAWTIFY.SPACE", 452, 1082, 12, INK, GROTESK, "left", 3)
    latin(b, "VOIX OFF · DARIJA ALGÉRIENNE", 452, 1112, 10, MUT, GROTESK_M, "left", 2.4)
    latin(b, "500 DA", W - M, 1084, 26, INK, PLAYFAIR_B, "right", 0)
    page_no(b, 1, 5)
    return b


# ── B · RUE ───────────────────────────────────────────────────────────────
def piste_b():
    b = canvas((72, 22, 170))
    d = ImageDraw.Draw(b)
    logo(b, M, 100, mark=40, color=CREAM, on_dark=True)
    latin(b, "N° 01", W - M, 96, 11, (214, 200, 246), GROTESK, "right", 2.6)

    # chiffre fantôme contour, calé en bas à gauche
    gh = Image.new("RGBA", (620 * SS, 470 * SS), (0, 0, 0, 0))
    f = tk._pil(GROTESK, 360)
    ImageDraw.Draw(gh).text((0, 430 * SS), "01", font=f, fill=(255, 255, 255, 0),
                            stroke_width=int(2 * SS),
                            stroke_fill=(255, 255, 255, 70), anchor="ls")
    b.alpha_composite(gh, (-90, 900))

    y = 372
    for line, sz in (("سومك", 118), ("ماشي", 118), ("سوم السوق.", 84)):
        tdraw(b, line, W - M, y, sz, CREAM, LALEZAR, align="right")
        y += sz * 1.04

    d.rectangle([(W - M - 120) * SS, (y + 26) * SS, (W - M) * SS, (y + 36) * SS],
                fill=VERM + (255,))
    tdraw(b, "خمس مية دج، صوت واضح، 24 ساعة.", W - M, y + 150, 32, CREAM, AMIRI_R,
          align="right")
    latin(b, "cinq cents dinars · une voix · 24 h", W - M, y + 188, 11,
          (206, 192, 244), GROTESK_M, "right", 2.2)

    rule(b, M, 1180, W - M, (255, 255, 255, 60), 1)
    latin(b, "SAWTIFY.SPACE", M, 1224, 12, CREAM, GROTESK, "left", 3)
    latin(b, "DARIJA ALGÉRIENNE", M, 1252, 10, (206, 192, 244), GROTESK_M, "left", 2.4)
    page_no(b, 1, 5, color=(206, 192, 244))
    return b


# ── C · PHOTO ─────────────────────────────────────────────────────────────
def piste_c():
    b = canvas(INK)
    ph = Image.open(PHOTOS / "man-studio.jpg").convert("RGB")
    ph = cover(ph, (W, H), fx=0.42, fy=0.30).resize((W * SS, H * SS), Image.LANCZOS).convert("RGBA")
    ph = Image.blend(
        ph, ImageOps.colorize(ph.convert("L"), (14, 10, 18), (246, 240, 228)).convert("RGBA"), 0.22)
    b.alpha_composite(ph)

    grad = Image.new("L", (1, H * SS), 0)
    gd = ImageDraw.Draw(grad)
    for i in range(H * SS):
        t = i / (H * SS)
        gd.point((0, i), int(255 * max(0.0, (t - 0.30) / 0.70) ** 1.25))
    shade = Image.new("RGBA", (W * SS, H * SS), (10, 7, 14))
    shade.putalpha(grad.resize((W * SS, H * SS)))
    b.alpha_composite(shade)

    logo(b, M, 100, mark=40, color=CREAM, on_dark=True)
    latin(b, "ALGER · 2026", W - M, 96, 10.5, (240, 236, 226), GROTESK, "right", 2.6)

    y = 892
    ImageDraw.Draw(b).rectangle([(W - M - 96) * SS, (y - 62) * SS, (W - M) * SS,
                                 (y - 54) * SS], fill=VERM + (255,))
    tdraw(b, "دارجة الجزائر،", W - M, y, 66, CREAM, AMIRI_B, align="right")
    tdraw(b, "بصوت واضح.", W - M, y + 82, 66, CREAM, AMIRI_B, align="right")
    latin(b, "une voix off, dite comme on parle ici", W - M, y + 128, 28,
          (246, 240, 228), PLAYFAIR_I, "right", 0)

    rule(b, M, 1150, W - M, (255, 255, 255, 90), 1)
    latin(b, "500 DA · LIVRÉ EN 24 H", M, 1196, 11.5, CREAM, GROTESK, "left", 2.8)
    latin(b, "SAWTIFY.SPACE", W - M, 1196, 11.5, CREAM, GROTESK, "right", 3)
    page_no(b, 1, 5, color=(226, 220, 210))
    return b


PISTES = [("A", "presse", piste_a), ("B", "rue", piste_b), ("C", "photo", piste_c)]


LABELS = {"A": ("A · PRESSE", "Amiri + Playfair · photo colonne · papier chaud"),
          "B": ("B · RUE", "Lalezar · aplat violet · chiffre fantôme"),
          "C": ("C · PHOTO", "photo pleine page · duotone · Amiri"),
          }


def board():
    tw, th = 500, 625
    top, gap = 78, 16
    sheet = Image.new("RGB", (len(PISTES) * (tw + gap) + gap, top + th + gap), (22, 20, 27))
    d = ImageDraw.Draw(sheet)
    f_t = ImageFont.truetype(str(ROOT / "fonts" / GROTESK), 22)
    f_s = ImageFont.truetype(str(ROOT / "fonts" / GROTESK_M), 14)
    for i, (key, _, _) in enumerate(PISTES):
        x = gap + i * (tw + gap)
        im = Image.open(OUT / f"{key}.jpg").convert("RGB").resize((tw, th), Image.LANCZOS)
        sheet.paste(im, (x, top))
        title, sub = LABELS[key]
        d.text((x + 2, 22), title, fill=(245, 240, 232), font=f_t)
        d.text((x + 2, 50), sub, fill=(152, 142, 162), font=f_s)
    sheet.save(OUT / "board.jpg", quality=93, optimize=True)
    print("  ✓ board.jpg")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--board", action="store_true")
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    if a.board:
        board()
        return
    for key, name, fn in PISTES:
        im = fn().convert("RGB").resize((W, H), Image.LANCZOS)
        im.save(OUT / f"{key}.jpg", quality=95, optimize=True, subsampling=1)
        print("  ✓", key, name)


if __name__ == "__main__":
    main()
