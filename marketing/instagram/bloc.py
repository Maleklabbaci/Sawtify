#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
bloc.py — direction « blocs typographiques » (réf. papier tacheté + blocs).

 Papier clair tacheté · marque en haut à gauche · une phrase sur bandeau
 orange · un titre énorme dont certains mots sont posés en négatif dans un
 bloc violet · en bas « swipe » à gauche en violet.

    python3 bloc.py               → slides/bloc/{dz,fr}/01..05.jpg
    python3 bloc.py --only dz
    python3 bloc.py --planches
"""
from __future__ import annotations

import argparse
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

import typekit as tk
from typekit import draw as tdraw
from typekit import width as twidth

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "slides" / "bloc"
LOGO = ROOT / "assets" / "logo-mark-trim.png"

W, H = 1080, 1350
SS = 2
M = 62

VIO = (109, 39, 234)
VIO_D = (86, 26, 196)
ORANGE = (253, 96, 41)
CREAM = (244, 241, 233)
PAPER = (242, 240, 235)
INK = (22, 16, 34)
MUT = (108, 96, 132)

BLACK = "Cairo-Black.ttf"
BOLD = "Cairo-Bold.ttf"
REG = "Cairo-Regular.ttf"
WORD = "SpaceGrotesk-Bold.ttf"

WEIGHT = {"b": BLACK, "m": BOLD, "r": REG}


# ── fond ──────────────────────────────────────────────────────────────────
def sheet(seed=5):
    rnd = random.Random(seed)
    im = Image.new("RGB", (W * SS, H * SS), PAPER)
    # taches de papier : petits points denses
    dots = Image.new("L", (W * 2, H * 2), 0)
    dd = ImageDraw.Draw(dots)
    for _ in range(26000):
        x = rnd.randrange(dots.width)
        y = rnd.randrange(dots.height)
        r = rnd.choice((1, 1, 1, 2))
        dd.ellipse([x, y, x + r, y + r], fill=rnd.randint(60, 150))
    dots = dots.resize((W * SS, H * SS), Image.BILINEAR).filter(
        ImageFilter.GaussianBlur(0.6))
    im = Image.composite(Image.new("RGB", im.size, (206, 200, 192)), im,
                         dots.point(lambda v: int(v * 0.55)))
    return im.convert("RGBA")


def logo_tile(base, x=M, y=54, size=86):
    lay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ImageDraw.Draw(lay).rounded_rectangle(
        [x * SS, y * SS, (x + size) * SS, (y + size) * SS],
        radius=18 * SS, fill=(*VIO, 255))
    base.alpha_composite(lay)
    src = Image.open(LOGO).convert("RGBA")
    lw = int(size * 0.62)
    im = src.resize((lw, int(src.height * lw / src.width)), Image.LANCZOS)
    base.alpha_composite(im, (int((x + (size - lw) / 2) * SS),
                              int((y + (size - im.height / SS) / 2) * SS)))


def latin(base, text, x, y, size, fill=MUT, name=WORD, align="left", track=2.4):
    d = ImageDraw.Draw(base)
    f = tk._pil(name, size)
    total = sum(d.textlength(c, font=f) / SS for c in text) + track * (len(text) - 1)
    px = x - (total / 2 if align == "center" else total if align == "right" else 0)
    for c in text:
        d.text((px * SS, y * SS), c, font=f, fill=fill, anchor="ls")
        px += d.textlength(c, font=f) / SS + track


def arrow(base, x, y, size=30, color=VIO):
    """Flèche ← dessinée, pointe à gauche."""
    d = ImageDraw.Draw(base)
    d.line([x * SS, y * SS, (x + size * 2.2) * SS, y * SS], fill=(*color, 255),
           width=int(3.4 * SS))
    d.polygon([(x * SS, y * SS),
               ((x + size * 0.78) * SS, (y - size * 0.62) * SS),
               ((x + size * 0.78) * SS, (y + size * 0.62) * SS)],
              fill=(*color, 255))


def ink(text, name, size):
    """Boîte d'encre réelle du texte, relative à (pen=0, baseline=0)."""
    w = twidth(text, name, size)
    pad, base = size * 0.6, size * 1.8
    im = Image.new("L", (int((w + 2 * pad) * SS), int(2.6 * size * SS)), 0)
    tdraw(im, text, pad, base, size, 255, name, align="left")
    bb = im.getbbox()
    if not bb:
        return 0.0, w, -size * 0.7, 0.0
    return ((bb[0] / SS - pad), (bb[2] / SS - pad),
            (bb[1] / SS - base), (bb[3] / SS - base))


