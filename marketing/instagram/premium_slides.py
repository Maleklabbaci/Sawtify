#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════
 premium_slides.py — la couche « design » des carrousels Sawtify

 Objectif : PLUS DE VIDE. Chaque slide est une composition dense et calée sur
 une grille : tuile photo, tuile couleur, motif (pois / hachures / arcs),
 filigrane typographique, marques de repérage, bandeau de pied, lockup logo.

 Palette : uniquement celle de la plateforme (#6d28d9 · #8b5cf6 · #ede9fe ·
 #f5f3ff · #faf9ff · #1a0f2e · #2e1065), orange #ff5e3a en micro-accent.
 Aucun emoji. Icônes vectorielles uniquement.
═══════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import math
import random

from PIL import Image, ImageDraw, ImageFilter

from carousel import (DUOS, P_AURA, P_DEEP, P_INK, P_LILA, P_PAPER, P_VIO,
                      P_VIO_L, P_WHITE, R, W, H, M, SS, ar, ar_fit, ground,
                      head, lat, light, num_col, num_dot, paper_tone, rule_col,
                      thread)
from premium import icon, logo, logo_tile
from sawtify_ig import font, rrect
from workshop import (ANTON, CAIRO, CAIRO_B, CAIRO_M, MONO, PF_IT, PHOTOS,
                      fit_block, halftone, rule, tick, wave)

FOOT = 86            # hauteur du bandeau de pied
CX = W / 2


# ═══════════════════════════════════════════════════════════════════════════
#  briques de base
# ═══════════════════════════════════════════════════════════════════════════
def panel(base, box, fill, radius=26):
    x0, y0, x1, y1 = box
    if x1 <= x0 or y1 <= y0:
        return
    rrect(base, box, radius, fill=(*fill, 255))


def photo_tile(base, name, box, radius=26, duo_idx=0, zoom=1.22,
               focus=0.5, fy=0.5, border=None, bw=3):
    x0, y0, x1, y1 = [int(v) for v in box]
    w, h = x1 - x0, y1 - y0
    im = Image.open(PHOTOS / name).convert("RGB")
    k = max(w * SS / im.width, h * SS / im.height) * zoom
    im = im.resize((max(2, int(im.width * k)), max(2, int(im.height * k))), Image.LANCZOS)
    l = int((im.width - w * SS) * focus)
    t = int((im.height - h * SS) * fy)
    im = im.crop((l, t, l + w * SS, t + h * SS))
    dk, lt = DUOS[duo_idx % len(DUOS)]
    g = im.convert("L")
    im = Image.merge("RGB", [
        g.point(lambda v, a=dk[0], b=lt[0]: int(a + (b - a) * v / 255)),
        g.point(lambda v, a=dk[1], b=lt[1]: int(a + (b - a) * v / 255)),
        g.point(lambda v, a=dk[2], b=lt[2]: int(a + (b - a) * v / 255)),
    ]).convert("RGBA")
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, im.width - 1, im.height - 1],
                                          radius=radius * SS, fill=255)
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    layer.paste(im, (0, 0), mask)
    base.alpha_composite(layer, (x0 * SS, y0 * SS))
    if border:
        rrect(base, box, radius, outline=(*border, 255), width=bw)
    return box


def dots(base, box, color, alpha=90, step=34, r=3.0):
    x0, y0, x1, y1 = box
    d = ImageDraw.Draw(base)
    y = y0 + step / 2
    while y < y1:
        x = x0 + step / 2
        while x < x1:
            d.ellipse([(x - r) * SS, (y - r) * SS, (x + r) * SS, (y + r) * SS],
                      fill=(*color, alpha))
            x += step
        y += step


def hatch(base, box, color, alpha=54, gap=22, width=2.0, ang=45):
    x0, y0, x1, y1 = [int(v) for v in box]
    w, h = (x1 - x0) * SS, (y1 - y0) * SS
    lay = Image.new("RGBA", (max(1, w), max(1, h)), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    n = int((w + h) / (gap * SS)) + 2
    for i in range(n):
        o = i * gap * SS
        d.line([(o, h), (o - h, 0)], fill=(*color, alpha), width=int(width * SS))
    mask = Image.new("L", lay.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1], radius=22 * SS, fill=255)
    layer = Image.new("RGBA", lay.size, (0, 0, 0, 0))
    layer.paste(lay, (0, 0), mask)
    base.alpha_composite(layer, (x0 * SS, y0 * SS))


def arcs(base, cx, cy, r0, count=5, dr=34, color=(255, 255, 255), alpha=40,
         start=180, end=360, width=2.0):
    d = ImageDraw.Draw(base)
    for i in range(count):
        r = r0 + i * dr
        d.arc([(cx - r) * SS, (cy - r) * SS, (cx + r) * SS, (cy + r) * SS],
              start=start, end=end, fill=(*color, alpha), width=int(width * SS))


def burst(base, cx, cy, r, color, alpha=230, spokes=12, width=4.0):
    d = ImageDraw.Draw(base)
    for i in range(spokes):
        a = math.pi * 2 * i / spokes
        d.line([(cx + math.cos(a) * r * .28) * SS, (cy + math.sin(a) * r * .28) * SS,
                (cx + math.cos(a) * r) * SS, (cy + math.sin(a) * r) * SS],
               fill=(*color, alpha), width=int(width * SS))


def fithead(base, lines, x_right, y, size, pal, max_w=None, max_h=None,
            leading=1.08, hi=None):
    """Titre qui rétrécit jusqu'à tenir dans la bande (jamais de débordement)."""
    max_w = max_w or (W - 2 * M)
    if max_h:
        size = fit_block(base, lines, max_w, max_h, size, CAIRO, leading,
                         floor=30)
    return head(base, lines, x_right, y, size, pal, hi=hi, max_w=max_w,
                leading=leading)


