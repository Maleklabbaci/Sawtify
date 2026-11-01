#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════
 collage.py — carrousels « collage éditorial » : 4 slides qui se répondent
───────────────────────────────────────────────────────────────────────────
 Direction artistique (inspirée des collages de référence) :
   • typographie ÉNORME qui touche les bords, parfois coupée par le cadre
   • aplats de marque francs (violet, crème, encre) + orange en accent
   • jamais de vide : filets, chiffres géants, texture grain, halftone
   • la mascotte Sawtify est traitée comme un sujet photographique :
     découpée, tournée, recadrée, elle TRAVERSE les 4 slides
   • aucun visuel généré : que du dessin vectoriel + type + texture
     → aucun « look IA »

 Le lien entre les slides (le point clé) :
   1. une flèche orange SORT à droite de la slide N et RENTRE à gauche
      de la slide N+1, à la même hauteur → on lit le geste en continu
   2. la frise du bas (4 segments) avance à chaque slide
   3. la mascotte se déplace de gauche à droite au fil des 4 slides
   4. la dernière ligne de la slide N est la première de la slide N+1
      (chaîne de mots : la phrase continue)

   python3 collage.py            # les 4 publications (16 slides)
   python3 collage.py --only 2   # une seule
═══════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

import premium as px
import premium_fx as fx
import sawtify_ig as ig
from sawtify_ig import (AR_BOLD, AR_REG, AR_SEMI, LATIN_BOLD, LATIN_MED, M, SS,
                        W, H, ar_para, font, rrect, visual)

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "slides" / "collage"
R = W - M

# ── palette de marque ──────────────────────────────────────────────────────
VIOLET = (124, 45, 200)
DEEP = (52, 20, 104)
INK = (17, 11, 26)
CREAM = (250, 246, 238)
PAPER = (238, 231, 244)
ORANGE = (255, 100, 44)
HI = (255, 178, 120)
MUTED = (150, 132, 172)
INK_MUTED = (104, 86, 128)


# ═══════════════════════════════════════════════════════════════════════════
#  Outils de dessin
# ═══════════════════════════════════════════════════════════════════════════
def _fit_ar(base, text, max_w, size, font_name=AR_BOLD, floor=30):
    d = ImageDraw.Draw(base)
    plain = text.replace("**", "")
    while size > floor and d.textlength(visual(plain), font=font(font_name, size)) / SS > max_w:
        size -= 2
    return size


def _fit_lat(base, text, max_w, size, font_name=LATIN_BOLD, floor=20):
    d = ImageDraw.Draw(base)
    while size > floor and d.textlength(text, font=font(font_name, size)) / SS > max_w:
        size -= 2
    return size


def big_lines(base, lines, x_right, y, size, color, max_w, hi=ORANGE,
              leading=1.06, align="right", font_name=AR_BOLD):
    """Bloc d'accroche : chaque ligne est ajustée pour tenir en entier."""
    for ln in lines:
        sz = _fit_ar(base, ln, max_w, size, font_name)
        xr = x_right if align == "right" else W - x_right
        y = ar_para(base, xr, y, ln, sz, font_name, color,
                    max_w=max_w, align=align, leading=leading, hi_color=hi)
        y += sz * 0.16
    return y


def kicker(base, text, x_right, y, color, dark=True, size=17):
    """Petit label capitales, précédé d'un carré orange."""
    d = ImageDraw.Draw(base)
    f = font(LATIN_BOLD, size) if not ig.ARABIC_RE.search(text) else font(AR_SEMI, size + 3)
    shown = visual(text)
    tw = d.textlength(shown, font=f) / SS
    rrect(base, (x_right - 14, y - 5, x_right - 4, y + 5), 1, fill=(*ORANGE, 255))
    d.text(((x_right - 24) * SS, (y + 1) * SS), shown, font=f,
           fill=color, anchor="rm")
    return y + 26


def pill(base, x_right, y, text, size=22, fill=(255, 255, 255), color=INK,
         outline=None, h=None, padx=26):
    d = ImageDraw.Draw(base)
    f = font(AR_SEMI if ig.ARABIC_RE.search(text) else LATIN_BOLD, size)
    shown = visual(text)
    tw = d.textlength(shown, font=f) / SS
    hh = h or max(48, size * 1.9)
    x0 = x_right - tw - padx * 2
    rrect(base, (x0, y, x_right, y + hh), hh / 2, fill=fill, outline=outline, width=1.2)
    d.text(((x0 + tw / 2 + padx) * SS, (y + hh / 2 + 1) * SS), shown, font=f,
           fill=color, anchor="mm")
    return x0