# ── composition d'une ligne de titre ──────────────────────────────────────
def hline(base, tokens, cx, y, size, rtl=True, gap=None, pad=(0.15, 0.19)):
    """tokens = [(texte, poids, style)] ; style ∈ None | "rev" | "mark"."""
    gap = gap if gap is not None else size * 0.38
    widths = [twidth(t[0], WEIGHT[t[1]], size * (t[3] if len(t) > 3 else 1))
              for t in tokens]
    total = sum(widths) + gap * (len(tokens) - 1)
    if rtl:
        x = cx + total / 2
    else:
        x = cx - total / 2
    for tok, tw_ in zip(tokens, widths):
        t, w, style = tok[0], tok[1], tok[2]
        sz = size * (tok[3] if len(tok) > 3 else 1)
        if style:
            bg = VIO if style == "rev" else ORANGE
            il, ir, it, ib = ink(t, WEIGHT[w], sz)
            px = sz * pad[0]
            base_x = x - tw_ if rtl else x
            x0 = base_x + il - px
            x1 = base_x + ir + px
            y0, y1 = y + it - sz * pad[1], y + ib + sz * pad[1]
            rect = Image.new("RGBA", (max(1, int((x1 - x0) * SS)),
                                      max(1, int((y1 - y0) * SS))), (0, 0, 0, 0))
            ImageDraw.Draw(rect).rectangle(
                [0, 0, rect.width - 1, rect.height - 1], fill=(*bg, 255))
            rx, ry = x0, y0
            base.alpha_composite(rect, (int(rx * SS), int(ry * SS)))
            fg = INK if style == "mark" else CREAM
        else:
            fg = INK
        if rtl:
            tdraw(base, t, x, y, sz, fg, WEIGHT[w], align="right")
            x -= tw_ + gap
        else:
            tdraw(base, t, x, y, sz, fg, WEIGHT[w], align="left")
            x += tw_ + gap
    return y


def strip(base, text, cx, y, size=34, fill=ORANGE, fg=INK, name=BOLD):
    """Phrase courte posée sur un bandeau plein."""
    w = twidth(text, name, size)
    padx, pady = size * 0.52, size * 0.34
    rect = Image.new("RGBA", (int((w + 2 * padx) * SS),
                              int((size * 1.25 + 2 * pady) * SS)), (0, 0, 0, 0))
    ImageDraw.Draw(rect).rectangle([0, 0, rect.width - 1, rect.height - 1],
                                   fill=(*fill, 255))
    base.alpha_composite(rect, (int((cx - w / 2 - padx) * SS),
                                int((y - size * 0.9 - pady) * SS)))
    tdraw(base, text, cx, y, size, fg, name, align="center")
    return y


def lead_for(tokens_list, size):
    """Interligne : plus large quand une ligne porte un bloc."""
    blk = any(st for toks in tokens_list for _, _, st in toks)
    return size * (1.62 if blk else 1.30)


def line_w(toks, sz, gapf=0.32):
    return (sum(twidth(t[0], WEIGHT[t[1]], sz * (t[3] if len(t) > 3 else 1))
                for t in toks) + sz * gapf * (len(toks) - 1))


def fit(tokens_list, size, max_w=872, floor=40):
    """Ajuste la taille : la ligne la plus large remplit la colonne."""
    def need(sz):
        return max(line_w(toks, sz) for toks in tokens_list)
    while size > floor and need(size) > max_w:
        size -= 2
    while size < 200 and need(size + 2) <= max_w:
        size += 2
    return size


