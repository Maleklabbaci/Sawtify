#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════
 carousel.py — carrousels Sawtify : VRAIS carrousels liés, 4 à 8 slides

 Différence avec les versions précédentes :
   • palette EXACTE de la plateforme (blanc #faf9ff, violet #6d28d9,
     violet clair #8b5cf6, lilas #ede9fe, encre #1a0f2e, aura #ff5e3a)
   • longueur variable : 4, 5, 6, 7 ou 8 slides selon la publication
   • les slides sont LIÉES pour de vrai :
       – une photo continue : le cadre glisse verticalement d'une slide à
         l'autre sur la MÊME image (effet de défilement continu)
       – un fil vertical à gauche + pastilles de progression (k/n)
       – une phrase de liaison qui traverse la bande du bas
       – le gros numéro d'étape qui grandit 01 → 02 → …
   • 4 mises en page de couverture, 4 de clôture, et des slides
     intermédiaires toutes différentes (constat, étape, citation).

   python3 carousel.py                 # les 30 publications
   python3 carousel.py --only 07       # une seule
═══════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import argparse
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from sawtify_ig import SS, W, H, font, rrect, visual
from workshop import (ANTON, CAIRO, CAIRO_B, CAIRO_M, M, MONO, PF_IT, PHOTOS,
                      ar, ar_fit, arrow, fibers, halftone, ink_blob, lat,
                      paper_noise, photo, rule, scotch, sticker, tick, wave)

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "slides" / "carousel"
R = W - M

# ── palette de la plateforme Sawtify (src/index.css) ─────────────────────
P_VIO = (109, 40, 217)      # #6d28d9  violet principal
P_VIO_L = (139, 92, 246)    # #8b5cf6  violet clair (hover / accents)
P_LILA = (237, 233, 254)    # #ede9fe  lilas
P_PAPER = (245, 243, 255)   # #f5f3ff
P_WHITE = (250, 249, 255)   # #faf9ff  fond de l'app
P_INK = (26, 15, 46)        # #1a0f2e  encre
P_DEEP = (46, 16, 101)      # #2e1065  violet profond
P_AURA = (255, 94, 58)      # #ff5e3a  aura (bulle de voix)

PALETTES = {
    "violet": dict(bg=P_VIO, txt=P_WHITE, soft=P_LILA, accent=P_VIO_L, dk=P_DEEP),
    "encre": dict(bg=P_INK, txt=P_WHITE, soft=P_LILA, accent=P_VIO_L, dk=(10, 6, 18)),
    "blanc": dict(bg=P_WHITE, txt=P_INK, soft=(124, 108, 156), accent=P_VIO, dk=P_DEEP),
    "lilas": dict(bg=P_LILA, txt=P_INK, soft=P_VIO, accent=P_VIO, dk=P_DEEP),
    "profond": dict(bg=P_DEEP, txt=P_WHITE, soft=P_LILA, accent=P_VIO_L, dk=P_INK),
}

SEQUENCES = [
    ["blanc", "violet", "blanc", "encre", "violet", "blanc", "profond", "violet"],
    ["violet", "lilas", "encre", "blanc", "violet", "lilas", "encre", "blanc"],
    ["encre", "blanc", "lilas", "violet", "blanc", "encre", "lilas", "violet"],
    ["blanc", "lilas", "violet", "blanc", "encre", "violet", "lilas", "blanc"],
]

DUOS = [((46, 16, 101), (237, 233, 254)),   # violet profond / lilas
        ((26, 15, 46), (250, 249, 255)),    # encre / blanc
        ((20, 12, 32), (196, 181, 253))]    # noir / violet pâle

_SCRATCH = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))


# ═══════════════════════════════════════════════════════════════════════════
#  outils
# ═══════════════════════════════════════════════════════════════════════════
def light(pal) -> bool:
    return sum(pal["bg"]) > 480


def duo(pal, k=0):
    return DUOS[k % len(DUOS)]


def ground(pal, seed=1, noise=13, ht=None):
    base = Image.new("RGBA", (W * SS, H * SS), (*pal["bg"], 255))
    # sur fond clair, un grain trop fort salit le blanc de la plateforme
    paper_noise(base, noise * (0.4 if light(pal) else 1.0), 1.0)
    fibers(base, (0, 0, 0) if light(pal) else (255, 255, 255), 210, 10)
    if ht:
        box, step, alpha = ht
        halftone(base, box, step, alpha=alpha,
                 color=pal["dk"] if light(pal) else (255, 255, 255))
    return base


def ink_txt(pal):
    """(forte, douce) pour du texte posé sur du papier du même ton."""
    return (P_INK, (124, 108, 156)) if light(pal) else ((28, 18, 44), (120, 104, 148))


def paper_tone(pal):
    """Le papier doit se voir : lilas sur fond clair, blanc sur fond soutenu."""
    return P_LILA if light(pal) else P_WHITE