def star(base, cx, cy, r, color, spokes=8, width=16, rot=0.0):
    """Astérisque graphique (le motif des collages)."""
    d = ImageDraw.Draw(base)
    for k in range(spokes):
        a = rot + k * math.pi / spokes
        d.line([(cx * SS, cy * SS),
                ((cx + math.cos(a) * r) * SS, (cy + math.sin(a) * r) * SS)],
               fill=color, width=int(width * SS))


def tape(base, cx, cy, w, h, rot, color=(255, 255, 255), alpha=255, shadow=True):
    """Bande de scotch / bandeau incliné."""
    layer = Image.new("RGBA", (int(w * SS), int(h * SS)), (0, 0, 0, 0))
    ImageDraw.Draw(layer).rectangle([0, 0, layer.size[0], layer.size[1]], fill=(*color, alpha))
    layer = layer.rotate(rot, expand=True, resample=Image.BICUBIC)
    if shadow:
        sh = Image.new("RGBA", layer.size, (0, 0, 0, 0))
        sh.paste((0, 0, 0, 60), (0, 0), layer)
        sh = sh.filter(ImageFilter.GaussianBlur(10 * SS))
        base.alpha_composite(sh, (int((cx - layer.width / SS / 2 + 8) * SS),
                                  int((cy - layer.height / SS / 2 + 16) * SS)))
    base.alpha_composite(layer, (int((cx - layer.width / SS / 2) * SS),
                                 int((cy - layer.height / SS / 2) * SS)))


def mascot(base, cx, cy, size, rot=0.0, alpha=255):
    """La mascotte, posée comme un sujet photo : tournée et parfois coupée."""
    im = px.logo(int(size))
    if abs(rot) > 0.1:
        im = im.rotate(rot, expand=True, resample=Image.BICUBIC)
    if alpha < 255:
        a = im.getchannel("A").point(lambda v: int(v * alpha / 255))
        im = im.copy()
        im.putalpha(a)
    base.alpha_composite(im, (int((cx - im.width / 2) * SS), int((cy - im.height / 2) * SS)))


def edge_arrow(base, side, y, color=ORANGE, size=54, width=13):
    """Flèche qui sort du cadre (droite) ou qui rentre (gauche) : le lien."""
    d = ImageDraw.Draw(base)
    if side == "right":
        x0, x1 = W - 96, W + 26
        d.line([(x0 * SS, y * SS), (x1 * SS, y * SS)], fill=color, width=int(width * SS))
        d.line([(x1 * SS, y * SS), ((x1 - size * .8) * SS, (y - size * .55) * SS)],
               fill=color, width=int(width * SS))
        d.line([(x1 * SS, y * SS), ((x1 - size * .8) * SS, (y + size * .55) * SS)],
               fill=color, width=int(width * SS))
    else:
        d.line([(-26 * SS, y * SS), (66 * SS, y * SS)], fill=color, width=int(width * SS))
        d.line([(66 * SS, y * SS), ((66 - size * .8) * SS, (y - size * .55) * SS)],
               fill=color, width=int(width * SS))
        d.line([(66 * SS, y * SS), ((66 - size * .8) * SS, (y + size * .55) * SS)],
               fill=color, width=int(width * SS))


def progress(base, idx, total, dark=True, y=1284):
    """Frise de 4 segments : celui du jour est plein, les autres s'éteignent."""
    gap = 10
    seg = (W - 2 * M - gap * (total - 1)) / total
    for k in range(total):
        x0 = M + k * (seg + gap)
        on = k <= idx
        fill = (ORANGE if k == idx else
                (255, 255, 255, 120) if dark else (26, 15, 46, 100))
        if not on:
            fill = (255, 255, 255, 34) if dark else (26, 15, 46, 26)
        rrect(base, (x0, y, x0 + seg, y + (5 if k == idx else 3)), 3, fill=fill)


