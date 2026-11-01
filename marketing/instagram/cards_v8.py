#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════
 cards_v8.py — SYSTÈME « CARTES VIOLET » v8 (refonte typographique)

 Ce que la v7 avait de faux, et qui est corrigé ici :
   • typo arabe : une taille par ligne → un seul corps par bloc, interligne
     réel, alignement à droite sur la même colonne, bas de bloc mesuré sur
     l'encre (plus de trou entre le titre et la carte) ;
   • vide : la grille est calculée pour remplir 152 → 1168 px sur chaque
     slide (rangées élastiques, bandeaux pleine largeur, carte photo) ;
   • cartes : rayon, ombre, marge interne 32, rangée d'en-tête (tuile icône
     + label), hiérarchie titre/corps, hauteur calculée — plus de boîte
     blanche vide avec deux mots dedans.

   python3 cards_v8.py                  # tout
   python3 cards_v8.py --only p1        # une publication
   python3 cards_v8.py --planches
═══════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from editorial_slides import photo as _photo
from premium import icon as _icon
from sawtify_ig import font, visual

OUT = Path(__file__).resolve().parent / "slides" / "cards"

W, H = 1080, 1350
SS = 2
M = 64
L, R = M, W - M
CW = R - L                       # 952

VIO = (109, 40, 217)
VIO2 = (139, 92, 246)
DEEP = (40, 14, 88)
INK = (24, 14, 44)
WHITE = (250, 249, 255)
AURA = (255, 94, 58)
LIL = (237, 233, 254)
SOFT = (196, 184, 224)
SOFT_D = (124, 108, 156)

AR_B = "IBMPlexSansArabic-Bold.ttf"
AR_S = "IBMPlexSansArabic-SemiBold.ttf"
AR_R = "IBMPlexSansArabic-Regular.ttf"
SG_B = "SpaceGrotesk-Bold.ttf"
SG_M = "SpaceGrotesk-Medium.ttf"
ANTON = "Anton-Regular.ttf"

Y0, Y1 = 152, 1168               # zone de contenu
HEAD_RULE = 120
FOOT_RULE = 1196


# ═══════════════════════════════════════════════════════════════════════════
#  primitives
# ═══════════════════════════════════════════════════════════════════════════
def new_layer():
    return Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))


def rr(base, box, radius, color, alpha=255):
    """Rectangle arrondi translucide RÉELLEMENT composé."""
    x0, y0, x1, y1 = [float(v) for v in box]
    w, h = int(round((x1 - x0) * SS)), int(round((y1 - y0) * SS))
    if w < 2 or h < 2:
        return
    lay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(lay).rounded_rectangle(
        [0, 0, w - 1, h - 1], radius=radius * SS, fill=(*color, alpha))
    base.alpha_composite(lay, (int(round(x0 * SS)), int(round(y0 * SS))))


def shade(base, box, radius, blur=18, alpha=54, dy=10):
    x0, y0, x1, y1 = box
    lay = new_layer()
    ImageDraw.Draw(lay).rounded_rectangle(
        [x0 * SS, (y0 + dy) * SS, x1 * SS, (y1 + dy) * SS],
        radius=radius * SS, fill=(20, 8, 40, alpha))
    base.alpha_composite(lay.filter(ImageFilter.GaussianBlur(blur * SS / 2)))


def rule(base, x0, x1, y, color=WHITE, alpha=60, width=1.0):
    d = ImageDraw.Draw(base)
    d.line([x0 * SS, y * SS, x1 * SS, y * SS], fill=(*color, alpha),
           width=max(1, int(width * SS)))


def txt_len(text, fname, size, track=0.0):
    f = font(fname, size)
    d = ImageDraw.Draw(Image.new("RGB", (4, 4)))
    w = d.textlength(visual(text), font=f) / SS
    if track:
        w += track * max(0, len(text) - 1)
    return w


def lab(base, text, x, y, size=9.5, color=SOFT, anchor="ls", track=2.0,
        fname=SG_M):
    """Micro-label latin, interlettré (jamais pour de l'arabe)."""
    f = font(fname, size)
    d = ImageDraw.Draw(base)
    t = text.upper()
    if anchor[0] == "r":
        d.text((x * SS, y * SS), t, font=f, fill=color, anchor="rs",
               stroke_width=0)
    elif anchor[0] == "m":
        d.text((x * SS, y * SS), t, font=f, fill=color, anchor="ms")
    else:
        d.text((x * SS, y * SS), t, font=f, fill=color, anchor="ls")
    return x


def track_text(base, text, x, y, size, color, fname=SG_M, track=2.0):
    """Latin interlettré, dessiné caractère par caractère (contrôle exact)."""
    f = font(fname, size)
    d = ImageDraw.Draw(base)
    cx = x
    for ch in text:
        d.text((cx * SS, y * SS), ch, font=f, fill=color, anchor="ls")
        cx += d.textlength(ch, font=f) / SS + track
    return cx - track