def page(n, k, seed, last=False, foot="SAWTIFY.SPACE", swipe=True,
         swipe_txt="SWIPE"):
    base = sheet(seed=seed)
    logo_tile(base)
    d = ImageDraw.Draw(base)
    step, r = 8, 4
    for i in range(n):
        cx = W - M - (n - 1 - i) * (step + 8)
        if i == k:
            d.rectangle([(cx - r) * SS, (H - 96) * SS, (cx + r) * SS,
                         (H - 96 + 2 * r) * SS], fill=(*ORANGE, 255))
        else:
            d.rectangle([(cx - r) * SS, (H - 96) * SS, (cx + r) * SS,
                         (H - 96 + 2 * r) * SS], fill=(*INK, 55))
    latin(base, foot, M, H - 92, 9.5, MUT, WORD, "left", 2.6)
    if swipe:
        if any("\u0600" <= c <= "\u06ff" for c in swipe_txt):
            arrow(base, M + 4, H - 152, 26, VIO)
            tdraw(base, swipe_txt, M + 4 + 26 * 2.2 + 18, H - 144, 24, VIO, BOLD,
                  align="left")
        else:
            latin(base, swipe_txt, M + 4, H - 148, 22, VIO, BOLD, "left", 1.2)
            arrow(base, M + 6 + twidth(swipe_txt, BOLD, 22) + 16, H - 156, 26, VIO)
    return base


# ── slides ────────────────────────────────────────────────────────────────
def hero(b, spec, rtl, cy=770):
    """Bandeau + titre à blocs, groupe centré verticalement sur cy."""
    size = fit(spec["lines"], spec["size"])
    lead = lead_for(spec["lines"], size) * spec.get("leadf", 1.0)
    n = len(spec["lines"])
    h = (n - 1) * lead + size * 1.26
    top = cy - h / 2
    strip(b, spec["strip"], W / 2, top - 62, spec.get("strip_size")
          or int(size * 0.36))
    y = top + size * 0.93
    for toks in spec["lines"]:
        hline(b, toks, W / 2, y, size, rtl=rtl)
        y += lead
    return size, top, top + h


def rows(b, spec, rtl, cy=760):
    """Liste manifeste : verbe en petit au-dessus d'un mot en bloc."""
    words = [[(w, "b", st)] for _, w, st in spec["rows"]]
    size = fit(words, spec["size"])
    gap = 32
    n = len(words)
    vh = 46
    mets = [ink(w, BLACK, size) for _, w, _ in spec["rows"]]
    itop = min(m[2] for m in mets)
    ibot = max(m[3] for m in mets)
    pad = size * 0.19
    bh = (-itop + ibot) + 2 * pad
    size = min(size, (spec.get("cap", 700) - n * vh - (n - 1) * gap)
                      / (n * bh / size)) if size else size
    mets = [ink(w, BLACK, size) for _, w, _ in spec["rows"]]
    itop = min(m[2] for m in mets)
    ibot = max(m[3] for m in mets)
    pad = size * 0.19
    bh = (-itop + ibot) + 2 * pad
    total = n * (vh + bh) + (n - 1) * gap
    top = cy - total / 2
    strip(b, spec["strip"], W / 2, top - 66, spec.get("strip_size")
          or int(size * 0.36))
    y = top
    vs = max(26, min(34, size * 0.24))
    for (verb, word, st), (il, ir, it, ib) in zip(spec["rows"], mets):
        tdraw(b, verb, W / 2, y + vh - 12, vs, MUT, BOLD, align="center")
        base = y + vh - itop + pad
        hline(b, [(word, "b", st)], W / 2, base, size, rtl=rtl)
        y += vh + bh + gap
    return size, top, top + total


