#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
lettre.py — reproduction du poster de référence (papier texturé, gros titre
mixte, mot surligné, stickers à icônes, petits triangles).

 Le gabarit « lettre » :
   · wordmark sawtify centré en haut (petit, interlettré)
   · une ligne d'attaque  (« شكون احنا: »)
   · le bloc de titre, 4 à 6 lignes centrées, mélange Regular / Black,
     un mot surligné par une barre, triangles de repère
   · 2 à 3 stickers inclinés avec icône, posés dans les blancs

    python3 lettre.py            → slides/lettre/<id>/01..05.jpg
    python3 lettre.py --only l1
    python3 lettre.py --planches
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw

from kinetic import (BODY, CREAM, GROT_B, GROT_M, H, HEAD, INK, MUT, ORANGE,
                     ORANGE_SOFT, SERIF_IT, SS, VIO, VIO_D, VIO_SOFT, W,
                     _icon, ar_center, latin, logo, paper, sticker, tri, tw)

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "slides" / "lettre"

REG = "NotoSansArabic-Regular.ttf"
MID = "NotoSansArabic-SemiBold.ttf"
BLK = "NotoSansArabic-Black.ttf"

M = 84


def wordmark(base, color=VIO, y=104, size=22):
    latin(base, "sawtify", W / 2, y, size, color, GROT_B, anchor="ms",
          track=7.5)


def block(base, tokens, cx, y, size, gap=None, bar_default=True):
    """Une ligne : tokens = [(texte, poids, surligneur)].

    poids ∈ "b" (Black) · "m" (SemiBold) · "r" (Regular)
    surligneur ∈ None | "v" | "o"
    """
    fmap = {"b": BLK, "m": MID, "r": REG}
    gap = gap if gap is not None else size * 0.22
    widths = [tw(t, fmap[w], size) for t, w, _ in tokens]
    total = sum(widths) + gap * (len(tokens) - 1)
    x = cx + total / 2
    for (t, weight, mark), w in zip(tokens, widths):
        if mark and bar_default:
            col = VIO_SOFT if mark == "v" else ORANGE_SOFT
            bw, bh = w + size * 0.14, size * 0.86
            bar = Image.new("RGBA", (int(bw * SS), int(bh * SS)), (0, 0, 0, 0))
            ImageDraw.Draw(bar).rounded_rectangle(
                [0, 0, bar.width - 1, bar.height - 1],
                radius=int(size * 0.10 * SS), fill=(*col, 255))
            bar = bar.rotate(-1.2, expand=True, resample=Image.BICUBIC)
            base.alpha_composite(bar, (int((x - w - size * 0.07) * SS),
                                       int((y - size * 0.72) * SS)))
        ImageDraw.Draw(base).text(
            ((x - w) * SS, y * SS), latin_visual(t), font=_f(fmap[weight], size),
            fill=INK, anchor="ls")
        x -= w + gap
    return y


_f_cache: dict = {}


def _f(name, size):
    from sawtify_ig import font
    key = (name, size)
    if key not in _f_cache:
        _f_cache[key] = font(name, size)
    return _f_cache[key]


def latin_visual(t):
    from sawtify_ig import visual
    return visual(t)


def finish(base, n, k, last=False):
    """Pagination discrète + crédit, sans casser le poster."""
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
    latin(base, "SAWTIFY.SPACE", M, H - 62, 9.5, MUT, GROT_M, anchor="ls",
          track=2.6)
    if not last:
        latin(base, "SWIPE", W - M, H - 62, 9.5, MUT, GROT_M, anchor="rs",
              track=2.6)
    return base


def poster(kicker, lines, size, stickers=(), marks=(), seed=3):
    """Compose une page complète du gabarit « lettre »."""
    base = paper(seed=seed)
    wordmark(base)
    y = 322
    ar_center(base, kicker, W / 2, y, 42, INK, BLK, 800, 1.3)
    y += 132
    lead = size * 1.28
    for tokens in lines:
        block(base, tokens, W / 2, y, size)
        y += lead
    for st in stickers:
        sticker(base, st["text"], st["x"], st["y"], st.get("rot", -6),
                st.get("fill", ORANGE), CREAM, st.get("icon"), st.get("size", 22))
    for (tx, ty, sz, rot, col) in marks:
        tri(base, tx, ty, sz, col, rot)
    return base, y


# ═══════════════════════════════════════════════════════════════════════════
#  publication 01 — « شكون احنا »
# ═══════════════════════════════════════════════════════════════════════════
def l1(p):
    base, y = poster(
        "شكون احنا:",
        [
            [("نصنعو", "r", None)],
            [("أصوات", "b", "v"), ("تبيع،", "b", None)],
            [("بالدارجة", "r", None)],
            [("من الفكرة", "b", None)],
            [("حتى التسليم.", "r", None)],
        ],
        106,
        stickers=[
            dict(text="500 دج", x=312, y=320, rot=-7, fill=VIO, icon="sound",
                 size=21),
            dict(text="دارجة جزايرية", x=842, y=606, rot=7, fill=ORANGE,
                 icon="target", size=21),
            dict(text="24 ساعة", x=918, y=862, rot=5, fill=ORANGE,
                 icon="spark", size=21),
        ],
        marks=[(150, 520, 20, 180, ORANGE), (952, 726, 16, 0, VIO)],
    )
    finish(base, p["n"], 0)
    return base


