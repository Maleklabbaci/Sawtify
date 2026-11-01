#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════
 hooks_cover.py — 4 couvertures « hook » : l'accroche avant le décor
───────────────────────────────────────────────────────────────────────────
 Règles communes (marketing, pas décoration) :
   • UNE idée par couverture, 2 lignes de 4 mots max → lisible en vignette
   • UN chiffre qui arrête le pouce (jamais décoratif)
   • UN seul mot en orange (le mot qui fait mal / qui intrigue)
   • une promesse concrète sous l'accroche (preuve ou mode d'emploi)
   • un lecteur audio discret : on montre le produit, pas un décor
   • charge visuelle basse : max 2 textures, jamais de cadre sur cadre

 Les 4 mises en page (rotation jour par jour : numeral → statement →
 hookticket → hooksplit) :
   numeral    chiffre géant en socle, accroche en haut
   statement  plein cadre centré, autocollant chiffre (le plus « arrêt »)
   hookticket ticket crème plein cadre, contraste maximal
   hooksplit  accroche sur fond sombre + bloc crème (chiffre + garanties)
═══════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

from PIL import Image, ImageDraw, ImageFilter

import sawtify_ig as ig
import premium as px
import premium_fx as fx
from sawtify_ig import (AR_BOLD, AR_REG, AR_SEMI, LATIN_BOLD, LATIN_MED,
                        M, SS, W, ar_para, font, rrect, visual)

R = W - M
H_BOT = 1350
HI = (255, 178, 120)          # orange lisible sur violet
VIOLET = (124, 45, 200)
CREAM = (250, 246, 238)
INK = (26, 15, 46)
ORANGE = (255, 100, 44)


# ── helpers ────────────────────────────────────────────────────────────────
def ar_text(base, text, size, color, y, max_w=None, align="right", leading=1.32,
            x_right=None, hi_color=None, font_name=AR_BOLD):
    """Même contrat que generate_premium.ar_text (copie locale, pas d'import croisé)."""
    xr = R if x_right is None else x_right
    return ar_para(base, xr, y, text, size, font_name, color,
                   max_w=max_w or (W - 2 * M), align=align, leading=leading,
                   hi_color=hi_color or VIOLET)


def _hk(s):
    h = s.get("hook") or {}
    lines = h.get("lines") or [s.get("title", "")]
    return (h.get("kicker") or s.get("chip", "Sawtify"), h.get("num", ""),
            h.get("num_label", ""), lines, h.get("promise") or s.get("sub", ""))


def _fit_ar(base, text, max_w, size, font_name=AR_BOLD):
    """Réduit la taille d'une ligne arabe jusqu'à ce qu'elle tienne en une seule ligne."""
    d = ImageDraw.Draw(base)
    plain = text.replace("**", "")
    while size > 34 and d.textlength(visual(plain), font=font(font_name, size)) / SS > max_w:
        size -= 2
    return size


def _lines(base, lines, y, size, max_w, align="right", x_right=None,
           color=(255, 255, 255), leading=1.16):
    """Trace les lignes de l'accroche : jamais de retour à la ligne involontaire
    (chaque ligne est ajustée pour tenir en entier), sinon la vignette casse."""
    xr = R if x_right is None else x_right
    cy = y
    for ln in lines:
        sz = _fit_ar(base, ln, max_w, size)
        cy = ar_text(base, ln, sz, color, cy, max_w=max_w, align=align,
                     x_right=xr, leading=leading, hi_color=HI)
        cy += sz * 0.30
    return cy


def _promise(base, text, y, size=27, color=(232, 222, 250), align="right",
             max_w=None, x_right=None):
    mw = max_w or (W - 2 * M)
    return ar_text(base, text, size, color, y, max_w=mw, align=align,
                   x_right=R if x_right is None else x_right,
                   font_name=AR_REG, leading=1.55)


def _fit(base, text, max_w, size, font_name=LATIN_BOLD):
    d = ImageDraw.Draw(base)
    while size > 40 and d.textlength(text, font=font(font_name, size)) / SS > max_w:
        size -= 4
    return size


def _kicker(base, text, y=172, size=18, center=False, color=(255, 255, 255)):
    x_right = (W / 2 + 190) if center else R
    px.badge(base, x_right, y, text, size=size, fill=(255, 255, 255, 30),
             line=(255, 255, 255, 80), color=color, dot_color=HI)


def _reader(base, x0, y0, w, h=92, label="نموذج صوت · دارجة", seed=3, dark=False):
    """Mini lecteur : pastille play + forme d'onde + libellé."""
    fill = (255, 255, 255, 26) if dark else (240, 234, 250)
    line = (255, 255, 255, 74) if dark else (212, 198, 236)
    txt = (255, 255, 255) if dark else (74, 22, 130)
    rrect(base, (x0, y0, x0 + w, y0 + h), 26, fill=fill, outline=line, width=1.2)
    x1 = x0 + w
    ig.play_badge(base, x1 - 52, y0 + h / 2, 21)
    ImageDraw.Draw(base).text(((x1 - 96) * SS, (y0 + 30) * SS), visual(label),
                              font=font(AR_SEMI, 19), fill=txt, anchor="rm")
    ig.waveform(base, x0 + 26, y0 + h - 30, max(60, w - 150), 20, bars=20, seed=seed)


