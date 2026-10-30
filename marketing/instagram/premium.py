#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════
 premium.py — kit de composants « premium » pour les carrousels Sawtify
───────────────────────────────────────────────────────────────────────────
 • 18 icônes vectorielles dessinées (aucun emoji, aucun PNG externe)
 • tuiles d'icônes, badges, boutons avec reflet, cartes, price tags
 • lockup logo Sawtify (la mascotte détourée + le wordmark)
 Tout est calé sur la grille des slides 1080×1350 (marge 84 px).
═══════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

import sawtify_ig as ig
from sawtify_ig import (AR_BOLD, AR_REG, AR_SEMI, LATIN_BOLD, LATIN_MED, LATIN_REG,
                        M, P, SS, W, ar_para, dot, font, lat_line, rrect,
                        sparkle, visual)

ROOT = Path(__file__).resolve().parent
LOGO = ROOT / "assets" / "logo-mark.png"
_logo_cache: dict = {}


def logo(size: int) -> Image.Image:
    if size not in _logo_cache:
        _logo_cache[size] = Image.open(LOGO).convert("RGBA").resize((size, size), Image.LANCZOS)
    return _logo_cache[size]


# ═══════════════════════════════════════════════════════════════════════════
#  Icônes vectorielles (tracé, taille libre, couleur libre)
# ═══════════════════════════════════════════════════════════════════════════
def _lw(stroke: float) -> int:
    return max(1, int(stroke * SS))