# ── typographie arabe ─────────────────────────────────────────────────────
def _ar_draw(layer, text, xr, y, size, color, fname, max_w, leading, hi=None):
    """Dessine un paragraphe arabe sur `layer`. Retourne le bas RÉEL d'encre."""
    from sawtify_ig import ar_para
    before = layer.getbbox()
    ar_para(layer, xr, y, text, size, fname, color, max_w=max_w,
            leading=leading, hi_color=hi or color)
    after = layer.getbbox()
    if after is None:
        return y
    return after[3] / SS


def stack(base, lines, xr, y, max_w, size, color=WHITE, fname=AR_B,
          leading=1.16, floor=22, hi=None):
    """Bloc de titres : UN corps pour toutes les lignes (min qui tient)."""
    sizes = [size]
    for t in lines:
        s = size
        while s > floor and txt_len(t, fname, s) > max_w:
            s -= 1
        sizes.append(s)
    s = min(sizes)
    lay = new_layer()
    yy = y
    for t in lines:
        yy += s * leading
        _ar_draw(lay, t, xr, y + (yy - y) - s * leading, s, color, fname,
                 max_w, leading, hi)
    bb = lay.getbbox()
    if bb is None:
        return y + s * leading * len(lines)
    base.alpha_composite(lay)
    return bb[3] / SS


def body(base, text, xr, y, max_w, size=18, color=None, fname=AR_R,
         leading=1.62, hi=AURA):
    """Paragraphe arabe (retour à la ligne auto), bas mesuré."""
    color = color or SOFT
    lay = new_layer()
    bottom = _ar_draw(lay, text, xr, y, size, color, fname, max_w, leading, hi)
    base.alpha_composite(lay)
    return bottom



def alab(base, text, xr, y, size=15, color=SOFT, fname=AR_S, lead=1.2):
    """Micro-label ARABE (jamais de police latine sur de l'arabe)."""
    lay = new_layer()
    bottom = _ar_draw(lay, text, xr, y, size, color, fname,
                      txt_len(text, fname, size) + 30, lead, color)
    base.alpha_composite(lay)
    return bottom


def _ar_h(text, size, fname, max_w):
    """Hauteur réelle d'un paragraphe arabe."""
    lay = new_layer()
    return _ar_draw(lay, text, 900, 0, size, (255, 255, 255), fname, max_w,
                    1.5, (255, 255, 255))


def alab_l(base, text, x, y, size=15, color=SOFT, fname=AR_S, lead=1.2):
    """Micro-label arabe aligné à GAUCHE (largeur mesurée d'abord)."""
    w = txt_len(text, fname, size)
    return alab(base, text, x + w, y, size, color, fname, lead)


def center_ar(base, text, cx, cy_mid, size, color, fname=AR_S):
    lay = new_layer()
    _ar_draw(lay, text, cx + max_w_guess(text, fname, size) / 2, cy_mid, size,
             color, fname, max_w_guess(text, fname, size) + 40, 1.2, color)
    bb = lay.getbbox()
    if bb is None:
        return
    ink = lay.crop(bb)
    base.alpha_composite(ink, (int(cx * SS - ink.width / 2),
                               int(cy_mid * SS - ink.height / 2)))


def max_w_guess(text, fname, size):
    return txt_len(text, fname, size) + 12


def num(base, text, x, y, size, color=WHITE, anchor="ls", track=-1.0,
        fname=ANTON):
    f = font(fname, size)
    d = ImageDraw.Draw(base)
    d.text((x * SS, y * SS), text, font=f, fill=color, anchor=anchor)


# ═══════════════════════════════════════════════════════════════════════════
#  fond, en-tête, pied
# ═══════════════════════════════════════════════════════════════════════════
def bg(dots=True):
    base = Image.new("RGBA", (W * SS, H * SS), (*VIO, 255))
    glow = new_layer()
    d = ImageDraw.Draw(glow)
    d.ellipse([-260 * SS, -320 * SS, 520 * SS, 460 * SS], fill=(*VIO2, 120))
    d.ellipse([760 * SS, 940 * SS, 1360 * SS, 1540 * SS], fill=(*DEEP, 130))
    base.alpha_composite(glow.filter(ImageFilter.GaussianBlur(140)))
    if dots:
        grid = new_layer()
        gd = ImageDraw.Draw(grid)
        for gx in range(0, W, 36):
            for gy in range(0, H, 36):
                gd.ellipse([gx * SS, gy * SS, (gx + 2) * SS, (gy + 2) * SS],
                           fill=(255, 255, 255, 16))
        base.alpha_composite(grid)
    return base


def header(base, serie, page, total, dark=False):
    col = WHITE if not dark else INK
    lab(base, "sawtify", L, 92, 15, col, track=3.2, fname=SG_B)
    lab(base, serie, R, 74, 9, col, anchor="rs", track=2.2,
        fname=SG_M)
    lab(base, f"{page:02d} / {total:02d}", R, 96, 9, col, anchor="rs", track=2.0,
        fname=SG_M)
    rule(base, L, R, HEAD_RULE, col, 46)


