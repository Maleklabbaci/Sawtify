#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
kinetique.py — « affiche kinétique » v2 (direction choisie, refaite proprement).

Ce qui change vs v14 : surligneurs pleins (violet/orange) au lieu des pastels,
Alexandria Bold à la place de Cairo Black, hiérarchie plus calme (82–96 px),
2 stickers maximum par slide, papier net + un seul halo, verrou de marque
(mascotte + wordmark) au lieu d'une pastille, tout cale sur une grille de 8 px.

    python3 kinetique.py              → slides/kinetique/{dz,fr}/01..05.jpg
    python3 kinetique.py --only dz
    python3 kinetique.py --planches
"""
from __future__ import annotations

import argparse
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps

import typekit as tk
from typekit import draw as tdraw
from typekit import width as twidth

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "slides" / "kinetique"
LOGO = ROOT / "assets" / "logo-mark-trim.png"
PHOTOS = ROOT / "photos"

W, H = 1080, 1350
SS = 2
M = 76

INK = (24, 18, 38)
PAPER = (244, 241, 233)
VIO = (109, 39, 234)
VIO_D = (78, 22, 172)
ORANGE = (253, 96, 41)
CREAM = (247, 244, 236)
MUT = (112, 100, 132)

AR_DISP = "Alexandria-Bold.ttf"
AR_BODY = "IBMPlexSansArabic-Regular.ttf"
AR_BODY_B = "IBMPlexSansArabic-SemiBold.ttf"
LAT_DISP = "Anton-Regular.ttf"
MICRO = "SpaceGrotesk-Bold.ttf"
MICRO_M = "SpaceGrotesk-Medium.ttf"
ITAL = "Playfair-BoldItalic.ttf"


def _c(c):
    return c if len(c) == 4 else c + (255,)


# ── fond ──────────────────────────────────────────────────────────────────
def sheet(seed=3, glow=0.055):
    rnd = random.Random(seed)
    base = Image.new("RGB", (W * SS, H * SS), PAPER)
    noise = Image.new("L", (W // 2, H // 2))
    noise.putdata([rnd.randint(126, 130) for _ in range(W // 2 * H // 2)])
    grain = Image.merge("RGB", [noise] * 3).resize((W * SS, H * SS), Image.BILINEAR)
    base = Image.blend(base, grain, 0.12)
    g = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
    gd = ImageDraw.Draw(g)
    gd.ellipse([-220 * SS, -300 * SS, 620 * SS, 420 * SS],
               fill=(*VIO, int(255 * glow)))
    base = Image.alpha_composite(base.convert("RGBA"),
                                 g.filter(ImageFilter.GaussianBlur(180)))
    return base


# ── texte ─────────────────────────────────────────────────────────────────
def latin(base, text, x, y, size, color, name=MICRO, align="left", track=0.0):
    d = ImageDraw.Draw(base)
    f = tk._pil(name, size)
    total = sum(d.textlength(c, font=f) / SS for c in text) + track * max(0, len(text) - 1)
    px = x - (total / 2 if align == "center" else total if align == "right" else 0)
    for c in text:
        d.text((px * SS, y * SS), c, font=f, fill=_c(color), anchor="ls")
        px += d.textlength(c, font=f) / SS + track
    return total


def arabic(base, text, x, y, size, color, name=AR_DISP, align="right"):
    return tdraw(base, text, x, y, size, _c(color), name, align=align)


def mono(base, text, x, y, size, color, name=MICRO, align="left"):
    """Micro-label capitales espacées."""
    return latin(base, text, x, y, size, color, name, align, size * 0.22)


def ink_box(text, name, size):
    """Boîte d'encre réelle (gauche, droite, haut, bas) autour de la baseline."""
    w = twidth(text, name, size)
    pad, bs = size * 0.7, size * 1.9
    im = Image.new("L", (int((w + 2 * pad) * SS), int(2.8 * size * SS)), 0)
    tdraw(im, text, pad, bs, size, 255, name, align="left")
    bb = im.getbbox()
    if not bb:
        return 0.0, w, -size * 0.7, 0.0
    return (bb[0] / SS - pad, bb[2] / SS - pad, bb[1] / SS - bs, bb[3] / SS - bs)


