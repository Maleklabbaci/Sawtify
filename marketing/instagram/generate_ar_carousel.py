#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════
 Sawtify — carrousel Instagram « darija », thème clair (crème / violet)
───────────────────────────────────────────────────────────────────────────
 6 slides 1080×1350, mise en page RTL (tout est aligné à droite, lecteur
 audio en miroir). Le texte darija est lié et ordonné correctement.

   python3 generate_ar_carousel.py                 # tout
   python3 generate_ar_carousel.py --slides 1,6    # quelques slides
   python3 generate_ar_carousel.py --theme dark    # variante sombre
═══════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw

import sawtify_ig as ig
from sawtify_ig import (
    AR_BOLD, AR_REG, AR_SEMI, H, LATIN_BOLD, LATIN_MED, LATIN_REG, M, P, SS, W,
    ar_para, card, chip, cta_button, dot, footer, ghost_number, header, lat_line,
    player_mock, rrect, set_theme, sparkle, use_case_icon, visual,
)

ROOT = Path(__file__).resolve().parent
SLUG = "02-darija-clair"

# ── Slides ────────────────────────────────────────────────────────────────
def s_cover(base, s, i, n):
    w = chip(base, W - M, 246, s["chip"])
    y = ar_para(base, W - M, 312, s["title"], 88, AR_BOLD, P["text"], max_w=W - 2 * M, leading=1.30) + 30
    y = ar_para(base, W - M, y, s["sub"], 29, AR_REG, P["muted"], max_w=W - 2 * M - 10,
                leading=1.72) + 52
    player_mock(base, M, y, W - 2 * M)
    ay = y + 152 + 46
    rrect(base, (W - M - 64, ay, W - M, ay + 3), 2, fill=P["primary"])
    ar_para(base, W - M, ay + 22, s["kicker"], 20, AR_REG, P["faint"], max_w=W - 2 * M)


def s_problem(base, s, i, n):
    ghost_number(base, "01", W - 150, 250, 210)
    chip(base, W - M, 246, s["chip"])
    y = ar_para(base, W - M, 312, s["title"], 72, AR_BOLD, P["text"], max_w=W - 2 * M,
                leading=1.34, hi_color=P["pink"]) + 44
    for k, item in enumerate(s["items"]):
        cy = y + k * 150
        card(base, M, cy, W - 2 * M, 130, radius=24)
        # croix à droite
        cx_, cy_ = W - M - 58, cy + 65
        d = ImageDraw.Draw(base)
        d.ellipse([(cx_ - 24) * SS, (cy_ - 24) * SS, (cx_ + 24) * SS, (cy_ + 24) * SS],
                  fill=(*P["pink"], 26), outline=P["pink"], width=int(1.4 * SS))
        for ang in (45, -45):
            a = math.radians(ang)
            d.line([((cx_ - math.cos(a) * 9) * SS, (cy_ - math.sin(a) * 9) * SS),
                    ((cx_ + math.cos(a) * 9) * SS, (cy_ + math.sin(a) * 9) * SS)],
                   fill=P["pink"], width=int(2.6 * SS))
        d.text(((W - M - 100) * SS, (cy + 52) * SS), visual(item["k"]), font=ig.font(AR_BOLD, 30),
               fill=P["text"], anchor="rm")
        d.text(((W - M - 100) * SS, (cy + 92) * SS), visual(item["v"]), font=ig.font(AR_REG, 21),
               fill=P["muted"], anchor="rm")
    ar_para(base, W - M, y + 3 * 150 + 14, s["ar"], 30, AR_BOLD, P["primary"], max_w=W - 2 * M)


def s_solution(base, s, i, n):
    chip(base, W - M, 246, s["chip"])
    y = ar_para(base, W - M, 312, s["title"], 80, AR_BOLD, P["text"], max_w=W - 2 * M, leading=1.30) + 28
    y = ar_para(base, W - M, y, s["sub"], 28, AR_REG, P["muted"], max_w=W - 2 * M, leading=1.75) + 46
    for k, label in enumerate(s["bullets"]):
        cy = y + k * 102
        card(base, M, cy, W - 2 * M, 84, radius=20)
        sparkle(base, W - M - 44, cy + 42, 13, P["primary"])
        ImageDraw.Draw(base).text(((W - M - 80) * SS, (cy + 44) * SS), visual(label),
                                  font=ig.font(AR_SEMI, 26), fill=P["text"], anchor="rm")
    ar_para(base, W - M, y + 3 * 102 + 20, s["ar"], 30, AR_BOLD, P["primary"], max_w=W - 2 * M)


