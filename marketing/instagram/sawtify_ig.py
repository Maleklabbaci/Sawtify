#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════
 sawtify_ig — boîte à outils de rendu pour les carrousels Instagram Sawtify
───────────────────────────────────────────────────────────────────────────
 • slides 1080×1350 (4:5), supersampling ×2
 • deux thèmes : "dark" (noir/violet du site) et "light" (crème/violet)
 • typographie : Space Grotesk (latin) + IBM Plex Sans Arabic (darija)
 • texte arabe correctement lié (arabic_reshaper) et ordonné (python-bidi)
 • mise en page RTL : paragraphes alignés à droite, blocs miroir
═══════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import math
import re
from pathlib import Path
from typing import List, Sequence, Tuple

from PIL import Image, ImageDraw, ImageFilter, ImageFont

try:
    import arabic_reshaper
    from bidi.algorithm import get_display
except ImportError:  # pragma: no cover
    arabic_reshaper = None
    get_display = None

ROOT = Path(__file__).resolve().parent
FONT_DIR = ROOT / "fonts"

W, H = 1080, 1350
SS = 2
CW, CH = W * SS, H * SS
M = 84


def set_canvas(w: int, h: int) -> None:
    """Change la taille du canevas (4:5, 1:1, 9:16…). Marge recalculée au prorata."""
    global W, H, CW, CH, M
    W, H = w, h
    CW, CH = W * SS, H * SS
    M = 84 if w >= 1000 else 60

LATIN_BOLD = "SpaceGrotesk-Bold.ttf"
LATIN_MED = "SpaceGrotesk-Medium.ttf"
LATIN_REG = "SpaceGrotesk-Regular.ttf"
AR_BOLD = "IBMPlexSansArabic-Bold.ttf"
AR_SEMI = "IBMPlexSansArabic-SemiBold.ttf"
AR_REG = "IBMPlexSansArabic-Regular.ttf"

# ── Thèmes ────────────────────────────────────────────────────────────────
THEMES = {
    "dark": {
        "bg_top": (16, 11, 27), "bg_bottom": (4, 3, 8),
        "glow_a": (168, 85, 247), "glow_b": (109, 40, 217), "glow_c": (217, 70, 239),
        "glow_alpha": (120, 95, 55),
        "text": (250, 246, 238), "white": (255, 255, 255),
        "muted": (166, 166, 178), "faint": (124, 124, 138),
        "primary": (168, 85, 247), "primary_deep": (109, 40, 217),
        "secondary": (217, 70, 239), "accent": (203, 158, 254),
        "amber": (233, 161, 59), "pink": (244, 114, 182),
        "card_fill": (255, 255, 255, 12), "card_line": (255, 255, 255, 40),
        "card_fill_accent": (168, 85, 247, 26), "card_line_accent": (168, 85, 247, 120),
        "grid": (255, 255, 255, 9), "grain": 0.16, "vignette": 120,
        "chip_fill": (168, 85, 247, 30), "chip_line": (168, 85, 247, 95),
        "chip_text": (203, 158, 254),
        "counter_fill": (255, 255, 255, 14), "counter_line": (255, 255, 255, 38),
        "counter_text": (214, 214, 224),
        "dot_off": (92, 92, 106),
        "cta_from": (147, 51, 234), "cta_to": (217, 70, 239), "cta_text": (24, 9, 38),
        "ghost": (255, 255, 255, 10),
        "logo_text": (250, 246, 238),
        "shadow": None,
    },
    "light": {
        "bg_top": (252, 249, 242), "bg_bottom": (241, 232, 252),
        "glow_a": (168, 85, 247), "glow_b": (214, 188, 250), "glow_c": (244, 114, 182),
        "glow_alpha": (58, 74, 34),
        "text": (26, 15, 46), "white": (255, 255, 255),
        "muted": (100, 88, 116), "faint": (140, 129, 154),
        "primary": (107, 45, 188), "primary_deep": (76, 29, 149),
        "secondary": (192, 38, 211), "accent": (124, 58, 237),
        "amber": (201, 124, 24), "pink": (219, 39, 119),
        "card_fill": (255, 255, 255, 255), "card_line": (231, 221, 242, 255),
        "card_fill_accent": (246, 239, 255, 255), "card_line_accent": (196, 168, 240, 255),
        "grid": (26, 15, 46, 12), "grain": 0.05, "vignette": 0,
        "chip_fill": (240, 232, 250, 255), "chip_line": (229, 220, 203, 255),
        "chip_text": (107, 45, 188),
        "counter_fill": (255, 255, 255, 235), "counter_line": (231, 221, 242, 255),
        "counter_text": (107, 95, 122),
        "dot_off": (26, 15, 46, 46),
        "cta_from": (124, 45, 200), "cta_to": (176, 66, 230), "cta_text": (255, 255, 255),
        "ghost": (26, 15, 46, 16),
        "logo_text": (26, 15, 46),
        "shadow": (26, 15, 46, 26),
    },
}
P = dict(THEMES["dark"])


