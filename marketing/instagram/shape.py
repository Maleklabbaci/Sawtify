#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
shape.py — rendu arabe par HarfBuzz (n'importe quelle police moderne).

HarfBuzz découpe le texte en glyphes ; on crée une copie de la police dont la
cmap mappe une plage PUA (U+E000+) sur les glyphes, puis Pillow dessine chaque
glyphe à la position calculée par HarfBuzz.

    from shape import Shaper
    sh = Shaper("fonts/Cairo-Black.ttf")
    sh.draw(base, "نصنعو", x=540, y=300, size=96, fill=(20,20,30), align="center")
"""
from __future__ import annotations

from pathlib import Path

import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._c_m_a_p import CmapSubtable
from PIL import Image, ImageDraw, ImageFont

PUA = 0xE000
_cache: dict = {}


def _prepared(path: str):
    if path in _cache:
        return _cache[path]
    data = Path(path).read_bytes()
    face = hb.Face(data)
    hbfont = hb.Font(face)
    upem = face.upem

    tt = TTFont(path)
    order = tt.getGlyphOrder()
    n = min(len(order), 0xF8FF - PUA + 1)
    extra = {PUA + i: order[i] for i in range(n)}
    target = None
    for sub in tt["cmap"].tables:
        if sub.platformID == 3 and sub.format == 4:
            target = sub
            break
    if target is None:
        target = CmapSubtable.newSubtable(4)
        target.platformID, target.platEncID, target.language = 3, 1, 0
        tt["cmap"].tables.append(target)
    target.cmap.update(extra)
    out = Path("/tmp") / (Path(path).stem + "-pua.ttf")
    if not out.exists() or out.stat().st_mtime < Path(path).stat().st_mtime:
        tt.save(str(out))

    _cache[path] = (str(out), hbfont, upem)
    return _cache[path]


class Shaper:
    def __init__(self, path: str):
        self.path, self.hb, self.upem = _prepared(path)
        self._pil: dict = {}

    def font(self, size: float) -> ImageFont.FreeTypeFont:
        key = round(size * 2) / 2  # demi-points
        if key not in self._pil:
            self._pil[key] = ImageFont.truetype(self.path, key)
        return self._pil[key]

    def run(self, text: str, size: float):
        """[(char, dx, dy)], largeur totale (px)."""
        buf = hb.Buffer()
        buf.add_str(text)
        buf.guess_segment_properties()
        hb.shape(self.hb, buf, {"kern": True, "liga": True, "calt": True,
                                "mark": True, "mkmk": True})
        k = size / self.upem
        out, pen = [], 0.0
        for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
            out.append((chr(PUA + info.codepoint), pen + pos.x_offset * k,
                        pos.y_offset * k))
            pen += pos.x_advance * k
        return out, pen

    def width(self, text: str, size: float) -> float:
        return self.run(text, size)[1]

    def draw(self, base, text: str, x: float, y: float, size: float, fill,
             align: str = "left", ss=2):
        glyphs, w = self.run(text, size)
        if align == "center":
            pen = x - w / 2
        elif align == "right":
            pen = x - w
        else:
            pen = x
        d = ImageDraw.Draw(base)
        f = self.font(size * ss)
        for ch, dx, dy in glyphs:
            d.text(((pen + dx) * ss, (y + dy) * ss), ch, font=f, fill=fill,
                   anchor="ls")
        return w


if __name__ == "__main__":
    from PIL import Image, ImageDraw
    W, H = 900, 500
    img = Image.new("RGB", (W * 2, H * 2), (245, 242, 234))
    d = ImageDraw.Draw(img)
    sh = Shaper("/home/user/Sawtify/marketing/instagram/fonts/Cairo-Black.ttf")
    sh.draw(img, "نصنعو أصوات تبيع", 900, 260, 96, (24, 18, 38), "center")
    sh.draw(img, "بالدارجة، من الفكرة حتى التسليم.", 900, 420, 52, (109, 39, 234), "center")
    img.resize((W, H), Image.LANCZOS).save("/home/user/test-shape.png")
    print("ok")