def s_steps(base, s, i, n):
    chip(base, W - M, 240, s["chip"])
    y = ar_para(base, W - M, 302, s["title"], 76, AR_BOLD, P["text"], max_w=W - 2 * M, leading=1.30) + 46
    for k, step in enumerate(s["steps"]):
        cy = y + k * 184
        card(base, M, cy, W - 2 * M, 158, radius=26, accent=(k == 0))
        d = ImageDraw.Draw(base)
        d.text(((W - M - 42) * SS, (cy + 62) * SS), f"0{k+1}", font=ig.font(LATIN_BOLD, 44),
               fill=P["primary"], anchor="rm")
        d.text(((W - M - 124) * SS, (cy + 54) * SS), visual(step["t"]), font=ig.font(AR_BOLD, 30),
               fill=P["text"], anchor="rm")
        d.text(((W - M - 124) * SS, (cy + 102) * SS), visual(step["d"]), font=ig.font(AR_REG, 21),
               fill=P["muted"], anchor="rm")
        if k < len(s["steps"]) - 1:
            d.line([((W - M - 56) * SS, (cy + 162) * SS), ((W - M - 56) * SS, (cy + 184) * SS)],
                   fill=(*P["primary"], 90), width=int(2 * SS))
    ar_para(base, W - M, y + 3 * 184 + 6, s["ar"], 29, AR_BOLD, P["primary"], max_w=W - 2 * M)


def s_usecases(base, s, i, n):
    icons = ["shop", "phone", "megaphone", "headphones"]
    chip(base, W - M, 240, s["chip"])
    y = ar_para(base, W - M, 302, s["title"], 68, AR_BOLD, P["text"], max_w=W - 2 * M, leading=1.34) + 40
    cols, gap = 2, 18
    cw = (W - 2 * M - gap) / cols
    for k, item in enumerate(s["items"]):
        col, row = k % cols, k // cols
        cx = W - M - cw - col * (cw + gap)      # RTL : première carte à droite
        cy = y + row * 158
        card(base, cx, cy, cw, 140, radius=24)
        use_case_icon(base, cx + cw - 40, cy + 44, icons[k % 4])
        d = ImageDraw.Draw(base)
        d.text(((cx + cw - 26) * SS, (cy + 86) * SS), visual(item["t"]), font=ig.font(AR_BOLD, 25),
               fill=P["text"], anchor="rm")
        d.text(((cx + cw - 26) * SS, (cy + 118) * SS), visual(item["d"]), font=ig.font(AR_REG, 18),
               fill=P["muted"], anchor="rm")
    qy = y + 2 * 158 + 16
    card(base, M, qy, W - 2 * M, 174, radius=26, accent=True)
    ImageDraw.Draw(base).text(((W - M - 30) * SS, (qy + 44) * SS), "»", font=ig.font(AR_BOLD, 44),
                              fill=P["primary"], anchor="rm")
    ar_para(base, W - M - 74, qy + 36, s["quote"], 30, AR_BOLD, P["text"], max_w=W - 2 * M - 130)
    ImageDraw.Draw(base).text(((M + 28) * SS, (qy + 148) * SS), visual(s["quote_by"]),
                              font=ig.font(AR_REG, 18), fill=P["muted"], anchor="lm")


