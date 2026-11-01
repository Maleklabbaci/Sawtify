#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
typekit.py — vrai rendu de texte arabe (HarfBuzz) pour Pillow.

Pillow du sandbox n'a pas Raqm : impossible de dessiner de l'arabe correctement
sans passer par les formes de présentation (et donc sans se limiter à quelques
polices). Ici :

 1. HarfBuzz découpe le texte en glyphes (liaisons, formes contextuelles,
    crénage, marques).
 2. Une copie de la police est créée avec une cmap Unicode privée (U+E000+)
    qui pointe directement sur les identifiants de glyphes.
 3. On dessine glyphe par glyphe à la position donnée par HarfBuzz.

Résultat : n'importe quelle police arabe moderne (Cairo, Rubik, Alexandria…)
se dessine correctement.
"""
from __future__ import annotations

from pathlib import Path

import re

import uharfbuzz as hb
from fontTools.ttLib import TTFont
from PIL import ImageDraw, ImageFont

FONT_DIR = Path(__file__).resolve().parent / "fonts"
PUA_DIR = FONT_DIR / "_pua"
SS = 2

_hb_cache: dict = {}
_pil_cache: dict = {}
_pua_cache: dict = {}

FEATURES = {"kern": True, "liga": True, "calt": True, "mark": True,
            "mkmk": True, "rlig": True}

ARABC = re.compile(r"[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]")


def pua_path(name: str) -> Path:
    """Copie de la police dont la cmap privée pointe sur les glyphes."""
    if name in _pua_cache:
        return _pua_cache[name]
    src = FONT_DIR / name
    PUA_DIR.mkdir(exist_ok=True)
    dst = PUA_DIR / name
    if not dst.exists() or dst.stat().st_mtime < src.stat().st_mtime:
        f = TTFont(str(src))
        order = f.getGlyphOrder()
        cmap = f["cmap"]
        tables = [t for t in cmap.tables
                  if (t.platformID, t.platEncID) in ((3, 1), (3, 10), (0, 3), (0, 4))]
        if not tables:
            tables = [cmap.tables[0]]
        for i, gname in enumerate(order):
            cp = 0xE000 + i
            if cp <= 0xF8FF:
                for t in tables:
                    t.cmap[cp] = gname
        f.save(str(dst))
    _pua_cache[name] = dst
    return dst


def _hb(name: str):
    if name not in _hb_cache:
        blob = hb.Blob.from_file_path(str(FONT_DIR / name))
        face = hb.Face(blob)
        font = hb.Font(face)
        font.scale = (face.upem, face.upem)
        _hb_cache[name] = (face, font)
    return _hb_cache[name]


def _pil(name: str, size: float) -> ImageFont.FreeTypeFont:
    px = max(4, int(round(size * SS)))
    key = (name, px)
    if key not in _pil_cache:
        _pil_cache[key] = ImageFont.truetype(str(pua_path(name)), px)
    return _pil_cache[key]


RUNS = re.compile(r"([\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF"
                  r"\u060C\u061B\u061F]+)")


def _shape(text: str, name: str, size: float, rtl: bool):
    face, hbfont = _hb(name)
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    buf.direction = "rtl" if rtl else "ltr"
    if rtl:
        buf.script = "Arab"
    hb.shape(hbfont, buf, FEATURES)
    k = size / face.upem
    out, width = [], 0.0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        out.append((chr(0xE000 + info.codepoint), pos.x_offset * k,
                    pos.y_offset * k, pos.x_advance * k, pos.y_advance * k))
        width += pos.x_advance * k
    return out, width


def layout(text: str, name: str, size: float):
    """Mise en page bidirectionnelle (python-bidi + HarfBuzz par segment)."""
    if not ARABC.search(text):
        return _shape(text, name, size, False)
    from bidi.algorithm import get_display
    vis = get_display(text, base_dir="R")
    segments, i = [], 0
    for m in re.finditer(r"[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF"
                         r"\uFE70-\uFEFF]+", vis):
        if m.start() > i:
            segments.append((vis[i:m.start()], False))
        segments.append((m.group(0)[::-1], True))
        i = m.end()
    if i < len(vis):
        segments.append((vis[i:], False))
    glyphs, total = [], 0.0
    for seg, rtl in segments:
        g, w = _shape(seg, name, size, rtl)
        glyphs += g
        total += w
    return glyphs, total


def width(text: str, name: str, size: float) -> float:
    return layout(text, name, size)[1]


def draw(base, text: str, x: float, y: float, size: float, fill,
         name: str, align: str = "center", track: float = 0.0):
    """Dessine `text` avec sa ligne de base en y.

    align : "center" (x = centre), "right" (x = bord droit), "left".
    """
    glyphs, w = layout(text, name, size)
    if align == "center":
        pen = x - w / 2
    elif align == "right":
        pen = x - w
    else:
        pen = x
    d = ImageDraw.Draw(base)
    f = _pil(name, size)
    for ch, dx, dy, adv, _vadv in glyphs:
        d.text(((pen + dx) * SS, (y - dy) * SS), ch, font=f, fill=fill,
               anchor="ls")
        pen += adv + track
    return w


def wrap(text: str, name: str, size: float, max_w: float):
    """Découpe en lignes (mots) qui tiennent dans max_w."""
    words = text.split()
    lines, cur = [], []
    for w_ in words:
        cand = " ".join(cur + [w_])
        if cur and width(cand, name, size) > max_w:
            lines.append(" ".join(cur))
            cur = [w_]
        else:
            cur.append(w_)
    if cur:
        lines.append(" ".join(cur))
    return lines


def paragraph(base, text: str, x: float, y: float, size: float, fill,
              name: str, max_w: float, leading: float = 1.55,
              align: str = "center"):
    """Paragraphe centré ; retourne la ligne de base de la ligne suivante."""
    for ln in wrap(text, name, size, max_w):
        draw(base, ln, x, y, size, fill, name, align)
        y += size * leading
    return y
