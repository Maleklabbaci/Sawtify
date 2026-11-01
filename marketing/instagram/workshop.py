#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════
 workshop.py — carrousels COLLAGE : vraies photos, typo display, papier déchiré
───────────────────────────────────────────────────────────────────────────
 Pourquoi ça ne ressemble pas à de l'IA :
   • de VRAIES photos (studio, micro, téléphone) découpées aux ciseaux,
     pas des visuels générés : bord déchiré, ombre portée, léger pivot
   • typographie display (Anton condensé + Playfair italique) collée par-dessus
   • matière : grain de papier, fibres, halftone newsprint, scotch translucide,
     surligneur, taches d'encre
   • aucun dégradé « tech », aucune icône flottante, aucun vide propre

 Les 4 slides sont LIÉS :
   1. une BANDE DE SCOTCH à la même hauteur sur les 4 slides : elle porte une
      partie de la phrase, qui se lit en entier en swipant
   2. le NUMÉRO 01→04 en contour, coupé par le cadre
   3. le MÊME SUJET (la voix) : gros plan → fragment → micro → téléphone
   4. la FLÈCHE orange sort à droite et rentre à gauche, même hauteur

   python3 workshop.py             # la publication de démonstration
   python3 workshop.py --only 1
═══════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import argparse
import math
import random
import re
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageStat

import sawtify_ig as ig
from sawtify_ig import (AR_BOLD, AR_REG, AR_SEMI, SS, W, H, ar_para, font, rrect,
                        visual)

ROOT = Path(__file__).resolve().parent
PHOTOS = ROOT / "photos"
OUT = ROOT / "slides" / "workshop"

# ── typos display ─────────────────────────────────────────────────────────
ANTON = "Anton-Regular.ttf"
PF_IT = "Playfair-BoldItalic.ttf"
PF_IT6 = "Playfair-SemiBoldItalic.ttf"
CAIRO = "IBMPlexSansArabic-Bold.ttf"
CAIRO_B = "IBMPlexSansArabic-Bold.ttf"
CAIRO_M = "IBMPlexSansArabic-Regular.ttf"
MONO = "SpaceGrotesk-Bold.ttf"

# ── couleurs de marque ────────────────────────────────────────────────────
VIOLET = (124, 45, 200)
VIO_D = (44, 16, 92)
INK = (14, 10, 16)
CREAM = (247, 242, 232)
PAPER = (235, 227, 213)
ORANGE = (255, 100, 44)
LILAC = (206, 184, 240)
WHITE = (255, 255, 255)

M = 62
R = W - M
CW, CH = ig.CW, ig.CH          # 2160 × 2700 (SS = 2)

_rng = random.Random(7)


# ═══════════════════════════════════════════════════════════════════════════
#  1. MATIÈRE
# ═══════════════════════════════════════════════════════════════════════════
_NOISE = None
_HALFTONE = {}


def paper_noise(base, strength=13, scale=1.0):
    """Grain de papier : bruit doux AUTOUR de la couleur du fond.

    (Le grain était centré sur du gris moyen : il salissait le blanc #faf9ff
    de la plateforme. On le centre maintenant sur la teinte réelle du fond,
    donc la texture reste, la valeur ne bouge plus.)
    """
    global _NOISE
    if _NOISE is None or _NOISE.size != base.size:
        _NOISE = Image.effect_noise(base.size, 26).convert("RGB")
    centre = ImageStat.Stat(base.convert("RGB").resize((16, 16), Image.BILINEAR)).mean
    grain = Image.blend(Image.new("RGB", base.size, tuple(int(c) for c in centre)),
                        _NOISE, 0.5)
    amount = min(1.0, 0.12 * (strength / 13.0))
    base.paste(Image.blend(base.convert("RGB"), grain, amount).convert("RGBA"), (0, 0))


