#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════
 poster.py — carrousels Sawtify : bibliothèque de MISES EN PAGE

 Le problème de la v1 : les 30 publications réutilisaient les 4 mêmes
 gabarits. Ici, 12 mises en page vraiment différentes (photo pleine page,
 aplat typographique, cercle découpé, bande contact, ticket de caisse,
 grand chiffre, cartes scotchées, badge tampon…) et chaque publication
 en reçoit une COMBINAISON différente.

 Ce qui ne change pas (l'identité) : palette violet / encre / crème / orange,
 les polices (Anton, Playfair italique, IBM Plex Arabic, Space Grotesk),
 le grain de papier, la trame, et le compteur de slides.

   python3 poster.py                # les 30 publications
   python3 poster.py --only 07      # une seule
   python3 poster.py --sheet 1,2,3  # + une planche de contrôle
═══════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import argparse
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from sawtify_ig import SS, W, H, font, rrect, visual
from workshop import (ANTON, CAIRO, CAIRO_B, CAIRO_M, CREAM, INK, LILAC, M,
                      MONO, ORANGE, PAPER, PF_IT, PF_IT6, PHOTOS, VIO_D,
                      VIOLET, WHITE, ar, ar_fit, arrow, fibers, halftone,
                      index_dot, ink_blob, lat, paper_noise, photo, rule,
                      scotch, sticker, tick, wave)

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "slides" / "posters"
R = W - M

# ── palettes : même charte, dominance différente ──────────────────────────
PALETTES = [
    dict(key="violet", bg=VIOLET, txt=CREAM, soft=LILAC, accent=ORANGE, dk=VIO_D),
    dict(key="encre", bg=INK, txt=CREAM, soft=LILAC, accent=ORANGE, dk=(0, 0, 0)),
    dict(key="creme", bg=CREAM, txt=INK, soft=(120, 100, 140), accent=VIOLET, dk=VIO_D),
    dict(key="nuit", bg=VIO_D, txt=CREAM, soft=LILAC, accent=ORANGE, dk=INK),
]


# ═══════════════════════════════════════════════════════════════════════════
#  outils communs
# ═══════════════════════════════════════════════════════════════════════════
def light(pal) -> bool:
    return sum(pal["bg"]) > 480


DUOS = [((44, 16, 92), (206, 184, 240)),      # violet / lilas
        ((14, 10, 16), (247, 242, 232)),      # encre / crème
        ((10, 8, 12), (250, 248, 244))]        # noir & blanc éditorial


def duo(pal, idx=None):
    """Duotone : trois traitements qui tournent (violet, encre, chaud)."""
    if idx is None:
        return (pal["dk"], LILAC) if light(pal) else (pal["dk"], pal["txt"])
    return DUOS[idx % len(DUOS)]


def slip_colors(pal):
    """(fond du papier, encre forte, encre douce, accent) selon le fond."""
    if light(pal):
        return INK, CREAM, LILAC, ORANGE
    return CREAM, (38, 24, 52), (120, 100, 140), VIOLET


def ground(pal, seed=1, noise=14, ht=None):
    """Fond + matière. Pas d'aplat propre : grain, fibres, trame, tache."""
    base = Image.new("RGBA", (W * SS, H * SS), (*pal["bg"], 255))
    paper_noise(base, noise, 1.0)
    fibers(base, (0, 0, 0) if sum(pal["bg"]) > 380 else (255, 255, 255), 240, 12)
    if ht:
        box, step, alpha = ht
        halftone(base, box, step, alpha=alpha,
                 color=(255, 255, 255) if sum(pal["bg"]) < 380 else pal["dk"])
    return base


def counter(base, i, total, pal, corner="tr"):
    col = pal["soft"] if sum(pal["bg"]) < 380 else (86, 68, 108)
    if corner == "tr":
        index_dot(base, i, total, R - 74, 96, col, True)
    elif corner == "tl":
        index_dot(base, i, total, M + 12, 96, col, True)
    elif corner == "bl":
        index_dot(base, i, total, M + 12, H - 74, col, True)
    else:
        index_dot(base, i, total, R - 74, H - 74, col, True)


def wordmark(base, pal, x=None, y=96, anchor="rs", size=19):
    col = pal["soft"] if sum(pal["bg"]) < 380 else (86, 68, 108)
    lat(base, "SAWTIFY", x if x is not None else R - 2, y, size, col, MONO, anchor=anchor)


def head(base, lines, x_right, y, size, pal, hi=None, max_w=None, leading=1.12,
         fname=CAIRO):
    """Titre arabe multi-lignes, un mot surligné."""
    max_w = max_w or (W - 2 * M)
    yy = y
    for ln in lines:
        s = min(size, ar_fit(base, ln, max_w, size))
        yy = ar(base, ln, x_right, yy, s, pal["txt"], fname, max_w=max_w,
                leading=leading, hi_color=hi or pal["accent"]) + 6
    return yy


_SCRATCH = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))


