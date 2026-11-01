#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
swiss.py — direction éditoriale suisse (grid stricte, gros grotesque, aplats).

Références : feed minimal noir/blanc + kit social rouge/noir à grille serrée.
Adaptation Sawtify : papier #F7F5F1, encre #121014, violet #6D27EA, orange
réservé au CTA. Anton (latin display), Space Grotesk (micro-labels),
Alexandria Bold (arabe display), IBM Plex Sans Arabic (corps).

    python3 swiss.py               → slides/swiss/{dz,fr}/01..05.jpg
    python3 swiss.py --planches
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

import typekit as tk
from typekit import draw as tdraw
from typekit import width as twidth

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "slides" / "swiss"
LOGO = ROOT / "assets" / "logo-mark-trim.png"
PHOTOS = ROOT / "photos"

W, H = 1080, 1350
SS = 2
M = 72
CW = W - 2 * M          # 936

INK = (18, 16, 20)
PAPER = (247, 245, 241)
VIO = (109, 39, 234)
ORANGE = (253, 96, 41)
GREY = (138, 135, 146)
WHITE = (252, 250, 246)

ANTON = "Anton-Regular.ttf"
GROT = "SpaceGrotesk-Bold.ttf"
GROT_M = "SpaceGrotesk-Medium.ttf"
ALEX = "Alexandria-Bold.ttf"
PLEX_R = "IBMPlexSansArabic-Regular.ttf"
PLEX_B = "IBMPlexSansArabic-SemiBold.ttf"


# ── primitives ────────────────────────────────────────────────────────────
def _c(c):
    return c if len(c) == 4 else c + (255,)


def canvas(fill=PAPER):
    return Image.new("RGBA", (W * SS, H * SS), _c(fill))


def box(base, x0, y0, x1, y1, color):
    ImageDraw.Draw(base).rectangle([x0 * SS, y0 * SS, x1 * SS, y1 * SS],
                                   fill=_c(color))


def rule(base, y, x0=M, x1=W - M, color=INK, wpx=1.2):
    ImageDraw.Draw(base).line([x0 * SS, y * SS, x1 * SS, y * SS],
                              fill=_c(color), width=max(1, int(wpx * SS)))


def vrule(base, x, y0, y1, color=INK, wpx=1.2):
    ImageDraw.Draw(base).line([x * SS, y0 * SS, x * SS, y1 * SS],
                              fill=_c(color), width=max(1, int(wpx * SS)))


def latin(base, text, x, y, size, color, name=GROT_M, align="left", track=0.0):
    d = ImageDraw.Draw(base)
    f = tk._pil(name, size)
    total = sum(d.textlength(c, font=f) / SS for c in text) + track * max(0, len(text) - 1)
    px = x - (total / 2 if align == "center" else total if align == "right" else 0)
    for c in text:
        d.text((px * SS, y * SS), c, font=f, fill=_c(color), anchor="ls")
        px += d.textlength(c, font=f) / SS + track
    return total


def arabic(base, text, x, y, size, color, name=ALEX, align="right"):
    return tdraw(base, text, x, y, size, _c(color), name, align=align)


def left_arabic(base, text, x, y, size, color, name=ALEX):
    """Arabe aligné à gauche (bord gauche = x)."""
    w = twidth(text, name, size)
    tdraw(base, text, x + w, y, size, _c(color), name, align="right")
    return w


def outlined_arabic(base, text, x, y, size, color, name=ALEX, wgt=2.0):
    mask = Image.new("L", base.size, 0)
    w = twidth(text, name, size)
    tdraw(mask, text, x, y, size, 255, name, align="right")
    inner = mask.filter(ImageFilter.MinFilter(int(3 + wgt)))
    edge = ImageChops.subtract(mask, inner)
    layer = Image.new("RGBA", base.size, _c(color)[:3] + (0,))
    layer.putalpha(edge)
    base.alpha_composite(layer)
    return w


def outlined_latin(base, text, x, y, size, color, name=ANTON, wgt=2, align="left"):
    d = ImageDraw.Draw(base)
    f = tk._pil(name, size)
    d.text((x * SS, y * SS), text, font=f, fill=(255, 255, 255, 0),
           stroke_width=int(wgt * SS), stroke_fill=_c(color), anchor="ls")
    return d.textlength(text, font=f) / SS


