#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gabarits A et B — mêmes polices, mêmes composants que « lettre ».

A · affiche      : très gros titre au bord, pastilles au pied, page calme.
B · carte pleine : fond violet, carte crème, titre centré, pastilles qui débordent.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from PIL import Image, ImageDraw

import lettre as L

W, H, SS = L.W, L.H, L.SS
U = 46.0
OUT = Path(__file__).resolve().parent / "slides" / "lettre"


# ── outils ──────────────────────────────────────────────────────────────
def rule(base, y, x0, x1, alpha=40, w=1.2):
    ImageDraw.Draw(base).line([x0 * SS, y * SS, x1 * SS, y * SS],
                              fill=(17, 17, 19, alpha), width=int(w * SS))


def vrule(base, x, y0, y1, alpha=34, w=1.2):
    ImageDraw.Draw(base).line([x * SS, y0 * SS, x * SS, y1 * SS],
                              fill=(17, 17, 19, alpha), width=int(w * SS))


def tracked(base, txt, x, y, size, color, track, align="left"):
    d = ImageDraw.Draw(base)
    f = L.tk._pil(L.SG_B, size)
    w = sum(d.textlength(c, font=f) / SS for c in txt) + track * (len(txt) - 1)
    if align == "right":
        x -= w
    elif align == "center":
        x -= w / 2
    for c in txt:
        d.text((x * SS, y * SS), c, font=f, fill=(*color, 255), anchor="ls")
        x += d.textlength(c, font=f) / SS + track
    return w


def block_h(n, size, lead):
    return (n - 1) * size * lead + size * 1.02


def line_w(toks, size, fonts):
    gap = size * 0.22
    return sum(L.twidth(t, fonts[w], size) for t, w, _ in toks) + gap * (len(toks) - 1)


def geo_edge(lines, edge, top, size, lead, fonts, rtl):
    out, y = [], top
    for toks in lines:
        total = line_w(toks, size, fonts)
        x0 = (edge - total) if rtl else edge
        out.append((y, x0, x0 + total))
        y += size * lead
    return out


def draw_edge(base, lines, edge, geo, size, fonts, rtl):
    gap = size * 0.22
    for i, toks in enumerate(lines):
        total = line_w(toks, size, fonts)
        cx = (edge - total / 2) if rtl else (edge + total / 2)
        L.hline(base, toks, cx, geo[i][0], size, gap=gap, fonts=fonts, rtl=rtl)


def kicker_at(base, spec, x, y, rtl, fonts, size=30, align=None):
    lab = spec["kicker"].rstrip(":： ").strip()
    if rtl:
        L.tdraw(base, lab, x, y, size, L.VIO, fonts["b"],
                align=align or ("right" if x > W / 2 else "left"))
    else:
        tracked(base, lab.upper(), x, y, 21, L.VIO, 3.2,
                align=align or ("left" if x < W / 2 else "right"))


def pill_row(base, items, y, x_start, rtl, pf, gap=26, fills=None):
    for i, it in enumerate(items):
        it = dict(it)
        fnt = L.PILL_FONT[it.get("font", "ar")] if it.get("font") else pf
        ps = it.get("size", 26)
        pw, ph = L.pill_size(it["t"], ps, it.get("icon", "target"), fnt)
        rw = pw - 0.5 * ps
        cx = (x_start - rw / 2) if rtl else (x_start + rw / 2)
        L.pill(base, it["t"], cx, y, it.get("rot", -5 if i % 2 == 0 else 4),
               ps, it.get("fill", L.VIO_SOFT), L.INK,
               it.get("icon", "target"), fnt)
        x_start += (-rw - gap) if rtl else (rw + gap)


def fit_custom(spec, fonts, rtl, maxw, maxh, lead=1.26, cap=168):
    n = len(spec["lines"])
    best = 40
    for sz in range(40, cap + 1, 2):
        if max(line_w(t, sz, fonts) for t in spec["lines"]) > maxw:
            break
        if (n - 1) * sz * lead + 1.02 * sz <= maxh:
            best = sz
    return best


