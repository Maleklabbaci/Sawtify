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
#  deux gabarits : « page » (magazine naskh) et « billet » (fiche perforée)
# ═══════════════════════════════════════════════════════════════════════════
M = 84
VIOF = (109, 39, 234)
ORGF = (253, 96, 41)
CREMF = (244, 241, 233)
INKF = (20, 13, 33)

AMIRI = "Amiri-Bold.ttf"
AMIRI_R = "Amiri-Regular.ttf"
LALEZAR = "Lalezar-Regular.ttf"
ALEX = "Alexandria-Bold.ttf"
KUFI = "NotoKufi-Black.ttf"
SERIF_I = "InstrumentSerif-Italic.ttf"
PLAY_B = "Playfair-Bold.ttf"
PLAY_I = "Playfair-BoldItalic.ttf"
ANTON_F = "Anton-Regular.ttf"
SG = "SpaceGrotesk-Bold.ttf"
SGR = "SpaceGrotesk-Regular.ttf"
PLEX = "IBMPlexSansArabic-Regular.ttf"


def grain(bg=CREMF, amount=0.05, seed=9):
    import random
    rnd = random.Random(seed)
    im = Image.new("RGB", (W * SS, H * SS), bg)
    n = Image.new("L", (W // 2, H // 2))
    n.putdata([rnd.randint(118, 138) for _ in range(W // 2 * H // 2)])
    g = Image.merge("RGB", [n] * 3).resize((W * SS, H * SS), Image.BILINEAR)
    return Image.blend(im, g, amount).convert("RGBA")


def lat(im, text, x, y, size, col, name=SG, align="left", track=2.4):
    d = ImageDraw.Draw(im)
    f = tk._pil(name, size)
    total = sum(d.textlength(c, font=f) / SS for c in text) + track * (len(text) - 1)
    px = x - total if align == "right" else (x - total / 2 if align == "center" else x)
    for c in text:
        d.text((px * SS, y * SS), c, font=f, fill=col, anchor="ls")
        px += d.textlength(c, font=f) / SS + track
    return total


def hr(im, y, x0=M, x1=W - M, col=INKF, a=80, wd=1.4):
    ImageDraw.Draw(im).line([x0 * SS, y * SS, x1 * SS, y * SS],
                            fill=(*col, a), width=int(wd * SS))


def mark(im, cx, cy, w):
    src = Image.open(LOGO).convert("RGBA")
    h = int(round(src.height * w / src.width))
    src = src.resize((w, h), Image.LANCZOS)
    im.alpha_composite(src, (int((cx - w / 2) * SS), int((cy - h / 2) * SS)))


def disk(im, cx, cy, r, fill):
    lay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(lay).ellipse([(cx - r) * SS, (cy - r) * SS,
                                 (cx + r) * SS, (cy + r) * SS], fill=(*fill, 255))
    im.alpha_composite(lay)


# ── égalisation des lignes arabes (kashida) ──────────────────────────────
def _tatk(word, k):
    slots = _tat_slots(word)
    if not slots or k <= 0:
        return None
    return _tat(word, k, slots)


def stretch(words, size, target, name, gapk=0.22, gapmax=0.40, tatmax=1):
    """Égalise les lignes : un peu d'interlettrage, au pire un tatweel par mot."""
    gap0 = size * gapk
    ws = [twidth(w, name, size) for w in words]
    n = len(words)
    extra = target - (sum(ws) + gap0 * (n - 1))
    if extra <= 2:
        return list(words), gap0
    # 1. d'abord l'interlettrage (invisible), plafonné
    add = min(extra / max(n - 1, 1), size * (gapmax - gapk))
    gap = gap0 + add
    extra -= add * max(n - 1, 1)
    # 2. le reste en kashida, très parcimonieusement
    out = list(words)
    if extra > 2 and tatmax:
        order = sorted(range(n), key=lambda i: ws[i])
        for step in range(tatmax):
            if extra <= 2:
                break
            for i in order:
                cand = _tatk(out[i], step + 1)
                if cand is None:
                    continue
                nw = twidth(cand, name, size)
                if nw - ws[i] <= extra + 40:
                    extra -= nw - ws[i]
                    ws[i] = nw
                    out[i] = cand
                    break
    return out, gap


def headline(im, lines, size, y0, target, col=INKF, name=AMIRI, lead=1.30,
             gapk=0.22, rtl=True, maxw=910):
    while size > 40:
        gp = size * gapk
        wid = max(sum(twidth(w, name, size) for w in ln) + gp * (len(ln) - 1)
                  for ln in lines)
        if wid <= maxw:
            break
        size -= 2
    y = y0
    for words in lines:
        w2, gap = stretch(words, size, target, name, gapk)
        widths = [twidth(w, name, size) for w in w2]
        total = sum(widths) + gap * (len(w2) - 1)
        if rtl:
            x = W - M
            for w, wd in zip(w2, widths):
                tdraw(im, w, x, y, size, col, name, align="right")
                x -= wd + gap
        else:
            x = M
            for w, wd in zip(w2, widths):
                tdraw(im, w, x, y, size, col, name, align="left")
                x += wd + gap
        y += size * lead
    return y - size * lead


def target_of(lines, size, name, gapk=0.24):
    gap = size * gapk
    return max(sum(twidth(w, name, size) for w in ln) + gap * (len(ln) - 1)
               for ln in lines)


def arc_body(im, text, y, size=29, col=(78, 66, 104), maxw=790, rtl=True):
    return tk.paragraph(im, text, W - M if rtl else M, y, size, col, PLEX,
                        maxw, 1.62, align="right" if rtl else "left")


# ── gabarit « page » ─────────────────────────────────────────────────────
def header(im, num, date, col=INKF, sub=MUT):
    lat(im, "SAWTIFY", M, 108, 13, col, SG, "left", 5.6)
    lat(im, date, W - M, 106, 22, sub, SERIF_I, "right", 0.4)
    hr(im, 150, M, W - M, col, 90)


def foot(im, page, col=INKF, sub=MUT, logo_size=0):
    if logo_size:
        mark(im, W - M - logo_size / 2, 1268, logo_size)
    lat(im, "sawtify.space", M, 1274, 15, col, SG, "left", 1.4)
    lat(im, page, W - M - (logo_size + 26 if logo_size else 0), 1274, 12,
        sub, SG, "right", 3.2)


def photo_band(im, path, top=1000, height=300, tint=(26, 14, 42, 122)):
    ph = Image.new("RGBA", (W * SS, int(height * SS)), (0, 0, 0, 0))
    src = tk_pair(path, W, height)
    ph.alpha_composite(src, (0, 0))
    im.alpha_composite(ph, (0, int(top * SS)))
    ov = Image.new("RGBA", (W * SS, int(height * SS)), tint)
    im.alpha_composite(ov, (0, int(top * SS)))


def tk_pair(path, w, h):
    src = Image.open(ROOT / path).convert("RGB")
    s = max(w / src.width, h / src.height)
    src = src.resize((int(src.width * s) + 1, int(src.height * s) + 1), Image.LANCZOS)
    left = (src.width - w) // 2
    top = int(max(0, (src.height - h) * 0.35))
    out = src.crop((left, top, left + w, top + h))
    return out.resize((w * SS, h * SS), Image.LANCZOS).convert("RGBA")


def page(p, spec, num, date, page_no):
    im = grain()
    header(im, num, date)
    y = headline(im, spec["lines"], spec["size"], spec["top"], spec["target"],
                 spec.get("col", INKF), spec.get("font", AMIRI),
                 spec.get("lead", 1.30), spec.get("gapk", 0.24))
    yy = y + spec.get("sub_dy", 78)
    if spec.get("sub"):
        lat(im, spec["sub"], W - M, yy, 34, (122, 110, 150), SERIF_I, "right", 0.4)
    if spec.get("body"):
        by = spec.get("body_y", 0) or (yy + 74)
        hr(im, by - 46, M, W - M, INKF, 60)
        arc_body(im, spec["body"], by, spec.get("body_size", 29))
    if spec.get("photo"):
        photo_band(im, spec["photo"], spec.get("band_top", 1000),
                   spec.get("band_h", 300))
    for fn in spec.get("extra", ()):
        fn(im)
    foot(im, page_no, spec.get("foot_col", INKF), logo_size=spec.get("logo", 0))
    return im


# ── gabarit « billet » ───────────────────────────────────────────────────
def dashed(im, inset=40, col=INKF, a=110, dash=15, gap=12, wd=1.6, r=20):
    d = ImageDraw.Draw(im)
    x0, y0, x1, y1 = inset, inset, W - inset, H - inset
    step = dash + gap
    for x in range(x0, int(x1), step):
        d.line([x * SS, y0 * SS, min(x + dash, x1) * SS, y0 * SS], fill=(*col, a), width=int(wd * SS))
        d.line([x * SS, y1 * SS, min(x + dash, x1) * SS, y1 * SS], fill=(*col, a), width=int(wd * SS))
    for y in range(y0, int(y1), step):
        d.line([x0 * SS, y * SS, x0 * SS, min(y + dash, y1) * SS], fill=(*col, a), width=int(wd * SS))
        d.line([x1 * SS, y * SS, x1 * SS, min(y + dash, y1) * SS], fill=(*col, a), width=int(wd * SS))


def perfo(im, y, col=INKF, a=95):
    d = ImageDraw.Draw(im)
    for x in range(M, W - M, 18):
        d.line([x * SS, y * SS, (x + 9) * SS, y * SS], fill=(*col, a), width=int(1.6 * SS))
    for cx in (M - 6, W - M + 6):
        d.ellipse([(cx - 14) * SS, (y - 14) * SS, (cx + 14) * SS, (y + 14) * SS],
                  fill=(*CREMF, 255))


def stamp(im, cx, cy, r, l1, l2, col=ORGF, font=KUFI, rot=-8):
    size = int(2 * r) + 10
    s = Image.new("RGBA", (size * SS, size * SS), (0, 0, 0, 0))
    sd = ImageDraw.Draw(s)
    sd.ellipse([5, 5, s.width - 6, s.height - 6], outline=(*col, 255), width=int(4 * SS))
    d1 = size / 2 + (2 if l2 else 22)
    if l1:
        tdraw(s, l1, size / 2, d1, 30, col, font, align="center")
    if l2:
        tdraw(s, l2, size / 2, size / 2 + 42, 30, col, font, align="center")
    im.alpha_composite(s.rotate(rot, expand=True, resample=Image.BICUBIC),
                       (int((cx - size / 2) * SS), int((cy - size / 2) * SS)))


def billet(p, spec, num, date, page_no):
    im = grain()
    dashed(im)
    lat(im, "SAWTIFY", M, 122, 12, INKF, SG, "left", 5.0)
    lat(im, date, W - M, 120, 10, (122, 110, 150), SG, "right", 3.6)
    y = headline(im, spec["lines"], spec["size"], spec["top"], spec["target"],
                 spec.get("col", INKF), spec.get("font", AMIRI),
                 spec.get("lead", 1.30), spec.get("gapk", 0.24))
    if spec.get("sub"):
        lat(im, spec["sub"], W - M, y + 82, 30, (122, 110, 150), SERIF_I, "right", 0.4)
    for fn in spec.get("extra", ()):
        fn(im)
    foot(im, page_no, INKF, logo_size=spec.get("logo", 0))
    return im


# ═══════════════════════════════════════════════════════════════════════════
#  copy
# ═══════════════════════════════════════════════════════════════════════════
DZ = {
    "id": "dz", "rtl": True, "date": "n° 01 — novembre 2026",
    "t1": [["كل", "نهار"], ["بلا", "صوت،"], ["نهار", "ضايع."]],
    "sub1": "the voice that sells",
    "b1": "الفيديو مليح، بصح بلا صوت ما يوقّف حتى واحد.",
    "t2": [["اللي", "ما", "يسمعش"], ["ما", "يبيعش."]],
    "sub2": "trois secondes, c’est tout",
    "b2": "ثلاث ثواني بلا صوت، و الزبون يفوت و ما يرجعش.",
    "t3": [["ثلاث", "خطوات"], ["و", "السوم", "يهدر"]],
    "steps": [("01", "ابعت السكريبت", "نص جاهز و لا فكرة، تكفي."),
              ("02", "ختر الصوت", "رجال، نسا، و نبرة على ذوقك."),
              ("03", "خود الملف", "24 ساعة و الملف في يدك.")],
    "t4": [["24", "ساعة"], ["و", "لا", "21", "يوم"]],
    "sub4": "le studio attend, nous livrons",
    "b4": "الاستوديو يخليك تستنى، احنا نسلّموك قبل ما يبرد الخبر.",
    "t5": [["ما", "تبقاش"], ["تستنى،", "ابدا", "درك."]],
    "sub5": "500 DA · 24 h · darja",
    "cta": "خود الصوت تاعك درك",
    "url": "sawtify.space",
}

FR = {
    "id": "fr", "rtl": False, "date": "n° 01 — novembre 2026",
    "t1": [["Chaque", "jour"], ["sans", "voix,"], ["est", "perdu."]],
    "sub1": "the voice that sells",
    "b1": "La vidéo est bonne, mais sans son personne ne s’arrête.",
    "t2": [["Ce", "qu’on", "n’écoute"], ["pas", "ne", "se", "vend."]],
    "sub2": "trois secondes, c’est tout",
    "b2": "Trois secondes sans son : le client passe et ne revient pas.",
    "t3": [["Trois", "étapes"], ["et", "le", "prix", "parle."]],
    "steps": [("01", "Envoyez le script", "Un texte prêt ou juste une idée."),
              ("02", "Choisissez la voix", "Homme, femme, le ton que vous voulez."),
              ("03", "Recevez le fichier", "24 heures, prêt à publier.")],
    "t4": [["24", "heures"], ["et", "pas", "21", "jours"]],
    "sub4": "le studio attend, nous livrons",
    "b4": "Le studio vous fait attendre ; nous livrons avant que la nouvelle refroidisse.",
    "t5": [["N’attendez", "plus,"], ["commencez", "maintenant."]],
    "sub5": "500 DA · 24 h · darija",
    "cta": "Prenez votre voix maintenant",
    "url": "sawtify.space",
}


# ── slides ───────────────────────────────────────────────────────────────
def cta_band(im, text, top, h=132, col=ORGF, fg=CREMF, size=40, name=AMIRI,
             track=None):
    lay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(lay).rectangle([M * SS, top * SS, (W - M) * SS, (top + h) * SS],
                                  fill=(*col, 255))
    im.alpha_composite(lay)
    tdraw(im, text, W / 2, top + h * 0.66, size, fg, name, align="center")


def s1(p):
    im = grain()
    header(im, "01", p["date"])
    spec = dict(lines=p["t1"], size=118, top=368, target=900, lead=1.26)
    y = headline(im, spec["lines"], spec["size"], spec["top"], spec["target"],
                 name=p["font"], rtl=p["rtl"])
    lat(im, p["sub1"], W - M, y + 86, 34, (120, 108, 148), SERIF_I, "right", 0.4)
    hr(im, y + 122, M, W - M, INKF, 60)
    arc_body(im, p["b1"], y + 190, 29, rtl=p["rtl"])

    # bande photo + CTA
    photo_band(im, "photos/studio-voice.jpg", 1000, 300, (24, 12, 40, 132))
    lat(im, "500 DA", M, 1098, 40, CREMF, ANTON_F, "left", 1.0)
    tdraw(im, p["cta"], W - M, 1090, p.get("cta_size", 40), CREMF, p["font"],
          align="right")
    lat(im, p["url"], M, 1266, 15, CREMF, SG, "left", 1.4)
    lat(im, "01 / 05", W - M, 1266, 12, (222, 214, 234), SG, "right", 3.2)
    return im


def s2(p):
    im = grain(seed=11)
    header(im, "02", p["date"])
    y = headline(im, p["t2"], 128, 392, 900, name=p["font"], rtl=p["rtl"])
    lat(im, p["sub2"], W - M, y + 92, 34, (120, 108, 148), SERIF_I, "right", 0.4)
    hr(im, y + 128, M, W - M, INKF, 60)
    arc_body(im, p["b2"], y + 200, 29, rtl=p["rtl"])

    # le chiffre qui arrête le scroll
    disk(im, W - 200, 1140, 132, VIOF)
    lat(im, "3", W - 200, 1178, 132, CREMF, ANTON_F, "center", 0.0)
    tdraw(im, p["bignum_lab"], W - 200, 1244, 27, CREMF, p["font"], align="center")
    disk(im, M + 58, 1128, 58, VIOF)
    mark(im, M + 58, 1128, 78)
    foot(im, "02 / 05")
    return im


def s3(p):
    im = grain(seed=13)
    dashed(im)
    lat(im, "SAWTIFY", M, 122, 12, INKF, SG, "left", 5.0)
    lat(im, "billet n°03", W - M, 120, 20, (120, 108, 148), SERIF_I, "right", 0.4)

    y = headline(im, p["t3"], 104, 214, 880, name=p["font"], rtl=p["rtl"])
    perfo(im, 470)

    cy = 566
    for i, (num, head, note) in enumerate(p["steps"]):
        if i:
            hr(im, cy - 62, M + 6, W - M - 6, INKF, 55)
        lat(im, num, W - M - 8, cy + 8, 30, (150, 138, 176), ANTON_F, "right", 1.0)
        tdraw(im, head, W - M - 78, cy + 8, 40, INKF, p["font"], align="right")
        tdraw(im, note, W - M - 78, cy + 58, 24, (110, 98, 138), PLEX, align="right")
        cy += 158

    perfo(im, 1112)
    lat(im, "sawtify.space", M, 1200, 17, INKF, SG, "left", 1.2)
    lat(im, "03 / 05", W - M, 1200, 12, (150, 138, 176), SG, "right", 3.2)
    stamp(im, W - 210, 1210, 84, p["stamp"][0], p["stamp"][1], ORGF, KUFI, -7)
    return im


def s4(p):
    im = grain(seed=15)
    dashed(im)
    lat(im, "SAWTIFY", M, 122, 12, INKF, SG, "left", 5.0)
    lat(im, "billet n°04", W - M, 120, 20, (120, 108, 148), SERIF_I, "right", 0.4)

    y = headline(im, p["t4"], 92, 210, 860, name=p["font"], rtl=p["rtl"])
    perfo(im, 432)

    lat(im, "24", M + 4, 660, 196, INKF, ANTON_F, "left", 0.0)
    lat(im, "21", W - M - 4, 660, 196, ORGF, ANTON_F, "right", 0.0)
    lat(im, "vs", W / 2, 610, 40, (150, 138, 176), PLAY_I, "center", 0.0)
    tdraw(im, p["lab_a"], M + 10, 722, 27, (110, 98, 138), p["font"], align="left")
    tdraw(im, p["lab_b"], W - M - 10, 722, 27, (110, 98, 138), p["font"], align="right")
    hr(im, 776, M + 6, W - M - 6, INKF, 55)

    arc_body(im, p["b4"], 852, 28, maxw=760, rtl=p["rtl"])
    lat(im, p["sub4"], W / 2, 972, 30, (120, 108, 148), SERIF_I, "center", 0.4)
    hr(im, 1016, M + 6, W - M - 6, INKF, 55)

    lat(im, "500 DA", M + 6, 1120, 54, INKF, ANTON_F, "left", 1.0)
    tdraw(im, p["delai"], W - M - 6, 1108, 34, INKF, p["font"], align="right")
    lat(im, "sawtify.space", M, 1200, 15, (120, 108, 148), SG, "left", 1.4)
    lat(im, "04 / 05", W - M, 1200, 12, (150, 138, 176), SG, "right", 3.2)
    stamp(im, W - 176, 1178, 62, p.get("stamp_short", "24 h"), "", ORGF, KUFI, 10)
    return im


def s5(p):
    im = grain(seed=17)
    header(im, "05", p["date"])
    y = headline(im, p["t5"], 132, 388, 880, name=p["font"], rtl=p["rtl"])
    lat(im, p["sub5"], W - M, y + 96, 32, (120, 108, 148), SERIF_I, "right", 0.4)

    cta_band(im, p["cta"], 848, 138, ORGF, CREMF, p.get("cta_size", 42), p["font"])
    lat(im, p["url"], W / 2, 1064, 24, INKF, SG, "center", 1.6)

    disk(im, W - M - 58, 1168, 58, VIOF)
    mark(im, W - M - 58, 1168, 78)
    foot(im, "05 / 05")
    return im


# ═══════════════════════════════════════════════════════════════════════════
DZ["font"] = AMIRI
DZ["delai"] = "24 ساعة"
DZ["stamp"] = ("خود الصوت", "تاعك درك")
DZ["bignum_lab"] = "ثواني"
DZ["lab_a"] = "ساعة تاعنا"
DZ["lab_b"] = "يوم استوديو"
FR["font"] = PLAY_B
FR["delai"] = "24 heures"
FR["stamp"] = ("Prenez", "votre voix")
FR["bignum_lab"] = "secondes"
FR["cta_size"] = 34
FR["lab_a"] = "heures chez nous"
FR["lab_b"] = "jours en studio"

PUBS = [DZ, FR]
SLIDES = [s1, s2, s3, s4, s5]


def render(pub):
    d = OUT / pub["id"]
    d.mkdir(parents=True, exist_ok=True)
    for i, fn in enumerate(SLIDES):
        img = fn(pub).convert("RGB").resize((W, H), Image.LANCZOS)
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