def logo(base, x, y, mark=40, word="SAWTIFY", color=INK, disc=VIO):
    src = Image.open(LOGO).convert("RGBA")
    d = ImageDraw.Draw(base)
    cy = y - mark / 2
    if disc:
        d.ellipse([x * SS, (cy - mark / 2) * SS, (x + mark) * SS,
                   (cy + mark / 2) * SS], fill=_c(disc))
        h = mark * 0.60
        px = x + (mark - src.width * h / src.height) / 2
    else:
        h = mark
        px = x
    w = src.width * h / src.height
    im = src.resize((max(1, int(w * SS)), max(1, int(h * SS))), Image.LANCZOS)
    base.alpha_composite(im, (int(px * SS), int((cy - h / 2) * SS)))
    tx = x + mark + 12
    latin(base, word, tx, y - 1, 12, color, GROT, "left", 3.0)


def bw_photo(path, size, fx=0.5, fy=0.35, contrast=1.0):
    im = Image.open(path).convert("L")
    im = ImageOps.autocontrast(im, cutoff=1)
    if contrast != 1.0:
        im = ImageOps.colorize(im, black=(24, 22, 26), white=(250, 248, 244))
        im = im.convert("L")
    tw_, th_ = int(size[0] * SS), int(size[1] * SS)
    k = max(tw_ / im.width, th_ / im.height)
    im = im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.LANCZOS)
    l = int(max(0, min(im.width - tw_, im.width * fx - tw_ / 2)))
    t = int(max(0, min(im.height - th_, im.height * fy - th_ / 2)))
    return im.crop((l, t, l + tw_, t + th_)).convert("RGBA")


def fade_bottom(base, start=0.45, color=(10, 8, 12), power=1.4):
    grad = Image.new("L", (1, H * SS), 0)
    gd = ImageDraw.Draw(grad)
    for i in range(H * SS):
        t = i / (H * SS)
        gd.point((0, i), int(255 * max(0.0, (t - start) / (1 - start)) ** power))
    shade = Image.new("RGBA", (W * SS, H * SS), color)
    shade.putalpha(grad.resize((W * SS, H * SS)))
    base.alpha_composite(shade)


def arrow_right(base, x, y, size=18, color=INK, wpx=2.2):
    d = ImageDraw.Draw(base)
    d.line([x * SS, y * SS, (x + size * 2) * SS, y * SS], fill=_c(color),
           width=max(1, int(wpx * SS)))
    d.line([(x + size * 1.35) * SS, (y - size * 0.5) * SS, (x + size * 2) * SS, y * SS],
           fill=_c(color), width=max(1, int(wpx * SS)))
    d.line([(x + size * 1.35) * SS, (y + size * 0.5) * SS, (x + size * 2) * SS, y * SS],
           fill=_c(color), width=max(1, int(wpx * SS)))


def arrow_left(base, x, y, size=18, color=INK, wpx=2.2):
    d = ImageDraw.Draw(base)
    d.line([x * SS, y * SS, (x + size * 2) * SS, y * SS], fill=_c(color),
           width=max(1, int(wpx * SS)))
    d.line([(x + size * 0.65) * SS, (y - size * 0.5) * SS, x * SS, y * SS],
           fill=_c(color), width=max(1, int(wpx * SS)))
    d.line([(x + size * 0.65) * SS, (y + size * 0.5) * SS, x * SS, y * SS],
           fill=_c(color), width=max(1, int(wpx * SS)))


def plus(base, cx, cy, r=18, color=INK, wpx=1.6):
    d = ImageDraw.Draw(base)
    d.line([(cx - r) * SS, cy * SS, (cx + r) * SS, cy * SS], fill=_c(color),
           width=max(1, int(wpx * SS)))
    d.line([cx * SS, (cy - r) * SS, cx * SS, (cy + r) * SS], fill=_c(color),
           width=max(1, int(wpx * SS)))


def head(b, meta_left, meta_right, color=INK, sub=GREY, y=100):
    logo(b, M, y, mark=40, color=color, disc=(VIO if color == INK else None))
    latin(b, meta_right, W - M, y - 2, 10, sub, GROT_M, "right", 2.6)
    rule(b, y + 28, M, W - M, color + (70,) if len(color) == 3 else color, 1.1)


def foot(b, color=INK, sub=GREY, n=1, total=5, right="سوم عادل · 2026"):
    rule(b, H - 96, M, W - M, color + (70,), 1.1)
    latin(b, "SAWTIFY.SPACE", M, H - 66, 10, color, GROT, "left", 2.8)
    latin(b, f"{n:02d} / {total:02d}", W - M, H - 66, 10, ORANGE, GROT, "right", 2.4)


# ── texte selon la langue ─────────────────────────────────────────────────
def X(pub, end=True):
    return (W - M) if (pub["rtl"] == end) else M