def footer(base, k, n, dark=False):
    col = WHITE if not dark else INK
    rule(base, L, R, FOOT_RULE, col, 46)
    lab(base, "sawtify.space", L, 1240, 9.5, col, track=2.0, fname=SG_M)
    step, r = 13, 3.4
    x0 = W / 2 - (n - 1) * step / 2
    d = ImageDraw.Draw(base)
    for i in range(n):
        cx = x0 + i * step
        d.ellipse([(cx - r) * SS, (1240 - r - 6) * SS,
                   (cx + r) * SS, (1240 + r - 6) * SS],
                  fill=(*AURA, 255) if i == k else (255, 255, 255, 110))
    # pastille swipe
    label = "SWIPE"
    w = txt_len(label, SG_M, 9.5, 2.0) + 74
    x0 = R - w
    rr(base, (x0, 1214, R, 1258), 22, (255, 255, 255), 255)
    track_text(base, label, x0 + 22, 1242, 9.5, VIO, SG_M, 1.8)
    ax = R - 24
    dd = ImageDraw.Draw(base)
    dd.line([(ax - 14) * SS, 1236 * SS, ax * SS, 1236 * SS], fill=(*VIO, 255),
            width=4)
    dd.line([(ax - 6) * SS, 1230 * SS, ax * SS, 1236 * SS], fill=(*VIO, 255),
            width=4)
    dd.line([(ax - 6) * SS, 1242 * SS, ax * SS, 1236 * SS], fill=(*VIO, 255),
            width=4)


# ═══════════════════════════════════════════════════════════════════════════
#  composants
# ═══════════════════════════════════════════════════════════════════════════
def card(base, box, fill=WHITE, radius=26, alpha=255, shadow=True):
    if shadow:
        shade(base, box, radius)
    rr(base, box, radius, fill, alpha)


def icon_tile(base, x, y, size, name, fill=(237, 233, 254), col=VIO,
              stroke=2.2):
    rr(base, (x, y, x + size, y + size), size * 0.30, fill, 255)
    _icon(base, name, x + size / 2, y + size / 2, size * 0.44, color=col,
          stroke=stroke)


def photo_card(base, path, box, radius=26, duo=1, fy=0.4, label=None):
    shade(base, box, radius)
    _photo(base, path, box, duo=duo, fy=fy, radius=radius)
    if label:
        lab(base, label, box[0] + 20, box[3] - 16, 8.5, (255, 255, 255),
            track=1.6)


def chip(base, xr, y, text, fill=WHITE, col=VIO, alpha=255, size=9.5,
         h=34, pad=18):
    w = txt_len(text, SG_M, size, 1.8) + 2 * pad
    rr(base, (xr - w, y, xr, y + h), h / 2, fill, alpha)
    track_text(base, text, xr - w + pad, y + h / 2 + size * 0.36, size, col,
               SG_M, 1.8)
    return w


def chip_ar(base, xr, y, text, fill=WHITE, col=VIO, alpha=255, size=15,
            h=40, pad=22):
    w = txt_len(text, AR_S, size) + 2 * pad
    rr(base, (xr - w, y, xr, y + h), h / 2, fill, alpha)
    center_ar(base, text, xr - w / 2, y + h / 2 - 1, size, col)
    return w


def band(base, y, h, items, fill=DEEP, radius=22, value_col=WHITE,
         label_col=(200, 190, 232)):
    """Bandeau 3 colonnes : grande valeur latine + label arabe centré."""
    rr(base, (L, y, R, y + h), radius, fill, 255)
    for i, (k_, v_) in enumerate(items):
        cx = L + (i + 0.5) * CW / 3
        num(base, v_, cx, y + h * 0.52, 34, value_col, anchor="ms")
        alab(base, k_, cx + txt_len(k_, AR_S, 15) / 2, y + h * 0.62, 15,
             label_col)
        if i:
            d = ImageDraw.Draw(base)
            d.line([(L + i * CW / 3) * SS, (y + h * 0.24) * SS,
                    (L + i * CW / 3) * SS, (y + h * 0.74) * SS],
                   fill=(255, 255, 255, 46), width=2)


