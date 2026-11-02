#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
lettre.py — gabarit « lettre » reproduit à l'identique de la référence :
papier texturé, ligne d'attaque centrée, bloc de titre en graisses mixtes
avec un mot surligné, pastilles inclinées à icônes, cibles, halos de coin.

    python3 lettre.py            → slides/lettre/dz/01..05.jpg
    python3 lettre.py --only fr
    python3 lettre.py --planches
"""
from __future__ import annotations

import argparse
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

import typekit as tk
from typekit import draw as tdraw, width as twidth

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "slides" / "lettre"
LOGO = ROOT / "assets" / "logo-mark-trim.png"

W, H = 1080, 1350
SS = 2

CREAM = (242, 241, 237)
INK = (17, 17, 19)
MUT = (96, 90, 110)
VIO = (109, 39, 234)
VIO_SOFT = (211, 195, 255)
ORANGE = (253, 96, 41)

REG = "NotoSansArabic-Regular.ttf"
MED = "NotoSansArabic-SemiBold.ttf"
BLK = "NotoSansArabic-Black.ttf"
WORD = "SpaceGrotesk-Bold.ttf"

WEIGHT = {"r": REG, "m": MED, "b": BLK}
WEIGHT_LAT = {"r": "SpaceGrotesk-Regular.ttf", "m": "SpaceGrotesk-Medium.ttf",
              "b": "SpaceGrotesk-Bold.ttf"}

_logo: dict = {}


def paper(seed=3):
    rnd = random.Random(seed)
    base = Image.new("RGB", (W * SS, H * SS), CREAM)
    noise = Image.new("L", (W // 2, H // 2))
    noise.putdata([rnd.randint(118, 136) for _ in range(W // 2 * H // 2)])
    grain = Image.merge("RGB", [noise] * 3).resize((W * SS, H * SS), Image.BILINEAR)
    base = Image.blend(base, grain, 0.055)
    d = ImageDraw.Draw(base, "RGBA")
    for x in range(0, W, 54):
        d.line([(x * SS, 0), (x * SS, H * SS)], fill=(120, 120, 130, 10), width=2)
    for y in range(0, H, 54):
        d.line([(0, y * SS), (W * SS, y * SS)], fill=(120, 120, 130, 10), width=2)

    glow = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([-320 * SS, 760 * SS, 420 * SS, 1560 * SS], fill=(*ORANGE, 40))
    gd.ellipse([700 * SS, -420 * SS, 1440 * SS, 320 * SS], fill=(*VIO, 34))
    base = Image.alpha_composite(base.convert("RGBA"),
                                 glow.filter(ImageFilter.GaussianBlur(210)))
    return base


def wordmark(base, y=132, size=20, col=VIO):
    d = ImageDraw.Draw(base)
    f = tk._pil(WORD, size)
    txt, track = "sawtify", 7.0
    total = sum(d.textlength(c, font=f) / SS for c in txt) + track * (len(txt) - 1)
    x = W / 2 - total / 2
    for c in txt:
        d.text((x * SS, y * SS), c, font=f, fill=col, anchor="ls")
        x += d.textlength(c, font=f) / SS + track


# ── pastilles ────────────────────────────────────────────────────────────
def _icon(kind, size, color):
    im = Image.new("RGBA", (int(size * SS), int(size * SS)), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    s = size * SS
    if kind == "target":
        for k, wd in ((0.44, 0.10), (0.24, 0.10)):
            d.ellipse([s * (.5 - k), s * (.5 - k), s * (.5 + k), s * (.5 + k)],
                      outline=(*color, 255), width=max(2, int(s * wd)))
        d.ellipse([s * 0.44, s * 0.44, s * 0.56, s * 0.56], fill=(*color, 255))
        d.line([s * .56, s * .44, s * .80, s * .20], fill=(*color, 255),
               width=max(2, int(s * 0.09)))
    elif kind == "sound":
        d.rounded_rectangle([s * .10, s * .38, s * .30, s * .62], radius=s * .04,
                            fill=(*color, 255))
        d.polygon([(s * .30, s * .50), (s * .56, s * .22), (s * .56, s * .78)],
                  fill=(*color, 255))
        d.arc([s * .50, s * .26, s * .88, s * .74], -60, 60, fill=(*color, 255),
              width=max(2, int(s * 0.08)))
    elif kind == "spark":
        pts = []
        for i in range(8):
            r = s * (0.42 if i % 2 == 0 else 0.16)
            a = math.pi / 4 * i - math.pi / 2
            pts.append((s / 2 + r * math.cos(a), s / 2 + r * math.sin(a)))
        d.polygon(pts, fill=(*color, 255))
    return im


def pill_size(text, size, icon, font=BLK):
    tw_ = twidth(text, font, size)
    ic = int(size * 1.15) if icon else 0
    gap = int(size * 0.42) if icon else 0
    w = size * 1.9 + tw_ + ic + gap
    h = size * 2.45
    return w, h


def pill(base, text, cx, cy, rot=-6, size=26, fill=VIO_SOFT, fg=INK,
         icon="target", font=BLK):
    tw_ = twidth(text, font, size)
    ic = int(size * 1.15) if icon else 0
    gap = int(size * 0.42) if icon else 0
    h = size * 2.45
    w = size * 1.5 + tw_ + ic + gap + size * 0.5
    card = Image.new("RGBA", (int(w * SS), int(h * SS)), (0, 0, 0, 0))
    ImageDraw.Draw(card).rounded_rectangle(
        [0, 0, card.width - 1, card.height - 1], radius=int(h * 0.30 * SS),
        fill=(*fill, 255))
    x = size * 0.85
    if icon:
        card.alpha_composite(_icon(icon, ic, fg), (int(x * SS),
                                                   int((h * SS - ic * SS) / 2)))
        x += ic + gap
    tdraw(card, text, x + tw_ / 2, h / 2 + size * 0.36, size, fg, font,
          align="center")
    card = card.rotate(rot, expand=True, resample=Image.BICUBIC)
    sh = Image.new("RGBA", card.size, (0, 0, 0, 0))
    sh.paste((40, 30, 60, 60), (0, 0), card.split()[-1])
    base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(5 * SS)),
                         (int((cx - card.width / 2 / SS) * SS) + 3,
                          int((cy - card.height / 2 / SS) * SS) + 7))
    base.alpha_composite(card, (int((cx - card.width / 2 / SS) * SS),
                                int((cy - card.height / 2 / SS) * SS)))


def dart(base, cx, cy, size=26, color=VIO, rot=0):
    ic = _icon("target", size, color)
    if rot:
        ic = ic.rotate(rot, expand=True, resample=Image.BICUBIC)
    base.alpha_composite(ic, (int((cx - ic.width / 2 / SS) * SS),
                              int((cy - ic.height / 2 / SS) * SS)))


def marker(base, x, y, size=30, color=VIO, flip=False):
    """Petit triangle plein (coin de surligneur)."""
    lay = Image.new("RGBA", (int(size * SS), int(size * SS)), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    s = size * SS
    if flip:
        d.polygon([(0, s), (s, s), (s / 2, 0)], fill=(*color, 255))
    else:
        d.polygon([(0, 0), (s, 0), (s / 2, s)], fill=(*color, 255))
    base.alpha_composite(lay, (int(x * SS), int(y * SS)))


# ── bloc de titre ────────────────────────────────────────────────────────
def ink_box(text, name, size):
    w = twidth(text, name, size)
    pad, bs = size * 0.7, size * 2.2
    im = Image.new("L", (int((w + 2 * pad) * SS), int(3.4 * size * SS)), 0)
    tdraw(im, text, pad, bs, size, 255, name, align="left")
    bb = im.getbbox()
    if not bb:
        return 0.0, w, -size * 0.7, 0.0
    return (bb[0] / SS - pad, bb[2] / SS - pad, bb[1] / SS - bs, bb[3] / SS - bs)


def hline(base, tokens, cx, y, size, gap=None, fonts=None, rtl=True):
    fonts = fonts or WEIGHT
    gap = size * 0.22 if gap is None else gap
    widths = [twidth(t, fonts[w], size) for t, w, _ in tokens]
    total = sum(widths) + gap * (len(tokens) - 1)
    xs = []
    if rtl:
        x = cx + total / 2
        for w_ in widths:
            xs.append(x - w_)
            x -= w_ + gap
    else:
        x = cx - total / 2
        for w_ in widths:
            xs.append(x)
            x += w_ + gap
    for (t, w, style), w_, xt in zip(tokens, widths, xs):
        if style == "mark":
            mask = Image.new("L", base.size, 0)
            tdraw(mask, t, xt, y, size, 255, fonts[w], align="left")
            bb = mask.getbbox()
            if bb:
                px, py = size * 0.16, size * 0.14
                bx0, by0 = bb[0] / SS - px, bb[1] / SS - py
                bw = (bb[2] - bb[0]) / SS + 2 * px
                bh = (bb[3] - bb[1]) / SS + 2 * py
                bar = Image.new("RGBA", (int(bw * SS), int(bh * SS)), (0, 0, 0, 0))
                ImageDraw.Draw(bar).rectangle([0, 0, bar.width - 1, bar.height - 1],
                                              fill=(*VIO_SOFT, 240))
                bar = bar.rotate(-1.2, expand=True, resample=Image.BICUBIC)
                base.alpha_composite(bar, (int((bx0 - (bar.width / SS - bw) / 2) * SS),
                                           int((by0 - (bar.height / SS - bh) / 2) * SS)))
                marker(base, bx0 - size * 0.02, by0 - size * 0.30, size * 0.24, VIO)
        tdraw(base, t, xt, y, size, INK, fonts[w], align="left")
    return cx - total / 2, cx + total / 2


def block(base, lines, cx, top, size, lead=1.30, fonts=None, rtl=True):
    y = top
    geo = []
    for toks in lines:
        x0, x1 = hline(base, toks, cx, y, size, fonts=fonts, rtl=rtl)
        geo.append((y, x0, x1))
        y += size * lead
    return y - size * lead, geo


def kicker(base, text, y=300, size=58, font=BLK):
    tdraw(base, text, W / 2, y, size, INK, font, align="center")


# ═══════════════════════════════════════════════════════════════════════════
#  slides
# ═══════════════════════════════════════════════════════════════════════════
def slide(spec, seed=3, rtl=True):
    base = paper(seed=seed)
    wordmark(base)
    fonts = spec.get("fonts") or WEIGHT
    kicker(base, spec["kicker"], spec.get("kick_y", 300), spec.get("kick_size", 58),
           fonts["b"] if spec.get("fonts") else BLK)
    bot, geo = block(base, spec["lines"], W / 2, spec.get("top", 470),
                     spec.get("size", 108 if rtl else 84), spec.get("lead", 1.30),
                     fonts=fonts, rtl=rtl)
    for it in spec.get("pills", ()):
        idx, side = it["anchor"]
        idx = min(idx, len(geo) - 1)
        ly, lx0, lx1 = geo[idx]
        fnt = fonts["b"] if spec.get("fonts") else BLK
        pw, ph = pill_size(it["t"], it.get("size", 26), it.get("icon", "target"), fnt)
        dx = it.get("dx", 24)
        cx = (lx1 + dx + pw / 2) if side == "right" else (lx0 - dx - pw / 2)
        cx = min(max(cx, 40 + pw / 2), W - 40 - pw / 2)
        cy = ly + it.get("dy", -6)
        pill(base, it["t"], cx, cy, it.get("rot", -6), it.get("size", 26),
             it.get("fill", VIO_SOFT), INK, it.get("icon", "target"), fnt)
    for d in spec.get("darts", ()):
        dart(base, d[0], d[1], d[2], VIO, d[3] if len(d) > 3 else 0)
    return base


DZ = {"id": "dz", "seed": 3, "slides": [
    dict(kicker="شكون احنا:",
         lines=[[("نصنعو", "r", None)],
                [("أصوات", "b", "mark"), ("تبيع", "r", None)],
                [("بالدارجة،", "b", None)],
                [("من", "r", None), ("الفكرة", "b", None)],
                [("حتى", "r", None), ("التسليم.", "b", None)]],
         pills=[dict(t="دارجة بلادنا", anchor=(1, "right"), dx=26, dy=-26,
                     rot=6, icon="target"),
                dict(t="500 دج · 30 ثانية", anchor=(0, "right"), dx=-4, dy=56,
                     rot=-4, icon="sound"),
                dict(t="تسليم 24 ساعة", anchor=(4, "left"), dx=-6, dy=62,
                     rot=5, icon="spark")],
         darts=[(600, 1104, 34), (296, 690, 30, 10)]),
    dict(kicker="المشكل:",
         lines=[[("فيديو", "r", None)],
                [("بلا", "r", None), ("صوت", "b", "mark")],
                [("ما", "b", None), ("يوقّف", "r", None)],
                [("حتى", "r", None), ("واحد.", "b", None)]],
         pills=[dict(t="3 ثواني", anchor=(1, "right"), dx=24, dy=-22, rot=6,
                     icon="target"),
                dict(t="الزبون يفوت", anchor=(3, "left"), dx=-4, dy=54, rot=-5,
                     icon="sound")],
         darts=[(320, 1020, 30)]),
    dict(kicker="واش تدير:",
         lines=[[("ابعت", "b", None)],
                [("السكريبت،", "r", None)],
                [("ختر", "b", "mark")],
                [("الصوت،", "r", None)],
                [("خود", "r", None), ("في 24 ساعة.", "b", None)]],
         pills=[dict(t="دارجة جزايرية", anchor=(2, "left"), dx=-2, dy=46, rot=-6,
                     icon="target")],
         darts=[(600, 1096, 34), (326, 748, 30, -8)]),
    dict(kicker="الفرق:",
         lines=[[("24", "b", "mark"), ("ساعة", "r", None)],
                [("عندنا،", "b", None)],
                [("21", "b", None), ("يوم", "r", None)],
                [("في", "r", None), ("الاستوديو.", "b", None)]],
         pills=[dict(t="بلا انتظار", anchor=(2, "right"), dx=22, dy=-20, rot=-6,
                     icon="target")],
         darts=[(340, 1040, 34), (604, 700, 30)]),
    dict(kicker="و من بعد؟",
         lines=[[("خود", "r", None)],
                [("الصوت", "b", "mark")],
                [("تاعك", "r", None), ("درك.", "b", None)]],
         pills=[dict(t="500 دج", anchor=(1, "right"), dx=24, dy=-18, rot=6,
                     icon="spark"),
                dict(t="sawtify.space", anchor=(2, "left"), dx=-4, dy=58, rot=-5,
                     icon="target", size=22)],
         darts=[(560, 1080, 26)]),
]}

FR = {"id": "fr", "seed": 23, "rtl": False, "fonts": WEIGHT_LAT, "slides": [
    dict(kicker="Qui on est :",
         lines=[[("On", "r", None), ("crée", "r", None)],
                [("des", "r", None), ("voix", "b", "mark"), ("qui", "r", None)],
                [("vendent,", "b", None)],
                [("en", "r", None), ("darija.", "b", None)]],
         pills=[dict(t="500 DA · 30 sec", anchor=(0, "right"), dx=14, dy=42,
                     rot=7, icon="sound"),
                dict(t="livré en 24 h", anchor=(3, "left"), dx=16, dy=44,
                     rot=-4, icon="spark")],
         darts=[(596, 1092, 26)]),
    dict(kicker="Le problème :",
         lines=[[("Une", "r", None), ("vidéo", "r", None)],
                [("sans", "r", None), ("son", "b", "mark")],
                [("n’arrête", "b", None)],
                [("personne.", "r", None)]],
         pills=[dict(t="3 secondes", anchor=(1, "right"), dx=22, dy=-20, rot=6,
                     icon="target")],
         darts=[(320, 1020, 30)]),
    dict(kicker="Quoi faire :",
         lines=[[("Envoyez", "b", None)],
                [("le", "r", None), ("script,", "b", None)],
                [("choisissez", "b", "mark")],
                [("la", "r", None), ("voix.", "b", None)],
                [("24 h.", "r", None)]],
         pills=[dict(t="darja algérienne", anchor=(0, "left"), dx=18, dy=44, rot=-6,
                     icon="target")],
         darts=[(596, 1080, 26)]),
    dict(kicker="L’écart :",
         lines=[[("24", "b", "mark"), ("heures", "r", None)],
                [("chez", "r", None), ("nous,", "b", None)],
                [("21", "b", None), ("jours", "r", None)],
                [("en", "r", None), ("studio.", "b", None)]],
         pills=[dict(t="sans attendre", anchor=(2, "right"), dx=16, dy=-54, rot=-6,
                     icon="target")],
         darts=[(340, 1030, 28)]),
    dict(kicker="Et après ?",
         lines=[[("Prenez", "r", None)],
                [("votre", "b", "mark")],
                [("voix", "r", None), ("maintenant.", "b", None)]],
         pills=[dict(t="500 DA", anchor=(1, "right"), dx=24, dy=-18, rot=6,
                     icon="spark")],
         darts=[(560, 1080, 26)]),
]}

PUBS = [DZ, FR]


def render(pub):
    d = OUT / pub["id"]
    d.mkdir(parents=True, exist_ok=True)
    for i, spec in enumerate(pub["slides"]):
        img = slide(spec, seed=pub["seed"] + i,
                    rtl=pub.get("rtl", True)).convert("RGB").resize(
            (W, H), Image.LANCZOS)
        img.save(d / f"{i + 1:02d}.jpg", quality=95, optimize=True, subsampling=1)
        print("  ✓", pub["id"], f"{i + 1:02d}")


def planches():
    for pub in PUBS:
        files = sorted((OUT / pub["id"]).glob("*.jpg"))
        tw_, th_ = 500, 625
        sheet = Image.new("RGB", (len(files) * (tw_ + 8) + 8, th_ + 16), (24, 16, 38))
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