# ── briques de composition ────────────────────────────────────────────────
def bar(base, x0, y0, x1, y1, color, radius=0, rot=0.0):
    w_, h_ = max(2, int((x1 - x0) * SS)), max(2, int((y1 - y0) * SS))
    im = Image.new("RGBA", (w_, h_), (0, 0, 0, 0))
    dr = ImageDraw.Draw(im)
    if radius:
        dr.rounded_rectangle([0, 0, w_ - 1, h_ - 1], radius=int(radius * SS),
                             fill=_c(color))
    else:
        dr.rectangle([0, 0, w_ - 1, h_ - 1], fill=_c(color))
    if rot:
        im = im.rotate(rot, expand=True, resample=Image.BICUBIC)
    base.alpha_composite(im, (int((x0 - (im.width - w_) / (2 * SS)) * SS),
                              int((y0 - (im.height - h_) / (2 * SS)) * SS)))


def shadowed(base, im, x, y, blur=12, alpha=52, dy=6):
    sh = Image.new("RGBA", (im.width + blur * 4, im.height + blur * 4), (0, 0, 0, 0))
    blk = Image.new("RGBA", im.size, (20, 14, 34, alpha))
    sh.alpha_composite(blk, (blur * 2, blur * 2))
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(sh, (int(x * SS) - blur * 2, int((y + dy) * SS) - blur * 2))
    base.alpha_composite(im, (int(x * SS), int(y * SS)))


def icon(kind, size, color):
    s = int(size * SS)
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if kind == "target":
        d.ellipse([s * .12, s * .12, s * .88, s * .88], outline=_c(color), width=int(s * .085))
        d.ellipse([s * .40, s * .40, s * .60, s * .60], fill=_c(color))
        d.line([s * .58, s * .58, s * .88, s * .88], fill=_c(color), width=int(s * .085))
    elif kind == "spark":
        pts = []
        for i in range(8):
            r = s * (0.46 if i % 2 == 0 else 0.16)
            a = math.pi / 4 * i - math.pi / 2
            pts.append((s / 2 + r * math.cos(a), s / 2 + r * math.sin(a)))
        d.polygon(pts, fill=_c(color))
    elif kind == "wave":
        d.rounded_rectangle([s * .10, s * .42, s * .28, s * .58], radius=int(s * .04),
                            fill=_c(color))
        d.polygon([(s * .30, s * .50), (s * .55, s * .24), (s * .55, s * .76)],
                  fill=_c(color))
        d.arc([s * .50, s * .28, s * .84, s * .72], -62, 62, fill=_c(color),
              width=int(s * .07))
    elif kind == "arrow":
        d.line([s * .16, s * .5, s * .82, s * .5], fill=_c(color), width=int(s * .09))
        d.polygon([(s * .16, s * .5), (s * .40, s * .30), (s * .40, s * .70)],
                  fill=_c(color))
    return im


def sticker(base, text, cx, cy, kind="target", tone="vio", rot=-2.5, size=11):
    """Étiquette à icône, posée en inclinaison légère avec ombre douce."""
    fill, fg = (VIO, CREAM) if tone == "vio" else (ORANGE, (30, 14, 6))
    tw_ = twidth(text, MICRO, size) + size * 0.22 * (len(text) - 1)
    padx, pady, ic = 14, 10, size * 1.55
    w_ = int((padx * 2 + ic + 7 + tw_) * SS)
    h_ = int((pady * 2 + max(ic, size)) * SS)
    im = Image.new("RGBA", (w_, h_), (0, 0, 0, 0))
    dr = ImageDraw.Draw(im)
    dr.rounded_rectangle([0, 0, w_ - 1, h_ - 1], radius=int(h_ * 0.22), fill=_c(fill))
    im.alpha_composite(icon(kind, ic / SS, fg), (int(padx * SS),
                                                 int((h_ - ic * SS) / 2)))
    f = tk._pil(MICRO, size)
    px = padx + ic / SS + 7
    for c in text:
        dr.text((px * SS, (h_ / 2 + size * 0.34 * SS)), c, font=f, fill=_c(fg),
                anchor="ls")
        px += dr.textlength(c, font=f) / SS + size * 0.22
    im = im.rotate(rot, expand=True, resample=Image.BICUBIC)
    shadowed(base, im, cx - im.width / (2 * SS), cy - im.height / (2 * SS))


