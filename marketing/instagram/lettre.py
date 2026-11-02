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
ORANGE_SOFT = (255, 206, 186)

# arabe : naskh Amiri (regular + bold) · latin : Space Grotesk
AMR_R = "Amiri-Regular.ttf"
AMR_B = "Amiri-Bold.ttf"
SG_R = "SpaceGrotesk-Regular.ttf"
SG_M = "SpaceGrotesk-Medium.ttf"
SG_B = "SpaceGrotesk-Bold.ttf"

WEIGHT = {"r": AMR_R, "m": AMR_B, "b": AMR_B}
WEIGHT_LAT = {"r": SG_R, "m": SG_M, "b": SG_B}
PILL_FONT = {"ar": AMR_B, "lat": SG_B}
WORD = SG_B
BLK = AMR_B

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


def pill_size(text, size, icon, font=AMR_B):
    tw_ = twidth(text, font, size)
    ic = int(size * 1.15) if icon else 0
    gap = int(size * 0.42) if icon else 0
    w = size * 2.0 + tw_ + ic + gap
    h = size * 2.45
    return w, h


def pill(base, text, cx, cy, rot=-6, size=30, fill=VIO_SOFT, fg=INK,
         icon="target", font=AMR_B):
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


def dart(base, cx, cy, size=30, color=VIO, rot=0):
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
                px, py = size * 0.13, size * 0.15
                bx0, by0 = bb[0] / SS - px, bb[1] / SS - py
                bw = (bb[2] - bb[0]) / SS + 2 * px
                bh = (bb[3] - bb[1]) / SS + 2 * py
                bar = Image.new("RGBA", (int(bw * SS), int(bh * SS)), (0, 0, 0, 0))
                ImageDraw.Draw(bar).rectangle([0, 0, bar.width - 1, bar.height - 1],
                                              fill=(*VIO_SOFT, 255))
                bar = bar.rotate(-1.1, expand=True, resample=Image.BICUBIC)
                base.alpha_composite(bar, (int((bx0 - (bar.width / SS - bw) / 2) * SS),
                                           int((by0 - (bar.height / SS - bh) / 2) * SS)))
                marker(base, bx0 + size * 0.02, by0 - size * 0.13,
                       size * 0.19, VIO)
                tdraw(base, t, xt, y, size, (58, 22, 120), fonts[w], align="left")
                continue
        tdraw(base, t, xt, y, size, INK, fonts[w], align="left")
    return cx - total / 2, cx + total / 2


def lines_geo(lines, cx, top, size, lead=1.30, fonts=None, rtl=True):
    """Bornes de chaque ligne, mesurées avant tout dessin."""
    fonts = fonts or WEIGHT
    gap = size * 0.22
    geo = []
    y = top
    for toks in lines:
        ws = [twidth(t, fonts[w], size) for t, w, _ in toks]
        total = sum(ws) + gap * (len(toks) - 1)
        geo.append((y, cx - total / 2, cx + total / 2))
        y += size * lead
    return geo


def block(base, lines, cx, top, size, lead=1.30, fonts=None, rtl=True):
    y = top
    geo = []
    for toks in lines:
        x0, x1 = hline(base, toks, cx, y, size, gap=size * 0.22,
                       fonts=fonts, rtl=rtl)
        geo.append((y, x0, x1))
        y += size * lead
    return y - size * lead, geo


def _hit(a, b, pad=6):
    return not (a[2] + pad < b[0] or a[0] - pad > b[2]
                or a[3] + pad < b[1] or a[1] - pad > b[3])


