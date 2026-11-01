#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════
 editorial_slides.py — Sawtify, système éditorial strict (v5)

 Règles non négociables
 ─────────────────────
 1. AUCUNE PHOTO DÉFORMÉE : chaque photo est recadrée en « cover » (même
    échelle sur les deux axes), jamais étirée.
 2. RIEN NE DÉPASSE : tout texte est mesuré puis réduit (`fit_block`) pour
    tenir dans sa boîte ; marges fixes 72 px ; grille 1080 × 1350.
 3. CONTRASTE GARANTI : le texte ne prend jamais la couleur de son fond.
    Sur photo → toujours une plaque pleine. Sur violet/encre → blanc.
    Sur papier → encre. L'orange n'est qu'un filet / une pastille.
 4. UNE IDÉE PAR SLIDE, une seule famille typographique par bloc.
═══════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import re

from PIL import Image, ImageDraw

from carousel import P_AURA, P_DEEP, P_INK, P_LILA, P_PAPER, P_VIO, P_VIO_L, \
    P_WHITE, R, W, H, M, SS, ar, ar_fit
from premium import logo_tile
from sawtify_ig import font, rrect
from workshop import (ANTON, CAIRO_B, CAIRO_M, MONO, PHOTOS, fit_block, lat,
                      rule)

FOOT = 84                      # bandeau de pied
BOT = H - FOOT                 # 1266 — limite basse du contenu
TOP = 104                      # limite haute du contenu (sous l'en-tête)
SAFE = M                       # marge gauche
RIGHT = W - M                  # 1008 — marge droite
SOFT_L = (124, 108, 156)       # gris-violet lisible sur papier
PAPER = P_WHITE
DEEP = P_DEEP
VIO = P_VIO
VIOL = P_VIO_L
INK = P_INK
AURA = P_AURA
LIL = P_LILA

DUOS = [(P_DEEP, P_LILA), (P_INK, (245, 243, 255)), (P_VIO, (237, 233, 254))]


# ═══════════════════════════════════════════════════════════════════════════
#  briques
# ═══════════════════════════════════════════════════════════════════════════
def bg(pal) -> Image.Image:
    return Image.new("RGBA", (W * SS, H * SS), (*PAPER, 255))


def plate(base, box, fill, radius=16, outline=None, ow=1.4):
    x0, y0, x1, y1 = box
    if x1 <= x0 or y1 <= y0:
        return
    if outline:
        rrect(base, box, radius, fill=(*fill, 255), outline=(*outline, 255), width=ow)
    else:
        rrect(base, box, radius, fill=(*fill, 255))


def hair(base, x0, x1, y, color=(26, 15, 46), alpha=60, width=1.2):
    rule(base, x0, x1, y, color, width, alpha)


def photo(base, name, box, duo=0, zoom=1.0, fx=0.5, fy=0.42, radius=0):
    """Recadrage « cover » : proportions toujours respectées."""
    x0, y0, x1, y1 = [int(v) for v in box]
    w, h = x1 - x0, y1 - y0
    if w <= 2 or h <= 2:
        return
    im = Image.open(PHOTOS / name).convert("RGB")
    k = max(w * SS / im.width, h * SS / im.height) * zoom
    im = im.resize((max(2, int(round(im.width * k))),
                    max(2, int(round(im.height * k)))), Image.LANCZOS)
    left = int((im.width - w * SS) * fx)
    top = int((im.height - h * SS) * fy)
    im = im.crop((left, top, left + w * SS, top + h * SS))
    dk, lt = DUOS[duo % len(DUOS)]
    g = im.convert("L")
    im = Image.merge("RGB", [
        g.point(lambda v, a=dk[0], b=lt[0]: int(a + (b - a) * v / 255)),
        g.point(lambda v, a=dk[1], b=lt[1]: int(a + (b - a) * v / 255)),
        g.point(lambda v, a=dk[2], b=lt[2]: int(a + (b - a) * v / 255)),
    ]).convert("RGBA")
    if radius:
        mask = Image.new("L", im.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            [0, 0, im.width - 1, im.height - 1], radius=radius * SS, fill=255)
        layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
        layer.paste(im, (0, 0), mask)
        base.alpha_composite(layer, (x0 * SS, y0 * SS))
    else:
        base.alpha_composite(im, (x0 * SS, y0 * SS))


