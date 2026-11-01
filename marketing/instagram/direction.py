#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════
 direction.py — 10 DIRECTIONS ARTISTIQUES distinctes (v6)

 Avant : un seul système décliné 30 fois → « copier-coller, même photo, même
 thème ». Maintenant : chaque publication reçoit UNE direction artistique
 (grille, typo, briques, traitement photo propres) et deux jours voisins n'ont
 jamais la même. Dans un carrousel, la direction reste constante (liage slide à
 slide) mais la composition change.

 magazine · affiche · cinema · bento · diptyque · fiche · ticket · frise ·
 manifeste · geometrie
═══════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import math
import random

from PIL import Image, ImageDraw

from carousel import (P_AURA, P_DEEP, P_INK, P_LILA, P_PAPER, P_VIO, P_VIO_L,
                      P_WHITE, W, H, M, SS)
from editorial_slides import ar_h, arfit, has_ar, photo, title
from premium import icon, icon_tile, logo_tile
from sawtify_ig import font, rrect
from workshop import (ANTON, CAIRO_B, CAIRO_M, MONO, ar, ar_fit, big_num_outline,
                      fibers, halftone, lat, paper_noise, rule, tick, wave)

SAFE = M
RIGHT = W - M
TOP = 104
BOT = H - 84
SOFT = (124, 108, 156)
AURA = P_AURA
VIO = P_VIO
VIOL = P_VIO_L
LIL = P_LILA
PAPER = P_WHITE
DEEP = P_DEEP
INK = P_INK


# ═══════════════════════════════════════════════════════════════════════════
#  briques partagées
# ═══════════════════════════════════════════════════════════════════════════
SCRATCH2 = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))


def canvas(color, noise=8.0):
    base = Image.new("RGBA", (W * SS, H * SS), (*color, 255))
    if noise:
        paper_noise(base, noise, 1.0)
    return base


def plate(base, box, fill, radius=16, outline=None, ow=1.4):
    x0, y0, x1, y1 = box
    if fill is None or x1 <= x0 or y1 <= y0:
        return
    if outline:
        rrect(base, box, radius, fill=(*fill, 255), outline=(*outline, 255), width=ow)
    else:
        rrect(base, box, radius, fill=(*fill, 255))


def line(base, x0, y0, x1, y1, color=INK, width=1.4, alpha=255):
    ImageDraw.Draw(base).line([x0 * SS, y0 * SS, x1 * SS, y1 * SS],
                              fill=(*color, alpha), width=max(1, int(width * SS)))


def ring(base, cx, cy, r, color=VIO, width=2.0, alpha=255):
    ImageDraw.Draw(base).ellipse([(cx - r) * SS, (cy - r) * SS,
                                  (cx + r) * SS, (cy + r) * SS],
                                 outline=(*color, alpha), width=max(1, int(width * SS)))


def disc(base, cx, cy, r, color=VIO, alpha=255):
    ImageDraw.Draw(base).ellipse([(cx - r) * SS, (cy - r) * SS,
                                  (cx + r) * SS, (cy + r) * SS],
                                 fill=(*color, alpha))


def rect(base, box, color=INK, alpha=255):
    ImageDraw.Draw(base).rectangle([box[0] * SS, box[1] * SS, box[2] * SS,
                                    box[3] * SS], fill=(*color, alpha))


def scrim(base, box, color=INK, alpha=110):
    x0, y0, x1, y1 = [int(v) for v in box]
    layer = Image.new("RGBA", ((x1 - x0) * SS, (y1 - y0) * SS), (*color, alpha))
    base.alpha_composite(layer, (x0 * SS, y0 * SS))


def kicker(base, text, x, y, color=None, size=11.5, track=2.4, anchor="ls"):
    mono(base, text, x, y, size, color or VIO, anchor=anchor, track=track)


def mono(base, text, x, y, size=13, color=SOFT, anchor="ls", track=1.6):
    lat(base, str(text).upper(), x, y, size, color, MONO, anchor=anchor, tracking=track)


def dotted(base, x0, x1, y, color=SOFT, step=9, r=1.6, alpha=190):
    d = ImageDraw.Draw(base)
    x = x0
    while x < x1:
        d.ellipse([(x - r) * SS, (y - r) * SS, (x + r) * SS, (y + r) * SS],
                  fill=(*color, alpha))
        x += step


