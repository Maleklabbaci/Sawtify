#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════
 hooks.py — les 30 accroches de couverture, écrites pour convertir
───────────────────────────────────────────────────────────────────────────
 Chaque jour a UNE accroche, construite sur un levier de psychologie
 marketing explicite (`lever`) :

   perte       → aversion à la perte      : « كتخسّر », « ما يتباعش »
   curiosite   → béance d'information     : question sans réponse
   temps       → coût d'opportunité       : heures / jours gaspillés
   preuve      → preuve sociale           : +500, 1 شهادة > 10 إعلانات
   prix        → ancrage de prix          : 1000 دج, ×3, ربع الثمن
   erreur      → erreur à corriger        : « غلطة وحدة »
   gain        → bénéfice immédiat        : « في 30 ثانية »

 Règles de rédaction (non négociables) :
   • 2 lignes max dans `lines`, 4 mots max par ligne → lisible en vignette
   • un seul mot mis en **évidence** (rendu en orange) par couverture
   • `num` = le chiffre qui arrête le scroll (jamais décoratif)
   • `promise` = la preuve / le mode d'emploi, une ligne, ton neutre toi
   • darija algéroise (ياسر، واش، علاش، كيفاش، درك، صح)
═══════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

# clé = numéro de jour (1 → 30)
HOOKS: dict[int, dict] = {
    # ── J01 → J19 : sujets de la banque ───────────────────────────────────
    1:  {"kicker": "متاجر الملابس", "num": "3", "num_label": "أغلاط",
         "lines": ["3 أغلاط **كتقتل**", "إعلان متجرك."],
         "promise": "الغلطة الثالثة كيديروها 9 من 10 تجار",
         "lever": "perte"},
    2:  {"kicker": "الإلكترونيات · قبل / بعد", "num": "×2", "num_label": "نفس الفيديو",
         "lines": ["نفس الفيديو،", "بدّل **الصوت** فقط."],
         "promise": "الفرق اللي كيبدّل التحويل، بلا ما تعاود التصوير",
         "lever": "curiosite"},
    3:  {"kicker": "العيادات · دليل", "num": "5", "num_label": "دقايق",
         "lines": ["فيديو إعلاني كامل", "في **5 دقايق**."],
         "promise": "بلا ميكرو · بلا مونتاج · بلا تسنّى",
         "lever": "temps"},
    4:  {"kicker": "الخدمات الرقمية", "num": "2", "num_label": "لغات",
         "lines": ["دارجة ولا فصحى؟", "**الجواب** كيبدّل التحويل."],
         "promise": "شوف الفرق في 4 سلايدات",
         "lever": "curiosite"},
    5:  {"kicker": "الأكل والتوصيل", "num": "1 000", "num_label": "دج",
         "lines": ["شحال كتكلّفك", "التعليق **الصوتي**؟"],
         "promise": "الحساب اللي 9 من 10 مطاعم ما كيديروهش",
         "lever": "prix"},
    6:  {"kicker": "التكوين والدروس", "num": "4", "num_label": "أفكار",
         "lines": ["4 أفكار فيديو", "تجيب **المشاهدات**."],
         "promise": "كل واحدة تتصوّر اليوم، بتليفونك",
         "lever": "gain"},
    7:  {"kicker": "عالم الأطفال", "num": "1", "num_label": "نصيحة",
         "lines": ["نصيحة وحدة،", "وتبيع **ياسر**."],
         "promise": "ما تبدّلش الإعلان، بدّل الصوت",
         "lever": "gain"},
    8:  {"kicker": "متاجر التجميل", "num": "3", "num_label": "أساطير",
         "lines": ["3 حوايج كيقولوهم", "وكلش **غالط**."],
         "promise": "الأسطورة الأولى كتخسّرك أكثر من غيرها",
         "lever": "erreur"},
    9:  {"kicker": "العقارات", "num": "1", "num_label": "ساعة",
         "lines": ["أسبوع محتوى كامل", "في **ساعة** وحدة."],
         "promise": "5 فيديوهات · صوت واحد · نشر مبرمج",
         "lever": "temps"},
    10: {"kicker": "السيارات", "num": "3", "num_label": "ثواني",
         "lines": ["علاش كيثق", "في إعلان **بالدارجة**؟"],
         "promise": "الجواب كاين في أول 3 ثواني",
         "lever": "curiosite"},
    11: {"kicker": "متاجر الملابس · عرض", "num": "30", "num_label": "ثانية",
         "lines": ["إعلان عرض كامل", "في **30 ثانية**."],
         "promise": "النبرة المستعجلة كترفع التحويل — بشرط تكون واضحة",
         "lever": "gain"},
    12: {"kicker": "الإلكترونيات", "num": "1", "num_label": "غلطة",
         "lines": ["غلطة وحدة", "وإعلانك **ما يتباعش**."],
         "promise": "ماشي التصوير، ماشي السعر",
         "lever": "perte"},
    13: {"kicker": "العيادات والصحة", "num": "×3", "num_label": "في الثمن",
         "lines": ["كتخلّص على الصوت", "**3 مرات** أكثر."],
         "promise": "نفس الجودة، ربع الثمن",
         "lever": "prix"},
    14: {"kicker": "الخدمات الرقمية · سؤال", "num": "؟", "num_label": "قبل ما تخلّص",
         "lines": ["واش تقدر تعاود", "تستعمل الأوديو **في الإعلانات**؟"],
         "promise": "السؤال اللي كيسقسيه كل تاجر قبل ما يخلّص",
         "lever": "curiosite"},
    15: {"kicker": "الأكل والتوصيل", "num": "3", "num_label": "نبرات",
         "lines": ["3 نبرات حسب الجمهور،", "نبرة لكل **واحد**."],
         "promise": "نفس المنتج، صوت لكل واحد فيهم",
         "lever": "preuve"},
    16: {"kicker": "التكوين والدروس", "num": "72", "num_label": "ساعة",
         "lines": ["72 ساعة كتسنّى", "في **الفويس أوفر**."],
         "promise": "في الشهر، 3 أسابيع محتوى ضايعين",
         "lever": "temps"},
    17: {"kicker": "عالم الأطفال", "num": "1", "num_label": "شهادة",
         "lines": ["شهادة وحدة تقنع", "أكثر من **10 إعلانات**."],
         "promise": "والصوت هو اللي كيعطيها المصداقية",
         "lever": "preuve"},
    18: {"kicker": "متاجر التجميل", "num": "0", "num_label": "مبيعات",
         "lines": ["النبرة الغالطة", "كتقتل **المنتج**."],
         "promise": "كيفاش تختار النبرة في 30 ثانية",
         "lever": "perte"},
    19: {"kicker": "العقارات · ميزانية", "num": "1 000", "num_label": "دج",
         "lines": ["شحال من **فيديو**", "تقدر تصوّر؟"],
         "promise": "الجواب كيبدّل خطة المحتوى كاملة",
         "lever": "prix"},

    # ── J20 → J30 : série éditoriale ──────────────────────────────────────
    20: {"kicker": "3 أغلاط · متاجر DZ", "num": "3", "num_label": "أغلاط",
         "lines": ["الإعلان ماشي ضعيف،", "**الصوت** هو المشكل."],
         "promise": "3 أغلاط كيقتلو الإعلانات — وحلولهم",
         "lever": "erreur"},
    21: {"kicker": "دليل عملي", "num": "5", "num_label": "دقايق",
         "lines": ["فيديو إعلاني كامل", "في **5 دقايق**."],
         "promise": "بلا ميكرو · بلا مونتاج · من تليفونك",
         "lever": "gain"},
    22: {"kicker": "قائمة أفكار", "num": "5", "num_label": "أفكار",
         "lines": ["5 أفكار فيديو", "تجيب **المشاهدات**."],
         "promise": "كل فكرة تتصوّر اليوم، بالدارجة",
         "lever": "gain"},
    23: {"kicker": "الصوت والنبرة", "num": "1", "num_label": "اختيار",
         "lines": ["ماشي كل صوت", "يصلح **لكل فيديو**."],
         "promise": "كيفاش تختار النبرة في 30 ثانية، بلا تجارب فاشلة",
         "lever": "erreur"},
    24: {"kicker": "الدارجة ولا الفصحى", "num": "2", "num_label": "لغات",
         "lines": ["دارجة ولا فصحى", "في **الإعلانات**؟"],
         "promise": "الزبون كيثق في الصوت اللي يشبه لو",
         "lever": "curiosite"},
    25: {"kicker": "أول 3 ثواني", "num": "3", "num_label": "ثواني",
         "lines": ["أول 3 ثواني", "هي اللي **تحبس الإصبع**."],
         "promise": "بعدها الزبون قرّر: يكمل ولا يدوز",
         "lever": "perte"},
    26: {"kicker": "قبل / بعد", "num": "30", "num_label": "ثانية",
         "lines": ["من 3 أيام تسنّى", "لـ**30 ثانية**."],
         "promise": "نفس الجودة، بلا ميكرو وبلا مونتاج",
         "lever": "temps"},
    27: {"kicker": "حقوق تجارية", "num": "100", "num_label": "بالمية",
         "lines": ["واش تقدر تبيع", "الأوديو تاعك؟ **نعم**."],
         "promise": "حقوق كاملة مع كل توليد، بلا مصاريف مخفية",
         "lever": "preuve"},
    28: {"kicker": "تنظيم المحتوى", "num": "1", "num_label": "ساعة",
         "lines": ["أسبوع محتوى كامل", "في **ساعة** وحدة."],
         "promise": "بلا تصوير كل نهار، وبلا ما تنسى واش تنشر",
         "lever": "temps"},
    29: {"kicker": "المصداقية", "num": "1", "num_label": "غلطة",
         "lines": ["غلطة وحدة كتخلي", "إعلانك يبان **مزيّف**."],
         "promise": "ماشي التصوير، ماشي السعر: الصوت المثالي ياسر",
         "lever": "perte"},
    30: {"kicker": "الثقة", "num": "+500", "num_label": "تاجر",
         "lines": ["+500 صانع محتوى", "يثقو **فينا**."],
         "promise": "نفس جودة الاستوديو، بالدارجة، في 30 ثانية",
         "lever": "preuve"},
}

# rotation des 4 mises en page de couverture : jamais deux jours de suite pareils
HOOK_LAYOUTS = ["numeral", "statement", "ticket", "split"]
LEVERS_FR = {
    "perte": "aversion à la perte", "curiosite": "béance d'information",
    "temps": "coût d'opportunité", "preuve": "preuve sociale",
    "prix": "ancrage de prix", "erreur": "erreur à corriger",
    "gain": "bénéfice immédiat",
}


def for_day(day: int) -> dict:
    h = HOOKS[day]
    return dict(h, layout=HOOK_LAYOUTS[(day - 1) % len(HOOK_LAYOUTS)])


if __name__ == "__main__":
    import collections
    c = collections.Counter(h["lever"] for h in HOOKS.values())
    print(f"{len(HOOKS)} accroches · leviers : {dict(c)}")
    for d, h in HOOKS.items():
        bad = [l for l in h["lines"] if len(l.replace("**", "").split()) > 4]
        if bad:
            print(f"  ⚠ J{d:02d} ligne trop longue : {bad}")
    print("layouts :", collections.Counter(LAYOUTS for LAYOUTS in
          [HOOK_LAYOUTS[(d - 1) % 4] for d in HOOKS]))