# ═══════════════════════════════════════════════════════════════════════════
#  squelettes de slide
# ═══════════════════════════════════════════════════════════════════════════
def s_cover(p, page=1):
    base = bg()
    header(base, p["tag"], page, p["n"])
    if any("\u0600" <= c <= "\u06ff" for c in p["chip"]):
        chip_ar(base, R, 144, p["chip"])
    else:
        chip(base, R, 148, p["chip"], alpha=255, col=VIO)
    y = stack(base, p["cover"], R, Y0 + 8, CW, p["cover_size"], WHITE,
              leading=1.08)
    # ── carte de preuve : deux chiffres face à face, séparés par un filet
    top = y + 24
    ch = 196
    card(base, (L, top, R, top + ch))
    alab_l(base, p["price_a_tag"], L + 34, top + 42, 14, SOFT_D)
    alab(base, p["price_b_tag"], R - 34, top + 42, 14, SOFT_D)
    sz_a = 78 if txt_len(p["price_a"], ANTON, 78) < 340 else 64
    num(base, p["price_a"], L + 34, top + ch - 34, sz_a, INK)
    if p.get("strike", True):
        wa = txt_len(p["price_a"], ANTON, sz_a)
        ImageDraw.Draw(base).line(
            [(L + 28) * SS, (top + ch - 34 - sz_a * 0.32) * SS,
             (L + 44 + wa) * SS, (top + ch - 34 - sz_a * 0.32) * SS],
            fill=(*AURA, 255), width=9)
    sz_b = 96 if txt_len(p["price_b"], ANTON, 96) < 300 else 78
    num(base, p["price_b"], R - 34, top + ch - 34, sz_b, AURA, anchor="rs")
    ImageDraw.Draw(base).line([(W / 2) * SS, (top + 46) * SS,
                               (W / 2) * SS, (top + ch - 34) * SS],
                              fill=(*SOFT_D, 70), width=2)
    # ── carte photo + colonne de notes
    ph_top = top + ch + 26
    ph_h = Y1 - ph_top - 100
    photo_card(base, p["photo"], (L, ph_top, L + 430, ph_top + ph_h),
               label=p["photo_label"])
    body(base, p["proof_note"], R, ph_top + 2, R - (L + 462), 16.5, WHITE,
         leading=1.6, hi=(255, 214, 120))
    yb = body(base, p["photo_note"], R, ph_top + 128, R - (L + 462), 16, SOFT,
              leading=1.56, hi=WHITE)
    # ── rangées de specs, ancrées au bas de la colonne (aucun vide)
    specs = p["cover_specs"]
    rx = L + 462
    rh = 62
    sy = ph_top + ph_h - len(specs) * rh
    for i, (k_, v_) in enumerate(specs):
        yy = sy + i * rh
        rule(base, rx, R, yy, WHITE, 44)
        num(base, v_, rx, yy + 44, 24, WHITE)
        alab(base, k_, R, yy + 38, 14, SOFT)
    band(base, Y1 - 92, 92, p["cover_band"], radius=18)
    footer(base, 0, p["n"])
    return base


def s_compare(p, page=2):
    """Deux cartes chiffrées + une carte de verdict : la zone est pleine."""
    base = bg()
    header(base, p["tag"], page, p["n"])
    y = stack(base, p["t2"], R, Y0, 800, 48, WHITE, leading=1.14)
    y = body(base, p["b2"], R, y + 16, 800, 17, SOFT, leading=1.6)
    top = y + 30
    gap = 20
    cw = (CW - gap) / 2
    ch = 430
    for i, (big, bigc, tag, note) in enumerate(p["rows"]):
        x0 = L + i * (cw + gap)
        card(base, (x0, top, x0 + cw, top + ch), fill=WHITE)
        alab(base, tag, x0 + cw - 26, top + 40, 15, SOFT_D)
        sz = 128 if txt_len(big, ANTON, 128) < cw - 52 else 100
        num(base, big, x0 + 26, top + 172, sz, bigc)
        rule(base, x0 + 26, x0 + cw - 26, top + 202, SOFT_D, 70)
        body(base, note, x0 + cw - 26, top + 226, cw - 52, 16.5, (72, 56, 108),
             leading=1.56, hi=VIO)
        # verdict : pastille pleine largeur, texte centré par mesure
        pw = cw - 52
        rr(base, (x0 + 26, top + ch - 74, x0 + 26 + pw, top + ch - 26), 24,
           AURA if i else (237, 233, 254), 255)
        center_ar(base, p["verdict"][i], x0 + 26 + pw / 2, top + ch - 50, 16,
                  WHITE if i else VIO)
    vy = top + ch + 18
    vh = Y1 - 92 - 18 - vy
    card(base, (L, vy, R, vy + vh), fill=(18, 10, 34), radius=22)
    icon_tile(base, L + 26, vy + 26, 52, "bolt", (255, 255, 255), AURA, 2.6)
    sy = stack(base, [p["v2"]], R - 26, vy + 18, 800, 23, WHITE, fname=AR_S,
               leading=1.2)
    body(base, p["vb2"], R - 26, sy + 4, 800, 15.5, (206, 196, 236),
         leading=1.5, hi=(255, 214, 120))
    band(base, Y1 - 92, 92, p["band"], radius=18)
    footer(base, 1, p["n"])
    return base


def _ar_measure(text, size, fname, max_w, leading):
    lay = new_layer()
    _ar_draw(lay, text, 1000, 20, size, (255, 255, 255), fname, max_w, leading,
             (255, 255, 255))
    bb = lay.getbbox()
    if bb is None:
        return 0
    return (bb[3] - bb[1]) / SS