def kicker(base, text, x, y, pal, anchor="ls", size=17):
    """Micro-label monospace + carré d'accent : l'ossature éditoriale."""
    col = pal["soft"] if not light(pal) else (124, 108, 156)
    d = ImageDraw.Draw(base)
    tw = d.textlength(text, font=font(MONO, size)) / SS
    dx = x - tw - 16 if anchor == "rs" else x + 14
    d.rectangle([(x if anchor == "ls" else x - 8) * SS, (y - 16) * SS,
                 (x + 8 if anchor == "ls" else x) * SS, (y - 8) * SS],
                fill=(*P_AURA, 255))
    lat(base, text, dx if anchor == "ls" else x - 16, y, size, col, MONO,
        anchor=anchor, tracking=1.1)


def ticker(base, text, y, pal, h=44, bg=None, fg=None):
    """Bandeau qui court : très « print », remplit les zones mortes."""
    bg = bg or P_INK
    fg = fg or P_WHITE
    d = ImageDraw.Draw(base)
    rrect(base, (0, y, W, y + h), 0, fill=(*bg, 255))
    f = font(MONO, 15)
    unit = text + "   "
    tw = d.textlength(unit, font=f) / SS
    if tw <= 1:
        return
    x = -((y * 3) % tw)
    while x < W:
        d.text((x * SS, (y + h / 2) * SS), unit, font=f, fill=(*fg, 240), anchor="lm")
        x += tw


def corner_marks(base, pal, inset=26):
    col = pal["soft"] if not light(pal) else (150, 136, 178)
    d = ImageDraw.Draw(base)
    for x, y in ((inset, inset), (W - inset, inset),
                 (inset, H - FOOT - inset), (W - inset, H - FOOT - inset)):
        d.line([(x - 7) * SS, y * SS, (x + 7) * SS, y * SS], fill=(*col, 150),
               width=int(1.4 * SS))
        d.line([x * SS, (y - 7) * SS, x * SS, (y + 7) * SS], fill=(*col, 150),
               width=int(1.4 * SS))


def vlabel(base, text, pal, x=30, y=200, size=15):
    col = pal["soft"] if not light(pal) else (150, 136, 178)
    lat(base, text, x, y, size, col, MONO, anchor="ls", rot=-90, tracking=1.6)


def topbar(base, pal, k, n, word=True):
    logo_tile(base, M, 38, 52, grad=(P_VIO, P_VIO_L))
    if word:
        col = pal["txt"] if not light(pal) else P_INK
        lat(base, "SAWTIFY", M + 64, 72, 19, col, MONO, anchor="ls", tracking=2.4)
        lat(base, "VOIX · DARIJA · 24H", M + 64, 92, 12,
            pal["soft"] if not light(pal) else (124, 108, 156), MONO,
            anchor="ls", tracking=1.4)
    num_dot(base, k, n, pal)


def footer(base, pal, k, n, cta="sawtify.space", label="اسحب"):
    y0 = H - FOOT
    d = ImageDraw.Draw(base)
    rrect(base, (0, y0, W, H), 0, fill=(*P_INK, 255))
    wave(base, M, y0 + 26, 62, 32, bars=7, color=P_AURA, seed=k + 5)
    lat(base, "SAWTIFY", M + 76, y0 + 52, 17, P_WHITE, MONO, anchor="ls", tracking=2.2)
    # pastilles de progression au centre
    total_w = n * 16 + (n - 1) * 8
    x = CX - total_w / 2
    for j in range(n):
        if j <= k:
            d.ellipse([x * SS, (y0 + 36) * SS, (x + 16) * SS, (y0 + 52) * SS],
                      fill=(*P_AURA, 255))
        else:
            d.ellipse([x * SS, (y0 + 40) * SS, (x + 12) * SS, (y0 + 48) * SS],
                      fill=(*P_WHITE, 90))
        x += 24
    ar(base, label, R - 42, y0 + 20, 18, P_LILA, CAIRO_M)
    lat(base, cta, R, y0 + 52, 17, P_WHITE, MONO, anchor="rs", tracking=1.6)


def stack_label(base, pal, k, n, txt):
    """Bande fine juste au-dessus du pied : coordination du carrousel."""
    y = H - FOOT - 30
    lat(base, txt, M, y, 13, pal["soft"] if not light(pal) else (124, 108, 156),
        MONO, anchor="ls", tracking=1.5)
    lat(base, f"{k + 1:02d} / {n:02d}", R, y, 13,
        pal["soft"] if not light(pal) else (124, 108, 156), MONO, anchor="rs",
        tracking=1.5)


def big_word(base, txt, x, y, size, color, anchor="ls", alpha_col=None):
    """Mot géant : soit plein, soit en filigrane (alpha_col plus clair)."""
    lat(base, txt, x, y, size, alpha_col or color, ANTON, anchor=anchor, tracking=-4)


def stat_tile(base, box, big, small, pal, tone=None, ink=None):
    x0, y0, x1, y1 = box
    tone = tone or paper_tone(pal)
    ink = ink or (P_INK if sum(tone) > 500 else P_WHITE)
    panel(base, box, tone, 22)
    lat(base, big, x1 - 20, y1 - 22, 44, ink, ANTON, anchor="rs", tracking=-1)
    lat(base, small, x0 + 20, y1 - 26, 13, ink, MONO, anchor="ls", tracking=1.2)


