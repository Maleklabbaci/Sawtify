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
#  construction d'une slide
# ═══════════════════════════════════════════════════════════════════════════
def build(spec, seed, rtl=True):
    base = paper(seed=seed)
    wordmark(base)
    kicker_name = REG
    tdraw(base, spec["kicker"], W / 2, 348, spec.get("ksize", 40), INK,
          kicker_name, align="center")
    y = 348 + spec.get("kgap", 130)
    size = spec.get("size", 106)
    # ajustement automatique : aucune ligne ne dépasse la marge
    def line_w(sz):
        return max(sum(twidth(t, WEIGHT[w], sz) for t, w, _ in toks)
                   + sz * 0.26 * (len(toks) - 1) for toks in spec["lines"])
    while line_w(size) > 936 and size > 56:
        size -= 2
    # remplit la hauteur quand les lignes sont courtes
    while size < 124:
        h = (len(spec["lines"]) - 1) * size * 1.28 + size * 1.1
        if h >= 560 or line_w(size + 4) > 936:
            break
        size += 4
    lead = size * spec.get("lead", 1.28)
    for tokens in spec["lines"]:
        hline(base, tokens, W / 2, y, size, rtl=rtl)
        y += lead
    for st in spec.get("stickers", ()):
        sticker(base, st["text"], st["x"], st["y"], st.get("rot", -6),
                st.get("fill", ORANGE), CREAM, st.get("icon"),
                st.get("size", 21), st.get("name", BOLD),
                num=st.get("num"))
    for (tx, ty, sz, rot, col) in spec.get("marks", ()):
        tri(base, tx, ty, sz, col, rot)
    return base, y


# ── 01 · couverture ───────────────────────────────────────────────────────
def cover(p):
    base, y = build(p["s1"], seed=p["seed"], rtl=p["rtl"])
    if p["s1"].get("mascot"):
        mascot(base, W / 2, p["s1"]["mascot"][0], p["s1"]["mascot"][1])
    finish(base, p["n"], 0)
    return base


def meca(p):
    base, y = build(p["s2"], seed=p["seed"] + 1, rtl=p["rtl"])
    para(base, p["s2"]["body"], W / 2, y + 26, 26, MUT, REG, 790, 1.55)
    finish(base, p["n"], 1)
    return base


def steps(p):
    base, y = build(p["s3"], seed=p["seed"] + 2, rtl=p["rtl"])
    if p["s3"].get("body"):
        para(base, p["s3"]["body"], W / 2, y + 34, 25, MUT, REG, 800, 1.55)
    finish(base, p["n"], 2)
    return base


def proof(p):
    s4 = p["s4"]
    base = paper(seed=p["seed"] + 3)
    wordmark(base)
    tdraw(base, s4["kicker"], W / 2, 360, 42, INK, REG, align="center")
    y = 604
    nsz = 120
    for txt, cx, col in ((s4["num_a"], W / 2 - 168, VIO_SOFT),
                         (s4["num_b"], W / 2 + 168, ORANGE_SOFT)):
        w_ = tk.width(txt, BLACK, nsz)
        bar = Image.new("RGBA", (int((w_ + 46) * SS), int(nsz * 1.12 * SS)),
                        (0, 0, 0, 0))
        ImageDraw.Draw(bar).rounded_rectangle(
            [0, 0, bar.width - 1, bar.height - 1], radius=14 * SS,
            fill=(*col, 255))
        rx, ry = bar.width, bar.height
        bar = bar.rotate(-1.2, expand=True, resample=Image.BICUBIC)
        bx = cx - w_ / 2 - 23 - (bar.width - rx) / 2 / SS
        by = y - nsz * 0.78 - (bar.height - ry) / 2 / SS
        base.alpha_composite(bar, (int(bx * SS), int(by * SS)))
        tdraw(base, txt, cx, y, nsz, INK, BLACK, align="center")
    tdraw(base, s4["lab_a"], W / 2 - 168, y + 62, 22, MUT, BLACK,
          align="center")
    tdraw(base, s4["lab_b"], W / 2 + 168, y + 62, 22, MUT, BLACK,
          align="center")
    yy = para(base, s4["body"], W / 2, y + 176, 27, MUT, REG, 800, 1.55)
    tdraw(base, s4["note"], W / 2, yy + 30, 22, INK, BOLD, align="center")
    tri(base, 150, 600, 18, ORANGE, 180)
    tri(base, 928, 940, 16, VIO, 0)
    mascot(base, W / 2, 1108, 104)
    finish(base, p["n"], 3)
    return base