def ar_h(text, size, max_w, fname=CAIRO, leading=1.28) -> float:
    """Hauteur réelle d'un paragraphe arabe (mesure sur un calque jetable)."""
    return ar(_SCRATCH, text, R, 0, size, INK, fname, max_w=max_w, leading=leading) + 24


def marker_word(base, x0, y0, w, h, pal, alpha=180):
    lay = Image.new("RGBA", (int(w * SS), int(h * SS)), (0, 0, 0, 0))
    ImageDraw.Draw(lay).rectangle([0, 0, lay.width, lay.height], fill=(*pal["accent"], alpha))
    lay = lay.rotate(-1.2, expand=True, resample=Image.BICUBIC)
    base.alpha_composite(lay, (int(x0 * SS), int(y0 * SS)))


def paper_slip(w, h, tone=CREAM, seed=3, shadow=True, deckle=True):
    """Un morceau de papier (bord irrégulier) prêt à coller."""
    slip = Image.new("RGBA", (int(w * SS), int(h * SS)), (0, 0, 0, 0))
    d = ImageDraw.Draw(slip)
    d.rectangle([0, 0, slip.width, slip.height], fill=(*tone, 255))
    if deckle:
        rnd = random.Random(seed)
        for _ in range(int(w * h / 900)):
            px, py = rnd.randint(0, slip.width - 1), rnd.randint(0, slip.height - 1)
            d.point((px, py), fill=(*tone, 90))
    return slip


def paste(base, layer, x, y, shadow=110, blur=9, rot=0.0):
    if rot:
        layer = layer.rotate(rot, expand=True, resample=Image.BICUBIC)
    if shadow:
        sh = Image.new("RGBA", layer.size, (0, 0, 0, 0))
        sh.paste((0, 0, 0, shadow), (0, 0), layer)
        sh = sh.filter(ImageFilter.GaussianBlur(blur * SS))
        base.alpha_composite(sh, (int((x + 8) * SS), int((y + 12) * SS)))
    base.alpha_composite(layer, (int(x * SS), int(y * SS)))
    return layer.size


# ═══════════════════════════════════════════════════════════════════════════
#  COUVERTURES
# ═══════════════════════════════════════════════════════════════════════════
def cover_hero(s, pal, i, total, seed=0):
    """Photo plein cadre en duotone + bloc de couleur + accroche."""
    base = ground(pal, seed, 10)
    photo(base, s["photo"], (-40, -60, W + 40, 946), rot=0, seed=31 + seed,
          shadow=0, duotone=duo(pal, seed),
          torn=(True, True, False, False), rough=14,
          zoom=1.0 + (seed % 3) * 0.14, focus=0.5, focus_y=0.42)
    halftone(base, (0, 700, W, 960), step=7.6, alpha=26, color=(255, 255, 255))
    d = ImageDraw.Draw(base)
    d.rectangle([0, 936 * SS, W * SS, H * SS], fill=(*pal["bg"], 255))
    paper_noise(base, 12, 1.0)

    lat(base, "SAWTIFY", M - 6, 84, 19, pal["txt"], MONO, anchor="ls")
    lat(base, f"{i + 1:02d}/{total:02d}", R - 4, 84, 19, pal["txt"], MONO, anchor="rs")

    # la place disponible sous la photo décide de la taille du titre
    avail = 1306 - 972
    size = 92
    while size > 40 and len(s["lines"]) * size * 1.14 > avail - (70 if s.get("promise") else 0):
        size -= 2
    y = head(base, s["lines"], R, 972, size, pal, max_w=860)
    if s.get("promise"):
        ar(base, s["promise"], R, y + 10, 24, pal["soft"], CAIRO_M, max_w=760)
    if s.get("display") and len(s["lines"]) < 3:
        lat(base, s["display"], M - 6, 1302, 74, pal["accent"], ANTON, anchor="ls")
    return base