# ═══════════════════════════════════════════════════════════════════════════
#  COUVERTURES
# ═══════════════════════════════════════════════════════════════════════════
def cov_hero(s, pal, k, n, seed=0, photo_name="studio-voice.jpg"):
    base = ground(pal, seed, 12)
    ink = {"txt": P_WHITE, "soft": P_LILA, "accent": P_AURA, "bg": P_INK,
           "dk": P_DEEP}
    photo_tile(base, photo_name, (0, 0, W, 620), radius=0, duo_idx=seed % 3,
               zoom=1.06, fy=0.4)
    panel(base, (0, 600, W, H - FOOT), P_INK, 0)
    dots(base, (0, 600, W, 700), P_LILA, 26, 34, 2.2)
    topbar(base, pal, k, n)
    burst(base, R - 44, 540, 40, P_AURA, 220, spokes=10, width=3)
    lat(base, s.get("display", "1"), R - 26, 540, 96, P_LILA, ANTON, anchor="rs",
        tracking=-4)
    kicker(base, "ÉDITION DARIJA", M, 690, ink)
    y = fithead(base, s["lines"], R, 720, 66, ink, max_h=370, leading=1.08)
    rule(base, M, R, y + 12, P_AURA, 3)
    ar(base, s.get("promise", ""), R, y + 32, 25, P_LILA, CAIRO_B,
       max_w=W - 2 * M, leading=1.28)
    ar(base, s.get("tape", ""), R, H - FOOT - 46, 20, P_LILA, CAIRO_M,
       max_w=W - 2 * M)
    vlabel(base, "SAWTIFY · NOV 2026", pal, 28, 300, 13)
    footer(base, pal, k, n)
    return base


def cov_bento(s, pal, k, n, seed=0, photo_name="studio-voice.jpg"):
    base = ground(pal, seed, 10, ht=((0, 0, W, H), 26, 26))
    topbar(base, pal, k, n)
    # tuile 1 — photo plein cadre à gauche
    photo_tile(base, photo_name, (0, 120, 620, 900), radius=0, duo_idx=seed % 3,
               zoom=1.2, fy=0.4)
    # tuile 2 — aplat violet + motif pois + mot géant
    panel(base, (620, 120, W, 520), P_VIO, 0)
    dots(base, (620, 120, W, 520), P_LILA, 90, 26, 2.2)
    lat(base, s.get("display", "1"), W - 26, 350, 190, P_LILA, ANTON, anchor="rs",
        tracking=-8)
    lat(base, "CHIFFRE CLÉ", W - 26, 470, 12, P_LILA, MONO, anchor="rs", tracking=1.4)
    # tuile 3 — lilas + waveform + promesse
    panel(base, (620, 520, W, 900), P_LILA, 0)
    wave(base, 650, 556, 380, 60, bars=22, color=P_VIO, seed=seed + 2, alpha=235)
    ar(base, s.get("promise", ""), W - 24, 646, 24, P_INK, CAIRO_B,
       max_w=W - 660, leading=1.28)
    lat(base, "QUESTIONS CLIENTS", 646, 862, 12, P_VIO, MONO, anchor="ls",
        tracking=1.4)
    # bande typo
    panel(base, (0, 900, W, H - FOOT), P_PAPER if not light(pal) else P_WHITE, 0)
    rule(base, M, R, 932, P_VIO, 3)
    lat(base, "LA PROMESSE", M, 966, 13, P_VIO, MONO, anchor="ls", tracking=1.7)
    fithead(base, s["lines"], R, 986, 52, {"txt": P_INK, "soft": (124, 108, 156),
                                           "accent": P_VIO, "bg": P_WHITE},
            max_h=170, leading=1.06)
    ar(base, s.get("tape", ""), R, H - FOOT - 40, 19, (124, 108, 156), CAIRO_M,
       max_w=W - 2 * M)
    footer(base, pal, k, n)
    return base


def cov_circle(s, pal, k, n, seed=0, photo_name="studio-voice.jpg"):
    base = ground(pal, seed, 12)
    d = ImageDraw.Draw(base)
    cx, cy, r = W - 260, 360, 230
    arcs(base, cx, cy, r + 22, 4, 24, P_LILA, 55, 150, 390, 2)
    im = Image.open(PHOTOS / photo_name).convert("RGB")
    k2 = max(2 * r * SS / im.width, 2 * r * SS / im.height) * 1.16
    im = im.resize((int(im.width * k2), int(im.height * k2)), Image.LANCZOS)
    left = (im.width - 2 * r * SS) // 2
    top = int((im.height - 2 * r * SS) * 0.35)
    im = im.crop((left, top, left + 2 * r * SS, top + 2 * r * SS))
    dk, lt = DUOS[(seed + 1) % 3]
    g = im.convert("L")
    im = Image.merge("RGB", [
        g.point(lambda v, a=dk[0], b=lt[0]: int(a + (b - a) * v / 255)),
        g.point(lambda v, a=dk[1], b=lt[1]: int(a + (b - a) * v / 255)),
        g.point(lambda v, a=dk[2], b=lt[2]: int(a + (b - a) * v / 255)),
    ]).convert("RGBA")
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).ellipse([0, 0, im.width - 1, im.height - 1], fill=255)
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    layer.paste(im, (0, 0), mask)
    base.alpha_composite(layer, ((cx - r) * SS, (cy - r) * SS))
    d.ellipse([(cx - r - 6) * SS, (cy - r - 6) * SS, (cx + r + 6) * SS,
               (cy + r + 6) * SS], outline=(*P_AURA, 255), width=int(4 * SS))
    topbar(base, pal, k, n)
    kicker(base, "ÉDITION DARIJA", M, 200, pal)
    panel(base, (0, 600, W, 902), pal["dk"], 0)
    dots(base, (0, 600, W, 660), P_LILA, 26, 32, 2.0)
    fithead(base, s["lines"], R - 26, 630, 56, {"txt": P_WHITE, "soft": P_LILA,
                                               "accent": P_AURA, "bg": pal["dk"],
                                               "dk": P_DEEP},
            max_h=210, leading=1.08)
    panel(base, (0, 900, W, 906), P_AURA, 0)
    ar(base, s.get("promise", ""), R, 918, 21, pal["soft"], CAIRO_B,
       max_w=W - 2 * M, leading=1.24)
    panel(base, (M, 1010, M + 280, 1130), paper_tone(pal), 22)
    lat(base, "CHIFFRE CLÉ", M + 22, 1052, 13, P_VIO, MONO, anchor="ls", tracking=1.5)
    lat(base, s.get("display", "1"), M + 22, 1112, 52, P_VIO, ANTON, anchor="ls",
        tracking=-2)
    panel(base, (M + 300, 1010, R, 1130), P_DEEP, 22)
    wave(base, M + 322, 1034, 300, 44, bars=16, color=P_LILA, seed=seed + 4)
    lat(base, "SAWTIFY · VOIX DARIJA", M + 322, 1106, 13, P_LILA, MONO,
        anchor="ls", tracking=1.3)
    ar(base, s.get("tape", ""), R, H - FOOT - 44, 19,
       pal["soft"] if not light(pal) else (124, 108, 156), CAIRO_M,
       max_w=W - 2 * M)
    footer(base, pal, k, n)
    return base