def s_cta(base, s, i, n):
    sparkle(base, M + 34, 300, 22, P["accent"])
    sparkle(base, M + 96, 356, 11, P["primary"])
    sparkle(base, M + 40, 392, 7, P["pink"])
    sparkle(base, W - M - 36, 340, 13, P["accent"])

    # chip centré
    f = ig.font(AR_SEMI, 21)
    tw = ImageDraw.Draw(base).textlength(visual(s["chip"]), font=f) / SS
    cw_ = tw + 58
    chip(base, (W + cw_) / 2, 268, s["chip"])

    y = ar_para(base, W / 2 + (W - 2 * M) / 2, 340, s["title"], 82, AR_BOLD, P["text"],
                max_w=W - 2 * M, leading=1.30, align="center") + 26
    y = ar_para(base, W / 2 + (W - 2 * M) / 2, y, s["sub"], 28, AR_REG, P["muted"],
                max_w=W - 2 * M - 80, leading=1.75, align="center") + 52

    bw = 430
    cta_button(base, (W - bw) / 2, y, s["cta"], w=bw, h=86)
    lat_line(base, W / 2, y + 112, s["cta_note"], 20, LATIN_REG, P["faint"], align="center")

    by = y + 160
    scratch = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ar_bottom = ar_para(scratch, W / 2 + (W - 2 * M) / 2, 0, s["ar"], 34, AR_BOLD, P["text"],
                        max_w=W - 2 * M - 68, align="center")
    note_y = ar_bottom + 48
    bh = int(note_y + 44)
    card(base, M, by, W - 2 * M, bh, radius=28, accent=True)
    ar_para(base, W / 2 + (W - 2 * M) / 2, by + 30, s["ar"], 34, AR_BOLD, P["text"],
            max_w=W - 2 * M - 68, align="center")
    ar_para(base, W / 2 + (W - 2 * M) / 2, by + note_y, s["ar_note"], 19, AR_REG, P["muted"],
            max_w=W - 2 * M - 68, align="center")


RENDERERS = {
    "cover": s_cover, "problem": s_problem, "solution": s_solution,
    "steps": s_steps, "usecases": s_usecases, "cta": s_cta,
}

CARROUSEL = {
    "slug": SLUG,
    "name": "Carrousel 2 — Sawtify en darija (thème clair)",
    "caption": (
        "ولّي المحتوى تاعك يهدر بالدارجة الحقيقية 🎙️\n\n"
        "Sawtify يحوّل النص تاعك لتعليق صوتي بالدارجة، بجودة استوديو، في 30 ثانية — "
        "بلا ميكرو، بلا مونتاج، بلا ما تسنّى أيام.\n\n"
        "👉 سجّل في sawtify.space وخوذ 50 نقطة مجانية.\n\n"
        "#Sawtify #الدارجة #الجزائر #تعليق_صوتي #تجارة_إلكترونية #صناع_المحتوى"
    ),
    "slides": [
        {
            "type": "cover",
            "chip": "الدارجة  ·  الذكاء الاصطناعي  ·  الجزائر",
            "title": "ولّي المحتوى تاعك يهدر **بالدارجة** الحقيقية.",
            "sub": "أول محرك ذكاء اصطناعي يهدّر دارجة جزائرية أصيلة. صوت استوديو، بلا ميكرو، "
                   "بلا مونتاج، في 30 ثانية.",
            "kicker": "sawtify.space  ·  اسحب باش تشوف كيفاش",
        },
        {
            "type": "problem",
            "chip": "المشكل",
            "title": "التعليق الصوتي ياكل الوقت والدراهم.",
            "items": [
                {"k": "3000 دج", "v": "على كل تسجيل، ويتعاود في كل فيديو"},
                {"k": "48 إلى 72 ساعة", "v": "تسنّى قبل ما تقدر تنشر"},
                {"k": "كلش يتعاود", "v": "كي تبدّل جملة وحدة برك في النص"},
            ],
            "ar": "النتيجة: تنشر أقل، وتخسر زبائن.",
        },
        {
            "type": "solution",
            "chip": "الحل",
            "title": "نتا تكتب. و **Sawtify** يهدر.",
            "sub": "حطّ النص تاعك واختار الصوت: الأوديو يخرج بجودة استوديو، بالنبرة والكلمات تاعنا — "
                   "ماشي عربية فصحى كي التطبيقات لخرين.",
            "bullets": [
                "30 صوت رجال ونساء بالدارجة",
                "التوليد في أقل من 30 ثانية",
                "حقوق تجارية كاملة، بلا مصاريف مخفية",
            ],
            "ar": "صوت استوديو، بلا ميكرو، بلا مونتاج.",
        },
        {
            "type": "steps",
            "chip": "كيفاش يخدم",
            "title": "3 خطوات، 30 ثانية.",
            "steps": [
                {"t": "حطّ النص", "d": "نصك بالدارجة، بالفرنسية ولا بالعربية."},
                {"t": "اختار الصوت", "d": "راجل، مرا، نبرة تجارية ولا هادية."},
                {"t": "نزّل الأوديو", "d": "جاهز لتيك توك، ريلز ولا فيسبوك."},
            ],
            "ar": "انسخ. اختار صوت. نزّل.",
        },
        {
            "type": "usecases",
            "chip": "لمين؟",
            "title": "أداة وحدة، لكل الفورمات تاعك.",
            "items": [
                {"t": "متجر إلكتروني", "d": "إعلانات المنتجات"},
                {"t": "تيك توك / ريلز", "d": "تعليق 15 – 60 ثانية"},
                {"t": "فيسبوك Ads", "d": "سبوتات تبيع"},
                {"t": "تكوين ودروس", "d": "دروس وبودكاست"},
            ],
            "quote": "الناس يحسبوها بنت دزايرية تسجّل فالميكرو!",
            "quote_by": "— شيماء ب.، صانعة محتوى",
        },
        {
            "type": "cta",
            "chip": "ابدا اليوم",
            "title": "50 نقطة مجانية كي تسجّل.",
            "sub": "جرّب بلا ما تخلّص. بلا بطاقة بنكية، بلا التزام — تشحن كي تقتنع برك.",
            "cta": "sawtify.space",
            "cta_note": "الباقات تبدا من 500 دج",
            "ar": "سجّل اليوم، وابدا تنشر بالدارجة.",
            "ar_note": "الدفع: إيداع ذهبي  ·  CIB  ·  SATIM",
        },
    ],
}