def num_col(pal):
    """Le gros numéro ne doit jamais se fondre dans son fond."""
    return P_LILA if pal["bg"] == P_VIO else pal["accent"]


def rule_col(pal):
    return (*pal["txt"], 110) if not light(pal) else (124, 108, 156, 110)


def ar_h(text, size, max_w, fname=CAIRO, leading=1.28) -> float:
    return ar(_SCRATCH, text, R, 0, size, P_INK, fname, max_w=max_w,
              leading=leading) + 26


def head(base, lines, x_right, y, size, pal, hi=None, max_w=None, leading=1.12):
    max_w = max_w or (W - 2 * M)
    yy = y
    for ln in lines:
        s = min(size, ar_fit(base, ln, max_w, size))
        yy = ar(base, ln, x_right, yy, s, pal["txt"], CAIRO, max_w=max_w,
                leading=leading, hi_color=hi or pal["accent"]) + 6
    return yy


def paste(base, layer, x, y, shadow=110, blur=9, rot=0.0):
    if rot:
        layer = layer.rotate(rot, expand=True, resample=Image.BICUBIC)
    if shadow:
        sh = Image.new("RGBA", layer.size, (0, 0, 0, 0))
        sh.paste((0, 0, 0, shadow), (0, 0), layer)
        sh = sh.filter(ImageFilter.GaussianBlur(blur * SS))
        base.alpha_composite(sh, (int((x + 7) * SS), int((y + 11) * SS)))
    base.alpha_composite(layer, (int(x * SS), int(y * SS)))


def slip(w, h, tone=P_WHITE, seed=3, deckle=True):
    s = Image.new("RGBA", (int(w * SS), int(h * SS)), (0, 0, 0, 0))
    d = ImageDraw.Draw(s)
    d.rectangle([0, 0, s.width, s.height], fill=(*tone, 255))
    if deckle:
        rnd = random.Random(seed)
        for _ in range(int(w * h / 1100)):
            d.point((rnd.randint(0, s.width - 1), rnd.randint(0, s.height - 1)),
                    fill=(*tone, 90))
    return s


def perforate(s, step=26, r=9):
    d = ImageDraw.Draw(s)
    for ex in range(0, s.width, step):
        d.ellipse([ex, -r * SS, ex + step * SS, r * SS], fill=(0, 0, 0, 0))
        d.ellipse([ex, s.height - r * SS, ex + step * SS, s.height + r * SS],
                  fill=(0, 0, 0, 0))


# ── les liens entre slides ────────────────────────────────────────────────
def num_dot(base, k, n, pal, x=None, y=96):
    """Compteur 01/07 — même place sur toutes les slides."""
    x = x if x is not None else R - 2
    col = pal["txt"] if light(pal) else P_WHITE
    soft = pal["soft"] if not light(pal) else (124, 108, 156)
    lat(base, f"{k + 1:02d}", x, y, 32, col, ANTON, anchor="rs")
    d = ImageDraw.Draw(base)
    d.text(((x + 6) * SS, (y - 4) * SS), f"/{n:02d}", font=font(MONO, 16),
           fill=(*soft, 170), anchor="ls")


def thread(base, k, n, pal, x=34):
    """Le fil vertical + les pastilles : on voit le carrousel avancer."""
    col = pal["soft"] if not light(pal) else (196, 181, 253)
    d = ImageDraw.Draw(base)
    d.rectangle([x * SS, 150 * SS, (x + 2.4) * SS, (H - 150) * SS],
                fill=(*col, 120))
    step = (H - 300) / max(1, n - 1)
    for i in range(n):
        cy = 150 + i * step
        if i <= k:
            d.ellipse([(x - 6) * SS, (cy - 6) * SS, (x + 9) * SS, (cy + 9) * SS],
                      fill=(*pal["accent"], 255))
        else:
            d.ellipse([(x - 4) * SS, (cy - 4) * SS, (x + 7) * SS, (cy + 7) * SS],
                      fill=(*col, 170))


def swipe_hint(base, pal, x_right=None, y=1298, label="اسحب"):
    col = pal["soft"] if not light(pal) else (124, 108, 156)
    ar(base, label, x_right if x_right else R - 2, y - 30, 22, col, CAIRO_M)
    arrow(base, R - 118, y + 10, R + 24, y + 10, pal["accent"], 6, 18)


# ── la photo continue : même image, cadre qui glisse ──────────────────────
def pano(base, name, box, k, n, seed=0, k_duo=0, torn=(False, False, True, True),
         shadow=0, zoom=2.3, t0=0.18, t1=0.80):
    """Cadre qui descend dans la MÊME photo d'une slide à l'autre."""
    t = t0 + (t1 - t0) * (k / max(1, n - 1))
    photo(base, name, box, rot=0.0, seed=seed, shadow=shadow,
          duotone=duo(k_duo), torn=torn, rough=11, zoom=zoom,
          focus=0.5, focus_y=t)