def top_bar(base, left, idx, total, dark=True, y=68):
    """Bandeau : chapitre à droite, numéro + logo à gauche."""
    d = ImageDraw.Draw(base)
    col = (255, 255, 255) if dark else INK
    soft = (255, 255, 255, 170) if dark else (74, 40, 120)
    px.logo_lockup(base, R, y, size=30)
    f = font(LATIN_BOLD, 16)
    d.text((M * SS, (y + 26) * SS), f"{idx + 1:02d}/{total:02d}", font=f, fill=col, anchor="lm")
    fk = font(AR_SEMI, 19) if ig.ARABIC_RE.search(left) else font(LATIN_BOLD, 16)
    d.text(((M + 62) * SS, (y + 26) * SS), visual(left), font=fk, fill=soft, anchor="lm")


def side_label(base, text, dark=True, x=30, cy=690, size=15):
    """Micro-label vertical sur la marge gauche (grain éditorial)."""
    col = (255, 255, 255, 150) if dark else (74, 40, 120, 140)
    layer = Image.new("RGBA", (int(420 * SS), int(60 * SS)), (0, 0, 0, 0))
    ImageDraw.Draw(layer).text((10 * SS, 30 * SS), text, font=font(LATIN_BOLD, size),
                               fill=col, anchor="lm")
    layer = layer.rotate(90, expand=True, resample=Image.BICUBIC)
    base.alpha_composite(layer, (int(x * SS), int((cy - layer.height / SS / 2) * SS)))


def grain(base, amount=0.07):
    fx.grain(base, amount)


def number_huge(base, text, x, y, size, color, alpha=255, anchor="ls", outline=False):
    d = ImageDraw.Draw(base)
    c = (*color, alpha) if len(color) == 3 else color
    if outline:
        d.text((x * SS, y * SS), text, font=font(LATIN_BOLD, size), fill=None,
               stroke_width=int(2.4 * SS), stroke_fill=c, anchor=anchor)
    else:
        d.text((x * SS, y * SS), text, font=font(LATIN_BOLD, size), fill=c, anchor=anchor)


def body_ar(base, text, x_right, y, size=25, color=INK_MUTED, max_w=None, leading=1.62):
    return ar_para(base, x_right, y, text, size, AR_REG, color,
                   max_w=max_w or (W - 2 * M), leading=leading, hi_color=ORANGE)


# ═══════════════════════════════════════════════════════════════════════════
#  Fonds
# ═══════════════════════════════════════════════════════════════════════════
def bg_violet(seed=1, deep=DEEP, top=(150, 62, 226)):
    img = ig.gradient((ig.CW, ig.CH), top, deep).convert("RGBA")
    fx.halftone(img, W - 60, 150, 420, alpha=26)
    fx.dotgrid(img, 56, (255, 255, 255), alpha=14, box=(0, 0, W, H))
    return img


def bg_cream(seed=1):
    img = Image.new("RGBA", (ig.CW, ig.CH), (*CREAM, 255))
    fx.halftone(img, 90, H - 60, 380, color=(74, 22, 130), alpha=26)
    fx.rule_grid(img, 90, (74, 22, 130), alpha=14)
    return img


def bg_ink(seed=1):
    img = ig.gradient((ig.CW, ig.CH), (34, 24, 48), (10, 7, 16)).convert("RGBA")
    fx.halftone(img, 120, 120, 380, alpha=24)
    fx.dotgrid(img, 54, (255, 255, 255), alpha=12, box=(0, 0, W, H))
    return img