# ── composition d'une ligne de titre ──────────────────────────────────────
def fit_size(lines, base, rtl, max_w=930):
    """Réduit la taille tant qu'une ligne dépasse la largeur utile."""
    name = AR_DISP if rtl else LAT_DISP

    def widest(sz):
        gap = sz * 0.22
        return max(sum(twidth(t, name, sz) for t, _ in toks)
                   + gap * (len(toks) - 1) for toks in lines)
    sz = base
    while sz > 40 and widest(sz) > max_w:
        sz -= 2
    return sz


def grow_height(lines, size, rtl, target=620, max_size=132, max_w=930):
    """Agrandit tant que la largeur le permet et que le bloc reste court."""
    name = AR_DISP if rtl else LAT_DISP
    gapf = 0.22
    while size + 4 <= max_size:
        lead = size * 1.36
        h = (len(lines) - 1) * lead + size * 1.12
        widest = max(sum(twidth(t, name, size + 4) for t, _ in toks)
                     + (size + 4) * gapf * (len(toks) - 1) for toks in lines)
        if h >= target or widest > max_w:
            break
        size += 4
    return size


def cap_height(lines, size, max_h):
    """Réduit la taille pour que le bloc tienne dans max_h."""
    while size > 40:
        h = sum(line_lead(l, size) for l in lines[:-1]) + size * 1.12
        if h <= max_h:
            break
        size -= 2
    return size


def line_lead(tokens, size):
    """Interligne : plus large quand la ligne porte un surligneur."""
    return size * (1.60 if any(t[1] for t in tokens) else 1.36)


def headline(base, tokens, y, size, rtl=True, cx=None, gapf=0.22):
    """tokens = [(texte, style)] ; style ∈ None | 'vio' | 'orange'."""
    cx = W / 2 if cx is None else cx
    gap = size * gapf
    widths = [twidth(t, AR_DISP if rtl else LAT_DISP, size) for t, _ in tokens]
    total = sum(widths) + gap * (len(tokens) - 1)
    x = cx + total / 2 if rtl else cx - total / 2
    for (text, style), tw_ in zip(tokens, widths):
        if style:
            fill = VIO if style == "vio" else ORANGE
            fg = CREAM if style == "vio" else (30, 14, 6)
            if rtl:
                il, ir, it, ib = ink_box(text, AR_DISP, size)
            else:
                il, ir, it, ib = ink_box(text, LAT_DISP, size)
            px, py = size * 0.12, size * 0.10
            base_x = (x - tw_) if rtl else x
            cx_ink = (il + ir) / 2 + base_x
            half = (ir - il) / 2 + px
            bx0, bx1 = cx_ink - half, cx_ink + half
            by0, by1 = y + it - py, y + ib + py
            bar(base, bx0, by0, bx1, by1, fill, radius=size * 0.04, rot=-1.4)
        else:
            fg = INK
        if rtl:
            arabic(base, text, x, y, size, fg, AR_DISP, "right")
            x -= tw_ + gap
        else:
            latin(base, text, x, y, size, fg, LAT_DISP, "left")
            x += tw_ + gap
    return y


