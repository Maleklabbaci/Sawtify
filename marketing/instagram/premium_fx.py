#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════
 premium_fx.py — matières, textures et objets « print » pour Sawtify
───────────────────────────────────────────────────────────────────────────
 Ce que ça ajoute aux slides (tout en PIL, aucun asset externe) :

   • grain de film, halo lumineux, fuite de lumière
   • trame de points (halftone), grille de points, grille de filets
   • panneau « verre dépoli » (flou du fond + filet + reflet)
   • ticket crème avec encoches et ligne de déchirure en pointillés
   • autocollant dentelé, incliné, avec texte
   • bandeau défilant (marquee), barre chromée, équerres de cadrage

   python3 premium_fx.py --pack    # écrit les PNG réutilisables dans textures/
═══════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

import sawtify_ig as ig
from sawtify_ig import LATIN_BOLD, LATIN_MED, P, SS, W, font, rrect, visual

CREAM = (250, 246, 238)
INK = (26, 15, 46)


# ═══════════════════════════════════════════════════════════════════════════
#  Textures de fond
# ═══════════════════════════════════════════════════════════════════════════
def grain(base: Image.Image, amount: float = 0.085) -> None:
    noise = Image.effect_noise((ig.CW // 2, ig.CH // 2), 22).convert("L")
    noise = noise.resize((ig.CW, ig.CH), Image.BILINEAR)
    layer = Image.new("RGBA", (ig.CW, ig.CH), (255, 255, 255, 255))
    layer.putalpha(noise.point(lambda v: int(v * amount)))
    base.alpha_composite(layer)


def light_leak(base: Image.Image, cx: float, cy: float, radius: float, color, alpha: int = 70) -> None:
    r = int(radius * SS)
    layer = Image.new("RGBA", (r * 2, r * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(18, 0, -1):
        t = i / 18
        d.ellipse([r - r * t, r - r * t * 0.72, r + r * t, r + r * t * 0.72],
                  fill=(*color, int(alpha * (1 - t) ** 3)))
    layer = layer.filter(ImageFilter.GaussianBlur(r * 0.20))
    base.alpha_composite(layer, (int(cx * SS - r), int(cy * SS - r)))


def halftone(base: Image.Image, cx: float, cy: float, radius: float,
             color=(255, 255, 255), alpha: int = 34, gap: float = 9.0,
             max_dot: float = 3.2, fade: float = 1.0) -> None:
    """Trame de points qui s'estompe du centre vers le bord — effet imprimé."""
    layer = Image.new("RGBA", (ig.CW, ig.CH), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    step = gap * SS
    x0, x1 = int((cx - radius) * SS), int((cx + radius) * SS)
    y0, y1 = int((cy - radius) * SS), int((cy + radius) * SS)
    for yy in range(max(0, y0), min(ig.CH, y1), int(step)):
        for xx in range(max(0, x0), min(ig.CW, x1), int(step)):
            dist = math.hypot(xx / SS - cx, yy / SS - cy) / radius
            if dist > 1:
                continue
            t = (1 - dist) ** fade
            r = max_dot * SS * t
            if r < 0.6:
                continue
            d.ellipse([xx - r, yy - r, xx + r, yy + r],
                      fill=(*color, int(alpha * t)))
    base.alpha_composite(layer.filter(ImageFilter.GaussianBlur(0.4 * SS)))


def dotgrid(base: Image.Image, step: float = 44, color=(255, 255, 255), alpha: int = 26,
            box=None) -> None:
    layer = Image.new("RGBA", (ig.CW, ig.CH), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    bx = (0, 0, W, ig.H) if box is None else box
    r = 1.15 * SS
    y = bx[1]
    while y <= bx[3]:
        x = bx[0]
        while x <= bx[2]:
            d.ellipse([x * SS - r, y * SS - r, x * SS + r, y * SS + r], fill=(*color, alpha))
            x += step
        y += step
    base.alpha_composite(layer)


def rule_grid(base: Image.Image, step: float = 90, color=(255, 255, 255), alpha: int = 16,
              box=None) -> None:
    layer = Image.new("RGBA", (ig.CW, ig.CH), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    bx = (0, 0, W, ig.H) if box is None else box
    x = bx[0]
    while x <= bx[2]:
        d.line([(x * SS, bx[1] * SS), (x * SS, bx[3] * SS)], fill=(*color, alpha), width=SS)
        x += step
    y = bx[1]
    while y <= bx[3]:
        d.line([(bx[0] * SS, y * SS), (bx[2] * SS, y * SS)], fill=(*color, alpha), width=SS)
        y += step
    base.alpha_composite(layer)


# ═══════════════════════════════════════════════════════════════════════════
#  Objets
# ═══════════════════════════════════════════════════════════════════════════
def glass_panel(base: Image.Image, box, radius: float, tint=(255, 255, 255),
                alpha: int = 26, border=(255, 255, 255, 90), blur: float = 18.0) -> None:
    """Panneau verre dépoli : le fond est flouté derrière, puis teinté."""
    x0, y0, x1, y1 = [int(v * SS) for v in box]
    r = int(radius * SS)
    region = base.crop((x0, y0, x1, y1)).filter(ImageFilter.GaussianBlur(blur * SS))
    mask = Image.new("L", (x1 - x0, y1 - y0), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, x1 - x0, y1 - y0], radius=r, fill=255)
    base.paste(region, (x0, y0), mask)
    rrect(base, box, radius, fill=(*tint, alpha), outline=border, width=1.2)
    # reflet haut
    hl = Image.new("RGBA", (ig.CW, ig.CH), (0, 0, 0, 0))
    ImageDraw.Draw(hl).rounded_rectangle(
        [box[0] * SS + 2, box[1] * SS + 2, box[2] * SS - 2, box[1] * SS + 34 * SS],
        radius=r, fill=(255, 255, 255, 26))
    base.alpha_composite(hl.filter(ImageFilter.GaussianBlur(6 * SS)))


def ticket(base: Image.Image, box, radius: float = 34, fill=CREAM,
           notch: str = "both", notch_r: float = 17, shadow: bool = True) -> None:
    """Carte « ticket » crème : encoches latérales + ombre portée."""
    x0, y0, x1, y1 = box
    if shadow:
        sh = Image.new("RGBA", (ig.CW, ig.CH), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle(
            [(x0 + 4) * SS, (y0 + 26) * SS, (x1 - 4) * SS, (y1 + 30) * SS],
            radius=radius * SS, fill=(6, 2, 18, 150))
        base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(22 * SS)))
    rrect(base, box, radius, fill=fill)
    # encoches
    cut = Image.new("RGBA", (ig.CW, ig.CH), (0, 0, 0, 0))
    dc = ImageDraw.Draw(cut)
    ym = (y0 + y1) / 2
    holes = []
    if notch in ("both", "left"):
        holes.append((x0, ym))
    if notch in ("both", "right"):
        holes.append((x1, ym))
    for hx, hy in holes:
        dc.ellipse([(hx - notch_r) * SS, (hy - notch_r) * SS,
                    (hx + notch_r) * SS, (hy + notch_r) * SS], fill=(0, 0, 0, 255))
    # on « perce » en re-composant le fond d'origine : ici on simule par une
    # pastille sombre translucide, suffisant visuellement sur fond dégradé
    for hx, hy in holes:
        ig.dot(base, hx, hy, notch_r, (0, 0, 0, 0))
    return None


def perforation(base: Image.Image, x: float, y0: float, y1: float,
                color=(26, 15, 46, 70), dash: float = 7, gap: float = 9) -> None:
    d = ImageDraw.Draw(base)
    y = y0
    while y < y1:
        d.line([(x * SS, y * SS), (x * SS, min(y1, y + dash) * SS)],
               fill=color, width=max(1, int(1.6 * SS)))
        y += dash + gap


def sticker(base: Image.Image, cx: float, cy: float, r: float, big: str,
            small: str = "", color=(255, 100, 44), text_color=(255, 255, 255),
            rot: float = -12.0, teeth: int = 28) -> None:
    """Autocollant dentelé, incliné, avec un gros chiffre et un libellé."""
    size = int(r * 2 * SS * 1.25)
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    c = size / 2

    # jante dentelée
    pts = []
    for i in range(teeth * 2):
        ang = math.pi * i / teeth
        rad = (r * SS) * (1.0 if i % 2 == 0 else 0.90)
        pts.append((c + math.cos(ang) * rad, c + math.sin(ang) * rad))
    d.polygon(pts, fill=(*color, 255))
    d.ellipse([c - r * SS * 0.80, c - r * SS * 0.80, c + r * SS * 0.80, c + r * SS * 0.80],
              fill=(*color, 255), outline=(255, 255, 255, 210), width=int(2 * SS))

    f_big = font(LATIN_BOLD, r * 0.86)
    d.text((c, c - r * SS * 0.10), big, font=f_big, fill=text_color, anchor="mm")
    if small:
        f_sm = font(LATIN_MED, r * 0.24)
        d.text((c, c + r * SS * 0.52), small.upper(), font=f_sm,
               fill=(*text_color, 235) if len(text_color) == 3 else text_color, anchor="mm")

    layer = layer.rotate(-rot, resample=Image.BICUBIC, expand=False)
    base.alpha_composite(layer, (int(cx * SS - c), int(cy * SS - c)))


def corner_brackets(base: Image.Image, box, size: float = 46, inset: float = 0,
                    color=(255, 255, 255), width: float = 1.6) -> None:
    x0, y0, x1, y1 = box
    d = ImageDraw.Draw(base)
    w = max(1, int(width * SS))
    s = size
    corners = [
        ((x0 + inset, y0 + inset), (1, 1)),
        ((x1 - inset, y0 + inset), (-1, 1)),
        ((x0 + inset, y1 - inset), (1, -1)),
        ((x1 - inset, y1 - inset), (-1, -1)),
    ]
    for (x, y), (sx, sy) in corners:
        d.line([(x * SS, y * SS), ((x + sx * s) * SS, y * SS)], fill=(*color, 120), width=w)
        d.line([(x * SS, y * SS), (x * SS, (y + sy * s) * SS)], fill=(*color, 120), width=w)


def marquee(base: Image.Image, y: float, h: float, text: str, bg=(255, 100, 44),
            fg=(255, 255, 255), angle: float = 0.0, font_size: float = 20) -> None:
    """Bandeau plein avec texte répété (effet presse / ruban)."""
    f = font(ig.LATIN_BOLD, font_size)
    d0 = ImageDraw.Draw(base)
    unit = d0.textlength(text, font=f) / SS + 34
    strip_h = int(h * SS)
    strip = Image.new("RGBA", (ig.CW, strip_h), (*bg, 255))
    ds = ImageDraw.Draw(strip)
    x = 0.0
    while x < W + unit:
        ds.text((x * SS, strip_h / 2), text, font=f, fill=(*fg, 255), anchor="lm")
        x += unit
    if angle:
        strip = strip.rotate(angle, resample=Image.BICUBIC, expand=False)
    base.alpha_composite(strip, (0, int(y * SS - strip_h / 2)))


def chrome_bar(base: Image.Image, box, radius: float, tone=(255, 255, 255)) -> None:
    """Pilule « métal brossé » : dégradé vertical + filet + reflet."""
    x0, y0, x1, y1 = box
    layer = Image.new("RGBA", (int((x1 - x0) * SS), int((y1 - y0) * SS)), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    h = layer.size[1]
    for i in range(h):
        t = i / max(1, h - 1)
        a = int(70 - 40 * abs(t - 0.35))
        d.line([(0, i), (layer.size[0], i)], fill=(*tone, max(12, a)))
    mask = Image.new("L", layer.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, layer.size[0], layer.size[1]],
                                          radius=radius * SS, fill=255)
    base.paste(layer, (int(x0 * SS), int(y0 * SS)), mask)
    rrect(base, box, radius, fill=None, outline=(*tone, 120), width=1.2)


def rot_label(base: Image.Image, x: float, y: float, text: str, size: float = 16,
              color=(255, 255, 255), alpha: int = 120, angle: float = -90) -> None:
    f = font(LATIN_MED, size)
    d0 = ImageDraw.Draw(base)
    tw = int(d0.textlength(text, font=f)) + 20
    layer = Image.new("RGBA", (tw, int(size * 2)), (0, 0, 0, 0))
    ImageDraw.Draw(layer).text((tw / 2, size), text, font=f, fill=(*color, alpha), anchor="mm")
    layer = layer.rotate(angle, resample=Image.BICUBIC, expand=True)
    base.alpha_composite(layer, (int(x * SS - layer.size[0] / 2), int(y * SS - layer.size[1] / 2)))


def polaroid(base: Image.Image, box, rot: float = 0.0) -> None:
    """Cadre photo crème légèrement incliné, à poser derrière un visuel."""
    w = box[2] - box[0]
    h = box[3] - box[1]
    layer = Image.new("RGBA", (int(w * SS * 1.6), int(h * SS * 1.6)), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    ox = (layer.size[0] - w * SS) / 2
    oy = (layer.size[1] - h * SS) / 2
    d.rounded_rectangle([ox, oy, ox + w * SS, oy + h * SS], radius=14 * SS,
                        fill=(*CREAM, 255))
    layer = layer.rotate(rot, resample=Image.BICUBIC, expand=False)
    base.alpha_composite(layer, (int(box[0] * SS - ox), int(box[1] * SS - oy)))


# ═══════════════════════════════════════════════════════════════════════════
#  Pack de textures réutilisables (PNG transparents)
# ═══════════════════════════════════════════════════════════════════════════
def build_pack(out: Path) -> list[Path]:
    out.mkdir(parents=True, exist_ok=True)
    made = []

    # grain
    g = Image.new("RGBA", (1080, 1080), (255, 255, 255, 0))
    noise = Image.effect_noise((540, 540), 26).convert("L").resize((1080, 1080), Image.BILINEAR)
    g.putalpha(noise.point(lambda v: int(v * 0.16)))
    p = out / "grain-1080.png"; g.save(p); made.append(p)

    # halftone radial
    h = Image.new("RGBA", (1080, 1080), (0, 0, 0, 0))
    d = ImageDraw.Draw(h)
    for yy in range(0, 1080, 18):
        for xx in range(0, 1080, 18):
            t = 1 - min(1.0, math.hypot(xx - 540, yy - 540) / 540)
            r = 7.0 * t
            if r < 1:
                continue
            d.ellipse([xx - r, yy - r, xx + r, yy + r], fill=(255, 255, 255, int(150 * t)))
    p = out / "halftone-radial.png"; h.save(p); made.append(p)

    # grille de points
    dg = Image.new("RGBA", (1080, 1080), (0, 0, 0, 0))
    dd = ImageDraw.Draw(dg)
    for yy in range(22, 1080, 40):
        for xx in range(22, 1080, 40):
            dd.ellipse([xx - 2, yy - 2, xx + 2, yy + 2], fill=(255, 255, 255, 40))
    p = out / "dotgrid-1080.png"; dg.save(p); made.append(p)

    # dégradé doux (glow) pour compositing
    gl = Image.new("RGBA", (1080, 1080), (0, 0, 0, 0))
    dgl = ImageDraw.Draw(gl)
    for i in range(60, 0, -1):
        t = i / 60
        dgl.ellipse([540 - 540 * t, 540 - 540 * t, 540 + 540 * t, 540 + 540 * t],
                    fill=(255, 255, 255, int(4 * (1 - t) ** 2)))
    p = out / "glow-soft.png"; gl.filter(ImageFilter.GaussianBlur(30)).save(p); made.append(p)

    # autocollant vierge dentelé
    st = Image.new("RGBA", (420, 420), (0, 0, 0, 0))
    ds = ImageDraw.Draw(st)
    pts = []
    for i in range(56):
        ang = math.pi * i / 28
        rad = 190 * (1.0 if i % 2 == 0 else 0.90)
        pts.append((210 + math.cos(ang) * rad, 210 + math.sin(ang) * rad))
    ds.polygon(pts, fill=(255, 100, 44, 255))
    p = out / "sticker-vierge.png"; st.save(p); made.append(p)

    # ticket crème vierge avec encoches
    tk = Image.new("RGBA", (900, 420), (0, 0, 0, 0))
    dt = ImageDraw.Draw(tk)
    dt.rounded_rectangle([10, 10, 890, 410], radius=34, fill=(*CREAM, 255))
    for yy in (110, 210, 310):
        dt.ellipse([-4, yy - 9, 24, yy + 9], fill=(0, 0, 0, 0))
    dt.ellipse([-2, 200, 26, 228], fill=(0, 0, 0, 0))
    dt.ellipse([874, 200, 902, 228], fill=(0, 0, 0, 0))
    p = out / "ticket-creme.png"; tk.save(p); made.append(p)

    return made


if __name__ == "__main__":
    import sys
    root = Path(__file__).resolve().parent
    files = build_pack(root / "textures")
    for f in files:
        print("écrit", f.relative_to(root))
    sys.exit(0)
