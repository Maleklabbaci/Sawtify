#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
variants.py — 3 directions de couverture pour Sawtify (crème + typo Amiri).

    python3 variants.py

Sortie : slides/variants/A-cadre.jpg · B-affiche.jpg · C-photo.jpg
         + slides/variants/planche.jpg
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

from sawtify_ig import ar_para, font
from simple import (AM_B, AM_R, CREAM, GROT_B, GROT_M, H, INK, LINE, M, MUT,
                    ORANGE, SERIF_IT, SS, VIO, VIO_D, W, ar_center, ital, lat,
                    layer, mascot, rule, tw)

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "slides" / "variants"
PH = ROOT / "photos"

TAG = "سلسلة البيع 01"
TITLE = "أول سوم تسمعو، هو اللي يبقى في راسك."
EN = "anchoring."
SUB = "علاش 500 دج تبان رخيصة كي تجي بعد 3000، و تبان غالية كي تجي بوحدها."


def base_cream():
    return Image.new("RGBA", (W * SS, H * SS), (*CREAM, 255))


def wordmark(b, color=VIO):
    lat(b, "sawtify", W / 2, 104, 23, color, GROT_B, anchor="ms", track=7.5)


def chip(b, text, cx, y, fg=CREAM, bg=ORANGE, size=19):
    w = tw(text, AM_B, size) + 72
    h = size * 1.42 + 28
    ImageDraw.Draw(b).rectangle([(cx - w / 2) * SS, (y - h) * SS,
                                 (cx + w / 2) * SS, y * SS], fill=(*bg, 255))
    lay = layer()
    ar_para(lay, cx + w, y - h + 14, text, size, AM_B, fg, max_w=w + 60,
            leading=1.2, hi_color=fg)
    bb = lay.getbbox()
    if bb:
        img = lay.crop(bb)
        b.alpha_composite(img, (int((cx - img.width / 2 / SS) * SS), bb[1]))
    return y


# ───────────────────────────────────────────────────────── A · éditorial cadré
def variant_a():
    b = base_cream()
    d = ImageDraw.Draw(b)
    d.rectangle([36 * SS, 36 * SS, (W - 36) * SS, (H - 36) * SS],
                outline=(*VIO, 70), width=2)
    d.rectangle([50 * SS, 50 * SS, (W - 50) * SS, (H - 50) * SS],
                outline=(*VIO, 40), width=1)
    wordmark(b)
    ital(b, "n° 01 — le premier chiffre", W / 2, 196, 21, ORANGE)
    chip(b, TAG, W / 2, 272, CREAM, ORANGE)
    y = ar_center(b, TITLE, W / 2, 330, 78, INK, 860, AM_B, leading=1.32,
                  hi=VIO_D)
    lat(b, EN, W / 2, y + 62, 38, VIO_D, SERIF_IT, anchor="ms")
    rule(b, W / 2 - 40, W / 2 + 40, y + 108, VIO_D, 80, 1.4)
    y = ar_center(b, SUB, W / 2, y + 150, 21, MUT, 700, AM_R, leading=1.7,
                  hi=INK)
    mascot(b, W / 2, y + 110, 208)
    lat(b, "swipe", W - 96, H - 96, 10, MUT, GROT_M, anchor="rs", track=3.2)
    lat(b, "sawtify.space", 96, H - 96, 10, MUT, GROT_M, track=3.2)
    for i in range(5):
        cx = W / 2 - 48 + i * 24
        ImageDraw.Draw(b).ellipse([(cx - 4.5) * SS, (H - 104) * SS,
                                   (cx + 4.5) * SS, (H - 95) * SS],
                                  fill=(*(ORANGE if i == 0 else LINE), 255))
    return b