def logo(base, y=96, x=M, mark=34, color=INK, disc=VIO):
    src = Image.open(LOGO).convert("RGBA")
    d = ImageDraw.Draw(base)
    cy = y - mark / 2
    if disc:
        d.ellipse([x * SS, (cy - mark / 2) * SS, (x + mark) * SS,
                   (cy + mark / 2) * SS], fill=_c(disc))
        h = mark * 0.60
        px = x + (mark - src.width * h / src.height) / 2
    else:
        h, px = mark, x
    w = src.width * h / src.height
    im = src.resize((max(1, int(w * SS)), max(1, int(h * SS))), Image.LANCZOS)
    base.alpha_composite(im, (int(px * SS), int((cy - h / 2) * SS)))
    mono(base, "SAWTIFY", x + mark + 12, y - 1, 12, color)


def kicker(base, pub, text, x, y, color=VIO):
    if pub["rtl"]:
        arabic(base, text, x, y + 4, 19, color, AR_DISP, "left")
    else:
        mono(base, text, x, y, 10, color)


def bodyline(base, pub, text, y, size=26, color=MUT):
    if pub["rtl"]:
        arabic(base, text, W / 2, y, size, color, AR_BODY, "center")
    else:
        latin(base, text, W / 2, y, size, color, MICRO_M, "center", 0.4)


def photo_strip(base, path, x, y, w, h, fx=0.5, fy=0.4):
    im = Image.open(path).convert("L")
    im = ImageOps.autocontrast(im, cutoff=1)
    tw_, th_ = int(w * SS), int(h * SS)
    k = max(tw_ / im.width, th_ / im.height)
    im = im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.LANCZOS)
    l = int(max(0, min(im.width - tw_, im.width * fx - tw_ / 2)))
    t = int(max(0, min(im.height - th_, im.height * fy - th_ / 2)))
    base.alpha_composite(im.crop((l, t, l + tw_, t + th_)).convert("RGBA"),
                         (int(x * SS), int(y * SS)))


def baseline(base, rtl=True):
    rule(base, 1150, M, W - M, (24, 18, 38, 40), 1.1)
    latin(base, "STUDIO · ALGER", M, 1182, 10, MUT, MICRO_M, "left", 2.4)
    latin(base, "DARIJA · 2026", W - M, 1182, 10, MUT, MICRO_M, "right", 2.4)


def page(base, n, total=5, rtl=True):
    mono(base, f"{n:02d} / {total:02d}", W - M, H - 58, 10, MUT, MICRO_M, "right")
    mono(base, "SAWTIFY.SPACE", M, H - 58, 10, MUT, MICRO_M, "left")
    for i in range(total):
        cx = W - M - (total - 1 - i) * 18
        col = ORANGE if i == n - 1 else (24, 18, 38, 40)
        bar(base, cx - 4, H - 86, cx + 4, H - 78, _c(col), radius=1.5)


def rule(base, y, x0=M, x1=W - M, color=(24, 18, 38, 55), wpx=1.1):
    ImageDraw.Draw(base).line([x0 * SS, y * SS, x1 * SS, y * SS],
                              fill=_c(color), width=max(1, int(wpx * SS)))


def arrow_left(base, x, y, size=16, color=INK):
    d = ImageDraw.Draw(base)
    d.line([x * SS, y * SS, (x + size * 2) * SS, y * SS], fill=_c(color),
           width=int(2.2 * SS))
    d.line([(x + size * .7) * SS, (y - size * .55) * SS, x * SS, y * SS],
           fill=_c(color), width=int(2.2 * SS))
    d.line([(x + size * .7) * SS, (y + size * .55) * SS, x * SS, y * SS],
           fill=_c(color), width=int(2.2 * SS))