def cov_strip(s, pal, k, n, seed=0, photo_name="studio-voice.jpg"):
    base = ground(pal, seed, 10, ht=((0, 700, W, 780), 22, 26))
    topbar(base, pal, k, n)
    slots = [(0, 0, 360, 700), (360, 0, 720, 700), (720, 0, W, 700)]
    for idx, box in enumerate(slots):
        photo_tile(base, photo_name, box, radius=0, duo_idx=(seed + idx) % 3,
                   zoom=1.9, focus=(0.15 + 0.35 * idx), fy=0.42)
    d = ImageDraw.Draw(base)
    for x in (360, 720):
        d.line([x * SS, 120 * SS, x * SS, 700 * SS], fill=(*P_INK, 110),
               width=int(2 * SS))
    panel(base, (0, 700, W, 772), P_INK, 0)
    lat(base, "ÉDITION DARIJA · 30 JOURS", 26, 744, 15, P_LILA, MONO, anchor="ls",
        tracking=1.6)
    lat(base, s.get("display", "1"), R - 26, 744, 26, P_AURA, ANTON, anchor="rs")
    y = fithead(base, s["lines"], R, 806, 64, pal, max_h=250, leading=1.08)
    y = min(y, 1150)
    panel(base, (M, y + 18, R, min(y + 92, H - FOOT - 40)), pal["dk"], 18)
    ar(base, s.get("promise", ""), R - 26, y + 36, 24, P_WHITE, CAIRO_B,
       max_w=W - 2 * M - 52, leading=1.24)
    ar(base, s.get("tape", ""), R, H - FOOT - 44, 19,
       pal["soft"] if not light(pal) else (124, 108, 156), CAIRO_M,
       max_w=W - 2 * M)
    footer(base, pal, k, n)
    return base


COVERS = [cov_hero, cov_bento, cov_circle, cov_strip]


# ═══════════════════════════════════════════════════════════════════════════
#  MILIEU — constat
# ═══════════════════════════════════════════════════════════════════════════
def mid_statement(s, pal, k, n, seed=0, photo_name="studio-voice.jpg"):
    base = ground(pal, seed, 12)
    topbar(base, pal, k, n)
    photo_tile(base, photo_name, (W - 420, 120, W, H - FOOT), radius=0,
               duo_idx=(seed + 2) % 3, zoom=1.3, fy=0.4)
    panel(base, (W - 420, 120, W, 180), P_AURA, 0)
    lat(base, "LE CONSTAT", W - 400, 158, 14, P_INK, MONO, anchor="ls",
        tracking=1.6)
    kicker(base, "POURQUOI ÇA BLOQUE", M, 190, pal)
    y = fithead(base, s["lines"], W - 460, 220, 70, pal, max_w=560, max_h=380,
                leading=1.08)
    rule(base, M, W - 460, min(y + 14, 620), pal["accent"], 3)
    ar(base, s.get("tape", ""), W - 460, min(y + 34, 640), 25, pal["soft"],
       CAIRO_B, max_w=560, leading=1.3)
    dots(base, (M, 720, W - 470, 880), pal["txt"], 34, 34, 2.2)
    panel(base, (M, 900, M + 260, 1020), paper_tone(pal), 22)
    lat(base, f"{k + 1:02d}", M + 22, 992, 62, P_VIO, ANTON, anchor="ls",
        tracking=-2)
    lat(base, "SLIDE", M + 22, 928, 13, P_VIO, MONO, anchor="ls", tracking=1.5)
    panel(base, (M + 280, 900, W - 460, 1020), pal["dk"], 22)
    burst(base, M + 326, 942, 20, P_AURA, 210, spokes=8, width=2.4)
    lat(base, "1 IDÉE / SLIDE", M + 362, 938, 13, P_LILA, MONO, anchor="ls",
        tracking=1.3)
    lat(base, "MÉTHODE SAWTIFY", M + 362, 984, 13, P_AURA, MONO, anchor="ls",
        tracking=1.3)
    panel(base, (0, 1080, W - 420, H - FOOT), pal["dk"], 0)
    wave(base, 26, 1108, 300, 44, color=P_AURA, seed=seed + 6)
    lat(base, "SAWTIFY · VOIX DARIJA · 24H", 26, H - FOOT - 34, 13, P_LILA, MONO,
        anchor="ls", tracking=1.3)
    footer(base, pal, k, n)
    return base


# ═══════════════════════════════════════════════════════════════════════════
#  MILIEU — constat numéroté (3 compositions)
# ═══════════════════════════════════════════════════════════════════════════
def mid_item(item, num, pal, k, n, seed=0, photo_name="mic-hero.jpg", total=3):
    v = (num - 1) % 3
    if v == 0:
        return _item_a(item, num, pal, k, n, seed, photo_name, total)
    if v == 1:
        return _item_b(item, num, pal, k, n, seed, photo_name, total)
    return _item_c(item, num, pal, k, n, seed, photo_name, total)