def icon(base, name: str, cx: float, cy: float, size: float = 26,
         color=None, stroke: float = 2.0):
    """Dessine une icône centrée en (cx, cy), boîte de `size` px."""
    d = ImageDraw.Draw(base)
    c = color or P["primary"]
    s = size * SS / 2.0          # demi-taille en px supersamplés
    x, y = cx * SS, cy * SS
    w = _lw(stroke)

    def P_(px, py):
        return (x + px * s, y + py * s)

    if name == "mic":
        d.rounded_rectangle([x - 0.26 * s, y - 0.95 * s, x + 0.26 * s, y + 0.15 * s],
                            radius=0.28 * s, outline=c, width=w)
        d.arc([x - 0.62 * s, y - 0.45 * s, x + 0.62 * s, y + 0.62 * s], start=0, end=180,
              fill=c, width=w)
        d.line([x, y + 0.62 * s, x, y + 0.92 * s], fill=c, width=w)
        d.line([x - 0.34 * s, y + 0.92 * s, x + 0.34 * s, y + 0.92 * s], fill=c, width=w)

    elif name == "bolt":
        d.polygon([P_(-0.20, -1.0), P_(0.62, -0.16), P_(0.10, -0.16),
                   P_(0.28, 1.0), P_(-0.60, 0.10), P_(-0.06, 0.10)], fill=c)

    elif name == "download":
        d.line([x, y - 0.92 * s, x, y + 0.30 * s], fill=c, width=w)
        d.line([x - 0.40 * s, y - 0.06 * s, x, y + 0.34 * s], fill=c, width=w)
        d.line([x + 0.40 * s, y - 0.06 * s, x, y + 0.34 * s], fill=c, width=w)
        d.line([x - 0.78 * s, y + 0.92 * s, x + 0.78 * s, y + 0.92 * s], fill=c, width=w)
        d.line([x - 0.78 * s, y + 0.55 * s, x - 0.78 * s, y + 0.92 * s], fill=c, width=w)
        d.line([x + 0.78 * s, y + 0.55 * s, x + 0.78 * s, y + 0.92 * s], fill=c, width=w)

    elif name == "megaphone":
        d.polygon([P_(-0.85, -0.28), P_(0.20, -0.72), P_(0.20, 0.72), P_(-0.85, 0.28)],
                  outline=c, width=w, fill=None)
        d.line([x + 0.20 * s, y - 0.72 * s, x + 0.62 * s, y - 0.42 * s], fill=c, width=w)
        d.line([x + 0.20 * s, y + 0.72 * s, x + 0.62 * s, y + 0.42 * s], fill=c, width=w)
        d.line([x + 0.62 * s, y - 0.42 * s, x + 0.62 * s, y + 0.42 * s], fill=c, width=w)
        d.line([x - 0.62 * s, y + 0.30 * s, x - 0.52 * s, y + 0.92 * s], fill=c, width=w)

    elif name == "cart":
        d.line([x - 0.95 * s, y - 0.80 * s, x - 0.60 * s, y - 0.80 * s], fill=c, width=w)
        d.line([x - 0.60 * s, y - 0.80 * s, x - 0.32 * s, y + 0.28 * s], fill=c, width=w)
        d.line([x - 0.40 * s, y + 0.28 * s, x + 0.82 * s, y + 0.28 * s], fill=c, width=w)
        d.line([x + 0.82 * s, y + 0.28 * s, x + 0.96 * s, y - 0.52 * s], fill=c, width=w)
        d.line([x - 0.52 * s, y - 0.52 * s, x + 0.96 * s, y - 0.52 * s], fill=c, width=w)
        d.ellipse([x - 0.30 * s, y + 0.62 * s, x + 0.04 * s, y + 0.96 * s], outline=c, width=w)
        d.ellipse([x + 0.50 * s, y + 0.62 * s, x + 0.84 * s, y + 0.96 * s], outline=c, width=w)

    elif name == "phone":
        d.rounded_rectangle([x - 0.52 * s, y - 0.96 * s, x + 0.52 * s, y + 0.96 * s],
                            radius=0.22 * s, outline=c, width=w)
        d.line([x - 0.18 * s, y + 0.66 * s, x + 0.18 * s, y + 0.66 * s], fill=c, width=w)

    elif name == "headphones":
        d.arc([x - 0.86 * s, y - 0.92 * s, x + 0.86 * s, y + 0.86 * s], start=185, end=355,
              fill=c, width=w)
        d.rounded_rectangle([x - 0.94 * s, y - 0.10 * s, x - 0.54 * s, y + 0.72 * s],
                            radius=0.16 * s, fill=c)
        d.rounded_rectangle([x + 0.54 * s, y - 0.10 * s, x + 0.94 * s, y + 0.72 * s],
                            radius=0.16 * s, fill=c)

    elif name == "shield":
        d.polygon([P_(0, -0.98), P_(0.80, -0.62), P_(0.80, 0.10), P_(0, 1.0),
                   P_(-0.80, 0.10), P_(-0.80, -0.62)], outline=c, width=w, fill=None)
        d.line([x - 0.34 * s, y + 0.02 * s, x - 0.06 * s, y + 0.32 * s], fill=c, width=w)
        d.line([x - 0.06 * s, y + 0.32 * s, x + 0.40 * s, y - 0.30 * s], fill=c, width=w)

    elif name == "check":
        d.ellipse([x - 0.96 * s, y - 0.96 * s, x + 0.96 * s, y + 0.96 * s], outline=c, width=w)
        d.line([x - 0.42 * s, y + 0.02 * s, x - 0.10 * s, y + 0.38 * s], fill=c, width=w)
        d.line([x - 0.10 * s, y + 0.38 * s, x + 0.48 * s, y - 0.34 * s], fill=c, width=w)

    elif name == "clock":
        d.ellipse([x - 0.94 * s, y - 0.94 * s, x + 0.94 * s, y + 0.94 * s], outline=c, width=w)
        d.line([x, y - 0.52 * s, x, y + 0.06 * s], fill=c, width=w)
        d.line([x, y + 0.06 * s, x + 0.42 * s, y + 0.26 * s], fill=c, width=w)

    elif name == "wallet":
        d.rounded_rectangle([x - 0.94 * s, y - 0.66 * s, x + 0.94 * s, y + 0.72 * s],
                            radius=0.20 * s, outline=c, width=w)
        d.line([x - 0.94 * s, y - 0.26 * s, x + 0.94 * s, y - 0.26 * s], fill=c, width=w)
        d.ellipse([x + 0.26 * s, y + 0.02 * s, x + 0.56 * s, y + 0.32 * s], fill=c)

    elif name == "percent":
        d.line([x + 0.52 * s, y - 0.72 * s, x - 0.52 * s, y + 0.72 * s], fill=c, width=w)
        d.ellipse([x - 0.76 * s, y - 0.82 * s, x - 0.24 * s, y - 0.30 * s], outline=c, width=w)
        d.ellipse([x + 0.24 * s, y + 0.30 * s, x + 0.76 * s, y + 0.82 * s], outline=c, width=w)

    elif name == "layers":
        d.polygon([P_(0, -0.92), P_(0.92, -0.40), P_(0, 0.12), P_(-0.92, -0.40)],
                  outline=c, width=w, fill=None)
        d.line([x - 0.92 * s, y + 0.10 * s, x, y + 0.62 * s], fill=c, width=w)
        d.line([x + 0.92 * s, y + 0.10 * s, x, y + 0.62 * s], fill=c, width=w)
        d.line([x - 0.92 * s, y + 0.48 * s, x, y + 1.0 * s], fill=c, width=w)
        d.line([x + 0.92 * s, y + 0.48 * s, x, y + 1.0 * s], fill=c, width=w)

    elif name == "rocket":
        d.polygon([P_(0, -1.0), P_(0.46, -0.14), P_(0.46, 0.52), P_(-0.46, 0.52),
                   P_(-0.46, -0.14)], outline=c, width=w, fill=None)
        d.ellipse([x - 0.20 * s, y - 0.50 * s, x + 0.20 * s, y - 0.10 * s], outline=c, width=w)
        d.line([x - 0.46 * s, y + 0.30 * s, x - 0.82 * s, y + 0.78 * s], fill=c, width=w)
        d.line([x + 0.46 * s, y + 0.30 * s, x + 0.82 * s, y + 0.78 * s], fill=c, width=w)

    elif name == "video":
        d.rounded_rectangle([x - 0.96 * s, y - 0.68 * s, x + 0.42 * s, y + 0.68 * s],
                            radius=0.20 * s, outline=c, width=w)
        d.polygon([P_(0.42, -0.10), P_(0.96, -0.52), P_(0.96, 0.52), P_(0.42, 0.10)], fill=c)

    elif name == "chart":
        for i, h_ in enumerate((0.42, 0.92, 0.66)):
            bx = x + (-0.72 + i * 0.62) * s
            d.line([bx, y + 0.92 * s, bx, y - h_ * s], fill=c, width=_lw(stroke * 1.6))

    elif name == "gift":
        d.rounded_rectangle([x - 0.90 * s, y - 0.30 * s, x + 0.90 * s, y + 0.90 * s],
                            radius=0.12 * s, outline=c, width=w)
        d.line([x, y - 0.30 * s, x, y + 0.90 * s], fill=c, width=w)
        d.line([x - 0.90 * s, y + 0.14 * s, x + 0.90 * s, y + 0.14 * s], fill=c, width=w)
        d.arc([x - 0.78 * s, y - 0.94 * s, x, y - 0.24 * s], start=160, end=20, fill=c, width=w)
        d.arc([x, y - 0.94 * s, x + 0.78 * s, y - 0.24 * s], start=160, end=20, fill=c, width=w)

    elif name == "lock":
        d.rounded_rectangle([x - 0.72 * s, y - 0.10 * s, x + 0.72 * s, y + 0.94 * s],
                            radius=0.20 * s, outline=c, width=w)
        d.arc([x - 0.48 * s, y - 0.92 * s, x + 0.48 * s, y + 0.10 * s], start=180, end=360,
              fill=c, width=w)
        dot(base, cx, cy + 0.42 * size * 1.0, size * 0.09, c)
        d.line([x, y + 0.50 * s, x, y + 0.70 * s], fill=c, width=w)

    elif name == "user":
        d.ellipse([x - 0.40 * s, y - 0.94 * s, x + 0.40 * s, y - 0.14 * s], outline=c, width=w)
        d.arc([x - 0.86 * s, y - 0.02 * s, x + 0.86 * s, y + 1.10 * s], start=180, end=360,
              fill=c, width=w)

    elif name == "star":
        pts = []
        for k in range(10):
            ang = -math.pi / 2 + k * math.pi / 5
            rad = 0.98 if k % 2 == 0 else 0.42
            pts.append((x + math.cos(ang) * rad * s, y + math.sin(ang) * rad * s))
        d.polygon(pts, fill=c)

    elif name == "globe":
        d.ellipse([x - 0.94 * s, y - 0.94 * s, x + 0.94 * s, y + 0.94 * s], outline=c, width=w)
        d.line([x - 0.94 * s, y, x + 0.94 * s, y], fill=c, width=w)
        d.arc([x - 0.44 * s, y - 0.94 * s, x + 0.44 * s, y + 0.94 * s], start=90, end=270,
              fill=c, width=w)
        d.arc([x - 0.44 * s, y - 0.94 * s, x + 0.44 * s, y + 0.94 * s], start=270, end=90,
              fill=c, width=w)

    elif name == "sparkles":
        sparkle(base, cx, cy - size * 0.16, size * 0.30, c)
        sparkle(base, cx - size * 0.34, cy + size * 0.30, size * 0.16, c)
        sparkle(base, cx + size * 0.32, cy + size * 0.34, size * 0.12, c)

    elif name == "play":
        d.polygon([P_(-0.45, -0.72), P_(-0.45, 0.72), P_(0.72, 0)], fill=c)

    elif name == "cross":
        d.ellipse([x - 0.94 * s, y - 0.94 * s, x + 0.94 * s, y + 0.94 * s], outline=c, width=w)
        d.line([x - 0.32 * s, y - 0.32 * s, x + 0.32 * s, y + 0.32 * s], fill=c, width=w)
        d.line([x + 0.32 * s, y - 0.32 * s, x - 0.32 * s, y + 0.32 * s], fill=c, width=w)

    elif name == "arrow-left":
        d.line([x + 0.85 * s, y, x - 0.85 * s, y], fill=c, width=_lw(stroke * 1.2))
        d.line([x - 0.35 * s, y - 0.50 * s, x - 0.85 * s, y], fill=c, width=_lw(stroke * 1.2))
        d.line([x - 0.35 * s, y + 0.50 * s, x - 0.85 * s, y], fill=c, width=_lw(stroke * 1.2))

    else:
        raise ValueError(f"icône inconnue : {name}")