# ── slides ────────────────────────────────────────────────────────────────
def s1(pub):
    b = sheet(seed=pub["seed"])
    logo(b, 96)
    mono(b, pub["s1"]["meta"], W - M, 94, 10, MUT, MICRO_M, "right")
    kicker(b, pub, pub["s1"]["serie"], M, 168, ORANGE)

    size = cap_height(pub["s1"]["lines"], grow_height(pub["s1"]["lines"], fit_size(pub["s1"]["lines"], 96, pub["rtl"]), pub["rtl"]), 455)
    y = 320
    for line in pub["s1"]["lines"]:
        headline(b, line, y, size, pub["rtl"])
        y += line_lead(line, size)

    y += 26
    bodyline(b, pub, pub["s1"]["body"], 846, 26)
    bodyline(b, pub, pub["s1"]["body2"], 890, 26)

    photo_strip(b, PHOTOS / "phone-hand.jpg", M, 926, W - 2 * M, 176, fx=0.5, fy=0.5)
    rule(b, 1112, M, W - M, (24, 18, 38, 45), 1.1)
    latin(b, "STUDIO · ALGER", M, 1144, 10, MUT, MICRO_M, "left", 2.4)
    latin(b, "DARIJA · 2026", W - M, 1144, 10, MUT, MICRO_M, "right", 2.4)

    arrow_left(b, M, 1214, 14, INK)
    if pub["rtl"]:
        arabic(b, "اسحب", M + 54, 1220, 20, INK, AR_DISP, "left")
    else:
        mono(b, "SWIPE", M + 56, 1216, 12, INK)
    page(b, 1, total=5)
    return b


def s2(pub):
    b = sheet(seed=pub["seed"] + 1)
    logo(b, 96)
    mono(b, pub["s2"]["meta"], W - M, 94, 10, MUT, MICRO_M, "right")
    kicker(b, pub, pub["s2"]["kicker"], M, 300, VIO)

    n = len(pub["s2"]["lines"])
    size = cap_height(pub["s2"]["lines"], grow_height(pub["s2"]["lines"], fit_size(pub["s2"]["lines"], 86 if n <= 3 else 80, pub["rtl"]), pub["rtl"], target=560), 430)
    y = 380
    for line in pub["s2"]["lines"]:
        headline(b, line, y, size, pub["rtl"])
        y += line_lead(line, size)

    bodyline(b, pub, pub["s2"]["body"], y + 40, 26)
    sticker(b, pub["s2"]["sticker"], W * 0.5, y + 172, "target", "vio", -3)
    baseline(b, pub["rtl"])
    page(b, 2, total=5)
    return b


def s3(pub):
    b = sheet(seed=pub["seed"] + 2)
    logo(b, 96)
    mono(b, pub["s3"]["meta"], W - M, 94, 10, MUT, MICRO_M, "right")
    tsz = fit_size([[(pub["s3"]["title"], None)]], 82, pub["rtl"])
    name = AR_DISP if pub["rtl"] else LAT_DISP
    ttw = twidth(pub["s3"]["title"], name, tsz)
    tcx = (W - M - ttw / 2) if pub["rtl"] else (M + ttw / 2)
    headline(b, [(pub["s3"]["title"], None)], 330, tsz, pub["rtl"], cx=tcx)

    y = 505
    for num, ttl, sub in pub["s3"]["rows"]:
        latin(b, num, M, y + 34, 34, VIO, LAT_DISP, "left")
        if pub["rtl"]:
            arabic(b, ttl, W - M, y + 40, 34, INK, AR_DISP, "right")
            arabic(b, sub, W - M, y + 82, 22, MUT, AR_BODY, "right")
        else:
            latin(b, ttl, M + 86, y + 40, 24, INK, MICRO, "left", 0.6)
            latin(b, sub, M + 86, y + 78, 17, MUT, MICRO_M, "left", 0)
        rule(b, y + 134, M, W - M, (24, 18, 38, 35), 1.0)
        y += 190
    baseline(b, pub["rtl"])
    page(b, 3, total=5)
    return b