def render_pub(pub):
    n, rtl = pub["n"], pub["rtl"]
    frames = []

    # 01 · couverture
    b = page(n, 0, pub["seed"], swipe_txt=pub["swipe"])
    hero(b, pub["s1"], rtl, 762)
    frames.append(b)

    # 02 · mécanisme
    b = page(n, 1, pub["seed"] + 1, swipe_txt=pub["swipe"])
    _, _, bot = hero(b, pub["s2"], rtl, 700)
    tdraw(b, pub["s2"]["body"], W / 2, bot + 74, 25, MUT, REG, align="center")
    frames.append(b)

    # 03 · trois gestes
    b = page(n, 2, pub["seed"] + 2, swipe_txt=pub["swipe"])
    rows(b, pub["s3"], rtl, 766)
    frames.append(b)

    # 04 · preuve chiffrée
    b = page(n, 3, pub["seed"] + 3, swipe_txt=pub["swipe"])
    strip(b, pub["s4"]["strip"], W / 2, 402, 42)
    y = 700
    cols = ((pub["s4"]["num_a"], pub["s4"]["lab_a"], W / 2 - 212, False),
            (pub["s4"]["num_b"], pub["s4"]["lab_b"], W / 2 + 212, True))
    for txt, lab, cx, rev in cols:
        sz = 186
        while sz > 60 and twidth(txt, BLACK, sz) > 360:
            sz -= 2
        if rev:
            il, ir, it, ib = ink(txt, BLACK, sz)
            px = sz * 0.13
            rect = Image.new("RGBA", (int((ir - il + 2 * px) * SS),
                                      int((ib - it + 2 * px) * SS)), (0, 0, 0, 0))
            ImageDraw.Draw(rect).rectangle(
                [0, 0, rect.width - 1, rect.height - 1], fill=(*VIO, 255))
            b.alpha_composite(rect, (int((cx - twidth(txt, BLACK, sz) / 2
                                          + il - px) * SS),
                                     int((y + it - px) * SS)))
            tdraw(b, txt, cx, y, sz, CREAM, BLACK, align="center")
        else:
            tdraw(b, txt, cx, y, sz, INK, BLACK, align="center")
        tdraw(b, lab, cx, y + 74, 23, MUT, BOLD, align="center")
    d = ImageDraw.Draw(b)
    d.line([(W / 2) * SS, (y - 226) * SS, (W / 2) * SS, (y + 46) * SS],
           fill=(*INK, 40), width=int(1.6 * SS))
    tdraw(b, pub["s4"]["body"], W / 2, y + 236, 30, INK, REG, align="center")
    frames.append(b)

    # 05 · appel
    b = page(n, 4, pub["seed"] + 4, swipe=False)
    _, _, bot = hero(b, pub["s5"], rtl, 660)
    ty = bot + 96
    rect = Image.new("RGBA", (int((W - 2 * 96) * SS), int(178 * SS)),
                     (0, 0, 0, 0))
    ImageDraw.Draw(rect).rectangle([0, 0, rect.width - 1, rect.height - 1],
                                   fill=(*VIO, 255))
    b.alpha_composite(rect, (int(96 * SS), int(ty * SS)))
    tdraw(b, pub["cta"], W / 2, ty + 76, 46, CREAM, BLACK, align="center")
    latin(b, pub["url"], W / 2, ty + 140, 26, CREAM, WORD, "center", 0.6)
    tdraw(b, pub["end_note"], W / 2, ty + 246, 24, MUT, REG, align="center")
    frames.append(b)

    d = OUT / pub["id"]
    d.mkdir(parents=True, exist_ok=True)
    for i, frame in enumerate(frames):
        frame.convert("RGB").resize((W, H), Image.LANCZOS).save(
            d / f"{i + 1:02d}.jpg", quality=95, optimize=True, subsampling=1)
        print("  ✓", pub["id"], f"{i + 1:02d}")