def halftone(base, box, step=9, angle=27, color=(0, 0, 0), alpha=52, phase=0.0):
    """Trame de points (newsprint) : tuile pré-calculée, très rapide."""
    key = (round(step, 1), round(angle))
    if key not in _HALFTONE:
        tile = Image.new("L", (int(step * 6), int(step * 6)), 0)
        d = ImageDraw.Draw(tile)
        s_ = step * SS
        for i in range(6):
            for j in range(6):
                r = max(1.0, (1.0 + math.sin((i * step + j * step) / 26.0)) * step * 0.26) * SS
                cx, cy = (i + 0.5) * s_, (j + 0.5) * s_
                d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
        _HALFTONE[key] = tile.rotate(angle, resample=Image.BICUBIC)
    tile = _HALFTONE[key]
    x0, y0, x1, y1 = (int(v) for v in box)
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(W, x1), min(H, y1)
    if x1 <= x0 or y1 <= y0:
        return
    w, h = (x1 - x0) * SS, (y1 - y0) * SS
    tw, th = tile.size
    mask = Image.new("L", (w, h))
    for yy in range(0, h, th):
        for xx in range(0, w, tw):
            mask.paste(tile, (xx, yy))
    dots = Image.new("RGBA", (w, h), (*color, 0))
    dots.putalpha(mask.point(lambda v: v * alpha // 255))
    base.alpha_composite(dots, (int(x0 * SS), int(y0 * SS)))


def fibers(base, color=(0, 0, 0), n=260, alpha=16):
    """Petites fibres / poussières : la texture qui tue le côté « propre »."""
    d = ImageDraw.Draw(base)
    rng = random.Random(11)
    for _ in range(n):
        x, y = rng.uniform(0, W), rng.uniform(0, H)
        ln = rng.uniform(3, 16)
        a = rng.uniform(0, math.pi)
        d.line([(x * SS, y * SS),
                ((x + math.cos(a) * ln) * SS, (y + math.sin(a) * ln) * SS)],
               fill=(*color, alpha), width=1)


def ink_blob(base, cx, cy, r, color=(0, 0, 0), alpha=22):
    """Tache d'encre douce, pour salir les aplats."""
    layer = Image.new("RGBA", (int(r * 2.6 * SS), int(r * 2.6 * SS)), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    rng = random.Random(int(cx + cy))
    for k in range(9):
        rr = r * SS * rng.uniform(0.45, 1.0)
        ox = rng.uniform(-0.25, 0.25) * r * SS
        oy = rng.uniform(-0.25, 0.25) * r * SS
        c = (r * 1.3) * SS
        d.ellipse([c + ox - rr, c + oy - rr, c + ox + rr, c + oy + rr],
                  fill=(*color, alpha))
    layer = layer.filter(ImageFilter.GaussianBlur(9 * SS))
    base.alpha_composite(layer, (int(cx * SS - layer.width / 2),
                                 int(cy * SS - layer.height / 2)))


def scotch(base, cx, cy, w, h, rot=0.0, tone=(255, 255, 255), alpha=118,
           torn_ends=True, shadow=True):
    """Bande de scotch translucide avec bouts déchirés."""
    ww, hh = int(w * SS), int(h * SS)
    layer = Image.new("RGBA", (ww, hh), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rectangle([0, 0, ww, hh], fill=(*tone, alpha))
    # stries du scotch
    for k in range(0, ww, max(3, int(6 * SS))):
        d.line([(k, 0), (k, hh)], fill=(255, 255, 255, 16), width=max(1, int(0.6 * SS)))
    if torn_ends:
        mask = Image.new("L", (ww, hh), 255)
        md = ImageDraw.Draw(mask)
        rng = random.Random(int(cx))
        for side in (0, 1):
            xx = 0 if side == 0 else ww
            step = int(7 * SS)
            for yy in range(0, hh, step):
                jut = rng.uniform(0, 10 * SS)
                if side == 0:
                    md.polygon([(0, yy), (jut, yy + step / 2), (0, yy + step)], fill=0)
                else:
                    md.polygon([(ww, yy), (ww - jut, yy + step / 2), (ww, yy + step)], fill=0)
        layer.putalpha(Image.composite(layer.getchannel("A"),
                                       Image.new("L", (ww, hh), 0), mask))
    layer = layer.rotate(rot, expand=True, resample=Image.BICUBIC)
    if shadow:
        sh = Image.new("RGBA", layer.size, (0, 0, 0, 0))
        sh.paste((0, 0, 0, 42), (0, 0), layer)
        sh = sh.filter(ImageFilter.GaussianBlur(5 * SS))
        base.alpha_composite(sh, (int((cx - layer.width / SS / 2 + 3) * SS),
                                  int((cy - layer.height / SS / 2 + 7) * SS)))
    base.alpha_composite(layer, (int((cx - layer.width / SS / 2) * SS),
                                 int((cy - layer.height / SS / 2) * SS)))
    return layer


def torn_mask(w, h, seed=0, rough=13, sides=(True, True, False, False)):
    """Masque de papier déchiré : profil irrégulier LISSÉ, pas une scie.

    On tire des points irréguliers le long du bord, on les lisse (moyenne
    glissante) puis on floute le masque : ça donne une déchirure de papier,
    avec des fibres, au lieu des dents de scie de la première version.
    """
    mask = Image.new("L", (w, h), 255)
    d = ImageDraw.Draw(mask)
    rng = random.Random(seed)
    amp_max = rough * 1.25
    for side, on in zip(("l", "r", "t", "b"), sides):
        if not on:
            continue
        span = h if side in ("l", "r") else w
        step = 6
        pts = [rng.uniform(0.0, 1.0) for _ in range(span // step + 4)]
        # lissage : deux passes de moyenne glissante
        for _ in range(2):
            pts = [(pts[max(0, k - 1)] + pts[k] + pts[min(len(pts) - 1, k + 1)]) / 3
                   for k in range(len(pts))]
        # on garde les grandes variations (déchirure), on tue le bruit
        prof = [amp_max * (0.25 + 0.75 * v) for v in pts]
        for k, amp in enumerate(prof):
            k0 = k * step
            if k0 > span:
                break
            k1 = min(span, k0 + step)
            if side == "l":
                d.rectangle([0, k0, int(amp), k1 + 1], fill=0)
            elif side == "r":
                d.rectangle([int(w - amp), k0, w, k1 + 1], fill=0)
            elif side == "t":
                d.rectangle([k0, 0, k1 + 1, int(amp)], fill=0)
            else:
                d.rectangle([k0, int(h - amp), k1 + 1, h], fill=0)
    mask = mask.filter(ImageFilter.GaussianBlur(max(1.0, rough * 0.22)))
    return mask


def photo(base, name, box, rot=0.0, seed=1, duotone=None, torn=(True, True, False, False),
          shadow=26, rough=15, contrast=1.12, sat=0.82, upscale=1.0,
          zoom=1.0, focus=0.5, focus_y=0.5):
    """Colle une VRAIE photo découpée : pivot, bord déchiré, ombre.

    `zoom` > 1 resserre le cadre ; `focus` / `focus_y` (0-1) choisissent la
    zone gardée : utile pour cadrer sur la capsule d'un micro.
    """
    x0, y0, x1, y1 = box
    w, h = int((x1 - x0) * SS), int((y1 - y0) * SS)
    im = Image.open(PHOTOS / name).convert("RGB")
    k = max(w / im.width, h / im.height) * upscale * zoom
    im = im.resize((max(2, int(im.width * k)), max(2, int(im.height * k))), Image.LANCZOS)
    # recadrage sur le point d'intérêt
    left = int((im.width - w) * focus)
    top = int((im.height - h) * focus_y)
    im = im.crop((left, top, left + w, top + h))

    if duotone:
        dark, light = duotone
        g = im.convert("L")
        im = Image.merge("RGB", [
            g.point(lambda v, a=dark[0], b=light[0]: int(a + (b - a) * v / 255)),
            g.point(lambda v, a=dark[1], b=light[1]: int(a + (b - a) * v / 255)),
            g.point(lambda v, a=dark[2], b=light[2]: int(a + (b - a) * v / 255)),
        ])
    else:
        im = Image.eval(im, lambda v: min(255, int(128 + (v - 128) * contrast)))
        if sat < 1.0:
            g = im.convert("L")
            im = Image.blend(im, Image.merge("RGB", [g, g, g]), 1 - sat)

    im = im.convert("RGBA")
    if any(torn):
        m = torn_mask(w, h, seed=seed, rough=rough * SS, sides=torn)
        im.putalpha(m)
    if abs(rot) > 0.01:
        im = im.rotate(rot, expand=True, resample=Image.BICUBIC)

    if shadow:
        sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
        sh.paste((0, 0, 0, shadow), (0, 0), im)
        sh = sh.filter(ImageFilter.GaussianBlur(7 * SS))
        base.alpha_composite(sh, (int((x0 - im.width / SS / 2 + w / SS / 2 + 4) * SS),
                                  int((y0 - im.height / SS / 2 + h / SS / 2 + 9) * SS)))
    base.alpha_composite(im, (int((x0 - (im.width / SS - w / SS) / 2) * SS),
                              int((y0 - (im.height / SS - h / SS) / 2) * SS)))
    return im


# ═══════════════════════════════════════════════════════════════════════════
#  2. TYPO
# ═══════════════════════════════════════════════════════════════════════════
def lat(base, text, x, y, size, color, fname=ANTON, anchor="ls", rot=0.0,
        tracking=0.0, stroke=None, stroke_w=0):
    """x = origine ; avec anchor="rs", x est le bord DROIT du texte."""
    """Texte latin display (Anton / Playfair). pivot possible."""
    f = font(fname, size)
    d0 = ImageDraw.Draw(base)
    if abs(rot) < 0.01 and not tracking:
        if stroke:
            d0.text((x * SS, y * SS), text, font=f, fill=color, anchor=anchor,
                    stroke_width=int(stroke_w * SS), stroke_fill=stroke)
        else:
            d0.text((x * SS, y * SS), text, font=f, fill=color, anchor=anchor)
        return
    tw = d0.textlength(text, font=f) / SS
    if tracking and len(text) > 1:
        tw += tracking * (len(text) - 1)      # largeur RÉELLE avec interlettrage
    if anchor.startswith("r"):
        x = x - tw
    asc, desc = f.getmetrics()
    hh = (asc + desc) / SS
    pad = 40
    layer = Image.new("RGBA", (int((tw + pad * 2) * SS), int((hh + pad * 2) * SS)),
                      (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    cx = 0
    for ch in text:
        ld.text(((pad + cx) * SS, (pad + asc / SS) * SS), ch, font=f, fill=color,
                anchor="ls")
        cx += (d0.textlength(ch, font=f) / SS) + tracking
    if stroke:
        pass
    layer = layer.rotate(rot, expand=True, resample=Image.BICUBIC)
    # le pivot est le centre du texte NON tourné : (x + tw/2, y - asc/2)
    cxp = x + tw / 2
    cyp = y - (asc / SS) / 2
    base.alpha_composite(layer, (int((cxp - layer.width / SS / 2) * SS),
                                 int((cyp - layer.height / SS / 2) * SS)))


_PUNCT_FIX = re.compile(r"\*\*([^*]+)\*\*([،.:؛؟!])")


def ar(base, text, x_right, y, size, color, fname=CAIRO, max_w=None,
       leading=1.28, align="right", hi=None, hi_color=ORANGE):
    # la ponctuation qui suit un mot surligné reste collée : sinon elle part
    # à l'autre bout de la ligne (run isolé + espace ajouté par ar_para)
    text = _PUNCT_FIX.sub(r"**\1\2**", text)
    return ar_para(base, x_right, y, text, size, fname, color,
                   max_w=max_w or (W - 2 * M), align=align, leading=leading,
                   hi_color=hi_color)


def ar_fit(base, text, max_w, size, fname=CAIRO, floor=26):
    d = ImageDraw.Draw(base)
    plain = text.replace("**", "")
    while size > floor and d.textlength(visual(plain), font=font(fname, size)) / SS > max_w:
        size -= 2
    return size


def fit_block(base, lines, max_w, max_h, size, fname=CAIRO, leading=1.16,
              floor=28, step=2):
    """Réduit la taille d'un bloc de lignes jusqu'à ce qu'il tienne dans max_h."""
    d = ImageDraw.Draw(base)
    s = size
    while s > floor:
        tot = 0.0
        for ln in lines:
            w = d.textlength(visual(ln.replace("**", "")), font=font(fname, s)) / SS
            tot += max(1, math.ceil(w / max_w)) * s * leading
        if tot <= max_h:
            break
        s -= step
    return s


def rule(base, x0, x1, y, color=(0, 0, 0), width=2.0, alpha=255):
    rrect(base, (x0, y, x1, y + width), width / 2, fill=(*color, alpha))


# ═══════════════════════════════════════════════════════════════════════════
#  3. PETITS OBJETS DE COLLAGE
# ═══════════════════════════════════════════════════════════════════════════
def marker_block(base, x_right, y, w, h, color=(255, 214, 0), alpha=196, rot=-0.7):
    """Surligneur : bloc légèrement de travers derrière un mot."""
    layer = Image.new("RGBA", (int((w + 30) * SS), int((h + 26) * SS)), (0, 0, 0, 0))
    ImageDraw.Draw(layer).rectangle([10 * SS, 8 * SS, (10 + w) * SS, (8 + h) * SS],
                                    fill=(*color, alpha))
    # bouts irréguliers
    layer = layer.filter(ImageFilter.GaussianBlur(1.2 * SS))
    layer = layer.rotate(rot, expand=True, resample=Image.BICUBIC)
    base.alpha_composite(layer, (int((x_right - w - 15) * SS),
                                 int((y - h / 2 - 13) * SS)))


def index_dot(base, idx, total, x, y, color=WHITE, dark=True):
    """Petit compteur 01/04, avec la fraction qui avance."""
    col = color if dark else INK
    lat(base, f"{idx + 1:02d}", x, y, 34, col, ANTON, anchor="ls")
    d = ImageDraw.Draw(base)
    d.text(((x + 52) * SS, (y - 2) * SS), f"/{total:02d}", font=font(MONO, 16),
           fill=(*col, 150) if dark else (*INK, 130), anchor="ls")


def big_num_outline(base, text, x, y, size, color, rot=0.0, width=3.0, alpha=255):
    """Numéro géant en contour, souvent coupé par le cadre."""
    layer = Image.new("RGBA", (int(size * 2.2 * SS), int(size * 1.4 * SS)), (0, 0, 0, 0))
    ImageDraw.Draw(layer).text((size * 1.1 * SS, size * 1.05 * SS), text,
                               font=font(ANTON, size), fill=None,
                               stroke_width=int(width * SS), stroke_fill=(*color, alpha),
                               anchor="ls")
    layer = layer.rotate(rot, expand=True, resample=Image.BICUBIC)
    base.alpha_composite(layer, (int((x - layer.width / SS / 2) * SS),
                                 int((y - layer.height / SS / 2) * SS)))


def sticker(base, text, cx, cy, size=96, fill=ORANGE, ink=CREAM, rot=-8):
    """Pastille autocollante (Prix, 100%, …)."""
    layer = Image.new("RGBA", (int(size * 2 * SS), int(size * 2 * SS)), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    c = size * SS
    d.ellipse([c * .14, c * .14, c * 1.86, c * 1.86], fill=(*fill, 255))
    arabic = bool(ig.ARABIC_RE.search(text))
    f = font(CAIRO_B if arabic else ANTON, size * (0.34 if arabic else 0.42))
    while d.textlength(visual(text) if arabic else text, font=f) > size * 1.55 * SS and f.size > 10:
        f = font(CAIRO_B if arabic else ANTON, f.size / SS - 2)
    d.text((c, c * 1.0), visual(text) if arabic else text, font=f,
           fill=(*ink, 255), anchor="mm")
    layer = layer.rotate(rot, expand=True, resample=Image.BICUBIC)
    sh = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    sh.paste((0, 0, 0, 70), (0, 0), layer)
    sh = sh.filter(ImageFilter.GaussianBlur(4 * SS))
    base.alpha_composite(sh, (int((cx - layer.width / SS / 2 + 4) * SS),
                              int((cy - layer.height / SS / 2 + 8) * SS)))
    base.alpha_composite(layer, (int((cx - layer.width / SS / 2) * SS),
                                 int((cy - layer.height / SS / 2) * SS)))


def tick(base, cx, cy, size=18, color=ORANGE, w=3.2):
    d = ImageDraw.Draw(base)
    d.line([((cx - size * .5) * SS, (cy + size * .02) * SS),
            ((cx - size * .12) * SS, (cy + size * .42) * SS)], fill=color, width=int(w * SS))
    d.line([((cx - size * .12) * SS, (cy + size * .42) * SS),
            ((cx + size * .55) * SS, (cy - size * .42) * SS)], fill=color, width=int(w * SS))


def arrow(base, x0, y0, x1, y1, color=ORANGE, w=7, head=26):
    d = ImageDraw.Draw(base)
    d.line([(x0 * SS, y0 * SS), (x1 * SS, y1 * SS)], fill=color, width=int(w * SS))
    a = math.atan2(y1 - y0, x1 - x0)
    for s in (+1, -1):
        d.line([(x1 * SS, y1 * SS),
                ((x1 - math.cos(a - s * 0.5) * head) * SS,
                 (y1 - math.sin(a - s * 0.5) * head) * SS)],
               fill=color, width=int(w * SS))


def mascot(base, cx, cy, size, rot=0.0):
    from premium import logo
    im = logo(int(size * SS)).copy()
    if abs(rot) > 0.1:
        im = im.rotate(rot, expand=True, resample=Image.BICUBIC)
    base.alpha_composite(im, (int((cx - im.width / SS / 2) * SS),
                              int((cy - im.height / SS / 2) * SS)))


def wave(base, x, y, w, h, bars=46, color=VIOLET, seed=3, alpha=255):
    rng = random.Random(seed)
    d = ImageDraw.Draw(base)
    step = w / bars
    for k in range(bars):
        hh = (0.18 + abs(math.sin(k * 0.55 + seed)) * rng.uniform(0.45, 1.0)) * h
        d.rounded_rectangle([((x + k * step)) * SS, ((y + (h - hh) / 2)) * SS,
                             ((x + k * step + step * 0.52)) * SS,
                             ((y + (h + hh) / 2)) * SS],
                            radius=step * 0.26 * SS, fill=(*color, alpha))


# ═══════════════════════════════════════════════════════════════════════════
#  4. FONDS
# ═══════════════════════════════════════════════════════════════════════════
def bg_violet(seed=1):
    img = ig.gradient((CW, CH), (146, 58, 226), (46, 18, 96)).convert("RGBA")
    ink_blob(img, 980, 180, 260, (20, 4, 40), 40)
    ink_blob(img, 120, 1220, 320, (255, 255, 255), 16)
    return img


def bg_cream(seed=1):
    img = Image.new("RGBA", (CW, CH), (*CREAM, 255))
    ink_blob(img, 980, 1200, 300, (120, 90, 60), 16)
    ink_blob(img, 90, 140, 240, (124, 45, 200), 12)
    return img


def bg_ink(seed=1):
    img = ig.gradient((CW, CH), (32, 22, 34), (8, 6, 10)).convert("RGBA")
    ink_blob(img, 1000, 260, 300, (124, 45, 200), 34)
    ink_blob(img, 60, 1240, 260, (255, 100, 44), 18)
    return img


# ═══════════════════════════════════════════════════════════════════════════
#  5. LES 4 SLIDES
# ═══════════════════════════════════════════════════════════════════════════
def _top(base, idx, total, label, dark=True):
    """Bandeau : 01/04 + la marque, mêmes places sur les 4 slides."""
    col = CREAM if dark else INK
    index_dot(base, idx, total, M + 2, 92, col, dark)
    lat(base, label, R - 2, 92, 20, col if not dark else LILAC, MONO, anchor="rs")


def _tape_line(base, text, y=1268, dark=False, tone=None, size=31, rot=-2.2):
    """La bande de scotch qui porte une partie de la phrase (le lien)."""
    tone = tone or (CREAM if dark else (255, 255, 255))
    w = 600
    cx = W / 2 - 10
    scotch(base, cx, y, w, 74, rot=rot, tone=tone, alpha=244)
    ar(base, text, cx + w / 2 - 30, y - 26, size, VIO_D, CAIRO_B, max_w=w - 70)


def _chevrons(base, y=1206, both=True):
    """Le geste qui relie la slide N à la N+1."""
    arrow(base, R - 52, y, W + 24, y + 8, ORANGE, 8, 28)
    if both:
        arrow(base, -24, y, M + 52, y + 8, ORANGE, 8, 28)


def _footer(base):
    rrect(base, (0, H - 6, W, H), 0, fill=(*ORANGE, 255))
    paper_noise(base, 11, 1)
    fibers(base, (0, 0, 0), 130, 9)


# ═══════════════════════════════════════════════════════════════════════════
def slide_1(base, s, idx, total):
    """COUVERTURE — la photo en bandeau, l'accroche collée dessous."""
    photo(base, s["photo"], (-46, -70, W + 46, 742), rot=-1.6, seed=21,
          shadow=30, rough=18, torn=(True, False, False, True))
    halftone(base, (0, 640, W, 780), step=8.4, alpha=30, color=(255, 255, 255))

    _top(base, idx, total, "SAWTIFY")

    # accroche : 3 lignes, calées à droite, sous la photo
    y = 748
    for ln in s["lines"]:
        size = ar_fit(base, ln, W - 2 * M - 80, 86)
        y = ar(base, ln, R, y, size, CREAM, CAIRO, max_w=W - 2 * M - 40,
               leading=1.12, hi_color=ORANGE) + 6
    ar(base, s["promise"], R, y + 10, 26, LILAC, CAIRO_M, max_w=740)

    # le chiffre, entier, posé sur le bandeau violet (pas de doublon avec le sticker)
    disp = s["display"]
    if any("\u0600" <= ch <= "\u06ff" for ch in disp):
        dsize = ar_fit(base, disp, 400, 120)
        ar(base, disp, M + 400, 1010, dsize, CREAM, CAIRO)
        ar(base, s["display_note"], M + 400, 1140, 24, LILAC, CAIRO_M, max_w=400)
    else:
        lat(base, disp, M - 4, 1192, 178, CREAM, ANTON, anchor="ls", tracking=-4)
        ar(base, s["display_note"], 300, 1160, 24, LILAC, CAIRO_B, max_w=330)

    # sticker sur la photo
    sticker(base, s["sticker"], 928, 262, 122, ORANGE, CREAM, rot=-9)
    _chevrons(base, 1206, both=False)
    _footer(base)


def slide_2(base, s, idx, total):
    """DIAGNOSTIC — papier crème, photo déchirée, gros italique serif."""
    halftone(base, (0, 900, 430, H), step=9.2, alpha=30, color=(124, 45, 200))
    photo(base, s["photo"], (596, 60, W + 60, 706), rot=3.2, seed=33,
          shadow=24, rough=16, torn=(True, False, True, False))
    scotch(base, 700, 96, 260, 56, rot=-8, tone=(255, 255, 255), alpha=160)
    scotch(base, 986, 660, 230, 50, rot=6, tone=(255, 255, 255), alpha=160)

    _top(base, idx, total, "LE DIAGNOSTIC", dark=False)

    # gros mot italique, entièrement dans le cadre
    lat(base, s["pull"], M - 2, 806, 112, INK, PF_IT, anchor="ls", rot=-1.2)
    rule(base, M, R, 834, (60, 40, 80), 2.0, 110)

    hmax = fit_block(base, s["lines"], W - 2 * M - 40, 1000 - 858 - 44, 48)
    y = 858
    for ln in s["lines"]:
        size = min(hmax, ar_fit(base, ln, W - 2 * M - 40, hmax))
        y = ar(base, ln, R, y, size, INK, CAIRO, leading=1.16, hi_color=VIOLET) + 2

    yy = y + 22
    # le bloc doit finir au-dessus de la bande de scotch (y≈1215)
    step = min(68, max(44, (1200 - (y + 22)) / max(1, len(s["items"]))))
    isize = 26 if step >= 62 else 22
    for k, item in enumerate(s["items"]):
        lat(base, f"{k + 1}", M - 8, yy + 6 + isize * 0.82, 38 if step < 62 else 42,
            ORANGE, ANTON, anchor="ls")
        ar(base, item, R - 6, yy + 2, isize, (38, 24, 52), CAIRO_B, max_w=740)
        rule(base, M + 40, R, yy + step - 20, (60, 40, 80), 1.3, 70)
        yy += step

    _chevrons(base, 1206)
    _tape_line(base, s["tape"], 1268, dark=False, tone=(255, 255, 255), size=30)
    _footer(base)


def slide_3(base, s, idx, total):
    """MÉTHODE — encre, micro en duotone, bandes de papier numérotées."""
    photo(base, s["photo"], (-60, 760, 560, H + 60), rot=1.6, seed=44,
          shadow=30, rough=18, duotone=((10, 5, 14), (226, 214, 240)),
          torn=(False, True, True, False))
    halftone(base, (0, 0, W, 740), step=10.4, alpha=20, color=(255, 255, 255))

    _top(base, idx, total, "LA MÉTHODE")

    y = 150
    for ln in s["lines"]:
        size = ar_fit(base, ln, 596, 80)
        y = ar(base, ln, R, y, size, CREAM, CAIRO, max_w=640, leading=1.14,
               hi_color=ORANGE) + 4
    ar(base, s["promise"], R, y + 10, 27, LILAC, CAIRO_M, max_w=620)

    yy = 470
    for k, (num, t, sub) in enumerate(s["steps"]):
        w_box = 600 - k * 18
        x0 = R - w_box + k * 8
        tape = Image.new("RGBA", (int(w_box * SS), int(102 * SS)), (0, 0, 0, 0))
        td = ImageDraw.Draw(tape)
        td.rectangle([0, 0, tape.width, tape.height], fill=(*CREAM, 255))
        td.rectangle([0, 0, int(7 * SS), tape.height], fill=(*ORANGE, 255))
        tape = tape.rotate(-0.8 + k * 0.6, expand=True, resample=Image.BICUBIC)
        sh = Image.new("RGBA", tape.size, (0, 0, 0, 0))
        sh.paste((0, 0, 0, 90), (0, 0), tape)
        sh = sh.filter(ImageFilter.GaussianBlur(6 * SS))
        base.alpha_composite(sh, (int((x0 + 5) * SS), int((yy + 10) * SS)))
        base.alpha_composite(tape, (int(x0 * SS), int(yy * SS)))
        lat(base, num, x0 + 34, yy + 72, 46, VIOLET, ANTON, anchor="ls")
        ar(base, t, x0 + w_box - 22, yy + 12, 31, (30, 18, 44), CAIRO_B,
           max_w=w_box - 96)
        ar(base, sub, x0 + w_box - 22, yy + 54, 22, (110, 92, 130), CAIRO_M,
           max_w=w_box - 96)
        yy += 118

    lat(base, "00:12", 600, 1150, 22, LILAC, MONO, anchor="ls")
    wave(base, 600, 1162, 300, 50, 26, ORANGE, seed=9)

    _chevrons(base, 1206)
    _tape_line(base, s["tape"], 1268, dark=True)
    _footer(base)


def slide_4(base, s, idx, total):
    """OFFRE — violet, polaroïd, bon de commande crème."""
    _top(base, idx, total, "L'OFFRE")

    y = 148
    for ln in s["lines"]:
        size = ar_fit(base, ln, 512, 84)
        y = ar(base, ln, R, y, size, CREAM, CAIRO, max_w=560, leading=1.12,
               hi_color=ORANGE) + 4

    # polaroïd : composé d'un bloc (papier + photo + légende) puis collé
    pw, ph_ = 372, 424
    card = Image.new("RGBA", (pw * SS, ph_ * SS), (0, 0, 0, 0))
    cd = ImageDraw.Draw(card)
    cd.rectangle([0, 0, card.width, card.height], fill=(*CREAM, 255))
    # photo dans le cadre (marges papier)
    im = Image.open(PHOTOS / s["photo"]).convert("RGB")
    inner = (14, 14, pw - 14, ph_ - 76)
    iw, ih = (inner[2] - inner[0]) * SS, (inner[3] - inner[1]) * SS
    k = max(iw / im.width, ih / im.height)
    im = im.resize((int(im.width * k), int(im.height * k)), Image.LANCZOS)
    left, top_ = (im.width - iw) // 2, (im.height - ih) // 2
    im = im.crop((left, top_, left + iw, top_ + ih))
    card.paste(im, (inner[0] * SS, inner[1] * SS))
    cd = ImageDraw.Draw(card)
    cd.text(((pw / 2) * SS, (ph_ - 38) * SS), visual(s["caption"]),
            font=font(CAIRO_M, 20), fill=(96, 76, 112), anchor="mm")
    card = card.rotate(-5.4, expand=True, resample=Image.BICUBIC)
    sh = Image.new("RGBA", card.size, (0, 0, 0, 0))
    sh.paste((0, 0, 0, 120), (0, 0), card)
    sh = sh.filter(ImageFilter.GaussianBlur(10 * SS))
    base.alpha_composite(sh, (int(46 * SS), int(276 * SS)))
    base.alpha_composite(card, (int(34 * SS), int(260 * SS)))
    scotch(base, 244, 270, 176, 48, rot=-7, tone=(255, 255, 255), alpha=170)

    # bon de commande
    top, bottom = 700, 1178
    layer = Image.new("RGBA", (int((W - 2 * M + 26) * SS), int((bottom - top + 26) * SS)),
                      (0, 0, 0, 0))
    ImageDraw.Draw(layer).rectangle([13 * SS, 13 * SS, layer.width - 13 * SS,
                                     layer.height - 13 * SS], fill=(*CREAM, 255))
    sh = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    sh.paste((0, 0, 0, 120), (0, 0), layer)
    sh = sh.filter(ImageFilter.GaussianBlur(12 * SS))
    base.alpha_composite(sh, (int((M - 20) * SS), int((top - 2) * SS)))
    base.alpha_composite(layer, (int((M - 13) * SS), int((top - 13) * SS)))

    d = ImageDraw.Draw(base)
    d.text(((R - 26) * SS, (top + 30) * SS), "SAWTIFY · BON DE COMMANDE",
           font=font(MONO, 15), fill=(150, 130, 160), anchor="rm")
    rule(base, M + 6, R - 6, top + 54, (60, 40, 80), 1.3, 90)

    for k, g in enumerate(s["guarantees"]):
        gy = top + 86 + k * 44
        tick(base, M + 26, gy, 20, ORANGE, 3.4)
        d.text(((R - 30) * SS, gy * SS), visual(g), font=font(CAIRO_B, 25),
               fill=(38, 24, 52), anchor="rm")

    rule(base, M + 6, R - 6, top + 232, (60, 40, 80), 1.3, 90)
    ar(base, "500 دج", R - 24, top + 244, 48, VIOLET, CAIRO)
    ar(base, "بلا التزام · جودة ستوديو", R - 26, top + 310, 21, (120, 100, 140), CAIRO_M)

    bw, bh = W - 2 * M - 40, 74
    bx, by = M + 20, bottom - 92
    rrect(base, (bx, by, bx + bw, by + bh), 9, fill=(*VIOLET, 255))
    ar(base, s["cta"], bx + bw - 34, by + 20, 29, CREAM, CAIRO_B)
    arrow(base, bx + 40, by + bh / 2, bx + 88, by + bh / 2, CREAM, 6, 17)

    _tape_line(base, s["tape"], 1268, dark=True, size=28)
    mascot(base, 962, 1206, 78, rot=-10)
    _footer(base)


LAYOUTS = [slide_1, slide_2, slide_3, slide_4]
BACKGROUNDS = [bg_violet, bg_cream, bg_ink, bg_violet]


# ═══════════════════════════════════════════════════════════════════════════
#  6. LA PUBLICATION
# ═══════════════════════════════════════════════════════════════════════════
from workshop_pubs import PUBS  # noqa: E402  (30 publications, contenu séparé)


# ═══════════════════════════════════════════════════════════════════════════
#  7. RENDU
# ═══════════════════════════════════════════════════════════════════════════
def contact_sheet(files, out, cols=4, thumb=(340, 425)):
    tw, th = thumb
    rows = math.ceil(len(files) / cols)
    sheet = Image.new("RGB", (cols * tw + (cols + 1) * 14, rows * th + (rows + 1) * 14),
                      (16, 12, 18))
    for k, p in enumerate(files):
        im = Image.open(p).convert("RGB")
        im.thumbnail((tw, th), Image.LANCZOS)
        sheet.paste(im, (14 + (k % cols) * (tw + 14) + (tw - im.width) // 2,
                         14 + (k // cols) * (th + 14) + (th - im.height) // 2))
    sheet.save(out, quality=94, optimize=True)
    return out


def render_pub(pub):
    folder = OUT / pub["slug"]
    folder.mkdir(parents=True, exist_ok=True)
    total = len(pub["slides"])
    paths = []
    for i, s in enumerate(pub["slides"]):
        bgs = pub.get("bgs", BACKGROUNDS)
        img = bgs[i % 4](i + 1)
        LAYOUTS[i % 4](img, s, i, total)
        p = folder / f"{i + 1:02d}.jpg"
        img.convert("RGB").resize((W, H), Image.LANCZOS).save(
            p, quality=94, subsampling=0, optimize=True)
        paths.append(p)
        print(f"  ✓ {p.relative_to(ROOT)}")
    contact_sheet(paths, folder / "contact-sheet.jpg")
    print(f"  ✓ {(folder / 'contact-sheet.jpg').relative_to(ROOT)}")
    return paths


def main():
    ap = argparse.ArgumentParser(description="Carrousels collage workshop")
    ap.add_argument("--only", default=None)
    a = ap.parse_args()
    pubs = PUBS
    if a.only:
        pubs = [p for p in PUBS if a.only in p["slug"]]
    for p in pubs:
        print(f"▶ {p['titre']}")
        render_pub(p)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