def s_rows(p, page=3):
    """Rangées élastiques : texte mesuré puis centré, numéro fantôme."""
    base = bg()
    header(base, p["tag"], page, p["n"])
    y = stack(base, p["t3"], R, Y0, 800, 48, WHITE, leading=1.14)
    y = body(base, p["b3"], R, y + 14, 780, 17, SOFT, leading=1.6)
    top = y + 34
    rows = p["rows3"]
    gap = 14
    bandt = Y1 - 92 - 16
    hrow = (bandt - top - gap * (len(rows) - 1)) / len(rows)
    tx_r = R - 30
    tx_w = 650
    for i, (ic, tete, corps) in enumerate(rows):
        yy = top + i * (hrow + gap)
        card(base, (L, yy, R, yy + hrow))
        num(base, f"0{i+1}", L + 10, yy + hrow * 0.74, hrow * 0.60, LIL)
        icon_tile(base, L + 172, yy + (hrow - 56) / 2, 56, ic)
        h1 = _ar_measure(tete, 26, AR_S, tx_w, 1.2)
        h2 = _ar_measure(corps, 16.5, AR_R, tx_w, 1.5)
        blk = h1 + h2 + 12
        ty = yy + (hrow - blk) / 2
        stack(base, [tete], tx_r, ty, tx_w, 26, INK, fname=AR_S, leading=1.2)
        body(base, corps, tx_r, ty + h1 + 12, tx_w, 16.5, (72, 56, 108),
             leading=1.5, hi=VIO)
    band(base, Y1 - 92, 92, p["band3"], radius=18)
    footer(base, 2, p["n"])
    return base


def s_split(p, page=4):
    """Photo pleine hauteur + cartes numérotées, contenu mesuré et centré."""
    base = bg()
    header(base, p["tag"], page, p["n"])
    y = stack(base, p["t4"], R, Y0, 520, 44, WHITE, leading=1.12)
    ph_top = y + 20
    photo_card(base, p["photo2"], (L, ph_top, L + 368, Y1), duo=1, fy=0.3,
               label=p["photo2_label"])
    x0 = L + 396
    xr = R - 24
    tw_ = xr - (x0 + 24)
    items = p["rows4"]
    gap = 12
    hrow = (Y1 - ph_top - gap * (len(items) - 1)) / len(items)
    for i, (tete, corps) in enumerate(items):
        yy = ph_top + i * (hrow + gap)
        dark = i == 1
        card(base, (x0, yy, R, yy + hrow), fill=(AURA if dark else WHITE))
        num(base, f"0{i+1}", x0 + 24, yy + 44, 24, INK if dark else VIO)
        h1 = _ar_measure(tete, 22, AR_S, tw_, 1.2)
        h2 = _ar_measure(corps, 15.5, AR_R, tw_, 1.5)
        blk = 16 + h1 + 10 + h2
        ty = yy + max(20, (hrow - blk) / 2)
        stack(base, [tete], xr, ty + 16, tw_, 22, INK, fname=AR_S, leading=1.2)
        body(base, corps, xr, ty + 16 + h1 + 10, tw_, 15.5,
             (66, 22, 12) if dark else (72, 56, 108), leading=1.5,
             hi=INK if dark else VIO)
    footer(base, 3, p["n"])
    return base


def s_end(p, page=5):
    base = bg()
    header(base, p["tag"], page, p["n"])
    y = stack(base, p["t5"], R, Y0, CW, 60, WHITE, leading=1.1)
    y = body(base, p["b5"], R, y + 20, 820, 18, SOFT, leading=1.6)
    top = y + 26
    card(base, (L, top, R, Y1), fill=DEEP, radius=30)
    # ── haut de carte : url + bouton + note
    alab_l(base, "التجربة قبل ما تخلّص", L + 34, top + 52, 15, (206, 196, 236))
    num(base, "sawtify.space", L + 34, top + 128, 44, WHITE, fname=SG_M)
    bw, bh = 400, 70
    rr(base, (L + 34, top + 152, L + 34 + bw, top + 152 + bh), 18, AURA, 255)
    center_ar(base, "خود الصوت تاعك", L + 34 + bw / 2, top + 152 + bh / 2 - 2,
              25, WHITE)
    body(base, p["b5_note"], R - 34, top + 160, 420, 15.5, (206, 196, 236),
         leading=1.5, hi=(255, 214, 120))
    # ── bande photo pleine largeur, dans la carte
    ph_top = top + 260
    ph_bot = Y1 - 148
    photo_card(base, p["photo2"], (L + 22, ph_top, R - 22, ph_bot), duo=1,
               fy=0.34)
    # ── trio ancré en bas
    ty = Y1 - 122
    rule(base, L + 34, R - 34, ty, (255, 255, 255), 50)
    for i, (k_, v_) in enumerate(p["end_trio"]):
        cx = L + (i + 0.5) * CW / 3
        num(base, v_, cx, ty + 56, 30, WHITE, anchor="ms")
        center_ar(base, k_, cx, ty + 88, 14, (206, 196, 236))
    footer(base, 4, p["n"])
    return base