# ═══════════════════════════════════════════════════════════════════════════
#  COUVERTURES (4)
# ═══════════════════════════════════════════════════════════════════════════
def cov_hero(s, pal, k, n, seed=0, photo_name="studio-voice.jpg"):
    base = ground(pal, seed, 10)
    pano(base, photo_name, (-40, -70, W + 40, 880), k, n, seed=31 + seed,
         torn=(False, False, True, True))
    d = ImageDraw.Draw(base)
    d.rectangle([0, 870 * SS, W * SS, H * SS], fill=(*pal["bg"], 255))
    paper_noise(base, 11, 1.0)
    light_lbl = P_WHITE if not light(pal) else P_INK
    lat(base, "SAWTIFY", M - 6, 84, 18, light_lbl, MONO, anchor="ls")
    num_dot(base, k, n, pal)
    head(base, s["lines"], R, 920, 82, pal, max_w=860)
    y = 1150
    if s.get("promise"):
        ar(base, s["promise"], R, y, 24, pal["soft"] if not light(pal) else (124, 108, 156),
           CAIRO_M, max_w=780)
    swipe_hint(base, pal)
    return base


def cov_type(s, pal, k, n, seed=0, photo_name="studio-voice.jpg"):
    """Aplat + typo, sans photo : le premier slide respire."""
    base = ground(pal, seed, 14, ht=((0, 0, W, 430), 9.2, 22))
    d = ImageDraw.Draw(base)
    d.rectangle([0, 424 * SS, W * SS, 431 * SS], fill=(*pal["accent"], 255))
    ink_blob(base, 250, 230, 170, pal["accent"], 22)
    lat(base, "SAWTIFY", M - 6, 92, 18, pal["txt"], MONO, anchor="ls")
    num_dot(base, k, n, pal)
    y = head(base, s["lines"], R, 500, 100, pal, leading=1.06)
    rule(base, M, R, y + 24, pal["txt"], 2.4, 180)
    if s.get("promise"):
        ar(base, s["promise"], R, y + 58, 26, pal["soft"] if not light(pal) else (124, 108, 156),
           CAIRO_M, max_w=820)
    if s.get("sticker"):
        sticker(base, s["sticker"], 250, 200, 120, pal["accent"], P_WHITE, rot=-11)
    arrow(base, M, 1252, M + 86, 1252, pal["accent"], 8, 24)
    return base