def cover_flat(s, pal, i, total, seed=0):
    """Aplat franc + typographie géante. Aucune photo : le type EST l'image."""
    base = ground(pal, seed, 15, ht=((0, 0, W, 470), 9.4, 26))
    # bandeau de trame en haut, comme une trame d'imprimeur
    d = ImageDraw.Draw(base)
    d.rectangle([0, 462 * SS, W * SS, 470 * SS], fill=(*pal["accent"], 255))

    # grand mot en filigrane, calé dans la zone de trame
    big = s.get("display") or ""
    if len(big) >= 2 and all(ord(ch) < 0x0600 for ch in big):
        ghost = Image.new("RGBA", (W * SS, 470 * SS), (0, 0, 0, 0))
        lat(ghost, big, W - 24, 372, 300, (*pal["txt"], 255), ANTON, anchor="rs",
            tracking=-10)
        ghost.putalpha(ghost.split()[-1].point(lambda v: int(v * 0.14)))
        base.alpha_composite(ghost, (0, 0))
    else:
        # pas de mot latin : un aplat d'encre + le sticker remplissent le haut
        ink_blob(base, 300, 210, 190, pal["accent"], 26)

    wordmark(base, pal, M - 4, 96, "ls")
    counter(base, i, total, pal, "tr")

    y = head(base, s["lines"], R, 520, 96, pal, leading=1.08)
    rule(base, M, R, y + 22, pal["txt"], 2.4, 190)
    if s.get("promise"):
        ar(base, s["promise"], R, y + 56, 27, pal["soft"], CAIRO_M, max_w=820)
    if s.get("sticker"):
        sticker(base, s["sticker"], 268, 214, 122, pal["accent"], pal["bg"], rot=-11)
    arrow(base, M, 1250, M + 90, 1250, pal["accent"], 8, 24)
    return base