def _item_a(item, num, pal, k, n, seed, photo_name, total):
    base = ground(pal, seed, 12)
    topbar(base, pal, k, n)
    photo_tile(base, photo_name, (0, 120, 560, 880), radius=0,
               duo_idx=seed % 3, zoom=1.2, fy=0.4)
    panel(base, (0, 880, 560, 946), P_AURA, 0)
    lat(base, f"CONSTAT {num:02d} / {total:02d}", 26, 920, 17, P_INK, MONO,
        anchor="ls", tracking=1.6)
    panel(base, (0, 946, 560, H - FOOT), pal["bg"], 0)
    dots(base, (0, 946, 560, H - FOOT), pal["txt"], 30, 30, 2.0)
    panel(base, (26, 976, 520, 1044), paper_tone(pal), 14)
    ar(base, "سمع، و من بعد قرّر.", 506, 992, 22, P_INK, CAIRO_B, max_w=460)
    wave(base, 26, 1060, 320, 40, color=P_AURA, seed=seed + 3)
    lat(base, "PREUVE · TERRAIN", 26, H - FOOT - 60, 13,
        pal["soft"] if not light(pal) else (124, 108, 156), MONO, anchor="ls",
        tracking=1.4)
    # colonne droite
    panel(base, (560, 120, W, H - FOOT), pal["dk"], 0)
    dots(base, (560, 120, W, H - FOOT), P_LILA, 40, 34, 2.2)
    ar(base, item, W - 26, 170, 40 if len(item) < 46 else 34, P_WHITE, CAIRO_B,
       max_w=440, leading=1.26)
    rule(base, 600, W - 26, 380, P_AURA, 2, 160)
    big_word(base, f"0{num}", W - 26, 900, 260, P_LILA, anchor="rs")
    lat(base, f"{num:02d} / {total:02d}", W - 26, 944, 15, P_LILA, MONO,
        anchor="rs", tracking=1.6)
    panel(base, (0, 1120, 560, 1164), P_VIO, 0)
    lat(base, "SAWTIFY · DARIJA · 24H", 26, 1148, 13, P_WHITE, MONO, anchor="ls",
        tracking=1.4)
    lat(base, "UNE SEULE IDÉE PAR SLIDE", W - 26, H - FOOT - 60, 13, P_LILA, MONO,
        anchor="rs", tracking=1.3)
    footer(base, pal, k, n)
    return base


def _item_b(item, num, pal, k, n, seed, photo_name, total):
    paper = {"bg": P_WHITE, "txt": P_INK, "soft": (124, 108, 156),
             "accent": P_VIO, "dk": P_DEEP}
    base = ground(paper, seed, 9)
    photo_tile(base, photo_name, (0, 0, W, 400), radius=0, duo_idx=(seed + 1) % 3,
               zoom=1.5, fy=0.42)
    panel(base, (0, 400, W, 470), P_VIO, 0)
    lat(base, f"CONSTAT {num:02d} / {total:02d}", 26, 442, 17, P_LILA, MONO,
        anchor="ls", tracking=1.7)
    lat(base, "SAWTIFY · DARIJA", R - 26, 442, 15, P_LILA, MONO, anchor="rs",
        tracking=1.4)
    num_dot(base, k, n, paper, y=520)
    ar(base, item, R, 528, 46, P_INK, CAIRO_B, max_w=W - 2 * M, leading=1.22)
    rule(base, M, R, 700, P_VIO, 4)
    photo_tile(base, "script-notebook.jpg", (0, 740, 600, 1140), radius=0,
               duo_idx=(seed + 2) % 3, zoom=1.4, fy=0.5)
    panel(base, (600, 740, W, 1140), P_PAPER, 0)
    dots(base, (600, 740, W, 1140), P_VIO, 34, 26, 2.0)
    panel(base, (626, 770, 856, 806), P_VIO, 10)
    lat(base, "LE GESTE", 640, 796, 12, P_WHITE, MONO, anchor="ls", tracking=1.5)
    ar(base, "سجّل، و ابعث.", W - 24, 830, 26, P_INK, CAIRO_B, max_w=380)
    big_word(base, f"0{num}", W - 24, 1100, 170, P_VIO, anchor="rs")
    panel(base, (0, 1160, W, H - FOOT), P_INK, 0)
    wave(base, M, 1188, 200, 34, bars=10, color=P_AURA, seed=seed + 8)
    lat(base, "UNE IDÉE · UNE PHRASE · UNE PREUVE", M + 226, 1212, 13, P_LILA,
        MONO, anchor="ls", tracking=1.4)
    lat(base, "500 DA", R, 1212, 22, P_WHITE, ANTON, anchor="rs", tracking=-1)
    footer(base, paper, k, n)
    return base