# ── A · affiche ─────────────────────────────────────────────────────────
def var_a(spec, seed=3, rtl=True, fonts=None, page="", pf=None, size=132):
    base = L.paper(seed=seed)
    fonts = fonts or L.WEIGHT
    pf = pf or fonts["b"]
    lead = spec.get("lead", 1.24)

    L.wordmark(base, y=118, size=18)
    kicker_at(base, spec, (W - U) if rtl else U, 268, rtl, fonts)

    edge = (W - U) if rtl else U
    top = 462
    geo = geo_edge(spec["lines"], edge, top, size, lead, fonts, rtl)
    draw_edge(base, spec["lines"], edge, geo, size, fonts, rtl)

    items = list(spec.get("pills", ()))[:2]
    if items:
        pill_row(base, items, 1136, (W - U) if rtl else U, rtl, pf, gap=24)

    L.footer(base, page, rtl)
    return base


# ── B · carte pleine ───────────────────────────────────────────────────
def var_b(spec, seed=3, rtl=True, fonts=None, page="", pf=None, size=104):
    base = Image.new("RGB", (W * SS, H * SS), L.VIO).convert("RGBA")
    fonts = fonts or L.WEIGHT
    pf = pf or fonts["b"]
    lead = spec.get("lead", 1.22)
    card = (46, 150, W - 46, 1140)
    lay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ImageDraw.Draw(lay).rounded_rectangle(
        [card[0] * SS, card[1] * SS, card[2] * SS, card[3] * SS],
        radius=34 * SS, fill=(*L.CREAM, 255))
    base.alpha_composite(lay)

    L.wordmark(base, y=96, size=19, col=(238, 228, 255))
    kicker_at(base, spec, (W - 96) if rtl else 96, 244, rtl, fonts)

    n = len(spec["lines"])
    bh = block_h(n, size, lead)
    top = 300 + max(0.0, (1010 - 300 - bh) / 2)
    L.block(base, spec["lines"], W / 2, top, size, lead, fonts=fonts, rtl=rtl)

    items = list(spec.get("pills", ()))[:2]
    pos = [(card[0] + 138, card[3] - 92, -6, L.ORANGE, L.CREAM, "sound"),
           (card[2] - 164, card[3] - 42, 5, L.INK, L.CREAM, "spark")]
    for it, (cx, cy, rot, fill, fg, icon) in zip(items, pos):
        L.pill(base, it["t"], cx, cy, rot, it.get("size", 26), fill, fg, icon,
               L.PILL_FONT[it.get("font", "ar")] if it.get("font") else pf)

    rule(base, 1226, 92, W - 92, 90)
    cream = (238, 228, 255)
    if rtl:
        tracked(base, "SAWTIFY.SPACE", W - 92, 1268, 13, cream, 3.4, "right")
        tracked(base, page, 92, 1268, 13, cream, 3.2, "left")
    else:
        tracked(base, "SAWTIFY.SPACE", 92, 1268, 13, cream, 3.4, "left")
        tracked(base, page, W - 92, 1268, 13, cream, 3.2, "right")
    return base


COMPS = {"A": var_a, "B": var_b}
LIMITS = {"A": (972, 620), "B": None}

if __name__ == "__main__":
    for key, fn in COMPS.items():
        for pub in (L.DZ, L.FR):
            rtl = pub.get("rtl", True)
            fonts = pub.get("fonts") or L.WEIGHT
            if LIMITS[key]:
                mw, mh = LIMITS[key]
                shared = min(fit_custom(sp, fonts, rtl, mw, mh)
                             for sp in pub["slides"])
            else:
                shared = min(L.fit_size(sp, fonts, rtl) for sp in pub["slides"])
            d = OUT / f"v{key}" / pub["id"]
            d.mkdir(parents=True, exist_ok=True)
            for i, spec in enumerate(pub["slides"]):
                img = fn(spec, seed=pub["seed"] + i, rtl=rtl, fonts=fonts,
                         page=f"{i + 1:02d} / 05", pf=pub.get("pill_font"),
                         size=shared)
                img = img.convert("RGB").resize((W, H), Image.LANCZOS)
                img.save(d / f"{i + 1:02d}.jpg", quality=95, optimize=True,
                         subsampling=1)
            print(f"ok v{key} {pub['id']} ({shared} px)")