def stripes(base, box, color=VIO, alpha=16, step=26, angle=35, width=10):
    x0, y0, x1, y1 = [int(v) for v in box]
    w, h = (x1 - x0) * SS, (y1 - y0) * SS
    layer = Image.new("RGBA", (int(w), int(h)), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(-int(h), int(w) + int(h), int(step * SS)):
        d.line([i, 0, i + int(h / math.tan(math.radians(angle))), h],
               fill=(*color, alpha), width=int(width * SS))
    layer = layer.crop((0, 0, int(w), int(h)))
    base.alpha_composite(layer, (x0 * SS, y0 * SS))


def dotgrid(base, box, color=VIO, alpha=40, step=16, r=2.0):
    x0, y0, x1, y1 = [int(v) for v in box]
    layer = Image.new("RGBA", ((x1 - x0) * SS, (y1 - y0) * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for gx in range(0, (x1 - x0) * SS, int(step * SS)):
        for gy in range(0, (y1 - y0) * SS, int(step * SS)):
            d.ellipse([gx, gy, gx + int(2 * r * SS), gy + int(2 * r * SS)],
                      fill=(*color, alpha))
    base.alpha_composite(layer, (x0 * SS, y0 * SS))


def arcs(base, cx, cy, r0, r1, color=VIO, width=3, alpha=60, count=5, start=200,
         end=340):
    d = ImageDraw.Draw(base)
    for i in range(count):
        r = r0 + (r1 - r0) * i / max(1, count - 1)
        d.arc([(cx - r) * SS, (cy - r) * SS, (cx + r) * SS, (cy + r) * SS],
              start=start, end=end, fill=(*color, alpha),
              width=max(1, int(width * SS)))


def barcode(base, x, y, w, h, color=INK, alpha=255):
    rnd = random.Random(int(x + y))
    d = ImageDraw.Draw(base)
    cx = x
    while cx < x + w:
        bw = rnd.choice([1.6, 2.2, 3.0, 4.4])
        if cx + bw > x + w:
            break
        if rnd.random() > 0.22:
            d.rectangle([cx * SS, y * SS, (cx + bw) * SS, (y + h) * SS],
                        fill=(*color, alpha))
        cx += bw + rnd.choice([2.0, 2.6, 3.4])


def stamp(base, cx, cy, r, top, bottom, color=VIO, size=10.5):
    ring(base, cx, cy, r, color, 1.8)
    ring(base, cx, cy, r - 6, color, 0.9, 150)
    lat(base, top, cx, cy - 4, size, color, MONO, anchor="ms", tracking=1.2)
    lat(base, bottom, cx, cy + 14, size, color, MONO, anchor="ms", tracking=1.2)


def tickbox(base, cx, cy, s=15, color=VIO, checked=False, width=1.8):
    rrect(base, (cx - s, cy - s, cx + s, cy + s), s * 0.28,
          outline=(*color, 255), width=width)
    if checked:
        d = ImageDraw.Draw(base)
        d.line([(cx - s * 0.5) * SS, cy * SS, (cx - s * 0.1) * SS,
                (cy + s * 0.45) * SS], fill=(*color, 255),
               width=max(1, int(width * SS)))
        d.line([(cx - s * 0.1) * SS, (cy + s * 0.45) * SS,
                (cx + s * 0.55) * SS, (cy - s * 0.42) * SS],
               fill=(*color, 255), width=max(1, int(width * SS)))


def brand_top(base, k, n, dark=False, style="rule"):
    """Signature de marque — une variante par direction."""
    ink = P_WHITE if dark else INK
    soft = LIL if dark else SOFT
    if style == "rule":
        logo_tile(base, SAFE, 36, 36, 0.30, grad=((109, 40, 217), (139, 92, 246)))
        lat(base, "SAWTIFY", SAFE + 48, 50, 18, ink, ANTON, anchor="ls", tracking=1.2)
        mono(base, "voix · darija · 24h", SAFE + 48, 71, 10, soft, track=1.1)
        lat(base, f"{k + 1:02d}", RIGHT, 46, 30, ink, ANTON, anchor="rs", tracking=-0.5)
        mono(base, f"/{n:02d}", RIGHT, 70, 12, soft, anchor="rs", track=1.4)
        line(base, SAFE, 88, RIGHT, 88, ink, 1.2, 60)
    elif style == "stack":
        lat(base, "SAWTIFY", RIGHT, 48, 21, ink, ANTON, anchor="rs", tracking=2.6)
        mono(base, f"n° {k + 1:02d} / {n:02d}", SAFE, 44, 11, soft, track=2.2)
        line(base, SAFE, 64, SAFE + 40, 64, ink, 2.4)
    elif style == "tag":
        plate(base, (SAFE, 34, SAFE + 120, 68), DEEP if not dark else LIL, 6)
        lat(base, "SAWTIFY", SAFE + 60, 58, 12.5,
            P_WHITE if not dark else DEEP, MONO, anchor="ms", tracking=1.6)
        mono(base, "darija dz", RIGHT, 54, 10, soft, anchor="rs", track=2.0)
    elif style == "corner":
        logo_tile(base, SAFE, 30, 40, 0.26, grad=((109, 40, 217), (139, 92, 246)))
        mono(base, f"{k + 1:02d}/{n:02d}", SAFE + 54, 57, 13, ink, track=2.0)
        mono(base, "sawtify", RIGHT, 57, 13, soft, anchor="rs", track=2.6)
    elif style == "center":
        lat(base, "SAWTIFY", W / 2, 46, 15, ink, ANTON, anchor="ms", tracking=4.0)
        line(base, SAFE, 64, RIGHT, 64, ink, 0.8, 90)
    elif style == "edge":
        lat(base, "S", SAFE, 56, 26, ink, ANTON, anchor="ls", tracking=0)
        line(base, SAFE + 26, 34, SAFE + 26, 62, ink, 2.0)
        mono(base, f"{k + 1:02d}", SAFE + 38, 56, 16, soft, track=1.0)
        mono(base, "sawtify.space", RIGHT, 56, 10.5, soft, anchor="rs", track=1.6)


def foot(base, k, n, dark=False, label="sawtify.space", style="rule", dots=True):
    ink = P_WHITE if dark else INK
    soft = LIL if dark else SOFT
    y = BOT
    if style == "rule":
        line(base, SAFE, y, RIGHT, y, ink, 1.2, 60)
    elif style == "thick":
        line(base, SAFE, y, RIGHT, y, ink, 3.0, 220)
    mono(base, "500 da · 30 s", SAFE, y + 44, 11.5,
         soft if not dark else (222, 214, 245))
    if has_ar(label):
        ar(base, label, RIGHT, y + 30, 17, soft, CAIRO_B, max_w=240, leading=1.0,
           hi_color=soft)
    else:
        mono(base, label, RIGHT, y + 44, 11.5, soft, anchor="rs", track=1.5)
    if dots:
        step = 14
        x0 = W / 2 - (n - 1) * step / 2
        for i in range(n):
            cx = x0 + i * step
            if i == k:
                disc(base, cx, y + 40, 4, AURA)
            else:
                disc(base, cx, y + 40, 2.4, soft, 200)


def _lines(payload, key="lines"):
    if isinstance(payload, (list, tuple)):
        return []
    return [str(x) for x in payload.get(key, []) if str(x).strip()]


def _steps(payload):
    """`steps` arrive soit en dict (meth), soit en liste brute."""
    if isinstance(payload, dict):
        return list(payload.get("steps", []))
    return list(payload or [])


def ph(base, name, box, duo=0, fy=0.40, fx=0.5, zoom=1.0, radius=0):
    photo(base, name, box, duo=duo, fy=fy, fx=fx, zoom=zoom, radius=radius)


def fit_ar(base, text, xr, y, max_w, size, color, hi=None, floor=15, fname=CAIRO_M,
           leading=1.22):
    return arfit(base, str(text), xr, y, max_w, size, color, hi=hi or color,
                 floor=floor, fname=fname, leading=leading)


def para(base, text, xr, y, max_w, size, color, hi=None, floor=15, leading=1.5):
    """Paragraphe arabe (retour à la ligne) — mesure fiable."""
    s = ar_fit(base, str(text), max_w, size, CAIRO_M, floor)
    return ar(base, str(text), xr, y, s, color, CAIRO_M, max_w=max_w,
              leading=leading, hi_color=hi or color)


# ═══════════════════════════════════════════════════════════════════════════
#  1 · MAGAZINE — papier imprimé, filets, sommaire, folio
# ═══════════════════════════════════════════════════════════════════════════
def _mag_head(base, k, n, dark=False):
    brand_top(base, k, n, dark=dark, style="rule")


def mag_cover(s, k, n, i):
    base = canvas(PAPER, 7)
    fibers(base, INK, 160, 12)
    deep = _PT.get("tone") == 1
    h = 742 if k % 2 == 0 else 664
    ph(base, s.get("photo", "studio-voice.jpg"), (0, 0, W, h),
       duo=(2 if deep else 0), fy=0.34)
    _mag_head(base, k, n, dark=True)          # en-tête posé sur la photo
    # filet de coupe sous la photo
    rect(base, (0, h, W, h + 6), INK)
    kicker(base, "le dossier", SAFE, h + 52, VIO, 11.5, 3.0)
    mono(base, "sawtify · édition darija", RIGHT, h + 52, 10.5, SOFT, anchor="rs",
         track=1.8)
    yy = title(base, _lines(s), RIGHT, h + 74, 936, 250, 76,
               P_WHITE if deep else INK, hi=AURA if deep else VIO, leading=1.06)
    if s.get("promise"):
        para(base, s["promise"], RIGHT, min(yy + 26, 1180), 700, 20,
             LIL if deep else SOFT, hi=AURA if deep else VIO, floor=14,
             leading=1.4)
    disp = str(s.get("display", "")).strip()
    if disp:
        plate(base, (SAFE, h + 196, SAFE + 420, h + 330), DEEP, 0)
        mono(base, "chiffre clé", SAFE + 20, h + 228, 10, LIL, track=1.8)
        lat(base, disp, SAFE + 20, h + 316, 56, P_WHITE, ANTON, anchor="ls",
            tracking=-1)
        note = str(s.get("display_note", "")).strip()
        if note:
            para(base, note, SAFE + 404, h + 220, 176, 13, LIL, hi=LIL, floor=10,
                 leading=1.3)
    line(base, SAFE, BOT - 10, RIGHT, BOT - 10, P_WHITE if deep else INK, 1.2, 90)
    foot(base, k, n, dark=deep, label=s.get("sticker") or "sawtify.space")
    return base


def mag_body(kind, payload, k, n, i):
    base = canvas(PAPER, 7)
    fibers(base, INK, 150, 10)
    dark = k % 2 == 1
    if dark:
        rect(base, (0, 0, W, H), DEEP, 60)
    _mag_head(base, k, n, dark=dark)
    ink = P_WHITE if dark else INK
    soft = LIL if dark else SOFT

    if kind == "item":
        txt = str(payload)
        lat(base, f"{k:02d}", SAFE, 300, 150, VIO if not dark else VIOL, ANTON,
            anchor="ls", tracking=-4, )
        # filet vertical de colonne
        line(base, 330, 210, 330, 620, ink, 1.0, 90)
        kicker(base, "note de marge", 360, 218, VIO if not dark else AURA, 10.5, 2.4)
        para(base, payload, RIGHT, 250, 540, 30, ink, hi=AURA if dark else VIO,
             floor=19, leading=1.42)
        plate(base, (360, 700, RIGHT, 1150), None if dark else PAPER, 0)
        if not dark:
            plate(base, (360, 700, RIGHT, 1150), LIL, 2)
        ph(base, "script-notebook.jpg", (420, 726, RIGHT - 24, 1122), duo=1,
           fy=0.4, radius=2)
        mono(base, _PT.get("micro", "archives · sawtify"), SAFE, 1180, 10.5, soft, track=2.0)
    else:
        lines = _lines(payload)
        pull = str(payload.get("pull", "")).strip()
        items = [str(x) for x in payload.get("items", [])[:3]]
        yy = title(base, lines, RIGHT, 196, 700, 250, 72, ink,
                   hi=AURA if dark else VIO, leading=1.08)
        photo_name = payload.get("photo", "studio-voice.jpg")
        ph(base, photo_name, (SAFE, 300, 440, 1046), duo=(i + 1) % 3, fy=0.36,
           radius=2)
        mono(base, _PT.get("micro", "photo · studio maison"), SAFE, 1084, 10, soft, track=1.6)
        if pull:
            plate(base, (SAFE, 1100, SAFE + 340, 1176), AURA if not dark else AURA, 0)
            lat(base, pull, SAFE + 170, 1158, 34, INK, ANTON, anchor="ms",
                tracking=-0.5)
        y0 = max(yy + 66, 640)
        for j, it in enumerate(items):
            top = y0 + j * (max(96, (1128 - y0) // max(1, len(items))))
            line(base, 500, top - 30, RIGHT, top - 30, ink, 0.9, 70)
            lat(base, f"{j + 1:02d}", 500, top + 24, 28, VIO if not dark else AURA,
                ANTON, anchor="ls", tracking=0)
            para(base, it, RIGHT, top - 2, 476, 21, ink, hi=VIO, floor=14,
                 leading=1.35)
    foot(base, k, n, dark=dark)
    return base


def mag_list(kind, payload, k, n, i):
    base = canvas(PAPER, 7)
    fibers(base, INK, 150, 10)
    _mag_head(base, k, n)
    if kind == "steps":
        kicker(base, "la méthode", SAFE, 150, VIO, 12, 3.0)
        tt = str(_PT.get("titre", "")).strip()
        if tt:
            para(base, tt, RIGHT, 132, 420, 16, SOFT, hi=SOFT, floor=11)
        steps = _steps(payload)[:4]
        y0, y1 = 196, 900
        span = (y1 - y0) / max(1, len(steps))
        for j, st in enumerate(steps):
            num, lab, sub = (list(st) + ["", "", ""])[:3]
            top = y0 + j * span
            line(base, SAFE, top, RIGHT, top, INK, 1.0, 90)
            lat(base, str(num), SAFE, top + 92, 60, VIO, ANTON, anchor="ls",
                tracking=-2)
            hh = ar_h(str(lab), RIGHT, 700, 34, floor=16) - 8
            para(base, lab, RIGHT, top + 34, 700, 34, INK, hi=VIO, floor=16,
                 leading=1.2)
            mono(base, ". . . . . . . . . . .", 340, top + 60, 10.5, SOFT, track=0.4)
            if sub:
                para(base, sub, RIGHT, top + 34 + hh + 18, 520, 16, SOFT, hi=SOFT,
                     floor=11, leading=1.35)
        line(base, SAFE, y1, RIGHT, y1, INK, 1.0, 90)
        ph(base, "phone-hand.jpg", (SAFE, 930, RIGHT, 1150), duo=1, fy=0.4, radius=2)
        mono(base, "enregistré au téléphone · studio maison", SAFE, 1186, 10,
             SOFT, track=1.6)
    elif kind == "step":
        st, idx, tot = payload
        num, lab, sub = (list(st) + ["", "", ""])[:3]
        kicker(base, f"étape {idx + 1:02d} / {tot:02d}", SAFE, 150, VIO, 12, 2.6)
        mono(base, "mode d'emploi", RIGHT, 150, 10.5, SOFT, anchor="rs", track=2.0)
        big_num_outline(base, str(num), SAFE - 6, 470, 300, VIO, width=2.4, alpha=190)
        title(base, [str(lab)], RIGHT, 250, 640, 220, 66, INK, hi=VIO, leading=1.06)
        if sub:
            para(base, sub, RIGHT, 500, 620, 22, SOFT, hi=VIO, floor=15, leading=1.4)
        ph(base, "studio-voice.jpg", (SAFE, 760, RIGHT, 1120), duo=1, fy=0.34,
           radius=2)
        mono(base, "un seul enregistrement suffit", SAFE, 1150, 10.5, SOFT, track=1.8)
    else:  # recap
        kicker(base, "récapitulatif", SAFE, 150, VIO, 12, 3.0)
        yy = title(base, _lines(payload), RIGHT, 168, 700, 150, 48, INK, hi=VIO)
        y0 = max(yy + 40, 330)
        due = _steps(payload)[:3]
        for j, st in enumerate(due):
            num, lab, sub = (list(st) + ["", "", ""])[:3]
            top = y0 + j * 118
            tickbox(base, SAFE + 12, top + 20, 15, VIO, True)
            mono(base, str(sub), SAFE + 48, top + 26, 11, SOFT)
            para(base, lab, RIGHT, top, 640, 25, INK, hi=VIO, floor=15)
            line(base, SAFE, top + 78, RIGHT, top + 78, INK, 0.8, 60)
        plate(base, (SAFE, 1090, RIGHT, 1180), DEEP, 0)
        lat(base, "500", SAFE + 26, 1150, 44, P_WHITE, ANTON, anchor="ls",
            tracking=-1)
        para(base, "دج · 30 ثانية", RIGHT - 26, 1108, 420, 22, P_WHITE, hi=AURA,
             floor=14, leading=1.2)
        mono(base, "livré en 24 h", SAFE + 120, 1112, 10.5, LIL)
    foot(base, k, n)
    return base


def mag_end(e, k, n, i):
    base = canvas(PAPER, 7)
    fibers(base, INK, 150, 10)
    ph(base, e.get("photo", "studio-voice.jpg"), (0, 0, W, 700), duo=0, fy=0.3)
    scrim(base, (0, 0, W, 700), DEEP, 120)
    _mag_head(base, k, n, dark=True)
    rect(base, (0, 700, W, H), DEEP)
    mono(base, "sawtify · darija dz · 500 da", SAFE, 660, 10.5, LIL, track=1.6)
    kicker(base, "fin du dossier", SAFE, 760, AURA, 11.5, 3.0)
    yy = title(base, _lines(e), RIGHT, 780, 936, 140, 62, P_WHITE, hi=AURA)
    cap = str(e.get("caption", "")).strip()
    capbottom = yy
    if cap:
        capbottom = para(base, cap, RIGHT, yy + 24, 700, 20, LIL, hi=AURA, floor=14)
    g = [str(x) for x in e.get("guarantees", [])[:3]]
    start = max(capbottom + 42, 966)
    for j, it in enumerate(g):
        top = start + j * 60
        line(base, SAFE, top - 26, RIGHT, top - 26, LIL, 0.8, 80)
        tick(base, SAFE + 10, top + 4, 8, AURA, 2.6)
        para(base, it, RIGHT, top - 12, 700, 17, LIL, hi=AURA, floor=12)
    plate(base, (SAFE, 1160, SAFE + 340, 1226), AURA, 0)
    lat(base, e.get("cta", "sawtify.space"), SAFE + 170, 1206, 22, INK, MONO,
        anchor="ms", tracking=0)
    mono(base, "commande & paiement en ligne", SAFE + 360, 1206, 10.5, LIL)
    foot(base, k, n, dark=True)
    return base


# ═══════════════════════════════════════════════════════════════════════════
#  dispatcher
# ═══════════════════════════════════════════════════════════════════════════
DIRECTIONS = {}


def direction(key):
    def deco(mod):
        DIRECTIONS[key] = mod
        return mod
    return deco


@direction("magazine")
class Magazine:
    cover = staticmethod(mag_cover)
    body = staticmethod(mag_body)
    list = staticmethod(mag_list)
    end = staticmethod(mag_end)


_PT = {}


MINI_DZ = [
    "واحد صوّر، واحد كتب، و واحد باع.",
    "الصوت يوصل قبل ما تقرا.",
    "30 ثانية تكفي باش تفرق.",
    "الدارجة تبيع أكثر من الفصحى.",
    "بلا ميكرو، بلا مونتاج، بلا تعقيد.",
    "اللي ما يتسمعش، ما يتباعش.",
    "الفكرة وحدة، التطبيق هو اللي يفرق.",
    "خود الهيكل، عمّر الصوت، انشر.",
    "الزوج جملة: وجع و حل.",
    "الإعلان القصير يبقى في الذاكرة.",
]
MICRO = [
    "une idée · un geste", "à retenir · نصيحة", "le détail qui vend",
    "note de studio", "règle n° 1", "vu à alger", "testé sur le terrain",
    "le réflexe sawtify",
]

PHOTO_BY_DIR = {
    "magazine": ["studio-voice.jpg", "script-notebook.jpg", "phone-hand.jpg"],
    "affiche": ["mic-hero.jpg", "script-notebook.jpg", "studio-voice.jpg"],
    "cinema": ["man-studio.jpg", "studio-voice.jpg", "shop-owners.jpg"],
    "bento": ["shop-owners.jpg", "phone-hand.jpg", "studio-voice.jpg"],
    "diptyque": ["studio-voice.jpg", "shop-owners.jpg", "mic-hero.jpg"],
    "fiche": ["script-notebook.jpg", "studio-voice.jpg", "phone-hand.jpg"],
    "ticket": ["phone-hand.jpg", "shop-owners.jpg", "script-notebook.jpg"],
    "frise": ["shop-owners.jpg", "mic-hero.jpg", "studio-voice.jpg"],
    "manifeste": ["man-studio.jpg", "mic-hero.jpg", "studio-voice.jpg"],
    "geometrie": ["studio-voice.jpg", "shop-owners.jpg", "phone-hand.jpg"],
}


def direction_for(i):
    """Chaque direction revient 3 fois, mais jamais au même rang de bloc :
    J01 magazine, J11 bento, J21 ticket (etc.)."""
    seg, pos = divmod(i, len(ORDER))
    return ORDER[(pos + seg * 3) % len(ORDER)]


def draw(key, kind, payload, k, n, i, pub=None):
    import covers_v
    _PT.clear()
    _PT.update(pub or {})
    _PT["mini"] = MINI_DZ[(i * 3 + k) % len(MINI_DZ)]
    _PT["micro"] = MICRO[(i + k) % len(MICRO)]
    _PT["tone"] = 0
    seg = i // len(ORDER)
    _PT["v"] = 0 if seg == 0 else 1          # 1re série = A, suivantes = B
    _PT["seg"] = seg
    d = DIRECTIONS[key]
    if kind == "cover":
        alt = covers_v.COVERS_B.get(key)
        if alt is not None and _PT.get("v", 0) == 1:
            return alt(payload, k, n, i)
        return d.cover(payload, k, n, i)
    if kind == "end":
        return d.end(payload, k, n, i)
    if kind in ("steps", "step", "recap"):
        return d.list(kind, payload, k, n, i)
    return d.body(kind, payload, k, n, i)


ORDER = ["magazine"]


# ═══════════════════════════════════════════════════════════════════════════
#  2 · AFFICHE — typo qui hurle, aplat franc, bande orange, tampon
# ═══════════════════════════════════════════════════════════════════════════
def aff_cover(s, k, n, i):
    tone = _PT.get("tone", 0)
    haut = [VIO, DEEP, INK][tone]
    bas = [PAPER, LIL, PAPER][tone]
    base = canvas(haut, 10)
    dotgrid(base, (0, 0, W, 620), P_WHITE, 26, 26, 1.6)
    ph(base, s.get("photo", "mic-hero.jpg"), (0, 380, W, 900), duo=tone % 3,
       fy=0.3)
    rect(base, (0, 0, W, 380), haut)
    brand_top(base, k, n, dark=True, style="center")
    disp = str(s.get("display", "")).strip()
    if disp:
        lat(base, disp, W / 2, 220, 150, P_WHITE, ANTON, anchor="ms", tracking=-6)
        line(base, SAFE, 258, RIGHT, 258, P_WHITE, 2.0, 200)
        mono(base, "chiffre clé · marché dz", W / 2, 300, 11.5, LIL, anchor="ms",
             track=3.0)
    rect(base, (0, 900, W, H), bas)
    rect(base, (0, 900, W, 916), AURA)
    yy = title(base, _lines(s), RIGHT, 940, 956, 200, 82, INK, hi=VIO, leading=1.02)
    if s.get("promise"):
        para(base, s["promise"], RIGHT, min(yy + 18, 1150), 640, 19, SOFT, hi=VIO,
             floor=14)
    plate(base, (SAFE, 1160, SAFE + 232, 1224), INK, 4)
    lat(base, "500 DA", SAFE + 116, 1206, 26, P_WHITE, ANTON, anchor="ms",
        tracking=1)
    stamp(base, SAFE + 330, 1192, 44, "24 H", "LIVRAISON", VIO, 9.5)
    foot(base, k, n, label=s.get("sticker") or "sawtify.space", style="thick")
    return base


def aff_body(kind, payload, k, n, i):
    dark = k % 2 == 1
    base = canvas(VIO if dark else PAPER, 10)
    if dark:
        dotgrid(base, (0, TOP, W, BOT), P_WHITE, 22, 30, 1.5)
    brand_top(base, k, n, dark=dark, style="center")
    ink = P_WHITE if dark else INK
    if kind == "item":
        lat(base, f"{k:02d}", SAFE, 420, 300, P_WHITE if dark else LIL, ANTON,
            anchor="ls", tracking=-12)
        rule(base, SAFE, RIGHT, 470, AURA, 6)
        para(base, payload, RIGHT, 520, 780, 38, ink, hi=AURA if dark else VIO,
             floor=22, leading=1.28)
        ph(base, "script-notebook.jpg", (SAFE, 700, RIGHT, 1090), duo=0, fy=0.42,
           radius=0)
        mono(base, _PT.get("micro", "une idée · une affiche"), SAFE, 1140, 10.5,
             LIL if dark else SOFT, track=2.2)
    else:
        lines = _lines(payload)
        items = [str(x) for x in payload.get("items", [])[:3]]
        yy = title(base, lines, RIGHT, 190, 940, 300, 88, ink,
                   hi=AURA if dark else VIO, leading=1.02)
        y0 = max(yy + 50, 620)
        span = (1120 - y0) / max(1, len(items))
        for j, it in enumerate(items):
            top = y0 + j * span
            rect(base, (SAFE, top, SAFE + 92, top + 92), AURA)
            lat(base, f"{j + 1}", SAFE + 46, top + 68, 40, INK, ANTON, anchor="ms",
                tracking=-1)
            para(base, it, RIGHT, top + 12, 780, 27, ink, hi=AURA if dark else VIO,
                 floor=17, leading=1.3)
            line(base, SAFE + 110, top + 88, RIGHT, top + 88,
                 ink, 1.0, 100)
    foot(base, k, n, dark=dark, style="thick")
    return base


def aff_list(kind, payload, k, n, i):
    base = canvas(PAPER, 9)
    if kind == "steps":
        rect(base, (0, 0, W, 300), VIO)
        dotgrid(base, (0, 0, W, 300), P_WHITE, 24, 34, 1.5)
        brand_top(base, k, n, dark=True, style="center")
        lat(base, "LA MÉTHODE", SAFE, 250, 24, P_WHITE, ANTON, anchor="ls",
            tracking=4)
        steps = _steps(payload)[:3]
        for j, st in enumerate(steps):
            num, lab, sub = (list(st) + ["", "", ""])[:3]
            top = 340 + j * 300
            rect(base, (SAFE, top, SAFE + 6, top + 250), AURA)
            lat(base, str(num), SAFE + 26, top + 88, 96, VIO, ANTON, anchor="ls",
                tracking=-4)
            para(base, lab, RIGHT, top + 20, 700, 40, INK, hi=VIO, floor=20,
                 leading=1.16)
            if sub:
                para(base, sub, RIGHT, top + 132, 560, 19, SOFT, hi=SOFT, floor=12)
            line(base, SAFE, top + 266, RIGHT, top + 266, INK, 1.2, 80)
    elif kind == "step":
        st, idx, tot = payload
        num, lab, sub = (list(st) + ["", "", ""])[:3]
        ph(base, "studio-voice.jpg", (0, 0, W, 470), duo=2, fy=0.33)
        scrim(base, (0, 0, W, 470), INK, 90)
        brand_top(base, k, n, dark=True, style="center")
        rect(base, (0, 470, W, H), VIO)
        dotgrid(base, (0, 470, W, H), P_WHITE, 20, 34, 1.5)
        rect(base, (SAFE, 500, SAFE + 210, 640), AURA)
        lat(base, str(num), SAFE + 105, 620, 108, INK, ANTON, anchor="ms",
            tracking=-4)
        mono(base, f"étape {idx + 1:02d} / {tot:02d}", SAFE, 690, 12, LIL, track=3)
        title(base, [str(lab)], RIGHT, 520, 700, 200, 76, P_WHITE, hi=AURA,
              leading=1.02)
        if sub:
            para(base, sub, RIGHT, 730, 660, 24, LIL, hi=AURA, floor=15)
        # bande « preuve » : onde + repère, comble le bas sans mentir
        line(base, SAFE, 900, RIGHT, 900, P_WHITE, 1.2, 90)
        wave(base, SAFE, 920, RIGHT - SAFE, 120, bars=64, color=P_WHITE,
             seed=idx + 3, alpha=150)
        mono(base, "30 secondes · un seul enregistrement", SAFE, 1090, 11.5, LIL,
             track=2.0)
        plate(base, (SAFE, 1120, SAFE + 300, 1186), AURA, 4)
        lat(base, "500 DA", SAFE + 150, 1168, 24, INK, ANTON, anchor="ms",
            tracking=1)
        mono(base, "sans abonnement", RIGHT, 1160, 11, LIL, anchor="rs", track=2.0)
    else:
        rect(base, (0, 0, W, 260), INK)
        brand_top(base, k, n, dark=True, style="center")
        lat(base, "RÉCAP", SAFE, 226, 26, P_WHITE, ANTON, anchor="ls", tracking=4)
        due = _steps(payload)[:3]
        for j, st in enumerate(due):
            num, lab, sub = (list(st) + ["", "", ""])[:3]
            top = 320 + j * 190
            tickbox(base, SAFE + 16, top + 30, 17, VIO, True, 2.2)
            para(base, lab, RIGHT, top, 700, 34, INK, hi=VIO, floor=18)
            mono(base, str(sub), SAFE + 50, top + 90, 11, SOFT)
            line(base, SAFE, top + 150, RIGHT, top + 150, INK, 1.0, 70)
        rect(base, (SAFE, 962, RIGHT, 1120), VIO)
        lat(base, "500", SAFE + 32, 1078, 76, P_WHITE, ANTON, anchor="ls",
            tracking=-3)
        para(base, "دج · 30 ثانية صوت", RIGHT - 32, 1000, 460, 26, P_WHITE,
             hi=AURA, floor=15, leading=1.25)
        mono(base, "sans abonnement · sans engagement", SAFE + 32, 1132, 11, LIL)
    foot(base, k, n, dark=(kind in ("step", "recap")), style="thick")
    return base


def aff_end(e, k, n, i):
    base = canvas(VIO, 10)
    dotgrid(base, (0, 0, W, H), P_WHITE, 20, 40, 1.5)
    brand_top(base, k, n, dark=True, style="center")
    ph(base, e.get("photo", "studio-voice.jpg"), (SAFE, 130, RIGHT, 620), duo=2,
       fy=0.32, radius=0)
    rule(base, SAFE, RIGHT, 668, AURA, 8)
    yy = title(base, _lines(e), RIGHT, 700, 940, 240, 86, P_WHITE, hi=AURA,
               leading=1.0)
    cap = str(e.get("caption", "")).strip()
    ycur = yy
    if cap:
        ycur = para(base, cap, RIGHT, yy + 20, 640, 21, LIL, hi=AURA, floor=14)
    g = [str(x) for x in e.get("guarantees", [])[:3]]
    start = max(ycur + 30, 950)
    for j, it in enumerate(g):
        top = start + j * 56
        line(base, SAFE, top - 22, RIGHT, top - 22, LIL, 0.8, 70)
        tick(base, SAFE + 10, top + 2, 8, AURA, 2.6)
        para(base, it, RIGHT, top - 12, 740, 17, LIL, hi=AURA, floor=12)
    rect(base, (SAFE, 1178, SAFE + 380, 1246), AURA)
    lat(base, e.get("cta", "sawtify.space"), SAFE + 190, 1226, 24, INK, MONO,
        anchor="ms", tracking=0.5)
    mono(base, "commande & paiement en ligne", SAFE + 400, 1226, 11, LIL)
    foot(base, k, n, dark=True, style="thick")
    return base


@direction("affiche")
class Affiche:
    cover = staticmethod(aff_cover)
    body = staticmethod(aff_body)
    list = staticmethod(aff_list)
    end = staticmethod(aff_end)


ORDER.append("affiche")


# ═══════════════════════════════════════════════════════════════════════════
#  3 · CINEMA — letterbox, image plein cadre, sous-titres, grain
# ═══════════════════════════════════════════════════════════════════════════
def cin_scrim(base, box, alpha=140, color=INK):
    scrim(base, box, color, alpha)


def cin_bar(base, y0, y1=None, alpha=245):
    rect(base, (0, y0, W, H if y1 is None else y1), INK, alpha)


def cin_cover(s, k, n, i):
    base = canvas(INK, 14)
    ph(base, s.get("photo", "man-studio.jpg"), (0, 0, W, H), duo=1, fy=0.3)
    scrim(base, (0, 0, W, 420), INK, 165)
    scrim(base, (0, 780, W, H), INK, 190)
    rect(base, (0, 0, W, 74), INK)
    rect(base, (0, H - 74, W, H), INK)
    lat(base, "SAWTIFY PICTURES", W / 2, 50, 12.5, P_WHITE, MONO, anchor="ms",
        tracking=6)
    lat(base, f"{k + 1:02d}/{n:02d}", RIGHT, 50, 12, LIL, MONO, anchor="rs",
        tracking=2.4)

    disp = str(s.get("display", "")).strip()
    if disp:
        lat(base, disp, SAFE, 300, 150, P_WHITE, ANTON, anchor="ls", tracking=-6)
        line(base, SAFE, 332, SAFE + 220, 332, AURA, 5)
        mono(base, "chiffre clé", SAFE, 372, 10.5, LIL, track=2.6)

    yy = 830
    for ln in _lines(s)[:2]:
        yy = para(base, ln, RIGHT, yy, 940, 52, P_WHITE, hi=AURA, floor=24,
                  leading=1.12) + 2
    if s.get("promise"):
        para(base, s["promise"], RIGHT, min(yy + 20, 1200), 720, 19, LIL, hi=AURA,
             floor=13)
    lat(base, f"01 · {k + 1:02d}/{n:02d}", W / 2, H - 26, 12, LIL, MONO,
        anchor="ms", tracking=4)
    return base


def cin_body(kind, payload, k, n, i):
    base = canvas(INK, 14)
    pname = payload.get("photo", "man-studio.jpg") if isinstance(payload, dict) \
        else "script-notebook.jpg"
    ph(base, pname, (0, 0, W, H), duo=k % 3, fy=(0.28 + 0.1 * (k % 3)))
    rect(base, (0, 0, W, 74), INK)
    rect(base, (0, H - 74, W, H), INK)
    lat(base, "SAWTIFY PICTURES", W / 2, 50, 12.5, P_WHITE, MONO, anchor="ms",
        tracking=6)
    lat(base, f"{k + 1:02d}/{n:02d}", RIGHT, 50, 12, LIL, MONO, anchor="rs",
        tracking=2.4)

    if kind == "item":
        scrim(base, (0, 96, W, 96 + 400), INK, 175)
        mono(base, "gros plan", SAFE, 150, 11, AURA, track=2.6)
        yy = para(base, payload, RIGHT, 186, 900, 36, P_WHITE, hi=AURA, floor=18,
                  leading=1.26)
        scrim(base, (0, H - 340, W, H - 74), INK, 185)
        mono(base, "plan · séquence · son direct", SAFE, H - 180, 10.5, LIL,
             track=2.2)
    else:
        lines = _lines(payload)
        items = [str(x) for x in payload.get("items", [])[:3]]
        hh = 120 + 96 * len(lines)
        scrim(base, (0, 96, W, 96 + hh), INK, 185)
        yy = 150
        for ln in lines[:2]:
            yy = para(base, ln, RIGHT, yy, 900, 46, P_WHITE, hi=AURA, floor=22,
                      leading=1.12) + 4
        scrim(base, (0, 760, W, H - 74), INK, 195)
        y0 = 800
        for j, it in enumerate(items):
            top = y0 + j * 108
            lat(base, f"0{j + 1}", SAFE, top + 26, 20, AURA, MONO, anchor="ls",
                tracking=1)
            para(base, it, RIGHT, top, 830, 23, LIL, hi=P_WHITE, floor=14)
        mono(base, "un seul enregistrement · darija dz", SAFE, H - 130, 10.5, LIL,
             track=2.0)
    lat(base, f"{k + 1:02d}/{n:02d}", W / 2, H - 26, 12, LIL, MONO, anchor="ms",
        tracking=4)
    return base


def cin_list(kind, payload, k, n, i):
    base = canvas(INK, 14)
    rect(base, (0, 0, W, 74), INK)
    rect(base, (0, H - 74, W, H), INK)
    lat(base, "SAWTIFY PICTURES", W / 2, 50, 12.5, P_WHITE, MONO, anchor="ms",
        tracking=6)
    lat(base, f"{k + 1:02d}/{n:02d}", RIGHT, 50, 12, LIL, MONO, anchor="rs",
        tracking=2.4)

    if kind == "steps":
        ph(base, "mic-hero.jpg", (0, 74, W, 420), duo=2, fy=0.32)
        scrim(base, (0, 74, W, 420), INK, 130)
        lat(base, "SÉQUENCE", SAFE, 380, 14, P_WHITE, MONO, anchor="ls",
            tracking=5)
        steps = _steps(payload)[:3]
        for j, st in enumerate(steps):
            num, lab, sub = (list(st) + ["", "", ""])[:3]
            top = 440 + j * 250
            line(base, SAFE, top, RIGHT, top, P_WHITE, 0.8, 60)
            lat(base, f"{num}", SAFE, top + 100, 78, AURA, ANTON, anchor="ls",
                tracking=-3)
            para(base, lab, RIGHT, top + 30, 720, 34, P_WHITE, hi=AURA, floor=17)
            if sub:
                para(base, sub, RIGHT, top + 112, 640, 18, LIL, hi=LIL, floor=12)
        mono(base, "trois plans · un enregistrement", SAFE, H - 130, 10.5, LIL,
             track=2.4)
    elif kind == "step":
        st, idx, tot = payload
        num, lab, sub = (list(st) + ["", "", ""])[:3]
        ph(base, "man-studio.jpg", (0, 74, W, H - 74), duo=(k % 3), fy=0.28)
        scrim(base, (0, 74, W, 470), INK, 150)
        scrim(base, (0, 820, W, H - 74), INK, 205)
        lat(base, f"PLAN {num}", SAFE, 150, 14, AURA, MONO, anchor="ls",
            tracking=3.6)
        mono(base, f"étape {idx + 1:02d} / {tot:02d}", RIGHT, 150, 11, LIL,
             anchor="rs", track=2.4)
        title(base, [str(lab)], RIGHT, 880, 940, 170, 62, P_WHITE, hi=AURA)
        if sub:
            para(base, sub, RIGHT, 1070, 780, 21, LIL, hi=AURA, floor=14)
        lat(base, f"{k + 1:02d}/{n:02d}", W / 2, H - 26, 12, LIL, MONO,
            anchor="ms", tracking=4)
    else:
        lat(base, "GÉNÉRIQUE", SAFE, 140, 14, AURA, MONO, anchor="ls", tracking=5)
        due = _steps(payload)[:3]
        for j, st in enumerate(due):
            num, lab, sub = (list(st) + ["", "", ""])[:3]
            top = 190 + j * 210
            ring(base, SAFE + 44, top + 44, 38, AURA, 1.6)
            lat(base, f"0{j + 1}", SAFE + 44, top + 60, 26, P_WHITE, ANTON,
                anchor="ms", tracking=0)
            para(base, lab, RIGHT, top + 22, 720, 30, P_WHITE, hi=AURA, floor=16)
            mono(base, sub, SAFE + 104, top + 116, 10.5, LIL)
            line(base, SAFE + 104, top + 142, RIGHT, top + 142, LIL, 0.8, 70)
        ph(base, "shop-owners.jpg", (SAFE, 850, RIGHT, 1120), duo=0, fy=0.32)
        mono(base, "tourné à alger · son sahwit", SAFE, 1160, 10.5, LIL, track=2.2)
        lat(base, f"{k + 1:02d}/{n:02d}", W / 2, H - 26, 12, LIL, MONO,
            anchor="ms", tracking=4)
    return base


def cin_end(e, k, n, i):
    base = canvas(INK, 14)
    ph(base, e.get("photo", "man-studio.jpg"), (0, 0, W, H), duo=1, fy=0.28)
    scrim(base, (0, 0, W, 520), INK, 175)
    scrim(base, (0, 700, W, H), INK, 205)
    rect(base, (0, 0, W, 74), INK)
    rect(base, (0, H - 74, W, H), INK)
    lat(base, "SAWTIFY PICTURES", W / 2, 50, 12.5, P_WHITE, MONO, anchor="ms",
        tracking=6)
    lat(base, "FIN", W / 2, 200, 30, P_WHITE, MONO, anchor="ms", tracking=12)
    line(base, W / 2 - 56, 218, W / 2 + 56, 218, AURA, 3)
    yy = title(base, _lines(e), RIGHT, 760, 940, 200, 66, P_WHITE, hi=AURA,
               leading=1.06)
    cap = str(e.get("caption", "")).strip()
    ycur = yy
    if cap:
        ycur = para(base, cap, RIGHT, yy + 22, 720, 21, LIL, hi=AURA, floor=14)
    g = [str(x) for x in e.get("guarantees", [])[:3]]
    start = max(ycur + 30, 1006)
    for j, it in enumerate(g):
        top = start - 16 + j * 54
        para(base, it, RIGHT, top, 700, 17, LIL, hi=AURA, floor=12)
    plate(base, (SAFE, H - 190, SAFE + 380, H - 122), AURA, 0)
    lat(base, e.get("cta", "sawtify.space"), SAFE + 190, H - 140, 23, INK, MONO,
        anchor="ms", tracking=0.5)
    mono(base, "commande · paiement en ligne", SAFE + 400, H - 140, 10.5, LIL)
    lat(base, "SAWTIFY PICTURES", W / 2, H - 26, 12, LIL, MONO, anchor="ms",
        tracking=6)
    return base


@direction("cinema")
class Cinema:
    cover = staticmethod(cin_cover)
    body = staticmethod(cin_body)
    list = staticmethod(cin_list)
    end = staticmethod(cin_end)


ORDER.append("cinema")


# ═══════════════════════════════════════════════════════════════════════════
#  4 · BENTO — tuiles arrondies, icônes, grille pleine (jamais de vide)
# ═══════════════════════════════════════════════════════════════════════════
def ben_tile(base, box, fill=P_WHITE, r=26, outline=None):
    plate(base, box, fill, r, outline=outline, ow=1.4)


def ben_cover(s, k, n, i):
    base = canvas(LIL, 6)
    ben_tile(base, (0, 0, W, 250), DEEP, 0)
    brand_top(base, k, n, dark=True, style="corner")
    mono(base, "édition darija · novembre 2026", SAFE, 170, 10.5, LIL, track=2.4)
    lat(base, "SAWTIFY", SAFE, 226, 46, P_WHITE, ANTON, anchor="ls", tracking=-1)
    # tuile photo
    ben_tile(base, (SAFE, 280, 660, 800), P_WHITE, 28)
    ph(base, s.get("photo", "studio-voice.jpg"), (SAFE + 10, 290, 650, 790), duo=0,
       fy=0.34, radius=22)
    # tuile chiffre
    ben_tile(base, (686, 280, RIGHT, 540), VIO, 28)
    disp = str(s.get("display", "")).strip()
    if disp:
        ds = ar_fit(base, disp, 330, 92, ANTON, 40)
        lat(base, disp, 1000, 470, ds if len(disp) < 4 else min(ds, 74),
            P_WHITE, ANTON, anchor="ms", tracking=-3)
    mono(base, "chiffre clé", 1000, 512, 10, LIL, anchor="ms", track=2.4)
    # tuile icône + mot
    ben_tile(base, (686, 566, RIGHT, 800), AURA, 28)
    icon(base, "mic", 760, 648, 52, INK, 3)
    para(base, "صوت يبيع", 986, 620, 250, 26, INK, hi=INK, floor=16)
    para(base, "30 ثانية", 986, 736, 260, 15, INK, hi=INK, floor=11)
    # tuile titre
    ben_tile(base, (SAFE, 826, RIGHT, 1104), P_WHITE, 30)
    yy = title(base, _lines(s), RIGHT - 30, 856, 900, 160, 62, INK, hi=VIO,
               leading=1.06)
    if s.get("promise"):
        para(base, s["promise"], RIGHT - 30, min(max(yy + 14, 1010), 1046), 640,
             18, SOFT, hi=VIO, floor=12)
    # barre CTA
    ben_tile(base, (SAFE, 1120, RIGHT, 1200), INK, 40)
    lat(base, "sawtify.space", SAFE + 40, 1178, 24, P_WHITE, MONO, anchor="ls",
        tracking=1.2)
    mono(base, "500 da · sans abonnement", RIGHT - 40, 1172, 11, LIL, anchor="rs",
         track=1.6)
    foot(base, k, n, dots=True)
    return base


def ben_body(kind, payload, k, n, i):
    base = canvas(LIL, 6)
    brand_top(base, k, n, style="corner")
    if kind == "item":
        ph0 = payload.get("photo", "script-notebook.jpg") if isinstance(payload, dict) \
            else "script-notebook.jpg"
        hh = para(SCRATCH2, payload, RIGHT - 40, 0, 820, 32, P_WHITE, hi=AURA,
                  floor=18, leading=1.28) + 96
        th = max(248, min(hh, 372))
        ben_tile(base, (SAFE, 170, RIGHT, 170 + th), VIO, 30)
        icon(base, ["bolt", "layers", "clock", "star"][k % 4], SAFE + 76,
             170 + th / 2, 58, P_WHITE, 3.0)
        line(base, SAFE + 136, 170 + th / 2 - 44, SAFE + 136, 170 + th / 2 + 44,
             P_WHITE, 1.0, 110)
        para(base, payload, RIGHT - 40, 170 + 30, 760, 31, P_WHITE, hi=AURA,
             floor=18, leading=1.28)
        mono(base, f"n° {k:02d}", SAFE + 40, 170 + th - 26, 10.5, LIL, track=2.0)
        mid = 170 + th + 20
        if k % 2 == 0:
            ph(base, ph0, (SAFE, mid, 620, 900), duo=(k % 3), fy=0.4, radius=24)
            ben_tile(base, (648, mid, RIGHT, mid + 194), DEEP, 26)
            icon(base, "mic", 722, mid + 74, 42, P_WHITE, 2.6)
            mono(base, "à l'écran", 722, mid + 154, 10, LIL, anchor="ms", track=2.0)
            ben_tile(base, (648, mid + 214, RIGHT, 900), AURA, 26)
            lat(base, "1", 962, 852, 92, INK, ANTON, anchor="ms", tracking=0)
            mono(base, "idée par slide", 760, 862, 10, INK, anchor="ms", track=1.4)
        else:
            ben_tile(base, (SAFE, mid, SAFE + 250, mid + 194), DEEP, 26)
            icon(base, "mic", SAFE + 66, mid + 74, 42, P_WHITE, 2.6)
            mono(base, "à l'écran", SAFE + 66, mid + 154, 10, LIL, anchor="ms",
                 track=2.0)
            ben_tile(base, (SAFE, mid + 214, SAFE + 250, 900), AURA, 26)
            lat(base, "1", SAFE + 128, 852, 92, INK, ANTON, anchor="ms",
                tracking=0)
            mono(base, "idée", SAFE + 128, 872, 10, INK, anchor="ms", track=1.4)
            ph(base, ph0, (278, mid, RIGHT, 900), duo=(k % 3), fy=0.4, radius=24)
        ben_tile(base, (SAFE, 926, RIGHT, 1132), P_WHITE, 26)
        mono(base, _PT.get("micro", "à retenir"), SAFE + 26, 972, 10.5, VIO,
             track=2.2)
        para(base, _PT["mini"], RIGHT - 26, 992, 820, 22, INK, hi=VIO, floor=14)
        mono(base, "sawtify · darija dz", SAFE, 1178, 10.5, SOFT, track=2.0)
    else:
        lines = _lines(payload)
        items = [str(x) for x in payload.get("items", [])[:3]]
        ben_tile(base, (SAFE, 170, RIGHT, 520), P_WHITE, 30)
        yy = title(base, lines, RIGHT - 30, 200, 880, 240, 62, INK, hi=VIO,
                   leading=1.06)
        ph(base, "studio-voice.jpg", (SAFE, 546, 600, 900), duo=2, fy=0.34,
           radius=24)
        ben_tile(base, (628, 546, RIGHT, 900), VIO, 28)
        for j, it in enumerate(items[:3]):
            top = 580 + j * 104
            disc(base, 672, top + 24, 16, AURA)
            lat(base, str(j + 1), 672, top + 33, 18, INK, ANTON, anchor="ms",
                tracking=0)
            para(base, it, RIGHT - 26, top + 4, 340, 17, P_WHITE, hi=AURA,
                 floor=11, leading=1.3)
        ben_tile(base, (SAFE, 926, RIGHT, 1104), DEEP, 26)
        mono(base, "promesse", SAFE + 26, 972, 10.5, LIL, track=2.2)
        para(base, str(payload.get("promise", "sans abonnement, sans engagement")),
             RIGHT - 26, 990, 800, 22, P_WHITE, hi=AURA, floor=14)
        mono(base, "500 da · livré en 24 h", SAFE, 1176, 10.5, SOFT, track=2.0)
    foot(base, k, n, dots=True)
    return base


def ben_list(kind, payload, k, n, i):
    base = canvas(LIL, 6)
    brand_top(base, k, n, style="corner")
    if kind == "steps":
        ben_tile(base, (SAFE, 170, RIGHT, 300), DEEP, 30)
        mono(base, "la méthode en 3 gestes", SAFE + 28, 226, 12, LIL, track=2.4)
        lat(base, "3 TUILES", RIGHT - 28, 270, 22, P_WHITE, ANTON, anchor="rs",
            tracking=1)
        steps = _steps(payload)[:3]
        for j, st in enumerate(steps):
            num, lab, sub = (list(st) + ["", "", ""])[:3]
            top = 326 + j * 274
            ben_tile(base, (SAFE, top, RIGHT, top + 254), P_WHITE, 26)
            ben_tile(base, (SAFE + 18, top + 18, SAFE + 118, top + 118), VIO, 20)
            lat(base, str(num), SAFE + 68, top + 92, 44, P_WHITE, ANTON,
                anchor="ms", tracking=-1)
            para(base, lab, RIGHT - 26, top + 40, 640, 30, INK, hi=VIO, floor=16)
            if sub:
                para(base, sub, RIGHT - 26, top + 128, 560, 17, SOFT, hi=VIO,
                     floor=12)
            tick(base, SAFE + 60, top + 200, 12, AURA, 3.2)
    elif kind == "step":
        st, idx, tot = payload
        num, lab, sub = (list(st) + ["", "", ""])[:3]
        ben_tile(base, (SAFE, 170, RIGHT, 468), VIO, 30)
        lat(base, str(num), SAFE + 40, 420, 190, P_WHITE, ANTON, anchor="ls",
            tracking=-8)
        mono(base, f"étape {idx + 1:02d} / {tot:02d}", RIGHT - 34, 226, 11.5, LIL,
             anchor="rs", track=2.2)
        para(base, lab, RIGHT - 34, 250, 420, 34, P_WHITE, hi=AURA, floor=17)
        ph(base, "phone-hand.jpg", (SAFE, 494, RIGHT, 900), duo=1, fy=0.4, radius=26)
        ben_tile(base, (SAFE, 926, RIGHT, 1104), P_WHITE, 26)
        para(base, sub or "un seul enregistrement suffit", RIGHT - 26, 960, 800,
             24, INK, hi=VIO, floor=15)
        ben_tile(base, (SAFE, 1120, RIGHT, 1200), AURA, 40)
        lat(base, "sawtify.space", SAFE + 400, 1178, 22, INK, MONO, anchor="ms",
            tracking=1)
        mono(base, "500 da", SAFE + 36, 1172, 12, INK, track=2.0)
        mono(base, _PT.get("micro", "studio"), RIGHT - 36, 1172, 10.5, INK,
             anchor="rs", track=1.6)
    else:
        ben_tile(base, (SAFE, 170, RIGHT, 340), INK, 30)
        mono(base, "récap", SAFE + 28, 226, 12, LIL, track=2.4)
        para(base, _PT.get("titre", "خلاصة"), RIGHT - 28, 244, 620, 30, P_WHITE,
             hi=AURA, floor=16)
        due = _steps(payload)[:3]
        for j, st in enumerate(due):
            num, lab, sub = (list(st) + ["", "", ""])[:3]
            top = 366 + j * 214
            ben_tile(base, (SAFE, top, RIGHT, top + 194), P_WHITE, 24)
            tickbox(base, SAFE + 44, top + 46, 18, VIO, True, 2.2)
            para(base, lab, RIGHT - 26, top + 26, 720, 26, INK, hi=VIO, floor=15)
            mono(base, str(sub), SAFE + 74, top + 120, 11, SOFT)
        ben_tile(base, (SAFE, 1042, RIGHT, 1200), VIO, 28)
        lat(base, "500", SAFE + 40, 1150, 64, P_WHITE, ANTON, anchor="ls",
            tracking=-2)
        para(base, "دج · 30 ثانية · تسليم 24 سا", RIGHT - 34, 1076, 520, 22,
             P_WHITE, hi=AURA, floor=14)
        mono(base, "sans abonnement", SAFE + 40, 1188, 11, LIL)
    foot(base, k, n, dots=True)
    return base


def ben_end(e, k, n, i):
    base = canvas(LIL, 6)
    ben_tile(base, (SAFE, 100, RIGHT, 700), DEEP, 34)
    brand_top(base, k, n, dark=True, style="corner")
    ph(base, e.get("photo", "shop-owners.jpg"), (SAFE + 14, 114, RIGHT - 14, 686),
       duo=1, fy=0.34, radius=26)
    ben_tile(base, (SAFE, 726, RIGHT, 1000), P_WHITE, 30)
    yy = title(base, _lines(e), RIGHT - 30, 762, 880, 190, 58, INK, hi=VIO,
               leading=1.06)
    cap = str(e.get("caption", "")).strip()
    if cap:
        para(base, cap, RIGHT - 30, min(yy + 14, 940), 700, 18, SOFT, hi=VIO,
             floor=12)
    ben_tile(base, (SAFE, 1026, RIGHT, 1200), VIO, 30)
    icon(base, "cart", SAFE + 60, 1082, 40, P_WHITE, 2.6)
    lat(base, e.get("cta", "sawtify.space"), SAFE + 100, 1096, 26, P_WHITE, MONO,
        anchor="ls", tracking=1)
    g = [str(x) for x in e.get("guarantees", [])[:2]]
    for j, it in enumerate(g):
        para(base, it, RIGHT - 30, 1130 + j * 0, 460, 15, LIL, hi=AURA, floor=11)
        break
    mono(base, "paiement en ligne · livraison 24 h", SAFE + 100, 1180, 10.5, LIL,
         track=1.6)
    foot(base, k, n, dots=True)
    return base


@direction("bento")
class Bento:
    cover = staticmethod(ben_cover)
    body = staticmethod(ben_body)
    list = staticmethod(ben_list)
    end = staticmethod(ben_end)


ORDER.append("bento")


# ═══════════════════════════════════════════════════════════════════════════
#  5 · DIPTYQUE — deux pages face à face, pli central, papiers différents
# ═══════════════════════════════════════════════════════════════════════════
def dip_fold(base, x=W / 2, alpha=26):
    line(base, x, 0, x, H, INK, 1.4, alpha)
    line(base, x + 3, 0, x + 3, H, P_WHITE, 1.0, 90)


def dip_cover(s, k, n, i):
    base = canvas(PAPER, 6)
    fibers(base, INK, 140, 9)
    rect(base, (0, 0, W / 2, H), LIL)
    brand_top(base, k, n, style="edge")
    ph(base, s.get("photo", "studio-voice.jpg"), (W / 2, 0, W, 620), duo=1, fy=0.34)
    disp = str(s.get("display", "")).strip()
    if disp:
        ds = ar_fit(base, disp, 380, 96, ANTON, 44)
        lat(base, disp, SAFE + 20, 300, ds, VIO, ANTON, anchor="ls", tracking=-3)
        mono(base, "chiffre clé", SAFE, 340, 10.5, SOFT, track=2.4)
    mono(base, "novembre 2026", SAFE, 200, 11, SOFT, track=2.4)
    ph(base, "shop-owners.jpg", (SAFE, 620, W / 2 - 30, 1080), duo=2, fy=0.3)
    yy = title(base, _lines(s), RIGHT, 660, 440, 330, 54, INK, hi=VIO,
               leading=1.08)
    if s.get("promise"):
        para(base, s["promise"], RIGHT, min(yy + 20, 1120), 440, 17, SOFT, hi=VIO,
             floor=12)
    mono(base, "left · le constat · right · la preuve", SAFE, 1140, 9.5, SOFT,
         track=1.8)
    for r, (a, b) in enumerate([("voix", "darija dz"), ("prix", "500 da"),
                                ("délai", "24 h")]):
        top = 900 + r * 74
        line(base, W / 2 + 20, top, RIGHT, top, INK, 0.7, 70)
        mono(base, a, W / 2 + 20, top + 34, 9.5, SOFT, track=1.8)
        mono(base, b, RIGHT, top + 34, 11, INK, anchor="rs", track=1.2)
    dip_fold(base)
    foot(base, k, n, label=s.get("sticker") or "sawtify.space")
    return base


def dip_body(kind, payload, k, n, i):
    base = canvas(PAPER, 6)
    fibers(base, INK, 140, 9)
    dark = k % 2
    brand_top(base, k, n, style="edge")
    if kind == "item":
        rect(base, (0, 170, W / 2, BOT - 40), VIO)
        para(base, payload, W / 2 - 30, 220, 380, 30, P_WHITE, hi=AURA, floor=16,
             leading=1.3)
        mono(base, "page de gauche", SAFE, BOT - 90, 10, LIL, track=2.2)
        ph(base, "script-notebook.jpg", (W / 2 + 20, 170, RIGHT, 800), duo=0,
           fy=0.4)
        mono(base, "page de droite", W / 2 + 20, 840, 10, SOFT, track=2.2)
        yy = para(base, _PT["mini"], RIGHT, 880, 440, 24, INK, hi=VIO, floor=15)
        mono(base, "sawtify · darija dz", W / 2 + 20, 1120, 10, SOFT, track=2.0)
    else:
        rect(base, (0, 0, W / 2, H), LIL if not dark else DEEP)
        ink = P_WHITE if dark else INK
        lat(base, "LEFT", SAFE, 200, 14, SOFT if not dark else LIL, MONO,
            anchor="ls", tracking=3.4)
        yy = title(base, _lines(payload), W / 2 - 30, 230, 380, 380, 62, ink,
                   hi=AURA if dark else VIO, leading=1.04)
        items = [str(x) for x in payload.get("items", [])[:3]]
        ph(base, payload.get("photo", "man-studio.jpg"),
           (W / 2 + 20, 0, RIGHT, 700), duo=(k % 3), fy=0.32)
        # triptyque de repères : la page de gauche respire au lieu de rester vide
        for r, (a, b) in enumerate([("voix", "darija dz"), ("format", "30 s"),
                                    ("prix", "500 da"), ("délai", "24 h")]):
            top = 800 + r * 76
            line(base, SAFE, top, W / 2 - 30, top, ink, 0.7, 80)
            mono(base, a, SAFE, top + 34, 9.5, SOFT if not dark else LIL, track=1.8)
            mono(base, b, W / 2 - 30, top + 34, 11, ink, anchor="rs", track=1.2)
        lat(base, "RIGHT", W / 2 + 20, 740, 14, SOFT, MONO, anchor="ls",
            tracking=3.4)
        for j, it in enumerate(items):
            top = 790 + j * 108
            line(base, W / 2 + 20, top - 24, RIGHT, top - 24, INK, 0.8, 70)
            lat(base, f"0{j + 1}", W / 2 + 20, top + 26, 22, VIO, ANTON,
                anchor="ls", tracking=0)
            para(base, it, RIGHT, top - 4, 400, 19, INK, hi=VIO, floor=13)
    dip_fold(base)
    foot(base, k, n)
    return base


def dip_list(kind, payload, k, n, i):
    base = canvas(PAPER, 6)
    fibers(base, INK, 140, 9)
    rect(base, (W / 2, 0, W, H), LIL)
    brand_top(base, k, n, style="edge")
    if kind == "steps":
        mono(base, "mode d'emploi · deux pages", SAFE, 190, 11.5, VIO, track=2.8)
        para(base, _PT.get("titre", "الخطوات"), RIGHT, 186, 520, 22, INK,
             hi=VIO, floor=14)
        mono(base, "à faire", SAFE, 268, 10, SOFT, track=2.2)
        mono(base, "à retenir", W / 2 + 24, 268, 10, SOFT, track=2.2)
        steps = _steps(payload)[:3]
        for j, st in enumerate(steps):
            num, lab, sub = (list(st) + ["", "", ""])[:3]
            top = 292 + j * 232
            line(base, SAFE, top, W / 2 - 30, top, INK, 1.0, 80)
            line(base, W / 2 + 24, top, RIGHT, top, INK, 1.0, 80)
            lat(base, str(num), SAFE, top + 84, 52, INK, ANTON, anchor="ls",
                tracking=-2)
            para(base, lab, W / 2 - 30, top + 20, 300, 24, INK, hi=VIO, floor=14)
            if sub:
                plate(base, (W / 2 + 24, top + 30, RIGHT, top + 154), PAPER, 8,
                      outline=VIO, ow=1.0)
                para(base, sub, RIGHT - 20, top + 58, 400, 20, INK, hi=VIO,
                     floor=12)
        ph(base, "phone-hand.jpg", (SAFE, 1010, RIGHT, 1130), duo=2, fy=0.42)
        mono(base, "le téléphone suffit · studio maison", SAFE, 1168, 10, SOFT,
             track=1.8)
    elif kind == "step":
        st, idx, tot = payload
        num, lab, sub = (list(st) + ["", "", ""])[:3]
        lat(base, f"0{idx + 1}", SAFE, 300, 120, VIO, ANTON, anchor="ls",
            tracking=-6)
        mono(base, f"/ {tot:02d}", SAFE + 120, 296, 14, SOFT, track=2.0)
        ph(base, "studio-voice.jpg", (SAFE, 380, W / 2 - 30, 1020), duo=1, fy=0.34)
        yy = title(base, [str(lab)], RIGHT, 300, 440, 300, 56, INK, hi=VIO,
                   leading=1.06)
        if sub:
            para(base, sub, RIGHT, min(yy + 30, 700), 430, 21, SOFT, hi=VIO,
                 floor=14)
        para(base, "الوقت المناسب: 30 ثانية بلا توقف.", RIGHT, 820, 430, 20, INK,
             hi=VIO, floor=13)
        mono(base, "un seul enregistrement suffit", W / 2 + 24, 1090, 10, SOFT,
             track=1.8)
    else:
        mono(base, "le récap — deux colonnes", SAFE, 190, 11.5, VIO, track=2.6)
        due = _steps(payload)[:3]
        for j, st in enumerate(due):
            num, lab, sub = (list(st) + ["", "", ""])[:3]
            top = 260 + j * 200
            tickbox(base, SAFE + 12, top + 16, 15, VIO, True, 2.0)
            para(base, lab, W / 2 - 30, top, 380, 24, INK, hi=VIO, floor=15)
            mono(base, str(sub), W / 2 + 24, top + 12, 10.5, SOFT)
            line(base, SAFE, top + 150, RIGHT, top + 150, INK, 0.8, 60)
        rect(base, (SAFE, 900, W / 2 - 30, 1040), DEEP)
        lat(base, "500", SAFE + 22, 1010, 52, P_WHITE, ANTON, anchor="ls",
            tracking=-2)
        para(base, "دج", SAFE + 110, 950, 90, 30, P_WHITE, hi=AURA, floor=16)
        mono(base, "30 ثانية", SAFE + 22, 1090, 12, SOFT) if False else None
        para(base, "30 ثانية · تسليم 24 سا", W / 2 + 24, 940, 420, 22, INK,
             hi=VIO, floor=14)
        mono(base, "commande en ligne", W / 2 + 24, 1030, 11, SOFT, track=2.0)
    dip_fold(base)
    foot(base, k, n)
    return base


def dip_end(e, k, n, i):
    base = canvas(PAPER, 6)
    rect(base, (0, 0, W / 2, H), DEEP)
    ph(base, e.get("photo", "studio-voice.jpg"), (W / 2, 0, W, 760), duo=0, fy=0.3)
    brand_top(base, k, n, dark=True, style="edge")
    lat(base, "FIN", SAFE, 300, 22, AURA, MONO, anchor="ls", tracking=6)
    yy = title(base, _lines(e), W / 2 - 30, 340, 380, 360, 58, P_WHITE, hi=AURA,
               leading=1.06)
    cap = str(e.get("caption", "")).strip()
    if cap:
        para(base, cap, W / 2 - 30, min(yy + 24, 760), 380, 18, LIL, hi=AURA,
             floor=12)
    g = [str(x) for x in e.get("guarantees", [])[:2]]
    for j, it in enumerate(g):
        para(base, it, W / 2 - 30, 800 + j * 66, 380, 15, LIL, hi=AURA, floor=11)
    mono(base, "sawtify · darija dz", SAFE, 1140, 10, LIL, track=2.0)
    yy2 = 800
    for ln in ["من التليفون", "بلا ميكرو", "بلا التزام"]:
        para(base, ln, RIGHT, yy2, 420, 22, INK, hi=VIO, floor=14)
        yy2 += 74
    plate(base, (W / 2 + 24, 1040, RIGHT, 1110), AURA, 0)
    lat(base, e.get("cta", "sawtify.space"), W / 2 + 24, 1094, 22, INK, MONO,
        anchor="ls", tracking=0.5)
    mono(base, "paiement en ligne", W / 2 + 24, 1140, 10.5, SOFT, track=1.8)
    dip_fold(base)
    foot(base, k, n, dark=True)
    return base


@direction("diptyque")
class Diptyque:
    cover = staticmethod(dip_cover)
    body = staticmethod(dip_body)
    list = staticmethod(dip_list)
    end = staticmethod(dip_end)


ORDER.append("diptyque")


# ═══════════════════════════════════════════════════════════════════════════
#  6 · FICHE — formulaire technique, cases à cocher, tampon, numérotation
# ═══════════════════════════════════════════════════════════════════════════
FICHE_FIELDS = [("réf.", "SWT-DZ-{k}"), ("format", "1080 × 1350"),
                ("durée", "30 s"), ("prix", "500 da"), ("langue", "darija dz")]


def fic_grid(base, alpha=13):
    for x in range(int(SAFE), int(RIGHT) + 1, 24):
        line(base, x, TOP, x, BOT, INK, 0.4, alpha)
    for y in range(int(TOP), int(BOT) + 1, 24):
        line(base, SAFE, y, RIGHT, y, INK, 0.4, alpha)


def fic_cover(s, k, n, i):
    base = canvas(PAPER, 5)
    fibers(base, INK, 120, 8)
    fic_grid(base)
    brand_top(base, k, n, style="tag")
    y = 140
    mono(base, "fiche technique · publication", SAFE, y, 11.5, VIO, track=2.6)
    line(base, SAFE, y + 16, RIGHT, y + 16, INK, 1.6, 200)
    for j, (lab, val) in enumerate([(a, b.format(k=f"{k + 1:02d}")) for a, b in
                                    FICHE_FIELDS[:3]]):
        yy = y + 40 + j * 40
        mono(base, lab, SAFE, yy + 12, 9.5, SOFT, track=1.8)
        mono(base, val, RIGHT, yy + 12, 11, INK, anchor="rs", track=1.4)
        dotted(base, SAFE + 70, RIGHT - 100, yy + 12, SOFT, 8, 1.2, 120)
    line(base, SAFE, 300, RIGHT, 300, INK, 1.2, 140)
    ph(base, s.get("photo", "studio-voice.jpg"), (SAFE, 316, RIGHT, 830), duo=0,
       fy=0.34, radius=2)
    disp = str(s.get("display", "")).strip()
    if disp:
        plate(base, (SAFE, 316, SAFE + 200, 420), AURA, 0)
        ds = ar_fit(base, disp, 170, 58, ANTON, 30)
        lat(base, disp, SAFE + 100, 402, ds, INK, ANTON, anchor="ms", tracking=-2)
        mono(base, "chiffre clé", SAFE + 210, 340, 9.5, SOFT, track=1.8)
    yy = title(base, _lines(s), RIGHT, 846, 760, 150, 62, INK, hi=VIO)
    if s.get("promise"):
        para(base, s["promise"], RIGHT - 120, min(yy + 14, 992), 600, 16, SOFT,
             hi=VIO, floor=12)
    line(base, SAFE, 1010, RIGHT, 1010, INK, 1.0, 120)
    for j, (lab, val) in enumerate([(a, b.format(k=f"{k + 1:02d}"))
                                    for a, b in FICHE_FIELDS[3:]]):
        yy2 = 1030 + j * 44
        mono(base, lab, SAFE, yy2 + 12, 9.5, SOFT, track=1.8)
        mono(base, val, 420, yy2 + 12, 11, INK, track=1.2)
        dotted(base, SAFE + 64, 400, yy2 + 12, SOFT, 8, 1.2, 110)
    plate(base, (SAFE, 1128, 560, 1190), DEEP)
    mono(base, "facturé une fois · zéro abonnement", SAFE + 18, 1168, 10, LIL,
         track=1.8)
    stamp(base, RIGHT - 62, 1150, 52, "CONTRÔLÉ", "QUALITÉ", VIO, 9)
    foot(base, k, n, label=s.get("sticker") or "sawtify.space")
    return base


def fic_body(kind, payload, k, n, i):
    base = canvas(PAPER, 5)
    fibers(base, INK, 120, 8)
    fic_grid(base)
    brand_top(base, k, n, style="tag")
    if kind == "item":
        mono(base, f"point n° {k:02d}", SAFE, 150, 12, VIO, track=2.6)
        line(base, SAFE, 168, RIGHT, 168, INK, 1.6, 200)
        para(base, payload, RIGHT, 200, 800, 34, INK, hi=VIO, floor=18,
             leading=1.28)
        y = 520
        for j, (lab, val) in enumerate([(a, b.format(k=f"{k:02d}"))
                                        for a, b in FICHE_FIELDS]):
            yy = y + j * 52
            mono(base, lab, SAFE, yy + 14, 9.5, SOFT, track=1.8)
            mono(base, val, 420, yy + 14, 11, INK, track=1.2)
            dotted(base, SAFE + 70, 400, yy + 14, SOFT, 8, 1.2, 110)
            line(base, SAFE, yy + 44, RIGHT, yy + 44, INK, 0.6, 60)
        ph(base, "script-notebook.jpg", (SAFE, 800, RIGHT, 1080), duo=1, fy=0.4,
           radius=2)
        tickbox(base, SAFE + 14, 1120, 14, VIO, True, 2.0)
        mono(base, "fiche validée · prêt à publier", SAFE + 40, 1126, 10.5, INK)
        stamp(base, RIGHT - 60, 1120, 52, "OK", "STUDIO", AURA, 9)
    else:
        mono(base, "constat · relevé", SAFE, 150, 12, VIO, track=2.6)
        line(base, SAFE, 168, RIGHT, 168, INK, 1.6, 200)
        yy = title(base, _lines(payload), RIGHT, 200, 900, 230, 62, INK, hi=VIO)
        items = [str(x) for x in payload.get("items", [])[:3]]
        y0 = max(yy + 50, 480)
        for j, it in enumerate(items):
            top = y0 + j * 150
            mono(base, f"{j + 1:02d}", SAFE, top + 20, 22, VIO, track=0)
            tickbox(base, SAFE + 62, top + 12, 14, VIO, j == 0, 1.8)
            para(base, it, RIGHT, top, 800, 24, INK, hi=VIO, floor=14)
            line(base, SAFE, top + 108, RIGHT, top + 108, INK, 0.8, 80)
        ph(base, "phone-hand.jpg", (SAFE, 940, RIGHT, 1130), duo=2, fy=0.45,
           radius=2)
    foot(base, k, n)
    return base


def fic_list(kind, payload, k, n, i):
    base = canvas(PAPER, 5)
    fibers(base, INK, 120, 8)
    fic_grid(base)
    brand_top(base, k, n, style="tag")
    if kind == "steps":
        mono(base, "procédure · 3 étapes", SAFE, 150, 12, VIO, track=2.6)
        line(base, SAFE, 168, RIGHT, 168, INK, 1.6, 200)
        steps = _steps(payload)[:3]
        for j, st in enumerate(steps):
            num, lab, sub = (list(st) + ["", "", ""])[:3]
            top = 196 + j * 260
            mono(base, f"étape {num}", SAFE, top + 20, 10, SOFT, track=2.0)
            para(base, lab, RIGHT, top + 8, 700, 30, INK, hi=VIO, floor=16)
            if sub:
                para(base, sub, RIGHT, top + 78, 620, 17, SOFT, hi=VIO, floor=12)
            tickbox(base, SAFE + 14, top + 150, 16, VIO, True, 2.2)
            mono(base, "fait", SAFE + 44, top + 156, 10, SOFT)
            line(base, SAFE, top + 216, RIGHT, top + 216, INK, 1.0, 120)
        ph(base, "mic-hero.jpg", (SAFE, 990, RIGHT, 1130), duo=0, fy=0.45, radius=2)
    elif kind == "step":
        st, idx, tot = payload
        num, lab, sub = (list(st) + ["", "", ""])[:3]
        mono(base, f"étape {idx + 1:02d} / {tot:02d}", SAFE, 150, 12, VIO,
             track=2.6)
        mono(base, f"{100 / tot:.0f} %", RIGHT, 150, 12, SOFT, anchor="rs",
             track=1.6)
        line(base, SAFE, 168, RIGHT, 168, INK, 1.6, 200)
        # jauge de progression
        rect(base, (SAFE, 176, RIGHT, 188), LIL)
        rect(base, (SAFE, 176, SAFE + (RIGHT - SAFE) * (idx + 1) / tot, 188), VIO)
        lat(base, str(num), SAFE, 360, 150, LIL, ANTON, anchor="ls", tracking=-8)
        title(base, [str(lab)], RIGHT, 220, 620, 200, 56, INK, hi=VIO, leading=1.06)
        if sub:
            para(base, sub, RIGHT, 448, 560, 20, SOFT, hi=VIO, floor=13)
        ph(base, "studio-voice.jpg", (SAFE, 560, RIGHT, 960), duo=(k % 3), fy=0.34,
           radius=2)
        for j, (lab_, val) in enumerate([("durée", "30 s"), ("prix", "500 da")]):
            mono(base, lab_, SAFE + j * 200, 1010, 9.5, SOFT, track=1.8)
            mono(base, val, SAFE + j * 200, 1034, 14, INK, track=1.0)
            line(base, SAFE + j * 200, 1046, SAFE + j * 200 + 160, 1046, INK, 0.8,
                 90)
        plate(base, (SAFE, 1090, RIGHT, 1150), DEEP, 2)
        mono(base, "enregistrement unique · livraison 24 h", SAFE + 18, 1128, 11,
             LIL, track=1.8)
    else:
        mono(base, "récapitulatif · à cocher", SAFE, 150, 12, VIO, track=2.6)
        line(base, SAFE, 168, RIGHT, 168, INK, 1.6, 200)
        due = _steps(payload)[:3]
        for j, st in enumerate(due):
            num, lab, sub = (list(st) + ["", "", ""])[:3]
            top = 200 + j * 176
            tickbox(base, SAFE + 16, top + 26, 17, VIO, True, 2.2)
            para(base, lab, RIGHT, top, 760, 28, INK, hi=VIO, floor=16)
            mono(base, str(sub), SAFE + 52, top + 96, 10.5, SOFT)
            line(base, SAFE, top + 142, RIGHT, top + 142, INK, 0.8, 80)
        line(base, SAFE, 740, RIGHT, 740, INK, 1.6, 200)
        plate(base, (SAFE, 770, RIGHT, 900), VIO)
        lat(base, "500", SAFE + 28, 858, 62, P_WHITE, ANTON, anchor="ls",
            tracking=-2)
        para(base, "دج · 30 ثانية · تسليم في 24 ساعة", RIGHT - 28, 790, 600, 22,
             P_WHITE, hi=AURA, floor=14)
        ph(base, "shop-owners.jpg", (SAFE, 930, RIGHT, 1120), duo=0, fy=0.34,
           radius=2)
    foot(base, k, n)
    return base


def fic_end(e, k, n, i):
    base = canvas(PAPER, 5)
    fibers(base, INK, 120, 8)
    fic_grid(base)
    brand_top(base, k, n, style="tag")
    mono(base, "bon de commande", SAFE, 150, 12.5, VIO, track=2.8)
    line(base, SAFE, 170, RIGHT, 170, INK, 1.8, 220)
    yy = title(base, _lines(e), RIGHT, 200, 936, 160, 58, INK, hi=VIO)
    ph(base, e.get("photo", "shop-owners.jpg"), (SAFE, 400, 520, 820), duo=1,
       fy=0.32, radius=2)
    cap = str(e.get("caption", "")).strip()
    if cap:
        para(base, cap, RIGHT, 400, 440, 20, SOFT, hi=VIO, floor=13)
    g = [str(x) for x in e.get("guarantees", [])[:3]]
    for j, it in enumerate(g):
        top = 540 + j * 84
        tickbox(base, SAFE + 520 - 520, top + 4, 13, VIO, True, 1.8) if False else None
        tick(base, RIGHT - 6, top + 2, 8, VIO, 2.4)
        para(base, it, RIGHT - 24, top - 14, 420, 16, INK, hi=VIO, floor=11)
        line(base, RIGHT - 460, top + 56, RIGHT, top + 56, INK, 0.6, 60)
    line(base, SAFE, 860, RIGHT, 860, INK, 1.4, 180)
    plate(base, (SAFE, 890, RIGHT, 1010), DEEP)
    lat(base, "500 DA", SAFE + 26, 976, 58, P_WHITE, ANTON, anchor="ls",
        tracking=-1)
    para(base, "30 ثانية صوت · تسليم 24 سا", RIGHT - 26, 906, 460, 20, P_WHITE,
         hi=AURA, floor=13)
    plate(base, (SAFE, 1040, RIGHT, 1112), AURA)
    lat(base, e.get("cta", "sawtify.space"), SAFE + 300, 1094, 24, INK, MONO,
        anchor="ms", tracking=1)
    mono(base, "commande & paiement en ligne", SAFE + 26, 1140, 10.5, SOFT,
         track=1.6)
    barcode(base, RIGHT - 200, 1140, 176, 44, INK)
    mono(base, "SWT · 2026 · DZ", SAFE, 1176, 10, SOFT, track=2.0)
    foot(base, k, n)
    return base


@direction("fiche")
class Fiche:
    cover = staticmethod(fic_cover)
    body = staticmethod(fic_body)
    list = staticmethod(fic_list)
    end = staticmethod(fic_end)


ORDER.append("fiche")


# ═══════════════════════════════════════════════════════════════════════════
#  7 · TICKET — reçu imprimé, pointillés, code-barres, tampon prix
# ═══════════════════════════════════════════════════════════════════════════
def tic_perf(base, y, color=INK, alpha=150):
    d = ImageDraw.Draw(base)
    x = SAFE - 10
    while x < RIGHT + 10:
        d.line([x * SS, y * SS, (x + 8) * SS, y * SS], fill=(*color, alpha),
               width=max(1, int(1.2 * SS)))
        x += 16


def tic_card(base, box, fill=PAPER, r=10, outline=None):
    plate(base, box, fill, r, outline=outline or (210, 200, 230), ow=1.4)


def tic_cover(s, k, n, i):
    base = canvas(LIL, 6)
    fibers(base, INK, 130, 8)
    stripes(base, (0, 0, W, 96), VIO, 22, 18, 40, 8)
    brand_top(base, k, n, style="tag")
    tic_card(base, (SAFE, 120, RIGHT, BOT - 30))
    mono(base, "sawtify · reçu de service", SAFE + 26, 168, 10.5, SOFT, track=2.2)
    mono(base, f"n° {2600 + i * 7:05d}", RIGHT - 26, 168, 10.5, INK, anchor="rs",
         track=1.4)
    tic_perf(base, 190)
    ph(base, s.get("photo", "studio-voice.jpg"), (SAFE + 26, 214, RIGHT - 26, 660),
       duo=0, fy=0.34, radius=6)
    disp = str(s.get("display", "")).strip()
    if disp:
        plate(base, (SAFE + 26, 586, SAFE + 26 + 230, 686), AURA, 4)
        ds = ar_fit(base, disp, 190, 52, ANTON, 26)
        lat(base, disp, SAFE + 141, 668, ds, INK, ANTON, anchor="ms", tracking=-2)
    tic_perf(base, 700)
    yy = title(base, _lines(s), RIGHT - 26, 720, 880, 200, 62, INK, hi=VIO)
    if s.get("promise"):
        para(base, s["promise"], RIGHT - 26, min(yy + 16, 930), 700, 18, SOFT,
             hi=VIO, floor=12)
    line(base, SAFE + 26, 918, RIGHT - 26, 918, VIO, 0.8, 90)
    mono(base, "offre du jour", SAFE + 26, 946, 10, VIO, track=2.0)
    tic_perf(base, 960)
    for j, (lab, val) in enumerate([("service", "voix darija"), ("durée", "30 s"),
                                    ("prix", "500 da")]):
        top = 980 + j * 40
        mono(base, lab, SAFE + 26, top + 14, 10, SOFT, track=1.8)
        mono(base, val, RIGHT - 26, top + 14, 11, INK, anchor="rs", track=1.2)
        dotted(base, SAFE + 110, RIGHT - 130, top + 14, SOFT, 7, 1.1, 130)
    tic_perf(base, 1112)
    lat(base, "500 DA", SAFE + 26, 1180, 44, INK, ANTON, anchor="ls", tracking=-1)
    barcode(base, RIGHT - 246, 1140, 220, 46, INK)
    mono(base, "sans abonnement · payé une fois", SAFE, 1210, 9.5, SOFT, track=1.6)
    foot(base, k, n, label=s.get("sticker") or "sawtify.space")
    return base


def tic_body(kind, payload, k, n, i):
    base = canvas(LIL, 6)
    brand_top(base, k, n, style="tag")
    tic_card(base, (SAFE, 110, RIGHT, BOT - 40))
    if kind == "item":
        mono(base, f"ligne {k:02d}", SAFE + 24, 152, 10, VIO, track=2.2)
        tic_perf(base, 172)
        para(base, payload, RIGHT - 24, 194, 780, 30, INK, hi=VIO, floor=17,
             leading=1.3)
        ph(base, "script-notebook.jpg", (SAFE + 24, 470, RIGHT - 24, 840), duo=1,
           fy=0.4, radius=6)
        tic_perf(base, 862)
        for j, (lab, val) in enumerate([("quantité", "1 idée"), ("média", "photo + voix"),
                                        ("prix", "0 da de plus")]):
            top = 880 + j * 40
            mono(base, lab, SAFE + 24, top + 14, 10, SOFT, track=1.8)
            mono(base, val, RIGHT - 24, top + 14, 11, INK, anchor="rs", track=1.2)
            dotted(base, SAFE + 100, RIGHT - 160, top + 14, SOFT, 7, 1.1, 120)
        tic_perf(base, 1006)
        lat(base, "TOTAL", SAFE + 24, 1050, 20, SOFT, ANTON, anchor="ls",
            tracking=2)
        para(base, "الفكرة تبيع أكثر من الصورة", RIGHT - 24, 1030, 620, 20, INK,
             hi=VIO, floor=13)
        barcode(base, SAFE + 24, 1090, 300, 42, INK)
    else:
        mono(base, "conclusion du reçu", SAFE + 24, 152, 10, VIO, track=2.2)
        tic_perf(base, 172)
        yy = title(base, _lines(payload), RIGHT - 24, 196, 900, 200, 58, INK,
                   hi=VIO)
        items = [str(x) for x in payload.get("items", [])[:3]]
        y0 = max(yy + 40, 430)
        for j, it in enumerate(items):
            top = y0 + j * 104
            tick(base, SAFE + 34, top + 6, 9, VIO, 2.6)
            para(base, it, RIGHT - 24, top - 8, 800, 21, INK, hi=VIO, floor=13)
            dotted(base, SAFE + 60, RIGHT - 24, top + 62, SOFT, 7, 1.1, 90)
        ph(base, "studio-voice.jpg", (SAFE + 24, 800, RIGHT - 24, 1090), duo=2,
           fy=0.34, radius=6)
        mono(base, "merci · شكرا", SAFE + 24, 1140, 11, SOFT, track=2.0)
    foot(base, k, n)
    return base


def tic_list(kind, payload, k, n, i):
    base = canvas(LIL, 6)
    brand_top(base, k, n, style="tag")
    tic_card(base, (SAFE, 100, RIGHT, BOT - 40))
    if kind == "steps":
        mono(base, "ticket de commande", SAFE + 24, 142, 10.5, VIO, track=2.2)
        lat(base, "3 LIGNES", RIGHT - 24, 148, 16, INK, ANTON, anchor="rs",
            tracking=2)
        tic_perf(base, 166)
        steps = _steps(payload)[:3]
        for j, st in enumerate(steps):
            num, lab, sub = (list(st) + ["", "", ""])[:3]
            top = 184 + j * 180
            mono(base, f"{num} · ligne {j + 1}", SAFE + 24, top, 10, SOFT,
                 track=1.8)
            para(base, lab, RIGHT - 24, top - 8, 700, 26, INK, hi=VIO, floor=15)
            if sub:
                para(base, sub, RIGHT - 24, top + 56, 620, 16, SOFT, hi=SOFT,
                     floor=11)
            mono(base, "✓", SAFE + 24, top + 72, 14, VIO, anchor="ls", track=0)
            tic_perf(base, top + 128)
        plate(base, (SAFE + 24, 760, RIGHT - 24, 830), INK)
        mono(base, "total", SAFE + 44, 800, 11, LIL, track=2.2)
        lat(base, "500 DA", RIGHT - 44, 810, 26, P_WHITE, ANTON, anchor="rs",
            tracking=0)
        ph(base, "phone-hand.jpg", (SAFE + 24, 856, RIGHT - 24, 1090), duo=0,
           fy=0.4, radius=6)
        mono(base, "enregistré au téléphone", SAFE + 24, 1130, 10, SOFT,
             track=1.8)
    elif kind == "step":
        st, idx, tot = payload
        num, lab, sub = (list(st) + ["", "", ""])[:3]
        mono(base, f"étape {idx + 1:02d} / {tot:02d}", SAFE + 24, 142, 10.5, VIO,
             track=2.2)
        tic_perf(base, 166)
        lat(base, str(num), SAFE + 24, 330, 110, VIO, ANTON, anchor="ls",
            tracking=-5)
        title(base, [str(lab)], RIGHT - 24, 210, 560, 170, 52, INK, hi=VIO)
        if sub:
            para(base, sub, RIGHT - 24, 380, 560, 19, SOFT, hi=VIO, floor=13)
        ph(base, "studio-voice.jpg", (SAFE + 24, 470, RIGHT - 24, 940), duo=(k % 3),
           fy=0.34, radius=6)
        tic_perf(base, 962)
        for j, (lab_, val) in enumerate([("micro", "aucun"), ("temps", "30 s"),
                                         ("retouches", "1 offerte")]):
            mono(base, lab_, SAFE + 24 + j * 290, 1000, 9.5, SOFT, track=1.8)
            mono(base, val, SAFE + 24 + j * 290, 1024, 13, INK, track=1.0)
        plate(base, (SAFE + 24, 1060, RIGHT - 24, 1120), AURA, 4)
        mono(base, "sawtify.space · paiement en ligne", SAFE + 44, 1098, 11, INK,
             track=1.6)
    else:
        mono(base, "récap · ticket de caisse", SAFE + 24, 142, 10.5, VIO, track=2.2)
        tic_perf(base, 166)
        due = _steps(payload)[:3]
        for j, st in enumerate(due):
            num, lab, sub = (list(st) + ["", "", ""])[:3]
            top = 190 + j * 132
            mono(base, str(sub), SAFE + 24, top + 8, 10, SOFT, track=1.6)
            para(base, lab, RIGHT - 24, top - 6, 700, 23, INK, hi=VIO, floor=14)
            mono(base, "✓", RIGHT - 4, top + 8, 13, VIO, anchor="rs") if False else None
            tic_perf(base, top + 92)
        plate(base, (SAFE + 24, 610, RIGHT - 24, 760), DEEP)
        mono(base, "montant total", SAFE + 48, 650, 10.5, LIL, track=2.2)
        lat(base, "500", SAFE + 48, 738, 70, P_WHITE, ANTON, anchor="ls",
            tracking=-2)
        para(base, "دج", SAFE + 210, 660, 90, 34, P_WHITE, hi=AURA, floor=18)
        para(base, "30 ثانية · تسليم 24 سا · بلا التزام", RIGHT - 48, 660, 420,
             19, LIL, hi=AURA, floor=12)
        ph(base, "shop-owners.jpg", (SAFE + 24, 786, RIGHT - 24, 1080), duo=1,
           fy=0.32, radius=6)
        barcode(base, SAFE + 24, 1100, 260, 38, INK)
        mono(base, "SWT · DZ · 2026", RIGHT - 24, 1122, 10, SOFT, anchor="rs",
             track=1.8)
    foot(base, k, n)
    return base


def tic_end(e, k, n, i):
    base = canvas(LIL, 6)
    brand_top(base, k, n, style="tag")
    tic_card(base, (SAFE, 100, RIGHT, BOT - 40))
    mono(base, "reçu final · merci", SAFE + 24, 142, 10.5, VIO, track=2.4)
    tic_perf(base, 166)
    yy = title(base, _lines(e), RIGHT - 24, 190, 900, 180, 56, INK, hi=VIO)
    ph(base, e.get("photo", "shop-owners.jpg"), (SAFE + 24, 400, 540, 760), duo=1,
       fy=0.32, radius=6)
    cap = str(e.get("caption", "")).strip()
    if cap:
        para(base, cap, RIGHT - 24, 400, 420, 19, SOFT, hi=VIO, floor=12)
    g = [str(x) for x in e.get("guarantees", [])[:3]]
    for j, it in enumerate(g):
        top = 520 + j * 86
        tick(base, RIGHT - 30, top + 4, 8, VIO, 2.4)
        para(base, it, RIGHT - 50, top - 12, 420, 16, INK, hi=VIO, floor=11)
        dotted(base, RIGHT - 480, RIGHT - 56, top + 44, SOFT, 7, 1.1, 90)
    tic_perf(base, 800)
    plate(base, (SAFE + 24, 830, RIGHT - 24, 960), DEEP)
    lat(base, "500 DA", SAFE + 48, 936, 56, P_WHITE, ANTON, anchor="ls",
        tracking=-1)
    para(base, "30 ثانية صوت · تسليم 24 سا", RIGHT - 48, 856, 480, 20, P_WHITE,
         hi=AURA, floor=13)
    plate(base, (SAFE + 24, 990, RIGHT - 24, 1060), AURA, 4)
    lat(base, e.get("cta", "sawtify.space"), W / 2, 1040, 24, INK, MONO,
        anchor="ms", tracking=1)
    barcode(base, SAFE + 24, 1090, 300, 44, INK)
    mono(base, "paiement en ligne · livraison 24 h", RIGHT - 24, 1112, 10, SOFT,
         anchor="rs", track=1.6)
    foot(base, k, n)
    return base


@direction("ticket")
class Ticket:
    cover = staticmethod(tic_cover)
    body = staticmethod(tic_body)
    list = staticmethod(tic_list)
    end = staticmethod(tic_end)


ORDER.append("ticket")


# ═══════════════════════════════════════════════════════════════════════════
#  8 · FRISE — bande chronologique, jalons, gros chiffres
# ═══════════════════════════════════════════════════════════════════════════
def fri_rail(base, x, y0, y1, color=VIO, alpha=70):
    line(base, x, y0, x, y1, color, 2.0, alpha)


def fri_cover(s, k, n, i):
    base = canvas(PAPER, 7)
    fibers(base, INK, 150, 10)
    brand_top(base, k, n, style="stack")
    mono(base, "la frise · novembre 2026", SAFE, 150, 11.5, VIO, track=2.6)
    ph(base, s.get("photo", "mic-hero.jpg"), (0, 176, W, 700), duo=1, fy=0.3)
    rect(base, (0, 700, W, 706), INK)
    disp = str(s.get("display", "")).strip()
    if disp:
        lat(base, disp, SAFE, 760, 92, VIO, ANTON, anchor="ls", tracking=-4)
        mono(base, "chiffre clé", SAFE, 800, 10.5, SOFT, track=2.4)
    yy = title(base, _lines(s), RIGHT, 720, 780, 190, 62, INK, hi=VIO)
    # rail du jour
    fri_rail(base, SAFE + 8, 960, 1160)
    for j in range(3):
        cy = 980 + j * 60
        disc(base, SAFE + 8, cy, 5, VIO if j == 0 else SOFT)
        mono(base, f"J{1 + j:02d}", SAFE + 30, cy + 6, 10, SOFT, track=1.4)
    if s.get("promise"):
        para(base, s["promise"], RIGHT, 940, 700, 18, SOFT, hi=VIO, floor=12)
    para(base, "30 ثانية · دارجة · 500 دج", RIGHT, 1188, 500, 16, VIO, hi=VIO,
         floor=11)
    foot(base, k, n, label=s.get("sticker") or "sawtify.space")
    return base


def fri_body(kind, payload, k, n, i):
    base = canvas(PAPER, 7)
    fibers(base, INK, 140, 9)
    brand_top(base, k, n, style="stack")
    if kind == "item":
        fri_rail(base, SAFE + 8, 140, 1150)
        disc(base, SAFE + 8, 160, 7, AURA)
        mono(base, "jalon", SAFE + 28, 165, 10, SOFT, track=2.2)
        para(base, payload, RIGHT, 200, 820, 32, INK, hi=VIO, floor=18,
             leading=1.28)
        ph(base, "script-notebook.jpg", (SAFE + 28, 470, RIGHT, 860), duo=0,
           fy=0.4)
        disc(base, SAFE + 8, 900, 5, SOFT)
        mono(base, "à retenir", SAFE + 28, 905, 10, SOFT, track=2.2)
        para(base, _PT["mini"], RIGHT, 940, 780, 22, INK, hi=VIO, floor=14)
        mono(base, "sawtify · la frise darija", SAFE + 28, 1120, 10, SOFT,
             track=1.8)
    else:
        fri_rail(base, SAFE + 8, 140, 1150)
        disc(base, SAFE + 8, 160, 7, AURA)
        mono(base, "le constat", SAFE + 28, 165, 10.5, VIO, track=2.4)
        yy = title(base, _lines(payload), RIGHT, 190, 800, 210, 58, INK, hi=VIO)
        items = [str(x) for x in payload.get("items", [])[:3]]
        y0 = max(yy + 40, 460)
        for j, it in enumerate(items):
            top = y0 + j * 150
            disc(base, SAFE + 8, top + 12, 5, VIO)
            mono(base, f"0{j + 1}", SAFE + 30, top + 18, 11, VIO, track=1.2)
            para(base, it, RIGHT, top, 780, 24, INK, hi=VIO, floor=14)
            line(base, SAFE + 30, top + 100, RIGHT, top + 100, INK, 0.8, 70)
        ph(base, payload.get("photo", "man-studio.jpg"), (0, 980, W, 1150),
           duo=(k % 3), fy=0.3)
    foot(base, k, n)
    return base


def fri_list(kind, payload, k, n, i):
    base = canvas(PAPER, 7)
    fibers(base, INK, 140, 9)
    brand_top(base, k, n, style="stack")
    if kind == "steps":
        mono(base, "la frise en trois temps", SAFE, 150, 11.5, VIO, track=2.6)
        steps = _steps(payload)[:3]
        fri_rail(base, 190, 210, 1080, VIO, 90)
        for j, st in enumerate(steps):
            num, lab, sub = (list(st) + ["", "", ""])[:3]
            top = 240 + j * 280
            ring(base, 190, top + 30, 26, AURA, 2.4)
            lat(base, str(num), 190, top + 42, 22, INK, ANTON, anchor="ms",
                tracking=0)
            para(base, lab, RIGHT, top, 720, 30, INK, hi=VIO, floor=16)
            if sub:
                para(base, sub, RIGHT, top + 74, 660, 17, SOFT, hi=SOFT, floor=12)
            line(base, 240, top + 130, RIGHT, top + 130, INK, 0.8, 70)
        ph(base, "phone-hand.jpg", (240, 1010, RIGHT, 1150), duo=2, fy=0.42)
    elif kind == "step":
        st, idx, tot = payload
        num, lab, sub = (list(st) + ["", "", ""])[:3]
        mono(base, f"temps {idx + 1:02d} / {tot:02d}", SAFE, 150, 11.5, VIO,
             track=2.6)
        fri_rail(base, SAFE + 8, 176, 1150)
        disc(base, SAFE + 8, 196, 7, AURA)
        lat(base, str(num), SAFE + 40, 330, 130, VIO, ANTON, anchor="ls",
            tracking=-6)
        title(base, [str(lab)], RIGHT, 200, 700, 180, 54, INK, hi=VIO)
        if sub:
            para(base, sub, RIGHT, 400, 640, 20, SOFT, hi=VIO, floor=13)
        ph(base, "studio-voice.jpg", (SAFE + 40, 490, RIGHT, 900), duo=(k % 3),
           fy=0.34)
        disc(base, SAFE + 8, 950, 5, SOFT)
        mono(base, "détail", SAFE + 40, 954, 10, SOFT, track=2.0)
        para(base, "سجّل مرة وحدة. الصوت يبقى هو.", RIGHT, 990, 780, 22, INK,
             hi=VIO, floor=14)
        mono(base, "30 ثانية · تسليم 24 سا", SAFE + 40, 1120, 10.5, VIO,
             track=2.0)
    else:
        mono(base, "récap de la frise", SAFE, 150, 11.5, VIO, track=2.4)
        due = _steps(payload)[:3]
        fri_rail(base, 190, 210, 760, VIO, 80)
        for j, st in enumerate(due):
            num, lab, sub = (list(st) + ["", "", ""])[:3]
            top = 220 + j * 180
            disc(base, 190, top + 16, 6, VIO if j else AURA)
            para(base, lab, RIGHT, top, 740, 26, INK, hi=VIO, floor=15)
            mono(base, sub, 230, top + 78, 10.5, SOFT)
        rect(base, (SAFE, 800, RIGHT, 960), VIO)
        lat(base, "500", SAFE + 28, 930, 76, P_WHITE, ANTON, anchor="ls",
            tracking=-3)
        para(base, "دج · 30 ثانية صوت · تسليم 24 سا", RIGHT - 28, 840, 560, 22,
             P_WHITE, hi=AURA, floor=14)
        mono(base, "sans abonnement · sans engagement", SAFE + 28, 1000, 11, LIL)
        ph(base, "shop-owners.jpg", (SAFE, 980, RIGHT, 1150), duo=0, fy=0.32)
    foot(base, k, n)
    return base


def fri_end(e, k, n, i):
    base = canvas(PAPER, 7)
    fibers(base, INK, 140, 9)
    brand_top(base, k, n, style="stack")
    ph(base, e.get("photo", "shop-owners.jpg"), (0, 140, W, 620), duo=1, fy=0.3)
    rect(base, (0, 620, W, 626), INK)
    yy = title(base, _lines(e), RIGHT, 650, 900, 190, 58, INK, hi=VIO)
    cap = str(e.get("caption", "")).strip()
    ycur = yy
    if cap:
        ycur = para(base, cap, RIGHT, yy + 18, 660, 19, SOFT, hi=VIO, floor=12)
    g = [str(x) for x in e.get("guarantees", [])[:3]]
    fri_rail(base, SAFE + 8, 900, 1120)
    for j, it in enumerate(g):
        top = 910 + j * 70
        disc(base, SAFE + 8, top + 10, 4.5, AURA if j == 0 else SOFT)
        para(base, it, RIGHT, top - 6, 720, 17, INK, hi=VIO, floor=11)
    plate(base, (SAFE, 1140, SAFE + 360, 1210), AURA, 0)
    lat(base, e.get("cta", "sawtify.space"), SAFE + 180, 1192, 22, INK, MONO,
        anchor="ms", tracking=0.5)
    mono(base, "commande & paiement en ligne", SAFE + 380, 1192, 10.5, SOFT,
         track=1.6)
    foot(base, k, n)
    return base


@direction("frise")
class Frise:
    cover = staticmethod(fri_cover)
    body = staticmethod(fri_body)
    list = staticmethod(fri_list)
    end = staticmethod(fri_end)


ORDER.append("frise")


# ═══════════════════════════════════════════════════════════════════════════
#  9 · MANIFESTE — typographie géante, mots empilés, aucune photo au texte
# ═══════════════════════════════════════════════════════════════════════════
def man_stack(base, lines, xr, y, max_w, size, color, hi=AURA, max_h=520,
              leading=1.02):
    """Mots empilés un par ligne, taille qui descend jusqu'à tenir."""
    s = size
    while s > 30:
        tot = 0
        for ln in lines:
            tot += min(s, ar_fit(base, ln, max_w, s, CAIRO_B)) * leading
        if tot <= max_h:
            break
        s -= 3
    yy = y
    for ln in lines:
        s2 = min(s, ar_fit(base, ln, max_w, s, CAIRO_B))
        yy = ar(base, ln, xr, yy, s2, color, CAIRO_B, max_w=max_w,
                leading=leading, hi_color=hi)
    return yy


def man_num(base, txt, x, y, size, color, alpha=26):
    big_num_outline(base, str(txt), x, y, size, color, width=2.2, alpha=alpha)


def man_cover(s, k, n, i):
    base = canvas(INK, 12)
    rect(base, (0, 0, W, 8), AURA)
    brand_top(base, k, n, dark=True, style="edge")
    disp = str(s.get("display", "")).strip()
    if disp:
        ds = ar_fit(base, disp, 700, 150, ANTON, 60)
        lat(base, disp, SAFE, 300, ds, P_WHITE, ANTON, anchor="ls", tracking=-7)
        mono(base, "chiffre clé · marché dz", SAFE, 356, 11, AURA, track=2.8)
    lines = _lines(s)
    yy = man_stack(base, lines, RIGHT, 420, 900, 84, P_WHITE, hi=AURA, max_h=460)
    plate(base, (SAFE, min(yy + 30, 1000), SAFE + 8, min(yy + 180, 1150)), AURA, 0)
    if s.get("promise"):
        para(base, s["promise"], RIGHT, min(yy + 26, 1000), 800, 20, LIL, hi=AURA,
             floor=13)
    ph(base, s.get("photo", "studio-voice.jpg"), (SAFE, 1064, RIGHT, BOT - 34),
       duo=1, fy=0.34, radius=0)
    foot(base, k, n, dark=True, label=s.get("sticker") or "sawtify.space",
         dots=False)
    return base


def man_body(kind, payload, k, n, i):
    dark = k % 2 == 0
    base = canvas(INK if dark else PAPER, 12)
    ink = P_WHITE if dark else INK
    brand_top(base, k, n, dark=dark, style="edge")
    man_num(base, f"{k:02d}", SAFE, 700, 420, AURA if dark else VIO, 30)
    if kind == "item":
        para(base, payload, RIGHT, 200, 860, 40, ink, hi=AURA if dark else VIO,
             floor=20, leading=1.26)
        line(base, SAFE, 700, RIGHT, 700, ink, 1.0, 80)
        ph(base, "script-notebook.jpg", (SAFE, 740, RIGHT, 1120), duo=(k % 3),
           fy=0.4, radius=0)
        mono(base, "un manifeste par slide", SAFE, 1160, 10.5,
             LIL if dark else SOFT, track=2.2)
    else:
        lines = _lines(payload)
        yy = man_stack(base, lines, RIGHT, 180, 900, 78, ink,
                       hi=AURA if dark else VIO, max_h=420)
        items = [str(x) for x in payload.get("items", [])[:3]]
        y0 = max(yy + 50, 640)
        for j, it in enumerate(items):
            top = y0 + j * 118
            lat(base, f"0{j + 1}", SAFE, top + 26, 22, AURA if dark else VIO,
                ANTON, anchor="ls", tracking=1)
            para(base, it, RIGHT, top, 820, 22, ink, hi=AURA if dark else VIO,
                 floor=14)
            line(base, SAFE, top + 84, RIGHT, top + 84, ink, 0.8, 60)
    foot(base, k, n, dark=dark, dots=False)
    return base


def man_list(kind, payload, k, n, i):
    base = canvas(DEEP, 12)
    brand_top(base, k, n, dark=True, style="edge")
    if kind == "steps":
        man_stack(base, ["الخطوات", "الثلاثة"], RIGHT, 150, 900, 88, P_WHITE,
                  hi=AURA, max_h=300)
        steps = _steps(payload)[:3]
        for j, st in enumerate(steps):
            num, lab, sub = (list(st) + ["", "", ""])[:3]
            top = 470 + j * 240
            line(base, SAFE, top, RIGHT, top, P_WHITE, 1.0, 90)
            lat(base, f"0{j + 1}", SAFE, top + 90, 84, AURA, ANTON, anchor="ls",
                tracking=-4)
            para(base, lab, RIGHT, top + 26, 720, 32, P_WHITE, hi=AURA, floor=16)
            if sub:
                para(base, sub, RIGHT, top + 110, 660, 17, LIL, hi=LIL, floor=12)
    elif kind == "step":
        st, idx, tot = payload
        num, lab, sub = (list(st) + ["", "", ""])[:3]
        mono(base, f"{idx + 1:02d} / {tot:02d}", RIGHT, 150, 11.5, AURA,
             anchor="rs", track=2.6)
        man_stack(base, [str(lab)], RIGHT, 190, 900, 100, P_WHITE, hi=AURA,
                  max_h=340)
        if sub:
            para(base, sub, RIGHT, 560, 700, 24, LIL, hi=AURA, floor=14)
        ph(base, "studio-voice.jpg", (SAFE, 700, RIGHT, 1100), duo=(k % 3),
           fy=0.32, radius=0)
        mono(base, "sawtify · darija · 30 s", SAFE, 1140, 10.5, LIL, track=2.2)
    else:
        man_stack(base, ["خلاصة", "المانيفستو"], RIGHT, 150, 880, 80, P_WHITE,
                  hi=AURA, max_h=280)
        due = _steps(payload)[:3]
        for j, st in enumerate(due):
            num, lab, sub = (list(st) + ["", "", ""])[:3]
            top = 470 + j * 150
            para(base, lab, RIGHT, top, 780, 28, P_WHITE, hi=AURA, floor=15)
            mono(base, sub, SAFE, top + 24, 10.5, LIL)
            line(base, SAFE, top + 96, RIGHT, top + 96, P_WHITE, 0.8, 70)
        plate(base, (SAFE, 960, SAFE + 440, 1080), AURA, 0)
        lat(base, "500 DA", SAFE + 28, 1050, 48, INK, ANTON, anchor="ls",
            tracking=-1)
        mono(base, "sans abonnement · livré en 24 h", SAFE + 28, 1000, 10, INK,
             track=1.6)
        para(base, "30 ثانية · دارجة · تسليم 24 سا", RIGHT, 1000, 520, 18, LIL,
             hi=AURA, floor=12)
    foot(base, k, n, dark=True, dots=False)
    return base


def man_end(e, k, n, i):
    base = canvas(INK, 12)
    rect(base, (0, 0, W, 8), AURA)
    brand_top(base, k, n, dark=True, style="edge")
    ph(base, e.get("photo", "studio-voice.jpg"), (0, 120, W, 560), duo=1, fy=0.3)
    man_stack(base, _lines(e), RIGHT, 620, 900, 76, P_WHITE, hi=AURA, max_h=260)
    cap = str(e.get("caption", "")).strip()
    y = 900
    if cap:
        y = para(base, cap, RIGHT, 900, 760, 20, LIL, hi=AURA, floor=13)
    g = [str(x) for x in e.get("guarantees", [])[:3]]
    for j, it in enumerate(g):
        para(base, it, RIGHT, 990 + j * 52, 760, 16, LIL, hi=AURA, floor=11)
    lit = e.get("cta", "sawtify.space")
    lat(base, lit, SAFE, 1180, 40, P_WHITE, ANTON, anchor="ls", tracking=-1)
    line(base, SAFE, 1200, RIGHT, 1200, AURA, 3)
    mono(base, "commande & paiement en ligne", SAFE, 1240, 10.5, LIL, track=2.0)
    foot(base, k, n, dark=True, dots=False)
    return base


@direction("manifeste")
class Manifeste:
    cover = staticmethod(man_cover)
    body = staticmethod(man_body)
    list = staticmethod(man_list)
    end = staticmethod(man_end)


ORDER.append("manifeste")


# ═══════════════════════════════════════════════════════════════════════════
# 10 · GÉOMÉTRIE — formes franches, cercles, grille, aucune texture
# ═══════════════════════════════════════════════════════════════════════════
def geo_cover(s, k, n, i):
    base = canvas(P_WHITE, 0)
    disc(base, W - 150, 232, 268, LIL)
    disc(base, W - 150, 232, 208, VIO)
    brand_top(base, k, n, style="center")
    mono(base, "géométrie · novembre 2026", SAFE, 150, 11, VIO, track=2.6)
    disp = str(s.get("display", "")).strip()
    if disp:
        ds = ar_fit(base, disp, 240, 60, ANTON, 26)
        lat(base, disp, W - 150, 256, ds, P_WHITE, ANTON, anchor="ms",
            tracking=-2)
    ph(base, s.get("photo", "studio-voice.jpg"), (0, 470, 700, 1060), duo=1,
       fy=0.34)
    rect(base, (0, 1060, 700, 1066), INK)
    yy = title(base, _lines(s), RIGHT, 520, 420, 470, 54, INK, hi=VIO,
               leading=1.06)
    if s.get("promise"):
        para(base, s["promise"], RIGHT, min(yy + 22, 1130), 400, 17, SOFT, hi=VIO,
             floor=12)
    disc(base, 60, 1160, 46, AURA)
    lat(base, "→", 60, 1178, 30, INK, MONO, anchor="ms", tracking=0)
    mono(base, "voir la suite", 128, 1168, 10.5, INK, track=1.8)
    foot(base, k, n, label=s.get("sticker") or "sawtify.space", style="thick")
    return base


def geo_body(kind, payload, k, n, i):
    dark = k % 3 == 1
    base = canvas(VIO if dark else P_WHITE, 0)
    brand_top(base, k, n, dark=dark, style="center")
    ink = P_WHITE if dark else INK
    if kind == "item":
        disc(base, W - 190, 420, 190, LIL if dark else LIL)
        disc(base, W - 190, 420, 130, AURA)
        lat(base, f"{k:02d}", W - 190, 456, 54, INK, ANTON, anchor="ms",
            tracking=-2)
        para(base, payload, RIGHT - 360, 230, 420, 32, ink,
             hi=AURA if dark else VIO, floor=18, leading=1.28)
        ph(base, "script-notebook.jpg", (SAFE, 560, RIGHT, 1000), duo=(k % 3),
           fy=0.4)
        rect(base, (SAFE, 1010, RIGHT, 1018), AURA)
        mono(base, "grille · 12 colonnes", SAFE, 1060, 10.5,
             LIL if dark else SOFT, track=2.2)
    else:
        lines = _lines(payload)
        items = [str(x) for x in payload.get("items", [])[:3]]
        yy = title(base, lines, RIGHT, 170, 900, 260, 64, ink,
                   hi=AURA if dark else VIO, leading=1.04)
        y0 = max(yy + 46, 560)
        for j, it in enumerate(items):
            top = y0 + j * 150
            rect(base, (SAFE, top, SAFE + 104, top + 104), LIL if dark else DEEP)
            lat(base, f"{j + 1}", SAFE + 52, top + 82, 46, P_WHITE, ANTON,
                anchor="ms", tracking=-1)
            para(base, it, RIGHT, top + 12, 760, 24, ink,
                 hi=AURA if dark else VIO, floor=14)
        ph(base, "phone-hand.jpg", (SAFE, 1040, RIGHT, 1150), duo=2, fy=0.45)
    foot(base, k, n, dark=dark, style="thick")
    return base


def geo_list(kind, payload, k, n, i):
    base = canvas(P_WHITE, 0)
    brand_top(base, k, n, style="center")
    if kind == "steps":
        rect(base, (0, 130, W, 210), DEEP)
        lat(base, "3 FORMES · 3 GESTES", SAFE, 186, 24, P_WHITE, ANTON,
            anchor="ls", tracking=3)
        steps = _steps(payload)[:3]
        for j, st in enumerate(steps):
            num, lab, sub = (list(st) + ["", "", ""])[:3]
            top = 240 + j * 300
            if j == 0:
                disc(base, SAFE + 70, top + 70, 58, AURA)
            elif j == 1:
                rect(base, (SAFE + 12, top + 12, SAFE + 128, top + 128), VIO)
            else:
                ring(base, SAFE + 70, top + 70, 58, VIO, 3.0)
            lat(base, str(num), SAFE + 70, top + 90, 40,
                INK if j != 1 else P_WHITE, ANTON, anchor="ms", tracking=-1)
            para(base, lab, RIGHT, top + 20, 700, 32, INK, hi=VIO, floor=16)
            if sub:
                para(base, sub, RIGHT, top + 112, 620, 17, SOFT, hi=SOFT, floor=12)
            line(base, SAFE, top + 220, RIGHT, top + 220, INK, 1.0, 80)
    elif kind == "step":
        st, idx, tot = payload
        num, lab, sub = (list(st) + ["", "", ""])[:3]
        disc(base, SAFE + 90, 320, 90, VIO)
        lat(base, str(num), SAFE + 90, 356, 62, P_WHITE, ANTON, anchor="ms",
            tracking=-2)
        title(base, [str(lab)], RIGHT, 220, 620, 220, 58, INK, hi=VIO)
        if sub:
            para(base, sub, RIGHT, 460, 580, 21, SOFT, hi=VIO, floor=13)
        ph(base, "studio-voice.jpg", (0, 560, W - 180, 980), duo=(k % 3), fy=0.34)
        disc(base, W - 150, 900, 70, AURA)
        lat(base, f"{idx + 1}/{tot}", W - 150, 922, 26, INK, ANTON, anchor="ms",
            tracking=-1)
        rect(base, (SAFE, 1010, RIGHT, 1080), LIL)
        mono(base, "enregistrement unique · 30 secondes", SAFE + 24, 1056, 11,
             DEEP, track=1.8)
        mono(base, "sans abonnement · 500 da", SAFE, 1130, 11, SOFT, track=1.8)
    else:
        disc(base, W - 210, 300, 150, VIO)
        disc(base, W - 210, 300, 110, AURA)
        mono(base, "récap", SAFE, 170, 12, VIO, track=2.8)
        para(base, _PT.get("titre", "الخلاصة"), RIGHT - 300, 210, 420, 30, INK,
             hi=VIO, floor=16)
        due = _steps(payload)[:3]
        for j, st in enumerate(due):
            num, lab, sub = (list(st) + ["", "", ""])[:3]
            top = 500 + j * 150
            ring(base, SAFE + 40, top + 40, 34, VIO, 2.4)
            lat(base, f"0{j + 1}", SAFE + 40, top + 52, 22, INK, ANTON,
                anchor="ms", tracking=0)
            para(base, lab, RIGHT, top + 4, 720, 26, INK, hi=VIO, floor=15)
            mono(base, sub, SAFE + 90, top + 96, 10.5, SOFT)
        rect(base, (SAFE, 980, RIGHT, 1110), DEEP)
        lat(base, "500 DA", SAFE + 30, 1076, 56, P_WHITE, ANTON, anchor="ls",
            tracking=-2)
        para(base, "30 ثانية صوت · تسليم 24 سا", RIGHT - 30, 1000, 520, 20,
             P_WHITE, hi=AURA, floor=13)
    foot(base, k, n, style="thick")
    return base


def geo_end(e, k, n, i):
    base = canvas(P_WHITE, 0)
    disc(base, W / 2, 980, 520, LIL)
    brand_top(base, k, n, style="center")
    ph(base, e.get("photo", "shop-owners.jpg"), (0, 120, W, 620), duo=0, fy=0.3)
    rect(base, (0, 620, W, 626), INK)
    yy = title(base, _lines(e), RIGHT, 660, 900, 190, 58, INK, hi=VIO)
    cap = str(e.get("caption", "")).strip()
    ycur = yy
    if cap:
        ycur = para(base, cap, RIGHT, yy + 16, 700, 19, SOFT, hi=VIO, floor=12)
    g = [str(x) for x in e.get("guarantees", [])[:3]]
    for j, it in enumerate(g):
        top = max(ycur + 30, 900) + j * 56
        disc(base, SAFE + 8, top - 4, 5, VIO)
        para(base, it, RIGHT, top - 18, 720, 16, INK, hi=VIO, floor=11)
    plate(base, (SAFE, 1150, SAFE + 400, 1226), AURA, 30)
    lat(base, e.get("cta", "sawtify.space"), SAFE + 200, 1206, 22, INK, MONO,
        anchor="ms", tracking=0.5)
    mono(base, "commande & paiement en ligne", SAFE + 420, 1206, 10.5, SOFT,
         track=1.6)
    foot(base, k, n, style="thick")
    return base


@direction("geometrie")
class Geometrie:
    cover = staticmethod(geo_cover)
    body = staticmethod(geo_body)
    list = staticmethod(geo_list)
    end = staticmethod(geo_end)


ORDER.append("geometrie")