def _item_c(item, num, pal, k, n, seed, photo_name, total):
    base = ground(pal, seed, 12)
    photo_tile(base, photo_name, (0, 0, 500, H), radius=0, duo_idx=(seed + 2) % 3,
               zoom=1.35, fy=0.4)
    arcs(base, 250, 1350, 160, 6, 30, P_AURA, 60, 200, 340, 2)
    panel(base, (500, 0, W, 120), pal["dk"], 0)
    lat(base, "SAWTIFY · LE CONSTAT", 524, 74, 15, P_LILA, MONO, anchor="ls",
        tracking=1.6)
    num_dot(base, k, n, pal)
    kicker(base, f"CONSTAT {num:02d} / {total:02d}", 540, 210, pal)
    ar(base, item, R, 240, 44 if len(item) < 46 else 36, pal["txt"], CAIRO_B,
       max_w=W - 560, leading=1.26)
    big_word(base, f"0{num}", R, 700, 210, num_col(pal), anchor="rs")
    rule(base, 540, R, 760, pal["accent"], 3)
    dots(base, (540, 800, R, 980), pal["txt"], 60, 32, 2.4)
    wave(base, 540, 1000, 440, 46, bars=20, color=P_AURA, seed=seed + 9)
    panel(base, (540, H - FOOT - 150, R, H - FOOT - 40), pal["dk"], 20)
    ar(base, "كل مرة، نفس الطريقة.", R - 20, H - FOOT - 138, 22, P_LILA, CAIRO_B,
       max_w=W - 600)
    lat(base, "MÉTHODE", 560, H - FOOT - 60, 12, P_LILA, MONO, anchor="ls",
        tracking=1.4)
    footer(base, pal, k, n)
    return base


# ═══════════════════════════════════════════════════════════════════════════
#  MILIEU — les 3 étapes en une slide
# ═══════════════════════════════════════════════════════════════════════════
def mid_steps(steps, pal, k, n, seed=0, photo_name="mic-hero.jpg"):
    base = ground(pal, seed, 12)
    topbar(base, pal, k, n)
    kicker(base, "LA MÉTHODE · 3 GESTES", M, 180, pal)
    head(base, [["3 خطوات،", "**و خلاص**."][0]], R, 206, 26, pal, max_w=300) if False else None
    ar(base, "3 خطوات، و خلاص.", R, 196, 40, pal["txt"], CAIRO_B, max_w=520,
       leading=1.2)
    y = 300
    for i, (num, title, sub) in enumerate(steps[:3]):
        panel(base, (M, y, R, y + 190), pal["dk"] if i % 2 == 0 else paper_tone(pal), 22)
        ink = P_WHITE if i % 2 == 0 else P_INK
        soft = P_LILA if i % 2 == 0 else (124, 108, 156)
        lat(base, num, M + 26, y + 132, 96, ink if i % 2 == 0 else num_col(pal),
            ANTON, anchor="ls", tracking=-3)
        ar(base, title, R - 26, y + 44, 30, ink, CAIRO_B, max_w=600, leading=1.2)
        ar(base, sub, R - 26, y + 104, 21, soft, CAIRO_M, max_w=520, leading=1.2)
        wave(base, R - 250, y + 148, 220, 26, bars=12,
             color=P_AURA if i % 2 == 0 else P_VIO, seed=seed + i)
        y += 208
    photo_tile(base, photo_name, (0, y + 16, W, H - FOOT), radius=0,
               duo_idx=(seed + 1) % 3, zoom=1.5, fy=0.55)
    panel(base, (0, y + 16, W, y + 16 + 54), P_INK, 0)
    lat(base, "À TOI DE JOUER — 5 MINUTES", 26, y + 54, 15, P_LILA, MONO,
        anchor="ls", tracking=1.5)
    footer(base, pal, k, n)
    return base


# ═══════════════════════════════════════════════════════════════════════════
#  MILIEU — une seule étape, plein cadre
# ═══════════════════════════════════════════════════════════════════════════
def mid_step(step, j, total_steps, pal, k, n, seed=0, photo_name="mic-hero.jpg"):
    num, title, sub = step
    base = ground(pal, seed, 12)
    topbar(base, pal, k, n)
    kicker(base, f"ÉTAPE {num} / {total_steps:02d}", M, 180, pal)
    ar(base, title, R, 210, 50, pal["txt"], CAIRO_B, max_w=W - 2 * M, leading=1.16)
    rule(base, M, R, 320, P_AURA, 3)
    ar(base, sub, R, 340, 26, pal["soft"], CAIRO_B, max_w=W - 2 * M - 120,
       leading=1.3)
    big_word(base, num, M - 6, 800, 330, num_col(pal), anchor="ls")
    lat(base, f"{j + 1:02d} / {total_steps:02d}", M + 10, 846, 16,
        pal["soft"] if not light(pal) else (124, 108, 156), MONO, anchor="ls",
        tracking=1.6)
    wave(base, W - 360, 620, 300, 54, bars=16, color=P_AURA, seed=seed + 4)
    ticker(base, "DARIJA · 24H · 500 DA · ", 862, pal, h=44, bg=P_AURA, fg=P_INK)
    photo_tile(base, photo_name, (0, 906, W, H - FOOT), radius=0,
               duo_idx=(seed + j) % 3, zoom=1.4, fy=0.3 + 0.2 * (j % 3))
    footer(base, pal, k, n)
    return base