def cta(p):
    base, y = build(p["s5"], seed=p["seed"] + 4, rtl=p["rtl"])
    top = y + 60
    band = Image.new("RGBA", (int((W - 2 * M) * SS), int(186 * SS)),
                     (0, 0, 0, 0))
    ImageDraw.Draw(band).rounded_rectangle(
        [0, 0, band.width - 1, band.height - 1], radius=28 * SS,
        fill=(*ORANGE, 255))
    shadow = Image.new("RGBA", band.size, (0, 0, 0, 0))
    shadow.paste((40, 16, 80, 46), (0, 0), band.split()[-1])
    base.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(22)),
                         (int(M * SS), int((top + 10) * SS)))
    base.alpha_composite(band, (int(M * SS), int(top * SS)))
    tdraw(base, p["cta"], W / 2, top + 92, 38, CREAM, BLACK, align="center")
    latin(base, p["url"], W / 2, top + 152, 25, CREAM, WORD, "center", 0.4)
    para(base, p["end_note"], W / 2, top + 258, 23, MUT, REG, 760, 1.5)
    finish(base, p["n"], 4, last=True)
    return base


# ═══════════════════════════════════════════════════════════════════════════
#  copy
# ═══════════════════════════════════════════════════════════════════════════
DZ = {
    "id": "dz", "n": 5, "seed": 11, "rtl": True,
    "s1": {
        "kicker": "شكون احنا:", "size": 104,
        "lines": [
            [("نصنعو", "r", None)],
            [("أصوات", "b", "v"), ("تبيع،", "b", None)],
            [("بالدارجة", "r", None)],
            [("تاع البلاد", "b", None)],
            [("من الأول حتى الآخر.", "r", None)],
        ],
        "stickers": [
            dict(text="500 دج", x=296, y=316, rot=-7, fill=VIO, icon="sound"),
            dict(text="دارجة بلادنا", x=892, y=436, rot=7, fill=ORANGE,
                 icon="target"),
            dict(text="24 ساعة", x=232, y=1096, rot=-5, fill=ORANGE,
                 icon="spark"),
        ],
        "marks": [(150, 500, 20, 180, ORANGE), (952, 720, 16, 0, VIO)],
    },
    "s2": {
        "kicker": "علاه هكّاك:", "size": 106, "kgap": 126,
        "lines": [
            [("دماغك", "b", None), ("ياخذ", "r", None)],
            [("أول", "b", "o"), ("سوم", "b", None)],
            [("و", "r", None), ("يوقف", "b", None)],
            [("عليه.", "r", None)],
        ],
        "stickers": [
            dict(text="المرجع", x=838, y=812, rot=6, fill=ORANGE,
                 icon="target"),
        ],
        "marks": [(908, 452, 16, 0, ORANGE)],
        "body": "كل سوم بعدو يتقاس بيه، ماشي بالسوق. بدّل بلاصة السوم، "
                "ماشي السوم.",
    },
    "s3": {
        "kicker": "واش تدير:", "size": 92, "kgap": 118,
        "lines": [
            [("ثلاثة", "b", "v"), ("حوايج،", "r", None)],
            [("و", "r", None), ("السوم", "b", "o"), ("يولي", "r", None)],
            [("يهدر.", "b", None)],
        ],
        "stickers": [
            dict(text="بيّن المرجع", num="01", x=268, y=1088, rot=-5, fill=ORANGE,
                 icon="target", size=19),
            dict(text="فسّر السوم", num="02", x=562, y=1088, rot=3, fill=VIO,
                 icon="sound", size=19),
            dict(text="قارن بوضوح", num="03", x=858, y=1088, rot=-4, fill=ORANGE,
                 icon="spark", size=19),
        ],
        "body": "خدّمهم بالترتيب، ما تخلطش ما بيناتهم: المرجع، التفسير، و من "
                "بعد المقارنة.",
        "marks": [(150, 470, 18, 180, VIO)],
    },
    "s4": {
        "kicker": "الفرق:",
        "num_a": "3 000", "num_b": "500",
        "lab_a": "سوم السوق", "lab_b": "سومنا",
        "body": "كري المرجع قبل ما تقول السوم، الزبون وحدو يفهم بلي 500 دج "
                "صفقة.",
        "note": "3 000 دج سوم السوق، 500 دج تاعنا، و الفرق يبان من الأول.",
    },
    "s5": {
        "kicker": "و من بعد؟", "size": 92, "kgap": 118,
        "lines": [
            [("الترتيب", "b", "v"), ("يبيع", "r", None)],
            [("أكثر", "b", None)],
            [("من التخفيض.", "r", None)],
        ],
        "stickers": [
            dict(text="ما تنقصش السوم", x=846, y=606, rot=6, fill=ORANGE,
                 icon="target"),
        ],
        "marks": [(164, 900, 18, 180, ORANGE)],
    },
    "cta": "خود الصوت تاعك في 24 ساعة",
    "url": "sawtify.space",
    "end_note": "صوت واحد، دارجة جزايرية، 500 دج. تسمع قبل ما تخلّص.",
}