def place_pill(spec, geo, size, fonts, placed):
    """Trouve une position de pastille collée au bout d'une ligne, hors du texte."""
    idx, side = spec["anchor"]
    idx = min(idx, len(geo) - 1)
    fnt = fonts["b"]
    psize = spec.get("size", 32)
    while psize >= 24:
        pw, ph = pill_size(spec["t"], psize, spec.get("icon", "target"), fnt)
        ly, lx0, lx1 = geo[idx]
        for dx in (max(spec.get("dx",24),30), 40, 52, 64, 78, 92):
            for dy in (spec.get("dy", -6), -ph * 0.40, ph * 0.40, -ph * 0.72,
                       ph * 0.72):
                cx = (lx1 + dx + pw / 2) if side == "right" \
                    else (lx0 - dx - pw / 2)
                cy = ly + dy
                rot = math.radians(abs(spec.get("rot", -6)))
                bw = pw * math.cos(rot) + ph * math.sin(rot)
                bh = pw * math.sin(rot) + ph * math.cos(rot)
                box = (cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2)
                if box[0] < 44 or box[2] > W - 44 or box[1] < 372 or box[3] > 1224:
                    continue
                # hors de toutes les lignes de texte
                bad = False
                for (gy, gx0, gx1) in geo:
                    line_box = (gx0, gy - size * 0.98, gx1, gy + size * 0.44)
                    if _hit(box, line_box, pad=22):
                        bad = True
                        break
                if bad:
                    continue
                if any(_hit(box, q, pad=12) for q in placed):
                    continue
                return cx, cy, psize, box
        psize -= 2
    return None


def kicker(base, text, y=300, size=58, font=BLK):
    tdraw(base, text, W / 2, y, size, INK, font, align="center")


# ═══════════════════════════════════════════════════════════════════════════
#  slides
# ═══════════════════════════════════════════════════════════════════════════
def _tracked(d, txt, x, y, font, fill, tracking):
    """Texte lettré à la main, toujours dessiné de gauche à droite."""
    for c in txt:
        d.text((x * SS, y * SS), c, font=font, fill=fill, anchor="ls")
        x += d.textlength(c, font=font) / SS + tracking
    return x


def _tracked_w(d, txt, font, tracking):
    return sum(d.textlength(c, font=font) / SS for c in txt) + tracking * (len(txt) - 1)


def footer(base, page, rtl=True, rule_y=1266, text_y=1296):
    """Pied de page miroir : url + pagination aux deux extrémités."""
    d = ImageDraw.Draw(base)
    f = tk._pil(SG_B, 13)
    url, tr = "SAWTIFY.SPACE", 3.0
    w = _tracked_w(d, url, f, tr)
    _tracked(d, url, (W - 46 - w) if rtl else 46, text_y, f, (*MUT, 255), tr)

    wp = _tracked_w(d, page, f, tr)
    _tracked(d, page, 46 if rtl else (W - 46 - wp), text_y, f, (*MUT, 255), tr)

    d.line([46 * SS, rule_y * SS, (W - 46) * SS, rule_y * SS],
           fill=(150, 140, 172, 60), width=int(1.2 * SS))


def _wid(spec, sz, lead, fonts, rtl):
    # attention : lines_geo renvoie (y, x0, x1) → la largeur est x1 - x0
    return max((g[2] - g[1]) for g in
               lines_geo(spec["lines"], W / 2, 0, sz, lead, fonts, rtl))


def fit_size(spec, fonts, rtl, lead=1.26, cap=176):
    """Plus grande taille qui tient : largeur utile + hauteur disponible."""
    n = len(spec["lines"])
    best = 60
    for sz in range(60, cap + 1, 2):
        if _wid(spec, sz, lead, fonts, rtl) > 830:
            break
        vis = (n - 1) * sz * lead + 1.20 * sz
        if vis <= 838:
            best = sz
    return best


TITLE_TOP = 452.0


def block_top(spec, sz, lead):
    """Le bloc démarre TOUJOURS à la même hauteur : c'est la grille."""
    return TITLE_TOP