# ═══════════════════════════════════════════════════════════════════════════
#  Les 4 mises en page — chacune « continue » la précédente
# ═══════════════════════════════════════════════════════════════════════════
def slide_hook(base, s, idx, total, chapter):
    """1/4 — plein cadre : l'accroche, la bande crème, la mascotte qui entre."""
    top_bar(base, chapter, idx, total, dark=True)
    kicker(base, s["kicker"], R, 152, HI, size=18)

    y = big_lines(base, s["lines"], R, 232, 104, (255, 255, 255), W - 2 * M, hi=HI)
    y = body_ar(base, s["promise"], R, y + 24, 26, (238, 228, 255), max_w=W - 2 * M - 140)

    # bande crème pleine largeur (le « scotch » des collages)
    band_y = max(y + 42, 726)
    rrect(base, (-40, band_y, W + 40, band_y + 96), 0, fill=(*CREAM, 255))
    rrect(base, (-40, band_y + 96, W + 40, band_y + 100), 0, fill=(*ORANGE, 255))
    d = ImageDraw.Draw(base)
    d.text(((R - 6) * SS, (band_y + 48) * SS), visual(s["band"]), font=font(AR_BOLD, 40),
           fill=(*VIOLET, 255), anchor="rm")
    star(base, 486, band_y + 48, 38, (*ORANGE, 255), spokes=8, width=12, rot=0.35)

    # la mascotte : sujet plein cadre, coupé par le bas
    mascot(base, 300, 1148, 580, rot=-8)
    # chiffre fantôme, coupé par le bord droit
    number_huge(base, s["num"], W - 20, 1300, 300, HI, alpha=70, outline=True)

    side_label(base, f"SAWTIFY · {chapter} · {idx + 1}/{total}", dark=True)
    pill(base, W - 40, band_y + 148, "اسحب", size=18, fill=(*ORANGE, 255),
         color=(255, 255, 255))
    edge_arrow(base, "right", band_y + 190)
    progress(base, idx, total, dark=True)
    grain(base, 0.07)


def slide_point(base, s, idx, total, chapter):
    """2/4 — crème : on garde le cadre, on change le rythme."""
    top_bar(base, chapter, idx, total, dark=False)
    edge_arrow(base, "left", 1246, color=VIOLET)

    # énorme chiffre coupé par le bord gauche
    number_huge(base, s["num"], -50, 1082, 430, VIOLET, alpha=40)
    kicker(base, s["kicker"], R, 152, ORANGE, size=18)

    mw = W - 2 * M - 30
    y = big_lines(base, s["lines"], R, 228, 96, INK, mw, hi=VIOLET)
    y = body_ar(base, s["promise"], R, y + 22, 26, INK_MUTED, max_w=mw - 30)

    py = max(y + 70, 706)
    for t in s["items"]:
        pill(base, R, py, t, size=25, fill=(255, 255, 255), color=(74, 22, 130),
             outline=(206, 190, 232), h=58)
        py += 72

    side_label(base, f"SAWTIFY · DARJA DZ · {idx + 1}/{total}", dark=False)
    mascot(base, R - 128, 1186, 300, rot=10)
    star(base, M + 46, 1204, 46, (*VIOLET, 200), spokes=8, width=13, rot=0.2)
    progress(base, idx, total, dark=False)
    grain(base, 0.05)


def slide_proof(base, s, idx, total, chapter):
    """3/4 — encre : la démonstration, dense, technique."""
    top_bar(base, chapter, idx, total, dark=True)
    edge_arrow(base, "right", 706)

    kicker(base, s["kicker"], R, 152, HI, size=18)
    mw = W - 2 * M
    y = big_lines(base, s["lines"], R, 228, 92, (255, 255, 255), mw, hi=ORANGE)
    y = body_ar(base, s["promise"], R, y + 18, 25, (224, 214, 240), max_w=mw - 90)
    y += 48                                   # bas réel du paragraphe

    # 3 étapes : la hauteur est calculée pour ne jamais toucher le lecteur
    player_y = 1046
    room = y + 14
    n = len(s["steps"])
    step_h = min(118, max(88, (player_y - 26 - room) / n))
    room = (player_y - 26) - step_h * n          # bloc calé en bas, pas de trou
    t_size = 29 if step_h >= 104 else 26
    s_size = 20 if step_h >= 104 else 18
    d = ImageDraw.Draw(base)
    for k, (n, t, sub) in enumerate(s["steps"]):
        by = room + k * step_h
        rrect(base, (M, by, R, by + 1.4), 1, fill=(255, 255, 255, 58))
        d.text((R * SS, (by + step_h * 0.30) * SS), n, font=font(LATIN_BOLD, 30),
               fill=(*ORANGE, 255), anchor="rm")
        d.text(((R - 68) * SS, (by + step_h * 0.26) * SS), visual(t),
               font=font(AR_BOLD, t_size), fill=(255, 255, 255), anchor="rm")
        d.text(((R - 68) * SS, (by + step_h * 0.64) * SS), visual(sub),
               font=font(AR_REG, s_size), fill=MUTED, anchor="rm")
        px.icon(base, "check", M + 20, by + step_h * 0.44, 26, (*ORANGE, 255), 2.4)

    side_label(base, f"SAWTIFY · METHODE · {idx + 1}/{total}", dark=True)
    rrect(base, (M, player_y, R, player_y + 1.4), 1, fill=(255, 255, 255, 58))
    ig.set_theme("light")          # le lecteur est une carte claire
    ig.player_mock(base, M, player_y + 18, W - 2 * M, title_ar="نموذج صوت · دارجة", h=152)
    ig.set_theme("dark")
    progress(base, idx, total, dark=True)
    grain(base, 0.06)