def set_theme(name: str) -> dict:
    P.clear()
    P.update(THEMES[name])
    return P


# ── Polices ───────────────────────────────────────────────────────────────
_font_cache: dict = {}


def font(name: str, size: float) -> "ImageFont.FreeTypeFont":
    key = (name, max(4, int(round(size))))
    if key not in _font_cache:
        _font_cache[key] = ImageFont.truetype(str(FONT_DIR / name), max(4, int(round(size * SS))))
    return _font_cache[key]


BIDI_JUNK = re.compile(r"[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]")
ARABIC_RE = re.compile(r"[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]")
HAS_AR = ARABIC_RE


def visual(text: str) -> str:
    """Texte arabe prêt à dessiner : formes de présentation + ordre visuel LTR."""
    if not ARABIC_RE.search(text) or arabic_reshaper is None:
        return text
    return BIDI_JUNK.sub("", get_display(arabic_reshaper.reshape(text)))


# ── Fond ──────────────────────────────────────────────────────────────────
def gradient(size: Tuple[int, int], top, bottom) -> Image.Image:
    w, h = size
    strip = Image.new("RGB", (1, h))
    px = strip.load()
    for y in range(h):
        t = y / max(1, h - 1)
        px[0, y] = (int(top[0] + (bottom[0] - top[0]) * t),
                    int(top[1] + (bottom[1] - top[1]) * t),
                    int(top[2] + (bottom[2] - top[2]) * t))
    return strip.resize((w, h), Image.BILINEAR)