# ═══════════════════════════════════════════════════════════════════════════
#  Composants
# ═══════════════════════════════════════════════════════════════════════════
def icon_tile(base, cx: float, cy: float, name: str, size: float = 64,
              icon_color=None, tint=None, line=None, stroke: float = 1.9,
              radius_ratio: float = 0.30):
    """Tuile arrondie teintée contenant une icône (le « premium chip »)."""
    tint = tint or (*P["primary"], 26)
    line = line or (*P["primary"], 70)
    x0, y0 = cx - size / 2, cy - size / 2
    rrect(base, (x0, y0, x0 + size, y0 + size), size * radius_ratio, fill=tint, outline=line, width=1.2)
    icon(base, name, cx, cy, size * 0.52, icon_color or P["primary"], stroke)


def logo_tile(base, x: float, y: float, s: float = 66, radius_ratio: float = 0.28,
              grad=None, framed: bool = False):
    """Tuile dégradée violette avec la mascotte Sawtify dedans."""
    g = ig.gradient((int(s * SS), int(s * SS)), grad[0] if grad else (124, 45, 200),
                    grad[1] if grad else (196, 66, 240))
    mask = Image.new("L", g.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, g.size[0] - 1, g.size[1] - 1],
                                          radius=int(s * SS * radius_ratio), fill=255)
    tile = Image.new("RGBA", g.size, (0, 0, 0, 0))
    tile.paste(g, (0, 0), mask)
    # léger halo en haut
    hl = Image.new("RGBA", g.size, (255, 255, 255, 0))
    ImageDraw.Draw(hl).ellipse([-g.size[0] * 0.3, -g.size[1] * 0.9, g.size[0] * 1.3, g.size[1] * 0.5],
                               fill=(255, 255, 255, 40))
    tile.alpha_composite(Image.composite(hl, Image.new("RGBA", g.size, (0, 0, 0, 0)), mask))
    # mascotte
    mark_size = int(s * SS * 0.74)
    mark = logo(mark_size)
    tile.alpha_composite(mark, ((g.size[0] - mark_size) // 2, (g.size[1] - mark_size) // 2))
    base.alpha_composite(tile, (int(x * SS), int(y * SS)))
    if framed:
        rrect(base, (x, y, x + s, y + s), s * radius_ratio, fill=None,
              outline=(255, 255, 255, 70), width=1)


def logo_lockup(base, x_right: float, y: float, size: float = 46,
                dark_text: bool = False, tile: bool = False):
    """Mascotte + wordmark « sawtify » alignés à droite.

    `tile=True` place la mascotte dans une tuile violette : indispensable sur
    fond clair, où sa tête blanche disparaîtrait.
    """
    d = ImageDraw.Draw(base)
    word_col = P["text"] if dark_text else P["logo_text"]
    f = font(LATIN_BOLD, size * 0.72)
    word = "sawtify"
    ww = d.textlength(word, font=f) / SS
    mark_s = size
    x_mark = x_right - ww - 12 - mark_s
    if tile:
        logo_tile(base, x_mark, y, mark_s, radius_ratio=0.30)
    else:
        base.alpha_composite(logo(int(mark_s * SS)), (int(x_mark * SS), int(y * SS)))
    d.text((x_right * SS, (y + mark_s / 2 + 1) * SS), word, font=f, fill=word_col, anchor="rm")
    dot(base, x_right + 8, y + mark_s / 2 + 2, 3.6, P["primary"])


def badge(base, x_right: float, y: float, label: str, size: float = 17,
          fill=None, line=None, color=None, uppercase: bool = False, dot_color=None) -> float:
    """Petit badge pilule aligné à droite."""
    d = ImageDraw.Draw(base)
    text = label.upper() if uppercase else label
    fname = LATIN_BOLD if not ig.ARABIC_RE.search(text) else AR_SEMI
    f = font(fname, size * (1.10 if fname is AR_SEMI else 1.0))
    shown = visual(text)
    tw = d.textlength(shown, font=f) / SS
    h = 40
    w = tw + 44
    x = x_right - w
    rrect(base, (x, y, x + w, y + h), h / 2, fill=fill or P["chip_fill"], outline=line or P["chip_line"], width=1.1)
    dot(base, x + 20, y + h / 2, 3.6, dot_color or P["primary"])
    d.text(((x + 34) * SS, (y + h / 2 + 2) * SS), shown, font=f, fill=color or P["chip_text"], anchor="lm")
    return w


def button(base, x: float, y: float, w: float, h: float, label: str,
           style: str = "violet", icon_name: str | None = "arrow-left"):
    """Bouton premium : dégradé + reflet haut + icône."""
    if style == "violet":
        c1, c2 = P["cta_from"], P["cta_to"]
        text_col = P["cta_text"]
        shine = (255, 255, 255, 46)
    elif style == "white":
        c1, c2 = (255, 255, 255), (247, 242, 255)
        text_col = (74, 22, 130)
        shine = (255, 255, 255, 200)
    else:  # "ink"
        c1, c2 = (32, 20, 52), (18, 11, 30)
        text_col = (250, 246, 238)
        shine = (255, 255, 255, 22)

    grad = ig.gradient((int(w * SS), int(h * SS)), c1, c2).convert("RGBA")
    mask = Image.new("L", grad.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, grad.size[0] - 1, grad.size[1] - 1],
                                          radius=int(h * SS / 2), fill=255)
    btn = Image.new("RGBA", grad.size, (0, 0, 0, 0))
    btn.paste(grad, (0, 0), mask)
    sh = Image.new("RGBA", grad.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle([0, 0, grad.size[0], int(grad.size[1] * 0.55)],
                                        radius=int(h * SS / 2), fill=shine)
    btn.alpha_composite(Image.composite(sh, Image.new("RGBA", grad.size, (0, 0, 0, 0)), mask))
    base.alpha_composite(btn, (int(x * SS), int(y * SS)))

    d = ImageDraw.Draw(base)
    fname = AR_BOLD if ig.ARABIC_RE.search(label) else LATIN_BOLD
    f = font(fname, 27 if fname is LATIN_BOLD else 25)
    shown = visual(label)
    tw = d.textlength(shown, font=f) / SS
    total = tw + (34 if icon_name else 0)
    start = x + (w - total) / 2
    d.text((start * SS, (y + h / 2 + 1) * SS), shown, font=f, fill=text_col, anchor="lm")
    if icon_name:
        icon(base, icon_name, start + tw + 18, y + h / 2, 20, text_col, 2.4)


def card(base, x, y, w, h, radius=28, accent=False, flat=False):
    """Carte premium : ombre douce, fond net, filet fin."""
    if not flat and P["shadow"]:
        sh = Image.new("RGBA", (W * SS, ig.H * SS), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle(
            [(x + 3) * SS, (y + 14) * SS, (x + w - 3) * SS, (y + h + 14) * SS],
            radius=radius * SS, fill=P["shadow"])
        base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(10 * SS)))
    rrect(base, (x, y, x + w, y + h), radius,
          fill=P["card_fill_accent"] if accent else P["card_fill"],
          outline=P["card_line_accent"] if accent else P["card_line"], width=1.3)


def stat_block(base, x_right, y, value, label, icon_name=None, value_size=44, color=None):
    d = ImageDraw.Draw(base)
    col = color or P["primary"]
    d.text((x_right * SS, y * SS), value, font=font(LATIN_BOLD, value_size), fill=col, anchor="ra")
    ar_para(base, x_right, y + value_size * 1.18, label, 20, AR_REG, P["muted"], max_w=520)


def divider(base, x1, x2, y, color=None):
    rrect(base, (x1, y, x2, y + 1.2), 1, fill=color or (*P["text"], 24))
