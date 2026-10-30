#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════
 Sawtify — série « premium » : 3 carrousels Instagram prêts à poster
───────────────────────────────────────────────────────────────────────────
 Mélange de slides violettes pleines (accroche + CTA) et de slides crème
 (contenu), avec la mascotte Sawtify, des icônes vectorielles et des
 boutons travaillés. Tout le texte est en darija, mise en page RTL.

   python3 generate_premium.py                  # les 3 carrousels
   python3 generate_premium.py --only 3         # un seul (3, 4 ou 5)
   python3 generate_premium.py --only 3 --slides 1,6
═══════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

import sawtify_ig as ig
import premium as px
from sawtify_ig import (AR_BOLD, AR_REG, AR_SEMI, H, LATIN_BOLD, LATIN_MED, LATIN_REG,
                        M, P, SS, W, ar_para, font, lat_line, rrect, sparkle, visual)

ROOT = Path(__file__).resolve().parent
R = W - M            # bord droit utile


# ── Fonds ─────────────────────────────────────────────────────────────────
def violet_bg(seed: int = 0) -> Image.Image:
    """Fond violet premium (dégradé profond + halos + grain)."""
    img = ig.gradient((ig.CW, ig.CH), (128, 45, 226), (58, 20, 118)).convert("RGBA")
    ig.glow(img, ig.CW * 0.92, ig.CH * 0.06, 720 * SS, (196, 66, 240), 150)
    ig.glow(img, ig.CW * 0.06, ig.CH * 0.34, 560 * SS, (255, 100, 44), 46)
    ig.glow(img, ig.CW * 0.46, ig.CH * 1.04, 700 * SS, (86, 28, 170), 170)

    # texture : fines lignes diagonales
    stripes = Image.new("RGBA", (ig.CW, ig.CH), (0, 0, 0, 0))
    sd = ImageDraw.Draw(stripes)
    step = 26 * SS
    for i in range(-ig.CH, ig.CW, step):
        sd.line([(i, 0), (i + ig.CH, ig.CH)], fill=(255, 255, 255, 6), width=SS)
    img.alpha_composite(stripes)

    noise = Image.effect_noise((ig.CW // 2, ig.CH // 2), 18).convert("L").resize((ig.CW, ig.CH), Image.BILINEAR)
    grain = Image.new("RGBA", (ig.CW, ig.CH), (255, 255, 255, 255))
    grain.putalpha(noise.point(lambda v: int(v * 0.10)))
    img.alpha_composite(grain)

    vig = Image.new("L", (ig.CW, ig.CH), 0)
    ImageDraw.Draw(vig).ellipse([-ig.CW * 0.25, -ig.CH * 0.2, ig.CW * 1.25, ig.CH * 1.2], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(180 * SS))
    dark = Image.new("RGBA", (ig.CW, ig.CH), (0, 0, 0, 255))
    dark.putalpha(vig.point(lambda v: int(90 * (1 - v / 255.0))))
    img.alpha_composite(dark)
    return img


def footer_dark(base, index, total, hint="اسحب  →"):
    y = H - M - 26
    dw, gap = 8, 12
    total_w = total * dw + (total - 1) * gap
    x0 = (W - total_w) / 2
    for i in range(total):
        cx = x0 + i * (dw + gap) + dw / 2
        if i == index - 1:
            rrect(base, (cx - 14, y - 3, cx + 14, y + 3), 3, fill=(255, 255, 255))
        else:
            ig.dot(base, cx, y, 3, (255, 255, 255, 90))
    if hint:
        ImageDraw.Draw(base).text((W - M * SS / SS * 0 - M * 0 - 0, 0), "", font=font(LATIN_MED, 10))
        f = font(AR_REG, 18)
        ImageDraw.Draw(base).text(((W - M) * SS, y * SS), visual(hint), font=f,
                                  fill=(255, 255, 255, 150), anchor="rm")


def header_dark(base, index, total):
    px.logo_lockup(base, R, M - 4, 44)
    txt = f"{index:02d} / {total:02d}"
    f = font(LATIN_MED, 19)
    w = ImageDraw.Draw(base).textlength(txt, font=f) / SS + 36
    rrect(base, (M, M, M + w, M + 42), 21, fill=(255, 255, 255, 26), outline=(255, 255, 255, 70), width=1)
    ImageDraw.Draw(base).text(((M + w / 2) * SS, (M + 22) * SS), txt, font=f,
                              fill=(255, 255, 255, 225), anchor="mm")


def header_light(base, index, total):
    px.logo_lockup(base, R, M - 4, 44, tile=True)
    txt = f"{index:02d} / {total:02d}"
    f = font(LATIN_MED, 19)
    w = ImageDraw.Draw(base).textlength(txt, font=f) / SS + 36
    rrect(base, (M, M, M + w, M + 42), 21, fill=(255, 255, 255, 235),
          outline=P["card_line"], width=1)
    ImageDraw.Draw(base).text(((M + w / 2) * SS, (M + 22) * SS), txt, font=f,
                              fill=P["muted"], anchor="mm")


def white_badge(base, x_right, y, label, size=17):
    d = ImageDraw.Draw(base)
    f = font(AR_SEMI, size * 1.12)
    tw = d.textlength(visual(label), font=f) / SS
    h = 42
    w = tw + 46
    x = x_right - w
    rrect(base, (x, y, x + w, y + h), h / 2, fill=(255, 255, 255, 38), outline=(255, 255, 255, 90), width=1.1)
    ig.dot(base, x + 21, y + h / 2, 3.8, (255, 255, 255, 230))
    d.text(((x + 36) * SS, (y + h / 2 + 2) * SS), visual(label), font=f, fill=(255, 255, 255), anchor="lm")


HI_ON_VIOLET = (255, 178, 120)      # l'orange de la mascotte, lisible sur violet


def ar_text(base, text, size, color, y, max_w=None, align="right", font_name=AR_BOLD,
            leading=1.32, x_right=None, hi_color=None):
    x_right = R if x_right is None else x_right
    return ar_para(base, x_right, y, text, size, font_name, color,
                   max_w=max_w or (W - 2 * M), align=align, leading=leading,
                   hi_color=hi_color or P["primary"])


# ═══════════════════════════════════════════════════════════════════════════
#  Slides
# ═══════════════════════════════════════════════════════════════════════════
def s_cover(base, s, i, n):
    """Accroche pleine page violette."""
    mark = px.logo(int(112 * SS))
    base.alpha_composite(mark, (int((R - 112) * SS), int(222 * SS)))
    white_badge(base, R, 356, s["chip"], size=19)

    y = ar_text(base, s["title"], 84, (255, 255, 255), 426, max_w=W - 2 * M, leading=1.30,
                hi_color=HI_ON_VIOLET) + 26
    y = ar_text(base, s["sub"], 27, (235, 225, 250), y, max_w=W - 2 * M, font_name=AR_REG,
                leading=1.72) + 44

    # bandeau « mini lecteur »
    h = 108
    rrect(base, (M, y, W - M, y + h), 26, fill=(255, 255, 255, 34), outline=(255, 255, 255, 80), width=1.2)
    ig.play_badge(base, W - M - 54, y + h / 2, 26)
    d = ImageDraw.Draw(base)
    d.text(((W - M - 104) * SS, (y + 40) * SS), visual(s["player"]), font=font(AR_SEMI, 23),
           fill=(255, 255, 255), anchor="rm")
    d.text(((W - M - 104) * SS, (y + 72) * SS), visual(s["player_meta"]), font=font(AR_REG, 17),
           fill=(240, 232, 255, 255), anchor="rm")
    ig.waveform(base, M + 24, y + 40, W - M - 220, 30, bars=40)
    y += h + 34

    ar_text(base, s["ar"], 25, (235, 225, 250), y, font_name=AR_REG, leading=1.6)


def s_errors(base, s, i, n):
    px.badge(base, R, 236, s["chip"], fill=(255, 236, 244, 255), line=(250, 200, 220, 255),
             color=(190, 40, 90), dot_color=(219, 39, 119))
    y = ar_text(base, s["title"], 70, P["text"], 302, leading=1.34) + 42
    for k, item in enumerate(s["items"]):
        cy = y + k * 168
        px.card(base, M, cy, W - 2 * M, 148, radius=26)
        px.icon_tile(base, W - M - 58, cy + 74, item["icon"], 76,
                     icon_color=(219, 39, 119), tint=(219, 39, 119, 26), line=(219, 39, 119, 60))
        d = ImageDraw.Draw(base)
        d.text(((W - M - 118) * SS, (cy + 56) * SS), visual(item["t"]), font=font(AR_BOLD, 27),
               fill=P["text"], anchor="rm")
        d.text(((W - M - 118) * SS, (cy + 100) * SS), visual(item["v"]), font=font(AR_REG, 19),
               fill=P["muted"], anchor="rm")


def s_features(base, s, i, n):
    px.badge(base, R, 236, s["chip"])
    y = ar_text(base, s["title"], 66, P["text"], 300, leading=1.32) + 40
    for k, item in enumerate(s["items"]):
        cy = y + k * 156
        px.card(base, M, cy, W - 2 * M, 136, radius=26, accent=(k == 0))
        px.icon_tile(base, W - M - 56, cy + 68, item["icon"], 72)
        d = ImageDraw.Draw(base)
        d.text(((W - M - 112) * SS, (cy + 48) * SS), visual(item["t"]), font=font(AR_BOLD, 26),
               fill=P["text"], anchor="rm")
        d.text(((W - M - 112) * SS, (cy + 92) * SS), visual(item["v"]), font=font(AR_REG, 19),
               fill=P["muted"], anchor="rm")


def s_steps(base, s, i, n):
    px.badge(base, R, 232, s["chip"])
    y = ar_text(base, s["title"], 68, P["text"], 296, leading=1.32) + 44
    for k, item in enumerate(s["items"]):
        cy = y + k * 186
        px.card(base, M, cy, W - 2 * M, 160, radius=28, accent=(k == 0))
        # pastille numérotée
        cx_ = W - M - 62
        rrect(base, (cx_ - 34, cy + 46, cx_ + 34, cy + 114), 18,
              fill=P["primary"] if k == 0 else (*P["primary"], 30))
        ImageDraw.Draw(base).text((cx_ * SS, (cy + 80) * SS), f"{k+1}",
                                  font=font(LATIN_BOLD, 34),
                                  fill=(255, 255, 255) if k == 0 else P["primary"], anchor="mm")
        d = ImageDraw.Draw(base)
        d.text(((W - M - 116) * SS, (cy + 62) * SS), visual(item["t"]), font=font(AR_BOLD, 28),
               fill=P["text"], anchor="rm")
        d.text(((W - M - 116) * SS, (cy + 106) * SS), visual(item["v"]), font=font(AR_REG, 20),
               fill=P["muted"], anchor="rm")
        px.icon(base, item["icon"], M + 52, cy + 80, 30, P["accent"], 1.8)
        if k < len(s["items"]) - 1:
            d.line([((M + 52) * SS, (cy + 162) * SS), ((M + 52) * SS, (cy + 186) * SS)],
                   fill=(*P["primary"], 80), width=int(2 * SS))


def s_grid(base, s, i, n):
    px.badge(base, R, 236, s["chip"])
    y = ar_text(base, s["title"], 62, P["text"], 300, leading=1.34) + 40
    cols, gap = 2, 18
    cw = (W - 2 * M - gap) / cols
    for k, item in enumerate(s["items"]):
        col, row = k % cols, k // cols
        cx = R - cw - col * (cw + gap)
        cy = y + row * 172
        px.card(base, cx, cy, cw, 154, radius=26)
        px.icon_tile(base, cx + cw / 2, cy + 50, item["icon"], 60, stroke=1.8)
        d = ImageDraw.Draw(base)
        d.text(((cx + cw - 24) * SS, (cy + 104) * SS), visual(item["t"]), font=font(AR_BOLD, 23),
               fill=P["text"], anchor="rm")
        d.text(((cx + cw - 24) * SS, (cy + 134) * SS), visual(item["v"]), font=font(AR_REG, 17),
               fill=P["muted"], anchor="rm")



def s_list(base, s, i, n):
    """Liste compacte : 5 idées numérotées avec tuile d'icône."""
    px.badge(base, R, 228, s["chip"], size=19)
    y = ar_text(base, s["title"], 60, P["text"], 288, leading=1.32) + 34
    count = len(s["items"])
    row_h = 128 if count <= 4 else 112
    for k, item in enumerate(s["items"]):
        cy = y + k * row_h
        px.card(base, M, cy, W - 2 * M, row_h - 14, radius=24, accent=(k == 0))
        px.icon_tile(base, W - M - 52, cy + (row_h - 14) / 2, item["icon"], 62)
        d = ImageDraw.Draw(base)
        d.text(((W - M - 100) * SS, (cy + 34) * SS), visual(item["t"]), font=font(AR_BOLD, 24),
               fill=P["text"], anchor="rm")
        d.text(((W - M - 100) * SS, (cy + 70) * SS), visual(item["v"]), font=font(AR_REG, 17),
               fill=P["muted"], anchor="rm")
        d.text(((M + 26) * SS, (cy + (row_h - 14) / 2) * SS), f"{k+1:02d}",
               font=font(LATIN_BOLD, 22), fill=(*P["primary"], 130), anchor="lm")


def s_stats(base, s, i, n):
    """Slide sombre « preuves chiffrées »."""
    white_badge(base, R, 232, s["chip"], size=19)
    y = ar_text(base, s["title"], 66, (255, 255, 255), 300, leading=1.32,
                hi_color=HI_ON_VIOLET) + 50
    cols, gap = 2, 18
    cw = (W - 2 * M - gap) / cols
    for k, item in enumerate(s["stats"]):
        col, row = k % cols, k // cols
        cx = R - cw - col * (cw + gap)
        cy = y + row * 194
        rrect(base, (cx, cy, cx + cw, cy + 176), 26, fill=(255, 255, 255, 30),
              outline=(255, 255, 255, 75), width=1.2)
        px.icon(base, item["icon"], cx + cw - 44, cy + 46, 26, (255, 255, 255, 230), 1.8)
        d = ImageDraw.Draw(base)
        d.text(((cx + cw - 26) * SS, (cy + 92) * SS), item["v"], font=font(LATIN_BOLD, 40),
               fill=(255, 255, 255), anchor="rm")
        d.text(((cx + cw - 26) * SS, (cy + 136) * SS), visual(item["t"]), font=font(AR_REG, 19),
               fill=(238, 228, 255), anchor="rm")
    ar_text(base, s["ar"], 24, (240, 232, 255), y + 2 * 194 + 16, font_name=AR_REG, leading=1.6)


def s_compare(base, s, i, n):
    px.badge(base, R, 232, s["chip"])
    y = ar_text(base, s["title"], 66, P["text"], 296, leading=1.32) + 44
    col_w = (W - 2 * M - 20) / 2
    # colonne « avant » à droite (RTL), « après » à gauche
    for side, (cx, data, is_after) in enumerate((
        (R - col_w, s["before"], False),
        (M, s["after"], True),
    )):
        px.card(base, cx, y, col_w, 436, radius=28, accent=is_after)
        d = ImageDraw.Draw(base)
        f = font(AR_SEMI, 19)
        label = visual(data["label"])
        tw_ = d.textlength(label, font=f) / SS + 46
        bx = cx + col_w - tw_ - 18
        rrect(base, (bx, y + 22, bx + tw_, y + 64), 21,
              fill=(219, 39, 119, 26) if not is_after else (*P["primary"], 30),
              outline=(219, 39, 119, 70) if not is_after else (*P["primary"], 90), width=1.1)
        d.text(((bx + tw_ / 2) * SS, (y + 44) * SS), label, font=f,
               fill=(190, 40, 90) if not is_after else P["primary"], anchor="mm")
        px.icon(base, "clock" if not is_after else "bolt", cx + 40, y + 44, 26,
                (219, 39, 119) if not is_after else P["primary"], 1.9)
        dy = y + 104
        for row in data["rows"]:
            rrect(base, (cx + 16, dy + 14, cx + col_w - 16, dy + 96), 18,
                  fill=(*P["primary"], 16) if is_after else (26, 15, 46, 10))
            d.text(((cx + col_w - 52) * SS, (dy + 56) * SS), visual(row), font=font(AR_REG, 21),
                   fill=P["text"] if is_after else P["muted"], anchor="rm")
            if is_after:
                px.icon(base, "check", cx + 38, dy + 55, 24, P["primary"], 1.9)
            else:
                px.icon(base, "cross", cx + 38, dy + 55, 22, (190, 60, 100), 2.0)
            dy += 100
    ar_text(base, s["ar"], 24, P["primary"], y + 466, font_name=AR_REG, leading=1.6)


def s_quotes(base, s, i, n):
    px.badge(base, R, 232, s["chip"])
    y = ar_text(base, s["title"], 64, P["text"], 296, leading=1.32) + 40
    for k, q in enumerate(s["quotes"]):
        cy = y + k * 232
        px.card(base, M, cy, W - 2 * M, 208, radius=28, accent=(k == 0))
        d = ImageDraw.Draw(base)
        # avatar initiales
        rrect(base, (M + 22, cy + 26, M + 90, cy + 94), 20, fill=(*P["primary"], 32))
        d.text(((M + 56) * SS, (cy + 61) * SS), q["initials"], font=font(LATIN_BOLD, 24),
               fill=P["primary"], anchor="mm")
        d.text(((W - M - 26) * SS, (cy + 44) * SS), visual(q["name"]), font=font(AR_BOLD, 23),
               fill=P["text"], anchor="rm")
        d.text(((W - M - 26) * SS, (cy + 78) * SS), visual(q["role"]), font=font(AR_REG, 17),
               fill=P["muted"], anchor="rm")
        # étoiles
        for s_ in range(5):
            px.icon(base, "star", M + 46 + s_ * 24, cy + 122, 15, (233, 161, 59), 1)
        ar_para(base, W - M - 26, cy + 118, q["text"], 19, AR_REG, P["text"],
                max_w=W - 2 * M - 120, leading=1.6)


def s_pricing(base, s, i, n):
    px.badge(base, R, 232, s["chip"], fill=(255, 246, 226, 255), line=(243, 214, 150, 255),
             color=(158, 96, 12), dot_color=(233, 161, 59))
    y = ar_text(base, s["title"], 64, P["text"], 296, leading=1.32) + 40
    for k, pack in enumerate(s["packs"]):
        cy = y + k * 140
        hot = pack.get("hot")
        px.card(base, M, cy, W - 2 * M, 124, radius=26, accent=hot)
        d = ImageDraw.Draw(base)
        nm = pack["name"]
        d.text(((W - M - 30) * SS, (cy + 48) * SS), visual(nm),
               font=font(AR_BOLD if ig.ARABIC_RE.search(nm) else LATIN_BOLD,
                         27 if ig.ARABIC_RE.search(nm) else 30),
               fill=P["text"], anchor="rm")
        d.text(((W - M - 30) * SS, (cy + 88) * SS), visual(pack["note"]), font=font(AR_REG, 18),
               fill=P["muted"], anchor="rm")
        # prix à gauche
        pr = pack["price"]
        d.text(((M + 30) * SS, (cy + 62) * SS), visual(pr),
               font=font(AR_BOLD if ig.ARABIC_RE.search(pr) else LATIN_BOLD, 30),
               fill=(201, 124, 24) if hot else P["primary"], anchor="lm")
        if hot:
            label = "الأكثر طلبا"
            f = font(AR_SEMI, 16)
            tw_ = d.textlength(visual(label), font=f) / SS + 26
            rrect(base, (W - M - tw_ - 30, cy - 12, W - M - 30, cy + 16), 14, fill=(233, 161, 59, 245))
            d.text(((W - M - 30 - tw_ / 2) * SS, (cy + 2) * SS), visual(label), font=f,
                   fill=(48, 26, 4), anchor="mm")
    ar_text(base, s["ar"], 23, P["muted"], y + 3 * 140 + 6, font_name=AR_REG, leading=1.6)


def s_cta(base, s, i, n):
    sparkle(base, M + 40, 300, 20, (255, 255, 255, 210))
    sparkle(base, M + 96, 356, 10, (255, 255, 255, 150))
    sparkle(base, R - 30, 320, 13, (255, 255, 255, 190))

    d = ImageDraw.Draw(base)
    # mascotte centrée
    mark = px.logo(int(132 * SS))
    base.alpha_composite(mark, (int((W / 2 - 66) * SS), int(268 * SS)))

    y = ar_text(base, s["title"], 72, (255, 255, 255), 430, max_w=W - 2 * M - 40,
                align="center", x_right=W / 2 + (W - 2 * M - 40) / 2, leading=1.30,
                hi_color=HI_ON_VIOLET) + 22
    y = ar_text(base, s["sub"], 25, (238, 228, 255), y, max_w=W - 2 * M - 90,
                font_name=AR_REG, align="center",
                x_right=W / 2 + (W - 2 * M - 90) / 2, leading=1.7) + 46

    bw, bh = 440, 92
    px.button(base, (W - bw) / 2, y, bw, bh, s["cta"], style="white")

    note_font = font(AR_REG if ig.ARABIC_RE.search(s["cta_note"]) else LATIN_REG,
                     20 if ig.ARABIC_RE.search(s["cta_note"]) else 20)
    d.text((W / 2 * SS, (y + bh + 36) * SS), visual(s["cta_note"]), font=note_font,
           fill=(240, 232, 255), anchor="mm")

    # garanties
    gy = y + bh + 112
    for k, g in enumerate(s["guarantees"]):
        cx = W / 2 + (k - 1) * 232
        rrect(base, (cx - 106, gy - 30, cx + 106, gy + 34), 22, fill=(255, 255, 255, 30),
              outline=(255, 255, 255, 80), width=1.1)
        px.icon(base, g["icon"], cx - 74, gy + 2, 24, (255, 255, 255, 240), 1.9)
        d.text(((cx - 50) * SS, (gy + 3) * SS), visual(g["t"]), font=font(AR_SEMI, 19),
               fill=(255, 255, 255), anchor="lm")


DARK = {"cover", "stats", "cta"}
RENDERERS = {
    "cover": s_cover, "errors": s_errors, "features": s_features, "steps": s_steps,
    "grid": s_grid, "stats": s_stats, "compare": s_compare, "quotes": s_quotes,
    "pricing": s_pricing, "list": s_list, "cta": s_cta,
}


# ═══════════════════════════════════════════════════════════════════════════
#  Contenus
# ═══════════════════════════════════════════════════════════════════════════
CARROUSELS = [
    {
        "slug": "03-3-erreurs-pub",
        "name": "Carrousel 3 — 3 erreurs qui tuent ta pub",
        "caption": (
            "الإعلان تاعك ماشي ضعيف… الصوت هو المشكل 🎙️\n\n"
            "3 أغلاط كيقتلو الإعلانات تاع المتاجر الجزائرية، وكيفاش تحلّهم في 30 ثانية "
            "مع Sawtify.\n\n"
            "👉 سجّل في sawtify.space وخوذ 50 نقطة مجانية.\n\n"
            "#Sawtify #الدارجة #تعليق_صوتي #إعلانات #تجارة_إلكترونية #الجزائر"
        ),
        "slides": [
            {
                "type": "cover",
                "chip": "سلسلة · 3 أغلاط",
                "title": "الإعلان تاعك ماشي ضعيف… **الصوت** هو المشكل.",
                "sub": "3 أغلاط كيقتلو الإعلانات تاع المتاجر الجزائرية، وكيفاش تحلّهم في 30 ثانية.",
                "player": "نموذج صوت · دارجة",
                "player_meta": "00:12 · جودة استوديو",
                "ar": "اسحب باش تشوف الأغلاط.",
            },
            {
                "type": "errors",
                "chip": "الغلطة 1 و 2 و 3",
                "title": "3 أغلاط كتخلّي الناس تدوز على إعلانك.",
                "items": [
                    {"t": "صوت فصحى", "v": "ما يشبهش للزبون تاعك، يحسّه بعيد", "icon": "globe"},
                    {"t": "موسيقى تغطّي الكلام", "v": "الرسالة تضيع، والزبون ما يفهمش العرض", "icon": "headphones"},
                    {"t": "تعليق ميت بلا نبرة", "v": "بلا حماس، بلا إقناع، بلا بيع", "icon": "chart"},
                ],
            },
            {
                "type": "features",
                "chip": "الحل",
                "title": "Sawtify يعطيك صوت يشبه **لزبونك**.",
                "items": [
                    {"t": "دارجة أصيلة 100%", "v": "كيفاش تهدرو انت وزبونك فالزنقة", "icon": "mic"},
                    {"t": "جاهز في 30 ثانية", "v": "بلا ميكرو، بلا مونتاج، بلا تسنّى", "icon": "bolt"},
                    {"t": "حقوق تجارية كاملة", "v": "تيك توك، ريلز، فيسبوك، بلا قيود", "icon": "shield"},
                ],
            },
            {
                "type": "stats",
                "chip": "الأرقام",
                "title": "شنو كيتبدّل كي يولّي عندك صوت صحيح.",
                "stats": [
                    {"v": "-80%", "t": "تكلفة التعليق الصوتي", "icon": "wallet"},
                    {"v": "30s", "t": "باش يخرج الأوديو", "icon": "clock"},
                    {"v": "+300%", "t": "تفاعل على تيك توك", "icon": "chart"},
                    {"v": "30", "t": "صوت رجال ونساء", "icon": "user"},
                ],
                "ar": "نفس الإعلان، صوت مختلف، نتيجة مختلفة.",
            },
            {
                "type": "compare",
                "chip": "قبل / بعد",
                "title": "الفرق واضح في 30 ثانية.",
                "before": {
                    "label": "قبل",
                    "rows": ["3 أيام تسنّى", "3000 دج على كل فيديو", "كلش يتعاود"],
                },
                "after": {
                    "label": "مع Sawtify",
                    "rows": ["30 ثانية برك", "الباقة تبدا من 500 دج", "بدّل جملة وولّد من جديد"],
                },
                "ar": "نفس الميزانية، 4 مرات محتوى أكثر.",
            },
            {
                "type": "cta",
                "chip": "ابدا اليوم",
                "title": "خلي إعلانك يهدر بالدارجة.",
                "sub": "جرّب بلا ما تخلّص. 50 نقطة مجانية كي تسجّل، بلا بطاقة بنكية.",
                "cta": "sawtify.space",
                "cta_note": "sawtify.space  ·  الباقات تبدا من 500 دج",
                "guarantees": [
                    {"icon": "gift", "t": "50 نقطة مجانية"},
                    {"icon": "lock", "t": "بلا التزام"},
                    {"icon": "shield", "t": "دفع آمن"},
                ],
            },
        ],
    },
    {
        "slug": "04-faire-une-pub-en-5-min",
        "name": "Carrousel 4 — Une pub en 5 minutes",
        "caption": (
            "فيديو إعلاني كامل في 5 دقايق ⏱️\n\n"
            "3 خطوات: اكتب، اختار الصوت، نزّل. بلا ميكرو وبلا مونتاج — بالدارجة الجزائرية.\n\n"
            "👉 جاهز؟ sawtify.space — 50 نقطة مجانية.\n\n"
            "#Sawtify #الدارجة #تيك_توك #إعلانات #الجزائر #صناع_المحتوى"
        ),
        "slides": [
            {
                "type": "cover",
                "chip": "دليل سريع",
                "title": "فيديو إعلاني كامل في **5 دقايق**.",
                "sub": "بلا ميكرو، بلا مونتاج، بلا تسنّى. نفس الجودة تاع الاستوديو، من تليفونك.",
                "player": "نموذج إعلان · دارجة",
                "player_meta": "00:15 · جودة استوديو",
                "ar": "اسحب باش تشوف الخطوات.",
            },
            {
                "type": "steps",
                "chip": "3 خطوات",
                "title": "انسخ. اختار. نزّل.",
                "items": [
                    {"t": "حطّ النص", "v": "العرض تاعك، بالدارجة ولا بالفرنسية", "icon": "mic"},
                    {"t": "اختار الصوت", "v": "راجل، مرا، نبرة تجارية ولا هادية", "icon": "headphones"},
                    {"t": "نزّل الأوديو", "v": "MP3 جاهز لريلز وتيك توك", "icon": "download"},
                ],
            },
            {
                "type": "grid",
                "chip": "لمين؟",
                "title": "أداة وحدة، لكل الفورمات.",
                "items": [
                    {"t": "متجر إلكتروني", "v": "إعلانات المنتجات", "icon": "cart"},
                    {"t": "تيك توك / ريلز", "v": "تعليق 15–60 ثانية", "icon": "phone"},
                    {"t": "فيسبوك Ads", "v": "سبوتات تبيع", "icon": "megaphone"},
                    {"t": "تكوين ودروس", "v": "دروس وبودكاست", "icon": "video"},
                ],
            },
            {
                "type": "features",
                "chip": "علاش Sawtify",
                "title": "كلش جاهز، بلا تعقيد.",
                "items": [
                    {"t": "بلا برامج", "v": "من المتصفح برك، من أي جهاز", "icon": "layers"},
                    {"t": "بدّل وولّد من جديد", "v": "جملة وحدة تبدّلت؟ 30 ثانية وتحل", "icon": "rocket"},
                    {"t": "حقوق تجارية كاملة", "v": "استعملو في الإعلانات بلا قيود", "icon": "shield"},
                ],
            },
            {
                "type": "pricing",
                "chip": "الباقات",
                "title": "اختار الباقة اللي تناسبك.",
                "packs": [
                    {"name": "100 نقطة", "note": "للتجربة · 5 تعليقات", "price": "500 دج"},
                    {"name": "220 نقطة", "note": "+20 نقطة مجانية", "price": "1000 دج", "hot": True},
                    {"name": "600 نقطة", "note": "+100 نقطة مجانية", "price": "2500 دج"},
                ],
                "ar": "الدفع: إيداع ذهبي · CIB · SATIM — النقاط ما تنتهيش.",
            },
            {
                "type": "cta",
                "chip": "ابدا اليوم",
                "title": "أول فيديو تاعك اليوم.",
                "sub": "50 نقطة مجانية كي تسجّل، بلا بطاقة بنكية وبلا التزام.",
                "cta": "sawtify.space",
                "cta_note": "sawtify.space  ·  من 500 دج",
                "guarantees": [
                    {"icon": "bolt", "t": "30 ثانية"},
                    {"icon": "gift", "t": "50 نقطة"},
                    {"icon": "shield", "t": "دفع آمن"},
                ],
            },
        ],
    },
    {
        "slug": "05-preuves-clients",
        "name": "Carrousel 5 — Preuves clients",
        "caption": (
            "شنو بدّل Sawtify عند التجار والصنّاع تاع المحتوى 🇩🇿\n\n"
            "نفس الجودة تاع الاستوديو، بالدارجة، وفي 30 ثانية. شوف الأرقام وآراء الزبائن.\n\n"
            "👉 سجّل في sawtify.space وخوذ 50 نقطة مجانية.\n\n"
            "#Sawtify #الدارجة #شهادات #الجزائر #تجارة_إلكترونية #تيك_توك"
        ),
        "slides": [
            {
                "type": "cover",
                "chip": "شهادات وأرقام",
                "title": "+500 صانع محتوى وتاجر **يثقو فينا**.",
                "sub": "نفس الجودة تاع الاستوديو، بالدارجة الجزائرية، وفي 30 ثانية.",
                "player": "صوت العميل · دارجة",
                "player_meta": "00:12 · جودة استوديو",
                "ar": "اسحب باش تشوف الأرقام.",
            },
            {
                "type": "stats",
                "chip": "الأرقام",
                "title": "النتيجة عند الناس اللي جرّبو.",
                "stats": [
                    {"v": "+500", "t": "تاجر وصانع محتوى", "icon": "user"},
                    {"v": "4.9/5", "t": "متوسط رضا الزبائن", "icon": "star"},
                    {"v": "-80%", "t": "تكلفة الإنتاج", "icon": "wallet"},
                    {"v": "30s", "t": "باش يخرج الأوديو", "icon": "bolt"},
                ],
                "ar": "أرقام من الاستعمال اليومي، ماشي وعود.",
            },
            {
                "type": "quotes",
                "chip": "شهادات",
                "title": "بكلامهم هوما.",
                "quotes": [
                    {"initials": "AS", "name": "أمين س.", "role": "متجر ملابس رجالية",
                     "text": "كنت نخسر 2000 دج على كل تعليق صوتي. درك نخدم 4 فيديوهات فالنهار."},
                    {"initials": "CB", "name": "شيماء ب.", "role": "صانعة محتوى",
                     "text": "الصوت يخرج طبيعي بزاف، الناس يحسبوها بنت دزايرية تسجّل فالميكرو!"},
                ],
            },
            {
                "type": "compare",
                "chip": "قبل / بعد",
                "title": "شنو تبدّل عند التاجر.",
                "before": {
                    "label": "قبل",
                    "rows": ["3 أيام تسنّى", "3000 دج على كل فيديو", "كلش يتعاود"],
                },
                "after": {
                    "label": "مع Sawtify",
                    "rows": ["30 ثانية برك", "الباقة تبدا من 500 دج", "بدّل جملة وولّد من جديد"],
                },
                "ar": "نفس الميزانية، 4 مرات محتوى أكثر.",
            },
            {
                "type": "pricing",
                "chip": "الباقات",
                "title": "اختار الباقة اللي تناسبك.",
                "packs": [
                    {"name": "100 نقطة", "note": "للتجربة · 5 تعليقات", "price": "500 دج"},
                    {"name": "220 نقطة", "note": "+20 نقطة مجانية", "price": "1000 دج", "hot": True},
                    {"name": "600 نقطة", "note": "+100 نقطة مجانية", "price": "2500 دج"},
                ],
                "ar": "الدفع: إيداع ذهبي · CIB · SATIM — النقاط ما تنتهيش.",
            },
            {
                "type": "cta",
                "chip": "ابدا اليوم",
                "title": "ولّي انت التالي فالقائمة.",
                "sub": "50 نقطة مجانية كي تسجّل، بلا بطاقة بنكية وبلا التزام.",
                "cta": "sawtify.space",
                "cta_note": "sawtify.space  ·  من 500 دج",
                "guarantees": [
                    {"icon": "gift", "t": "50 نقطة"},
                    {"icon": "lock", "t": "بلا التزام"},
                    {"icon": "shield", "t": "دفع آمن"},
                ],
            },
        ],
    },
    {
        "slug": "06-5-idees-videos-darija",
        "name": "Carrousel 6 — 5 idées de vidéos en darija",
        "caption": (
            "ما لقيتش واش تنشر؟ هاك 5 أفكار فيديوهات تجيب المشاهدات 🎬\n\n"
            "وكل فكرة تقدر تصوّرها اليوم، بالتعليق الصوتي بالدارجة من Sawtify — في 30 ثانية.\n\n"
            "👉 سجّل في sawtify.space وخوذ 50 نقطة مجانية.\n\n"
            "#Sawtify #الدارجة #أفكار_محتوى #تيك_توك #الجزائر #تجارة_إلكترونية"
        ),
        "slides": [
            {
                "type": "cover",
                "chip": "أفكار محتوى",
                "title": "5 أفكار فيديوهات **تجيب المشاهدات**.",
                "sub": "كل فكرة تقدر تصوّرها اليوم، بتعليق صوتي بالدارجة في 30 ثانية.",
                "player": "نموذج فكرة · دارجة",
                "player_meta": "00:15 · جودة استوديو",
                "ar": "اسحب باش تشوف الأفكار.",
            },
            {
                "type": "list",
                "chip": "5 أفكار",
                "title": "اختار فكرة وابدا اليوم.",
                "items": [
                    {"t": "قبل / بعد المنتج", "v": "ورّي الفرق بصوت حماسي", "icon": "video"},
                    {"t": "3 أسباب باش تشري", "v": "شرح سريع في 15 ثانية", "icon": "cart"},
                    {"t": "سؤال وجواب مع الزبون", "v": "جاوب على أكبر اعتراض", "icon": "user"},
                    {"t": "شهادة زبون", "v": "خلي الزبون يهدّر على تجربتو", "icon": "star"},
                    {"t": "عرض محدود", "v": "عدّاد وقت + نبرة مستعجلة", "icon": "bolt"},
                ],
            },
            {
                "type": "steps",
                "chip": "كيفاش تصوّر",
                "title": "3 خطوات ويسّرو.",
                "items": [
                    {"t": "صوّر المنتج", "v": "تليفون برك، ضو طبيعي", "icon": "video"},
                    {"t": "ولّد التعليق", "v": "النص تاعك بالدارجة في Sawtify", "icon": "mic"},
                    {"t": "ركّب وانشر", "v": "حطّ الأوديو على الفيديو وانشر", "icon": "download"},
                ],
            },
            {
                "type": "stats",
                "chip": "علاش الصوت",
                "title": "الصوت هو اللي يحبس الإصبع.",
                "stats": [
                    {"v": "85%", "t": "يشوفو الفيديو بلا صوت", "icon": "headphones"},
                    {"v": "3s", "t": "باش تقرّر يكمل ولا يدوز", "icon": "clock"},
                    {"v": "+300%", "t": "تفاعل بالدارجة", "icon": "chart"},
                    {"v": "30s", "t": "باش يخرج الأوديو", "icon": "bolt"},
                ],
                "ar": "أول 3 ثواني هي اللي تبيع.",
            },
            {
                "type": "cta",
                "chip": "ابدا اليوم",
                "title": "اختار فكرة، وسجّل اليوم.",
                "sub": "50 نقطة مجانية كي تسجّل، بلا بطاقة بنكية وبلا التزام.",
                "cta": "sawtify.space",
                "cta_note": "sawtify.space  ·  من 500 دج",
                "guarantees": [
                    {"icon": "gift", "t": "50 نقطة"},
                    {"icon": "bolt", "t": "30 ثانية"},
                    {"icon": "shield", "t": "دفع آمن"},
                ],
            },
        ],
    },
    {
        "slug": "07-choisir-la-bonne-voix",
        "name": "Carrousel 7 — Choisir la bonne voix",
        "caption": (
            "ماشي كل صوت يصلح لكل فيديو 🎙️\n\n"
            "كيفاش تختار النبرة المناسبة: تجارية، هادية، ولا حماسية — والفرق بين الدارجة والفصحى.\n\n"
            "👉 30 صوت رجال ونساء في sawtify.space — 50 نقطة مجانية.\n\n"
            "#Sawtify #الدارجة #تعليق_صوتي #الجزائر #صناع_المحتوى"
        ),
        "slides": [
            {
                "type": "cover",
                "chip": "دليل الصوت",
                "title": "ماشي كل صوت يصلح **لكل فيديو**.",
                "sub": "كيفاش تختار النبرة المناسبة في 30 ثانية، بلا تجارب فاشلة.",
                "player": "3 نبرات · دارجة",
                "player_meta": "00:12 · جودة استوديو",
                "ar": "اسحب باش تشوف الفرق.",
            },
            {
                "type": "compare",
                "chip": "دارجة / فصحى",
                "title": "الدارجة ولا الفصحى؟ الفرق واضح.",
                "before": {
                    "label": "فصحى",
                    "rows": ["يحسّها بعيدة", "ما تفهمش الكلمات تاعنا", "تفاعل ضعيف"],
                },
                "after": {
                    "label": "دارجة",
                    "rows": ["كيفاش تهدرو انت وزبونك", "كلمات من الزنقة", "تفاعل أقوى بـ 3 مرات"],
                },
                "ar": "الزبون كيثق في اللي يشبه لو.",
            },
            {
                "type": "grid",
                "chip": "4 نبرات",
                "title": "اختار النبرة على حساب الفيديو.",
                "items": [
                    {"t": "تجارية", "v": "عرض، تخفيض، بيع", "icon": "megaphone"},
                    {"t": "هادية", "v": "شرح، تكوين، هدوء", "icon": "headphones"},
                    {"t": "حماسية", "v": "إعلان، إطلاق منتج", "icon": "bolt"},
                    {"t": "وثائقية", "v": "قصة، بودكاست", "icon": "mic"},
                ],
            },
            {
                "type": "features",
                "chip": "3 نصائح",
                "title": "3 حوايج قبل ما تولّد الصوت.",
                "items": [
                    {"t": "اكتب كيما تهدّر", "v": "جمل قصيرة، كلمات تاع الزنقة", "icon": "sparkles"},
                    {"t": "جرّب 3 أصوات", "v": "نفس النص، 3 نبرات، اختار الأحسن", "icon": "layers"},
                    {"t": "اسمع على التليفون", "v": "الناس كيسمعو من التليفون، ماشي من اللابتوب", "icon": "phone"},
                ],
            },
            {
                "type": "cta",
                "chip": "ابدا اليوم",
                "title": "30 صوت، نبرة لكل مشروع.",
                "sub": "رجال ونساء، بالدارجة، وفي 30 ثانية. 50 نقطة مجانية كي تسجّل.",
                "cta": "sawtify.space",
                "cta_note": "sawtify.space  ·  من 500 دج",
                "guarantees": [
                    {"icon": "user", "t": "30 صوت"},
                    {"icon": "gift", "t": "50 نقطة"},
                    {"icon": "shield", "t": "حقوق تجارية"},
                ],
            },
        ],
    },
]


# ── Rendu ─────────────────────────────────────────────────────────────────
def render(carousel, only_slides=None):
    out = ROOT / "slides" / carousel["slug"]
    out.mkdir(parents=True, exist_ok=True)
    slides = carousel["slides"]
    total = len(slides)
    paths = []

    for i, slide in enumerate(slides, start=1):
        if only_slides and i not in only_slides:
            continue
        dark = slide["type"] in DARK
        ig.set_theme("dark" if dark else "light")
        img = violet_bg(i) if dark else ig.background()

        content = Image.new("RGBA", img.size, (0, 0, 0, 0))
        RENDERERS[slide["type"]](content, slide, i, total)

        top_limit = 176 if dark else 172
        bottom_limit = H - M - 54
        bbox = content.getbbox()
        if bbox:
            c_top, c_bottom = bbox[1] / SS, bbox[3] / SS
            h_content = c_bottom - c_top
            free = bottom_limit - top_limit
            shift = (top_limit + (free - h_content) / 2 - c_top) if h_content < free \
                else max(top_limit - c_top, bottom_limit - c_bottom)
            content = content.transform(content.size, Image.AFFINE, (1, 0, 0, 0, 1, -shift * SS),
                                        resample=Image.BICUBIC)

        layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        layer.alpha_composite(content)
        if dark:
            header_dark(layer, i, total)
            footer_dark(layer, i, total, hint=None if i == total else "اسحب  →")
        else:
            header_light(layer, i, total)
            ig.footer(layer, i, total, hint=None if i == total else "اسحب  →")
        img.alpha_composite(layer)

        path = out / f"{i:02d}.png"
        img.convert("RGB").resize((W, H), Image.LANCZOS).save(path, optimize=True)
        paths.append(path)
        print(f"  ✓ {path.relative_to(ROOT)}")

    if paths:
        thumbs = [Image.open(p).resize((360, 450), Image.LANCZOS) for p in paths]
        cols = min(3, len(thumbs))
        rows = math.ceil(len(thumbs) / cols)
        sheet = Image.new("RGB", (cols * 360 + (cols + 1) * 16, rows * 450 + (rows + 1) * 16), (14, 10, 24))
        for k, t in enumerate(thumbs):
            sheet.paste(t, (16 + (k % cols) * (360 + 16), 16 + (k // cols) * (450 + 16)))
        sheet.save(out / "contact-sheet.png", optimize=True)
        print(f"  ✓ {(out / 'contact-sheet.png').relative_to(ROOT)}")


def main():
    ap = argparse.ArgumentParser(description="Carrousels Instagram Sawtify — série premium")
    ap.add_argument("--only", default=None, help="3, 4 ou 5")
    ap.add_argument("--slides", default=None, help="ex: 1,6")
    args = ap.parse_args()

    selection = CARROUSELS
    if args.only:
        sel = args.only.strip()
        selection = [c for c in CARROUSELS if c["slug"].startswith(sel.zfill(2))]
        if not selection:
            raise SystemExit(f"Carrousel {args.only} introuvable")
    only = {int(x) for x in args.slides.split(",")} if args.slides else None

    for c in selection:
        print(f"\n▶ {c['name']}")
        render(c, only)


if __name__ == "__main__":
    main()
