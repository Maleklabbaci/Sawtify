#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════
 generate_shorts.py — carrousels courts (3 ou 4 slides) style premium
───────────────────────────────────────────────────────────────────────────
 Format court = 1 accroche + 1 ou 2 slides de valeur + 1 CTA.
 Idéal pour poster souvent : lecture en 3 secondes, swipe évident.

   python3 generate_shorts.py                  # les 6 carrousels courts
   python3 generate_shorts.py --only 9         # un seul
   python3 generate_shorts.py --bank 12,57     # depuis la banque de sujets (300)
   python3 generate_shorts.py --bank all --limit 20
═══════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

from PIL import Image

import generate_premium as gp
import qa
import sawtify_ig as ig

ROOT = Path(__file__).resolve().parent
SLIDES = ROOT / "slides"


def stats_slide(chip, title, stats, ar):
    return {"type": "stats", "chip": chip, "title": title, "stats": stats, "ar": ar}


# ═══════════════════════════════════════════════════════════════════════════
#  Les 6 carrousels courts
# ═══════════════════════════════════════════════════════════════════════════
SHORTS = [
    {
        "slug": "08-darija-ou-fusha",
        "name": "Carrousel 8 — دارجة ولا فصحى (3 slides)",
        "caption": (
            "الدارجة ولا الفصحى في الإعلانات؟ 🇩🇿\n\n"
            "الزبون كيثق في اللي يشبه لو. 3 slides وتهدر بالدارجة تاعك.\n\n"
            "👉 sawtify.space — 50 نقطة مجانية.\n\n"
            "#Sawtify #الدارجة #إعلانات #الجزائر #تعليق_صوتي"
        ),
        "slides": [
            {
                "type": "cover",
                "chip": "دارجة ولا فصحى",
                "title": "الدارجة ولا الفصحى في **الإعلانات**؟",
                "sub": "الزبون كيثق في الصوت اللي يشبه لو، ماشي في الصوت اللي يشبه للتلفزيون.",
                "player": "نفس النص · نبرتين",
                "player_meta": "00:12 · جودة استوديو",
                "ar": "اسحب باش تسمع الفرق.",
            },
            {
                "type": "compare",
                "chip": "الفرق",
                "title": "نفس العرض، إحساسين مختلفين.",
                "before": {
                    "label": "فصحى",
                    "rows": ["يحسّها بعيدة", "كلمات ما تهدّروش بها", "تفاعل ضعيف"],
                },
                "after": {
                    "label": "دارجة",
                    "rows": ["كيفاش تهدرو انت وزبونك", "كلمات من الزنقة", "تفاعل أقوى"],
                },
                "ar": "الصوت المحلي كيبني الثقة قبل ما يبدا العرض.",
            },
            {
                "type": "cta",
                "chip": "ابدا اليوم",
                "title": "ولّي إعلانك يهدر بالدارجة.",
                "sub": "30 صوت رجال ونساء، في 30 ثانية. 50 نقطة مجانية كي تسجّل.",
                "cta": "sawtify.space",
                "cta_note": "sawtify.space  ·  من 500 دج",
                "guarantees": [
                    {"icon": "mic", "t": "30 صوت"},
                    {"icon": "gift", "t": "50 نقطة"},
                    {"icon": "shield", "t": "حقوق تجارية"},
                ],
            },
        ],
    },
    {
        "slug": "09-premieres-secondes",
        "name": "Carrousel 9 — أول 3 ثواني (4 slides)",
        "caption": (
            "أول 3 ثواني هي اللي تحبس الإصبع ⏱️\n\n"
            "شحال من فيديو كتدوز عليه بلا ما تكمّل؟ السبب في الصوت والنبرة.\n\n"
            "👉 sawtify.space — 50 نقطة مجانية.\n\n"
            "#Sawtify #تيك_توك #ريلز #الدارجة #الجزائر"
        ),
        "slides": [
            {
                "type": "cover",
                "chip": "أول 3 ثواني",
                "title": "أول **3 ثواني** هي اللي تحبس الإصبع.",
                "sub": "بعد 3 ثواني، الزبون قرّر: يكمل ولا يدوز. والصوت هو اللي كيقرّر.",
                "player": "نموذج 3 ثواني",
                "player_meta": "00:03 · جودة استوديو",
                "ar": "اسحب باش تشوف الأغلاط.",
            },
            {
                "type": "list",
                "chip": "3 أغلاط",
                "title": "واش كيخسّر أول 3 ثواني.",
                "items": [
                    {"t": "بداية بطيئة", "v": "مقدمة طويلة بلا فايدة", "icon": "clock"},
                    {"t": "نبرة ميتة", "v": "بلا حماس، بلا إقناع", "icon": "mic"},
                    {"t": "موسيقى قوية", "v": "تغطّي الكلام والعرض", "icon": "headphones"},
                ],
            },
            stats_slide(
                "الأرقام",
                "علاش 3 ثواني كيبدّلو كلش.",
                [
                    {"v": "85%", "t": "يتفرّجو بلا صوت في الأول", "icon": "headphones"},
                    {"v": "3s", "t": "باش يقرّر يكمل", "icon": "clock"},
                    {"v": "+300%", "t": "تفاعل بالدارجة", "icon": "chart"},
                    {"v": "30s", "t": "باش يخرج الأوديو", "icon": "bolt"},
                ],
                "الفيديو اللي كيبدا بالعرض، كيبيع.",
            ),
            {
                "type": "cta",
                "chip": "ابدا اليوم",
                "title": "صلّح أول 3 ثواني اليوم.",
                "sub": "ولّد تعليق صوتي بالدارجة في 30 ثانية، وبلا ميكرو.",
                "cta": "sawtify.space",
                "cta_note": "sawtify.space  ·  من 500 دج",
                "guarantees": [
                    {"icon": "bolt", "t": "30 ثانية"},
                    {"icon": "gift", "t": "50 نقطة"},
                    {"icon": "shield", "t": "دفع آمن"},
                ],
            },
        ],
    },
    {
        "slug": "10-de-3-jours-a-30-secondes",
        "name": "Carrousel 10 — من 3 أيام لـ30 ثانية (3 slides)",
        "caption": (
            "من 3 أيام تسنّى… لـ30 ثانية ⚡\n\n"
            "نفس الجودة تاع الاستوديو، بلا ميكرو وبلا مونتاج، بالدارجة الجزائرية.\n\n"
            "👉 sawtify.space — 50 نقطة مجانية.\n\n"
            "#Sawtify #الدارجة #تعليق_صوتي #الجزائر #تجارة_إلكترونية"
        ),
        "slides": [
            {
                "type": "cover",
                "chip": "قبل / بعد",
                "title": "من **3 أيام** تسنّى… لـ30 ثانية.",
                "sub": "نفس الجودة، بلا ميكرو، بلا مونتاج، بلا مكالمات مع الفويس أوفر.",
                "player": "نموذج صوت",
                "player_meta": "00:12 · جودة استوديو",
                "ar": "اسحب باش تشوف الفرق.",
            },
            {
                "type": "compare",
                "chip": "الفرق",
                "title": "وين كتضيع الوقت والدراهم.",
                "before": {
                    "label": "قبل",
                    "rows": ["3 أيام انتظار", "3000 دج للفيديو", "كلش يتعاود"],
                },
                "after": {
                    "label": "مع Sawtify",
                    "rows": ["30 ثانية برك", "الباقة من 500 دج", "بدّل جملة وولّد من جديد"],
                },
                "ar": "نفس الميزانية، 4 مرات محتوى أكثر.",
            },
            {
                "type": "cta",
                "chip": "ابدا اليوم",
                "title": "جرّب Sawtify اليوم.",
                "sub": "50 نقطة مجانية كي تسجّل، بلا بطاقة بنكية وبلا التزام.",
                "cta": "sawtify.space",
                "cta_note": "sawtify.space  ·  من 500 دج",
                "guarantees": [
                    {"icon": "gift", "t": "50 نقطة"},
                    {"icon": "lock", "t": "بلا التزام"},
                    {"icon": "shield", "t": "دفع آمن"},
                ],
            },
        ],
    },
    {
        "slug": "11-droits-commerciaux",
        "name": "Carrousel 11 — حقوق الأوديو (4 slides)",
        "caption": (
            "واش تقدر تستعمل الأوديو في إعلانات مدفوعة؟ ✅\n\n"
            "حقوق تجارية كاملة مع كل توليد: تيك توك، فيسبوك، يوتيوب، بودكاست — بلا قيود.\n\n"
            "👉 sawtify.space — 50 نقطة مجانية.\n\n"
            "#Sawtify #الدارجة #حقوق_تجارية #إعلانات #الجزائر"
        ),
        "slides": [
            {
                "type": "cover",
                "chip": "حقوق الأوديو",
                "title": "واش تقدر تبيع الأوديو تاعك؟ **نعم**.",
                "sub": "حقوق تجارية كاملة مع كل توليد — بلا قيود وبلا مصاريف مخفية.",
                "player": "أوديو تجاري",
                "player_meta": "00:12 · جودة استوديو",
                "ar": "اسحب باش تشوف التفاصيل.",
            },
            {
                "type": "features",
                "chip": "3 ضمانات",
                "title": "واش كتضمن ليك Sawtify.",
                "items": [
                    {"t": "حقوق تجارية كاملة", "v": "استعملو في الإعلانات بلا قيود", "icon": "shield"},
                    {"t": "بلا مصاريف مخفية", "v": "خلّص النقاط وبرك", "icon": "wallet"},
                    {"t": "نقاط ما تنتهيش", "v": "استعملهم كي تحب", "icon": "clock"},
                ],
            },
            {
                "type": "pricing",
                "chip": "الباقات",
                "title": "اختار الباقة اللي تناسبك.",
                "packs": [
                    {"name": "100 نقطة", "note": "للتجربة · 5 تعليقات", "price": "500 دج"},
                    {"name": "220 نقطة", "note": "+20 نقطة مجانية", "price": "1000 دج", "hot": True},
                    {"name": "600 نقطة", "note": "+100 نقطة مجانية", "price": "2500 دج"},
                ],
                "ar": "الدفع: إيداع ذهبي · CIB · SATIM — النقاط ما تنتهيش.",
            },
            {
                "type": "cta",
                "chip": "ابدا اليوم",
                "title": "ابدا بلا مخاطر.",
                "sub": "50 نقطة مجانية كي تسجّل. جرّب قبل ما تشحن.",
                "cta": "sawtify.space",
                "cta_note": "sawtify.space  ·  من 500 دج",
                "guarantees": [
                    {"icon": "gift", "t": "50 نقطة"},
                    {"icon": "shield", "t": "حقوق تجارية"},
                    {"icon": "lock", "t": "بلا التزام"},
                ],
            },
        ],
    },
    {
        "slug": "12-semaine-de-contenu",
        "name": "Carrousel 12 — أسبوع محتوى في ساعة (4 slides)",
        "caption": (
            "أسبوع محتوى كامل في ساعة وحدة 🗓️\n\n"
            "5 أفكار، 5 أصوات متناسقة، ونشر مبرمج — بالدارجة ومع Sawtify.\n\n"
            "👉 sawtify.space — 50 نقطة مجانية.\n\n"
            "#Sawtify #الدارجة #صناع_المحتوى #الجزائر #تيك_توك"
        ),
        "slides": [
            {
                "type": "cover",
                "chip": "تنظيم",
                "title": "أسبوع محتوى كامل في **ساعة** وحدة.",
                "sub": "بلا ما تعاود التصوير كل نهار، وبلا ما تنسى واش تنشر.",
                "player": "5 أصوات · نفس النبرة",
                "player_meta": "00:12 · جودة استوديو",
                "ar": "اسحب باش تشوف الخطوات.",
            },
            {
                "type": "steps",
                "chip": "3 خطوات",
                "title": "هكّاك كتحضّر الأسبوع.",
                "items": [
                    {"t": "اكتب 5 أفكار", "v": "كل فكرة 15 ثانية", "icon": "sparkles"},
                    {"t": "ولّد 5 أصوات", "v": "نفس النبرة على كل الفيديوهات", "icon": "mic"},
                    {"t": "برمج النشر", "v": "أسبوع كامل جاهز", "icon": "layers"},
                ],
            },
            {
                "type": "list",
                "chip": "5 أفكار",
                "title": "5 أفكار تقدر تبدا بها.",
                "items": [
                    {"t": "قبل / بعد", "v": "ورّي الفرق", "icon": "video"},
                    {"t": "3 أسباب", "v": "باش يشري الزبون", "icon": "cart"},
                    {"t": "شهادة زبون", "v": "بصوت الزبون", "icon": "star"},
                    {"t": "سؤال وجواب", "v": "جاوب على اعتراض", "icon": "user"},
                    {"t": "عرض محدود", "v": "نبرة مستعجلة", "icon": "bolt"},
                ],
            },
            {
                "type": "cta",
                "chip": "ابدا اليوم",
                "title": "حضّر أسبوعك اليوم.",
                "sub": "50 نقطة مجانية كي تسجّل — يكفيوك لـ5 فيديوهات.",
                "cta": "sawtify.space",
                "cta_note": "sawtify.space  ·  من 500 دج",
                "guarantees": [
                    {"icon": "gift", "t": "50 نقطة"},
                    {"icon": "bolt", "t": "30 ثانية"},
                    {"icon": "shield", "t": "دفع آمن"},
                ],
            },
        ],
    },
    {
        "slug": "13-une-seule-erreur",
        "name": "Carrousel 13 — الغلطة الوحيدة (3 slides)",
        "caption": (
            "الغلطة اللي كتخلي إعلانك يبان «مزيّف» ⚠️\n\n"
            "ماشي التصوير وماشي السعر — الصوت المثالي ياسر كيخسّر المصداقية.\n\n"
            "👉 sawtify.space — 50 نقطة مجانية.\n\n"
            "#Sawtify #الدارجة #إعلانات #الجزائر #تعليق_صوتي"
        ),
        "slides": [
            {
                "type": "cover",
                "chip": "غلطة وحدة",
                "title": "غلطة وحدة كتخلي إعلانك يبان **مزيّف**.",
                "sub": "ماشي التصوير، ماشي السعر: الصوت المثالي ياسر.",
                "player": "نموذج صوت",
                "player_meta": "00:12 · جودة استوديو",
                "ar": "اسحب باش تشوف الحل.",
            },
            {
                "type": "features",
                "chip": "الحل",
                "title": "3 حوايج كيرجّعو المصداقية.",
                "items": [
                    {"t": "نبرة طبيعية", "v": "كيفاش تهدّر انت، ماشي مذيع", "icon": "mic"},
                    {"t": "دارجة حقيقية", "v": "كلمات الزنقة، بلا تكلّف", "icon": "globe"},
                    {"t": "جرّب 3 نسخ", "v": "واختار اللي كيخدم أكثر", "icon": "layers"},
                ],
            },
            {
                "type": "cta",
                "chip": "ابدا اليوم",
                "title": "خلّي الصوت تاعك طبيعي.",
                "sub": "30 صوت رجال ونساء بالدارجة. 50 نقطة مجانية كي تسجّل.",
                "cta": "sawtify.space",
                "cta_note": "sawtify.space  ·  من 500 دج",
                "guarantees": [
                    {"icon": "mic", "t": "30 صوت"},
                    {"icon": "gift", "t": "50 نقطة"},
                    {"icon": "lock", "t": "بلا التزام"},
                ],
            },
        ],
    },
]