FR = {
    "id": "fr", "n": 5, "seed": 12, "rtl": False,
    "s1": {
        "kicker": "Qui on est :", "ksize": 44, "size": 96,
        "lines": [
            [("On crée", "r", None)],
            [("des voix", "b", "v"), ("qui vendent,", "b", None)],
            [("en darija,", "r", None)],
            [("du premier mot", "b", None)],
            [("à la livraison.", "r", None)],
        ],
        "stickers": [
            dict(text="500 DA", x=286, y=316, rot=-7, fill=VIO, icon="sound"),
            dict(text="darija algérienne", x=888, y=436, rot=7, fill=ORANGE,
                 icon="target", size=19),
            dict(text="24 h", x=214, y=1096, rot=-5, fill=ORANGE, icon="spark"),
        ],
        "marks": [(150, 500, 20, 180, ORANGE), (952, 720, 16, 0, VIO)],
    },
    "s2": {
        "kicker": "Pourquoi :", "ksize": 44, "size": 96, "kgap": 126,
        "lines": [
            [("Votre cerveau", "b", None)],
            [("retient", "r", None), ("le premier", "b", "o")],
            [("chiffre.", "r", None)],
        ],
        "stickers": [
            dict(text="ancrage", x=838, y=812, rot=6, fill=ORANGE,
                 icon="target", size=20),
        ],
        "marks": [(908, 452, 16, 0, ORANGE)],
        "body": "Chaque prix se juge par rapport au précédent, pas par rapport "
                "au marché. Changez l'ordre, pas le prix.",
    },
    "s3": {
        "kicker": "Quoi faire :", "ksize": 44, "size": 88, "kgap": 118,
        "lines": [
            [("Trois", "b", "v"), ("gestes,", "r", None)],
            [("et le prix", "r", None)],
            [("devient", "b", None), ("évident.", "r", None)],
        ],
        "stickers": [
            dict(text="la réf.", num="01", x=222, y=1092, rot=-5, fill=ORANGE,
                 icon="target", size=18),
            dict(text="le détail", num="02", x=544, y=1092, rot=3, fill=VIO,
                 icon="sound", size=18),
            dict(text="l’écart", num="03", x=856, y=1092, rot=-4,
                 fill=ORANGE, icon="spark", size=18),
        ],
        "body": "Dans cet ordre, sans mélanger : la référence, l'explication, "
                "puis la comparaison.",
        "marks": [(150, 470, 18, 180, VIO)],
    },
    "s4": {
        "kicker": "Le chiffre :",
        "num_a": "3 000", "num_b": "500",
        "lab_a": "le marché", "lab_b": "notre prix",
        "body": "Annoncez la référence avant votre prix : 500 DA devient "
                "une évidence.",
        "note": "3 000 DA le marché, 500 DA chez nous, et l’écart saute aux yeux.",
    },
    "s5": {
        "kicker": "Et après ?", "ksize": 44, "size": 88, "kgap": 118,
        "lines": [
            [("L’ordre", "b", "v"), ("vend", "r", None)],
            [("plus", "b", None)],
            [("qu’une remise.", "r", None)],
        ],
        "stickers": [
            dict(text="ne baissez pas le prix", x=822, y=604, rot=-6,
                 fill=ORANGE, icon="target", size=18),
        ],
        "marks": [(164, 900, 18, 180, ORANGE)],
    },
    "cta": "Votre voix en 24 h",
    "url": "sawtify.space",
    "end_note": "Une voix, darija algérienne, 500 DA. Vous écoutez avant de payer.",
}

PUBS = [DZ, FR]


def render(pub):
    d = OUT / pub["id"]
    d.mkdir(parents=True, exist_ok=True)
    for i, fn in enumerate((cover, meca, steps, proof, cta)):
        img = fn(pub).convert("RGB").resize((W, H), Image.LANCZOS)
        img.save(d / f"{i + 1:02d}.jpg", quality=95, optimize=True,
                 subsampling=1)
        print("  ✓", pub["id"], f"{i + 1:02d}")


def planches():
    for pub in PUBS:
        files = sorted((OUT / pub["id"]).glob("*.jpg"))
        tw_, th_ = 500, 625
        sheet = Image.new("RGB", (len(files) * (tw_ + 8) + 8, th_ + 16),
                          (30, 18, 56))
        for i, f in enumerate(files):
            sheet.paste(Image.open(f).convert("RGB").resize((tw_, th_),
                                                            Image.LANCZOS),
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