# ── 1. NUMERAL ────────────────────────────────────────────────────────────
def numeral(base, s, i, n):
    kicker, num, label, lines, promise = _hk(s)
    fx.halftone(base, W - 40, 200, 300, alpha=22)
    fx.dotgrid(base, 52, (255, 255, 255), alpha=16, box=(0, 170, W, 1210))
    _kicker(base, kicker)

    y = _lines(base, lines, 292, 94, W - 2 * M)
    y = _promise(base, promise, y + 26, size=27)

    # micro-preuves : le produit sans décor
    cy = y + 74
    for k, t in enumerate(("بلا ميكرو", "بلا مونتاج", "50 نقطة")):
        x_right = R - k * 236
        f = font(AR_SEMI, 19)
        tw = ImageDraw.Draw(base).textlength(visual(t), font=f) / SS + 40
        rrect(base, (x_right - tw, cy, x_right, cy + 50), 25,
              fill=(255, 255, 255, 26), outline=(255, 255, 255, 74), width=1.1)
        ImageDraw.Draw(base).text(((x_right - tw / 2) * SS, (cy + 26) * SS),
                                  visual(t), font=f, fill=(255, 255, 255), anchor="mm")

    rrect(base, (M, 986, R, 987.4), 1, fill=(255, 255, 255, 56))
    size = _fit(base, num, 430, 188) if num else 188
    ImageDraw.Draw(base).text(((M + 2) * SS, 1156 * SS), num,
                              font=font(LATIN_BOLD, size), fill=(255, 255, 255), anchor="ls")
    if num:
        rrect(base, (M + 8, 1186, M + 8 + 150, 1188), 1, fill=(*HI, 150))
    ImageDraw.Draw(base).text(((M + 8) * SS, 1190 * SS), visual(label),
                              font=font(AR_BOLD, 30), fill=HI, anchor="la")
    _reader(base, 590, 1002, R - 590, label="نموذج صوت · دارجة", seed=i + 2, dark=True)


# ── 2. STATEMENT ──────────────────────────────────────────────────────────
def statement(base, s, i, n):
    kicker, num, label, lines, promise = _hk(s)
    fx.halftone(base, 70, H_BOT - 80, 320, alpha=20)
    fx.dotgrid(base, 54, (255, 255, 255), alpha=14, box=(0, 170, W, 1210))
    _kicker(base, kicker, center=True)

    mw = W - 2 * M - 70
    y = _lines(base, lines, 330, 100, mw, align="center", x_right=W / 2 + mw / 2)
    y = _promise(base, promise, y + 34, size=26, align="center",
                 max_w=W - 2 * M - 150, x_right=W / 2 + (W - 2 * M - 150) / 2)

    gy = max(y + 92, 986)
    rrect(base, (W / 2 - 214, gy, W / 2 + 214, gy + 76), 38,
          fill=(255, 255, 255, 32), outline=(255, 255, 255, 92), width=1.2)
    ImageDraw.Draw(base).text((W / 2 * SS, (gy + 37) * SS), visual("اسحب وشوف الحل"),
                              font=font(AR_SEMI, 22), fill=(255, 255, 255), anchor="mm")
    _reader(base, W / 2 - 210, gy + 108, 420, label="نموذج صوت · دارجة",
            seed=i + 3, dark=True)
    if num:
        fx.sticker(base, M + 70, 1042, 62, num, label if len(label) <= 9 else "",
                   color=ORANGE, rot=-12)