def slide(spec, seed=3, rtl=True, fonts=None, page="", pill_font=None,
          size_default=96, shared_size=None):
    base = paper(seed=seed)
    wordmark(base)
    fonts = fonts or WEIGHT
    pf = pill_font or fonts["b"]
    lead = spec.get("lead", 1.26)
    size = shared_size or fit_size(spec, fonts, rtl, lead)
    top = block_top(spec, size, lead)
    kicker(base, spec["kicker"], spec.get("kick_y", 300),
           spec.get("kick_size", 56), fonts["b"])

    geo = lines_geo(spec["lines"], W / 2, top, size, lead, fonts, rtl)
    placed = []
    misses = []
    for it in spec.get("pills", ()):
        it = dict(it)
        fnt = PILL_FONT[it.get("font", "ar")] if it.get("font") else pf
        hit = place_pill(it, geo, size, {"b": fnt}, placed)
        if not hit:
            misses.append((it, fnt))
            continue
        cx, cy, psize, box = hit
        placed.append(box)
        pill(base, it["t"], cx, cy, it.get("rot", -6), psize,
             it.get("fill", VIO_SOFT), INK, it.get("icon", "target"), fnt)

    if misses:
        # repli : rang unique centré sous le bloc, jamais aux coins
        rows, total = [], 0.0
        for it, fnt in misses:
            ps = it.get("size", 26)
            while ps > 20:
                pw, ph = pill_size(it["t"], ps, it.get("icon", "target"), fnt)
                if pw - 0.5 * ps <= 470:
                    break
                ps -= 1
            pw, ph = pill_size(it["t"], ps, it.get("icon", "target"), fnt)
            rw = pw - 0.5 * ps
            rows.append((it, fnt, ps, rw, ph))
            total += rw
        total += 24 * (len(rows) - 1)
        y = min(geo[-1][0] + size * 0.98 + 96, 1128)
        x = W / 2 - total / 2
        for i, (it, fnt, ps, rw, ph) in enumerate(rows):
            pill(base, it["t"], x + rw / 2, y, it.get("rot", -4 if i % 2 == 0 else 3),
                 ps, it.get("fill", VIO_SOFT), INK, it.get("icon", "target"), fnt)
            x += rw + 24

    block(base, spec["lines"], W / 2, top, size, lead, fonts=fonts, rtl=rtl)
    for d in spec.get("darts", ()):
        dart(base, d[0], d[1], d[2], VIO, d[3] if len(d) > 3 else 0)
    footer(base, page, rtl)
    return base


DZ = {"id": "dz", "seed": 3, "fonts": WEIGHT, "pill_font": AMR_B, "rtl": True,
      "size": 126, "slides": [
    dict(kicker="المشكل:",
         lines=[[("فيديو", "r", None), ("بلا", "r", None)],
                [("صوت،", "b", "mark")],
                [("ما", "b", None), ("يوقّف", "r", None)],
                [("حتى", "r", None), ("واحد.", "b", None)]],
         pills=[dict(t="3 ثواني", anchor=(1, "right"), icon="target", size=28),
                dict(t="الزبون يفوت", anchor=(2, "left"), icon="sound", size=26,
                     rot=5)]),
    dict(kicker="الحل:",
         lines=[[("صوت", "r", None), ("استوديو،", "b", None)],
                [("بالدارجة،", "r", None)],
                [("في", "r", None), ("30", "b", "mark"), ("ثانية.", "b", None)]],
         pills=[dict(t="بلا ميكرو", anchor=(0, "left"), icon="sound", size=27,
                     rot=-6),
                dict(t="بلا مونتاج", anchor=(1, "right"), icon="spark", size=27,
                     rot=6)]),
    dict(kicker="واش تدير:",
         lines=[[("انسخ", "b", None), ("النص،", "r", None)],
                [("اختار", "r", None), ("الصوت،", "b", "mark")],
                [("نزّل", "r", None), ("الملف.", "b", None)]],
         pills=[dict(t="30 صوت", anchor=(0, "right"), icon="sound", size=27),
                dict(t="دارجة جزايرية", anchor=(1, "left"), icon="target",
                     size=24, rot=5)]),
    dict(kicker="السوم:",
         lines=[[("20", "b", "mark"), ("نقطة", "r", None)],
                [("للصوت", "b", None), ("الواحد،", "r", None)],
                [("يعني", "r", None), ("100 دج", "b", None)]],
         pills=[dict(t="500 دج = 5 أصوات", anchor=(1, "left"), icon="spark",
                     size=23, rot=-5)]),
    dict(kicker="ابدا درك:",
         lines=[[("50", "b", "mark"), ("نقطة", "r", None)],
                [("مجانية", "b", None), ("كي", "r", None)],
                [("تسجّل.", "b", None)]],
         pills=[dict(t="بلا اشتراك", anchor=(0, "right"), icon="target",
                     size=26, rot=6),
                dict(t="sawtify.space", anchor=(2, "left"), icon="spark",
                     size=24, rot=-5, font="lat")]),
]}