# ═══════════════════════════════════════════════════════════════════════════
#  les 3 publications
# ═══════════════════════════════════════════════════════════════════════════
PUBS = [
    {
        "id": "c1-ancrage", "n": 5, "tag": "ancrage · série prix",
        "chip": "3 chiffres, pas 50",
        "cover": ["أول سوم تسمعو،", "هو اللي يبقى", "في راسك."],
        "cover_size": 74,
        "proof_label": "المقارنة اللي تصنع الإحساس",
        "price_a": "3 000", "price_b": "500",
        "price_a_tag": "المرجع · سوم السوق", "price_b_tag": "سومنا · 30 ثانية",
        "proof_note": "نفس الصوت، نفس الجودة، نفس الوقت. الفرق الوحيد هو الترتيب اللي تعرض بيه السوم.",
        "photo": "studio-voice.jpg", "photo_label": "STUDIO · ALGER",
        "photo_note": "الفيديو تاعك يقرا بلا ما يسمع، حتى تجيب الصوت. 30 ثانية تفرق بين «شفت» و «سمعت».",
        "cover_band": [("المرجع", "3 000"), ("سومنا", "500"), ("التسليم", "24 h")],
        "cover_specs": [("الصوت", "DARIJA"), ("المدة", "30 s"), ("التعديل", "×2")],
        "t2": ["دماغك ياخذ", "أول رقم", "و يوقف عليه."],
        "b2": "السوم الأول يولّي هو الحكم: كل سوم بعدو يتقاس بيه، ماشي بالسوق. علاش 500 تبان رخيصة كي تجي بعد 3 000 — و تبان غالية كي تجي بوحدها.",
        "rows": [("3 000", INK, "بلا مرجع", "السوم بوحدو، بلا مقارنة، الزبون ما يلقى واش يقيس بيه."),
                 ("500", AURA, "بعد المرجع", "نفس السوم، بصح تبان صفقة — على خاطر الدماغ يقرا الفرق ماشي الرقم.")],
        "verdict": ["يخوّف", "يبيع"],
        "v2": "الفرق ماشي في الرقم، في البلاصة اللي تحطو فيها.",
        "vb2": "بدّل الترتيب: المرجع أول، سومك من بعد. نفس 500 دج تولّي صفقة واضحة.",
        "band": [("المرجع", "3 000"), ("سومنا", "500"), ("التوفير", "83%")],
        "t3": ["ثلاثة حركات،", "و الترتيب", "يولي يبيع."],
        "b3": "ما تنقصش السوم، بدّل البلاصة. هادي هي الخدمة كاملة.",
        "band3": [("الحركات", "3"), ("الوقت", "10 min"), ("النتيجة", "×2")],
        "rows3": [("chart", "بيّن المرجع قبل سومك",
                   "سوم السوق، سوم الوكالة، سوم الاستوديو. المرجع الحقيقي يعطي معنى لسومك."),
                  ("layers", "فسّر واش كاين في السوم",
                   "30 ثانية، دارجة جزايرية، تعديل مرتين، تسليم 24 ساعة. القيمة قبل الرقم."),
                  ("check", "خلّي المقارنة واضحة",
                   "قبل / بعد، بلا صوت / بالصوت. المقارنة هي اللي تبيع، ماشي التخفيض.")],
        "t4": ["كيفاش", "تطبّقها", "درك."],
        "photo2": "mic-hero.jpg", "photo2_label": "MIC · STUDIO",
        "rows4": [("حط السوم في سياقو", "كتب المرجع في الوصف، ماشي غير السوم بوحدو."),
                  ("عرض القيمة بالتفصيل", "30 ثانية، تعديل، تسليم — كل حاجة مكتوبة."),
                  ("قيس النتيجة", "الطلبات في الأسبوع، ماشي اللايكات.")],
        "t5": ["الترتيب يبيع", "أكثر من التخفيض."],
        "b5": "500 دج ماشي غالية — غير خاصها مرجع. حط السوم تاعك في بلاصتو، و خلّي الزبون يقارن بوحدو.",
        "b5_note": "صوت واحد بالدارجة، 30 ثانية، تسليم في 24 ساعة.",
        "end_trio": [("السوم", "500"), ("المدة", "30 s"), ("التسليم", "24 h")],
        "skel": [s_cover, s_compare, s_rows, s_split, s_end],
    },
    {
        "id": "c2-perte", "n": 5, "tag": "aversion à la perte",
        "chip": "خسارة مرتين",
        "cover": ["الصمت تاعك", "يعمّر جيب", "غيرك."],
        "cover_size": 78,
        "proof_label": "واش يخسّر الزبون كي ما يسمعش",
        "price_a": "×2", "price_b": "1", "strike": False,
        "price_a_tag": "وجع الخسارة", "price_b_tag": "فرحة الربح",
        "proof_note": "ضياع 100 دج يوجع أكثر ما يفرحك ربح 100 دج. على هادا، ما تبيعش الربح — وري الخسارة.",
        "photo": "shop-owners.jpg", "photo_label": "COMMERCE · BLIDA",
        "photo_note": "الزبون ما يقلكش «ما فهمتش». يمشي بصمت، يشري عند صاحبك، و أنت ما تعرفش علاش.",
        "cover_band": [("بلا صوت", "0 s"), ("زبون ضايع", "1"), ("الخسارة", "×2")],
        "cover_specs": [("الصوت", "DARIJA"), ("المدة", "30 s"), ("التجربة", "GRATIS")],
        "t2": ["الخسارة توجع", "ضوڨ مرتين", "ما يفرحك الربح."],
        "b2": "الدماغ ماشي ميزان عادل. على هادا الإعلان اللي يحكي على «واش راح تخسر» يشد أكثر من اللي يحكي على «واش راح تربح».",
        "rows": [("100", AURA, "خسارة 100 دج", "وجع فوري، يتفكّر مدة طويلة، و يخلّي الزبون يقلّب على حل."),
                 ("50", SOFT_D, "ربح 100 دج", "نفس المبلغ، إحساس باهت. لهذا التخفيض ما يخدمش كي ما يخدمش الصوت.")],
        "verdict": ["يضيّع", "يربّح"],
        "v2": "الخسارة ما تتصلّحش بالسوم، تتصلّح بالصوت.",
        "vb2": "30 ثانية بالدارجة، قبل ما ترفع في التخفيض. الصوت يوقّف الخسارة أرخص من أي خصم.",
        "band": [("بلا صوت", "0"), ("زبون ضايع", "1"), ("التكلفة", "×2")],
        "t3": ["واش راك تخسر", "درك، بلا ما", "تحسّ."],
        "b3": "أربعة خسائر صامتة، كل واحدة تكلّفك زبون.",
        "band3": [("الخسائر", "4"), ("الوقت", "30 s"), ("التكلفة", "×2")],
        "rows3": [("video", "زبون يقرا و ما يسمعش", "الفيديو يمشي بلا صوت، الرسالة تروح معاه."),
                  ("clock", "3 أيام باش تجاوب", "كل نهار تأخير، الزبون يعاود يشوف عند غيرك."),
                  ("mic", "صوت مسجّل بالتيليفون", "الضجة تضعّف الثقة قبل ما تفوت الكلمة الأولى."),
                  ("cart", "السلة تبقى عامرة", "اللي ما فهمش واش راك تبيع، ما يشريش — يمشي بصمت.")],
        "t4": ["30 ثانية", "تقلب", "الخسارة."],
        "photo2": "man-studio.jpg", "photo2_label": "VOIX · DARIJA",
        "rows4": [("خود الصوت قبل التصوير", "سيناريو في 3 جمل، يتقرا بدارجة طبيعية."),
                  ("حط الصوت في 30 ثانية الأولى", "قبل ما يسقسي الزبون «واش هادا؟»."),
                  ("قيس واش ربحت", "الطلبات في الأسبوع، ماشي اللايكات.")],
        "t5": ["قبل ما تخسر", "زبون آخر،", "خود 30 ثانية."],
        "b5": "الخسارة ما تتصلّحش بالنية، تتصلّح بصوت. صوت واحد بالدارجة، جاهز في 24 ساعة.",
        "b5_note": "تجربة قبل ما تخلّص. ما كاينش اشتراك، ما كاينش التزام.",
        "end_trio": [("السوم", "500"), ("المدة", "30 s"), ("التجربة", "مجانًا")],
        "skel": [s_cover, s_compare, s_rows, s_split, s_end],
    },
    {
        "id": "c3-fobo", "n": 5, "tag": "fobo · playbook 03",
        "chip": "3 قرارات",
        "cover": ["50 صوت،", "50 سوم،", "و أنت ما زلت", "ما اخترتش."],
        "cover_size": 70,
        "proof_label": "FOBO — الخوف من حاجة أحسن",
        "price_a": "50", "price_b": "3",
        "price_a_tag": "خيار مفتوح", "price_b_tag": "قرار واضح",
        "proof_note": "كي تكثر الاختيارات، الدماغ يوقف. الحل ماشي زيد الخيارات — قلّلهم حتى يبقى قرار واحد واضح.",
        "photo": "phone-hand.jpg", "photo_label": "06:40 · تيليفون",
        "photo_note": "كل عرض جديد تفتحه، القرار يتأجّل نهار. الخيارات الكثيرة ما تعطيكش الحرية، تعطيك تأخير.",
        "cover_band": [("القرارات", "3"), ("السوم", "500"), ("التسليم", "24 h")],
        "cover_specs": [("الصوت", "DARIJA"), ("التعديل", "×2"), ("التجربة", "GRATIS")],
        "t2": ["الخوف من", "حاجة أحسن", "يوقّف كلش."],
        "b2": "FOBO: ماشي ما عندكش فلوس، ماشي ما عندكش وقت — عندك خوف من أنك تختار أقل من الأحسن.",
        "rows": [("50", SOFT_D, "خيار مفتوح", "كل خيار يزيد شك، و الشك يزيد تأجيل."),
                 ("3", AURA, "قرار واضح", "نوع الصوت، الطول، الوقت. خلاص، نبداو.")],
        "verdict": ["يوقّف", "يقرّر"],
        "v2": "3 خيارات واضحة تغلّب 50 خيار مفتوح.",
        "vb2": "نوع، طول، وقت. تختار ثلاثة، و نكتبو، نقراو، نسلمو في 24 ساعة.",
        "band": [("الخيارات", "3"), ("السوم", "500"), ("التسليم", "24 h")],
        "t3": ["3 قرارات", "و نكتبو،", "نقراو، نسلمو."],
        "b3": "هادا واش تسقسي، و هادا واش نجاوبو. ماشي 50 سؤال.",
        "band3": [("القرارات", "3"), ("السوم", "500"), ("التسليم", "24 h")],
        "rows3": [("mic", "واش نوع الصوت؟", "إعلان، شرح، ولا ترحيب. تختار واحد، نكتبو و نقراوه."),
                  ("clock", "شحال الطول؟", "30 ثانية كافية. 60 كي تحتاج، تدفع الفرق، ماشي باك."),
                  ("check", "وقتاش تحبو؟", "24 ساعة، ولا 48 كي تكون القصة طويلة.")],
        "t4": ["و السوم؟", "قرار وحد،", "ماشي 50."],
        "photo2": "studio-voice.jpg", "photo2_label": "STUDIO · DZ",
        "rows4": [("500 دج، ثابت", "ما كاينش سعر مخبّي، ما كاينش مفاجأة في الفاتورة."),
                  ("تعديل مجاني جوج مرات", "نعاودو حتى يعجبك، بلا ما تخلّص زيادة."),
                  ("24 ساعة، بعدها 30 دج / ساعة", "الاستعجال عندو سوم واضح.")],
        "t5": ["ما تختارش", "بين 50 —", "اختار واحد."],
        "b5": "3 قرارات، سوم وحد، 24 ساعة. على هادا Sawtify ماشي كاطالوغ: عرض وحد يخدم.",
        "b5_note": "دير طلب، و شوف الصوت قبل ما تخلّص.",
        "end_trio": [("السوم", "500"), ("التعديل", "×2"), ("التسليم", "24 h")],
        "skel": [s_cover, s_compare, s_rows, s_split, s_end],
    },
]