def cov_circle(s, pal, k, n, seed=0, photo_name="studio-voice.jpg"):
    """Photo ronde découpée + accroche."""
    base = ground(pal, seed, 13, ht=((0, 880, W, H), 10, 16))
    cx, cy, r = 660, 400, 300
    disc = Image.new("RGBA", (r * 2 * SS, r * 2 * SS), (0, 0, 0, 0))
    im = Image.open(PHOTOS / photo_name).convert("RGB")
    z = 1.0 + 0.16 * k
    kk = max(disc.width / im.width, disc.height / im.height) * z
    im = im.resize((int(im.width * kk), int(im.height * kk)), Image.LANCZOS)
    im = im.crop(((im.width - disc.width) // 2, (im.height - disc.height) // 2,
                  (im.width + disc.width) // 2, (im.height + disc.height) // 2))
    mask = Image.new("L", disc.size, 0)
    ImageDraw.Draw(mask).ellipse([0, 0, disc.width, disc.height], fill=255)
    disc.paste(im, (0, 0), mask)
    paste(base, disc, cx - r, cy - r, shadow=90, blur=12)
    lat(base, "SAWTIFY", M - 6, 92, 18, pal["txt"], MONO, anchor="ls")
    num_dot(base, k, n, pal)
    y = head(base, s["lines"], R, 770, 82, pal, max_w=960)
    if s.get("promise"):
        ar(base, s["promise"], R, y + 14, 25, pal["soft"] if not light(pal) else (124, 108, 156),
           CAIRO_M, max_w=760)
    if s.get("sticker"):
        sticker(base, s["sticker"], 236, 208, 118, pal["accent"], P_WHITE, rot=-11)
    return base


def cov_stack(s, pal, k, n, seed=0, photo_name="studio-voice.jpg"):
    """Deux bandes photo, la première continue."""
    base = ground(pal, seed, 12)
    pano(base, photo_name, (-50, -80, W + 50, 520), k, n, seed=121 + seed, zoom=2.0,
         torn=(False, False, True, True))
    pool = ["mic-hero.jpg", "phone-hand.jpg", "script-notebook.jpg", "man-studio.jpg"]
    second = pool[(seed + 1) % len(pool)]
    if second == photo_name:
        second = pool[(seed + 2) % len(pool)]
    photo(base, second, (320, 528, W + 40, 940), rot=1.4, seed=131 + seed,
          shadow=18, duotone=duo(seed // 3), torn=(True, False, False, True),
          rough=12, zoom=1.25)
    lat(base, "SAWTIFY", M - 6, 84, 18, pal["txt"], MONO, anchor="ls")
    num_dot(base, k, n, pal)
    fill = P_WHITE if not light(pal) else pal["bg"]
    y = head(base, s["lines"], R, 980, 78, pal, max_w=900)
    if s.get("promise"):
        ar(base, s["promise"], R, y + 12, 24, pal["soft"] if not light(pal) else (124, 108, 156),
           CAIRO_M, max_w=780)
    return base


COVERS = [cov_hero, cov_type, cov_circle, cov_stack]


# ═══════════════════════════════════════════════════════════════════════════
#  SLIDES DU MILIEU
# ═══════════════════════════════════════════════════════════════════════════
def mid_statement(s, pal, k, n, seed=0, photo_name="studio-voice.jpg"):
    """Le constat : phrase forte + photo continue en bandeau bas."""
    base = ground(pal, seed, 12, ht=((0, 0, W, 260), 9.4, 18))
    thread(base, k, n, pal)
    lat(base, "LE CONSTAT" if not light(pal) else "LE CONSTAT", M + 26, 100, 17,
        pal["soft"] if not light(pal) else (124, 108, 156), MONO, anchor="ls")
    num_dot(base, k, n, pal)
    lat(base, s.get("pull", "—"), M + 24, 330, 84, pal["txt"], PF_IT, anchor="ls",
        rot=-1.2)
    y = head(base, s["lines"], R, 372, 46, pal, max_w=W - 2 * M - 40)
    yy = y + 26
    for kk, item in enumerate(s.get("items", [])):
        lat(base, f"{kk + 1}", M + 20, yy + 38, 44, num_col(pal), ANTON, anchor="ls")
        ar(base, item, R - 4, yy, 27, pal["txt"], CAIRO_B, max_w=W - 2 * M - 100)
        rule(base, M + 70, R, yy + 60, pal["txt"], 1.3, 110)
        yy += 88
    pano(base, photo_name, (-60, 1010, W + 60, H + 50), k, n, seed=41 + seed,
         zoom=1.8, torn=(True, True, False, False))
    return base


def mid_item(item, num, pal, k, n, seed=0, photo_name="mic-hero.jpg", total=3):
    """Un constat par slide — 3 mises en page différentes selon le constat."""
    v = (num - 1) % 3
    idx_lbl = f"{num:02d} / {total:02d}"
    base = ground(pal, seed, 13)
    thread(base, k, n, pal)
    num_dot(base, k, n, pal)
    soft = pal["soft"] if not light(pal) else (124, 108, 156)
    lat(base, "LE CONSTAT", M + 26 if v != 2 else R - 6, 100, 17, soft, MONO,
        anchor="ls" if v != 2 else "rs")

    if v == 0:                                     # photo en haut, numéro en bas
        pano(base, photo_name, (M + 24, 190, W - M + 40, 700), k, n,
             seed=51 + seed, t0=0.34, t1=0.56, zoom=1.5,
             k_duo=seed // 3, torn=(True, True, False, True), shadow=20)
        lat(base, f"0{num}", M + 20, 1010, 210, num_col(pal), ANTON, anchor="ls",
            tracking=-6)
        lat(base, idx_lbl, M + 26, 1052, 16, soft, MONO, anchor="ls")
        ar(base, item, R - 6, 880, 40 if len(item) < 46 else 34, pal["txt"], CAIRO_B,
           max_w=W - 2 * M - 250, leading=1.2)
    elif v == 1:                                   # photo en bas, texte en haut
        ar(base, item, R - 6, 170, 46 if len(item) < 46 else 38, pal["txt"], CAIRO_B,
           max_w=W - 2 * M - 60, leading=1.24)
        lat(base, f"0{num}", M + 20, 640, 190, num_col(pal), ANTON, anchor="ls",
            tracking=-6)
        lat(base, idx_lbl, M + 24, 682, 16, soft, MONO, anchor="ls")
        pano(base, photo_name, (M + 24, 700, W - M + 40, H + 50), k, n,
             seed=51 + seed, t0=0.34, t1=0.56, zoom=1.5,
             k_duo=seed // 3, torn=(True, False, True, True), shadow=20)
    else:                                          # photo pleine hauteur à gauche
        pano(base, photo_name, (-60, -40, 540, H + 50), k, n,
             seed=51 + seed, t0=0.34, t1=0.56, zoom=1.6,
             k_duo=seed // 3, torn=(False, True, True, True), shadow=18)
        ar(base, item, R - 6, 200, 38 if len(item) < 46 else 32, pal["txt"], CAIRO_B,
           max_w=W - 580, leading=1.26)
        lat(base, f"0{num}", R - 6, 1080, 170, num_col(pal), ANTON, anchor="rs",
            tracking=-6)
        lat(base, idx_lbl, R - 6, 1120, 16, soft, MONO, anchor="rs")

    swipe_hint(base, pal)
    return base


def mid_steps(steps, pal, k, n, seed=0):
    """La méthode complète : 3 bandes, plus la photo continue en fond."""
    base = ground(pal, seed, 12, ht=((0, 640, W, 800), 9.6, 16))
    thread(base, k, n, pal)
    lat(base, "LA MÉTHODE", M + 26, 100, 17,
        pal["soft"] if not light(pal) else (124, 108, 156), MONO, anchor="ls")
    num_dot(base, k, n, pal)
    y = head(base, ["3 خطوات،"] if len(steps) == 3 else ["خطوات،"], R, 150, 60, pal,
             max_w=900)
    yy = 330
    tone = paper_tone(pal)
    for i, (num, t, sub) in enumerate(steps):
        w_box = W - 2 * M - 60 - i * 26
        x0 = M + 24 + i * 14
        card = slip(w_box, 150, tone, seed=7 + i)
        ImageDraw.Draw(card).rectangle([0, 0, int(7 * SS), card.height],
                                       fill=(*pal["accent"], 255))
        paste(base, card, x0, yy, shadow=80, blur=6, rot=-1.0 + i * 0.8)
        lat(base, num, x0 + 34, yy + 104, 54, pal["accent"], ANTON, anchor="ls")
        ar(base, t, x0 + w_box - 24, yy + 24, 32, P_INK, CAIRO_B, max_w=w_box - 130)
        ar(base, sub, x0 + w_box - 24, yy + 80, 21, (124, 108, 156), CAIRO_M,
           max_w=w_box - 130)
        yy += 186
    pano(base, "mic-hero.jpg", (-60, 980, W + 60, H + 60), k, n, seed=61 + seed,
         zoom=1.9, torn=(True, True, False, False))
    swipe_hint(base, pal, y=930)
    return base


def mid_step(step, k_step, total_steps, pal, k, n, seed=0, photo_name="mic-hero.jpg"):
    """Une étape par slide. Trois compositions qui alternent (photo haut,
    photo bas, photo pleine à droite) : la série reste liée mais ne se répète pas."""
    num, t, sub = step
    base = ground(pal, seed, 12)
    thread(base, k, n, pal)
    lat(base, f"ÉTAPE {k_step + 1}/{total_steps}", M + 26, 100, 17,
        pal["soft"] if not light(pal) else (124, 108, 156), MONO, anchor="ls")
    num_dot(base, k, n, pal)
    mode = k_step % 3

    if mode == 0:                       # photo en haut
        pano(base, photo_name, (M + 24, 180, W - M + 30, 660), k, n, seed=71 + seed,
             t0=0.26, t1=0.40, zoom=1.6, k_duo=seed // 3,
             torn=(True, True, False, True), shadow=18)
        lat(base, num, M + 16, 930, 220, num_col(pal), ANTON, anchor="ls", tracking=-8)
        ar(base, t, R - 4, 760, 44, pal["txt"], CAIRO_B, max_w=W - 2 * M - 230)
        ar(base, sub, R - 4, 836, 25, pal["soft"] if not light(pal) else (124, 108, 156),
           CAIRO_M, max_w=W - 2 * M - 230)
        wave(base, M + 30, 1000, 330, 54, 26, pal["accent"], seed=k + 4)
        swipe_hint(base, pal)
    elif mode == 1:                     # photo en bas
        pano(base, photo_name, (-60, 800, W + 60, H + 40), k, n, seed=72 + seed,
             t0=0.40, t1=0.56, zoom=1.7, k_duo=seed // 3,
             torn=(True, True, False, False), shadow=0)
        ar(base, t, R - 4, 210, 52, pal["txt"], CAIRO_B, max_w=W - 2 * M - 60)
        ar(base, sub, R - 4, 300, 27, pal["soft"] if not light(pal) else (124, 108, 156),
           CAIRO_M, max_w=W - 2 * M - 60)
        lat(base, num, M, 760, 250, num_col(pal), ANTON, anchor="ls", tracking=-10)
        swipe_hint(base, pal, y=740)
    else:                               # photo à droite, texte à gauche
        pano(base, photo_name, (520, 150, W + 40, H + 40), k, n, seed=73 + seed,
             t0=0.32, t1=0.46, zoom=1.5, k_duo=seed // 3,
             torn=(True, False, False, False), shadow=0)
        lat(base, num, M - 6, 520, 230, num_col(pal), ANTON, anchor="ls", tracking=-10)
        ar(base, t, 480, 190, 42, pal["txt"], CAIRO_B, max_w=420)
        ar(base, sub, 480, 300, 25, pal["soft"] if not light(pal) else (124, 108, 156),
           CAIRO_M, max_w=420)
        wave(base, M + 10, 600, 300, 52, 26, pal["accent"], seed=k + 6)
        arrow(base, 400, 700, 500, 700, pal["accent"], 6, 20)
    return base


def mid_recap(s, pal, k, n, seed=0, photo_name="phone-hand.jpg"):
    """Récapitulatif : la méthode condensée en une checklist, prête à sauver."""
    base = ground(pal, seed, 12, ht=((0, 0, W, 240), 9.8, 18))
    thread(base, k, n, pal)
    lat(base, "RÉCAP", M + 26, 100, 17,
        pal["soft"] if not light(pal) else (124, 108, 156), MONO, anchor="ls")
    num_dot(base, k, n, pal)
    y = head(base, ["الخلاصة،", "**في 3 نقاط**."], R, 170, 74, pal, max_w=880)
    card = slip(W - 2 * M - 20, 430, paper_tone(pal), seed=71)
    paste(base, card, M + 10, y + 50, shadow=90, blur=9, rot=-0.7)
    yy = y + 96
    for num, t, sub in s["steps"]:
        lat(base, num, M + 46, yy + 44, 40, P_VIO, ANTON, anchor="ls")
        ar(base, t, R - 40, yy + 4, 28, P_INK, CAIRO_B, max_w=W - 2 * M - 160)
        ar(base, sub, R - 40, yy + 46, 20, (124, 108, 156), CAIRO_M,
           max_w=W - 2 * M - 160)
        rule(base, M + 52, R - 36, yy + 88, (196, 181, 253), 1.0, 160)
        yy += 116
    pano(base, photo_name, (-50, 1010, W + 50, H + 50), k, n, seed=91 + seed,
         zoom=1.7, torn=(True, True, False, False))
    swipe_hint(base, pal, y=960)
    return base


def mid_quote(s, pal, k, n, seed=0, photo_name="script-notebook.jpg"):
    """Citation / preuve : grand guillemet, une phrase, photo continue."""
    base = ground(pal, seed, 13, ht=((0, 0, W, 300), 10, 16))
    thread(base, k, n, pal)
    lat(base, "«", M + 6, 340, 380, pal["accent"], PF_IT, anchor="ls")
    lat(base, s.get("pull", "—"), R, 470, 84, pal["txt"], PF_IT, anchor="rs", rot=-1.4)
    num_dot(base, k, n, pal)
    pano(base, photo_name, (M + 24, 600, W - M + 20, 1010), k, n, seed=81 + seed,
         t0=0.30, t1=0.55, zoom=1.4, k_duo=seed // 3, torn=(True, True, False, True), shadow=18)
    line = (s.get("lines") or ["—"])[-1]
    ar(base, line, R - 4, 1050, 34, pal["txt"], CAIRO_B, max_w=W - 2 * M - 40)
    swipe_hint(base, pal)
    return base


# ═══════════════════════════════════════════════════════════════════════════
#  CLÔTURE (4)
# ═══════════════════════════════════════════════════════════════════════════
def _cta_bar(base, s, pal, y=1216):
    bw, bh = W - 2 * M - 24, 80
    bx = M + 12
    rrect(base, (bx, y, bx + bw, y + bh), 8, fill=(*pal["accent"], 255))
    ar(base, s["cta"], bx + bw - 32, y + 22, 30, P_WHITE, CAIRO_B)
    arrow(base, bx + 42, y + bh / 2, bx + 96, y + bh / 2, P_WHITE, 6, 18)


def end_card(s, pal, k, n, seed=0):
    base = ground(pal, seed, 12)
    thread(base, k, n, pal)
    lat(base, "L'OFFRE", M + 26, 100, 17,
        pal["soft"] if not light(pal) else (124, 108, 156), MONO, anchor="ls")
    num_dot(base, k, n, pal)
    y = head(base, s["lines"], R, 170, 76, pal, max_w=900)
    card = slip(W - 2 * M - 40, 360, paper_tone(pal), seed=21)
    paste(base, card, M + 20, y + 40, shadow=110, blur=9, rot=-0.8)
    yy = y + 88
    for g in s["guarantees"]:
        tick(base, M + 62, yy, 18, P_VIO, 3.0)
        ar(base, g, R - 52, yy - 16, 25, P_INK, CAIRO_B, max_w=700)
        rule(base, M + 66, R - 50, yy + 28, (196, 181, 253), 1.0, 140)
        yy += 76
    lat(base, "500", M + 56, yy + 78, 74, P_VIO, ANTON, anchor="ls")
    lat(base, "DA · 30 s · 1 FICHIER", M + 210, yy + 70, 18, (124, 108, 156), MONO,
        anchor="ls")
    _cta_bar(base, s, pal)
    return base


def end_receipt(s, pal, k, n, seed=0):
    base = ground(pal, seed, 12)
    thread(base, k, n, pal)
    lat(base, "L'OFFRE", M + 26, 100, 17,
        pal["soft"] if not light(pal) else (124, 108, 156), MONO, anchor="ls")
    num_dot(base, k, n, pal)
    head(base, s["lines"], R, 160, 66, pal, max_w=880)
    tw = W - 2 * M - 90
    th = 70 + len(s["guarantees"]) * 88 + 190
    card = slip(tw, th, paper_tone(pal), seed=33)
    perforate(card)
    top = 470
    paste(base, card, M + 45, top, shadow=120, blur=12, rot=0.7)
    yy = top + 76
    for g in s["guarantees"]:
        ar(base, g, R - 78, yy, 25, P_INK, CAIRO_B, max_w=700)
        lat(base, "OK", M + 78, yy + 24, 15, P_VIO, MONO, anchor="ls")
        rule(base, M + 78, R - 76, yy + 56, (196, 181, 253), 1.0, 150)
        yy += 88
    lat(base, "TOTAL", M + 78, yy + 50, 18, (124, 108, 156), MONO, anchor="ls")
    lat(base, "500 DA", R - 76, yy + 56, 52, P_VIO, ANTON, anchor="rs")
    rnd = random.Random(5)
    bx = M + 78
    bd = ImageDraw.Draw(base)
    for _ in range(42):
        wb = rnd.choice([2, 3, 5, 7])
        bd.rectangle([bx * SS, (yy + 86) * SS, (bx + wb) * SS, (yy + 138) * SS],
                     fill=(*P_INK, 255))
        bx += wb + rnd.choice([3, 5, 8])
    _cta_bar(base, s, pal)
    return base


def end_split(s, pal, k, n, seed=0):
    """Le prix en très grand, la photo continue en dessous, la liste dessus."""
    base = ground(pal, seed, 12)
    thread(base, k, n, pal)
    lat(base, "L'OFFRE", M + 26, 100, 17,
        pal["soft"] if not light(pal) else (124, 108, 156), MONO, anchor="ls")
    num_dot(base, k, n, pal)
    y = head(base, s["lines"], R, 150, 70, pal, max_w=880)
    lat(base, "500", M + 6, 590, 190, num_col(pal), ANTON, anchor="ls", tracking=-8)
    lat(base, "DA · 30 SECONDES · 1 FICHIER", R - 4, 640, 18,
        pal["soft"] if not light(pal) else (124, 108, 156), MONO, anchor="rs")
    card = slip(W - 2 * M + 20, 300, paper_tone(pal), seed=41)
    paste(base, card, M - 10, 700, shadow=100, blur=9, rot=0.6)
    yy = 748
    for g in s["guarantees"]:
        tick(base, M + 46, yy, 17, P_VIO, 3.0)
        ar(base, g, R - 34, yy - 16, 25, P_INK, CAIRO_B, max_w=740)
        rule(base, M + 50, R - 32, yy + 26, (196, 181, 253), 1.0, 150)
        yy += 74
    _cta_bar(base, s, pal, 1160)
    return base


def end_pano(s, pal, k, n, seed=0, photo_name="phone-hand.jpg"):
    base = ground(pal, seed, 12)
    thread(base, k, n, pal)
    pano(base, photo_name, (-40, 560, W + 40, H + 60), k, n, seed=91 + seed, zoom=1.4,
         torn=(True, True, False, False))
    d = ImageDraw.Draw(base)
    d.rectangle([0, 545 * SS, W * SS, 560 * SS], fill=(*pal["accent"], 255))
    lat(base, "L'OFFRE", M + 26, 100, 17, pal["txt"], MONO, anchor="ls")
    num_dot(base, k, n, pal)
    y = head(base, s["lines"], R, 150, 74, pal, max_w=900)
    yy = y + 30
    for g in s["guarantees"]:
        ar(base, g, R - 4, yy, 24, pal["txt"], CAIRO_B, max_w=860)
        yy += 56
    lat(base, "500 DA", R - 4, 520, 46, pal["accent"], ANTON, anchor="rs")
    _cta_bar(base, s, pal)
    return base


ENDS = [end_card, end_receipt, end_split, end_pano]


# ═══════════════════════════════════════════════════════════════════════════
#  CONSTRUCTION DU CARROUSEL : 4 à 8 slides, liées
# ═══════════════════════════════════════════════════════════════════════════
def length_for(i: int) -> int:
    return 4 + (i * 3 + (i // 7)) % 5          # 4..8, jamais le même rythme deux fois


# Composition exacte du milieu, en jetons :
#   S = statement (le choc)      I = un item (fait / douleur)
#   P = une étape seule (gros numéro)   L = toutes les étapes dans une seule slide
#   R = récap checklist
# Σ jetons = n − 2, donc le carrousel fait TOUJOURS exactement n slides.
RECIPES = {
    4: ["S", "L"],
    5: ["S", "L", "I"],
    6: ["S", "I", "I", "I"],
    7: ["S", "P", "P", "P", "I"],
    8: ["S", "I", "I", "I", "P", "P"],
}
RECIPES_ALT = {
    8: ["S", "I", "I", "P", "P", "R"],
}


def _assemble(tokens, diag, meth):
    items = list(diag["items"])
    steps = list(meth["steps"])
    ii = pi = 0
    used_list = False
    out = []
    for tok in tokens:
        if tok == "S":
            out.append(("statement", diag))
        elif tok == "R":
            out.append(("recap", meth))
        elif tok == "I" and ii < len(items):
            out.append(("item", items[ii]))
            ii += 1
        elif tok == "P" and pi < len(steps):
            out.append(("step", (steps[pi], pi, len(steps))))
            pi += 1
        elif tok == "L" and not used_list:
            out.append(("steps", steps))
            used_list = True
        elif ii < len(items):
            out.append(("item", items[ii]))
            ii += 1
        elif pi < len(steps):
            out.append(("step", (steps[pi], pi, len(steps))))
            pi += 1
        elif not used_list:
            out.append(("steps", steps))
            used_list = True
        else:
            out.append(("recap", meth))
    return out


def plan_pub(pub, i):
    """Liste [(nature, payload)] + palettes — exactement `n` slides, 4 ≤ n ≤ 8."""
    sl = pub["slides"]
    cover, diag, meth, end = sl[0], sl[1], sl[2], sl[3]
    n = length_for(i)
    tokens = RECIPES[n]
    if n in RECIPES_ALT and (i // 3) % 2 == 0:
        tokens = RECIPES_ALT[n]
    middles = _assemble(tokens, diag, meth)

    # filet de sécurité : on ne descend jamais sous 4 ni au-dessus de 8
    while len(middles) > n - 2:
        middles.pop()
    while len(middles) < n - 2:
        middles.append(("recap", meth))

    seq_keys = SEQUENCES[i % len(SEQUENCES)]
    slides = [("cover", cover)]
    for kind, payload in middles:
        slides.append((kind, payload))
    slides.append(("end", end))
    assert len(slides) == n, f"{pub['slug']}: {len(slides)} slides au lieu de {n}"

    pals = [PALETTES[seq_keys[j % len(seq_keys)]] for j in range(len(slides))]
    return slides, pals, n


def render(pub, i):
    slides, pals, n = plan_pub(pub, i)
    folder = OUT / pub["slug"]
    folder.mkdir(parents=True, exist_ok=True)
    for old in folder.glob("*.jpg"):
        if old.name != "planche.jpg":
            old.unlink()
    photo = pub["slides"][0].get("photo", "studio-voice.jpg")
    paths = []
    for k, (kind, payload) in enumerate(slides):
        pal = pals[k]
        seed = i * 5 + k
        if kind == "cover":
            base = COVERS[i % 4](payload, pal, k, n, seed=seed, photo_name=photo)
        elif kind == "statement":
            base = mid_statement(payload, pal, k, n, seed=seed, photo_name=photo)
        elif kind == "item":
            items = pub["slides"][1]["items"]
            idx = items.index(payload)
            base = mid_item(payload, idx + 1, pal, k, n, seed=seed, total=len(items),
                            photo_name=("mic-hero.jpg" if i % 2 else "phone-hand.jpg"))
        elif kind == "steps":
            base = mid_steps(payload, pal, k, n, seed=seed)
        elif kind == "step":
            st, j, tot = payload
            base = mid_step(st, j, tot, pal, k, n, seed=seed,
                            photo_name=("mic-hero.jpg" if i % 2 else "man-studio.jpg"))
        elif kind == "recap":
            base = mid_recap(payload, pal, k, n, seed=seed)
        elif kind == "quote":
            base = mid_quote(payload, pal, k, n, seed=seed)
        else:
            base = ENDS[i % 4](payload, pal, k, n, seed=seed)
        p = folder / f"{k + 1:02d}.jpg"
        base.convert("RGB").resize((W, H), Image.LANCZOS).save(
            p, quality=94, subsampling=0, optimize=True)
        paths.append(p)
    return paths


def main() -> int:
    from workshop_pubs import PUBS
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default=None)
    a = ap.parse_args()
    for i, pub in enumerate(PUBS):
        if a.only and a.only not in pub["slug"]:
            continue
        slides, _, n = plan_pub(pub, i)
        print(f"▶ {pub['titre']}  ·  {len(slides)} slides  ·  "
              f"{[k for k, _ in slides]}")
        for p in render(pub, i):
            print(f"  ✓ {p.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