# ── 3. TICKET ─────────────────────────────────────────────────────────────
def hookticket(base, s, i, n):
    kicker, num, label, lines, promise = _hk(s)
    base.alpha_composite(px.logo(int(92 * SS)), (int((W / 2 - 46) * SS), int(170 * SS)))
    top, bottom = 300, 1180
    fx.ticket(base, (M - 6, top, R + 6, bottom), radius=40)
    d = ImageDraw.Draw(base)

    pad_r, pad_l = R - 50, M + 50
    mw = pad_r - pad_l

    d.text((pad_r * SS, (top + 52) * SS), visual(kicker), font=font(AR_SEMI, 21),
           fill=(148, 126, 174), anchor="rm")
    d.text((pad_l * SS, (top + 52) * SS), f"SAWTIFY · N°{i:02d}", font=font(LATIN_BOLD, 15),
           fill=(180, 160, 202), anchor="lm")
    rrect(base, (pad_l - 10, top + 86, pad_r + 10, top + 87.2), 1, fill=(74, 40, 120, 36))

    # chiffre + libellé (sauf s'il est déjà dans l'accroche)
    dup = bool(num) and any(num in l.replace("**", "") for l in lines)
    y = top + 118
    if not dup:
        size = _fit(base, num, 300, 104)
        d.text((pad_r * SS, (y + 96) * SS), num, font=font(LATIN_BOLD, size),
               fill=(*VIOLET, 255), anchor="rm")
        d.text((pad_r * SS, (y + 122) * SS), visual(label), font=font(AR_BOLD, 26),
               fill=ORANGE, anchor="rm")
        y += 186

    cy = _lines(base, lines, y, 76, mw, x_right=pad_r, color=INK)
    _promise(base, promise, cy + 26, size=24, color=(104, 86, 128), max_w=mw, x_right=pad_r)

    # lecteur audio crème → violet (le produit, toujours visible)
    by = bottom - 176
    rrect(base, (pad_l, by, pad_r, by + 84), 24, fill=(*VIOLET, 255))
    ig.play_badge(base, pad_r - 44, by + 42, 21)
    d.text(((pad_r - 88) * SS, (by + 28) * SS), visual("نموذج صوت · 30 ثانية"),
           font=font(AR_SEMI, 20), fill=(255, 255, 255), anchor="rm")
    ig.waveform(base, pad_l + 28, by + 56, mw - 150, 20, bars=26, seed=i + 5)
    d.text((pad_r * SS, (by + 110) * SS), visual("من 500 دج · بلا التزام"),
           font=font(AR_REG, 19), fill=(150, 132, 172), anchor="rm")


# ── 4. HOOKSPLIT ──────────────────────────────────────────────────────────
def hooksplit(base, s, i, n):
    kicker, num, label, lines, promise = _hk(s)
    fx.halftone(base, 40, 210, 280, alpha=20)
    _kicker(base, kicker)
    y = _lines(base, lines, 262, 92, W - 2 * M)
    _promise(base, promise, y + 22, size=26, color=(230, 220, 250))

    top, bottom = 690, 1210
    sh = Image.new("RGBA", (ig.CW, ig.CH), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        [(M - 6) * SS, (top + 16) * SS, (R + 6) * SS, (bottom + 20) * SS],
        radius=44 * SS, fill=(6, 2, 18, 120))
    base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(28 * SS)))
    rrect(base, (M - 6, top, R + 6, bottom), 44, fill=(*CREAM, 255))

    d = ImageDraw.Draw(base)
    d.text(((M + 44) * SS, (top + 52) * SS), "SAWTIFY · DARJA DZ",
           font=font(LATIN_BOLD, 15), fill=(172, 152, 196), anchor="lm")
    d.text(((R - 44) * SS, (top + 52) * SS), "PREMIUM", font=font(LATIN_BOLD, 15),
           fill=(196, 176, 216), anchor="rm")
    rrect(base, (M + 34, top + 86, R - 34, top + 87.2), 1, fill=(74, 40, 120, 36))

    dup = bool(num) and any(num in l.replace("**", "") for l in lines)
    if not dup:
        size = _fit(base, num, 320, 104)
        d.text(((R - 44) * SS, (top + 214) * SS), num, font=font(LATIN_BOLD, size),
               fill=(*VIOLET, 255), anchor="rm")
        d.text(((R - 46) * SS, (top + 226) * SS), visual(label), font=font(AR_BOLD, 25),
               fill=ORANGE, anchor="rm")
    else:
        d.text(((R - 44) * SS, (top + 200) * SS), visual(kicker),
               font=font(AR_SEMI, 24), fill=(74, 22, 130), anchor="rm")
    ig.waveform(base, M + 40, top + 176, 200, 34, bars=18, seed=i + 6)
    d.text(((M + 44) * SS, (top + 240) * SS), "نموذج صوت · 30 ثانية",
           font=font(AR_REG, 17), fill=(140, 120, 166), anchor="lm")

    d.text(((R - 44) * SS, (top + 320) * SS), visual("3 أسباب باش تبدّل درك:"),
           font=font(AR_SEMI, 25), fill=(74, 22, 130), anchor="rm")
    gy = top + 396
    for k, t in enumerate(("بلا ميكرو", "بلا مونتاج", "50 نقطة")):
        cx = W / 2 + (k - 1) * 246
        rrect(base, (cx - 113, gy - 29, cx + 113, gy + 33), 22,
              fill=(240, 234, 250), outline=(212, 198, 236), width=1.1)
        d.text((cx * SS, (gy + 2) * SS), visual(t), font=font(AR_SEMI, 19),
               fill=(74, 22, 130), anchor="mm")


LAYOUTS = {"numeral": numeral, "statement": statement,
           "hookticket": hookticket, "hooksplit": hooksplit}