def slide_cta(base, s, idx, total, chapter):
    """4/4 — violet + bandeau crème pleine largeur : on referme la boucle."""
    top_bar(base, chapter, idx, total, dark=True)
    kicker(base, s["kicker"], R, 152, HI, size=18)

    y = big_lines(base, s["lines"], R, 232, 100, (255, 255, 255), W - 2 * M, hi=HI)

    # la mascotte profite du vide à gauche de l'accroche (elle a traversé la série)
    mascot(base, M + 80, y - 46, 158, rot=-12)

    d0 = ImageDraw.Draw(base)
    d0.text((R * SS, (y + 34) * SS), visual("من التيليفون، اليوم — بلا انتظار"),
            font=font(AR_REG, 24), fill=(232, 222, 250), anchor="rm")

    # ── les 3 garanties, en lignes pleine largeur (rythme éditorial)
    band_top = 972
    g_bot = band_top - 26
    n = len(s["guarantees"])
    step = min(62, max(46, (g_bot - (y + 92)) / n))
    g_top = g_bot - step * n            # collé au bandeau : jamais de chevauchement
    for k, g in enumerate(s["guarantees"]):
        gy = g_top + k * step
        rrect(base, (M, gy, R, gy + 1.4), 1, fill=(255, 255, 255, 54))
        px.icon(base, "check", R - 30, gy + step * 0.52, 30, (*HI, 255), 2.4)
        d0.text(((R - 68) * SS, (gy + step * 0.52) * SS), visual(g),
                font=font(AR_SEMI, 28), fill=(255, 255, 255), anchor="rm")

    # ── bandeau crème : prix + bouton + note (pleine largeur, collé en bas)
    rrect(base, (-40, band_top, W + 40, H + 40), 0, fill=(*CREAM, 255))
    rrect(base, (-40, band_top, W + 40, band_top + 6), 0, fill=(*ORANGE, 255))

    d = ImageDraw.Draw(base)
    d.text(((R - 6) * SS, (band_top + 84) * SS), "500 دج", font=font(AR_BOLD, 62),
           fill=(*VIOLET, 255), anchor="rm")
    d.text(((R - 8) * SS, (band_top + 122) * SS), visual("بلا التزام · جودة ستوديو"),
           font=font(AR_REG, 21), fill=(128, 108, 152), anchor="rm")
    px.icon(base, "mic", M + 26, band_top + 78, 52, (*ORANGE, 255), 2.8)

    btn_y = band_top + 164
    px.button(base, M, btn_y, W - 2 * M, 96, s["cta"], style="violet")
    d.text(((W / 2) * SS, (btn_y + 124) * SS), visual(s["note"]), font=font(AR_REG, 20),
           fill=(128, 108, 152), anchor="mm")

    star(base, M + 24, band_top - 34, 34, (*HI, 255), spokes=8, width=11, rot=0.3)
    progress(base, idx, total, dark=False, y=1318)
    grain(base, 0.06)


LAYOUTS = [slide_hook, slide_point, slide_proof, slide_cta]
BACKGROUNDS = [bg_violet, bg_cream, bg_ink, bg_violet]


# ═══════════════════════════════════════════════════════════════════════════
#  Les 4 publications
# ═══════════════════════════════════════════════════════════════════════════
def S(kind, **kw):
    kw["kind"] = kind
    return kw


