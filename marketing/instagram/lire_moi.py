"""Reconstruit le LIRE-MOI du pack (structure dossiers, pas de ZIP)."""
from __future__ import annotations

import glob
import os
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "slides" / "carousel"
EX = HERE / "exports" / "carousel-nov-2026"
TITRES = {
    1: "الإعلان اللي يبيع", 2: "سكريبت في 3 جمل", 3: "بلا ميكرو", 4: "نبرة الراديو",
    5: "3 صور، 0 كلام", 6: "20 ثانية كافية", 7: "تسليم في 24 ساعة", 8: "ستوري بلا صوت",
    9: "قبل و بعد", 10: "5 أخطاء في التعليق", 11: "دارجة، ماشي فصحى",
    12: "واتساب الأعمال", 13: "بلاك فرايدي", 14: "مطعم و كافي", 15: "كوزمتيك",
    16: "العقار", 17: "الأعراس", 18: "بودكاست", 19: "تيك توك",
    20: "ستوديو ولا صوت؟", 21: "كيفاش تختار الصوت", 22: "جرّب قبل ما تخلّص",
    23: "أمر واضح", 24: "صوت في الحانوت", 25: "الثقة تتسمع", 26: "تكوين و مدارس",
    27: "التوصيل", 28: "مجوهرات و هدايا", 29: "شيك ليست قبل النشر",
    30: "مانيفستو سوتيفاي",
}


def main() -> int:
    folders = sorted(d for d in OUT.iterdir() if d.is_dir())
    lines = []
    for i, folder in enumerate(folders, start=1):
        n = len(glob.glob(str(folder / "0*.jpg")))
        day = f"{i:02d}-11"
        lines.append(f"J{i:02d} · {day} · {TITRES[i]} · **{n} slides**")
    total = sum(len(glob.glob(str(d / "0*.jpg"))) for d in folders)
    doc = f"""SAWTIFY · CARROUSELS LIÉS · NOVEMBRE 2026
Palette = celle de la plateforme : #faf9ff / #ede9fe / #6d28d9 / #8b5cf6 / #1a0f2e / #ff5e3a.
30 publications · {total} slides · 1080 × 1350 · darija algéroise · 4 à 8 slides chacune.

COMMENT C'EST RANGÉ (pas de ZIP)
  un dossier par jour  →  J01 · 01-11 · <titre>/01.jpg, 02.jpg, 03.jpg …
  les fichiers sont DANS L'ORDRE du carrousel : 01 = couverture, dernier = clôture
  chaque dossier contient aussi planche.jpg (les slides côte à côte, pour vérifier)

CE QUI LIE LES SLIDES
- le fil vertical à gauche + les pastilles : on voit la progression
- le compteur 01/07 en haut à droite, toujours à la même place
- la MÊME photo qui continue : le cadre descend dans l'image d'une slide à l'autre
- le numéro d'étape qui grandit (01 → 02 → 03), avec « ÉTAPE n/3 »
- les constats numérotés 01/03, 02/03, 03/03 dans trois mises en page différentes
- la phrase de liaison + « اسحب » en bas

CALENDRIER
{chr(10).join(lines)}

PRIX : 500 دج · CTA : sawtify.space
"""
    p = EX / "LIRE-MOI · carrousels liés.txt"
    p.write_text(doc, encoding="utf-8")
    print("✓", p.relative_to(HERE), f"({total} slides)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