# ═══════════════════════════════════════════════════════════════════════════
#  rendu
# ═══════════════════════════════════════════════════════════════════════════
def render(pub):
    d = OUT / pub["id"]
    d.mkdir(parents=True, exist_ok=True)
    for i, fn in enumerate(pub["skel"]):
        base = fn(pub, i + 1)
        img = base.convert("RGB").resize((W, H), Image.LANCZOS)
        img.save(d / f"{i + 1:02d}.jpg", quality=94, optimize=True,
                 subsampling=1)
        print("  ✓", d.name, f"{i + 1:02d}")


def planches():
    tw, th = 380, 475
    for pub in PUBS:
        files = sorted((OUT / pub["id"]).glob("*.jpg"))
        sheet = Image.new("RGB", (len(files) * (tw + 10) + 10, th + 20),
                          (24, 16, 40))
        for i, f in enumerate(files):
            im = Image.open(f).convert("RGB").resize((tw, th), Image.LANCZOS)
            sheet.paste(im, (10 + i * (tw + 10), 10))
        out = OUT / f"planche-{pub['id']}.jpg"
        sheet.save(out, quality=93, optimize=True)
        print("  ✓", out.name)
    tw, th = 280, 350
    sheet = Image.new("RGB", (10 + 5 * (tw + 8), 3 * (th + 16) + 10),
                      (24, 16, 40))
    for r, pub in enumerate(PUBS):
        files = sorted((OUT / pub["id"]).glob("*.jpg"))
        for i, f in enumerate(files):
            im = Image.open(f).convert("RGB").resize((tw, th), Image.LANCZOS)
            sheet.paste(im, (10 + i * (tw + 8), 10 + r * (th + 16)))
    out = OUT / "planche-cartes-v8.jpg"
    sheet.save(out, quality=93, optimize=True)
    print("  ✓", out.name)


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
        if a.only and a.only not in pub["id"]:
            continue
        print("·", pub["id"])
        render(pub)


if __name__ == "__main__":
    main()