PUBS = [
    {
        "slug": "collage-01-ad-qui-vend",
        "numero": "01",
        "chapter": "الإعلان اللي يبيع",
        "slides": [
            S("hook", kicker="سلسلة · 01/04", num="90",
              lines=["**90%** من الإعلانات", "ما يشوفهاش", "حتى واحد**.**"],
              promise="4 slides، و كيفاش تخرج من هاد الرقم.",
              band="الغلطة ماهيش في المنتوج"),
            S("point", kicker="بلا لف و دوران", num="3",
              lines=["الغلطة في", "**أول 3 ثواني**.", "ماشي في الصورة**.**"],
              promise="3 حوايج كافيين باش الناس توقف على إعلانك:",
              items=["بلا ميكرو", "بلا مونتاج", "صوت دارجة"]),
            S("proof", kicker="كيفاش دير", num="2",
              lines=["سكريبت 20 كلمة،", "و **صوت**،", "و يتباع."],
              promise="هاد الشي كامل من التيليفون، بلا ستوديو:",
              steps=[("01", "كتب 20 كلمة", "بلا مقدمة، ادخل ديركت"),
                     ("02", "اختار نبرة دارجة", "3 نبرات، وحدة فيهم تبيع"),
                     ("03", "حمّل الفيديو", "من 500 دج، بلا ميكرو")]),
            S("cta", kicker="الخطوة الجاية", tag="PREMIUM · DZ", ticket="كامل هاد الشي من التيليفون:",
              lines=["دير إعلانك", "في **5 دقايق.**"],
              guarantees=["بلا ميكرو، بلا مونتاج", "صوت دارجة أصلي", "من 500 دج · بلا التزام"],
              cta="ابدأ درك", note="sawtify.space · دارجة جزائرية"),
        ],
    },
    {
        "slug": "collage-02-trois-voix",
        "numero": "02",
        "chapter": "الصوت اللي يبيع",
        "slides": [
            S("hook", kicker="سلسلة · 02/04", num="3",
              lines=["واحد المنتوج.", "**3 نبرات**.", "وحدة برك تبيع**.**"],
              promise="شحال من مرة بدّلت الصوت و ما عرفتش علاش؟",
              band="النبرة ماهيش تفصيل"),
            S("point", kicker="تشخيص", num="2",
              lines=["النبرة الغالطة", "تخسّر **العميل**", "قبل ما يفهم**.**"],
              promise="3 علامات يقولوك بلي النبرة ماهيش في بلاصتها:",
              items=["صوت باهت في الأول", "إيقاع سريع بزّاف", "فصحى في إعلان شعبي"]),
            S("proof", kicker="الحل", num="0",
              lines=["النبرة الصحيحة", "= **ثقة**", "في 3 ثواني**.**"],
              promise="3 نبرات جاهزة، كل واحدة لجمهور مختلف:",
              steps=[("01", "نبرة قريبة", "للمحتوى اليومي و الستوري"),
                     ("02", "نبرة معلنة", "للإعلان اللي يبيع"),
                     ("03", "نبرة هادية", "للشرح و التعليم")]),
            S("cta", kicker="الخطوة الجاية", tag="3 VOIX · DARJA", ticket="3 نبرات، و تسمع الفرق ديركت:",
              lines=["لقا النبرة", "ديالك **درك.**"],
              guarantees=["3 نبرات، جمهور لكل وحدة", "تجربة قبل ما تخلّص", "من 500 دج · بلا التزام"],
              cta="جرّب النبرات", note="sawtify.space · تسمع الفرق ديركت"),
        ],
    },
    {
        "slug": "collage-03-script-50-mots",
        "numero": "03",
        "chapter": "سكريبت في 50 كلمة",
        "slides": [
            S("hook", kicker="سلسلة · 03/04", num="50",
              lines=["**50** كلمة.", "هاك السكريبت", "اللي يبيع**.**"],
              promise="ماشي محاضرة، ماشي مقدمة. 50 كلمة و صافي.",
              band="السكريبت هو نصف الإعلان"),
            S("point", kicker="قاعدة", num="1",
              lines=["بلا **مقدمة**.", "بلا تعريف.", "ادخل ديركت**.**"],
              promise="أول جملة لازم تكون وحدة من هادو:",
              items=["سؤال يوجع", "رقم صادم", "وعد في 3 ثواني"]),
            S("proof", kicker="الهيكل", num="3",
              lines=["3 جمل،", "و **صوت**،", "و يجي التصوير**.**"],
              promise="الهيكل اللي كنستعملو في كل إعلان:",
              steps=[("01", "جملة الألم", "شنو يوجع العميل اليوم"),
                     ("02", "جملة الحل", "شنو تبدّل عندو"),
                     ("03", "جملة الحركة", "واش يدير درك")]),
            S("cta", kicker="الخطوة الجاية", tag="SCRIPT · 50 MOTS", ticket="الهيكل جاهز، و الصوت علينا:",
              lines=["انسخ الهيكل.", "و خلّي **الصوت**", "يدير الباقي."],
              guarantees=["هيكل 3 جمل، جاهز للنسخ", "صوت دارجة في 30 ثانية", "بلا مونتاج، بلا ميكرو"],
              cta="خود السكريبت", note="sawtify.space · دارجة جزائرية"),
        ],
    },
    {
        "slug": "collage-04-cinq-minutes",
        "numero": "04",
        "chapter": "من الفكرة للفيديو",
        "slides": [
            S("hook", kicker="سلسلة · 04/04", num="5",
              lines=["**5 دقايق**.", "من الفكرة", "للفيديو**.**"],
              promise="بلا فريق، بلا ستوديو، بلا عذر.",
              band="الوقت اللي كان يضيع"),
            S("point", kicker="قبل", num="3",
              lines=["لي كان ياخد", "**3 أيام**،", "درك ياخد قهوة**.**"],
              promise="واش تبدّل بالضبط:",
              items=["بلا تصوير", "بلا مونتاج", "بلا انتظار"]),
            S("proof", kicker="الطريقة", num="3",
              lines=["3 خطوات", "و الفيديو", "**واجد.**"],
              promise="من التيليفون، و في نفس اليوم:",
              steps=[("01", "كتب السكريبت", "20 كلمة كافيين"),
                     ("02", "اختار الصوت", "دارجة، 3 نبرات"),
                     ("03", "حمّل و انشر", "1080×1350، جاهز")]),
            S("cta", kicker="الخطوة الجاية", tag="5 MIN · DZ", ticket="بلا فريق، بلا ستوديو، بلا عذر:",
              lines=["اليوم، ماشي", "**غدوة.**"],
              guarantees=["من التيليفون مباشرة", "نفس جودة الستوديو", "من 500 دج · بلا التزام"],
              cta="ابدأ درك", note="sawtify.space · من الجزائر"),
        ],
    },
]