def AL(pub):
    return "right" if pub["rtl"] else "left"


def disp(b, pub, text, y, size, color, style="in", x=None):
    x = X(pub) if x is None else x
    if pub["rtl"]:
        if style == "out":
            outlined_arabic(b, text, x, y, size, color, ALEX, 2.6)
        else:
            arabic(b, text, x, y, size, color, ALEX)
    else:
        f = ANTON
        if style == "out":
            outlined_latin(b, text, x, y, size, color, f, 2, AL(pub))
        else:
            latin(b, text, x, y, size, color, f, AL(pub), 0)


def body(b, pub, text, y, size, color):
    x = X(pub)
    if pub["rtl"]:
        arabic(b, text, x, y, size, color, PLEX_R)
    else:
        latin(b, text, x, y, size, color, GROT_M, AL(pub), 0)


# ── slides ────────────────────────────────────────────────────────────────
def s1(pub):
    b = canvas(PAPER)
    head(b, "01", pub["m_head"])
    latin(b, "THE PRICE SERIES", M, 196, 10, VIO, GROT, "left", 2.6)
    arabic(b, pub["s1"]["kicker"], W - M, 198, 20, VIO, ALEX)

    size = 118
    y = 340
    for text, style in pub["s1"]["lines"]:
        disp(b, pub, text, y, size, INK, style)
        y += size * 1.02

    body(b, pub, pub["s1"]["body"], y + 66, 26, GREY)
    body(b, pub, pub["s1"]["body2"], y + 110, 26, GREY)

    band = Image.new("RGBA", (300 * SS, 24 * SS), (0, 0, 0, 0))
    latin(band, "SAWTIFY · VOL. 01 — 2026", 0, 17, 9, GREY, GROT_M, "left", 2.2)
    b.alpha_composite(band.rotate(90, expand=True), (26 * SS, 560 * SS))

    rule(b, 900, M, W - M, INK, 1.2)
    latin(b, "STUDIO · ALGER", M, 928, 10, GREY, GROT_M, "left", 2.6)
    latin(b, "ENREGISTRÉ EN DARIJA", W - M, 928, 10, GREY, GROT_M, "right", 2.6)
    ph = bw_photo(PHOTOS / "phone-hand.jpg", (CW, 190), fx=0.5, fy=0.5)
    b.alpha_composite(ph, (M * SS, 946 * SS))

    if pub["rtl"]:
        arabic(b, "اسحب", M + 62, 1218, 20, INK, ALEX)
        arrow_left(b, M, 1212, 14, INK)
    else:
        latin(b, "SWIPE", M, 1216, 13, INK, GROT, "left", 2.4)
        arrow_left(b, M + twidth("SWIPE", GROT, 13) + 16, 1212, 14, INK)
    foot(b, n=1)
    return b


def s2(pub):
    b = canvas(VIO)
    head(b, "02", pub["m_head"], color=WHITE, sub=(214, 202, 246))
    latin(b, "LE CHIFFRE", M, 196, 10, (232, 224, 252), GROT, "left", 2.6)
    arabic(b, pub["s2"]["kicker"], W - M, 198, 20, WHITE, ALEX)

    latin(b, "500", M, 560, 300, WHITE, ANTON, "left", 0)
    latin(b, "DA", M + 470, 560, 88, WHITE, ANTON, "left", 0)
    plus(b, W - M - 30, 300, 26, (255, 255, 255, 150), 1.4)

    rule(b, 640, M, W - M, (255, 255, 255, 90), 1.2)
    body(b, pub, pub["s2"]["line1"], 720, 46, WHITE)
    body(b, pub, pub["s2"]["line2"], 782, 46, WHITE)
    latin(b, pub["s2"]["sub"], W - M, 840, 11, (214, 202, 246), GROT_M, "right", 2.4)

    vrule(b, M, 960, 1140, (255, 255, 255, 90), 1.2)
    vrule(b, M + 300, 960, 1140, (255, 255, 255, 90), 1.2)
    vrule(b, M + 600, 960, 1140, (255, 255, 255, 90), 1.2)
    latin(b, "PRIX", M + 20, 992, 10, (214, 202, 246), GROT_M, "left", 2.4)
    latin(b, "500 DA", M + 20, 1046, 34, WHITE, GROT, "left", 0)
    latin(b, "DÉLAI", M + 320, 992, 10, (214, 202, 246), GROT_M, "left", 2.4)
    latin(b, "24 H", M + 320, 1046, 34, WHITE, GROT, "left", 0)
    latin(b, "LANGUE", M + 620, 992, 10, (214, 202, 246), GROT_M, "left", 2.4)
    if pub["rtl"]:
        arabic(b, "دارجة", M + 750, 1046, 34, WHITE, ALEX)
    else:
        latin(b, "DARIJA", M + 620, 1046, 34, WHITE, GROT, "left", 0)
    foot(b, color=WHITE, sub=(206, 194, 240), n=2)
    return b


