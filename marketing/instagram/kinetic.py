#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
kinetic.py — direction « affiche kinétique » (réf. marqueurs + stickers).

 Papier crème texturé, titre énorme en Noto Sans Arabic Black, un mot surligné
 par ligne, stickers légèrement inclinés avec petites icônes vectorielles.

    python3 kinetic.py            → slides/kinetic/<pub>/01..05.jpg
    python3 kinetic.py --only k1
    python3 kinetic.py --planches
"""
from __future__ import annotations

import argparse
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from sawtify_ig import font, visual

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "slides" / "kinetic"
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
MUT = (110, 96, 140)

HEAD = "NotoSansArabic-Black.ttf"
BODY = "NotoSansArabic-Regular.ttf"
BODY_M = "NotoSansArabic-SemiBold.ttf"
HEAD_S = "NotoSansArabic-Bold.ttf"
KUFI = "NotoKufi-Black.ttf"
SERIF_IT = "Playfair-BoldItalic.ttf"
GROT_B = "SpaceGrotesk-Bold.ttf"
GROT_M = "SpaceGrotesk-Medium.ttf"

_logo_cache: dict = {}


# ── papier ────────────────────────────────────────────────────────────────
def paper(seed=7):
    base = Image.new("RGB", (W * SS, H * SS), CREAM)
    # grain
    rnd = random.Random(seed)
    noise = Image.new("L", (W // 2, H // 2))
    noise.putdata([rnd.randint(120, 136) for _ in range(W // 2 * H // 2)])
    grain = Image.merge("RGB", [noise] * 3).resize((W * SS, H * SS),
                                                   Image.BILINEAR)
    base = Image.blend(base, grain, 0.055)
    base = base.filter(ImageFilter.GaussianBlur(0.4))
    # grille à peine visible
    d = ImageDraw.Draw(base, "RGBA")
    for x in range(0, W, 54):
        d.line([(x * SS, 0), (x * SS, H * SS)], fill=(120, 100, 160, 9), width=2)
    for y in range(0, H, 54):
        d.line([(0, y * SS), (W * SS, y * SS)], fill=(120, 100, 160, 9), width=2)
    # halos de coin
    glow = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([-260 * SS, -240 * SS, 420 * SS, 360 * SS], fill=(*VIO, 70))
    gd.ellipse([700 * SS, 1050 * SS, 1360 * SS, 1620 * SS], fill=(*ORANGE, 46))
    glow = glow.filter(ImageFilter.GaussianBlur(190))
    base = Image.alpha_composite(base.convert("RGBA"), glow)
    return base


def logo(size):
    if size not in _logo_cache:
        src = Image.open(LOGO).convert("RGBA")
        h = int(round(src.height * size / src.width))
        _logo_cache[size] = src.resize((size, h), Image.LANCZOS)
    return _logo_cache[size]


# ── typo ──────────────────────────────────────────────────────────────────
def tw(text, fname, size):
    d = ImageDraw.Draw(Image.new("RGB", (4, 4)))
    f = font(fname, size)
    return d.textlength(visual(text), font=f) / SS


def ink_h(fname, size):
    """Hauteur approximative de la zone d'encre d'une ligne."""
    return size * 1.02


def line(base, tokens, cx, y, size, fname=HEAD, color=INK, gap=None,
         hi_bar=True, hi_alpha=255):
    """Tokens = [(texte, genre)] avec genre ∈ t | hv (violet) | ho (orange).

    Dessine la ligne centrée sur cx, en partant de la droite.
    """
    gap = gap if gap is not None else size * 0.20
    widths = [tw(t, fname, size) for t, _ in tokens]
    total = sum(widths) + gap * (len(tokens) - 1)
    x = cx + total / 2
    d = ImageDraw.Draw(base)
    f = font(fname, size)
    for (t, kind), w in zip(tokens, widths):
        if kind in ("hv", "ho") and hi_bar:
            col = VIO_SOFT if kind == "hv" else ORANGE_SOFT
            bw = w + size * 0.10
            bh = size * 0.80
            bar = Image.new("RGBA", (int(bw * SS), int(bh * SS)), (0, 0, 0, 0))
            ImageDraw.Draw(bar).rounded_rectangle(
                [0, 0, bar.width - 1, bar.height - 1], radius=int(size * 0.14 * SS),
                fill=(*col, hi_alpha))
            bar = bar.rotate(-1.4, expand=True, resample=Image.BICUBIC)
            base.alpha_composite(bar, (int((x - w - size * 0.05) * SS),
                                       int((y - size * 0.70) * SS)))
        d.text(((x - w) * SS, y * SS), visual(t), font=f, fill=color,
               anchor="ls")
        x -= w + gap
    return y


def latin(base, text, cx, y, size, color=VIO_D, fname=SERIF_IT, anchor="ms",
          track=0.0):
    d = ImageDraw.Draw(base)
    f = font(fname, size)
    if not track:
        d.text((cx * SS, y * SS), text, font=f, fill=color, anchor=anchor)
        return y
    total = sum(d.textlength(c, font=f) / SS for c in text) + track * (len(text) - 1)
    x = cx - total / 2
    for ch in text:
        d.text((x * SS, y * SS), ch, font=f, fill=color, anchor="ls")
        x += d.textlength(ch, font=f) / SS + track
    return y


def ar_center(base, text, cx, y, size, color=INK, fname=HEAD, max_w=820,
              leading=1.3):
    """Paragraphe arabe centré, retour à la ligne mesuré."""
    d = ImageDraw.Draw(base)
    f = font(fname, size)
    words, lines, cur = text.split(), [], []
    for w_ in words:
        cand = cur + [w_]
        if cur and d.textlength(visual(" ".join(cand)), font=f) / SS > max_w:
            lines.append(cur)
            cur = [w_]
        else:
            cur = cand
    if cur:
        lines.append(cur)
    space = d.textlength(" ", font=f) / SS
    for ln in lines:
        shown = visual(" ".join(ln))
        wpx = d.textlength(shown, font=f) / SS
        d.text(((cx - wpx / 2) * SS, y * SS), shown, font=f, fill=color,
               anchor="ls")
        y += size * leading
    return y


# ── stickers ──────────────────────────────────────────────────────────────
def _icon(kind, size, color):
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    s = size
    if kind == "target":
        d.ellipse([s * 0.10, s * 0.10, s * 0.90, s * 0.90], outline=(*color, 255),
                  width=max(2, int(s * 0.09)))
        d.ellipse([s * 0.36, s * 0.36, s * 0.64, s * 0.64], fill=(*color, 255))
        d.line([s * 0.55, s * 0.55, s * 0.92, s * 0.92], fill=(*color, 255),
               width=max(2, int(s * 0.09)))
    elif kind == "spark":
        pts = []
        for i in range(8):
            r = s * (0.46 if i % 2 == 0 else 0.17)
            a = math.pi / 4 * i - math.pi / 2
            pts.append((s / 2 + r * math.cos(a), s / 2 + r * math.sin(a)))
        d.polygon(pts, fill=(*color, 255))
    elif kind == "sound":
        d.rounded_rectangle([s * 0.12, s * 0.40, s * 0.34, s * 0.60],
                            radius=s * 0.05, fill=(*color, 255))
        d.polygon([(s * 0.34, s * 0.50), (s * 0.62, s * 0.22),
                   (s * 0.62, s * 0.78)], fill=(*color, 255))
        d.arc([s * 0.58, s * 0.26, s * 0.96, s * 0.74], -60, 60,
              fill=(*color, 255), width=max(2, int(s * 0.08)))
    elif kind == "tri":
        d.polygon([(s * 0.15, s * 0.22), (s * 0.85, s * 0.22),
                   (s / 2, s * 0.82)], fill=(*color, 255))
    return im


def sticker(base, text, cx, cy, rot=-5, fill=ORANGE, fg=CREAM, icon=None,
            size=26, fname=None, pad=(26, 20)):
    """Pastille légèrement inclinée, texte arabe + petite icône."""
    fname = fname or HEAD_S
    d = ImageDraw.Draw(Image.new("RGB", (4, 4)))
    f = font(fname, size)
    tw_ = d.textlength(visual(text), font=f) / SS
    h = size * 1.5 + pad[1] * 2
    ic = int(size * 1.15) if icon else 0
    gap = int(size * 0.45) if icon else 0
    w = pad[0] * 2 + tw_ + (ic + gap if icon else 0)
    card = Image.new("RGBA", (int(w * SS), int(h * SS)), (0, 0, 0, 0))
    cd = ImageDraw.Draw(card)
    cd.rounded_rectangle([0, 0, card.width - 1, card.height - 1],
                         radius=int(h * 0.34 * SS), fill=(*fill, 255))
    tx = pad[0] * SS
    if icon:
        card.alpha_composite(_icon(icon, int(ic * SS), fg),
                             (int(tx), int((h * SS - ic * SS) / 2)))
        tx += (ic + gap) * SS
    cd.text((tx, (h * SS) / 2), visual(text), font=f, fill=fg, anchor="lm")
    card = card.rotate(rot, expand=True, resample=Image.BICUBIC)
    shadow = Image.new("RGBA", card.size, (0, 0, 0, 0))
    shadow.paste((24, 10, 50, 90), (0, 0), card.split()[-1])
    shadow = shadow.filter(ImageFilter.GaussianBlur(9 * SS / 2))
    px = int((cx - card.width / 2 / SS) * SS)
    py = int((cy - card.height / 2 / SS) * SS)
    base.alpha_composite(shadow, (px + int(3 * SS), py + int(7 * SS)))
    base.alpha_composite(card, (px, py))
    return cy + h / 2


def tri(base, cx, cy, size=26, color=ORANGE, rot=0):
    ic = _icon("tri", int(size * SS), color)
    if rot:
        ic = ic.rotate(rot, expand=True, resample=Image.BICUBIC)
    base.alpha_composite(ic, (int((cx - ic.width / 2 / SS) * SS),
                              int((cy - ic.height / 2 / SS) * SS)))


def dots(base, n, k):
    step, r = 26, 5
    x0 = W / 2 - (n - 1) * step / 2
    d = ImageDraw.Draw(base)
    for i in range(n):
        cx = x0 + i * step
        col = ORANGE if i == k else (255, 255, 255, 0)
        if i == k:
            d.ellipse([(cx - r) * SS, (H - 108 - r) * SS,
                       (cx + r) * SS, (H - 108 + r) * SS], fill=(*col, 255))
        else:
            d.ellipse([(cx - r) * SS, (H - 108 - r) * SS,
                       (cx + r) * SS, (H - 108 + r) * SS],
                      fill=(*CREAM, 255), outline=(176, 158, 205, 255), width=2)


def page(n, k, brand=True, last=False):
    base = paper(seed=7 + k)
    if brand:
        latin(base, "sawtify", W / 2, 108, 22, VIO, GROT_B, anchor="ms",
              track=7.5)
    dots(base, n, k)
    latin(base, "500 DA · 30 SECONDES", M, H - 100, 9.5, MUT, GROT_M,
          anchor="ls", track=2.4)
    if not last:
        latin(base, "SWIPE", W - M, H - 100, 9.5, MUT, GROT_M, anchor="rs",
              track=2.6)
    return base


# ═══════════════════════════════════════════════════════════════════════════
#  slides
# ═══════════════════════════════════════════════════════════════════════════
def s1(p):
    base = page(p["n"], 0)
    latin(base, p["kicker"], W / 2, 208, 24, ORANGE)
    y = 330
    line(base, [("أول", "t"), ("سوم", "hv")], W / 2, y, 94, HEAD)
    y += 142
    line(base, [("تسمعو،", "t"), ("هو", "t")], W / 2, y, 94, HEAD)
    y += 142
    line(base, [("اللي", "t"), ("يبقى", "ho")], W / 2, y, 94, HEAD)
    y += 142
    line(base, [("في", "t"), ("راسك.", "t")], W / 2, y, 94, HEAD)
    latin(base, p["en"], W / 2, y + 74, 42, VIO_D)
    sticker(base, "الميكانيزم", 874, 302, 8, ORANGE, CREAM, "target", 22)
    sticker(base, "500 دج", 214, 508, -7, VIO, CREAM, "sound", 22)
    ar_center(base, p["sub"], W / 2, y + 148, 25, MUT, BODY, 780, 1.55)
    img = logo(204)
    disc = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ImageDraw.Draw(disc).ellipse(
        [(W / 2 - 102) * SS, 952 * SS, (W / 2 + 102) * SS, 1156 * SS],
        fill=(*VIO, 255))
    base.alpha_composite(disc)
    base.alpha_composite(img, (int((W / 2 - img.width / 2 / SS) * SS),
                               int((952 + 102 - img.height / 2 / SS) * SS)))
    return base


def _disc(base, cx, cy, r, color=VIO):
    lay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ImageDraw.Draw(lay).ellipse([(cx - r) * SS, (cy - r) * SS,
                                 (cx + r) * SS, (cy + r) * SS],
                                fill=(*color, 255))
    base.alpha_composite(lay)


def _mascot(base, cx, cy, r):
    _disc(base, cx, cy, r)
    img = logo(int(r * 1.28))
    base.alpha_composite(img, (int((cx - img.width / 2 / SS) * SS),
                               int((cy - img.height / 2 / SS) * SS)))
    return cy + r


def s2(p):
    base = page(p["n"], 1)
    y = 330
    line(base, [("دماغك", "t"), ("ياخذ", "t")], W / 2, y, 90, HEAD)
    y += 132
    line(base, [("أول رقم", "ho")], W / 2, y, 90, HEAD)
    y += 132
    line(base, [("و", "t"), ("يوقف", "hv"), ("عليه.", "t")], W / 2, y, 90,
         HEAD)
    ar_center(base, p["b2"], W / 2, y + 96, 25, MUT, BODY, 780, 1.55)
    sticker(base, "anchoring", 844, 452, 7, VIO, CREAM, "spark", 20,
            "Playfair-BoldItalic.ttf")
    bottom = _mascot(base, W / 2, 928, 128)
    latin(base, "KAHNEMAN · 1974", W / 2, bottom + 46, 10, MUT, GROT_M,
          anchor="ms", track=3.4)
    return base


def s3(p):
    base = page(p["n"], 2)
    y = 286
    line(base, [("ثلاثة", "hv"), ("حركات", "t")], W / 2, y, 84, HEAD)
    y += 112
    line(base, [("و", "t"), ("الترتيب", "ho"), ("يبيع.", "t")], W / 2, y, 84,
         HEAD)
    top = y + 96
    for i, (head, body) in enumerate(p["items3"]):
        hw = tw(head, HEAD, 30)
        sticker(base, f"0{i + 1}", W / 2 - hw / 2 - 58, top + 18,
                -6 if i % 2 else 5, VIO if i % 2 else ORANGE, CREAM, None,
                19, GROT_B, (16, 11))
        ar_center(base, head, W / 2, top + 46, 30, INK, HEAD, 720, 1.25)
        yy = ar_center(base, body, W / 2, top + 100, 22, MUT, BODY, 720, 1.5)
        top = yy + 60
        if i < len(p["items3"]) - 1:
            d = ImageDraw.Draw(base)
            d.line([(W / 2 - 26) * SS, (top - 30) * SS, (W / 2 + 26) * SS,
                    (top - 30) * SS], fill=(150, 132, 180, 120), width=2)
    return base


def s4(p):
    base = page(p["n"], 3)
    y = 300
    line(base, [("نفس", "t"), ("الصوت،", "hv")], W / 2, y, 84, HEAD)
    y += 112
    line(base, [("الفرق", "t"), ("في", "ho"), ("الترتيب.", "t")], W / 2, y, 84,
         HEAD)
    cy = y + 200
    # deux nombres surlignés
    for txt, cx, col in ((p["num_a"], W / 2 - 150, VIO_SOFT),
                         (p["num_b"], W / 2 + 150, ORANGE_SOFT)):
        w = tw(txt, "Playfair-Bold.ttf", 112)
        bar = Image.new("RGBA", (int((w + 40) * SS), int(120 * SS)), (0, 0, 0, 0))
        ImageDraw.Draw(bar).rounded_rectangle(
            [0, 0, bar.width - 1, bar.height - 1], radius=14 * SS,
            fill=(*col, 255))
        base.alpha_composite(bar, (int((cx - w / 2 - 20) * SS),
                                   int((cy - 92) * SS)))
        d = ImageDraw.Draw(base)
        d.text((cx * SS, cy * SS), txt, font=font("Playfair-Bold.ttf", 112),
               fill=INK if col is VIO_SOFT else VIO_D, anchor="ms")
    ar_center(base, p["lab_a"], W / 2 - 150, cy + 52, 20, MUT, HEAD_S, 300, 1.2)
    ar_center(base, p["lab_b"], W / 2 + 150, cy + 52, 20, MUT, HEAD_S, 300, 1.2)
    y2 = ar_center(base, p["b4"], W / 2, cy + 148, 25, MUT, BODY, 780, 1.6)
    ar_center(base, p["note4"], W / 2, y2 + 70, 21, INK, BODY_M, 720, 1.55)
    _mascot(base, W / 2, 1030, 92)
    latin(base, "sawtify.space", W / 2, 1170, 11, MUT, GROT_M, anchor="ms",
          track=3.4)
    return base


def s5(p):
    base = page(p["n"], 4, last=True)
    y = 340
    line(base, [("الترتيب", "hv"), ("يبيع", "t")], W / 2, y, 88, HEAD)
    y += 116
    line(base, [("أكثر", "t"), ("من", "t"), ("التخفيض.", "ho")], W / 2, y, 88,
         HEAD)
    ar_center(base, p["b5"], W / 2, y + 82, 25, MUT, BODY, 780, 1.55)
    # bandeau CTA
    top = y + 150
    band = Image.new("RGBA", (int((W - 2 * M) * SS), int(190 * SS)), (0, 0, 0, 0))
    ImageDraw.Draw(band).rounded_rectangle(
        [0, 0, band.width - 1, band.height - 1], radius=30 * SS,
        fill=(*ORANGE, 255))
    shadow = Image.new("RGBA", band.size, (0, 0, 0, 0))
    shadow.paste((40, 16, 80, 46), (0, 0), band.split()[-1])
    base.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(22)),
                         (int(M * SS), int((top + 10) * SS)))
    base.alpha_composite(band, (int(M * SS), int(top * SS)))
    ar_center(base, p["cta"], W / 2, top + 62, 34, CREAM, HEAD, 700, 1.25)
    latin(base, p["url"], W / 2, top + 130, 25, CREAM, GROT_B, anchor="ms",
          track=0.4)
    _mascot(base, W / 2, top + 330, 100)
    ar_center(base, p["end_note"], W / 2, top + 470, 21, MUT, BODY, 740, 1.5)
    return base


PUBS = [
    {
        "id": "k1-ancrage", "n": 5,
        "kicker": "n° 01 — le premier chiffre",
        "en": "anchoring.",
        "sub": "علاش 500 دج تبان رخيصة كي تجي بعد 3 000، و تبان غالية كي تجي بوحدها.",
        "b2": "كل سوم بعدو يتقاس بيه، ماشي بالسوق. بدّل الترتيب، ماشي السوم.",
        "items3": [("بيّن المرجع قبل سومك", "سوم السوق، سوم الوكالة، سوم الاستوديو."),
                   ("فسّر واش كاين في السوم", "30 ثانية، دارجة، تعديل مرتين، تسليم 24 ساعة."),
                   ("خلّي المقارنة واضحة", "قبل / بعد، بلا صوت / بالصوت.")],
        "num_a": "3 000", "num_b": "500",
        "lab_a": "المرجع", "lab_b": "سومنا",
        "b4": "حطيت المرجع قبل السوم، الزبون وحدو يفهم بلي 500 دج صفقة.",
        "note4": "3 000 دج سوم السوق، 500 دج سومنا، و الفرق يبان في الأول.",
        "b5": "ما تنقصش السوم. بدّل البلاصة اللي تحطو فيها.",
        "cta": "خود الصوت تاعك في 24 ساعة",
        "url": "sawtify.space",
        "end_note": "صوت واحد، دارجة جزايرية، 500 دج. تجربة قبل ما تخلّص.",
        "skel": [s1, s2, s3, s4, s5],
    },
]


def render(pub):
    d = OUT / pub["id"]
    d.mkdir(parents=True, exist_ok=True)
    for i, fn in enumerate(pub["skel"]):
        img = fn(pub).convert("RGB").resize((W, H), Image.LANCZOS)
        img.save(d / f"{i + 1:02d}.jpg", quality=95, optimize=True,
                 subsampling=1)
        print("  ✓", d.name, f"{i + 1:02d}")


def planches():
    files = sorted((OUT / PUBS[0]["id"]).glob("*.jpg"))
    tw_, th_ = 500, 625
    sheet = Image.new("RGB", (len(files) * (tw_ + 8) + 8, th_ + 16),
                      (30, 18, 56))
    for i, f in enumerate(files):
        sheet.paste(Image.open(f).convert("RGB").resize((tw_, th_),
                                                        Image.LANCZOS),
                    (8 + i * (tw_ + 8), 8))
    sheet.save(OUT / "planche-k1.jpg", quality=93, optimize=True)
    print("  ✓ planche-k1.jpg")


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
        if a.only and a.only not in pub["id"]:
            continue
        print("·", pub["id"])
        render(pub)


if __name__ == "__main__":
    main()