# ── Rendu ─────────────────────────────────────────────────────────────────
def render_all(carousels, only_slides=None) -> list[Path]:
    # 1) QA des contenus AVANT de dessiner : on ne rend rien qui puisse bugger
    _, problems = qa.check_carousels(carousels)
    if problems:
        print("✗ QA a refusé le rendu :")
        for p in problems[:20]:
            print("   -", p)
        sys.exit(1)

    done: list[Path] = []
    for c in carousels:
        print(f"\n▶ {c['name']}")
        gp.render(c, only_slides)
        folder = SLIDES / c["slug"]
        files = sorted(folder.glob("[0-9][0-9].png"))
        for f in files:
            im = Image.open(f)
            if im.size != (ig.W, ig.H):
                print(f"  ✗ {f.name} : taille {im.size} au lieu de {(ig.W, ig.H)}")
                sys.exit(1)
        done += files
        # planche de contrôle
        thumbs = [Image.open(p).resize((360, 450), Image.LANCZOS) for p in files]
        cols = min(len(thumbs), 4) or 1
        rows = math.ceil(len(thumbs) / cols)
        sheet = Image.new("RGB", (cols * 360 + (cols + 1) * 16, rows * 450 + (rows + 1) * 16), (12, 9, 18))
        for k, t in enumerate(thumbs):
            sheet.paste(t, (16 + (k % cols) * (360 + 16), 16 + (k // cols) * (450 + 16)))
        sheet.save(folder / "contact-sheet.png", optimize=True)
        print(f"  ✓ {len(files)} slides · QA ok")
    return done


def main():
    ap = argparse.ArgumentParser(description="Carrousels courts Sawtify (3-4 slides)")
    ap.add_argument("--only", default=None, help="numéro du carrousel court (8 … 13)")
    ap.add_argument("--bank", default=None, help="ids de la banque : 12,57 ou all")
    ap.add_argument("--limit", type=int, default=12, help="nombre max de sujets de la banque")
    ap.add_argument("--slides", default=None, help="ex: 1,3")
    args = ap.parse_args()

    only_slides = {int(x) for x in args.slides.split(",")} if args.slides else None

    if args.bank:
        from topics import BANK, to_carousel
        if args.bank == "all":
            selection = BANK[: args.limit]
        else:
            ids = {int(x) for x in args.bank.replace(" ", "").split(",") if x}
            selection = [t for t in BANK if t["id"] in ids]
            if not selection:
                print(f"Aucun sujet avec les ids {sorted(ids)}")
                return
        render_all([to_carousel(t) for t in selection], only_slides)
        return

    selection = SHORTS
    if args.only:
        sel = args.only.strip().zfill(2)
        selection = [c for c in SHORTS if c["slug"].startswith(sel)]
        if not selection:
            print(f"Carrousel {args.only} introuvable (8 à 13)")
            return
    render_all(selection, only_slides)


if __name__ == "__main__":
    main()