def s3(pub):
    b = canvas(PAPER)
    head(b, "03", pub["m_head"])
    latin(b, "LES GESTES", M, 196, 10, VIO, GROT, "left", 2.6)
    arabic(b, pub["s3"]["kicker"], W - M, 198, 20, VIO, ALEX)
    disp(b, pub, pub["s3"]["title"], 300, 62, INK)
    latin(b, "TROIS GESTES · TROIS SECONDES", M, 316, 10, GREY, GROT_M, "left", 2.6)

    y = 430
    for num, ttl, sub in pub["s3"]["rows"]:
        latin(b, num, M, y + 46, 46, VIO, ANTON, "left", 0)
        if pub["rtl"]:
            arabic(b, ttl, W - M, y + 48, 40, INK, ALEX)
            arabic(b, sub, W - M, y + 96, 24, GREY, PLEX_R)
        else:
            latin(b, ttl, W - M, y + 48, 34, INK, GROT, "right", 0)
            latin(b, sub, W - M, y + 96, 20, GREY, GROT_M, "right", 0)
        rule(b, y + 150, M, W - M, INK + (40,), 1.0)
        y += 190

    body(b, pub, pub["s3"]["foot"], y + 46, 26, INK)
    arrow_right(b, M, y + 40, 12, VIO)
    foot(b, n=3)
    return b


def s4(pub):
    b = canvas(INK)
    ph = bw_photo(PHOTOS / "man-studio.jpg", (W, H), fx=0.46, fy=0.30)
    b.alpha_composite(ph)
    fade_bottom(b, start=0.34, color=(10, 8, 12), power=1.5)

    logo(b, M, 100, mark=40, color=WHITE, disc=None)
    latin(b, pub["m_head"], W - M, 98, 10, WHITE, GROT_M, "right", 2.6)
    rule(b, 128, M, W - M, WHITE + (90,), 1.1)

    latin(b, "N° 04 — LE MÉCANISME", M, 906, 10, WHITE, GROT_M, "left", 2.8)
    y = 1004
    for text, style in pub["s4"]["lines"]:
        disp(b, pub, text, y, 76, WHITE, style)
        y += 86

    rule(b, 1210, M, W - M, WHITE + (90,), 1.0)
    latin(b, "SAWTIFY.SPACE", M, 1250, 10, WHITE, GROT, "left", 2.8)
    latin(b, "04 / 05", W - M, 1250, 10, (200, 196, 208), GROT_M, "right", 2.4)
    return b


def s5(pub):
    b = canvas(PAPER)
    head(b, "05", pub["m_head"])
    latin(b, "PRÊT ?", M, 210, 11, VIO, GROT, "left", 3.0)
    disp(b, pub, pub["s5"]["title"], 330, 96, INK)
    body(b, pub, pub["s5"]["sub"], 400, 28, GREY)

    box(b, M, 470, W - M, 620, ORANGE)
    latin(b, pub["s5"]["cta"], M + 40, 562, 40, WHITE, GROT, "left", 0)
    arrow_right(b, W - M - 130, 545, 26, WHITE, 2.6)

    latin(b, "DM INSTAGRAM", M, 690, 11, GREY, GROT_M, "left", 2.6)
    body(b, pub, pub["s5"]["note"], 736, 24, GREY)

    ph = bw_photo(PHOTOS / "script-notebook.jpg", (CW, 230), fy=0.4)
    b.alpha_composite(ph, (M * SS, 870 * SS))

    rule(b, 1150, M, W - M, INK + (60,), 1.0)
    latin(b, "500 DA · LIVRÉ EN 24 H · DARIJA ALGÉRIENNE", M, 1186, 11, GREY,
          GROT_M, "left", 2.2)
    latin(b, "ALGER · ORAN · CONSTANTINE", W - M, 1186, 11, GREY, GROT_M, "right", 2.2)
    foot(b, n=5)
    return b


SLIDES = [s1, s2, s3, s4, s5]