FR = {"id": "fr", "seed": 23, "fonts": WEIGHT_LAT, "pill_font": SG_B,
      "rtl": False, "size": 88, "slides": [
    dict(kicker="Le problème :",
         lines=[[("Une", "r", None), ("vidéo", "r", None)],
                [("sans", "r", None), ("son,", "b", "mark")],
                [("n’arrête", "b", None)],
                [("personne.", "r", None)]],
         pills=[dict(t="3 secondes", anchor=(1, "right"), icon="target",
                     size=24),
                dict(t="le client passe", anchor=(2, "left"), icon="sound",
                     size=22, rot=5)]),
    dict(kicker="La solution :",
         lines=[[("Une", "r", None), ("voix", "b", None)],
                [("studio,", "r", None), ("en", "r", None)],
                [("darija,", "b", "mark")],
                [("en 30 s.", "b", None)]],
         pills=[dict(t="sans micro", anchor=(0, "left"), icon="sound",
                     size=23, rot=-6),
                dict(t="sans montage", anchor=(2, "right"), icon="spark",
                     size=23, rot=6)]),
    dict(kicker="Quoi faire :",
         lines=[[("Copiez", "b", None), ("le", "r", None)],
                [("texte,", "r", None), ("choisissez", "r", None)],
                [("la", "b", None), ("voix,", "b", "mark")],
                [("téléchargez.", "r", None)]],
         pills=[dict(t="30 voix", anchor=(0, "right"), icon="sound", size=24),
                dict(t="darija DZ", anchor=(2, "left"), icon="target",
                     size=23, rot=5)]),
    dict(kicker="Le prix :",
         lines=[[("20", "b", "mark"), ("points", "r", None)],
                [("=", "r", None), ("une", "b", None), ("voix,", "b", None)],
                [("environ", "r", None), ("100 DA.", "b", None)]],
         pills=[dict(t="500 DA = 5 voix", anchor=(1, "left"), icon="spark",
                     size=21, rot=-5)]),
    dict(kicker="Commencez :",
         lines=[[("50", "b", "mark"), ("points", "r", None)],
                [("offerts", "b", None), ("dès", "r", None)],
                [("l’inscription.", "b", None)]],
         pills=[dict(t="sans abonnement", anchor=(0, "right"), icon="target",
                     size=22, rot=6),
                dict(t="sawtify.space", anchor=(2, "left"), icon="spark",
                     size=22, rot=-5)]),
]}

PUBS = [DZ, FR]


def render(pub):
    d = OUT / pub["id"]
    d.mkdir(parents=True, exist_ok=True)
    fonts = pub.get("fonts") or WEIGHT
    rtl = pub.get("rtl", True)
    # une seule taille de titre pour tout le carrousel : c'est ce qui fait
    # la cohérence d'une slide à l'autre
    shared = min(fit_size(sp, fonts, rtl) for sp in pub["slides"])
    print("  · taille de titre partagée :", shared, "px")
    for i, spec in enumerate(pub["slides"]):
        img = slide(spec, seed=pub["seed"] + i, rtl=rtl, fonts=pub.get("fonts"),
                    page=f"{i + 1:02d} / 05", pill_font=pub.get("pill_font"),
                    size_default=pub.get("size", 96),
                    shared_size=shared).convert("RGB").resize(
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