def render(carrousel, only_slides=None, theme="light"):
    set_theme(theme)
    out = ROOT / "slides" / carrousel["slug"]
    out.mkdir(parents=True, exist_ok=True)
    slides = carrousel["slides"]
    total = len(slides)
    paths = []
    for i, slide in enumerate(slides, start=1):
        if only_slides and i not in only_slides:
            continue
        img = ig.background()
        content = Image.new("RGBA", img.size, (0, 0, 0, 0))
        RENDERERS[slide["type"]](content, slide, i, total)

        top_limit, bottom_limit = 172, H - M - 54
        bbox = content.getbbox()
        if bbox:
            c_top, c_bottom = bbox[1] / SS, bbox[3] / SS
            h_content = c_bottom - c_top
            free = bottom_limit - top_limit
            shift = (top_limit + (free - h_content) / 2 - c_top) if h_content < free \
                else max(top_limit - c_top, bottom_limit - c_bottom)
            content = content.transform(content.size, Image.AFFINE, (1, 0, 0, 0, 1, -shift * SS),
                                        resample=Image.BICUBIC)

        layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        layer.alpha_composite(content)
        header(layer, i, total)
        footer(layer, i, total, hint=None if i == total else "اسحب  →")
        img.alpha_composite(layer)

        path = out / f"{i:02d}.png"
        img.convert("RGB").resize((W, H), Image.LANCZOS).save(path, optimize=True)
        paths.append(path)
        print(f"  ✓ {path.relative_to(ROOT)}")

    if paths:
        thumbs = [Image.open(p).resize((360, 450), Image.LANCZOS) for p in paths]
        cols = min(3, len(thumbs))
        rows = math.ceil(len(thumbs) / cols)
        sheet = Image.new("RGB", (cols * 360 + (cols + 1) * 16, rows * 450 + (rows + 1) * 16), (14, 10, 24))
        for k, t in enumerate(thumbs):
            sheet.paste(t, (16 + (k % cols) * (360 + 16), 16 + (k // cols) * (450 + 16)))
        sheet.save(out / "contact-sheet.png", optimize=True)
        print(f"  ✓ {(out / 'contact-sheet.png').relative_to(ROOT)}")


def main():
    ap = argparse.ArgumentParser(description="Carrousel Instagram Sawtify en darija")
    ap.add_argument("--slides", default=None, help="ex: 1,6")
    ap.add_argument("--theme", default="light", choices=["light", "dark"])
    args = ap.parse_args()
    only = {int(x) for x in args.slides.split(",")} if args.slides else None
    print(f"\n▶ {CARROUSEL['name']}  ({args.theme})")
    render(CARROUSEL, only, args.theme)


if __name__ == "__main__":
    main()