def s4(pub):
    b = sheet(seed=pub["seed"] + 3)
    logo(b, 96)
    mono(b, pub["s4"]["meta"], W - M, 94, 10, MUT, MICRO_M, "right")
    kicker(b, pub, pub["s4"]["kicker"], M, 300, VIO)

    y = 470
    a, bb = pub["s4"]["a"], pub["s4"]["b"]
    wa = twidth(a, LAT_DISP if not pub["rtl"] else AR_DISP, 96)
    wb = twidth(bb, LAT_DISP if not pub["rtl"] else AR_DISP, 96)
    gap = 96
    x0 = W / 2 - (wa + gap + wb) / 2
    headline(b, [(a, None)], y, 96, pub["rtl"], cx=x0 + wa / 2)
    arabic(b, pub["s4"]["la"], x0 + wa / 2, y + 70, 22, MUT, AR_BODY, "center")
    headline(b, [(bb, "vio")], y, 96, pub["rtl"], cx=x0 + wa + gap + wb / 2)
    arabic(b, pub["s4"]["lb"], x0 + wa + gap + wb / 2, y + 70, 22, MUT, AR_BODY, "center")

    rule(b, 640, M, W - M, (24, 18, 38, 40), 1.1)
    bodyline(b, pub, pub["s4"]["body"], 700, 26)
    bodyline(b, pub, pub["s4"]["body2"], 746, 26)
    sticker(b, pub["s4"]["sticker"], W * 0.5, 596, "spark", "orange", 2.5)
    baseline(b, pub["rtl"])
    page(b, 4, total=5)
    return b


def s5(pub):
    b = sheet(seed=pub["seed"] + 4, glow=0.09)
    logo(b, 96)
    mono(b, pub["s5"]["meta"], W - M, 94, 10, MUT, MICRO_M, "right")

    size = cap_height(pub["s5"]["lines"], grow_height(pub["s5"]["lines"], fit_size(pub["s5"]["lines"], 96, pub["rtl"]), pub["rtl"]), 360)
    y = 320
    for line in pub["s5"]["lines"]:
        headline(b, line, y, size, pub["rtl"])
        y += line_lead(line, size)

    bodyline(b, pub, pub["s5"]["sub"], y + 44, 26)

    bar(b, M, 820, W - M, 948, ORANGE, radius=6)
    if pub["rtl"]:
        arabic(b, pub["s5"]["cta"], W - M - 40, 902, 38, INK, AR_DISP, "right")
        latin(b, "sawtify.space", W - M - 40, 938, 16, (60, 24, 10), MICRO, "right", 1.2)
        arrow_left(b, M + 40, 884, 16, INK)
    else:
        latin(b, pub["s5"]["cta"], M + 40, 902, 38, INK, MICRO, "left", 0)
        latin(b, "sawtify.space", M + 40, 938, 16, (60, 24, 10), MICRO, "left", 1.2)
        ImageDraw.Draw(b).line([(W - M - 90) * SS, 884 * SS, (W - M - 40) * SS, 884 * SS],
                               fill=_c(INK), width=int(2.2 * SS))
        ImageDraw.Draw(b).line([(W - M - 62) * SS, 870 * SS, (W - M - 40) * SS, 884 * SS],
                               fill=_c(INK), width=int(2.2 * SS))
        ImageDraw.Draw(b).line([(W - M - 62) * SS, 898 * SS, (W - M - 40) * SS, 884 * SS],
                               fill=_c(INK), width=int(2.2 * SS))

    bodyline(b, pub, pub["s5"]["note"], 1006, 23)
    baseline(b, pub["rtl"])
    page(b, 5, total=5)
    return b


SLIDES = [s1, s2, s3, s4, s5]


