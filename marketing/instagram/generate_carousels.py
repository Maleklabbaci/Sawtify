#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════
 Sawtify — générateur de carrousels Instagram
───────────────────────────────────────────────────────────────────────────
 Slides 1080×1350 (format 4:5) dans la charte du projet : noir profond,
 violet #A855F7, Space Grotesk (latin) + Cairo (darija) — mêmes stacks
 typographiques que la landing page.

 Usage :
   python3 generate_carousels.py                  # tous les carrousels
   python3 generate_carousels.py --only 1         # un seul
   python3 generate_carousels.py --only 1 --slides 1,2,6

 Sortie :
   slides/<slug>/01.png … 06.png + contact-sheet.png
═══════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import argparse
import math
import re
import sys
from pathlib import Path
from typing import List, Sequence, Tuple

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
except ImportError:  # pragma: no cover
    sys.exit("Pillow manquant : pip install --break-system-packages pillow")

try:
    import arabic_reshaper
    from bidi.algorithm import get_display
except ImportError:  # pragma: no cover
    arabic_reshaper = None
    get_display = None

ROOT = Path(__file__).resolve().parent
FONT_DIR = ROOT / "fonts"
OUT_DIR = ROOT / "slides"

# ── Charte Sawtify ────────────────────────────────────────────────────────
PURPLE = (168, 85, 247)
PURPLE_LIGHT = (203, 158, 254)
PURPLE_DEEP = (109, 40, 217)
FUCHSIA = (217, 70, 239)
CREAM = (250, 246, 238)
WHITE = (255, 255, 255)
ZINC_400 = (166, 166, 178)
ZINC_500 = (124, 124, 138)
AMBER = (233, 161, 59)
PINK = (244, 114, 182)

W, H = 1080, 1350
SS = 2
CW, CH = W * SS, H * SS
M = 84

LATIN_BOLD = "SpaceGrotesk-Bold.ttf"
LATIN_MED = "SpaceGrotesk-Medium.ttf"
LATIN_REG = "SpaceGrotesk-Regular.ttf"
AR_BOLD = "IBMPlexSansArabic-Bold.ttf"
AR_SEMI = "IBMPlexSansArabic-SemiBold.ttf"
AR_REG = "IBMPlexSansArabic-Regular.ttf"

_font_cache: dict = {}


def font(name: str, size: int) -> "ImageFont.FreeTypeFont":
    key = (name, max(4, int(round(size))))
    if key not in _font_cache:
        _font_cache[key] = ImageFont.truetype(str(FONT_DIR / name), max(4, int(round(size * SS))))
    return _font_cache[key]


ARABIC_RE = re.compile(r"[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]")


def shape_ar(word: str) -> str:
    if not ARABIC_RE.search(word) or arabic_reshaper is None:
        return word
    return get_display(arabic_reshaper.reshape(word))


# ── Fond ──────────────────────────────────────────────────────────────────
def gradient(size: Tuple[int, int], top, bottom) -> Image.Image:
    w, h = size
    strip = Image.new("RGB", (1, h))
    px = strip.load()
    for y in range(h):
        t = y / max(1, h - 1)
        px[0, y] = (
            int(top[0] + (bottom[0] - top[0]) * t),
            int(top[1] + (bottom[1] - top[1]) * t),
            int(top[2] + (bottom[2] - top[2]) * t),
        )
    return strip.resize((w, h), Image.BILINEAR)


