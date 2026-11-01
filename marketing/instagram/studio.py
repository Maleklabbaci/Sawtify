#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════
 studio.py — 3 SYSTÈMES ÉDITORIAUX « template » (v7)

 Références fournies par le client : carrousels Canva/Behance à typo éditoriale
 (crème + serif + surligneur orange), affiches typographiques sur fond noir
 (grotesque géant + mockup), et carrousels produit violet à cartes arrondies.

 Trois publications, trois systèmes, aucune brique partagée :

   T1 · ED — ÉDITORIAL        papier lilas, Playfair + Plex Arabic, surligneur,
                              filets fins, folio encadré, gros blancs tournants
   T2 · BL — BLOC NOIR        encre pleine, mots géants empilés, chiffre XXL,
                              bande photo plein cadre, micro-labels
   T3 · CB — CARTES VIOLET    violet plein, cartes blanches arrondies, chips,
                              mockup téléphone, « swipe »

 Chaque publication porte un levier marketing précis :
   P1 ancrage · P2 aversion à la perte · P3 FOBO (paralysie du choix)

    python3 studio.py                  # tout
    python3 studio.py --only p2        # une publication
═══════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from direction import (AURA, BOT, DEEP, INK, LIL, PAPER, RIGHT, SAFE, SOFT, TOP,
                       VIO, canvas, disc, dotgrid, kicker, line, mono, para,
                       ph, plate, rect, ring, scrim, stripes)
from editorial_slides import title
from premium import icon
from sawtify_ig import font, rrect
from workshop import ANTON, CAIRO_B, CAIRO_M, MONO, ar, ar_fit, lat, rule

OUT = Path(__file__).resolve().parent / "slides" / "studio"
PF = "Playfair-Bold.ttf"
PF_IT = "Playfair-BoldItalic.ttf"
SG = "SpaceGrotesk-Medium.ttf"
SG_B = "SpaceGrotesk-Bold.ttf"

W_ = 1080
VIO2 = (139, 92, 246)


# ═══════════════════════════════════════════════════════════════════════════
#  mesures
# ═══════════════════════════════════════════════════════════════════════════
def tw(base, text, fname, size, track=0.0) -> float:
    d = ImageDraw.Draw(base)
    f = font(fname, size)
    w = d.textlength(text, font=f) / 2.0      # SS = 2
    if track and len(text) > 1:
        w += track * (len(text) - 1)
    return w


def fit_size(base, text, fname, size, max_w, floor=14, track=0.0) -> float:
    s = size
    while s > floor and tw(base, text, fname, s, track) > max_w:
        s -= 1
    return s


def caps(base, text, x, y, size=11, color=SOFT, anchor="ls", track=2.6):
    lat(base, text.upper(), x, y, size, color, MONO, anchor=anchor, tracking=track)


def hair(base, x0, x1, y, color=INK, alpha=48, width=1.0):
    line(base, x0, y, x1, y, color, width, alpha)


def ar_block(base, lines, xr, y, max_w, size, color, hi=AURA, leading=1.16,
             floor=22, gap=0):
    """Bloc arabe multi-lignes, chaque ligne ajustée à la largeur."""
    yy = y
    for ln in lines:
        s = min(size, ar_fit(base, ln, max_w, size, CAIRO_B))
        yy = ar(base, ln, xr, yy, s, color, CAIRO_B, max_w=max_w, leading=leading,
                hi_color=hi) + gap
    return yy


def dots(base, k, n, y, color=SOFT, active=AURA):
    step, r = 13, 3.2
    x0 = W_ / 2 - (n - 1) * step / 2
    for i in range(n):
        disc(base, x0 + i * step, y, r + (0.9 if i == k else 0),
             active if i == k else color, 255 if i == k else 120)



def veil(base, box, radius, color, alpha=28):
    """Aplat translucide RÉELLEMENT composé (ImageDraw ne mélange pas l'alpha)."""
    x0, y0, x1, y1 = [int(v) for v in box]
    w, h = max(1, (x1 - x0) * 2), max(1, (y1 - y0) * 2)
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle([0, 0, w - 1, h - 1],
                                            radius=radius * 2,
                                            fill=(*color, alpha))
    base.alpha_composite(layer, (x0 * 2, y0 * 2))



def ar_center(base, text, cx, cy_mid, size, color, fname=None):
    """Texte arabe centré sur (cx, cy_mid) — composition mesurée, pas estimée."""
    fname = fname or CAIRO_B
    layer = Image.new("RGBA", (W_ * 2, 1350 * 2), (0, 0, 0, 0))
    ar(layer, text, 1060, 40, size, color, fname, max_w=2000, leading=1.2,
       hi_color=color)
    bb = layer.getbbox()
    if not bb:
        return
    ink = layer.crop(bb)
    base.alpha_composite(ink, (int(cx * 2 - ink.width / 2),
                               int(cy_mid * 2 - ink.height / 2)))