# ═══════════════════════════════════════════════════════════════════════════
DZ = {
    "id": "dz", "rtl": True, "seed": 21,
    "s1": {
        "meta": "N° 01 — ALGER · 2026", "serie": "سلسلة السوم",
        "lines": [[("الصوت", None)], [("تاعك،", None)], [("بدارجة", "vio")]],
        "body": "خمس مية دج، توصلك في 24 ساعة،",
        "body2": "و تسمعها قبل ما تخلّص.",
    },
    "s2": {
        "meta": "N° 02 — LE MÉCANISME", "kicker": "علاش هكاك",
        "lines": [[("دماغك", None)], [("ياخذ", None)], [("أول سوم", "orange")],
                  [("و يوقف عليه", None)]],
        "body": "كل سوم بعدو يتقاس بيه، ماشي بالسوق.",
        "sticker": "LE MÉCANISME",
    },
    "s3": {
        "meta": "N° 03 — LES GESTES", "kicker": "LES GESTES", "title": "ثلاث حركات",
        "rows": [("01", "بيّن المرجع", "السوم قبل، ماشي بعد."),
                 ("02", "فسّر السوم", "علاش هاد الرقم بالضبط."),
                 ("03", "قارن بوضوح", "الفرق يبان في الثانية.")],
    },
    "s4": {
        "meta": "N° 04 — LA PREUVE", "kicker": "الفرق",
        "a": "3 000", "b": "500", "la": "سوم السوق", "lb": "سومنا",
        "body": "حطينا المرجع قبل السوم،",
        "body2": "500 دج ولّات صفقة واضحة.",
        "sticker": "×6",
    },
    "s5": {
        "meta": "N° 05 — COMMANDER",
        "lines": [[("خود", None)], [("الصوت", "vio")], [("في 24 ساعة", None)]],
        "sub": "صوت واحد، بدارجة، يوصلك غدوة.",
        "cta": "دير طلب تاعك",
        "note": "اكتبلنا «صوت» في الرسائل، ولا دخل مباشرة.",
    },
}

FR = {
    "id": "fr", "rtl": False, "seed": 32,
    "s1": {
        "meta": "N° 01 — ALGER · 2026", "serie": "LA SÉRIE DU PRIX",
        "lines": [[("LE PRIX", None)], [("QUI SE", None)], [("DÉFEND", "vio")]],
        "body": "500 DA, livrés en 24 h,",
        "body2": "et vous écoutez avant de payer.",
    },
    "s2": {
        "meta": "N° 02 — LE MÉCANISME", "kicker": "POURQUOI",
        "lines": [[("VOTRE", None)], [("CERVEAU", None)], [("PREND LE", None)],
                  [("PREMIER PRIX", "orange")]],
        "body": "Chaque prix se juge par rapport au précédent, pas au marché.",
        "sticker": "LE MÉCANISME",
    },
    "s3": {
        "meta": "N° 03 — LES GESTES", "kicker": "TROIS GESTES", "title": "Trois gestes",
        "rows": [("01", "MONTRER LA RÉFÉRENCE", "Le prix d'avant, pas celui d'après."),
                 ("02", "EXPLIQUER LE PRIX", "Pourquoi ce chiffre, exactement."),
                 ("03", "COMPARER À PLAT", "L'écart se voit en une seconde.")],
    },
    "s4": {
        "meta": "N° 04 — LA PREUVE", "kicker": "L'ÉCART",
        "a": "3 000", "b": "500", "la": "LE MARCHÉ", "lb": "NOUS",
        "body": "La référence annoncée avant le prix,",
        "body2": "500 DA devient une évidence.",
        "sticker": "×6",
    },
    "s5": {
        "meta": "N° 05 — COMMANDER",
        "lines": [[("VOTRE", None)], [("VOIX", "vio")], [("EN 24 H", None)]],
        "sub": "Une voix, en darija, livrée demain.",
        "cta": "Passez commande",
        "note": "Écrivez « voix » en message, ou commandez en ligne.",
    },
}

PUBS = [DZ, FR]


def render(pub):
    d = OUT / pub["id"]
    d.mkdir(parents=True, exist_ok=True)
    for i, fn in enumerate(SLIDES):
        im = fn(pub)
        im.convert("RGB").resize((W, H), Image.LANCZOS).save(
            d / f"{i + 1:02d}.jpg", quality=95, optimize=True, subsampling=1)
        print("  ✓", pub["id"], f"{i + 1:02d}")


def planches():
    for pub in PUBS:
        files = sorted((OUT / pub["id"]).glob("*.jpg"))
        tw_, th_ = 500, 625
        sh = Image.new("RGB", (len(files) * (tw_ + 8) + 8, th_ + 16), (24, 20, 32))
        for i, f in enumerate(files):
            sh.paste(Image.open(f).convert("RGB").resize((tw_, th_), Image.LANCZOS),
                     (8 + i * (tw_ + 8), 8))
        sh.save(OUT / f"planche-{pub['id']}.jpg", quality=93, optimize=True)
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