# ═══════════════════════════════════════════════════════════════════════════
#  MILIEU — récap checklist
# ═══════════════════════════════════════════════════════════════════════════
def mid_recap(s, pal, k, n, seed=0, photo_name="phone-hand.jpg"):
    base = ground(pal, seed, 12)
    topbar(base, pal, k, n)
    photo_tile(base, photo_name, (0, 120, W, 380), radius=0, duo_idx=(seed + 1) % 3,
               zoom=1.6, fy=0.4)
    panel(base, (0, 380, W, 442), P_INK, 0)
    lat(base, "RÉCAP · LA LISTE COMPLÈTE", 26, 420, 15, P_LILA, MONO, anchor="ls",
        tracking=1.7)
    kicker(base, "CE QU'IL TE RESTE À FAIRE", M, 490, pal)
    ar(base, "3 أشياء، و تنشر.", R, 486, 32, pal["txt"], CAIRO_B, max_w=560)
    y = 548
    for i, (num, title, sub) in enumerate(s["steps"][:3]):
        panel(base, (M, y, R, y + 140), paper_tone(pal), 20)
        lat(base, num, M + 24, y + 100, 50, P_VIO, ANTON, anchor="ls",
            tracking=-2)
        ar(base, title, R - 26, y + 30, 27, P_INK, CAIRO_B, max_w=540, leading=1.2)
        ar(base, sub, R - 26, y + 84, 20, (124, 108, 156), CAIRO_M, max_w=500)
        y += 154
    py = y + 10
    panel(base, (M, py, R, H - FOOT - 26), P_VIO, 22)
    dots(base, (M, py, R, H - FOOT - 26), P_LILA, 30, 30, 2.2)
    lat(base, "PRIX · SANS ENGAGEMENT", M + 26, py + 44, 14, P_LILA, MONO,
        anchor="ls", tracking=1.5)
    lat(base, "500", M + 26, py + 130, 62, P_WHITE, ANTON, anchor="ls",
        tracking=-2)
    lat(base, "DA", M + 168, py + 130, 24, P_LILA, MONO, anchor="ls")
    ar(base, "الملف كامل · 24 ساعة", R - 26, py + 56, 21, P_LILA, CAIRO_B,
       max_w=520)
    lat(base, "sawtify.space", R - 26, py + 130, 20, P_AURA, ANTON, anchor="rs")
    footer(base, pal, k, n)
    return base


def mid_quote(s, pal, k, n, seed=0, photo_name="script-notebook.jpg"):
    return mid_recap(s, pal, k, n, seed, photo_name)


# ═══════════════════════════════════════════════════════════════════════════
#  CLÔTURES
# ═══════════════════════════════════════════════════════════════════════════
def end_card(s, pal, k, n, seed=0):
    paper = {"bg": P_WHITE, "txt": P_INK, "soft": (124, 108, 156),
             "accent": P_VIO, "dk": P_DEEP}
    base = ground(paper, seed, 9)
    topbar(base, paper, k, n)
    photo_tile(base, s.get("photo", "studio-voice.jpg"), (0, 120, W, 520), radius=0,
               duo_idx=seed % 3, zoom=1.5, fy=0.35)
    panel(base, (0, 520, W, 590), P_VIO, 0)
    lat(base, "L'OFFRE", 26, 562, 16, P_LILA, MONO, anchor="ls", tracking=1.8)
    ar(base, s.get("caption", ""), R - 26, 544, 21, P_LILA, CAIRO_B, max_w=560)
    fithead(base, s["lines"], R, 614, 54, paper, max_h=170, leading=1.1)
    y = 812
    for i, g in enumerate(s.get("guarantees", [])[:3]):
        panel(base, (M, y, R, y + 76), P_LILA, 14)
        tick(base, M + 34, y + 38, 13, P_VIO, 3.4)
        ar(base, g, R - 24, y + 16, 21, P_INK, CAIRO_B, max_w=W - 2 * M - 80)
        y += 88
    panel(base, (M, 1090, R, H - FOOT - 24), P_INK, 22)
    lat(base, "500", M + 28, H - FOOT - 96, 74, P_WHITE, ANTON, anchor="ls",
        tracking=-2)
    lat(base, "DA", M + 216, H - FOOT - 96, 24, P_LILA, MONO, anchor="ls")
    dot(base, (R - 150, 1122), 6, P_AURA) if False else None
    ar(base, "الملف كامل · ملكك", R - 26, 1122, 21, P_LILA, CAIRO_B, max_w=520)
    lat(base, s.get("cta", "sawtify.space"), R - 26, H - FOOT - 60, 22, P_AURA,
        ANTON, anchor="rs")
    footer(base, paper, k, n, label="اطلب درك")
    return base


def _has_icon(name):
    return name in ("check", "mic", "bolt", "download", "star", "wave", "arrow")


def end_receipt(s, pal, k, n, seed=0):
    paper = {"bg": P_LILA, "txt": P_INK, "soft": (124, 108, 156),
             "accent": P_VIO, "dk": P_DEEP}
    base = ground(paper, seed, 8)
    topbar(base, paper, k, n)
    # le ticket
    x0, x1, y0, y1 = M - 6, R + 6, 190, H - FOOT - 170
    panel(base, (x0, y0, x1, y1), P_WHITE, 10)
    dots(base, (x0 + 10, y0 + 10, x1 - 10, y0 + 70), (196, 181, 253), 120, 22, 2.2)
    ImageDraw.Draw(base).rectangle([x0 * SS, (y0 + 1) * SS, x1 * SS, (y0 + 8) * SS],
                                  fill=(*P_VIO, 255))
    lat(base, "SAWTIFY · REÇU DE COMMANDE", x0 + 26, y0 + 60, 15, P_VIO, MONO,
        anchor="ls", tracking=1.5)
    fithead(base, s["lines"], x1 - 26, y0 + 92, 54, paper,
            max_w=(x1 - x0) - 60, max_h=200, leading=1.1)
    rule(base, x0 + 26, x1 - 26, y0 + 330, P_VIO, 2, 120)
    y = y0 + 360
    for g in s.get("guarantees", [])[:3]:
        lat(base, "—", x0 + 26, y, 20, P_VIO, MONO, anchor="ls")
        ar(base, g, x1 - 26, y - 22, 24, P_INK, CAIRO_B, max_w=(x1 - x0) - 90)
        y += 88
    rule(base, x0 + 26, x1 - 26, y0 + 640, P_VIO, 2, 120)
    lat(base, "TOTAL", x0 + 26, y0 + 690, 15, P_VIO, MONO, anchor="ls",
        tracking=1.5)
    lat(base, "500 DA", x1 - 26, y0 + 706, 66, P_INK, ANTON, anchor="rs",
        tracking=-2)
    ar(base, "دج · الملف كامل", x1 - 26, y0 + 730, 20, (124, 108, 156), CAIRO_B,
       max_w=420)
    ticker(base, "SANS ABONNEMENT · SANS ENGAGEMENT · ", y0 + 790, pal, h=40,
           bg=P_INK, fg=P_LILA)
    lat(base, s.get("cta", "sawtify.space"), R, H - FOOT - 116, 26, P_VIO,
        ANTON, anchor="rs")
    ar(base, s.get("tape", ""), M, H - FOOT - 140, 22, P_INK, CAIRO_B, max_w=620)
    footer(base, paper, k, n, label="اطلب درك")
    return base