def mono(base, text, x, y, size=13, color=SOFT_L, anchor="ls", track=1.6):
    lat(base, text.upper(), x, y, size, color, MONO, anchor=anchor, tracking=track)


SCRATCH = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))

_AR = re.compile(r"[\u0600-\u06FF]")


def has_ar(text) -> bool:
    return bool(_AR.search(str(text)))


def ar_h(text, xr, max_w, size, floor=14, fname=CAIRO_M, leading=1.22) -> float:
    """Hauteur RÉELLE d'un bloc arabe, mesurée en le dessinant sur SCRATCH."""
    s = ar_fit(SCRATCH, str(text), max_w, size, fname, floor)
    return ar(SCRATCH, str(text), xr, 0, s, P_WHITE, fname, max_w=max_w,
              leading=leading, hi_color=P_WHITE)


def _draw_title(canvas, lines, xr, y, max_w, size, color, hi, leading, gap=0):
    yy = y
    for ln in lines:
        s2 = min(size, ar_fit(canvas, ln, max_w, size, CAIRO_B))
        yy = ar(canvas, ln, xr, yy, s2, color, CAIRO_B, max_w=max_w,
                leading=leading, hi_color=hi) + gap
    return yy


def title(base, lines, xr, y, max_w, max_h, size, color, hi=AURA, leading=1.14,
          floor=26, fname=CAIRO_B):
    """Le bloc descend jusqu'à tenir VRAIMENT dans max_h (mesure réelle)."""
    if not lines:
        return y
    s = size
    while s > floor:
        if _draw_title(SCRATCH, lines, xr, y, max_w, s, color, hi, leading) - y <= max_h:
            break
        s -= 2
    return _draw_title(base, lines, xr, y, max_w, s, color, hi, leading)


def arfit(base, text, xr, y, max_w, size, color, hi=AURA, leading=1.22,
          floor=18, fname=CAIRO_M):
    s = ar_fit(base, text, max_w, size, fname, floor)
    return ar(base, text, xr, y, s, color, fname, max_w=max_w, leading=leading,
              hi_color=hi)


# ═══════════════════════════════════════════════════════════════════════════
#  en-tête / pied — la colonne vertébrale du carrousel
# ═══════════════════════════════════════════════════════════════════════════
def header(base, k, n, dark=False, strip=False):
    ink_c = P_WHITE if dark else INK
    if strip:                                     # bande papier pleine largeur
        plate(base, (0, 0, W, TOP - 8), PAPER, 0)
    logo_tile(base, SAFE, 34, 38, 0.30, grad=((109, 40, 217), (139, 92, 246)))
    lat(base, "SAWTIFY", SAFE + 50, 48, 19, ink_c, ANTON, anchor="ls", tracking=1.2)
    mono(base, "voix · darija · 24h", SAFE + 50, 70, 10.5,
         LIL if dark else SOFT_L, track=1.2)
    lat(base, f"{k + 1:02d}", RIGHT, 46, 30, ink_c, ANTON, anchor="rs", tracking=-0.5)
    lat(base, f"/{n:02d}", RIGHT, 70, 13, LIL if dark else SOFT_L, MONO, anchor="rs",
        tracking=1.4)
    y = TOP - 10
    if strip:
        y = TOP - 4
    hair(base, SAFE, RIGHT, y, (255, 255, 255) if dark else INK, 46)
    return y