# ═══════════════════════════════════════════════════════════════════════════
#  contenu
# ═══════════════════════════════════════════════════════════════════════════
DZ = {
    "id": "dz", "n": 5, "seed": 21, "rtl": True, "swipe": "اسحب",
    "s1": {
        "strip": "المهم، تعرف",
        "size": 104,
        "lines": [
            [("واش", "b", None), ("تدير،", "b", "rev")],
            [("و وقتاش.", "b", "rev")],
        ],
    },
    "s2": {
        "strip": "الدماغ ياخد",
        "size": 100,
        "lines": [
            [("أول", "b", None), ("سوم", "b", "rev")],
            [("و", "b", None), ("يوقف", "b", "mark"), ("عليه.", "b", None)],
        ],
        "body": "كل سوم بعدو يتقاس بيه، ماشي بالسوق.",
    },
    "s3": {
        "strip": "ثلاثة حركات",
        "size": 96,
        "rows": [("بيّن", "المرجع.", "rev"), ("فسّر", "السوم.", "mark"),
                 ("قارن", "الفرق.", "rev")],
    },
    "s4": {
        "strip": "الفرق في الترتيب",
        "num_a": "3 000", "num_b": "500",
        "lab_a": "سوم السوق", "lab_b": "سومنا",
        "body": "حطيت المرجع قبل السوم، 500 دج ولّات صفقة.",
    },
    "s5": {
        "strip": "و من بعد؟",
        "size": 92,
        "lines": [
            [("خود", "b", None), ("الصوت", "b", "rev")],
            [("في", "b", None), ("24 ساعة", "b", "mark")],
        ],
    },
    "cta": "دير طلب تاعك",
    "url": "sawtify.space",
    "end_note": "صوت واحد، دارجة جزايرية، 500 دج. تسمع قبل ما تخلّص.",
}

FR = {
    "id": "fr", "n": 5, "seed": 22, "rtl": False, "swipe": "SWIPE",
    "s1": {
        "strip": "L'essentiel, c'est de savoir",
        "size": 96,
        "lines": [
            [("QUOI", "b", None), ("FAIRE,", "b", "rev")],
            [("ET QUAND.", "b", "rev")],
        ],
    },
    "s2": {
        "strip": "Votre cerveau prend",
        "size": 96,
        "lines": [
            [("LE PREMIER", "b", None)],
            [("PRIX", "b", "rev"), ("ET S'ARRÊTE.", "b", None)],
        ],
        "body": "Chaque prix se juge par rapport au précédent, pas au marché.",
    },
    "s3": {
        "strip": "Trois gestes",
        "size": 96,
        "rows": [("MONTRER", "LA RÉFÉRENCE.", "rev"),
                 ("EXPLIQUER", "LE PRIX.", "mark"),
                 ("COMPARER", "CÔTE À CÔTE.", "rev")],
    },
    "s4": {
        "strip": "L'écart, en une image",
        "num_a": "3 000", "num_b": "500",
        "lab_a": "LE MARCHÉ", "lab_b": "NOUS",
        "body": "La référence annoncée avant le prix : 500 DA devient une évidence.",
    },
    "s5": {
        "strip": "Et maintenant ?",
        "size": 88,
        "lines": [
            [("VOTRE", "b", None), ("VOIX", "b", "rev")],
            [("EN", "b", None), ("24 H", "b", "mark")],
        ],
    },
    "cta": "Passez commande",
    "url": "sawtify.space",
    "end_note": "Une voix, darija algérienne, 500 DA. Vous écoutez avant de payer.",
}

PUBS = [DZ, FR]


def planches():
    for pub in PUBS:
        files = sorted((OUT / pub["id"]).glob("*.jpg"))
        tw_, th_ = 500, 625
        sheet_ = Image.new("RGB", (len(files) * (tw_ + 8) + 8, th_ + 16),
                           (26, 16, 42))
        for i, f in enumerate(files):
            sheet_.paste(Image.open(f).convert("RGB").resize((tw_, th_),
                                                             Image.LANCZOS),
                         (8 + i * (tw_ + 8), 8))
        sheet_.save(OUT / f"planche-{pub['id']}.jpg", quality=93, optimize=True)
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
        render_pub(pub)


if __name__ == "__main__":
    main()