def shadow(base, box, radius, blur=16, alpha=42, offset=12):
    x0, y0, x1, y1 = box
    layer = Image.new("RGBA", (W_ * 2, 1350 * 2), (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle(
        [x0 * 2, (y0 + offset) * 2, x1 * 2, (y1 + offset) * 2],
        radius=radius * 2, fill=(26, 15, 46, alpha))
    layer = layer.filter(ImageFilter.GaussianBlur(blur * 2))
    base.alpha_composite(layer)



def ar_stack(base, words, xr, y, max_w, size, leading=0.96, floor=40, align="right"):
    """Empile des mots arabes et renvoie le BAS RÉEL de l'encre."""
    layer = Image.new("RGBA", (W_ * 2, 1350 * 2), (0, 0, 0, 0))
    yy = y
    for mot, col in words:
        sz = fit_size(base, mot, CAIRO_B, size, max_w, floor=floor)
        ar(layer, mot, xr, yy, sz, col, CAIRO_B, max_w=max_w, leading=1.0,
           hi_color=col)
        yy += sz * leading
    bb = layer.getbbox()
    if bb is None:
        return y
    ink = layer.crop(bb)
    drop = (bb[3] - bb[1]) / 2.0
    base.alpha_composite(ink, (int(bb[0]), int(y * 2)))
    return y + drop + 6


# ═══════════════════════════════════════════════════════════════════════════
#  T1 · ÉDITORIAL — papier, serif, surligneur
# ═══════════════════════════════════════════════════════════════════════════
def ed_top(base, kicker_txt, page, total, dark=False):
    ink = PAPER if dark else INK
    caps(base, "sawtify", SAFE, 74, 12, ink, track=3.4)
    caps(base, kicker_txt, RIGHT, 74, 9.5, SOFT, anchor="rs", track=2.4)
    hair(base, SAFE, RIGHT, 96, ink, 60)
    # folio encadré, en bas à droite (comme les templates Canva)
    bx0, bx1 = RIGHT - 74, RIGHT
    rrect(base, (bx0, BOT + 8, bx1, BOT + 54), 3, outline=(*ink, 90), width=1.2)
    lat(base, f"{page:02d}", (bx0 + bx1) / 2, BOT + 44, 19, ink, SG_B, anchor="ms")
    caps(base, f"/ {total:02d}", bx0 - 16, BOT + 44, 10, SOFT, anchor="rs", track=1.6)
    caps(base, "sawtify.space", SAFE, BOT + 44, 10, SOFT, track=2.0)


def ed_cover(p):
    base = canvas(P_PAPER, 5)
    line(base, SAFE - 26, 150, SAFE - 26, 1060, VIO, 1.2, 55)
    rect(base, (SAFE - 30, 150, SAFE - 22, 196), AURA)
    caps(base, p["kicker"], SAFE, 168, 10.5, VIO, track=3.2)
    caps(base, "playbook 01 / 05", RIGHT, 168, 9.5, SOFT, anchor="rs", track=2.2)
    hair(base, SAFE, RIGHT, 190, INK, 70)
    lat(base, "L'effet", SAFE, 268, 44, INK, PF, anchor="ls")
    lat(base, "d'ancrage", SAFE, 320, 44, INK, PF_IT, anchor="ls")
    yy = ar_block(base, p["cover"], RIGHT, 396, 900, 92, INK, hi=AURA, leading=1.14)
    # surligneur orange : posé sous le bloc, jamais sur la photo
    sy = min(yy + 22, 940)
    rrect(base, (SAFE, sy, SAFE + 306, sy + 70), 2, fill=(*AURA, 255))
    lat(base, "3 000 / 500", SAFE + 16, sy + 56, 40, PAPER, ANTON, anchor="ls",
        tracking=-0.5)
    caps(base, "da", SAFE + 288, sy + 56, 10, (255, 255, 255), anchor="rs", track=1.6)
    para(base, p["cover_sub"], RIGHT, sy + 6, 596, 21, (58, 44, 92), hi=VIO,
         leading=1.6)
    para(base, p["photo_note"], RIGHT, sy + 108, 596, 18, (58, 44, 92), hi=VIO,
         leading=1.55)
    # bande photo, ancrée au bas de la colonne de gauche
    ph(base, p["photo"], (SAFE, 1032, SAFE + 330, 1226), duo=1, fy=0.32)
    caps(base, "photo · studio sawtify", SAFE, 1252, 9, SOFT, track=1.8)
    ed_top(base, "", 1, p["n"])
    return base


def ed_mech(p):
    base = canvas(P_PAPER, 5)
    ed_top(base, p["kicker"], 2, p["n"])
    caps(base, "le mécanisme", SAFE, 190, 10.5, VIO, track=3.0)
    yy = ar_block(base, p["s2_title"], RIGHT, 226, 900, 60, INK, hi=AURA,
                  leading=1.18)
    yy = para(base, p["s2_body"], RIGHT, yy + 22, 900, 21, (58, 44, 92), hi=VIO,
              leading=1.62)
    # comparaison de deux chiffres, filetée
    ty = max(yy + 104, 700)
    hair(base, SAFE, RIGHT, ty, INK, 60)
    caps(base, "prix de référence", SAFE, ty + 34, 9, SOFT, track=2.0)
    sz = fit_size(base, "3 000", PF, 120, 400, floor=56)
    lat(base, "3 000", SAFE, ty + 150, sz, INK, PF, anchor="ls")
    wnum = tw(base, "3 000", PF, sz)
    d = ImageDraw.Draw(base)
    d.line([(SAFE - 4) * 2, (ty + 100) * 2, (SAFE + wnum + 10) * 2,
            (ty + 100) * 2], fill=(*AURA, 255), width=int(6 * 2))
    caps(base, "notre offre", SAFE + wnum + 40, ty + 34, 9, AURA, track=2.0)
    lat(base, "500", SAFE + wnum + 40, ty + 150, 92, AURA, ANTON, anchor="ls",
        tracking=-2)
    caps(base, "da · 30 secondes", SAFE + wnum + 44, ty + 182, 9.5, SOFT, track=1.8)
    # encart de définition, à droite du bloc chiffres
    bx = SAFE + wnum + 244
    rrect(base, (bx, ty - 40, RIGHT, ty + 190), 4, fill=(*INK, 255))
    caps(base, "le mot exact", bx + 22, ty + 4, 8.5, LIL, track=2.0)
    ar(base, "الأول هو الحكم", RIGHT - 22, ty + 26, 25, PAPER, CAIRO_B, max_w=250,
       leading=1.2, hi_color=AURA)
    para(base, "3 000 قبل 500: الرقم الأول يعطي المعنى، و الثاني غير يتبعو.",
         RIGHT - 22, ty + 86, 250, 13.5, (216, 208, 236), hi=AURA, leading=1.5)
    hair(base, SAFE, RIGHT, ty + 250, INK, 60)
    yy2 = para(base, p["s2_ex"], RIGHT, ty + 292, 940, 21, INK, hi=AURA,
               leading=1.7)
    caps(base, "source : kahneman & tversky, 1974 — anchoring", SAFE, yy2 + 42,
         8.5, SOFT, track=1.4)
    return base


def ed_example(p):
    base = canvas(P_PAPER, 5)
    ed_top(base, p["kicker"], 3, p["n"])
    caps(base, "en algérie", SAFE, 196, 10.5, VIO, track=3.0)
    yy = ar_block(base, p["s3_title"], RIGHT, 232, 900, 62, INK, hi=AURA,
                  leading=1.18)
    # bandeau de spécifications, juste sous le titre
    by = yy + 30
    rrect(base, (SAFE, by, RIGHT, by + 132), 2, fill=(*INK, 255))
    for i, (k_, v_) in enumerate(p["s3_bar"]):
        cx = SAFE + (i + 0.5) * 944 / 3
        lat(base, v_, cx, by + 56, 34, PAPER, ANTON, anchor="ms", tracking=-0.6)
        ar_center(base, k_, cx, by + 96, 15, (206, 196, 236))
        if i:
            line(base, SAFE + i * 944 / 3, by + 26, SAFE + i * 944 / 3,
                 by + 106, (255, 255, 255), 1.0, 55)
    top = by + 186
    for i, (lab, val, note) in enumerate(p["prices"]):
        y = top + i * 206
        hair(base, SAFE, RIGHT, y, INK, 70)
        caps(base, lab, RIGHT, y + 40, 9.5, SOFT, anchor="rs", track=2.2)
        col = AURA if i == 1 else INK
        sz = 92
        lat(base, val, SAFE, y + 44 + sz, sz, col, ANTON, anchor="ls",
            tracking=-1)
        caps(base, "da", SAFE + tw(base, val, ANTON, sz, -1) + 16, y + 44 + sz,
             11.5, SOFT, track=1.6)
        para(base, note, RIGHT, y + 64, 470, 18, (58, 44, 92), hi=VIO,
             leading=1.55)
    hair(base, SAFE, RIGHT, top + 412, INK, 70)
    para(base, p["s3_body"], RIGHT, top + 452, 936, 21, INK, hi=AURA,
         leading=1.68)
    return base


def ed_steps(p):
    base = canvas(P_PAPER, 5)
    ed_top(base, p["kicker"], 4, p["n"])
    caps(base, "mode d'emploi", SAFE, 196, 10.5, VIO, track=3.0)
    yy = ar_block(base, p["s4_title"], RIGHT, 232, 900, 58, INK, hi=AURA)
    y = yy + 54
    for i, (num, tete, corps) in enumerate(p["steps"]):
        hair(base, SAFE, RIGHT, y, INK, 55)
        lat(base, num, SAFE, y + 62, 34, AURA, PF, anchor="ls")
        yy2 = ar(base, tete, RIGHT, y + 26, 26, INK, CAIRO_B, max_w=760,
                 leading=1.3, hi_color=VIO)
        yy3 = para(base, corps, RIGHT, yy2 + 8, 760, 19, (58, 44, 92), hi=VIO,
                   leading=1.6)
        y = max(yy3, y + 70) + 30
    hair(base, SAFE, RIGHT, min(y, BOT - 40), INK, 55)
    return base


def ed_end(p):
    base = canvas(P_PAPER, 5)
    ed_top(base, p["kicker"], 5, p["n"])
    # carré orange plein, très « impression »
    rect(base, (SAFE, 210, SAFE + 26, 236), AURA)
    caps(base, "en résumé", SAFE + 44, 236, 10.5, VIO, track=3.0)
    yy = ar_block(base, p["end"], RIGHT, 268, 900, 74, INK, hi=AURA, leading=1.14)
    y = para(base, p["end_body"], RIGHT, yy + 30, 780, 22, (58, 44, 92), hi=VIO,
             leading=1.66)
    # bandeau d'appel, fileté haut et bas
    by = y + 70
    hair(base, SAFE, RIGHT, by, INK, 80, 1.2)
    line(base, SAFE, by + 104, RIGHT, by + 104, INK, 1.2, 80)
    lat(base, "sawtify.space", SAFE, by + 76, 40, INK, SG_B, anchor="ls", tracking=-1)
    caps(base, p["end_tag"], RIGHT, by + 74, 10.5, AURA, anchor="rs", track=2.2)
    # mini photo posée en bas, coin gauche
    ph(base, p["photo2"], (SAFE, by + 150, SAFE + 260, by + 150 + 150), duo=1,
       fy=0.36)
    para(base, p["end_note"], RIGHT, by + 150, 620, 20, (58, 44, 92), hi=VIO,
         leading=1.6)
    return base


P_PAPER = PAPER
H_ = 1350


# ═══════════════════════════════════════════════════════════════════════════
#  T2 · BLOC NOIR — encre, mots géants, chiffre XXL
# ═══════════════════════════════════════════════════════════════════════════
def bl_top(base, page, total, tag="aversion à la perte"):
    caps(base, "sawtify", SAFE, 66, 11.5, PAPER, track=3.4)
    caps(base, tag, SAFE, 92, 8.5, (150, 132, 196), track=2.0)
    caps(base, f"{page:02d} / {total:02d}", RIGHT, 66, 10, PAPER, anchor="rs",
         track=2.0)
    hair(base, SAFE, RIGHT, 116, PAPER, 55)


def bl_foot(base, k, n, label="sawtify.space"):
    hair(base, SAFE, RIGHT, BOT, PAPER, 45)
    caps(base, "500 da · 30 secondes", SAFE, BOT + 40, 9.5, (150, 132, 196),
         track=1.8)
    caps(base, label, RIGHT, BOT + 40, 9.5, (150, 132, 196), anchor="rs", track=1.8)
    dots(base, k, n, BOT + 40, color=(120, 104, 160), active=AURA)


def bl_cover(p):
    base = canvas(INK, 6)
    glow = Image.new("RGBA", (W_ * 2, 1350 * 2), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([560 * 2, 560 * 2, 1500 * 2, 1500 * 2],
                                 fill=(*VIO, 110))
    base.alpha_composite(glow.filter(ImageFilter.GaussianBlur(150)))
    # grand chiffre en contour, derrière la typo, coupé par le bord gauche
    layer = Image.new("RGBA", (560 * 2, 380 * 2), (0, 0, 0, 0))
    ImageDraw.Draw(layer).text((500 * 2, 330 * 2), p["cover_num"],
                               font=font(ANTON, 250), fill=None, anchor="rs",
                               stroke_width=int(2.2 * 2), stroke_fill=(*AURA, 210))
    base.alpha_composite(layer, (-104 * 2, 672 * 2))
    bl_top(base, 1, p["n"], p["tag"])
    y = ar_stack(base, p["cover_words"], RIGHT, 214, 900, 132, leading=0.94,
                 floor=48)
    yy2 = para(base, p["cover_sub"], RIGHT, y + 34, 620, 20, (196, 184, 224),
               hi=AURA, leading=1.58)
    caps(base, p["cover_num_note"], RIGHT, yy2 + 30, 9, (150, 132, 196),
         anchor="rs", track=1.6)
    # bande photo plein cadre
    py = 996
    scrim(base, (0, py - 110, W_, py + 40), INK, 220)
    ph(base, p["photo"], (0, py, W_, 1350), duo=2, fy=0.30)
    scrim(base, (0, py, W_, py + 130), INK, 170)
    bl_foot(base, 0, p["n"])
    return base


def bl_stat(p):
    base = canvas(INK, 6)
    bl_top(base, 2, p["n"], p["tag"])
    caps(base, "le chiffre qui fait mal", RIGHT, 176, 9.5, AURA,
         anchor="rs", track=2.6)
    # le grand nombre, en pleine largeur
    lat(base, p["stat"], SAFE, 508, 300, PAPER, ANTON, anchor="ls", tracking=-6)
    lat(base, "%" if p.get("pct") else "", SAFE + tw(base, p["stat"], ANTON, 300, -6),
        508, 150, AURA, ANTON, anchor="ls")
    hair(base, SAFE, RIGHT, 540, AURA, 255, 3.0)
    yy = ar_block(base, p["stat_title"], RIGHT, 584, 940, 54, PAPER, hi=AURA,
                  leading=1.2)
    yy = para(base, p["stat_body"], RIGHT, yy + 18, 700, 21, (196, 184, 224),
              hi=AURA, leading=1.62)
    # deux barres de comparaison (perte vs gain)
    by = max(yy + 60, 1050)
    for i, (lab, wfrac, col) in enumerate(p["bars"]):
        y = by + i * 74
        ar(base, lab, RIGHT, y - 4, 16, (196, 184, 224), CAIRO_M, max_w=400,
           leading=1.2, hi_color=(196, 184, 224))
        veil(base, (SAFE, y + 28, RIGHT, y + 44), 8, (255, 255, 255), 26)
        rrect(base, (SAFE, y + 28, SAFE + 944 * wfrac, y + 44), 8, fill=(*col, 255))
    bl_foot(base, 1, p["n"])
    return base


def bl_list(p):
    base = canvas(INK, 6)
    bl_top(base, 3, p["n"], p["tag"])
    caps(base, "ce que tu perds, maintenant", SAFE, 186, 9.5, AURA, track=2.4)
    yy = ar_block(base, p["list_title"], RIGHT, 224, 800, 56, PAPER, hi=AURA)
    y = yy + 40
    for i, (ic, tete, corps) in enumerate(p["losses"]):
        hair(base, SAFE, RIGHT, y, PAPER, 40)
        icon(base, ic, SAFE + 24, y + 66, 30, color=AURA, stroke=2.6)
        ar(base, tete, RIGHT, y + 28, 26, PAPER, CAIRO_B, max_w=820, leading=1.2,
           hi_color=AURA)
        para(base, corps, RIGHT, y + 70, 800, 17, (196, 184, 224), hi=AURA,
             leading=1.5)
        y += 148
    # bande orange : la phrase qui reste en tête
    by = min(max(y + 14, 1010), 1082)
    rrect(base, (SAFE, by, RIGHT, by + 104), 4, fill=(*AURA, 255))
    ar(base, p["list_band"], RIGHT - 28, by + 34, 26, INK, CAIRO_B, max_w=760,
       leading=1.2, hi_color=INK)
    icon(base, "mic", SAFE + 52, by + 52, 30, color=INK, stroke=2.4)
    bl_foot(base, 2, p["n"])
    return base


def bl_fix(p):
    base = canvas(INK, 6)
    bl_top(base, 4, p["n"], p["tag"])
    caps(base, "la sortie, en 3 gestes", SAFE, 186, 9.5, AURA, track=2.4)
    yy = ar_block(base, p["fix_title"], RIGHT, 200, 560, 50, PAPER, hi=AURA)
    # photo carrée en haut à gauche, sous le titre
    py0 = 200
    ph(base, p["photo2"], (SAFE, py0, SAFE + 330, py0 + 260), duo=2, fy=0.3)
    caps(base, "atelier sawtify · alger", SAFE, py0 + 292, 8.5, (150, 132, 196),
         track=1.6)
    ar(base, "الصوت ماشي زينة، الصوت خدمة.", SAFE + 330, py0 + 330, 22, PAPER,
       CAIRO_B, max_w=340, leading=1.24, hi_color=AURA)
    y = max(yy, py0 + 430) + 20
    for i, (num, tete, corps) in enumerate(p["fix"]):
        lat(base, f"0{i+1}", SAFE, y + 34, 32, AURA, ANTON, anchor="ls", tracking=-0.5)
        yy2 = ar(base, tete, RIGHT, y, 26, PAPER, CAIRO_B, max_w=800, leading=1.24,
                 hi_color=AURA)
        yy3 = para(base, corps, RIGHT, yy2 + 8, 800, 18, (196, 184, 224), hi=AURA,
                   leading=1.55)
        y = max(yy3, y + 116) + 22
    bl_foot(base, 3, p["n"])
    return base


def bl_end(p):
    base = canvas(INK, 6)
    bl_top(base, 5, p["n"], p["tag"])
    glow = Image.new("RGBA", (W_ * 2, 1350 * 2), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([-300 * 2, 500 * 2, 700 * 2, 1500 * 2],
                                 fill=(*AURA, 90))
    base.alpha_composite(glow.filter(ImageFilter.GaussianBlur(160)))
    caps(base, "dernière slide, première décision", SAFE, 196, 9.5, AURA, track=2.2)
    yy = ar_block(base, p["end"], RIGHT, 250, 940, 88, PAPER, hi=AURA, leading=1.1)
    y = para(base, p["end_body"], RIGHT, yy + 24, 760, 21, (196, 184, 224),
             hi=AURA, leading=1.62)
    # bloc CTA plein orange
    cy = max(y + 60, 1000)
    rrect(base, (SAFE, cy, RIGHT, cy + 128), 4, fill=(*AURA, 255))
    lat(base, "sawtify.space", SAFE + 34, cy + 82, 46, INK, SG_B, anchor="ls",
        tracking=-1)
    caps(base, p["end_tag"], RIGHT - 34, cy + 78, 10, INK, anchor="rs", track=1.8)
    hair(base, SAFE, RIGHT, cy + 168, PAPER, 45)
    caps(base, "500 da · 30 secondes · 1 fichier", SAFE, cy + 208, 9.5,
         (196, 184, 224), track=1.8)
    return base


# ═══════════════════════════════════════════════════════════════════════════
#  T3 · CARTES VIOLET — aplats, cartes blanches, chips, swipe
# ═══════════════════════════════════════════════════════════════════════════
def cb_bg():
    base = canvas(VIO, 4)
    # deux disques très doux pour la profondeur
    layer = Image.new("RGBA", (W_ * 2, 1350 * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse([-260 * 2, -300 * 2, 520 * 2, 480 * 2], fill=(*VIO2, 90))
    d.ellipse([820 * 2, 980 * 2, 1400 * 2, 1560 * 2], fill=(*DEEP, 90))
    base.alpha_composite(layer.filter(ImageFilter.GaussianBlur(120)))
    return base


def cb_top(base, page, total, tag="fobo · playbook 03"):
    caps(base, "sawtify", SAFE, 68, 11.5, PAPER, track=3.2)
    caps(base, tag, RIGHT, 68, 8.5, (222, 214, 245), anchor="rs", track=2.0)
    caps(base, f"{page:02d}/{total:02d}", RIGHT, 92, 8.5, (222, 214, 245),
         anchor="rs", track=1.8)


def cb_swipe(base, y, label="swipe"):
    w = 132 + tw(base, label.upper(), MONO, 10, 1.8)
    rrect(base, (RIGHT - w, y, RIGHT, y + 40), 20, fill=(255, 255, 255, 255))
    caps(base, label, RIGHT - w + 20, y + 26, 10, VIO, track=1.8)
    d = ImageDraw.Draw(base)
    ax = RIGHT - 34
    d.line([(ax - 16) * 2, (y + 20) * 2, ax * 2, (y + 20) * 2], fill=(*VIO, 255),
           width=4)
    d.line([(ax - 7) * 2, (y + 14) * 2, ax * 2, (y + 20) * 2], fill=(*VIO, 255),
           width=4)
    d.line([(ax - 7) * 2, (y + 26) * 2, ax * 2, (y + 20) * 2], fill=(*VIO, 255),
           width=4)


def cb_chip(base, x, y, label, fill=(255, 255, 255), col=PAPER, size=9.5,
            alpha=34):
    w = 34 + tw(base, label.upper(), MONO, size, 1.6)
    veil(base, (x - w, y, x, y + 32), 16, fill, alpha)
    caps(base, label, x - 17, y + 21, size, col, anchor="rs", track=1.6)
    return w


def cb_foot(base, k, n, dark_card=False):
    caps(base, "sawtify.space", SAFE, BOT + 22, 9.5, (222, 214, 245), track=1.8)
    dots(base, k, n, BOT + 16, color=(255, 255, 255), active=AURA)


def cb_cover(p):
    base = cb_bg()
    cb_top(base, 1, p["n"], p["tag"])
    cb_chip(base, RIGHT, 132, "3 choix", alpha=34)
    yy = ar_stack(base, [(m, PAPER) for m in p["cover"]], RIGHT, 186, 900, 72,
                  leading=0.98, floor=44)
    # carte blanche « question »
    cy = min(yy + 26, 640)
    shadow(base, (SAFE, cy, RIGHT, cy + 256), 26)
    rrect(base, (SAFE, cy, RIGHT, cy + 256), 26, fill=(250, 249, 255, 255))
    caps(base, p["card_kicker"], SAFE + 34, cy + 50, 9.5, (124, 108, 156),
         track=1.6)
    wf = 44 + tw(base, "fo bo", MONO, 9, 1.6)
    rrect(base, (RIGHT - 34 - wf, cy + 30, RIGHT - 34, cy + 62), 16,
          fill=(*VIO, 255))
    caps(base, "FOBO", RIGHT - 34 - wf / 2, cy + 51, 9, PAPER, anchor="ms",
         track=1.4)
    ar(base, p["cover_card"], RIGHT - 34, cy + 82, 32, INK, CAIRO_B, max_w=760,
       leading=1.3, hi_color=VIO)
    px = SAFE + 34
    for i, lab in enumerate(p["chips"]):
        txt = lab.upper()
        tw_ = tw(base, txt, MONO, 9.5, 1.5)
        w = tw_ + 30
        rrect(base, (px, cy + 186, px + w, cy + 224), 19,
              fill=(*VIO, 255) if i == 1 else (237, 233, 254, 255))
        # texte centré par mesure exacte (l'ancrage "ms" du mono dérive)
        lat(base, txt, px + (w - tw_) / 2, cy + 209, 9.5,
            PAPER if i == 1 else VIO, MONO, tracking=1.5)
        px += w + 10
    # bas de slide : texte à gauche, photo arrondie à droite
    by = cy + 292
    caps(base, p["cover_latin"], SAFE, by + 24, 9, (255, 214, 120), track=1.8)
    para(base, p["cover_sub"], SAFE + 500, by + 52, 500, 17.5, (236, 230, 250),
         hi=(255, 214, 120), leading=1.58)
    cb_swipe(base, by)
    ph(base, p["photo"], (632, by + 58, RIGHT, by + 58 + 250), duo=0, fy=0.3,
       radius=22)
    cb_foot(base, 0, p["n"])
    return base


def cb_define(p):
    base = cb_bg()
    cb_top(base, 2, p["n"], p["tag"])
    shadow(base, (SAFE, 168, RIGHT, 646), 28)
    rrect(base, (SAFE, 168, RIGHT, 646), 28, fill=(250, 249, 255, 255))
    caps(base, p["def_tag"], SAFE + 40, 224, 9.5, VIO, track=2.4)
    lat(base, "FOBO", SAFE + 40, 330, 92, INK, SG_B, anchor="ls", tracking=-3)
    lat(base, "fear of better options", SAFE + 42, 374, 19, (124, 108, 156), SG,
        anchor="ls")
    hair(base, SAFE + 40, RIGHT - 40, 410, INK, 40)
    yy = ar(base, p["def_body"], RIGHT - 40, 452, 27, INK, CAIRO_B, max_w=856,
            leading=1.44, hi_color=VIO)
    caps(base, "terme : patrick mcginnis · 2019", SAFE + 40, 610, 8,
         (150, 140, 175), track=1.6)
    y = 690
    for ic, txt in p["def_items"]:
        veil(base, (SAFE, y, RIGHT, y + 108), 22, (255, 255, 255), 30)
        icon(base, ic, SAFE + 50, y + 54, 26, color=PAPER, stroke=2.4)
        ar(base, txt, RIGHT - 34, y + 32, 22, PAPER, CAIRO_B, max_w=720,
           leading=1.2, hi_color=(255, 214, 120))
        y += 118
    caps(base, "ما كاينش كاطالوغ، كاين قرار", SAFE, y + 42, 9.5,
         (255, 214, 120), track=1.6)
    cb_foot(base, 1, p["n"])
    return base


def cb_three(p):
    base = cb_bg()
    cb_top(base, 3, p["n"], p["tag"])
    yy = ar_stack(base, [(m, PAPER) for m in p["three_title"]], RIGHT, 150, 780, 54,
                  leading=0.98, floor=40)
    y = max(yy + 26, 300)
    for i, (num, tete, corps, hi) in enumerate(p["three"]):
        h = 208
        shadow(base, (SAFE, y, RIGHT, y + h), 24, blur=14, alpha=38)
        rrect(base, (SAFE, y, RIGHT, y + h), 24,
              fill=(*AURA, 255) if i == 1 else (250, 249, 255, 255))
        fg = INK
        acc = INK if i == 1 else VIO
        caps(base, f"option {num}", SAFE + 32, y + 44, 9, acc, track=2.0)
        # la valeur, en arabe, mesurée dans une pastille
        wv = 40 + tw(base, hi, CAIRO_B, 30)
        rrect(base, (SAFE + 32, y + 68, SAFE + 32 + wv, y + 132), 10,
              fill=(*fg, 255) if i != 1 else (*INK, 255))
        ar_center(base, hi, SAFE + 32 + wv / 2, y + 100, 26,
                  PAPER if True else INK)
        ar(base, tete, RIGHT - 32, y + 34, 25, fg, CAIRO_B, max_w=520,
           leading=1.2, hi_color=acc)
        para(base, corps, RIGHT - 32, y + 78, 520, 17,
             fg if i == 1 else (58, 44, 92), hi=acc, leading=1.5)
        y += h + 20
    # ligne de clôture
    line(base, SAFE, y + 16, RIGHT, y + 16, (255, 255, 255), 1.2, 70)
    caps(base, "un seul chemin", SAFE, y + 56, 9, (255, 214, 120), track=2.0)
    ar(base, p["three_note"], RIGHT, y + 38, 24, PAPER, CAIRO_B, max_w=620,
       leading=1.2, hi_color=(255, 214, 120))
    cb_foot(base, 2, p["n"])
    return base


def cb_pick(p):
    base = cb_bg()
    cb_top(base, 4, p["n"], p["tag"])
    yy = ar_block(base, p["pick_title"], RIGHT, 150, 900, 56, PAPER,
                  hi=(255, 214, 120))
    ty = yy + 26
    ph(base, p["photo2"], (SAFE, ty, SAFE + 330, ty + 470), duo=0, fy=0.3,
       radius=26)
    x0 = SAFE + 366
    for i, (lab, val) in enumerate(p["pick_rows"]):
        y = ty + i * 138
        shadow(base, (x0, y, RIGHT, y + 116), 20, blur=12, alpha=30)
        rrect(base, (x0, y, RIGHT, y + 116), 20, fill=(250, 249, 255, 255))
        caps(base, lab, x0 + 26, y + 38, 8.5, (124, 108, 156), track=1.8)
        ar(base, val, RIGHT - 26, y + 50, 24, INK, CAIRO_B, max_w=480, leading=1.2,
           hi_color=VIO)
    caps(base, "prix unique, décision unique", x0, ty + 470, 9.5, (236, 230, 250),
         track=1.8)
    # bande de réassurance, pleine largeur
    by = ty + 520
    rrect(base, (SAFE, by, RIGHT, by + 168), 22, fill=(*DEEP, 255))
    for i, (k_, v_) in enumerate(p["pick_proof"]):
        cx = SAFE + (i + 0.5) * 944 / 3
        lat(base, v_, cx, by + 74, 40, PAPER, ANTON, anchor="ms", tracking=-0.8)
        ar_center(base, k_, cx, by + 122, 18, (206, 196, 236))
        if i:
            line(base, SAFE + i * 944 / 3, by + 34, SAFE + i * 944 / 3,
                 by + 134, (255, 255, 255), 1.0, 60)
    cb_foot(base, 3, p["n"])
    return base


def cb_end(p):
    base = cb_bg()
    cb_top(base, 5, p["n"], p["tag"])
    caps(base, "fin du playbook", SAFE, 176, 9.5, (236, 230, 250), track=2.4)
    yy = ar_block(base, p["end"], RIGHT, 214, 900, 80, PAPER, hi=(255, 214, 120))
    y = para(base, p["end_body"], RIGHT, yy + 24, 780, 21, (236, 230, 250),
             hi=(255, 214, 120), leading=1.6)
    shadow(base, (SAFE, max(y + 50, 880), RIGHT, max(y + 50, 880) + 260), 26)
    cy = max(y + 50, 880)
    rrect(base, (SAFE, cy, RIGHT, cy + 260), 26, fill=(250, 249, 255, 255))
    caps(base, "un seul bouton", SAFE + 36, cy + 50, 9.5, (124, 108, 156), track=2.0)
    lat(base, "sawtify.space", SAFE + 36, cy + 118, 52, INK, SG_B, anchor="ls",
        tracking=-1.4)
    rrect(base, (SAFE + 36, cy + 150, SAFE + 470, cy + 224), 16, fill=(*VIO, 255))
    ar_center(base, "خود الصوت تاعك", SAFE + 253, cy + 187, 26, PAPER)
    return base


# ═══════════════════════════════════════════════════════════════════════════
#  copy — 3 publications
# ═══════════════════════════════════════════════════════════════════════════
PUBS = [
    {
        "id": "p1-ancrage",
        "n": 5,
        "kicker": "ancrage · playbook 01",
        "cover": ["أول سوم", "تسمعو،", "هو اللي", "يبقى في راسك."],
        "cover_sub": "علاش 500 دج تبان رخيصة كي تحطها ورا 3 000 دج — و علاش هاد الشي يخدم في صالحك كي تكون صادق.",
        "photo": "studio-voice.jpg",
        "photo_note": "وحدة الصوت، جودة استوديو، 30 ثانية. السوم ماشي هو المشكل — الترتيب هو المشكل.",
        "s2_title": ["دماغك ياخذ", "أول رقم", "كيفاش؟", "كمرجع."],
        "s2_body": "كي تشوف سوم مرتفع، كل سوم بعدو يبان معقول. ماشي على خاطر هو رخيص — على خاطر عندك نقطة مقارنة.",
        "s2_ex": "هادا هو لانكراج: الرقم الأول يولّي هو الحكم، و الرقم الثاني غير يتبعو. نفس الرقم، بلاصة مختلفة، إحساس مختلف.",
        "s3_title": ["نفس الصوت،", "نفس الـ 30 ثانية.", "الفرق وين ؟"],
        "prices": [
            ("sans repère", "500", "باينة غالية كي ما عندكش مع واش تقارنها."),
            ("avec repère", "500", "باينة رخيصة كي حطيت وراها سوم السوق."),
        ],
        "s3_bar": [("اللغة", "DZ"), ("الفايل", "1"), ("التسليم", "24 h")],
        "s3_body": "الدرس تاع البيع: ما تنقصش السوم، بدّل الترتيب. بيّن واش يستحق السوم قبل ما تقول السوم.",
        "s4_title": ["كيفاش تستعملو", "بلا ما تكذب."],
        "steps": [
            ("01", "حط مرجع حقيقي", "سوم السوق، سوم الوكالة، سوم الاستوديو — ماشي رقم مخترع باش يبان السوم تاعك رخيص."),
            ("02", "بيّن واش كاين في السوم", "30 ثانية، جودة استوديو، تعديل مجاني، تسليم في 24 ساعة. القيمة قبل الرقم."),
            ("03", "خلّي المقارنة واضحة", "قبل / بعد، بلا صوت / بالصوت، 3 أيام / 24 ساعة. المقارنة هي اللي تبيع، ماشي السوم."),
        ],
        "end": ["الترتيب", "يبيع أكثر", "من التخفيض."],
        "end_body": "500 دج ما راهيش غالية — غير خاصها مرجع. حط السوم تاعك في بلاصتو، و خلّي الزبون يقارن بوحدو.",
        "end_tag": "sawtify.space / 500 da",
        "photo2": "mic-hero.jpg",
        "end_note": "صوت واحد، دارجة جزايرية، جاهز في 24 ساعة. تجربة قبل ما تخلّص.",
        "draw": [ed_cover, ed_mech, ed_example, ed_steps, ed_end],
    },
    {
        "id": "p2-perte",
        "n": 5,
        "tag": "aversion à la perte",
        "cover_words": [("الصمت", PAPER), ("تاعك،", PAPER), ("يعمّر", AURA), ("جيب غيرك.", PAPER)],
        "cover_num": "00",
        "cover_num_note": "zéro seconde de voix dans ta vidéo",
        "cover_sub": "الخسارة ما تحسّهاش كي تجي — تحسّها كي تشوف الزبون شرا من عند صاحبك. 30 ثانية تفرق.",
        "photo": "shop-owners.jpg",
        "stat": "2",
        "pct": True,
        "stat_title": ["الخسارة توجع", "ضوڨ مرتين", "ما يفرحك الربح."],
        "stat_body": "الدماغ ماشي ميزان عادل: ضياع 100 دج يوجع أكثر ما يفرحك ربح 100 دج. على هادا، ما تبيعش «واش راح تربح» — وري «واش راح تخسر».",
        "bars": [("خسارة 100 دج", 1.0, AURA), ("ربح 100 دج", 0.5, (196, 184, 224))],
        "list_title": ["واش راك تخسر", "درك، بلا ما تحسّ."],
        "list_band": "الخسارة ما تتصلّحش بالنية، تتصلّح بصوت.",
        "losses": [
            ("video", "زبون يقرا و ما يسمعش", "الفيديو يمشي بلا صوت، الرسالة تروح معاه."),
            ("clock", "3 أيام باش تجاوب", "كل نهار تأخير، الزبون يعاود يشوف عند غيرك."),
            ("mic", "صوتك يبان مسجّل بالتيليفون", "الضجة تضعّف الثقة قبل ما تفوت الكلمة الأولى."),
            ("cart", "السلة تبقى عامرة", "اللي ما فهمش واش راك تبيع، ما يشريش — يمشي بصمت."),
        ],
        "fix_title": ["30 ثانية", "تقلب", "الخسارة."],
        "fix": [
            ("01", "خود الصوت قبل التصوير", "السيناريو مكتوب في 3 جمل، يتقرا بصوت دارجة طبيعية."),
            ("02", "حط الصوت في 30 ثانية الأولى", "قبل ما يقولك الزبون «واش هادا؟» — خلّيه يسمع الجواب."),
            ("03", "قيس واش ربحت", "قبل: 0 طلب في الأسبوع. بعد: عدّ الطلبات، ماشي اللايكات."),
        ],
        "photo2": "man-studio.jpg",
        "end": ["قبل ما تخسر", "زبون آخر،", "خود 30 ثانية."],
        "end_body": "الخسارة ما تتصلّحش بالنية — تتصلّح بصوت. صوت واحد، دارجة جزايرية، 500 دج، جاهز في 24 ساعة.",
        "end_tag": "500 da / 30 s",
        "draw": [bl_cover, bl_stat, bl_list, bl_fix, bl_end],
    },
    {
        "id": "p3-fobo",
        "n": 5,
        "tag": "fobo · playbook 03",
        "cover": ["50 صوت،", "50 سوم،", "و أنت", "ما زلت", "ما اخترتش."],
        "cover_card": "FOBO: كي تكثر الاختيارات، الدماغ يوقّف القرار.",
        "chips": ["3 choix", "500 da", "24 h"],
        "card_kicker": "question — pas un catalogue",
        "cover_sub": "الخوف من وجود حاجة أحسن. مع Sawtify، القرار يولّي في 3 خطوات.",
        "cover_latin": "FOBO, FEAR OF BETTER OPTIONS",
        "photo": "phone-hand.jpg",
        "def_tag": "définition, sans jargon",
        "def_body": "كي تشوف 50 عرض، ما تختارش والو. ماشي على خاطر ما عندكش فلوس — على خاطر كل مرة تقول «يمكن كاين أحسن».",
        "def_items": [
            ("layers", "كثرت الخيارات = قرار مؤجّل"),
            ("clock", "التأجيل يولّي ضياع وقت"),
            ("check", "الحل: قلّل الخيارات، ماشي زيدها"),
        ],
        "three_title": ["ثلاثة قرارات،", "ماشي خمسين."],
        "three_note": "اختيار واحد، و نكتبو، نقراو، نسلمو.",
        "three": [
            ("01", "واش نوع الصوت؟", "إعلان، شرح، ولا ترحيب. تختار واحد، نكتبو و نقراوه.", "1 صوت"),
            ("02", "شحال الطول؟", "30 ثانية كافية. كي تحتاج 60، تدفع الفرق، ماشي باك.", "30 s"),
            ("03", "وقتاش تحبو؟", "24 ساعة، ولا 48 كي تكون القصة طويلة.", "24 h"),
        ],
        "pick_title": ["و السوم؟", "قرار وحد، ماشي 50."],
        "photo2": "studio-voice.jpg",
        "pick_proof": [("سوم", "500"), ("تسليم", "24 h"), ("تعديل", "×2")],
        "pick_rows": [
            ("prix", "500 دج، ثابت"),
            ("retouches", "تعديل مجاني جوج مرات"),
            ("livraison", "24 ساعة، بعدها 30 دج / ساعة"),
        ],
        "end": ["ما تختارش", "بين 50 —", "اختار واحد."],
        "end_body": "3 قرارات، سوم وحد، 24 ساعة. على هادا Sawtify ماشي كاطالوغ: عرض وحد يخدم.",
        "draw": [cb_cover, cb_define, cb_three, cb_pick, cb_end],
    },
]


# ═══════════════════════════════════════════════════════════════════════════
#  rendu
# ═══════════════════════════════════════════════════════════════════════════
def render(pub):
    d = OUT / pub["id"]
    d.mkdir(parents=True, exist_ok=True)
    for i, fn in enumerate(pub["draw"]):
        base = fn(pub)
        img = base.convert("RGB").resize((W_, 1350), Image.LANCZOS)
        img.save(d / f"{i + 1:02d}.jpg", quality=94, optimize=True, subsampling=1)
        print("  ✓", d.name, f"{i + 1:02d}")
    return d


def planches():
    """Une planche par publication + une planche des 3 systèmes."""
    from PIL import Image as _I
    tw, th = 500, 625
    for pub in PUBS:
        files = sorted((OUT / pub["id"]).glob("*.jpg"))
        ims = [_I.open(f).convert("RGB").resize((tw, th), _I.LANCZOS) for f in files]
        sheet = _I.new("RGB", (len(ims) * (tw + 10) + 10, th + 20), (24, 18, 38))
        for i, im in enumerate(ims):
            sheet.paste(im, (10 + i * (tw + 10), 10))
        out = OUT / f"planche-{pub['id']}.jpg"
        sheet.save(out, quality=92, optimize=True)
        print("  ✓", out.name)
    # les 3 systèmes côte à côte (une ligne par publication)
    tw2, th2 = 300, 375
    w = 10 + 5 * (tw2 + 8)
    sheet = _I.new("RGB", (w, 3 * (th2 + 30) + 10), (24, 18, 38))
    d = ImageDraw.Draw(sheet)
    for r, pub in enumerate(PUBS):
        files = sorted((OUT / pub["id"]).glob("*.jpg"))
        y = 12 + r * (th2 + 30)
        d.text((12, y + th2 + 6), pub["id"].upper(), font=font(MONO, 11),
               fill=(196, 184, 224))
        for i, f in enumerate(files):
            im = _I.open(f).convert("RGB").resize((tw2, th2), _I.LANCZOS)
            sheet.paste(im, (10 + i * (tw2 + 8), y))
    out = OUT / "planche-3-styles.jpg"
    sheet.save(out, quality=92, optimize=True)
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