def footer(base, k, n, dark=False, right_label="sawtify.space"):
    y = BOT
    hair(base, SAFE, RIGHT, y, (255, 255, 255) if dark else INK, 46)
    col = LIL if dark else SOFT_L
    mono(base, "500 da · 30 s", SAFE, y + 46, 12, col)
    cx = W / 2
    step = 15
    x0 = cx - (n - 1) * step / 2
    d = ImageDraw.Draw(base)
    for i in range(n):
        cx_i = x0 + i * step
        if i == k:
            d.ellipse([(cx_i - 4) * SS, (y + 38) * SS, (cx_i + 4) * SS, (y + 46) * SS],
                      fill=(*AURA, 255))
        else:
            d.ellipse([(cx_i - 2.6) * SS, (y + 39.4) * SS, (cx_i + 2.6) * SS,
                       (y + 44.6) * SS], fill=(*col, 235))
    if has_ar(right_label):
        ar(base, str(right_label), RIGHT, y + 34, 17, col, CAIRO_B, max_w=220,
           leading=1.0, hi_color=col)
    else:
        lat(base, right_label, RIGHT, y + 46, 12, col, MONO, anchor="rs",
            tracking=1.4)


# ═══════════════════════════════════════════════════════════════════════════
#  couvertures
# ═══════════════════════════════════════════════════════════════════════════
def cov_magazine(s, pal, k, n, seed=0):
    """Photo pleine largeur en haut, titre en bas sur papier."""
    base = bg(pal)
    photo(base, s.get("photo", "studio-voice.jpg"), (0, 0, W, 862),
          duo=seed % 3, fy=0.34)
    header(base, k, n, strip=True)

    # plaque chiffre posée sur la photo (plaque pleine → contraste garanti)
    disp = str(s.get("display", "")).strip()
    if disp:
        plate(base, (RIGHT - 392, 668, RIGHT, 842), DEEP, 14)
        mono(base, "chiffre clé", RIGHT - 366, 700, 11, LIL, track=1.8)
        note = str(s.get("display_note", "")).strip()
        if note:
            arfit(base, note, RIGHT - 24, 694, 250, 13, LIL, hi=LIL, floor=10)
        lat(base, disp, RIGHT - 24, 832, 60, P_WHITE, ANTON, anchor="rs",
            tracking=-1)

    plate(base, (0, 862, W, BOT), PAPER, 0)
    rule(base, SAFE, SAFE + 116, 900, AURA, 4)
    yy = title(base, s.get("lines", []), RIGHT, 922, 936, 200, 58, INK, hi=VIO,
               leading=1.10)
    promise = s.get("promise", "")
    if promise:
        arfit(base, promise, RIGHT, min(max(yy + 34, 1148), 1178), 936, 21,
              SOFT_L, hi=VIO, floor=14)
    footer(base, k, n, right_label=s.get("sticker") or "sawtify.space")
    return base


def cov_split(s, pal, k, n, seed=0):
    """Colonne papier à gauche, photo pleine hauteur à droite."""
    base = bg(pal)
    photo(base, s.get("photo", "mic-hero.jpg"), (500, 0, W, BOT), duo=(seed + 1) % 3,
          fy=0.34)
    plate(base, (0, 0, 500, BOT), PAPER, 0)
    logo_tile(base, SAFE, 34, 38, 0.30, grad=((109, 40, 217), (139, 92, 246)))
    lat(base, "SAWTIFY", SAFE + 50, 48, 19, INK, ANTON, anchor="ls", tracking=1.2)
    mono(base, "voix · darija · 24h", SAFE + 50, 70, 10.5, SOFT_L, track=1.2)

    mono(base, "édition darija", SAFE, 232, 12.5, VIO, track=2.0)
    hair(base, SAFE, SAFE + 300, 252, VIO, 120)

    yy = title(base, s.get("lines", []), 440, 296, 368, 460, 62, INK,
               hi=VIO, leading=1.12)
    rule(base, SAFE, SAFE + 96, min(yy + 26, 900), AURA, 3)
    promise = s.get("promise", "")
    if promise:
        arfit(base, promise, 440, min(yy + 52, 940), 368, 22, SOFT_L,
              hi=VIO, floor=16)

    tape = s.get("tape", "")
    if tape:
        arfit(base, tape, 440, 960, 368, 18, SOFT_L, hi=VIO, floor=13)
    disp = str(s.get("display", "")).strip()
    if disp:
        plate(base, (SAFE, 1090, 500 - 60, BOT - 70), DEEP, 16)
        lat(base, "chiffre clé", SAFE + 22, 1128, 11.5, LIL, MONO, anchor="ls",
            tracking=1.6)
        lat(base, disp, SAFE + 22, 1196, 52, P_WHITE, ANTON, anchor="ls", tracking=-1)

    # compteur dans une plaque (jamais du texte nu sur la photo)
    plate(base, (W - 96, 32, W - 32, 88), DEEP, 12)
    lat(base, f"{k + 1:02d}", W - 64, 76, 26, P_WHITE, ANTON, anchor="ms",
        tracking=-0.5)
    footer(base, k, n, right_label=s.get("sticker") or "sawtify.space")
    return base


