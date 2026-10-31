#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════
 export_formats.py — décline chaque carrousel en 3 formats Instagram
───────────────────────────────────────────────────────────────────────────
   • 4:5  1080×1350  → feed (déjà généré par generate_premium.py)
   • 1:1  1080×1080  → feed carré : le contenu est re-rendu et réduit pour tenir
   • 9:16 1080×1920  → story / reel : la slide 4:5 est posée sur un fond de marque

   python3 export_formats.py                 # carré + story pour toute la série
   python3 export_formats.py --only 5        # un carrousel
   python3 export_formats.py --formats story # un seul format
═══════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

import sawtify_ig as ig
import generate_premium as gp
from sawtify_ig import AR_REG, LATIN_BOLD, LATIN_MED, SS, font, rrect, visual

ROOT = Path(__file__).resolve().parent
SLIDES = ROOT / "slides"
STORY_W, STORY_H = 1080, 1920


# ── 1:1 ───────────────────────────────────────────────────────────────────
def render_square(carousel, only=None) -> list[Path]:
    """Re-rend les slides sur un canevas 1080×1080 (mise en page recalculée)."""
    ig.set_canvas(1080, 1080)
    out = SLIDES / carousel["slug"] / "square"
    out.mkdir(parents=True, exist_ok=True)
    gp.render(carousel, only, out_dir=out)
    ig.set_canvas(1080, 1350)          # on rend le canevas standard
    return sorted(out.glob("[0-9][0-9].png"))


# ── 9:16 ──────────────────────────────────────────────────────────────────
def story_canvas(dark: bool) -> Image.Image:
    """Fond de story 1080×1920 (dégradé de marque + halos + grain), en résolution finale."""
    ig.set_theme("dark" if dark else "light")      # sinon le thème de la slide précédente fuit
    ig.set_canvas(STORY_W, STORY_H)
    big = gp.violet_bg(1) if dark else ig.background()
    ig.set_canvas(1080, 1350)
    return big.convert("RGB").resize((STORY_W, STORY_H), Image.LANCZOS)


def _pill(canvas: Image.Image, box, radius: int, fill, outline=None, width=1):
    """Pilule dessinée sur un calque puis composée (sinon l'alpha remplace le fond)."""
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle(box, radius=radius, fill=fill,
                                           outline=outline, width=width)
    canvas.alpha_composite(layer)


def _fnt(name: str, size: int):
    """Police en pixels finaux (sans supersampling)."""
    return ImageFont.truetype(str(ig.FONT_DIR / name), size)


def compose_story(slide_path: Path, dark: bool, index: int, total: int,
                  handle: str = "sawtify.space") -> Image.Image:
    """Pose la slide 4:5 centrée sur un fond de story, avec ombre, compteur et lien."""
    canvas = story_canvas(dark).convert("RGBA")
    card = Image.open(slide_path).convert("RGBA")

    scale = 0.88
    w, h = int(card.width * scale), int(card.height * scale)
    card = card.resize((w, h), Image.LANCZOS)
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1], radius=30, fill=255)
    card.putalpha(mask)

    x = int((STORY_W - w) // 2)
    y = int((STORY_H - h) // 2 - 10)

    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [x + 4, y + 22, x + w - 4, y + h + 22], radius=30,
        fill=(0, 0, 0, 110 if dark else 50))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(16)))
    canvas.alpha_composite(card, (x, y))

    d = ImageDraw.Draw(canvas)

    # (pas de compteur en plus : la slide porte déjà le sien)
    d = ImageDraw.Draw(canvas)

    # ── lien sous la carte
    f2 = _fnt("SpaceGrotesk-Bold.ttf", 26)
    tw2 = int(d.textlength(handle, font=f2) + 60)
    bx = int((STORY_W - tw2) / 2)
    by = int(y + h + 40)
    _pill(canvas, [bx, by, bx + tw2, by + 62], 31,
          (255, 255, 255, 250) if not dark else (255, 255, 255, 235),
          (255, 255, 255, 120), 2)
    d = ImageDraw.Draw(canvas)
    d.text((STORY_W // 2, by + 32), handle, font=f2, fill=(74, 22, 130), anchor="mm")

    # ── invitation
    f3 = _fnt("IBMPlexSansArabic-Regular.ttf", 24)
    d.text((STORY_W // 2, by + 106), visual("اسحب للفوق"),
           font=f3, fill=(96, 80, 116) if not dark else (236, 226, 255), anchor="mm")
    return canvas


def render_story(carousel, only=None) -> list[Path]:
    src_dir = SLIDES / carousel["slug"]
    out = src_dir / "story"
    out.mkdir(parents=True, exist_ok=True)
    total = len(carousel["slides"])
    paths = []
    for i in range(1, total + 1):
        if only and i not in only:
            continue
        src = src_dir / f"{i:02d}.png"
        if not src.exists():
            continue
        dark = carousel["slides"][i - 1]["type"] in gp.DARK
        img = compose_story(src, dark, i, total)
        path = out / f"{i:02d}.png"
        img.convert("RGB").save(path, optimize=True)
        paths.append(path)
        print(f"  ✓ {path.relative_to(ROOT)}")
    return paths


# ── planche de contrôle ───────────────────────────────────────────────────
def contact_sheet(folder: Path, thumb=(300, 300)) -> None:
    files = sorted(folder.glob("[0-9][0-9].png"))
    if not files:
        return
    cols = min(3, len(files))
    rows = math.ceil(len(files) / cols)
    tw, th = thumb
    sheet = Image.new("RGB", (cols * tw + (cols + 1) * 14, rows * th + (rows + 1) * 14), (12, 9, 18))
    for k, p in enumerate(files):
        im = Image.open(p)
        im.thumbnail((tw, th), Image.LANCZOS)
        x = 14 + (k % cols) * (tw + 14)
        y = 14 + (k // cols) * (th + 14)
        sheet.paste(im, (x + (tw - im.width) // 2, y + (th - im.height) // 2))
    sheet.save(folder / "contact-sheet.png", optimize=True)
    print(f"  ✓ {(folder / 'contact-sheet.png').relative_to(ROOT)}")


def main():
    ap = argparse.ArgumentParser(description="Déclinaisons 1:1 et 9:16 des carrousels")
    ap.add_argument("--only", default=None, help="3 … 7")
    ap.add_argument("--formats", default="square,story", help="square,story")
    ap.add_argument("--slides", default=None, help="ex: 1,6")
    args = ap.parse_args()

    formats = {f.strip() for f in args.formats.split(",")}
    from generate_shorts import SHORTS
    ALL = list(gp.CARROUSELS) + list(SHORTS)
    selection = ALL
    if args.only:
        selection = [c for c in ALL if c["slug"].startswith(args.only.strip().zfill(2))]
        if not selection:
            raise SystemExit(f"Carrousel {args.only} introuvable")
    only = {int(x) for x in args.slides.split(",")} if args.slides else None

    for c in selection:
        print(f"\n▶ {c['name']}")
        if "square" in formats:
            print("  · 1:1 (1080×1080)")
            render_square(c, only)
            contact_sheet(SLIDES / c["slug"] / "square")
        if "story" in formats:
            print("  · 9:16 (1080×1920)")
            render_story(c, only)
            contact_sheet(SLIDES / c["slug"] / "story", thumb=(220, 390))


if __name__ == "__main__":
    main()
