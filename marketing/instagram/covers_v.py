#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
covers_v.py — couvertures ALTERNATIVES (variante B) pour les 10 directions.

Chaque direction revient 3 fois sur le mois. La variante B est une vraie
autre composition (photo à un autre endroit, hiérarchie inversée), pas un
changement de couleur : deux publications de la même famille ne se
ressemblent plus.
"""
from __future__ import annotations

from PIL import Image, ImageDraw

from carousel import (P_AURA, P_DEEP, P_INK, P_LILA, P_WHITE, P_VIO, P_VIO_L,
                      W, H, SS)
from direction import (AURA, BOT, DEEP, INK, LIL, PAPER, RIGHT, SAFE, SOFT, VIO,
                       VIOL, _lines, _PT, barcode, brand_top, canvas, disc,
                       dotgrid, dotted, foot, line, mono, para, ph, plate,
                       rect, ring, scrim, stamp, stripes, title)
from workshop import ANTON, CAIRO_B, CAIRO_M, MONO, ar, ar_fit, lat


# ═══════════════════════════════════════════════════════════════════════════
def mag_b(s, k, n, i):
    """Photo plein cadre, bandeau papier en bas (l'inverse de la A)."""
    base = canvas(PAPER, 7)
    ph(base, s.get("photo", "script-notebook.jpg"), (0, 0, W, H), duo=2, fy=0.3)
    scrim(base, (0, 0, W, 250), INK, 120)
    brand_top(base, k, n, dark=True, style="rule")
    h = 690
    plate(base, (0, h, W, H), DEEP, 0)
    rect(base, (0, h, W, h + 8), AURA)
    mono(base, "édito · la voix qui vend", SAFE, h + 46, 10.5, LIL, track=2.4)
    mono(base, "500 da · 30 s", RIGHT, h + 46, 10.5, LIL, anchor="rs", track=1.8)
    yy = title(base, _lines(s), RIGHT, h + 84, 760, 260, 72, P_WHITE, hi=AURA,
               leading=1.04)
    disp = str(s.get("display", "")).strip()
    if disp:
        plate(base, (SAFE, H - 300, SAFE + 210, H - 176), AURA, 0)
        ds = ar_fit(base, disp, 180, 54, ANTON, 24)
        lat(base, disp, SAFE + 105, H - 192, ds, INK, ANTON, anchor="ms",
            tracking=-2)
        mono(base, "chiffre clé", SAFE, H - 140, 10, LIL, track=2.2)
    if s.get("promise"):
        para(base, s["promise"], RIGHT, min(yy + 18, H - 130), 600, 18, LIL,
             hi=AURA, floor=12)
    foot(base, k, n, dark=True, label=s.get("sticker") or "sawtify.space")
    return base


def aff_b(s, k, n, i):
    """Affiche inversée : photo plein cadre, mot géant posé en haut."""
    base = canvas(PAPER, 8)
    ph(base, s.get("photo", "studio-voice.jpg"), (0, 120, W, 1010), duo=1, fy=0.3)
    scrim(base, (0, 120, W, 470), INK, 130)
    rect(base, (0, 0, W, 120), PAPER)
    brand_top(base, k, n, style="center")
    disp = str(s.get("display", "")).strip()
    if disp:
        ds = ar_fit(base, disp, 900, 150, ANTON, 44)
        lat(base, disp, W / 2, 330, ds if len(disp) < 5 else 118, P_WHITE, ANTON,
            anchor="ms", tracking=-5)
        mono(base, "chiffre clé · marché dz", W / 2, 404, 11, P_WHITE,
             anchor="ms", track=3.0)
    rect(base, (0, 1010, W, 1030), AURA)
    mono(base, "édito darija · novembre 2026", SAFE, 1080, 10.5, SOFT, track=2.2)
    yy = title(base, _lines(s), RIGHT, 1100, 956, 150, 62, INK, hi=VIO,
               leading=1.02)
    if s.get("promise"):
        para(base, s["promise"], RIGHT, min(yy + 12, 1216), 620, 16, SOFT,
             hi=VIO, floor=11)
    mono(base, "sans abonnement", SAFE, 1216, 10, SOFT, track=2.0)
    foot(base, k, n, style="thick")
    return base


def cin_b(s, k, n, i):
    """Cinéma inversé : fond noir, typographie seule, photo en vignette."""
    base = canvas(INK, 14)
    rect(base, (0, 0, W, 74), INK)
    rect(base, (0, H - 74, W, H), INK)
    lat(base, "SAWTIFY PICTURES", W / 2, 50, 12.5, P_WHITE, MONO, anchor="ms",
        tracking=6)
    brand_top(base, k, n, dark=True, style="stack")
    disp = str(s.get("display", "")).strip()
    yy = 200
    if disp:
        ds = ar_fit(base, disp, 900, 170, ANTON, 40)
        lat(base, disp, SAFE, 320, ds, P_WHITE, ANTON, anchor="ls", tracking=-5)
        line(base, SAFE, 352, SAFE + 200, 352, AURA, 4)
        yy = 420
    for ln in _lines(s)[:2]:
        yy = para(base, ln, RIGHT, yy, 940, 50, P_WHITE, hi=AURA, floor=22,
                  leading=1.12) + 4
    ph(base, s.get("photo", "man-studio.jpg"), (SAFE, 780, 660, 1120), duo=1,
       fy=0.3)
    ring(base, 760, 950, 44, AURA, 2.0)
    lat(base, "▶", 760, 962, 22, AURA, MONO, anchor="ms", tracking=0)
    para(base, "شوف الفرق بين صوت وصوت.", RIGHT, 900, 300, 19, LIL, hi=AURA,
         floor=13)
    lat(base, f"{k + 1:02d}/{n:02d}", W / 2, H - 26, 12, LIL, MONO, anchor="ms",
        tracking=4)
    return base


def ben_b(s, k, n, i):
    """Bento inversé : grande photo à droite, colonne de tuiles à gauche."""
    base = canvas(LIL, 6)
    rect(base, (0, 0, W, 200), INK)
    brand_top(base, k, n, dark=True, style="corner")
    mono(base, "édition darija · fiche de marque", SAFE, 150, 10, LIL, track=2.4)
    lat(base, "SAWTIFY", SAFE, 186, 34, P_WHITE, ANTON, anchor="ls", tracking=0)
    ph(base, s.get("photo", "studio-voice.jpg"), (470, 228, RIGHT, 900), duo=2,
       fy=0.32, radius=28)
    plate(base, (SAFE, 228, 440, 520), VIO, 26)
    disp = str(s.get("display", "")).strip()
    if disp:
        ds = ar_fit(base, disp, 300, 78, ANTON, 30)
        lat(base, disp, SAFE + 26, 470, ds, P_WHITE, ANTON, anchor="ls",
            tracking=-3)
    mono(base, "chiffre clé", SAFE + 26, 502, 10, LIL, track=2.2)
    plate(base, (SAFE, 546, 440, 900), P_WHITE, 26)
    yy = title(base, _lines(s), 414, 580, 316, 260, 40, INK, hi=VIO, leading=1.04)
    if s.get("promise"):
        para(base, s["promise"], 414, min(yy + 14, 820), 300, 15, SOFT, hi=VIO,
             floor=10)
    plate(base, (SAFE, 926, RIGHT, 1104), AURA, 26)
    lat(base, "500 DA", SAFE + 28, 1000, 40, INK, ANTON, anchor="ls",
        tracking=-1)
    mono(base, "sans abonnement · 30 s", SAFE + 28, 1044, 10.5, INK, track=1.8)
    para(base, _PT["mini"], RIGHT - 28, 960, 460, 19, INK, hi=INK, floor=12)
    plate(base, (SAFE, 1120, RIGHT, 1200), INK, 40)
    lat(base, "sawtify.space", W / 2, 1178, 22, P_WHITE, MONO, anchor="ms",
        tracking=1.2)
    foot(base, k, n)
    return base


def dip_b(s, k, n, i):
    """Diptyque inversé : 40/60, titre à gauche sur papier, photo à droite."""
    base = canvas(PAPER, 6)
    ph(base, s.get("photo", "mic-hero.jpg"), (W * 0.42, 0, W, H), duo=1, fy=0.3)
    plate(base, (0, 0, W * 0.42, H), PAPER, 0)
    rect(base, (0, 0, W * 0.42, 12), VIO)
    brand_top(base, k, n, style="edge")
    mono(base, "diptyque · darija dz", SAFE, 170, 10.5, VIO, track=2.4)
    disp = str(s.get("display", "")).strip()
    if disp:
        plate(base, (SAFE, 200, SAFE + 190, 300), DEEP, 4)
        ds = ar_fit(base, disp, 160, 48, ANTON, 22)
        lat(base, disp, SAFE + 95, 286, ds, P_WHITE, ANTON, anchor="ms",
            tracking=-2)
    yy = title(base, _lines(s), SAFE + 300, 340, 300, 420, 52, INK, hi=VIO,
               leading=1.06)
    if s.get("promise"):
        para(base, s["promise"], SAFE + 300, min(yy + 20, 900), 300, 16, SOFT,
             hi=VIO, floor=11)
    for r, (a, b) in enumerate([("voix", "darija"), ("prix", "500 da")]):
        top = 940 + r * 70
        line(base, SAFE, top, W * 0.42 - 20, top, INK, 0.7, 80)
        mono(base, a, SAFE, top + 32, 9.5, SOFT, track=1.8)
        mono(base, b, W * 0.42 - 20, top + 32, 11, INK, anchor="rs", track=1.2)
    mono(base, "photo · studio maison", W * 0.42 + 20, H - 60, 9.5, P_WHITE,
         track=1.8)
    foot(base, k, n, label=s.get("sticker") or "sawtify.space")
    return base


def fic_b(s, k, n, i):
    """Fiche inversée : photo plein largeur, champs dans une colonne."""
    base = canvas(PAPER, 5)
    brand_top(base, k, n, style="tag")
    ph(base, s.get("photo", "phone-hand.jpg"), (SAFE, 110, RIGHT, 720), duo=1,
       fy=0.4, radius=2)
    plate(base, (SAFE, 110, SAFE + 236, 214), AURA, 0)
    disp = str(s.get("display", "")).strip()
    if disp:
        ds = ar_fit(base, disp, 200, 54, ANTON, 26)
        lat(base, disp, SAFE + 118, 198, ds, INK, ANTON, anchor="ms", tracking=-2)
    line(base, SAFE, 750, RIGHT, 750, INK, 1.6, 210)
    mono(base, "fiche · service voix darija", SAFE, 786, 11, VIO, track=2.4)
    yy = title(base, _lines(s), RIGHT, 810, 940, 190, 60, INK, hi=VIO)
    if s.get("promise"):
        para(base, s["promise"], RIGHT, min(yy + 14, 1030), 720, 17, SOFT,
             hi=VIO, floor=11)
    for j, (lab, val) in enumerate([("réf.", "SWT-DZ"), ("format", "1080×1350"),
                                    ("prix", "500 da")]):
        top = 1060 + j * 46
        mono(base, lab, SAFE, top + 14, 9.5, SOFT, track=1.8)
        mono(base, val, 400, top + 14, 11, INK, track=1.2)
        dotted(base, SAFE + 60, 380, top + 14, SOFT, 8, 1.2, 110)
    stamp(base, RIGHT - 60, 1140, 50, "CONTRÔLÉ", "QUALITÉ", VIO, 9)
    foot(base, k, n, label=s.get("sticker") or "sawtify.space")
    return base


def tic_b(s, k, n, i):
    """Ticket inversé : les lignes d'abord, la photo en bas du reçu."""
    base = canvas(LIL, 6)
    rect(base, (0, 0, W, 88), VIO)
    brand_top(base, k, n, dark=True, style="tag")
    plate(base, (SAFE, 110, RIGHT, BOT - 40), PAPER, 10,
          outline=(210, 200, 230), ow=1.4)
    mono(base, "reçu · sawtify darija", SAFE + 26, 156, 10.5, VIO, track=2.4)
    mono(base, f"n° {3100 + i * 5:05d}", RIGHT - 26, 156, 10.5, SOFT,
         anchor="rs", track=1.4)
    line(base, SAFE + 26, 176, RIGHT - 26, 176, SOFT, 0.8, 120)
    yy = title(base, _lines(s), RIGHT - 26, 200, 880, 210, 60, INK, hi=VIO)
    disp = str(s.get("display", "")).strip()
    if disp:
        plate(base, (SAFE + 26, 400, SAFE + 246, 494), AURA, 4)
        ds = ar_fit(base, disp, 190, 46, ANTON, 24)
        lat(base, disp, SAFE + 136, 480, ds, INK, ANTON, anchor="ms", tracking=-2)
    for j, (lab, val) in enumerate([("service", "voix darija"),
                                    ("durée", "30 s"), ("prix", "500 da")]):
        top = 520 + j * 42
        mono(base, lab, SAFE + 26, top + 14, 10, SOFT, track=1.8)
        mono(base, val, RIGHT - 26, top + 14, 11, INK, anchor="rs", track=1.2)
        dotted(base, SAFE + 110, RIGHT - 130, top + 14, SOFT, 7, 1.1, 130)
    ph(base, s.get("photo", "phone-hand.jpg"), (SAFE + 26, 660, RIGHT - 26, 1030),
       duo=1, fy=0.42, radius=6)
    line(base, SAFE + 26, 1050, RIGHT - 26, 1050, SOFT, 0.8, 120)
    lat(base, "500 DA", SAFE + 26, 1130, 44, INK, ANTON, anchor="ls", tracking=-1)
    barcode(base, RIGHT - 246, 1090, 220, 44, INK)
    mono(base, "merci · شكرا", SAFE + 26, 1170, 10, SOFT, track=2.0)
    foot(base, k, n, label=s.get("sticker") or "sawtify.space")
    return base


def fri_b(s, k, n, i):
    """Frise inversée : rail vertical + colonne de vignettes photo."""
    base = canvas(PAPER, 7)
    brand_top(base, k, n, style="stack")
    mono(base, "la frise · trois repères", SAFE, 150, 11.5, VIO, track=2.6)
    line(base, 120, 190, 120, 1120, VIO, 2.0, 90)
    for j, (pic, lab) in enumerate([("mic-hero.jpg", "J 01"),
                                    ("studio-voice.jpg", "J 02"),
                                    ("phone-hand.jpg", "J 03")]):
        cy = 260 + j * 300
        ring(base, 120, cy, 22, AURA, 2.2)
        lat(base, f"{j + 1}", 120, cy + 12, 18, INK, ANTON, anchor="ms",
            tracking=0)
        ph(base, pic, (170, cy - 90, 470, cy + 90), duo=j % 3, fy=0.36)
        mono(base, lab, 170, cy + 130, 10, SOFT, track=2.0)
    disp = str(s.get("display", "")).strip()
    if disp:
        ds = ar_fit(base, disp, 380, 88, ANTON, 40)
        lat(base, disp, RIGHT, 260, ds, VIO, ANTON, anchor="rs", tracking=-4)
        mono(base, "chiffre clé", RIGHT, 300, 10, SOFT, anchor="rs", track=2.2)
    yy = title(base, _lines(s), RIGHT, 350, 520, 320, 52, INK, hi=VIO,
               leading=1.06)
    if s.get("promise"):
        para(base, s["promise"], RIGHT, min(yy + 18, 760), 500, 17, SOFT,
             hi=VIO, floor=11)
    line(base, 560, 830, RIGHT, 830, INK, 0.9, 100)
    for r, (a, b) in enumerate([("voix", "darija dz"), ("format", "30 s"),
                                ("prix", "500 da"), ("délai", "24 h"),
                                ("abonnement", "aucun")]):
        top = 850 + r * 54
        mono(base, a, 560, top + 22, 9.5, SOFT, track=1.8)
        mono(base, b, RIGHT, top + 22, 11, INK, anchor="rs", track=1.2)
        line(base, 560, top + 36, RIGHT, top + 36, INK, 0.5, 60)
    para(base, _PT["mini"], RIGHT, 1150, 460, 16, VIO, hi=VIO, floor=11)
    foot(base, k, n, label=s.get("sticker") or "sawtify.space")
    return base


def man_b(s, k, n, i):
    """Manifeste inversé : papier clair, pavé orange, type noir géant."""
    base = canvas(PAPER, 10)
    brand_top(base, k, n, style="edge")
    rect(base, (SAFE, 120, SAFE + 260, 168), AURA)
    mono(base, "manifeste", SAFE + 130, 152, 11, INK, anchor="ms", track=3.0)
    yy = 220
    for ln in _lines(s)[:3]:
        yy = para(base, ln, RIGHT, yy, 940, 76, INK, hi=VIO, floor=26,
                  leading=1.02) + 2
    disp = str(s.get("display", "")).strip()
    if disp:
        ds = ar_fit(base, disp, 420, 110, ANTON, 44)
        lat(base, disp, SAFE, 700, ds, VIO, ANTON, anchor="ls", tracking=-5)
        mono(base, "chiffre clé", SAFE, 740, 10.5, SOFT, track=2.4)
    ph(base, s.get("photo", "man-studio.jpg"), (SAFE, 800, RIGHT, 1160), duo=0,
       fy=0.32, radius=0)
    if s.get("promise"):
        para(base, s["promise"], RIGHT, 1186, 780, 16, SOFT, hi=VIO, floor=11)
    foot(base, k, n, dots=False, label=s.get("sticker") or "sawtify.space")
    return base


def geo_b(s, k, n, i):
    """Géométrie inversée : photo à droite, cercles à gauche, type à plat."""
    base = canvas(P_WHITE, 0)
    disc(base, 210, 1010, 250, LIL)
    disc(base, 210, 1010, 168, VIO)
    ph(base, s.get("photo", "shop-owners.jpg"), (W * 0.46, 120, RIGHT, 900),
       duo=2, fy=0.3)
    rect(base, (W * 0.46, 120, W * 0.46 + 6, 900), INK)
    brand_top(base, k, n, style="center")
    mono(base, "géométrie · édito", SAFE, 150, 11, VIO, track=2.6)
    disp = str(s.get("display", "")).strip()
    if disp:
        ds = ar_fit(base, disp, 260, 62, ANTON, 26)
        lat(base, disp, 210, 1032, ds, P_WHITE, ANTON, anchor="ms", tracking=-2)
    yy = title(base, _lines(s), W * 0.46 - 30, 200, 380, 380, 50, INK, hi=VIO,
               leading=1.06)
    if s.get("promise"):
        para(base, s["promise"], W * 0.46 - 30, min(yy + 20, 700), 360, 16,
             SOFT, hi=VIO, floor=11)
    plate(base, (SAFE, 700, W * 0.46 - 30, 780), INK, 26)
    lat(base, "voir", SAFE + 30, 752, 20, P_WHITE, ANTON, anchor="ls",
        tracking=2)
    lat(base, "→", W * 0.46 - 60, 752, 22, AURA, MONO, anchor="rs", tracking=0)
    para(base, _PT["mini"], RIGHT, 950, 440, 18, INK, hi=VIO, floor=12)
    foot(base, k, n, style="thick", label=s.get("sticker") or "sawtify.space")
    return base


COVERS_B = {
    "magazine": mag_b, "affiche": aff_b, "cinema": cin_b, "bento": ben_b,
    "diptyque": dip_b, "fiche": fic_b, "ticket": tic_b, "frise": fri_b,
    "manifeste": man_b, "geometrie": geo_b,
}