def cover_circle(s, pal, i, total, seed=0):
    """Photo dans un cercle découpé, titre qui déborde dessus."""
    base = ground(pal, seed, 14, ht=((0, 900, W, H), 10, 18))
    cx, cy, r = 660, 430, 320
    disc = Image.new("RGBA", (r * 2 * SS, r * 2 * SS), (0, 0, 0, 0))
    im = Image.open(PHOTOS / s["photo"]).convert("RGB")
    k = max(disc.width / im.width, disc.height / im.height)
    im = im.resize((int(im.width * k), int(im.height * k)), Image.LANCZOS)
    im = im.crop(((im.width - disc.width) // 2, (im.height - disc.height) // 2,
                  (im.width + disc.width) // 2, (im.height + disc.height) // 2))
    mask = Image.new("L", disc.size, 0)
    ImageDraw.Draw(mask).ellipse([0, 0, disc.width, disc.height], fill=255)
    disc.paste(im, (0, 0), mask)
    paste(base, disc, cx - r, cy - r, shadow=90, blur=12)

    wordmark(base, pal, M - 4, 96, "ls")
    counter(base, i, total, pal, "tr")

    y = head(base, s["lines"], R, 800, 82, pal, max_w=960)
    if s.get("promise"):
        ar(base, s["promise"], R, y + 12, 25, pal["soft"], CAIRO_M, max_w=760)
    if s.get("display"):
        lat(base, s["display"], M - 6, H - 92, 92, pal["accent"], ANTON, anchor="ls")
    return base


# ═══════════════════════════════════════════════════════════════════════════
#  DIAGNOSTIC (les 3 constats)
# ═══════════════════════════════════════════════════════════════════════════
def diag_paper(s, pal, i, total, seed=0):
    """Feuille crème déchirée, citation en serif, liste numérotée."""
    base = ground(pal, seed, 13, ht=((0, 0, 420, 700), 9.2, 24))
    photo(base, s["photo"], (628, 84, W + 70, 560), rot=3.4, seed=51 + seed,
          shadow=26, rough=16, torn=(True, False, True, False))
    scotch(base, 760, 120, 250, 54, rot=-8, tone=(255, 255, 255), alpha=150)

    wordmark(base, pal, M - 4, 96, "ls")
    counter(base, i, total, pal, "bl")

    lat(base, s.get("pull", "—"), M - 4, 700, 104, pal["txt"], PF_IT, anchor="ls", rot=-1.2)
    rule(base, M, R, 728, pal["txt"], 2.2, 150)

    y = head(base, s["lines"], R, 762, 44, pal, max_w=W - 2 * M - 40)
    yy = y + 34
    for k, item in enumerate(s["items"]):
        lat(base, f"{k + 1}", M - 6, yy + 40, 46, pal["accent"], ANTON, anchor="ls")
        ar(base, item, R - 4, yy, 26, pal["txt"], CAIRO_B, max_w=W - 2 * M - 70)
        rule(base, M + 44, R, yy + 62, pal["txt"], 1.2, 60)
        yy += 92
    return base


def diag_strip(s, pal, i, total, seed=0):
    """Bande contact de 3 photos + constats."""
    base = ground(pal, seed, 14)
    y0, hgt = 176, 386
    for k, (ph, lab) in enumerate([(s["photo"], "01"), ("mic-hero.jpg", "02"),
                                   ("studio-voice.jpg", "03")]):
        x0 = M + k * ((W - 2 * M - 2 * 16) / 3 + 16)
        wd = (W - 2 * M - 2 * 16) / 3
        photo(base, ph, (x0, y0, x0 + wd, y0 + hgt), rot=0, seed=61 + k + seed,
              shadow=16, duotone=duo(pal, seed), torn=(False, False, True, True),
              rough=10)
        lat(base, lab, x0 + 8, y0 + hgt - 14, 26, pal["accent"], ANTON, anchor="ls")

    wordmark(base, pal, M - 4, 96, "ls")
    counter(base, i, total, pal, "tr")

    y = head(base, s["lines"], R, 630, 52, pal, max_w=W - 2 * M)
    yy = y + 24
    for k, item in enumerate(s["items"]):
        lat(base, f"{k + 1}", M - 2, yy + 36, 46, pal["accent"], ANTON, anchor="ls")
        marker_word(base, M + 42, yy + 8, 14, 22, pal, 200)
        ar(base, item, R - 4, yy, 27, pal["txt"], CAIRO_B, max_w=W - 2 * M - 60)
        yy += 74
        rule(base, M, R, yy - 22, pal["txt"], 1.1, 55)
    return base


def diag_split(s, pal, i, total, seed=0):
    """Photo qui prend la moitié gauche (bord déchiré), texte à droite."""
    base = ground(pal, seed, 14)
    photo(base, s["photo"], (-70, -60, 590, H + 60), rot=0, seed=71 + seed,
          shadow=0, duotone=duo(pal, seed), torn=(False, True, False, False),
          rough=22)
    halftone(base, (520, 0, 628, H), step=9.0, alpha=14, color=(255, 255, 255))

    wordmark(base, pal, R - 2, 96, "rs")
    counter(base, i, total, pal, "tl")
    lat(base, s.get("pull", ""), 620, 300, 74, pal["txt"], PF_IT, anchor="ls", rot=-1.4)

    y = head(base, s["lines"], R, 380, 42, pal, max_w=400)
    yy = y + 30
    for k, item in enumerate(s["items"]):
        lat(base, f"0{k + 1}", 630, yy + 36, 40, pal["accent"], ANTON, anchor="ls")
        ar(base, item, R - 2, yy, 23, pal["txt"], CAIRO_B, max_w=360)
        yy += 104
    return base


# ═══════════════════════════════════════════════════════════════════════════
#  MÉTHODE (les 3 étapes)
# ═══════════════════════════════════════════════════════════════════════════
def meth_bands(s, pal, i, total, seed=0):
    """Fond encre, 3 bandes de papier collées, micro en duotone."""
    base = ground(pal, seed, 13)
    photo(base, s["photo"], (-34, 742, 392, H + 40), rot=1.4, seed=81 + seed,
          shadow=0, duotone=duo(pal, seed), torn=(False, True, True, False),
          rough=18, zoom=1.7, focus=0.55, focus_y=0.30)
    wordmark(base, pal, R - 2, 96, "rs")
    counter(base, i, total, pal, "tl")

    yy = 176
    y = head(base, s["lines"], R, yy, 62, pal, max_w=620)
    if s.get("promise"):
        ar(base, s["promise"], R, y + 12, 25, pal["soft"], CAIRO_M, max_w=600)

    tone, ink_s, ink_w, acc = slip_colors(pal)
    yy = 470
    for k, (num, t, sub) in enumerate(s["steps"]):
        w_box = 596 - k * 16
        x0 = R - w_box + k * 10
        slip = paper_slip(w_box, 104, tone, seed=9 + k)
        ImageDraw.Draw(slip).rectangle([0, 0, int(7 * SS), slip.height],
                                       fill=(*acc, 255))
        paste(base, slip, x0, yy, shadow=80, blur=6, rot=-0.9 + k * 0.7)
        lat(base, num, x0 + 34, yy + 74, 46, acc, ANTON, anchor="ls")
        ar(base, t, x0 + w_box - 22, yy + 12, 30, ink_s, CAIRO_B, max_w=w_box - 96)
        ar(base, sub, x0 + w_box - 22, yy + 54, 21, ink_w, CAIRO_M, max_w=w_box - 96)
        yy += 120

    lat(base, "00:12", 520, 1188, 21, pal["soft"], MONO, anchor="ls")
    wave(base, 520, 1200, 300, 48, 24, pal["accent"], seed=9)
    return base


def meth_receipt(s, pal, i, total, seed=0):
    """Ticket de caisse crème sur aplat, étapes = lignes pointillées."""
    base = ground(pal, seed, 14, ht=((0, 0, W, 300), 10, 20))
    wordmark(base, pal, R - 2, 96, "rs")
    counter(base, i, total, pal, "tl")

    tw = W - 2 * M - 60
    inner_w = tw - 96
    h_head = sum(ar_h(ln, 50, inner_w) for ln in s["lines"])
    h_prom = ar_h(s["promise"], 22, inner_w) + 10 if s.get("promise") else 0
    h_steps = len(s["steps"]) * 108
    h_tot = 88
    th = 60 + h_head + h_prom + 54 + h_steps + h_tot + 44

    tone, ink_s, ink_w, acc = slip_colors(pal)
    top = 190
    slip = paper_slip(tw, th, tone, seed=12)
    d = ImageDraw.Draw(slip)
    for ex in range(0, slip.width, 26):          # bords perforés
        d.ellipse([ex, -9 * SS, ex + 26 * SS, 9 * SS], fill=(0, 0, 0, 0))
        d.ellipse([ex, slip.height - 9 * SS, ex + 26 * SS, slip.height + 9 * SS],
                  fill=(0, 0, 0, 0))
    paste(base, slip, M + 30, top, shadow=120, blur=11, rot=-0.6)

    d = ImageDraw.Draw(base)
    d.text(((M + 78) * SS, (top + 52) * SS), "SAWTIFY · MÉTHODE", font=font(MONO, 16),
           fill=ink_w, anchor="lm")
    y = head(base, s["lines"], R - 42, top + 84, 50,
             dict(pal, txt=ink_s), hi=acc, max_w=inner_w)
    if s.get("promise"):
        y = ar(base, s["promise"], R - 42, y + 10, 22, ink_w, CAIRO_M, max_w=inner_w)

    yy = y + 54
    for num, t, sub in s["steps"]:
        rule(base, M + 78, R - 42, yy, ink_w, 1.0, 130)
        lat(base, num, M + 78, yy + 56, 34, acc, ANTON, anchor="ls")
        ar(base, t, R - 42, yy + 12, 28, ink_s, CAIRO_B, max_w=620)
        ar(base, sub, R - 42, yy + 52, 20, ink_w, CAIRO_M, max_w=600)
        yy += 108

    rule(base, M + 78, R - 42, yy + 20, ink_w, 1.0, 130)
    lat(base, "TOTAL · 3 ÉTAPES", M + 78, yy + 74, 16, ink_w, MONO, anchor="ls")
    lat(base, "500 DA", R - 42, yy + 78, 40, acc, ANTON, anchor="rs")
    return base


def meth_numbers(s, pal, i, total, seed=0):
    """Trois grands chiffres en contour à gauche, texte à droite."""
    base = ground(pal, seed, 13, ht=((500, 900, W, H), 9.6, 22))
    photo(base, s["photo"], (596, 900, W + 40, H + 30), rot=0, seed=91 + seed,
          shadow=0, duotone=duo(pal, seed), torn=(True, False, True, False),
          rough=14)
    wordmark(base, pal, M - 4, 96, "ls")
    counter(base, i, total, pal, "tr")

    y = head(base, s["lines"], R, 150, 58, pal, max_w=900)
    if s.get("promise"):
        ar(base, s["promise"], R, y + 10, 24, pal["soft"], CAIRO_M, max_w=760)

    yy = 480
    for k, (num, t, sub) in enumerate(s["steps"]):
        lat(base, num, M - 12, yy + 104, 132, pal["accent"], ANTON, anchor="ls",
            tracking=-4)
        ar(base, t, R, yy + 6, 34, pal["txt"], CAIRO_B, max_w=560)
        ar(base, sub, R, yy + 52, 22, pal["soft"], CAIRO_M, max_w=540)
        rule(base, M, R, yy + 118, pal["txt"], 1.4, 90)
        yy += 150
    return base


# ═══════════════════════════════════════════════════════════════════════════
#  OFFRE
# ═══════════════════════════════════════════════════════════════════════════
def _cta_bar(base, s, pal, y=1206, fill=None, ink=None):
    bw, bh = W - 2 * M - 30, 78
    bx = M + 15
    rrect(base, (bx, y, bx + bw, y + bh), 6, fill=((fill or pal["accent"]) + (255,)))
    ar(base, s["cta"], bx + bw - 34, y + 22, 30, ink or pal["bg"], CAIRO_B)
    arrow(base, bx + 42, y + bh / 2, bx + 96, y + bh / 2, ink or pal["bg"], 6, 18)


def offer_stamp(s, pal, i, total, seed=0):
    """Carton crème + badge tampon avec le prix."""
    base = ground(pal, seed, 14)
    wordmark(base, pal, M - 4, 96, "ls")
    counter(base, i, total, pal, "tr")

    y = head(base, s["lines"], R, 170, 68, pal, max_w=820)

    tone, ink_s, ink_w, acc = slip_colors(pal)
    slip = paper_slip(W - 2 * M - 40, 420, tone, seed=21)
    paste(base, slip, M + 20, 452, shadow=110, blur=9, rot=-0.8)
    yy = 496
    for g in s["guarantees"]:
        tick(base, M + 62, yy, 19, acc, 3.2)
        ar(base, g, R - 56, yy - 14, 27, ink_s, CAIRO_B, max_w=700)
        rule(base, M + 66, R - 54, yy + 30, ink_w, 1.0, 90)
        yy += 80
    lat(base, "BON DE COMMANDE · SAWTIFY", M + 62, yy + 20, 15, ink_w, MONO,
        anchor="ls")

    # badge tampon
    badge = Image.new("RGBA", (300 * SS, 300 * SS), (0, 0, 0, 0))
    bd = ImageDraw.Draw(badge)
    bd.ellipse([0, 0, badge.width, badge.height], fill=(*pal["accent"], 255))
    bd.ellipse([18 * SS, 18 * SS, badge.width - 18 * SS, badge.height - 18 * SS],
               outline=(*CREAM, 210), width=int(2.6 * SS))
    paste(base, badge, 700, 880, shadow=90, blur=10, rot=-8)
    d = ImageDraw.Draw(base)
    d.text((850 * SS, 1006 * SS), "500", font=font(ANTON, 78), fill=CREAM, anchor="mm")
    d.text((850 * SS, 1070 * SS), "DA / 30 s", font=font(MONO, 15), fill=CREAM, anchor="mm")

    _cta_bar(base, s, pal, 1206)
    return base


def offer_receipt(s, pal, i, total, seed=0):
    """Ticket blanc sur encre, lignes de commande, code-barres."""
    base = ground(pal, seed, 12)
    wordmark(base, pal, R - 2, 96, "rs")
    counter(base, i, total, pal, "tl")

    h_head = sum(ar_h(ln, 66, 860) for ln in s["lines"])
    y = 150 + h_head

    tw = W - 2 * M - 90
    n = len(s["guarantees"])
    avail = 1170 - (y + 60)
    row = min(118, max(82, (avail - 66 - 96 - 128) / n))
    th = 66 + n * row + 96 + 128 + 24
    top = y + 60
    tone, ink_s, ink_w, acc = slip_colors(pal)
    slip = paper_slip(tw, th, tone, seed=33)
    d = ImageDraw.Draw(slip)
    for ex in range(0, slip.width, 24):
        d.ellipse([ex, -8 * SS, ex + 24 * SS, 8 * SS], fill=(0, 0, 0, 0))
        d.ellipse([ex, slip.height - 8 * SS, ex + 24 * SS, slip.height + 8 * SS],
                  fill=(0, 0, 0, 0))
    paste(base, slip, M + 45, top, shadow=120, blur=12, rot=0.7)

    head(base, s["lines"], R, 150, 66, pal, max_w=860)

    yy = top + 70
    for g in s["guarantees"]:
        ar(base, g, R - 78, yy + (row - 34) / 2, 25, ink_s, CAIRO_B, max_w=700)
        lat(base, "OK", M + 78, yy + row / 2 + 6, 15, acc, MONO, anchor="ls")
        rule(base, M + 78, R - 76, yy + row * 0.62, ink_w, 1.0, 120)
        yy += row
    lat(base, "TOTAL", M + 78, yy + 46, 18, ink_w, MONO, anchor="ls")
    lat(base, "500 DA", R - 76, yy + 52, 52, acc, ANTON, anchor="rs")

    # le vide entre le titre et le ticket : un polaroïd collé + un gros prix
    gap = top - (y + 20)
    if gap > 150:
        pw, ph_ = 330, 372
        card = Image.new("RGBA", (pw * SS, ph_ * SS), (0, 0, 0, 0))
        cd = ImageDraw.Draw(card)
        cd.rectangle([0, 0, card.width, card.height], fill=(*CREAM, 255))
        im = Image.open(PHOTOS / s["photo"]).convert("RGB")
        iw, ih = (pw - 28) * SS, (ph_ - 78) * SS
        k = max(iw / im.width, ih / im.height)
        im = im.resize((int(im.width * k), int(im.height * k)), Image.LANCZOS)
        im = im.crop(((im.width - iw) // 2, (im.height - ih) // 2,
                      (im.width + iw) // 2, (im.height + ih) // 2))
        card.paste(im, (14 * SS, 14 * SS))
        cd = ImageDraw.Draw(card)
        cd.text(((pw / 2) * SS, (ph_ - 40) * SS), visual(s.get("caption", "")),
                font=font(CAIRO_M, 19), fill=(96, 76, 112), anchor="mm")
        paste(base, card, 74, y + 46, shadow=110, blur=10, rot=-5)
        lat(base, "500", R - 40, y + gap * 0.55, 132, pal["accent"], ANTON,
            anchor="rs", tracking=-4)
        lat(base, "DA", R - 40, y + gap * 0.55 + 44, 34, pal["soft"], MONO, anchor="rs")

    rnd = random.Random(5)
    bx = M + 78
    bd = ImageDraw.Draw(base)
    for _ in range(44):
        wbar = rnd.choice([2, 3, 5, 7])
        bd.rectangle([bx * SS, (yy + 80) * SS, (bx + wbar) * SS, (yy + 132) * SS],
                     fill=(*ink_s, 255))
        bx += wbar + rnd.choice([3, 5, 8])

    _cta_bar(base, s, pal, 1216)
    return base


def offer_hero(s, pal, i, total, seed=0):
    """Grande promesse en haut, photo en bandeau bas, barre d'action."""
    base = ground(pal, seed, 13)
    photo(base, s["photo"], (-40, 720, W + 40, H + 40), rot=0, seed=101 + seed,
          shadow=0, duotone=duo(pal, seed), torn=(True, True, False, False),
          rough=16)
    halftone(base, (0, 640, W, 760), step=8.0, alpha=24, color=(255, 255, 255))
    paper_noise(base, 10, 1.0)

    wordmark(base, pal, M - 4, 96, "ls")
    counter(base, i, total, pal, "tr")

    y = head(base, s["lines"], R, 190, 88, pal, max_w=940)
    if s.get("caption"):
        y = ar(base, s["caption"], R, y + 16, 24, pal["soft"], CAIRO_M, max_w=700)
    # la liste doit tenir entre le titre et la photo (y < 700)
    n = len(s["guarantees"])
    step = min(58, max(38, (700 - (y + 26)) / n))
    yy = y + 26
    for g in s["guarantees"]:
        marker_word(base, M + 34, yy + 2, 13, 20, pal, 210)
        ar(base, g, R, yy, 23, pal["txt"], CAIRO_B, max_w=860)
        yy += step
    _cta_bar(base, s, pal, 1250, fill=pal["accent"], ink=pal["bg"])
    return base


def cover_stacked(s, pal, i, total, seed=0):
    """Deux bandes photo empilées + le titre pris entre les deux."""
    base = ground(pal, seed, 13)
    pool = ["studio-voice.jpg", "mic-hero.jpg", "phone-hand.jpg",
            "script-notebook.jpg", "man-studio.jpg", "shop-owners.jpg"]
    second = next(p for p in pool[(i + seed) % len(pool):] + pool if p != s["photo"])
    photo(base, s["photo"], (-50, -80, W + 50, 520), rot=-1.2, seed=121 + seed,
          shadow=0, duotone=duo(pal, seed), torn=(False, False, True, True), rough=13,
          zoom=1.0 + (seed % 2) * 0.2)
    photo(base, second, (330, 520, W + 40, 960), rot=1.6, seed=131 + seed,
          shadow=18, duotone=duo(pal, seed + 1), torn=(True, False, False, True),
          rough=13, zoom=1.1 + (seed % 3) * 0.12)
    lat(base, "SAWTIFY", M - 4, 84, 19, pal["txt"], MONO, anchor="ls")
    lat(base, f"{i + 1:02d}/{total:02d}", M - 4, 122, 19, pal["soft"], MONO, anchor="ls")
    y = head(base, s["lines"], R, 990, 78, pal, max_w=900)
    if s.get("promise"):
        ar(base, s["promise"], R, y + 12, 25, pal["soft"], CAIRO_M, max_w=780)
    if s.get("sticker"):
        sticker(base, s["sticker"], 946, 620, 116, pal["accent"], pal["bg"], rot=8)
    return base


def diag_quote(s, pal, i, total, seed=0):
    """Guillemet géant, une citation, deux constats en bas."""
    base = ground(pal, seed, 14, ht=((0, 0, W, 300), 10, 16))
    lat(base, "«", M - 18, 330, 420, pal["accent"], PF_IT, anchor="ls")
    wordmark(base, pal, R - 2, 96, "rs")
    counter(base, i, total, pal, "tl")
    lat(base, s.get("pull", ""), R, 470, 90, pal["txt"], PF_IT, anchor="rs", rot=-1.6)
    y = head(base, s["lines"], R, 560, 44, pal, max_w=820)
    photo(base, s["photo"], (-40, 780, 470, H + 40), rot=-1.0, seed=141 + seed,
          shadow=0, duotone=duo(pal, seed), torn=(False, True, True, False), rough=12)
    yy = y + 40
    for k, item in enumerate(s["items"]):
        ar(base, item, R - 2, yy, 26, pal["txt"], CAIRO_B, max_w=430)
        rule(base, 640, R, yy + 52, pal["txt"], 1.2, 70)
        yy += 96
    return base


def meth_cards(s, pal, i, total, seed=0):
    """Cartes de papier scotchées, empilées en escalier."""
    base = ground(pal, seed, 13, ht=((0, 700, W, H), 9.8, 18))
    wordmark(base, pal, M - 4, 96, "ls")
    counter(base, i, total, pal, "tr")
    # sous-titre mesuré AVANT, pour ne pas empiler les cartes dessus
    h_prom = ar_h(s["promise"], 24, 800) + 10 if s.get("promise") else 0
    h_head = sum(ar_h(ln, 62, 900) for ln in s["lines"])
    y = head(base, s["lines"], R, 170, 62, pal, max_w=900)
    if s.get("promise"):
        ar(base, s["promise"], R, y + 10, 24, pal["soft"], CAIRO_M, max_w=800)
    tone, ink_s, ink_w, acc = slip_colors(pal)
    yy = max(y + 32 + h_prom, 170 + h_head + h_prom + 60)
    for k, (num, t, sub) in enumerate(s["steps"]):
        wed = W - 2 * M - 120 - k * 34
        slip = paper_slip(wed, 158, tone, seed=31 + k)
        paste(base, slip, M + 40 + k * 34, yy, shadow=90, blur=7, rot=-1.6 + k * 1.1)
        scotch(base, M + 40 + k * 34 + 70, yy - 6, 130, 44, rot=-6 + k * 2,
               tone=(255, 255, 255), alpha=170)
        lat(base, num, M + 78 + k * 34, yy + 104, 54, acc, ANTON, anchor="ls")
        ar(base, t, M + wed + 10 + k * 34 - 40, yy + 26, 32, ink_s, CAIRO_B, max_w=wed - 130)
        ar(base, sub, M + wed + 10 + k * 34 - 40, yy + 82, 21, ink_w, CAIRO_M, max_w=wed - 130)
        yy += 186
    return base


def offer_ticket_split(s, pal, i, total, seed=0):
    """Moitié haut : le prix géant. Moitié bas : le papier des détails."""
    base = ground(pal, seed, 13)
    wordmark(base, pal, M - 4, 96, "ls")
    counter(base, i, total, pal, "tr")
    y = head(base, s["lines"], R, 170, 72, pal, max_w=900)
    lat(base, "500", M - 10, 640, 210, pal["accent"], ANTON, anchor="ls", tracking=-8)
    lat(base, "DA  ·  30 s  ·  1 FICHIER", R - 4, 690, 20, pal["soft"], MONO, anchor="rs")
    tone, ink_s, ink_w, acc = slip_colors(pal)
    slip = paper_slip(W - 2 * M + 20, 420, tone, seed=41)
    paste(base, slip, M - 10, 760, shadow=110, blur=10, rot=0.8)
    yy = 810
    for g in s["guarantees"]:
        tick(base, M + 46, yy, 18, acc, 3.0)
        ar(base, g, R - 40, yy - 16, 26, ink_s, CAIRO_B, max_w=740)
        rule(base, M + 50, R - 38, yy + 28, ink_w, 1.0, 90)
        yy += 78
    _cta_bar(base, s, pal, 1216)
    return base


# ═══════════════════════════════════════════════════════════════════════════
#  RÉPARTITION : chaque publication reçoit une combinaison différente
# ═══════════════════════════════════════════════════════════════════════════
COVERS = [cover_hero, cover_flat, cover_circle, cover_stacked]
DIAGS = [diag_paper, diag_strip, diag_split, diag_quote]
METHS = [meth_bands, meth_receipt, meth_numbers, meth_cards]
OFFERS = [offer_stamp, offer_receipt, offer_hero, offer_ticket_split]


# la température change d'une slide à l'autre, et d'un post à l'autre
SEQUENCES = [
    ["violet", "creme", "encre", "violet"],
    ["encre", "violet", "creme", "encre"],
    ["creme", "violet", "encre", "creme"],
    ["violet", "encre", "creme", "nuit"],
    ["creme", "encre", "violet", "violet"],
    ["encre", "creme", "violet", "encre"],
    ["violet", "violet", "creme", "encre"],
    ["creme", "violet", "violet", "nuit"],
]
_BY_KEY = {p["key"]: p for p in PALETTES}


def plan(i: int):
    """4 mises en page + 4 palettes pour la publication i (0-based)."""
    seq = SEQUENCES[i % len(SEQUENCES)]
    return [
        COVERS[i % 4],
        DIAGS[(i * 3) % 4],
        METHS[(i * 3 + 2) % 4],
        OFFERS[(i * 3 + 1) % 4],
    ], [_BY_KEY[k] for k in seq]


def render(pub, idx):
    layouts, pals = plan(idx)
    folder = OUT / pub["slug"]
    folder.mkdir(parents=True, exist_ok=True)
    paths = []
    total = 4
    for k, fn in enumerate(layouts):
        base = fn(pub["slides"][k], pals[k], k, total, seed=idx * 7 + k)
        p = folder / f"{k + 1:02d}.jpg"
        base.convert("RGB").resize((W, H), Image.LANCZOS).save(
            p, quality=94, subsampling=0, optimize=True)
        paths.append(p)
    return paths


def main() -> int:
    from workshop_pubs import PUBS
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default=None)
    ap.add_argument("--sheet", default=None)
    a = ap.parse_args()
    pubs = [(k, p) for k, p in enumerate(PUBS)
            if not a.only or a.only in p["slug"]]
    for k, pub in pubs:
        print(f"▶ {pub['titre']}  ·  {[f.__name__ for f in plan(k)[0]]}")
        for p in render(pub, k):
            print(f"  ✓ {p.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