def l2(p):
    base, y = poster(
        "الميكانيزم:",
        [
            [("دماغك", "b", None), ("ياخذ", "r", None)],
            [("أول", "b", "o"), ("رقم", "b", None)],
            [("و يوقف", "r", None)],
            [("عليه.", "b", None)],
        ],
        106,
        stickers=[
            dict(text="anchoring", x=196, y=700, rot=-7, fill=VIO,
                 icon="spark", size=22),
            dict(text="كل سوم بعدو", x=846, y=672, rot=6, fill=ORANGE,
                 icon="target", size=21),
        ],
        marks=[(902, 452, 16, 0, ORANGE)],
        seed=4,
    )
    ar_center(base, p["b2"], W / 2, y + 60, 25, MUT, BODY, 780, 1.55)
    finish(base, p["n"], 1)
    return base


def l3(p):
    base, y = poster(
        "كيفاش:",
        [
            [("ثلاثة", "b", "v"), ("حركات،", "r", None)],
            [("و", "r", None), ("الترتيب", "b", "o"), ("يبيع.", "b", None)],
        ],
        84,
        stickers=[
            dict(text="01 · بيّن المرجع", x=286, y=700, rot=-6, fill=ORANGE,
                 icon="target", size=20),
            dict(text="02 · فسّر السوم", x=806, y=838, rot=6, fill=VIO,
                 icon="sound", size=20),
            dict(text="03 · قارن بوضوح", x=300, y=976, rot=-5, fill=ORANGE,
                 icon="spark", size=20),
        ],
        marks=[(150, 470, 18, 180, VIO)],
        seed=5,
    )
    finish(base, p["n"], 2)
    return base


def l4(p):
    base = paper(seed=6)
    wordmark(base)
    ar_center(base, "الفرق:", W / 2, 352, 42, INK, BLK, 800, 1.3)
    # deux nombres géants surlignés, comme le bloc de titre
    y = 552
    for txt, cx, fname, col in ((p["num_a"], W / 2 - 152, "Playfair-Bold.ttf",
                                 VIO_SOFT),
                                (p["num_b"], W / 2 + 152, "Playfair-Bold.ttf",
                                 ORANGE_SOFT)):
        w = tw(txt, fname, 116)
        bar = Image.new("RGBA", (int((w + 46) * SS), int(126 * SS)), (0, 0, 0, 0))
        ImageDraw.Draw(bar).rounded_rectangle(
            [0, 0, bar.width - 1, bar.height - 1], radius=12 * SS,
            fill=(*col, 255))
        bar = bar.rotate(-1.2, expand=True, resample=Image.BICUBIC)
        base.alpha_composite(bar, (int((cx - w / 2 - 23) * SS),
                                   int((y - 96) * SS)))
        ImageDraw.Draw(base).text((cx * SS, y * SS), txt,
                                  font=_f(fname, 116), fill=INK, anchor="ms")
    ar_center(base, p["lab_a"], W / 2 - 152, y + 52, 21, MUT, MID, 320, 1.2)
    ar_center(base, p["lab_b"], W / 2 + 152, y + 52, 21, MUT, MID, 320, 1.2)
    yy = ar_center(base, p["b4"], W / 2, y + 150, 25, MUT, BODY, 780, 1.55)
    ar_center(base, p["note4"], W / 2, yy + 64, 21, INK, MID, 720, 1.5)
    tri(base, 168, 552, 18, ORANGE, 180)
    tri(base, 912, 700, 16, VIO, 0)
    from kinetic import _mascot
    _mascot(base, W / 2, 992, 92)
    finish(base, p["n"], 3)
    return base


def l5(p):
    base, y = poster(
        "و بعد؟",
        [
            [("الترتيب", "b", "v"), ("يبيع", "r", None)],
            [("أكثر", "b", None)],
            [("من التخفيض.", "r", None)],
        ],
        88,
        stickers=[
            dict(text="ما تنقصش السوم", x=846, y=566, rot=6, fill=ORANGE,
                 icon="target"),
        ],
        marks=[(852, 830, 18, 0, ORANGE)],
        seed=7,
    )
    hi = Image.new("RGBA", (int((W - 2 * M) * SS), int(176 * SS)), (0, 0, 0, 0))
    ImageDraw.Draw(hi).rounded_rectangle(
        [0, 0, hi.width - 1, hi.height - 1], radius=28 * SS,
        fill=(*ORANGE, 255))
    top = y + 70
    base.alpha_composite(hi, (int(M * SS), int(top * SS)))
    ar_center(base, p["cta"], W / 2, top + 58, 32, CREAM, BLK, 720, 1.25)
    latin(base, p["url"], W / 2, top + 122, 24, CREAM, GROT_B, anchor="ms",
          track=0.4)
    ar_center(base, p["end_note"], W / 2, top + 240, 21, MUT, BODY, 740, 1.5)
    finish(base, p["n"], 4, last=True)
    return base


PUBS = [
    {
        "id": "l1-sawtify", "n": 5,
        "b2": "كل سوم بعدو يتقاس بيه، ماشي بالسوق. بدّل الترتيب، ماشي السوم.",
        "num_a": "3 000", "num_b": "500",
        "lab_a": "المرجع", "lab_b": "سومنا",
        "b4": "حطيت المرجع قبل السوم، الزبون وحدو يفهم بلي 500 دج صفقة.",
        "note4": "3 000 دج سوم السوق، 500 دج سومنا، و الفرق يبان في الأول.",
        "cta": "خود الصوت تاعك في 24 ساعة",
        "url": "sawtify.space",
        "end_note": "صوت واحد، دارجة جزايرية، 500 دج. تجربة قبل ما تخلّص.",
        "skel": [l1, l2, l3, l4, l5],
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
    sheet.save(OUT / "planche-l1.jpg", quality=93, optimize=True)
    print("  ✓ planche-l1.jpg")


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