# ═══════════════════════════════════════════════════════════════════════════
DZ = {
    "id": "dz", "rtl": True, "m_head": "N° 01 — ALGER · 2026",
    "s1": {
        "kicker": "سلسلة السوم",
        "lines": [("الصوت", "in"), ("تاعك،", "in"), ("بدارجة.", "out")],
        "body": "خمس مية دج، توصلك في 24 ساعة،",
        "body2": "و تسمعها قبل ما تخلّص.",
    },
    "s2": {
        "kicker": "الرقم",
        "line1": "خمس مية دينار، صوت واضح،",
        "line2": "بدارجة جزايرية.",
        "sub": "CINQ CENTS DINARS · UNE VOIX · 24 H",
    },
    "s3": {
        "kicker": "الحركات",
        "title": "ثلاث حركات.",
        "rows": [("01", "بيّن المرجع", "السوم قبل، ماشي بعد."),
                 ("02", "فسّر السوم", "علاش هاد الرقم بالضبط."),
                 ("03", "قارن بوضوح", "الفرق يبان في الثانية.")],
        "foot": "ثلاث حركات، و السوم يولّي واضح.",
    },
    "s4": {"lines": [("ما تشريش", "in"), ("بلا ما تسمع.", "out")]},
    "s5": {
        "title": "دير طلب تاعك.",
        "sub": "صوت واحد، بدارجة، يوصلك غدوة.",
        "cta": "sawtify.space",
        "note": "اكتبلنا «صوت» في الرسائل.",
    },
}

FR = {
    "id": "fr", "rtl": False, "m_head": "N° 01 — SÉRIE 2026",
    "s1": {
        "kicker": "LA SÉRIE DU PRIX",
        "lines": [("LE PRIX", "in"), ("QUI SE", "in"), ("DÉFEND.", "out")],
        "body": "500 DA, livrés en 24 h,",
        "body2": "et vous écoutez avant de payer.",
    },
    "s2": {
        "kicker": "LE CHIFFRE",
        "line1": "Cinq cents dinars, une voix",
        "line2": "en darija algérienne.",
        "sub": "CINQ CENTS DINARS · UNE VOIX · 24 H",
    },
    "s3": {
        "kicker": "LES GESTES",
        "title": "TROIS GESTES.",
        "rows": [("01", "MONTRER LA RÉFÉRENCE", "Le prix d'avant, pas celui d'après."),
                 ("02", "EXPLIQUER LE PRIX", "Pourquoi ce chiffre, exactement."),
                 ("03", "COMPARER À PLAT", "L'écart se voit en une seconde.")],
        "foot": "Trois gestes, et le prix devient lisible.",
    },
    "s4": {"lines": [("N'ACHETEZ PAS", "in"), ("SANS ÉCOUTER.", "out")]},
    "s5": {
        "title": "PASSEZ COMMANDE.",
        "sub": "Une voix, en darija, livrée demain.",
        "cta": "sawtify.space",
        "note": "Écrivez-nous « voix » en message.",
    },
}

PUBS = [DZ, FR]
# FR utilise du latin : on remplace l'arabe par le rendu Anton pour les titres
FR_LATIN = {
    1: [("LE PRIX", "in"), ("QUI SE", "in"), ("DÉFEND.", "out")],
    4: [("N'ACHETEZ PAS", "in"), ("SANS ÉCOUTER.", "out")],
}


def render(pub):
    d = OUT / pub["id"]
    d.mkdir(parents=True, exist_ok=True)
    for i, fn in enumerate(SLIDES):
        im = fn(pub)
        im = post(im, pub, i + 1)
        im.convert("RGB").resize((W, H), Image.LANCZOS).save(
            d / f"{i + 1:02d}.jpg", quality=95, optimize=True, subsampling=1)
        print("  ✓", pub["id"], f"{i + 1:02d}")


def post(im, pub, n):
    return im


def planches():
    for pub in PUBS:
        files = sorted((OUT / pub["id"]).glob("*.jpg"))
        tw_, th_ = 500, 625
        sheet = Image.new("RGB", (len(files) * (tw_ + 8) + 8, th_ + 16), (24, 22, 28))
        for i, f in enumerate(files):
            sheet.paste(Image.open(f).convert("RGB").resize((tw_, th_), Image.LANCZOS),
                        (8 + i * (tw_ + 8), 8))
        sheet.save(OUT / f"planche-{pub['id']}.jpg", quality=93, optimize=True)
        print("  ✓", f"planche-{pub['id']}.jpg")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default=None)
    ap.add_argument("--planches", action="store_true")
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    if a.planches:
        planches()
        return
    for pub in PUBS:
        if a.only and a.only != pub["id"]:
            continue
        render(pub)


if __name__ == "__main__":
    main()