def glow(base: Image.Image, cx: float, cy: float, radius: float, color, alpha: int = 90):
    r = int(radius * SS)
    layer = Image.new("RGBA", (r * 2, r * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    steps = 22
    for i in range(steps, 0, -1):
        t = i / steps
        rad = r * t
        a = int(alpha * (1 - t) ** 2.4)
        d.ellipse([r - rad, r - rad, r + rad, r + rad], fill=(*color, a))
    layer = layer.filter(ImageFilter.GaussianBlur(r * 0.12))
    base.alpha_composite(layer, (int(cx * SS - r), int(cy * SS - r)))


def background() -> Image.Image:
    img = gradient((CW, CH), (16, 11, 27), (4, 3, 8)).convert("RGBA")
    glow(img, CW * 0.98, CH * 0.02, 700 * SS, PURPLE, 120)
    glow(img, CW * 0.02, CH * 0.62, 520 * SS, PURPLE_DEEP, 95)
    glow(img, CW * 0.55, CH * 1.02, 620 * SS, FUCHSIA, 55)

    grid = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grid)
    step = 66 * SS
    for x in range(0, CW, step):
        gd.line([(x, 0), (x, CH)], fill=(255, 255, 255, 9), width=SS)
    for y in range(0, CH, step):
        gd.line([(0, y), (CW, y)], fill=(255, 255, 255, 9), width=SS)
    mask = Image.new("L", (CW, CH), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse([CW * 0.34, CH * 0.10, CW * 1.05, CH * 0.85], fill=120)
    md.ellipse([-CW * 0.15, CH * 0.55, CW * 0.55, CH * 1.05], fill=70)
    mask = mask.filter(ImageFilter.GaussianBlur(120 * SS))
    img.alpha_composite(Image.composite(grid, Image.new("RGBA", (CW, CH), (0, 0, 0, 0)), mask))

    noise = Image.effect_noise((CW // 2, CH // 2), 16).convert("L").resize((CW, CH), Image.BILINEAR)
    grain = Image.new("RGBA", (CW, CH), (255, 255, 255, 255))
    grain.putalpha(noise.point(lambda v: int(v * 0.16)))
    img.alpha_composite(grain)

    vig = Image.new("L", (CW, CH), 0)
    ImageDraw.Draw(vig).ellipse([-CW * 0.22, -CH * 0.20, CW * 1.22, CH * 1.20], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(170 * SS))
    dark = Image.new("RGBA", (CW, CH), (0, 0, 0, 255))
    dark.putalpha(vig.point(lambda v: int(120 * (1 - v / 255.0))))
    img.alpha_composite(dark)
    return img


# ── Primitives (dessinées sur un calque, composées à la fin) ───────────────
def rrect(base, box, radius, fill=None, outline=None, width=1.0):
    d = ImageDraw.Draw(base)
    d.rounded_rectangle(
        [box[0] * SS, box[1] * SS, box[2] * SS, box[3] * SS],
        radius=radius * SS, fill=fill, outline=outline, width=max(1, int(width * SS)),
    )


def dot(base, cx, cy, r, color):
    d = ImageDraw.Draw(base)
    d.ellipse([(cx - r) * SS, (cy - r) * SS, (cx + r) * SS, (cy + r) * SS], fill=color)


def sparkle(base, cx, cy, r, color=PURPLE_LIGHT):
    d = ImageDraw.Draw(base)
    pts = []
    for i in range(8):
        ang = math.pi / 4 * i - math.pi / 2
        rad = r if i % 2 == 0 else r * 0.30
        pts.append(((cx + math.cos(ang) * rad) * SS, (cy + math.sin(ang) * rad) * SS))
    d.polygon(pts, fill=color)


def arrow_right(base, x, y, size=24, color=WHITE, thickness=3.0):
    d = ImageDraw.Draw(base)
    s = size * SS
    x, y = x * SS, y * SS
    d.line([(x, y), (x + s, y)], fill=color, width=int(thickness * SS))
    d.line([(x + s * 0.58, y - s * 0.34), (x + s, y)], fill=color, width=int(thickness * SS))
    d.line([(x + s * 0.58, y + s * 0.34), (x + s, y)], fill=color, width=int(thickness * SS))


def card(base, x, y, w, h, radius=26, accent=False, tint=0.045):
    fill = (168, 85, 247, 26) if accent else (255, 255, 255, int(255 * tint))
    rrect(base, (x, y, x + w, y + h), radius, fill=fill,
          outline=(168, 85, 247, 120) if accent else (255, 255, 255, 40), width=1.3)


def logo_mark(base, x, y, s=46):
    grad = gradient((int(s * SS), int(s * SS)), PURPLE_DEEP, FUCHSIA)
    mask = Image.new("L", grad.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, grad.size[0] - 1, grad.size[1] - 1],
                                          radius=int(s * SS * 0.30), fill=255)
    base.paste(grad, (int(x * SS), int(y * SS)), mask)
    ImageDraw.Draw(base).text(((x + s / 2) * SS, (y + s / 2) * SS + 0.5 * SS), "S",
                              font=font(LATIN_BOLD, s * 0.60), fill=WHITE, anchor="mm")


def header(base, index: int, total: int):
    logo_mark(base, M, M - 6, 46)
    d = ImageDraw.Draw(base)
    f = font(LATIN_BOLD, 27)
    d.text(((M + 58) * SS, (M + 16) * SS), "sawtify", font=f, fill=CREAM, anchor="lm")
    lw = f.getlength("sawtify") / SS
    dot(base, M + 58 + lw + 12, M + 27, 4.5, PURPLE_LIGHT)

    txt = f"{index:02d} / {total:02d}"
    f2 = font(LATIN_MED, 19)
    w = f2.getlength(txt) / SS + 36
    rrect(base, (W - M - w, M, W - M, M + 42), 21, fill=(255, 255, 255, 14),
          outline=(255, 255, 255, 38), width=1)
    d.text(((W - M - w / 2) * SS, (M + 22) * SS), txt, font=f2, fill=(214, 214, 224), anchor="mm")


def footer(base, index: int, total: int, hint: str | None = "Fais défiler"):
    y = H - M - 26
    dw, gap = 8, 12
    total_w = total * dw + (total - 1) * gap
    x0 = (W - total_w) / 2
    for i in range(total):
        cx = x0 + i * (dw + gap) + dw / 2
        if i == index - 1:
            rrect(base, (cx - 14, y - 3, cx + 14, y + 3), 3, fill=PURPLE)
        else:
            dot(base, cx, y, 3, (92, 92, 106))
    if hint:
        d = ImageDraw.Draw(base)
        f = font(LATIN_MED, 18)
        d.text(((W - M) * SS, y * SS), hint + " →", font=f, fill=ZINC_500, anchor="rm")


def chip(base, x, y, label, accent=PURPLE_LIGHT, size=18, dot_color=None):
    d = ImageDraw.Draw(base)
    f = font(LATIN_MED, size)
    tw = f.getlength(label) / SS
    pad, h = 20, 42
    w = tw + pad * 2 + 20
    rrect(base, (x, y, x + w, y + h), h / 2, fill=(168, 85, 247, 30),
          outline=(168, 85, 247, 95), width=1.1)
    dot(base, x + pad + 4, y + h / 2, 4, dot_color or accent)
    d.text(((x + pad + 18) * SS, (y + h / 2 + 1) * SS), label, font=f, fill=accent, anchor="lm")
    return w


# ── Texte riche ───────────────────────────────────────────────────────────
Token = Tuple[str, bool, bool]
PUNCT_START = re.compile(r"^[,;:.!?»\)\]…—–-]")


def tokenize(text: str) -> List[Token]:
    tokens: List[Token] = []
    for chunk in re.split(r"(\*\*.*?\*\*)", text):
        if not chunk.strip():
            continue
        hi = chunk.startswith("**") and chunk.endswith("**") and len(chunk) > 4
        clean = chunk[2:-2] if hi else chunk
        words = clean.split()
        for k, word in enumerate(words):
            is_ar = bool(ARABIC_RE.search(word))
            if tokens and not hi and k == 0 and PUNCT_START.match(word):
                prev, phi, par = tokens[-1]
                tokens[-1] = (prev + word, phi, par)
            else:
                tokens.append((word, hi, is_ar))
    return tokens


def _layout(tokens, f_lat, f_ar, max_w):
    lines, cur, cur_w = [], [], 0.0
    space_l = f_lat.getlength(" ")
    space_a = f_ar.getlength(" ")
    for word, hi, is_ar in tokens:
        f = f_ar if is_ar else f_lat
        shown = shape_ar(word)
        w = f.getlength(shown)
        sp = space_a if is_ar else space_l
        if cur and cur_w + sp + w > max_w:
            lines.append(cur)
            cur, cur_w = [], 0.0
        if cur:
            cur_w += sp
        cur.append((shown, w, hi, is_ar))
        cur_w += w
    if cur:
        lines.append(cur)
    return lines


def rich(base, text_tokens: Sequence[Token], x, y, max_w, size, latin=LATIN_BOLD,
         arabic=AR_BOLD, color=CREAM, hi_color=PURPLE_LIGHT, leading=1.12,
         align="left", rtl=False) -> int:
    """Dessine un bloc de texte enrichi, renvoie le y de fin (px finaux)."""
    d = ImageDraw.Draw(base)
    f_lat = font(latin, size)
    f_ar = font(arabic, size * 1.04)
    lines = _layout(text_tokens, f_lat, f_ar, max_w * SS)
    line_h = size * leading
    space_l = f_lat.getlength(" ") / SS
    space_a = f_ar.getlength(" ") / SS
    cy = y
    for line in lines:
        seq = list(reversed(line)) if rtl else line
        width = sum(w for _, w, _, _ in line)
        n_gaps = max(0, len(line) - 1)
        width += n_gaps * (space_a if rtl else space_l)
        width /= SS
        if align == "center":
            cx = x + (max_w - width) / 2
        elif align == "right":
            cx = x + max_w - width
        else:
            cx = x
        for i, (word, w, hi, is_ar) in enumerate(seq):
            f = f_ar if is_ar else f_lat
            d.text((cx * SS, cy * SS), word, font=f, fill=(hi_color if hi else color))
            cx += w / SS
            if i < len(seq) - 1:
                cx += space_a if is_ar else space_l
        cy += line_h
    return cy - line_h + size * 1.12


# marques de contrôle bidi / largeur nulle : Cairo ne les dessine pas -> "carrés"
_BIDI_JUNK = re.compile(r"[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]")


def _ar_visual(line: str) -> str:
    """Formes de présentation + ordre visuel, appliqués UNE seule fois à la ligne entière."""
    if arabic_reshaper is None:
        return line
    return _BIDI_JUNK.sub("", get_display(arabic_reshaper.reshape(line)))


def ar_line(base, x, y, text, size=30, color=(240, 232, 250), max_w=None, bold=True,
            leading=1.55, align="left"):
    """Bloc arabe (darija) : retour à la ligne en ordre logique, dessin en ordre visuel."""
    f = font(AR_BOLD if bold else AR_REG, size)
    max_w = max_w or (W - 2 * M)
    words = text.split()
    lines, cur = [], ""
    for w in words:
        cand = (cur + " " + w).strip()
        if cur and f.getlength(_ar_visual(cand)) / SS > max_w:
            lines.append(cur)
            cur = w
        else:
            cur = cand
    if cur:
        lines.append(cur)

    d = ImageDraw.Draw(base)
    cy = y
    for line in lines:
        shown = _ar_visual(line)
        if align == "center":
            d.text(((x + max_w / 2) * SS, cy * SS), shown, font=f, fill=color, anchor="ma")
        elif align == "right":
            d.text(((x + max_w) * SS, cy * SS), shown, font=f, fill=color, anchor="ra")
        else:
            d.text((x * SS, cy * SS), shown, font=f, fill=color, anchor="la")
        cy += size * leading
    # bas réel du bloc : derniere ligne + ascendant/descendant réels de la police
    ascent, descent = f.getmetrics()
    return y + (len(lines) - 1) * size * leading + (ascent + descent) / SS


# ── Éléments visuels ──────────────────────────────────────────────────────
def waveform(base, x, y, w, h, bars=44, color1=PURPLE, color2=FUCHSIA, seed=7):
    d = ImageDraw.Draw(base)
    rnd = (seed * 9301 + 49297) % 233280
    vals = []
    for i in range(bars):
        rnd = (rnd * 9301 + 49297) % 233280
        t = i / max(1, bars - 1)
        env = math.sin(math.pi * t) ** 0.55
        vals.append(max(0.10, env * (0.35 + 0.65 * (rnd / 233280))))
    bw = w / (bars * 1.62)
    gap = bw * 0.62
    for i, v in enumerate(vals):
        bx = x + i * (bw + gap)
        bh = h * v
        t = i / max(1, bars - 1)
        col = (
            int(color1[0] + (color2[0] - color1[0]) * t),
            int(color1[1] + (color2[1] - color1[1]) * t),
            int(color1[2] + (color2[2] - color1[2]) * t),
            235,
        )
        d.rounded_rectangle([bx * SS, (y + (h - bh) / 2) * SS, (bx + bw) * SS, (y + (h + bh) / 2) * SS],
                            radius=(bw * SS) / 2, fill=col)


def play_badge(base, cx, cy, r=34):
    dot(base, cx, cy, r, (168, 85, 247, 60))
    ring = ImageDraw.Draw(base)
    ring.ellipse([(cx - r) * SS, (cy - r) * SS, (cx + r) * SS, (cy + r) * SS],
                 fill=None, outline=(203, 158, 254, 210), width=int(1.6 * SS))
    d = ImageDraw.Draw(base)
    s = r * 0.52
    d.polygon([((cx - s * 0.55 + 2) * SS, (cy - s) * SS),
               ((cx - s * 0.55 + 2) * SS, (cy + s) * SS),
               ((cx + s * 0.95 + 2) * SS, cy * SS)], fill=CREAM)


def player_mock(base, x, y, w, title="Nahla", meta="darija DZ  ·  00:12  ·  qualité studio", h=150):
    card(base, x, y, w, h, radius=30, tint=0.055)
    play_badge(base, x + 74, y + h / 2, 33)
    d = ImageDraw.Draw(base)
    d.text(((x + 128) * SS, (y + 44) * SS), title, font=font(LATIN_BOLD, 26), fill=CREAM, anchor="lm")
    d.text(((x + 128) * SS, (y + 76) * SS), meta, font=font(LATIN_REG, 19), fill=ZINC_400, anchor="lm")
    waveform(base, x + 128, y + 96, w - 172, 28, bars=46)


def use_case_icon(base, cx, cy, kind):
    """Petites icônes dessinées (boutique, téléphone, mégaphone, casque)."""
    d = ImageDraw.Draw(base)
    c = PURPLE_LIGHT
    if kind == "shop":
        d.line([(cx - 11) * SS, (cy - 2) * SS, (cx + 11) * SS, (cy - 2) * SS], fill=c, width=int(2.2 * SS))
        d.polygon([((cx - 11) * SS, (cy - 2) * SS), ((cx + 11) * SS, (cy - 2) * SS),
                   ((cx + 8) * SS, cy * SS + 3 * SS), ((cx - 8) * SS, cy * SS + 3 * SS)], fill=None,
                  outline=c, width=int(1.8 * SS))
        d.rectangle([(cx - 8) * SS, (cy + 2) * SS, (cx + 8) * SS, (cy + 11) * SS], outline=c, width=int(1.8 * SS))
    elif kind == "phone":
        d.rounded_rectangle([(cx - 7) * SS, (cy - 12) * SS, (cx + 7) * SS, (cy + 12) * SS],
                            radius=3 * SS, outline=c, width=int(1.9 * SS))
        dot(base, cx, cy + 8, 1.8, c)
    elif kind == "megaphone":
        d.polygon([((cx - 12) * SS, (cy - 4) * SS), ((cx + 4) * SS, (cy - 10) * SS),
                   ((cx + 4) * SS, (cy + 10) * SS), ((cx - 12) * SS, (cy + 4) * SS)],
                  fill=None, outline=c, width=int(1.9 * SS))
        d.line([((cx + 4) * SS, (cy - 10) * SS), ((cx + 11) * SS, (cy - 6) * SS)], fill=c, width=int(1.9 * SS))
        d.line([((cx + 4) * SS, (cy + 10) * SS), ((cx + 11) * SS, (cy + 6) * SS)], fill=c, width=int(1.9 * SS))
    else:  # headphones
        d.arc([(cx - 12) * SS, (cy - 12) * SS, (cx + 12) * SS, (cy + 12) * SS], start=190, end=350,
              fill=c, width=int(2.2 * SS))
        d.rounded_rectangle([(cx - 13) * SS, (cy - 1) * SS, (cx - 7) * SS, (cy + 9) * SS],
                            radius=2 * SS, fill=c)
        d.rounded_rectangle([(cx + 7) * SS, (cy - 1) * SS, (cx + 13) * SS, (cy + 9) * SS],
                            radius=2 * SS, fill=c)


def cta_button(base, x, y, label, w=420, h=84):
    grad = gradient((int(w * SS), int(h * SS)), (147, 51, 234), (217, 70, 239)).convert("RGBA")
    mask = Image.new("L", grad.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, grad.size[0] - 1, grad.size[1] - 1],
                                          radius=int(h * SS / 2), fill=255)
    base.paste(grad, (int(x * SS), int(y * SS)), mask)
    d = ImageDraw.Draw(base)
    d.text(((x + 46) * SS, (y + h / 2 + 1) * SS), label, font=font(LATIN_BOLD, 29), fill=(24, 9, 38), anchor="lm")
    arrow_right(base, x + w - 62, y + h / 2 - 1, 22, (24, 9, 38), 3.2)


def ghost_number(base, text, x, y, size=300):
    ImageDraw.Draw(base).text((x * SS, y * SS), text, font=font(LATIN_BOLD, size),
                              fill=(255, 255, 255, 10), anchor="mm")


# ── Slides ────────────────────────────────────────────────────────────────
def slide_cover(base, s, i, n):
    chip(base, M, 250, s["chip"])
    y = rich(base, tokenize(s["title"]), M, 316, W - 2 * M, 94, leading=1.03,
             hi_color=PURPLE_LIGHT) + 30
    y = rich(base, tokenize(s["sub"]), M, y, W - 2 * M - 30, 31, LATIN_REG, AR_REG,
             color=(178, 178, 192), leading=1.5, hi_color=PURPLE_LIGHT) + 46
    player_mock(base, M, y, W - 2 * M, title=s.get("player_title", "Nahla"),
                meta=s.get("player_meta", "darija DZ  ·  00:12  ·  qualité studio"), h=152)
    ay = y + 152 + 44
    rrect(base, (M, ay, M + 64, ay + 3), 2, fill=PURPLE)
    ar_line(base, M, ay + 26, s["ar"], size=33, max_w=W - 2 * M)

    d = ImageDraw.Draw(base)
    d.text((M * SS, (H - M - 84) * SS), s.get("kicker", "sawtify.space"), font=font(LATIN_MED, 19),
           fill=ZINC_500, anchor="lm")


def slide_problem(base, s, i, n):
    ghost_number(base, "01", W - 190, 232, 210)
    chip(base, M, 246, s["chip"], accent=(250, 180, 210), dot_color=PINK)
    y = rich(base, tokenize(s["title"]), M, 312, W - 2 * M, 72, leading=1.08,
             hi_color=(250, 180, 210)) + 44
    for k, item in enumerate(s["items"]):
        cy = y + k * 150
        card(base, M, cy, W - 2 * M, 130, radius=24, tint=0.05)
        cx_, cy_ = M + 58, cy + 65
        d = ImageDraw.Draw(base)
        d.ellipse([(cx_ - 24) * SS, (cy_ - 24) * SS, (cx_ + 24) * SS, (cy_ + 24) * SS],
                  fill=(244, 114, 182, 34), outline=(244, 114, 182, 110), width=int(1.5 * SS))
        for ang in (45, -45):
            a = math.radians(ang)
            d.line([((cx_ - math.cos(a) * 9) * SS, (cy_ - math.sin(a) * 9) * SS),
                    ((cx_ + math.cos(a) * 9) * SS, (cy_ + math.sin(a) * 9) * SS)],
                   fill=(250, 180, 210), width=int(2.8 * SS))
        d.text(((M + 102) * SS, (cy + 50) * SS), item["k"], font=font(LATIN_BOLD, 31), fill=WHITE, anchor="lm")
        d.text(((M + 102) * SS, (cy + 90) * SS), item["v"], font=font(LATIN_REG, 22), fill=ZINC_400, anchor="lm")
    ar_line(base, M, y + 3 * 150 + 12, s["ar"], size=30, color=(240, 214, 226))


def slide_solution(base, s, i, n):
    chip(base, M, 246, s["chip"])
    y = rich(base, tokenize(s["title"]), M, 312, W - 2 * M, 80, leading=1.05) + 28
    y = rich(base, tokenize(s["sub"]), M, y, W - 2 * M - 20, 30, LATIN_REG, AR_REG,
             color=(178, 178, 192), leading=1.5) + 44
    for k, label in enumerate(s["bullets"]):
        cy = y + k * 102
        card(base, M, cy, W - 2 * M, 84, radius=20, tint=0.05)
        sparkle(base, M + 44, cy + 42, 13, PURPLE_LIGHT)
        ImageDraw.Draw(base).text(((M + 80) * SS, (cy + 43) * SS), label,
                                  font=font(LATIN_MED, 26), fill=CREAM, anchor="lm")
    ar_line(base, M, y + 3 * 102 + 18, s["ar"], size=31)


def slide_steps(base, s, i, n):
    chip(base, M, 240, s["chip"])
    y = rich(base, tokenize(s["title"]), M, 302, W - 2 * M, 76, leading=1.06) + 46
    for k, step in enumerate(s["steps"]):
        cy = y + k * 184
        card(base, M, cy, W - 2 * M, 158, radius=26, accent=(k == 0))
        d = ImageDraw.Draw(base)
        d.text(((M + 42) * SS, (cy + 62) * SS), f"0{k+1}", font=font(LATIN_BOLD, 44),
               fill=PURPLE_LIGHT, anchor="lm")
        d.text(((M + 124) * SS, (cy + 54) * SS), step["t"], font=font(LATIN_BOLD, 30), fill=WHITE, anchor="lm")
        d.text(((M + 124) * SS, (cy + 100) * SS), step["d"], font=font(LATIN_REG, 22), fill=ZINC_400, anchor="lm")
        if k < len(s["steps"]) - 1:
            d.line([((M + 56) * SS, (cy + 160) * SS), ((M + 56) * SS, (cy + 184) * SS)],
                   fill=(168, 85, 247, 90), width=int(2 * SS))
    ar_line(base, M, y + 3 * 184 + 4, s["ar"], size=30)


def slide_usecases(base, s, i, n):
    chip(base, M, 240, s["chip"])
    y = rich(base, tokenize(s["title"]), M, 302, W - 2 * M, 68, leading=1.07) + 40
    cols, gap = 2, 18
    cw = (W - 2 * M - gap) / cols
    icons = ["shop", "phone", "megaphone", "headphones"]
    for k, item in enumerate(s["items"]):
        cx = M + (k % cols) * (cw + gap)
        cy = y + (k // cols) * 158
        card(base, cx, cy, cw, 140, radius=24, tint=0.05)
        use_case_icon(base, cx + 40, cy + 44, icons[k % 4])
        d = ImageDraw.Draw(base)
        d.text(((cx + 26) * SS, (cy + 84) * SS), item["t"], font=font(LATIN_BOLD, 26), fill=CREAM, anchor="lm")
        d.text(((cx + 26) * SS, (cy + 116) * SS), item["d"], font=font(LATIN_REG, 19), fill=ZINC_400, anchor="lm")
    qy = y + 2 * 158 + 16
    card(base, M, qy, W - 2 * M, 172, radius=26, accent=True)
    ImageDraw.Draw(base).text(((M + 30) * SS, (qy + 42) * SS), "«", font=font(AR_BOLD, 44),
                              fill=PURPLE_LIGHT, anchor="lm")
    ar_line(base, M + 76, qy + 34, s["quote"], size=30, max_w=W - 2 * M - 130)
    d = ImageDraw.Draw(base)
    d.text(((W - M - 26) * SS, (qy + 138) * SS), s["quote_by"], font=font(LATIN_REG, 18),
           fill=(200, 200, 212), anchor="rm")


def slide_stats(base, s, i, n):
    chip(base, M, 240, s["chip"], accent=(252, 211, 120), dot_color=AMBER)
    y = rich(base, tokenize(s["title"]), M, 302, W - 2 * M, 70, leading=1.07,
             hi_color=(252, 211, 120)) + 42
    for k, item in enumerate(s["stats"]):
        cy = y + k * 128
        card(base, M, cy, W - 2 * M, 112, radius=22, tint=0.05)
        d = ImageDraw.Draw(base)
        d.text(((M + 30) * SS, (cy + 44) * SS), item["v"], font=font(LATIN_BOLD, 38),
               fill=(252, 211, 120), anchor="lm")
        d.text(((M + 30) * SS, (cy + 80) * SS), item["k"], font=font(LATIN_REG, 20), fill=ZINC_400, anchor="lm")
        d.text(((W - M - 30) * SS, (cy + 60) * SS), item["d"], font=font(LATIN_REG, 19),
               fill=PURPLE_LIGHT, anchor="rm")
    ar_line(base, M, y + 3 * 128 + 12, s["ar"], size=29)


def slide_pricing(base, s, i, n):
    chip(base, M, 236, s["chip"], accent=(252, 211, 120), dot_color=AMBER)
    y = rich(base, tokenize(s["title"]), M, 300, W - 2 * M, 68, leading=1.06,
             hi_color=(252, 211, 120)) + 34
    for k, pack in enumerate(s["packs"]):
        cy = y + k * 118
        hot = pack.get("hot")
        card(base, M, cy, W - 2 * M, 100, radius=22, accent=hot)
        d = ImageDraw.Draw(base)
        d.text(((M + 30) * SS, (cy + 44) * SS), pack["name"], font=font(LATIN_BOLD, 27), fill=CREAM, anchor="lm")
        d.text(((M + 30) * SS, (cy + 76) * SS), pack["note"], font=font(LATIN_REG, 18), fill=ZINC_400, anchor="lm")
        d.text(((W - M - 30) * SS, (cy + 50) * SS), pack["price"], font=font(LATIN_BOLD, 32),
               fill=(252, 211, 120) if hot else PURPLE_LIGHT, anchor="rm")
        if hot:
            t = "POPULAIRE"
            f = font(LATIN_BOLD, 15)
            w = f.getlength(t) / SS + 22
            rrect(base, (W - M - 96 - w, cy - 12, W - M - 96, cy + 12), 12, fill=(233, 161, 59, 240))
            d.text(((W - M - 96 - w / 2) * SS, (cy + 1) * SS), t, font=f, fill=(38, 20, 4), anchor="mm")
    ar_line(base, M, y + 3 * 118 + 8, s["ar"], size=27)


def slide_cta(base, s, i, n):
    """Dernière slide : composition centrée, très lisible, un seul CTA."""
    sparkle(base, W - M - 34, 300, 22, PURPLE_LIGHT)
    sparkle(base, W - M - 96, 356, 11, (203, 158, 254, 210))
    sparkle(base, W - M - 40, 392, 7, (255, 255, 255, 140))
    sparkle(base, M + 34, 340, 13, (203, 158, 254, 150))

    f = font(LATIN_MED, 18)
    cw = f.getlength(s["chip"]) / SS + 60
    chip(base, (W - cw) / 2, 268, s["chip"])

    y = rich(base, tokenize(s["title"]), M, 340, W - 2 * M, 82, leading=1.06,
             align="center") + 26
    y = rich(base, tokenize(s["sub"]), M + 40, y, W - 2 * M - 80, 29, LATIN_REG, AR_REG,
             color=(180, 180, 194), leading=1.5, align="center") + 52

    bw = 430
    cta_button(base, (W - bw) / 2, y, s["cta"], w=bw, h=86)
    ImageDraw.Draw(base).text((W / 2 * SS, (y + 118) * SS), s["cta_note"],
                              font=font(LATIN_REG, 20), fill=ZINC_400, anchor="mm")

    by = y + 168
    scratch = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ar_bottom = ar_line(scratch, M + 34, 0, s["ar"], size=34, max_w=W - 2 * M - 68, align="center")
    note_y = ar_bottom + 48
    bh = int(note_y + 44)
    card(base, M, by, W - 2 * M, bh, radius=28, accent=True)
    ar_line(base, M + 34, by + 30, s["ar"], size=34, max_w=W - 2 * M - 68, align="center")
    ImageDraw.Draw(base).text((W / 2 * SS, (by + note_y) * SS), s["ar_note"],
                              font=font(LATIN_REG, 19), fill=(206, 206, 220), anchor="mm")


RENDERERS = {
    "cover": slide_cover,
    "problem": slide_problem,
    "solution": slide_solution,
    "steps": slide_steps,
    "usecases": slide_usecases,
    "stats": slide_stats,
    "pricing": slide_pricing,
    "cta": slide_cta,
}


# ── Contenus ──────────────────────────────────────────────────────────────
CARROUSELS = [
    {
        "slug": "01-cest-quoi-sawtify",
        "name": "Carrousel 1 — C'est quoi Sawtify ?",
        "caption": (
            "Ta vidéo mérite une vraie voix. 🎙️\n\n"
            "Sawtify transforme ton texte en voix-off darija qualité studio, en 30 secondes — "
            "sans micro, sans studio, sans attendre 3 jours.\n\n"
            "👉 Crée ton compte sur sawtify.space et reçois 50 points offerts.\n\n"
            "#Sawtify #Darija #VoixOff #IAAlgerie #EcommerceDZ #TikTokDZ #CreateurDeContenu"
        ),
        "slides": [
            {
                "type": "cover",
                "chip": "IA  ·  DARIJA  ·  ALGÉRIE",
                "title": "Ta voix-off en **darija**, en 30 secondes.",
                "sub": "Le premier moteur IA qui parle une vraie darija algérienne — qualité studio, "
                       "sans micro, sans montage, sans studio.",
                "ar": "خلي المحتوى تاعك يهدر بالدارجة الحقيقية.",
                "kicker": "sawtify.space  ·  glisse pour voir comment →",
            },
            {
                "type": "problem",
                "chip": "LE PROBLÈME",
                "title": "Une voix-off, ça coûte cher et ça prend des jours.",
                "items": [
                    {"k": "1 500 – 3 000 DA", "v": "par enregistrement, à refaire à chaque vidéo"},
                    {"k": "48 à 72 heures", "v": "d'attente avant de pouvoir publier"},
                    {"k": "Tout est à refaire", "v": "dès que tu changes une phrase du script"},
                ],
                "ar": "النتيجة: تنشر أقل، وتخسر زبائن.",
            },
            {
                "type": "solution",
                "chip": "LA SOLUTION",
                "title": "Tu écris le texte. **Sawtify** parle.",
                "sub": "Colle ton script, choisis une voix : l'audio sort en qualité studio, avec "
                       "l'accent et les expressions de chez nous — pas l'arabe classique des autres apps.",
                "bullets": [
                    "30 voix hommes & femmes, disponibles en darija",
                    "Génération en moins de 30 secondes",
                    "Droits commerciaux inclus, sans frais cachés",
                ],
                "ar": "صوت استوديو، بلا ميكرو، بلا مونتاج.",
            },
            {
                "type": "steps",
                "chip": "COMMENT ÇA MARCHE",
                "title": "3 étapes, 30 secondes.",
                "steps": [
                    {"t": "Colle ton texte", "d": "Ton script, en darija, en français ou en arabe."},
                    {"t": "Choisis ta voix", "d": "Homme, femme, ton commercial ou posé."},
                    {"t": "Télécharge l'audio", "d": "Prêt pour TikTok, Reels ou Facebook Ads."},
                ],
                "ar": "انسخ. اختار صوت. نزّل.",
            },
            {
                "type": "usecases",
                "chip": "POUR QUI ?",
                "title": "Un seul outil, tous tes formats.",
                "items": [
                    {"t": "E-commerce", "d": "Pubs produits & promos"},
                    {"t": "TikTok / Reels", "d": "Voix-off de 15 à 60 s"},
                    {"t": "Facebook Ads", "d": "Spots qui convertissent"},
                    {"t": "Formation", "d": "Cours & podcasts"},
                ],
                "quote": "الناس يحسبوها بنت دزايرية تسجل فالميكرو!",
                "quote_by": "— Chaima B., créatrice de contenu",
            },
            {
                "type": "cta",
                "chip": "COMMENCE AUJOURD'HUI",
                "title": "50 points offerts à l'inscription.",
                "sub": "Teste gratuitement. Pas de carte bancaire, pas d'abonnement forcé — "
                       "tu recharges seulement quand tu es convaincu.",
                "cta": "sawtify.space",
                "cta_note": "packs dès 500 DA",
                "ar": "سجّل اليوم، وابدأ تنشر بالدارجة.",
                "ar_note": "Paiement Edahabia  ·  CIB  ·  SATIM",
            },
        ],
    },
]


# ── Rendu ─────────────────────────────────────────────────────────────────
def render(carousel, only_slides=None):
    out = OUT_DIR / carousel["slug"]
    out.mkdir(parents=True, exist_ok=True)
    slides = carousel["slides"]
    total = len(slides)
    paths = []
    for i, slide in enumerate(slides, start=1):
        if only_slides and i not in only_slides:
            continue
        img = background()
        layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        content = Image.new("RGBA", img.size, (0, 0, 0, 0))
        RENDERERS[slide["type"]](content, slide, i, total)
        # équilibrage vertical : le bloc de contenu est centré entre header et footer
        top_limit = 172
        bottom_limit = H - M - 54
        bbox = content.getbbox()
        if bbox:
            c_top, c_bottom = bbox[1] / SS, bbox[3] / SS
            h_content = c_bottom - c_top
            free = bottom_limit - top_limit
            shift = 0.0
            if h_content < free:
                shift = top_limit + (free - h_content) / 2 - c_top
            else:
                shift = max(top_limit - c_top, bottom_limit - c_bottom)
            content = content.transform(
                content.size, Image.AFFINE, (1, 0, 0, 0, 1, -shift * SS), resample=Image.BICUBIC
            )
        layer.alpha_composite(content)
        header(layer, i, total)
        footer(layer, i, total, hint=None if i == total else "Fais défiler")
        img.alpha_composite(layer)
        final = img.convert("RGB").resize((W, H), Image.LANCZOS)
        path = out / f"{i:02d}.png"
        final.save(path, optimize=True)
        paths.append(path)
        print(f"  ✓ {path.relative_to(ROOT)}")

    if paths:
        thumbs = [Image.open(p).resize((360, 450), Image.LANCZOS) for p in paths]
        cols = min(3, len(thumbs))
        rows = math.ceil(len(thumbs) / cols)
        sheet = Image.new("RGB", (cols * 360 + (cols + 1) * 16, rows * 450 + (rows + 1) * 16), (10, 8, 16))
        for k, t in enumerate(thumbs):
            sheet.paste(t, (16 + (k % cols) * (360 + 16), 16 + (k // cols) * (450 + 16)))
        sheet.save(out / "contact-sheet.png", optimize=True)
        print(f"  ✓ {(out / 'contact-sheet.png').relative_to(ROOT)}")


def main():
    ap = argparse.ArgumentParser(description="Génère les carrousels Instagram Sawtify")
    ap.add_argument("--only", default=None, help="slug ou numéro (ex: 1)")
    ap.add_argument("--slides", default=None, help="ex: 1,2,6")
    args = ap.parse_args()

    if not FONT_DIR.exists():
        sys.exit(f"Dossier de polices manquant : {FONT_DIR}")

    selection = CARROUSELS
    if args.only:
        sel = args.only.lower().strip()
        selection = [c for c in CARROUSELS if sel in c["slug"].lower() or c["slug"].lower().startswith(sel)]
        if not selection:
            sys.exit(f"Aucun carrousel ne correspond à « {args.only} »")

    only_slides = {int(x) for x in args.slides.split(",")} if args.slides else None

    for c in selection:
        print(f"\n▶ {c['name']}")
        render(c, only_slides)


if __name__ == "__main__":
    main()