def end_split(s, pal, k, n, seed=0):
    base = ground(pal, seed, 10)
    photo_tile(base, s.get("photo", "studio-voice.jpg"), (0, 0, W / 2, H), radius=0,
               duo_idx=(seed + 2) % 3, zoom=1.4, fy=0.4)
    panel(base, (W / 2, 0, W, H), pal["dk"], 0)
    dots(base, (W / 2, 0, W, H), P_LILA, 34, 34, 2.2)
    topbar(base, pal, k, n)
    kicker(base, "DERNIÈRE SLIDE", W / 2 + 34, 210, pal)
    fithead(base, s["lines"], R, 240, 58, pal, max_w=W / 2 - 96, max_h=300,
            leading=1.1)
    y = 620
    for g in s.get("guarantees", [])[:3]:
        lat(base, "＋", W / 2 + 34, y, 20, P_AURA, MONO, anchor="ls") if False else None
        wave(base, W / 2 + 34, y - 22, 26, 18, bars=3, color=P_AURA, seed=seed + 3)
        ar(base, g, R, y - 30, 21, P_LILA, CAIRO_B, max_w=W / 2 - 130)
        y += 84
    panel(base, (W / 2 + 34, H - FOOT - 210, R, H - FOOT - 30), P_VIO, 22)
    lat(base, "500 DA", R - 24, H - FOOT - 96, 64, P_WHITE, ANTON, anchor="rs",
        tracking=-2)
    ar(base, s.get("caption", ""), R - 24, H - FOOT - 160, 20, P_LILA, CAIRO_B,
       max_w=W / 2 - 110)
    lat(base, s.get("cta", "sawtify.space"), R - 24, H - FOOT - 64, 22, P_AURA,
        ANTON, anchor="rs")
    footer(base, pal, k, n, label="اطلب درك")
    return base


def end_pano(s, pal, k, n, seed=0, photo_name="phone-hand.jpg"):
    base = ground(pal, seed, 12)
    photo_tile(base, s.get("photo", photo_name), (0, 0, W, 700), radius=0,
               duo_idx=seed % 3, zoom=1.3, fy=0.4)
    panel(base, (0, 700, W, H - FOOT), pal["bg"], 0)
    dots(base, (0, 700, W, H - FOOT), pal["txt"], 26, 34, 2.2)
    topbar(base, pal, k, n)
    ticker(base, "500 DA · DARIJA · 24H · SANS ENGAGEMENT · ", 700, pal, h=44,
           bg=P_AURA, fg=P_INK)
    kicker(base, "L'OFFRE", M, 790, pal)
    y = fithead(base, s["lines"], R, 818, 58, pal, max_h=200, leading=1.1)
    y = min(max(y + 30, 996), 1058)
    for g in s.get("guarantees", [])[:3]:
        panel(base, (M, y, R, y + 44), paper_tone(pal), 12)
        tick(base, M + 24, y + 22, 10, P_VIO, 2.8)
        ar(base, g, R - 24, y + 7, 20, P_INK, CAIRO_B, max_w=W - 2 * M - 70)
        y += 50
    panel(base, (M, min(y + 8, H - FOOT - 96), R, H - FOOT - 26), P_INK, 20)
    lat(base, "500 DA", M + 26, H - FOOT - 84, 54, P_WHITE, ANTON, anchor="ls",
        tracking=-2)
    ar(base, s.get("caption", ""), R - 26, H - FOOT - 110, 19, P_LILA, CAIRO_B,
       max_w=520)
    lat(base, s.get("cta", "sawtify.space"), R - 26, H - FOOT - 52, 22, P_AURA,
        ANTON, anchor="rs")
    footer(base, pal, k, n, label="اطلب درك")
    return base


ENDS = [end_card, end_receipt, end_split, end_pano]


# ═══════════════════════════════════════════════════════════════════════════
#  aiguillage
# ═══════════════════════════════════════════════════════════════════════════
def build(kind, payload, pub, i, pal, k, n):
    photo = pub["slides"][0].get("photo", "studio-voice.jpg")
    seed = i * 7 + k
    if kind == "cover":
        return COVERS[i % 4](payload, pal, k, n, seed=seed, photo_name=photo)
    if kind == "statement":
        return mid_statement(payload, pal, k, n, seed=seed,
                             photo_name=pub["slides"][1].get("photo", photo))
    if kind == "item":
        items = pub["slides"][1]["items"]
        idx = items.index(payload)
        pn = ["mic-hero.jpg", "phone-hand.jpg", "script-notebook.jpg"][(i + idx) % 3]
        return mid_item(payload, idx + 1, pal, k, n, seed=seed, photo_name=pn,
                        total=len(items))
    if kind == "steps":
        return mid_steps(payload, pal, k, n, seed=seed,
                         photo_name=pub["slides"][2].get("photo", photo))
    if kind == "step":
        st, j, tot = payload
        pn = ["man-studio.jpg", "mic-hero.jpg", "shop-owners.jpg"][(i + j) % 3]
        return mid_step(st, j, tot, pal, k, n, seed=seed, photo_name=pn)
    if kind == "recap":
        return mid_recap(payload, pal, k, n, seed=seed)
    if kind == "quote":
        return mid_quote(payload, pal, k, n, seed=seed)
    return ENDS[i % 4](payload, pal, k, n, seed=seed)