# ═══════════════════════════════════════════════════════════════════════════
#  constat (statement)
# ═══════════════════════════════════════════════════════════════════════════
def slide_statement(s, pal, k, n, seed=0):
    base = Image.new("RGBA", (W * SS, H * SS), (*DEEP, 255))
    header(base, k, n, dark=True)
    mono(base, "le constat", SAFE, 176, 12.5, AURA, track=2.2)
    y_end = title(base, s.get("lines", []), RIGHT, 212, 936, 300, 86, P_WHITE,
                  hi=AURA, leading=1.08)
    its = [str(x) for x in s.get("items", [])[:3]]
    yy = max(y_end + 40, 556)
    hs = [ar_h(it, RIGHT, 840, 26, floor=17) for it in its] or [0]
    gap = max(56, max(hs) + 26)                    # la ligne respire SOUS le texte
    if yy + gap * len(its) > 812:
        gap = max(max(hs) + 14, (812 - yy) // max(1, len(its)))
    for j, it in enumerate(its):
        ty = yy + max(0, (gap - hs[j]) / 2)
        lat(base, f"{j + 1:02d}", SAFE, ty + 21, 22, AURA, ANTON, anchor="ls",
            tracking=0)
        arfit(base, it, RIGHT, ty, 840, 26, P_WHITE, hi=AURA, floor=17)
        yy += gap
        if j < len(its) - 1:
            hair(base, SAFE + 46, RIGHT, ty + hs[j] + (gap - hs[j]) / 2, P_WHITE, 34)
    photo(base, s.get("photo", "man-studio.jpg"), (0, 858, W, BOT), duo=(seed + 2) % 3,
          fy=0.30)
    pull = str(s.get("pull", "")).strip()
    if pull:
        plate(base, (SAFE, 782, SAFE + 470, 892), PAPER, 14)
        mono(base, "à retenir", SAFE + 22, 814, 11, VIO, track=1.8)
        lat(base, pull, SAFE + 22, 866, 46, INK, ANTON, anchor="ls", tracking=-0.5)
    footer(base, k, n, dark=True)
    return base


# ═══════════════════════════════════════════════════════════════════════════
#  constat numéroté (item)
# ═══════════════════════════════════════════════════════════════════════════
def slide_item(text, pal, k, n, seed=0, photo_name=None, ordinal=1):
    base = bg(pal)
    header(base, k, n)
    plate(base, (SAFE, 176, SAFE + 168, 334), DEEP, 16)
    lat(base, f"{ordinal:02d}", SAFE + 84, 300, 76, P_WHITE, ANTON, anchor="ms",
        tracking=-1.5)
    mono(base, "le point", SAFE, 372, 12, VIO, track=2.2)
    arfit(base, text, RIGHT, 190, 660, 58, INK, hi=VIO, floor=30)
    hair(base, 288, RIGHT, 404, INK, 50)
    photo(base, photo_name or "script-notebook.jpg", (SAFE, 430, RIGHT, 1150),
          duo=seed % 3, fy=0.38, radius=16)
    mono(base, "sawtify · le constat en une image", SAFE, 1190, 11.5, SOFT_L)
    footer(base, k, n)
    return base


# ═══════════════════════════════════════════════════════════════════════════
#  étapes
# ═══════════════════════════════════════════════════════════════════════════
def _rows(base, steps, x0, x1, y0, gap, ncol=None):
    w = (x1 - x0) - 76
    yy = y0
    for i, st in enumerate(steps):
        num, lab, sub = (list(st) + ["", "", ""])[:3]
        h = ar_h(str(lab), x1, w, 32, floor=20) - 6
        lat(base, str(num), x0, yy + 34, 40, VIO, ANTON, anchor="ls", tracking=-1)
        arfit(base, str(lab), x1, yy + 6, w, 32, INK, hi=VIO, floor=20)
        sub = str(sub).strip()
        if sub:
            sy = yy + 6 + h + 10
            if has_ar(sub):
                arfit(base, sub, x1, sy, w, 15, SOFT_L, hi=SOFT_L, floor=11)
            else:
                mono(base, sub, x0 + 6, sy + 15, 12, SOFT_L)
        yy += gap
        if i < len(steps) - 1:
            hair(base, x0, x1, yy - 30, INK, 40)
    return yy


def slide_steps(steps, pal, k, n, seed=0):
    base = bg(pal)
    header(base, k, n)
    mono(base, "la méthode", SAFE, 176, 12.5, VIO, track=2.2)
    lat(base, f"{len(steps[:3])} étapes", RIGHT, 186, 15, VIO, MONO, anchor="rs",
        tracking=1.4)
    photo(base, "phone-hand.jpg", (616, 232, RIGHT, 1150), duo=seed % 3, fy=0.35,
          radius=16)
    by = 1054                                        # bandeau collé au bas de la photo
    gap = (by - 30 - 248) / max(1, len(steps[:3]))   # les 3 lignes remplissent la colonne
    _rows(base, steps[:3], SAFE, 560, 248, gap)
    plate(base, (SAFE, by, 560, 1150), LIL, 14)
    arfit(base, "الخطوات بالترتيب — كل خطوة عندها ثانية محدودة.",
          538, by + 18, 444, 18, DEEP, hi=VIO, floor=13)
    footer(base, k, n)
    return base


def slide_step(payload, pal, k, n, seed=0, ordinal=1):
    st, idx, tot = payload
    num, lab, sub = (list(st) + ["", "", ""])[:3]
    base = Image.new("RGBA", (W * SS, H * SS), (*DEEP, 255))
    header(base, k, n, dark=True)
    mono(base, f"étape {ordinal:02d} / {tot:02d}", SAFE, 176, 12.5, AURA, track=2.2)
    lat(base, str(num), SAFE, 336, 156, VIOL, ANTON, anchor="ls", tracking=-5)
    mono(base, "trois temps, un seul enregistrement", RIGHT, 186, 11.5, LIL,
         anchor="rs")
    photo(base, "studio-voice.jpg", (SAFE, 404, RIGHT, 944), duo=(seed + 1) % 3,
          fy=0.34, radius=16)
    title(base, [str(lab)], SAFE + 936, 988, 936, 120, 54, P_WHITE, hi=AURA,
          leading=1.06)
    arfit(base, str(sub), SAFE + 936, 1122, 936, 20, LIL, hi=AURA, floor=14)
    hair(base, SAFE, RIGHT, 1180, P_WHITE, 46)
    footer(base, k, n, dark=True)
    return base


# ═══════════════════════════════════════════════════════════════════════════
#  récap
# ═══════════════════════════════════════════════════════════════════════════
def slide_recap(meth, pal, k, n, seed=0):
    base = bg(pal)
    header(base, k, n)
    mono(base, "le récap", SAFE, 176, 12.5, VIO, track=2.2)
    yy = title(base, meth.get("lines", []), RIGHT, 206, 700, 210, 54, INK, hi=VIO)
    steps = meth.get("steps", [])[:3]
    _rows(base, steps, SAFE, RIGHT, 470, 168)
    plate(base, (SAFE, 1040, RIGHT - 380, 1150), AURA, 14)
    mono(base, "30 secondes · livré en 24 h", SAFE + 26, 1078, 11.5, INK)
    lat(base, "500", SAFE + 26, 1112, 42, INK, ANTON, anchor="ls", tracking=-1)
    d0 = ImageDraw.Draw(base)
    w500 = d0.textlength("500", font=font(ANTON, 42)) / SS - 3
    ar(base, "دج", SAFE + 26 + w500 + 16, 1064, 40, INK, CAIRO_B, max_w=140,
       leading=1.0, hi_color=INK)
    plate(base, (RIGHT - 356, 1040, RIGHT, 1150), DEEP, 14)
    lat(base, "sawtify.space", RIGHT - 26, 1104, 24, P_WHITE, MONO, anchor="rs",
        tracking=0)
    footer(base, k, n)
    return base


# ═══════════════════════════════════════════════════════════════════════════
#  clôture
# ═══════════════════════════════════════════════════════════════════════════
def slide_end(e, pal, k, n, seed=0):
    base = bg(pal)
    photo(base, e.get("photo", "studio-voice.jpg"), (0, 0, W, 742), duo=seed % 3,
          fy=0.32)
    plate(base, (0, 742, W, H), DEEP, 0)          # le pied repose sur le violet
    logo_tile(base, SAFE, 790, 40, 0.30, grad=((139, 92, 246), (196, 181, 253)))
    lat(base, "SAWTIFY", SAFE + 52, 806, 20, P_WHITE, ANTON, anchor="ls", tracking=1.2)
    lat(base, f"{k + 1:02d}/{n:02d}", RIGHT, 812, 22, LIL, ANTON, anchor="rs")

    title(base, e.get("lines", []), RIGHT, 848, 936, 140, 50, P_WHITE, hi=AURA)
    caption = e.get("caption", "")
    if caption:
        arfit(base, caption, RIGHT, 1004, 560, 21, LIL, hi=AURA, floor=14)

    g = e.get("guarantees", [])[:3]
    yy2 = 1062
    for item in g:
        arfit(base, item, RIGHT, yy2, 560, 20, LIL, hi=AURA, floor=14)
        yy2 += 42

    plate(base, (SAFE, 1146, SAFE + 344, 1214), AURA, 12)
    lat(base, e.get("cta", "sawtify.space"), SAFE + 172, 1192, 23, INK, MONO,
        anchor="ms", tracking=0)
    mono(base, "commande & paiement en ligne", SAFE, 1240, 11, LIL)
    footer(base, k, n, dark=True)
    return base


# ═══════════════════════════════════════════════════════════════════════════
#  entrée
# ═══════════════════════════════════════════════════════════════════════════
COVERS = [cov_magazine, cov_split]


def _ordinal(pub, i, k, kind):
    """Rang du bloc dans sa famille (constat 01/02/03, étape 01/02/03…)."""
    try:
        from carousel import plan_pub
        plan, _, _ = plan_pub(pub, i)
        seq = [kk for kk, _ in plan[:k]]
        return seq.count(kind) + 1
    except Exception:
        return 1


def build(kind, payload, pub, i, pal, k, n):
    if kind == "cover":
        return COVERS[i % len(COVERS)](payload, pal, k, n, seed=i)
    if kind == "statement":
        return slide_statement(payload, pal, k, n, seed=i)
    if kind == "item":
        return slide_item(payload, pal, k, n, seed=i + k,
                          ordinal=_ordinal(pub, i, k, "item"))
    if kind == "steps":
        return slide_steps(payload, pal, k, n, seed=i)
    if kind == "step":
        return slide_step(payload, pal, k, n, seed=i + k,
                          ordinal=_ordinal(pub, i, k, "step"))
    if kind == "recap":
        return slide_recap(payload, pal, k, n, seed=i)
    if kind == "quote":
        return slide_statement(payload, pal, k, n, seed=i)
    return slide_end(payload, pal, k, n, seed=i)