# ═══════════════════════════════════════════════════════════════════════════
#  Rendu
# ═══════════════════════════════════════════════════════════════════════════
def contact_sheet(files, out: Path, cols=4, thumb=(300, 375)):
    tw, th = thumb
    rows = math.ceil(len(files) / cols)
    sheet = Image.new("RGB", (cols * tw + (cols + 1) * 16, rows * th + (rows + 1) * 16),
                      (12, 9, 18))
    for k, p in enumerate(files):
        im = Image.open(p).convert("RGB")
        im.thumbnail((tw, th), Image.LANCZOS)
        x = 16 + (k % cols) * (tw + 16)
        y = 16 + (k // cols) * (th + 16)
        sheet.paste(im, (x + (tw - im.width) // 2, y + (th - im.height) // 2))
    sheet.save(out, optimize=True, quality=92)
    return out


def render_pub(pub: dict) -> list[Path]:
    folder = OUT / pub["slug"]
    folder.mkdir(parents=True, exist_ok=True)
    total = len(pub["slides"])
    paths = []
    for i, s in enumerate(pub["slides"]):
        img = BACKGROUNDS[i % 4](i + 1)
        LAYOUTS[i % 4](img, s, i, total, pub["chapter"])
        path = folder / f"{i + 1:02d}.png"
        img.convert("RGB").resize((W, H), Image.LANCZOS).save(path, optimize=True)
        paths.append(path)
        print(f"  ✓ {path.relative_to(ROOT)}")
    contact_sheet(paths, folder / "contact-sheet.jpg", cols=4, thumb=(300, 375))
    print(f"  ✓ {(folder / 'contact-sheet.jpg').relative_to(ROOT)}")
    return paths


def main() -> int:
    ap = argparse.ArgumentParser(description="Carrousels collage 4 slides liés")
    ap.add_argument("--only", default=None, help="1 … 4")
    args = ap.parse_args()
    pubs = PUBS
    if args.only:
        pubs = [p for p in PUBS if p["numero"] == args.only.zfill(2)]
        if not pubs:
            raise SystemExit(f"Publication {args.only} introuvable")
    for p in pubs:
        print(f"▶ {p['numero']} · {p['chapter']}")
        render_pub(p)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
