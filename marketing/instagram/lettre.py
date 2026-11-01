#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
lettre.py — gabarit « poster » reproduit de la référence client.

 papier texturé · ligne d'attaque · bloc de titre en 3 graisses (Cairo
 Regular / Bold / Black) avec un mot surligné · stickers inclinés à icônes
 vectorielles · mascotte en pastille · logo texte centré en haut.

 Rendu du texte arabe : typekit.py (HarfBuzz) — plus de reshaper, donc
 n'importe quelle police moderne fonctionne.

    python3 lettre.py              → slides/lettre/{dz,fr}/01..05.jpg
    python3 lettre.py --only dz
    python3 lettre.py --planches
"""
from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

import typekit as tk
from typekit import draw as tdraw
from typekit import width as twidth

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "slides" / "lettre"
LOGO = ROOT / "assets" / "logo-mark-trim.png"

W, H = 1080, 1350
SS = 2
M = 84

VIO = (109, 39, 234)
VIO_D = (78, 22, 172)
VIO_SOFT = (223, 210, 255)
ORANGE = (253, 96, 41)
ORANGE_SOFT = (255, 203, 180)
CREAM = (244, 241, 233)
INK = (24, 16, 40)
MUT = (108, 95, 138)

BLACK = "Cairo-Black.ttf"
BOLD = "Cairo-Bold.ttf"
REG = "Cairo-Regular.ttf"
WORD = "SpaceGrotesk-Bold.ttf"

WEIGHT = {"b": BLACK, "m": BOLD, "r": REG}

# grille fixe : toutes les slides partagent les mêmes lignes de base
KICK_Y = 300.0     # kicker
TITLE_TOP = 452.0  # ligne de base de la PREMIÈRE ligne de titre
BODY_Y = 992.0     # paragraphe
STICK_Y = 1096.0   # rangée de stickers

_logo_cache: dict = {}


# ── papier ────────────────────────────────────────────────────────────────
def paper(warm=(255, 255, 255), seed=7, glow=True):
    import random

    rnd = random.Random(seed)
    base = Image.new("RGB", (W * SS, H * SS), CREAM)
    noise = Image.new("L", (W // 2, H // 2))
    noise.putdata([rnd.randint(120, 136) for _ in range(W // 2 * H // 2)])
    grain = Image.merge("RGB", [noise] * 3).resize((W * SS, H * SS),
                                                   Image.BILINEAR)
    base = Image.blend(base, grain, 0.05).filter(ImageFilter.GaussianBlur(0.4))
    d = ImageDraw.Draw(base, "RGBA")
    for x in range(0, W, 54):
        d.line([(x * SS, 0), (x * SS, H * SS)], fill=(120, 100, 160, 8), width=2)
    for y in range(0, H, 54):
        d.line([(0, y * SS), (W * SS, y * SS)], fill=(120, 100, 160, 8), width=2)
    if glow:
        g = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
        gd = ImageDraw.Draw(g)
        gd.ellipse([-280 * SS, -260 * SS, 440 * SS, 380 * SS], fill=(*VIO, 62))
        gd.ellipse([680 * SS, 1020 * SS, 1380 * SS, 1640 * SS],
                   fill=(*ORANGE, 42))
        base = Image.alpha_composite(base.convert("RGBA"),
                                     g.filter(ImageFilter.GaussianBlur(200)))
    return base


def logo(size):
    if size not in _logo_cache:
        src = Image.open(LOGO).convert("RGBA")
        h = int(round(src.height * size / src.width))
        _logo_cache[size] = src.resize((size, h), Image.LANCZOS)
    return _logo_cache[size]


# ── primitives de composition ─────────────────────────────────────────────
def wordmark(base, y=104, size=22):
    d = ImageDraw.Draw(base)
    f = tk._pil(WORD, size)
    txt = "sawtify"
    track = 7.5
    total = sum(d.textlength(c, font=f) / SS for c in txt) + track * (len(txt) - 1)
    x = W / 2 - total / 2
    for c in txt:
        d.text((x * SS, y * SS), c, font=f, fill=VIO, anchor="ls")
        x += d.textlength(c, font=f) / SS + track


def latin(base, text, x, y, size, fill=MUT, name=WORD, align="left",
          track=2.4):
    d = ImageDraw.Draw(base)
    f = tk._pil(name, size)
    total = sum(d.textlength(c, font=f) / SS for c in text) + track * (len(text) - 1)
    if align == "center":
        px = x - total / 2
    elif align == "right":
        px = x - total
    else:
        px = x
    for c in text:
        d.text((px * SS, y * SS), c, font=f, fill=fill, anchor="ls")
        px += d.textlength(c, font=f) / SS + track
    return total


def ink_box(text, name, size):
    w = twidth(text, name, size)
    pad, bs = size * 0.7, size * 2.0
    im = Image.new("L", (int((w + 2 * pad) * SS), int(3.0 * size * SS)), 0)
    tdraw(im, text, pad, bs, size, 255, name, align="left")
    bb = im.getbbox()
    if not bb:
        return 0.0, w, -size * 0.7, 0.0
    return (bb[0] / SS - pad, bb[2] / SS - pad, bb[1] / SS - bs, bb[3] / SS - bs)


def hline(base, tokens, cx, y, size, rtl=True, gap=None):
    """Ligne de titre. tokens = [(texte, poids, surligneur)].

    poids ∈ b/m/r ; surligneur ∈ None | "v" | "o".
    Les tokens sont posés de droite à gauche si rtl (arabe), sinon de
    gauche à droite.
    """
    gap = gap if gap is not None else size * 0.26
    widths = [twidth(t, WEIGHT[w], size) for t, w, _ in tokens]
    total = sum(widths) + gap * (len(tokens) - 1)
    if rtl:
        x = cx + total / 2
        order = list(zip(tokens, widths))
    else:
        x = cx - total / 2
        order = list(zip(tokens, widths))
    for (t, w, mark), tw_ in order:
        if mark:
            col = VIO_SOFT if mark == "v" else ORANGE_SOFT
            il, ir, it, ib = ink_box(t, WEIGHT[w], size)
            px, py = size * 0.13, size * 0.11
            base_x = (x - tw_) if rtl else x
            cxi = base_x + (il + ir) / 2
            half = (ir - il) / 2 + px
            bw, bh = (2 * half), (ib - it + 2 * py)
            bar = Image.new("RGBA", (int(bw * SS), int(bh * SS)), (0, 0, 0, 0))
            ImageDraw.Draw(bar).rounded_rectangle(
                [0, 0, bar.width - 1, bar.height - 1],
                radius=int(size * 0.07 * SS), fill=(*col, 255))
            bar = bar.rotate(-1.2, expand=True, resample=Image.BICUBIC)
            bx = cxi - half - (bar.width / SS - bw) / 2
            by = y + (it + ib) / 2 - bh / 2 - (bar.height / SS - bh) / 2
            base.alpha_composite(bar, (int(bx * SS), int(by * SS)))
        if rtl:
            tdraw(base, t, x, y, size, INK, WEIGHT[w], align="right")
            x -= tw_ + gap
        else:
            tdraw(base, t, x, y, size, INK, WEIGHT[w], align="left")
            x += tw_ + gap
    return y


def para(base, text, cx, y, size, fill=MUT, name=REG, max_w=780, leading=1.55):
    return tk.paragraph(base, text, cx, y, size, fill, name, max_w, leading)


# ── justification arabe (tatweel) ─────────────────────────────────────────
TATWEEL = "\u0640"
DUAL = set("بپتثجچحخسشصضطظعغفقكکگلمنهيىئس")


def _is_ar(ch):
    return "\u0600" <= ch <= "\u06FF"


def _tat_slots(tok):
    """Positions où le tatweel se soude vraiment (après une lettre double)."""
    out = []
    for i in range(len(tok) - 1):
        if tok[i] in DUAL and _is_ar(tok[i + 1]):
            out.append(i)
    return out


def _tat(tok, k, slots=None):
    """Insère k tatweels répartis sur les points de soudure."""
    slots = _tat_slots(tok) if slots is None else slots
    if not slots or k <= 0:
        return tok
    per = [k // len(slots)] * len(slots)
    for j in range(k % len(slots)):
        per[j] += 1
    out, si = "", 0
    for i, ch in enumerate(tok):
        out += ch
        if i < len(tok) - 1 and tok[i] in DUAL and _is_ar(tok[i + 1]):
            out += TATWEEL * per[si]
            si += 1
    return out


def justify(tokens, size, target, gapk=0.26, cap=4, gapmax=0.30):
    """Égalise la ligne : tatweel d'abord (kashida), puis l'interlettrage."""
    toks = list(tokens)
    names = [WEIGHT[w] for _, w, _ in toks]
    base = [t for t, _, _ in toks]
    slots = [_tat_slots(t) for t in base]
    n_gap = max(len(toks) - 1, 1)
    gap0 = size * gapk
    ws = [twidth(t, n, size) for t, n in zip(base, names)]
    natural = sum(ws) + gap0 * (len(toks) - 1)
    extra = target - natural
    if extra <= 1:
        return toks, gap0

    ks = [0] * len(toks)
    rest = extra
    guard = 0
    while rest > 2 and guard < 300:
        guard += 1
        cand = [i for i in range(len(toks)) if ks[i] < cap and slots[i]]
        if not cand:
            break
        i = min(cand, key=lambda i: (ks[i], -ws[i]))
        ks[i] += 1
        nw = twidth(_tat(base[i], ks[i], slots[i]), names[i], size)
        rest -= nw - ws[i]
        ws[i] = nw
    add = min(max(rest, 0) / n_gap, size * gapmax) if len(toks) > 1 else 0.0
    return [(_tat(base[i], ks[i], slots[i]), toks[i][1], toks[i][2])
            for i in range(len(toks))], gap0 + add


# ── stickers ──────────────────────────────────────────────────────────────
def _icon(kind, size, color):
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    s = size
    if kind == "target":
        d.ellipse([s * .10, s * .10, s * .90, s * .90], outline=(*color, 255),
                  width=max(2, int(s * .09)))
        d.ellipse([s * .36, s * .36, s * .64, s * .64], fill=(*color, 255))
        d.line([s * .55, s * .55, s * .92, s * .92], fill=(*color, 255),
               width=max(2, int(s * .09)))
    elif kind == "spark":
        pts = []
        for i in range(8):
            r = s * (0.46 if i % 2 == 0 else 0.17)
            a = math.pi / 4 * i - math.pi / 2
            pts.append((s / 2 + r * math.cos(a), s / 2 + r * math.sin(a)))
        d.polygon(pts, fill=(*color, 255))
    elif kind == "sound":
        d.rounded_rectangle([s * .12, s * .40, s * .34, s * .60],
                            radius=s * .05, fill=(*color, 255))
        d.polygon([(s * .34, s * .50), (s * .62, s * .22),
                   (s * .62, s * .78)], fill=(*color, 255))
        d.arc([s * .58, s * .26, s * .96, s * .74], -60, 60,
              fill=(*color, 255), width=max(2, int(s * .08)))
    elif kind == "tri":
        d.polygon([(s * .15, s * .22), (s * .85, s * .22), (s / 2, s * .82)],
                  fill=(*color, 255))
    return im


def tri(base, cx, cy, size=20, color=ORANGE, rot=0):
    ic = _icon("tri", int(size * SS), color)
    if rot:
        ic = ic.rotate(rot, expand=True, resample=Image.BICUBIC)
    base.alpha_composite(ic, (int((cx - ic.width / 2 / SS) * SS),
                              int((cy - ic.height / 2 / SS) * SS)))


def sticker_size(text, size=22, name=BOLD, icon=None, pad=(26, 20), num=None):
    tw_ = twidth(text, name, size)
    h = size * 1.5 + pad[1] * 2
    ic = int(size * 1.28) if icon else 0
    gap = int(size * 0.42) if icon else 0
    w = pad[0] * 2 + tw_ + (ic + gap if icon else 0)
    return w, h


def sticker(base, text, cx, cy, rot=-6, fill=ORANGE, fg=CREAM, icon=None,
            size=22, name=BOLD, pad=(26, 20), num=None):
    tw_ = twidth(text, name, size)
    nsize = size * 0.92
    ntxt = (num + " ·") if num else ""
    nw = (sum(tk._pil(WORD, nsize).getlength(c) for c in ntxt) / SS
          + 1.8 * (len(ntxt) - 1)) if ntxt else 0
    ngap = size * 0.30 if ntxt else 0
    h = size * 1.5 + pad[1] * 2
    ic = int(size * 1.28) if icon else 0
    gap = int(size * 0.42) if icon else 0
    w = pad[0] * 2 + tw_ + nw + ngap + (ic + gap if icon else 0)
    card = Image.new("RGBA", (int(w * SS), int(h * SS)), (0, 0, 0, 0))
    ImageDraw.Draw(card).rounded_rectangle(
        [0, 0, card.width - 1, card.height - 1], radius=int(h * 0.34 * SS),
        fill=(*fill, 255))
    x = pad[0]
    if ntxt:
        latin(card, ntxt, x, h / 2 + nsize * 0.34, nsize, fg, WORD, "left", 1.8)
        x += nw + ngap
    if icon:
        card.alpha_composite(_icon(icon, int(ic * SS), fg),
                             (int(x * SS), int((h * SS - ic * SS) / 2)))
        x += ic + gap
    tdraw(card, text, x + tw_ / 2, h / 2 + size * 0.36, size, fg, name,
          align="center")
    card = card.rotate(rot, expand=True, resample=Image.BICUBIC)
    shadow = Image.new("RGBA", card.size, (0, 0, 0, 0))
    shadow.paste((26, 12, 52, 88), (0, 0), card.split()[-1])
    shadow = shadow.filter(ImageFilter.GaussianBlur(4.5 * SS))
    px = int((cx - card.width / 2 / SS) * SS)
    py = int((cy - card.height / 2 / SS) * SS)
    base.alpha_composite(shadow, (px + int(2 * SS), py + int(6 * SS)))
    base.alpha_composite(card, (px, py))
    return cy + h / 2


def mascot(base, cx, cy, r):
    lay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ImageDraw.Draw(lay).ellipse([(cx - r) * SS, (cy - r) * SS,
                                 (cx + r) * SS, (cy + r) * SS],
                                fill=(*VIO, 255))
    base.alpha_composite(lay)
    img = logo(int(r * 1.26))
    base.alpha_composite(img, (int((cx - img.width / 2 / SS) * SS),
                               int((cy - img.height / 2 / SS) * SS)))


def finish(base, n, k, last=False):
    d = ImageDraw.Draw(base)
    step, r = 24, 4.5
    x0 = W / 2 - (n - 1) * step / 2
    for i in range(n):
        cx = x0 + i * step
        if i == k:
            d.ellipse([(cx - r) * SS, (H - 66 - r) * SS, (cx + r) * SS,
                       (H - 66 + r) * SS], fill=(*ORANGE, 255))
        else:
            d.ellipse([(cx - r) * SS, (H - 66 - r) * SS, (cx + r) * SS,
                       (H - 66 + r) * SS], fill=(*CREAM, 255),
                      outline=(178, 160, 208, 255), width=2)
    latin(base, "SAWTIFY.SPACE", M, H - 60, 9.5, MUT, WORD, "left", 2.6)
    if not last:
        latin(base, "SWIPE", W - M, H - 60, 9.5, MUT, WORD, "right", 2.6)
        ax = W - M - 52
        d.line([(ax - 12) * SS, (H - 63) * SS, ax * SS, (H - 63) * SS],
               fill=(*MUT, 255), width=int(1.4 * SS))
        d.line([(ax - 12) * SS, (H - 63) * SS, (ax - 6) * SS, (H - 66) * SS],
               fill=(*MUT, 255), width=int(1.4 * SS))
        d.line([(ax - 12) * SS, (H - 63) * SS, (ax - 6) * SS, (H - 60) * SS],
               fill=(*MUT, 255), width=int(1.4 * SS))
    return base


# ═══════════════════════════════════════════════════════════════════════════
#  système « numéroté » — une grille, deux fonds, dossier de 5 slides
# ═══════════════════════════════════════════════════════════════════════════
PAD = 84
BADGE_Y = 132      # ligne de base du badge de pagination
NUM_Y = 496        # ligne de base du grand numéro
NUM_SIZE = 248
LAB_Y = 360        # micro-label (au-dessus du numéro)
T1 = 646           # ligne de base de la 1re ligne de titre
BODY_Y = 1030
RULE_Y = 1206
FOOT_Y = 1254


def mix(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def plate(bg, grain=0.05):
    import random
    rnd = random.Random(5)
    im = Image.new("RGB", (W * SS, H * SS), bg)
    n = Image.new("L", (W // 2, H // 2))
    n.putdata([rnd.randint(118, 138) for _ in range(W // 2 * H // 2)])
    g = Image.merge("RGB", [n] * 3).resize((W * SS, H * SS), Image.BILINEAR)
    return Image.blend(im, g, grain).convert("RGBA")


def _theme(bg):
    if bg == "cream":
        return dict(bg=CREAM, fg=INK, sub=mix(CREAM, INK, 0.60),
                    soft=mix(CREAM, VIO_SOFT, 0.75), accent=VIO,
                    num=mix(CREAM, VIO, 0.34), badge_bg=VIO_SOFT,
                    badge_fg=VIO_D, rule=mix(CREAM, INK, 0.20),
                    card=VIO)
    if bg == "violet":
        return dict(bg=VIO, fg=CREAM, sub=mix(VIO, CREAM, 0.70),
                    soft=mix(VIO, CREAM, 0.16), accent=ORANGE_SOFT,
                    num=mix(VIO, CREAM, 0.30), badge_bg=CREAM,
                    badge_fg=VIO_D, rule=mix(VIO, CREAM, 0.28), card=CREAM)
    return dict(bg=INK, fg=CREAM, sub=mix(INK, CREAM, 0.66),
                soft=mix(INK, VIO_SOFT, 0.40), accent=ORANGE,
                num=mix(INK, VIO_SOFT, 0.34), badge_bg=CREAM,
                badge_fg=INK, rule=mix(INK, CREAM, 0.24), card=CREAM)


def badge(im, text, th):
    d = ImageDraw.Draw(im)
    size, track = 14.0, 2.9
    f = tk._pil(WORD, size)
    total = sum(d.textlength(c, font=f) / SS for c in text) + track * (len(text) - 1)
    w, h = total + size * 3.0, size * 2.7
    x0, y0 = W / 2 - w / 2, BADGE_Y - h * 0.70
    lay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(lay).rounded_rectangle(
        [x0 * SS, y0 * SS, (x0 + w) * SS, (y0 + h) * SS],
        radius=h / 2 * SS, fill=(*th["badge_bg"], 255))
    im.alpha_composite(lay)
    latin(im, text, W / 2, y0 + h * 0.685, size, th["badge_fg"], WORD, "center", track)


def brand(im, th):
    """Wordmark en haut à gauche (la mascotte vit dans le pied de page)."""
    latin(im, "sawtify", PAD, BADGE_Y - 2, 21, th["accent"], WORD, "left", 5.4)


def big_num(im, num, th):
    latin(im, num, PAD - 6, NUM_Y, NUM_SIZE, th["num"], WORD, "left", -NUM_SIZE * 0.045)


def label(im, text, th, arabic=False, y=LAB_Y):
    if arabic:
        tdraw(im, text, W - PAD, y, 30, th["accent"], BOLD, align="right")
    else:
        latin(im, text.upper(), W - PAD, y, 15, th["accent"], WORD, "right", 5.2)


def fit_title(lines, maxw=900, size=84, floor=48, name=BLACK):
    while max(twidth(t, name, size) for t in lines) > maxw and size > floor:
        size -= 2
    return size


def title(im, lines, th, top=T1, size=None, lead=1.34, col=None):
    size = size or fit_title(lines)
    y = top
    for ln in lines:
        tdraw(im, ln, W / 2, y, size, col or th["fg"], BLACK, align="center")
        y += size * lead
    return y - size * lead


def body(im, text, th, y=BODY_Y, size=27, maxw=780):
    para(im, text, W / 2, y, size, th["sub"], REG, maxw, 1.58)


def rule(im, th, y=RULE_Y, x0=PAD, x1=W - PAD):
    ImageDraw.Draw(im).line([x0 * SS, y * SS, x1 * SS, y * SS],
                            fill=(*th["rule"], 255), width=int(1.3 * SS))


def footer(im, th, page="", seal=True):
    """Filet + url + sceau mascotte (remplace la flèche « swipe »)."""
    rule(im, th)
    latin(im, "SAWTIFY.SPACE", PAD, FOOT_Y, 11.5, th["sub"], WORD, "left", 3.4)
    if page:
        latin(im, page, W / 2, FOOT_Y, 11.5, th["sub"], WORD, "center", 3.0)
    if seal:
        r = 27
        cx, cy = W - PAD - r + 6, FOOT_Y - 24
        dark = th["bg"] != CREAM
        if not dark:
            disc(im, cx, cy, r, VIO)
        img = logo(int(r * 1.5))
        im.alpha_composite(img, (int((cx - img.width / 2 / SS) * SS),
                                 int((cy - img.height / 2 / SS) * SS)))


def disc(im, cx, cy, r, fill):
    lay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(lay).ellipse([(cx - r) * SS, (cy - r) * SS,
                                 (cx + r) * SS, (cy + r) * SS],
                                fill=(*fill, 255))
    im.alpha_composite(lay)


def rows(im, items, th, y0=760, step=162, num_size=19):
    """Liste numérotée : pastille à droite, texte à gauche, filet de séparation."""
    for i, (num, head, note) in enumerate(items):
        cy = y0 + i * step
        if i:
            rule(im, th, cy - 68)
        cx = W - PAD - 33
        disc(im, cx, cy, 33, th["soft"])
        latin(im, num, cx, cy + 7, num_size, th["fg"], WORD, "center", 1.2)
        xr = cx - 33 - 26
        tdraw(im, head, xr, cy + 6, 38, th["fg"], BOLD, align="right")
        if note:
            tdraw(im, note, xr, cy + 46, 22, th["sub"], REG, align="right")


def cta(im, p, th, top=1024):
    """Bouton plein + url, posé sur la grille basse."""
    x0, x1, h = PAD, W - PAD, 126
    lay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(lay).rounded_rectangle([x0 * SS, top * SS, x1 * SS, (top + h) * SS],
                                          radius=h / 2 * SS, fill=(*ORANGE, 255))
    im.alpha_composite(lay)
    tdraw(im, p["cta"], W / 2, top + h * 0.60, 38, CREAM, BLACK, align="center")


# ── slides ────────────────────────────────────────────────────────────────
def s01(p, th):
    im = plate(th["bg"])
    badge(im, "01 / 05", th)
    brand(im, th)
    big_num(im, "01", th)
    label(im, p["lab1"], th, p["rtl"])
    title(im, p["t1"], th)
    body(im, p["b1"], th)
    footer(im, th)
    return im


def s02(p, th):
    im = plate(th["bg"])
    badge(im, "02 / 05", th)
    brand(im, th)
    big_num(im, "02", th)
    label(im, p["lab2"], th, p["rtl"])
    title(im, p["t2"], th)
    body(im, p["b2"], th)
    footer(im, th)
    return im


def s03(p, th):
    im = plate(th["bg"])
    badge(im, "03 / 05", th)
    brand(im, th)
    big_num(im, "03", th)
    label(im, p["lab3"], th, p["rtl"])
    title(im, p["t3"], th, top=606, size=fit_title(p["t3"], 880, 68), lead=1.30)
    rows(im, p["steps"], th, y0=800, step=150)
    footer(im, th)
    return im


def s04(p, th):
    im = plate(th["bg"])
    badge(im, "04 / 05", th)
    brand(im, th)
    big_num(im, "04", th)
    label(im, p["lab4"], th, p["rtl"])
    cy = 752
    for txt, lab, cx, fill in ((p["a"], p["la"], W / 2 - 132, mix(th["bg"], VIO_SOFT, 0.92)),
                               (p["b"], p["lb"], W / 2 + 132, mix(th["bg"], ORANGE_SOFT, 0.92))):
        disc(im, cx, cy, 112, fill)
        tdraw(im, txt, cx, cy + 40, 96, INK, BLACK, align="center")
        tdraw(im, lab, cx, cy + 158, 23, th["sub"], BOLD, align="center")
    body(im, p["b4"], th, y=1046, size=26)
    footer(im, th)
    return im


def s05(p, th):
    im = plate(th["bg"])
    badge(im, "05 / 05", th)
    brand(im, th)
    big_num(im, "05", th)
    label(im, p["lab5"], th, p["rtl"])
    title(im, p["t5"], th, size=fit_title(p["t5"], 880, 78))
    cta(im, p, th, top=878)
    latin(im, p["url"], W / 2, 1058, 22, th["fg"], WORD, "center", 1.0)
    para(im, p["note"], W / 2, 1104, 21, th["sub"], REG, 700, 1.45)
    footer(im, th)
    return im


# ═══════════════════════════════════════════════════════════════════════════
#  copy
# ═══════════════════════════════════════════════════════════════════════════
DZ = {
    "id": "dz", "rtl": True, "theme3": "cream",
    "lab1": "المشكل", "lab2": "علاش", "lab3": "واش تدير", "lab4": "الفرق",
    "lab5": "و من بعد",
    "t1": ["كل نهار", "بلا صوت،", "نهار ضايع."],
    "t2": ["اللي ما يسمعش،", "ما يبيعش."],
    "t3": ["ثلاثة خطوات", "و السوم يهدر."],
    "t5": ["ما تبقاش تستنى،", "ابدا درك."],
    "b1": "الفيديو مليح، بصح بلا صوت ما يوقّف حتى واحد.",
    "b2": "ثلاث ثواني بلا صوت، و الزبون يفوت و ما يرجعش.",
    "b4": "الاستوديو يخليك تستنى، احنا نسلّموك قبل ما يبرد الخبر.",
    "steps": [("01", "ابعت السكريبت", "نص جاهز و لا فكرة، تكفي."),
              ("02", "ختر الصوت", "رجال، نسا، و نبرة على ذوقك."),
              ("03", "خود الملف", "24 ساعة و الملف في يدك.")],
    "a": "24", "b": "21", "la": "ساعة تاعنا", "lb": "يوم استوديو",
    "cta": "خود الصوت تاعك درك",
    "url": "sawtify.space",
    "note": "صوت واحد، دارجة جزايرية، 500 دج، في 24 ساعة.",
}

FR = {
    "id": "fr", "rtl": False, "theme3": "cream",
    "lab1": "Le problème", "lab2": "Pourquoi", "lab3": "Quoi faire",
    "lab4": "L’écart", "lab5": "Et après",
    "t1": ["Chaque jour", "sans voix,", "est perdu."],
    "t2": ["Ce qu’on n’écoute pas,", "ne se vend pas."],
    "t3": ["Trois étapes,", "et le prix parle."],
    "t5": ["N’attendez plus,", "commencez maintenant."],
    "b1": "La vidéo est bonne, mais sans son personne ne s’arrête.",
    "b2": "Trois secondes sans son : le client passe et ne revient pas.",
    "b4": "Le studio vous fait attendre ; nous livrons avant que la nouvelle refroidisse.",
    "steps": [("01", "Envoyez le script", "Un texte prêt ou juste une idée."),
              ("02", "Choisissez la voix", "Homme, femme, le ton que vous voulez."),
              ("03", "Recevez le fichier", "24 heures, prêt à publier.")],
    "a": "24", "b": "21", "la": "heures chez nous", "lb": "jours en studio",
    "cta": "Prenez votre voix maintenant",
    "url": "sawtify.space",
    "note": "Une voix, darija algérienne, 500 DA, livrée en 24 h.",
}

PUBS = [DZ, FR]
THEMES = ["cream", "violet", "cream", "cream", "ink"]
SLIDES = [s01, s02, s03, s04, s05]


def render(pub):
    d = OUT / pub["id"]
    d.mkdir(parents=True, exist_ok=True)
    for i, fn in enumerate(SLIDES):
        th = _theme(THEMES[i])
        img = fn(pub, th).convert("RGB").resize((W, H), Image.LANCZOS)
        img.save(d / f"{i + 1:02d}.jpg", quality=95, optimize=True, subsampling=1)
        print("  ✓", pub["id"], f"{i + 1:02d}")


def planches():
    for pub in PUBS:
        files = sorted((OUT / pub["id"]).glob("*.jpg"))
        tw_, th_ = 500, 625
        sheet = Image.new("RGB", (len(files) * (tw_ + 8) + 8, th_ + 16), (30, 18, 56))
        for i, f in enumerate(files):
            sheet.paste(Image.open(f).convert("RGB").resize((tw_, th_), Image.LANCZOS),
                        (8 + i * (tw_ + 8), 8))
        sheet.save(OUT / f"planche-{pub['id']}.jpg", quality=93, optimize=True)
        print("  ✓", f"planche-{pub['id']}.jpg")


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
        if a.only and a.only != pub["id"]:
            continue
        print("·", pub["id"])
        render(pub)


if __name__ == "__main__":
    main()