# ─────────────────────────────────────────────────────────── B · affiche violet
def variant_b():
    b = base_cream()
    d = ImageDraw.Draw(b)
    d.rectangle([0, 0, W * SS, 812 * SS], fill=(*VIO, 255))
    wordmark(b, CREAM)
    ital(b, "n° 01 — le premier chiffre", W / 2, 196, 21, (255, 214, 198))
    chip(b, TAG, W / 2, 268, CREAM, ORANGE)
    y = ar_center(b, TITLE, W / 2, 322, 72, CREAM, 860, AM_B, leading=1.34,
                  hi=(255, 214, 198))
    lat(b, EN, W / 2, y + 56, 36, (255, 214, 198), SERIF_IT, anchor="ms")
    rule(b, W / 2 - 40, W / 2 + 40, y + 100, CREAM, 110, 1.4)
    # mascotte posée sur le crème, juste sous la ligne de force
    mascot(b, W / 2, 856, 250, disc=False)
    y = ar_center(b, SUB, W / 2, 1060, 22, MUT, 700, AM_R, leading=1.7,
                  hi=INK)
    d.rounded_rectangle([M, (y + 44) * SS,
                         (W - M) * SS, (y + 116) * SS], radius=20 * SS,
                        fill=(*ORANGE, 255))
    ar_center(b, "خود الصوت تاعك", W / 2, y + 62, 25, CREAM, 600, AM_B,
              leading=1.2)
    lat(b, "500 DA · 24 H", 96, H - 74, 10.5, MUT, GROT_M, track=2.6)
    lat(b, "sawtify.space", W - 96, H - 74, 10.5, MUT, GROT_M, anchor="rs",
        track=2.6)
    return b


# ─────────────────────────────────────────────────────────────── C · photo
def variant_c():
    b = base_cream()
    wordmark(b)
    ital(b, "n° 01 — le premier chiffre", W / 2, 190, 21, ORANGE)
    y = ar_center(b, "أول سوم تسمعو، هو اللي يبقى في راسك.", W / 2, 244, 52,
                  INK, 860, AM_B, leading=1.2, hi=VIO_D)
    # photo en arche, teinte violette, centrée
    pw, ph = 520, 620
    x0, y0 = (W - pw) / 2, y + 60
    photo = Image.open(PH / "mic-hero.jpg").convert("RGB")
    s = max(pw / photo.width, ph / photo.height)
    photo = photo.resize((int(photo.width * s) + 1, int(photo.height * s) + 1),
                         Image.LANCZOS)
    photo = photo.crop((int((photo.width - pw) / 2),
                        int((photo.height - ph) / 2),
                        int((photo.width - pw) / 2) + pw,
                        int((photo.height - ph) / 2) + ph))
    tint = Image.new("RGB", (pw, ph), VIO_D)
    photo = Image.blend(photo.convert("RGB"), tint, 0.34)
    mask = Image.new("L", (pw * SS, ph * SS), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, pw * SS, ph * SS], radius=pw * SS // 2, corners=(True, True,
                                                               False, False),
        fill=255)
    b.paste(photo.resize((pw * SS, ph * SS), Image.LANCZOS),
            (int(x0 * SS), int(y0 * SS)), mask)
    # filet orange sous la photo
    rule(b, x0 + 40, x0 + pw - 40, y0 + ph + 30, ORANGE, 255, 2)
    y = ar_center(b, "صوت واحد، دارجة جزايرية، 500 دج.", W / 2, y0 + ph + 64,
                  21, MUT, 700, AM_R, leading=1.7)
    mascot(b, W / 2, y + 44, 132)
    lat(b, "voice, not noise", W / 2, y + 44 + 132 + 34, 9.5, MUT, GROT_M,
        anchor="ms", track=3.2)
    lat(b, "sawtify.space", W / 2, H - 74, 10.5, MUT, GROT_M, anchor="ms",
        track=2.6)
    lat(b, "500 DA · 24 H", 96, H - 74, 10.5, MUT, GROT_M, track=2.6)
    return b


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    imgs = []
    for name, fn, label in [("A-cadre", variant_a, "A · cadré"),
                            ("B-affiche", variant_b, "B · affiche"),
                            ("C-photo", variant_c, "C · photo")]:
        img = fn().convert("RGB").resize((W, H), Image.LANCZOS)
        img.save(OUT / f"{name}.jpg", quality=95, optimize=True,
                 subsampling=1)
        imgs.append((label, img))
        print("  ✓", name)
    sheet = Image.new("RGB", (3 * 546 + 12, 700), (30, 18, 56))
    for i, (label, img) in enumerate(imgs):
        sheet.paste(img.resize((540, 675), Image.LANCZOS), (8 + i * 546, 12))
    sheet.save(OUT / "planche.jpg", quality=94, optimize=True)
    print("  ✓ planche.jpg")


if __name__ == "__main__":
    main()