def glow(base: Image.Image, cx: float, cy: float, radius: float, color, alpha: int):
    r = int(radius * SS)
    layer = Image.new("RGBA", (r * 2, r * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    steps = 22
    for i in range(steps, 0, -1):
        t = i / steps
        rad = r * t
        d.ellipse([r - rad, r - rad, r + rad, r + rad], fill=(*color, int(alpha * (1 - t) ** 2.4)))
    layer = layer.filter(ImageFilter.GaussianBlur(r * 0.12))
    base.alpha_composite(layer, (int(cx * SS - r), int(cy * SS - r)))


def background() -> Image.Image:
    img = gradient((CW, CH), P["bg_top"], P["bg_bottom"]).convert("RGBA")
    a = P["glow_alpha"]
    glow(img, CW * 0.98, CH * 0.02, 720 * SS, P["glow_a"], a[0])
    glow(img, CW * 0.02, CH * 0.60, 540 * SS, P["glow_b"], a[1])
    glow(img, CW * 0.55, CH * 1.02, 640 * SS, P["glow_c"], a[2])

    grid = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grid)
    step = 66 * SS
    for x in range(0, CW, step):
        gd.line([(x, 0), (x, CH)], fill=P["grid"], width=SS)
    for y in range(0, CH, step):
        gd.line([(0, y), (CW, y)], fill=P["grid"], width=SS)
    mask = Image.new("L", (CW, CH), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse([CW * 0.34, CH * 0.08, CW * 1.05, CH * 0.85], fill=130)
    md.ellipse([-CW * 0.15, CH * 0.55, CW * 0.55, CH * 1.05, ], fill=70)
    mask = mask.filter(ImageFilter.GaussianBlur(120 * SS))
    img.alpha_composite(Image.composite(grid, Image.new("RGBA", (CW, CH), (0, 0, 0, 0)), mask))

    noise = Image.effect_noise((CW // 2, CH // 2), 16).convert("L").resize((CW, CH), Image.BILINEAR)
    grain = Image.new("RGBA", (CW, CH), (255, 255, 255, 255))
    grain.putalpha(noise.point(lambda v: int(v * P["grain"])))
    img.alpha_composite(grain)

    if P["vignette"]:
        vig = Image.new("L", (CW, CH), 0)
        ImageDraw.Draw(vig).ellipse([-CW * 0.22, -CH * 0.20, CW * 1.22, CH * 1.20], fill=255)
        vig = vig.filter(ImageFilter.GaussianBlur(170 * SS))
        dark = Image.new("RGBA", (CW, CH), (0, 0, 0, 255))
        dark.putalpha(vig.point(lambda v: int(P["vignette"] * (1 - v / 255.0))))
        img.alpha_composite(dark)
    return img


# ── Primitives ────────────────────────────────────────────────────────────
def rrect(base, box, radius, fill=None, outline=None, width=1.0):
    ImageDraw.Draw(base).rounded_rectangle(
        [box[0] * SS, box[1] * SS, box[2] * SS, box[3] * SS],
        radius=radius * SS, fill=fill, outline=outline, width=max(1, int(width * SS)))


def dot(base, cx, cy, r, color):
    ImageDraw.Draw(base).ellipse([(cx - r) * SS, (cy - r) * SS, (cx + r) * SS, (cy + r) * SS], fill=color)


def sparkle(base, cx, cy, r, color):
    pts = []
    for i in range(8):
        ang = math.pi / 4 * i - math.pi / 2
        rad = r if i % 2 == 0 else r * 0.30
        pts.append(((cx + math.cos(ang) * rad) * SS, (cy + math.sin(ang) * rad) * SS))
    ImageDraw.Draw(base).polygon(pts, fill=color)


def arrow_right(base, x, y, size=24, color=None, thickness=3.0):
    d = ImageDraw.Draw(base)
    color = color or P["text"]
    s = size * SS
    x, y = x * SS, y * SS
    d.line([(x, y), (x + s, y)], fill=color, width=int(thickness * SS))
    d.line([(x + s * 0.58, y - s * 0.34), (x + s, y)], fill=color, width=int(thickness * SS))
    d.line([(x + s * 0.58, y + s * 0.34), (x + s, y)], fill=color, width=int(thickness * SS))


def card(base, x, y, w, h, radius=26, accent=False):
    if P["shadow"]:
        sh = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle(
            [(x + 2) * SS, (y + 12) * SS, (x + w - 2) * SS, (y + h + 12) * SS],
            radius=radius * SS, fill=P["shadow"])
        base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(9 * SS)))
    rrect(base, (x, y, x + w, y + h), radius,
          fill=P["card_fill_accent"] if accent else P["card_fill"],
          outline=P["card_line_accent"] if accent else P["card_line"], width=1.4)


def logo_mark(base, x, y, s=46):
    grad = gradient((int(s * SS), int(s * SS)), P["primary_deep"], P["secondary"])
    mask = Image.new("L", grad.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, grad.size[0] - 1, grad.size[1] - 1],
                                          radius=int(s * SS * 0.30), fill=255)
    base.paste(grad, (int(x * SS), int(y * SS)), mask)
    ImageDraw.Draw(base).text(((x + s / 2) * SS, (y + s / 2 + 0.5) * SS), "S",
                              font=font(LATIN_BOLD, s * 0.60), fill=(255, 255, 255), anchor="mm")


def header(base, index: int, total: int):
    logo_mark(base, M, M - 6, 46)
    d = ImageDraw.Draw(base)
    f = font(LATIN_BOLD, 27)
    d.text(((M + 58) * SS, (M + 16) * SS), "sawtify", font=f, fill=P["logo_text"], anchor="lm")
    lw = f.getlength("sawtify") / SS
    dot(base, M + 58 + lw + 12, M + 27, 4.5, P["accent"])

    txt = f"{index:02d} / {total:02d}"
    f2 = font(LATIN_MED, 19)
    w = f2.getlength(txt) / SS + 36
    rrect(base, (W - M - w, M, W - M, M + 42), 21, fill=P["counter_fill"],
          outline=P["counter_line"], width=1)
    d.text(((W - M - w / 2) * SS, (M + 22) * SS), txt, font=f2, fill=P["counter_text"], anchor="mm")


def footer(base, index: int, total: int, hint: str | None = "Fais défiler"):
    y = H - M - 26
    dw, gap = 8, 12
    total_w = total * dw + (total - 1) * gap
    x0 = (W - total_w) / 2
    for i in range(total):
        cx = x0 + i * (dw + gap) + dw / 2
        if i == index - 1:
            rrect(base, (cx - 14, y - 3, cx + 14, y + 3), 3, fill=P["primary"])
        else:
            dot(base, cx, y, 3, P["dot_off"])
    if hint:
        fname = AR_REG if ARABIC_RE.search(hint) else LATIN_MED
        ImageDraw.Draw(base).text(((W - M) * SS, y * SS), visual(hint), font=font(fname, 18),
                                  fill=P["faint"], anchor="rm")


def chip(base, x_right: float, y: float, label: str, size=18, icon=True) -> float:
    """Chip aligné à droite (RTL). Renvoie sa largeur."""
    d = ImageDraw.Draw(base)
    f = font(AR_SEMI, size * 1.16)
    tw = d.textlength(visual(label), font=f) / SS
    pad, h = 20, 42
    w = tw + pad * 2 + (18 if icon else 0)
    x = x_right - w
    rrect(base, (x, y, x + w, y + h), h / 2, fill=P["chip_fill"], outline=P["chip_line"], width=1.1)
    cx = x + pad
    if icon:
        dot(base, cx + 4, y + h / 2, 4, P["primary"])
        cx += 18
    d.text((cx * SS, (y + h / 2 + 2) * SS), visual(label), font=f, fill=P["chip_text"], anchor="lm")
    return w


# ── Texte arabe (RTL) ─────────────────────────────────────────────────────
def _segments(text: str):
    """Découpe `**surligné**` en segments (texte, est_surligné)."""
    out = []
    for chunk in re.split(r"(\*\*.+?\*\*)", text):
        if not chunk.strip():
            continue
        hi = chunk.startswith("**") and chunk.endswith("**") and len(chunk) > 4
        out.append((chunk[2:-2] if hi else chunk, hi))
    return out


def ar_para(base, x_right: float, y: float, text: str, size: float, font_name=AR_BOLD,
            color=None, max_w: float | None = None, leading: float = 1.62,
            align: str = "right", hi_color=None) -> float:
    """
    Paragraphe arabe : retour à la ligne sur le texte logique, dessin en ordre
    visuel, et `**mot**` rendu dans `hi_color` (découpe par segments, donc la
    liaison des lettres reste correcte).
    Retourne le bas réel du bloc.
    """
    color = color or P["text"]
    hi_color = hi_color or P["primary"]
    max_w = max_w or (W - 2 * M)
    f = font(font_name, size)
    d = ImageDraw.Draw(base)

    # mots logiques avec leur couleur
    words = []
    for seg, hi in _segments(text):
        for w_ in seg.split():
            words.append((w_, hi))

    # césure sur la largeur mesurée en visuel
    lines, cur = [], []
    for w_, hi in words:
        cand = cur + [(w_, hi)]
        if cur and d.textlength(visual(" ".join(t for t, _ in cand)), font=f) / SS > max_w:
            lines.append(cur)
            cur = [(w_, hi)]
        else:
            cur = cand
    if cur:
        lines.append(cur)

    space = d.textlength(" ", font=f) / SS
    cy = y
    for line in lines:
        # regroupement en runs de même couleur (garde la liaison des lettres)
        runs = []
        for w_, hi in line:
            if runs and runs[-1][1] == hi:
                runs[-1][0].append(w_)
            else:
                runs.append(([w_], hi))
        widths = [d.textlength(visual(" ".join(r[0])), font=f) / SS for r in runs]
        total = sum(widths) + space * (len(runs) - 1)
        if align == "center":
            right = x_right - max_w / 2 + total / 2
        elif align == "left":
            right = x_right + max_w
        else:
            right = x_right
        for (words_run, hi), w_run in zip(runs, widths):
            shown = visual(" ".join(words_run))
            d.text(((right - w_run) * SS, cy * SS), shown, font=f,
                   fill=(hi_color if hi else color), anchor="la")
            right -= w_run + space
        cy += size * leading

    ascent, descent = f.getmetrics()
    return y + (len(lines) - 1) * size * leading + (ascent + descent) / SS


def lat_line(base, x, y, text, size, font_name=LATIN_MED, color=None, align="left"):
    d = ImageDraw.Draw(base)
    color = color or P["muted"]
    a = {"left": "la", "right": "ra", "center": "ma"}[align]
    d.text((x * SS, y * SS), text, font=font(font_name, size), fill=color, anchor=a)


# ── Éléments visuels ──────────────────────────────────────────────────────
def waveform(base, x, y, w, h, bars=44, seed=7):
    d = ImageDraw.Draw(base)
    rnd = (seed * 9301 + 49297) % 233280
    vals = []
    for i in range(bars):
        rnd = (rnd * 9301 + 49297) % 233280
        t = i / max(1, bars - 1)
        vals.append(max(0.10, math.sin(math.pi * t) ** 0.55 * (0.35 + 0.65 * rnd / 233280)))
    bw = w / (bars * 1.62)
    gap = bw * 0.62
    for i, v in enumerate(vals):
        bx = x + i * (bw + gap)
        bh = h * v
        t = i / max(1, bars - 1)
        col = (int(P["primary"][0] + (P["secondary"][0] - P["primary"][0]) * t),
               int(P["primary"][1] + (P["secondary"][1] - P["primary"][1]) * t),
               int(P["primary"][2] + (P["secondary"][2] - P["primary"][2]) * t), 235)
        d.rounded_rectangle([bx * SS, (y + (h - bh) / 2) * SS, (bx + bw) * SS, (y + (h + bh) / 2) * SS],
                            radius=(bw * SS) / 2, fill=col)


def play_badge(base, cx, cy, r=33):
    accent = P["accent"]
    dot(base, cx, cy, r, (*accent, 60) if len(accent) == 3 else accent)
    ImageDraw.Draw(base).ellipse([(cx - r) * SS, (cy - r) * SS, (cx + r) * SS, (cy + r) * SS],
                                fill=None, outline=(*P["primary"], 190), width=int(1.6 * SS))
    s = r * 0.52
    tri = CREAM_SAFE = P["text"]
    ImageDraw.Draw(base).polygon([((cx - s * 0.55 + 2) * SS, (cy - s) * SS),
                                 ((cx - s * 0.55 + 2) * SS, (cy + s) * SS),
                                 ((cx + s * 0.95 + 2) * SS, cy * SS)], fill=P["primary"])


def player_mock(base, x, y, w, title_ar="نحلة", meta="دارجة DZ  ·  00:12  ·  جودة استوديو", h=152):
    """Lecteur audio simulé en version RTL : bouton lecture à droite."""
    card(base, x, y, w, h, radius=30)
    play_badge(base, x + w - 74, y + h / 2, 33)
    d = ImageDraw.Draw(base)
    d.text(((x + w - 128) * SS, (y + 46) * SS), visual(title_ar), font=font(AR_BOLD, 26),
           fill=P["text"], anchor="rm")
    d.text(((x + w - 128) * SS, (y + 80) * SS), visual(meta), font=font(AR_REG, 18),
           fill=P["muted"], anchor="rm")
    waveform(base, x + 30, y + 98, w - 172, 28, bars=46)


def use_case_icon(base, cx, cy, kind):
    d = ImageDraw.Draw(base)
    c = P["primary"]
    if kind == "shop":
        d.line([(cx - 11) * SS, (cy - 2) * SS, (cx + 11) * SS, (cy - 2) * SS], fill=c, width=int(2.2 * SS))
        d.line([((cx - 11) * SS, (cy - 2) * SS), ((cx + 11) * SS, (cy - 2) * SS)], fill=c, width=int(2.2 * SS))
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
    else:
        d.arc([(cx - 12) * SS, (cy - 12) * SS, (cx + 12) * SS, (cy + 12) * SS], start=190, end=350,
              fill=c, width=int(2.2 * SS))
        d.rounded_rectangle([(cx - 13) * SS, (cy - 1) * SS, (cx - 7) * SS, (cy + 9) * SS], radius=2 * SS, fill=c)
        d.rounded_rectangle([(cx + 7) * SS, (cy - 1) * SS, (cx + 13) * SS, (cy + 9) * SS], radius=2 * SS, fill=c)


def cta_button(base, x, y, label, w=430, h=84):
    grad = gradient((int(w * SS), int(h * SS)), P["cta_from"], P["cta_to"]).convert("RGBA")
    mask = Image.new("L", grad.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, grad.size[0] - 1, grad.size[1] - 1],
                                          radius=int(h * SS / 2), fill=255)
    base.paste(grad, (int(x * SS), int(y * SS)), mask)
    d = ImageDraw.Draw(base)
    d.text(((x + 44) * SS, (y + h / 2 + 1) * SS), label, font=font(LATIN_BOLD, 29),
           fill=P["cta_text"], anchor="lm")
    arrow_right(base, x + w - 60, y + h / 2 - 1, 22, P["cta_text"], 3.2)


def ghost_number(base, text, x, y, size=300):
    ImageDraw.Draw(base).text((x * SS, y * SS), text, font=font(LATIN_BOLD, size),
                              fill=P["ghost"], anchor="mm")


def shape_icon(base, cx, cy, color=None, width_scale=1.0):
    """Petit chevron/flèche décorative."""
    arrow_right(base, cx, cy, 20, color or P["accent"], 2.6)
