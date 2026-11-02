# -*- coding: utf-8 -*-
"""Programme éditorial 30 jours — Sawtify.

Un carrousel = 5 slides = 1 idée par slide, darija (dz) + français (fr).
Darija algérienne uniquement : « وخّد » et non « خد », « دير » et non « دار »,
« واش/كيفاش/علاش/درك/بزاف/تاع/ماشي/بلاش/يولي », jamais « ديال/دابا/بغيت/شنو/
غادي/برشا/بوريك ».
Compositions : « 1 » lettre · « A » affiche · « B » carte pleine.
"""
import lettre as L


def R(t):
    return (t, "r", None)


def B(t):
    return (t, "b", None)


def M(t):
    return (t, "b", "mark")


def pl(t, icon="target", size=26, rot=-5, font=None, anchor=None):
    d = {"t": t, "icon": icon, "size": size, "rot": rot}
    if font:
        d["font"] = font
    if anchor:
        d["anchor"] = anchor
    return d


DAYS = [
    # ── J01 · le problème ───────────────────────────────────────────────
    {"n": 1, "comp": "1", "theme": "Vidéo sans son",
     "dz": L.DZ["slides"], "fr": L.FR["slides"]},

    # ── J02 · le prix ───────────────────────────────────────────────────
    {"n": 2, "comp": "A", "theme": "Le prix",
     "dz": [
         dict(kicker="السوم،", lines=[[B("كل"), B("صوت")],
                                     [R("بـ"), M("20"), B("نقطة")],
                                     [R("يعني"), B("100"), B("دج.")]],
              pills=[pl("100 دج", "spark", 25, 4)]),
         dict(kicker="احسبها،", lines=[[M("500"), R("دج")],
                                      [R("تربح"), B("100"), B("نقطة")],
                                      [R("يعني"), B("5 أصوات.")]],
              pills=[pl("Starter", "target", 24, -5, "lat")]),
         dict(kicker="الباك الوسط،", lines=[[M("1000"), R("دج")],
                                          [R("تربح"), B("220"), B("نقطة")],
                                          [R("و"), B("+10 %"), R("هدية.")]],
              pills=[pl("Pro", "spark", 24, 5, "lat")]),
         dict(kicker="الباك الكبير،", lines=[[M("5000"), R("دج")],
                                           [R("تربح"), B("1350"), B("نقطة")],
                                           [R("الصوت"), B("يولي"), R("75 دج.")]],
              pills=[pl("Business", "target", 23, -4, "lat")]),
         dict(kicker="ابدا درك،", lines=[[R("دير"), B("حساب")],
                                       [R("خود"), M("50"), B("نقطة")],
                                       [B("بلاش.")]],
              pills=[pl("بلا اشتراك", "target", 25, -5)]),
     ],
     "fr": [
         dict(kicker="Le prix", lines=[[B("Une"), B("voix")],
                                      [R("= 20"), R("points")],
                                      [B("≈ 100 DA.")]],
              pills=[pl("sans abonnement", "target", 23, 4)]),
         dict(kicker="Le calcul", lines=[[M("500 DA")],
                                        [R("= 100"), R("points")],
                                        [B("= 5 voix.")]],
              pills=[pl("Starter", "spark", 23, -5, "lat")]),
         dict(kicker="Le pack Pro", lines=[[M("1 000 DA")],
                                          [R("= 220"), R("points")],
                                          [B("+10 % offerts.")]],
              pills=[pl("Pro", "target", 23, 5, "lat")]),
         dict(kicker="Les studios", lines=[[M("5 000 DA")],
                                          [R("= 1 350"), R("points")],
                                          [B("≈ 75 DA/voix.")]],
              pills=[pl("Business", "spark", 22, -4, "lat")]),
         dict(kicker="Commencez", lines=[[B("Inscrivez-vous,")],
                                        [M("50"), R("points")],
                                        [B("offerts.")]],
              pills=[pl("sans abonnement", "target", 23, -5)]),
     ]},

    # ── J03 · trois étapes ──────────────────────────────────────────────
    {"n": 3, "comp": "B", "theme": "Comment ça marche",
     "dz": [
         dict(kicker="الخطوة الأولى،", lines=[[R("حط")],
                                             [B("النص"), R("تاعك")],
                                             [R("حتى"), M("1200"), B("حرف.")]],
              pills=[pl("بلا ميكرو", "sound", 25, -6),
                     pl("كوبي", "target", 23, 5)]),
         dict(kicker="الخطوة الثانية،", lines=[[R("اختار")],
                                              [R("الصوت"), B("اللي")],
                                              [B("يعجبك.")]],
              pills=[pl("30 صوت", "sound", 25, -6),
                     pl("دارجة جزايرية", "target", 23, 5)]),
         dict(kicker="الخطوة الثالثة،", lines=[[R("حمّل")],
                                              [B("الملف"), R("في")],
                                              [M("30"), B("ثانية.")]],
              pills=[pl("MP3", "sound", 25, -6, "lat"),
                     pl("نزّل مباشرة", "target", 23, 5)]),
         dict(kicker="النتيجة،", lines=[[B("صوت")],
                                       [R("يوقّف")],
                                       [M("السكرول.")]],
              pills=[pl("بلا مونتاج", "sound", 25, -6),
                     pl("بلا استوديو", "target", 23, 5)]),
         dict(kicker="ابدا درك،", lines=[[R("دير")],
                                        [B("حساب"), R("و")],
                                        [B("جرّب.")]],
              pills=[pl("50 نقطة", "spark", 25, -6),
                     pl("بلا اشتراك", "target", 23, 5)]),
     ],
     "fr": [
         dict(kicker="Étape 1", lines=[[B("Copiez")],
                                      [R("votre"), B("texte,")],
                                      [R("d'où vous"), B("voulez.")]],
              pills=[pl("1 200 caractères", "target", 22, -6),
                     pl("sans micro", "sound", 22, 5)]),
         dict(kicker="Étape 2", lines=[[B("Choisissez")],
                                      [R("la voix"), B("qui")],
                                      [B("vous va.")]],
              pills=[pl("30 voix", "sound", 22, -6),
                     pl("darija DZ", "target", 22, 5)]),
         dict(kicker="Étape 3", lines=[[B("Téléchargez")],
                                      [R("le fichier"), R("en")],
                                      [M("30 s.")]],
              pills=[pl("MP3", "sound", 22, -6, "lat"),
                     pl("direct", "target", 22, 5)]),
         dict(kicker="Le résultat", lines=[[B("Une voix")],
                                          [R("qui arrête")],
                                          [M("le scroll.")]],
              pills=[pl("sans montage", "sound", 22, -6),
                     pl("sans studio", "target", 22, 5)]),
         dict(kicker="Commencez", lines=[[B("Créez")],
                                        [R("votre première")],
                                        [B("voix.")]],
              pills=[pl("50 points", "spark", 22, -6),
                     pl("sans abonnement", "target", 21, 5)]),
     ]},

    # ── J04 · 30 voix ───────────────────────────────────────────────────
    {"n": 4, "comp": "1", "theme": "Les 30 voix",
     "dz": [
         dict(kicker="الاختيار،", lines=[[M("30"), B("صوت")],
                                        [R("في"), B("موقع")],
                                        [B("واحد.")]],
              pills=[pl("رجال", "target", 24, -6),
                     pl("نساء", "sound", 24, 5)]),
         dict(kicker="اللغة،", lines=[[R("كلهم"), B("بالدارجة")],
                                     [B("الجزايرية.")]],
              pills=[pl("ar-DZ", "target", 24, -5, "lat")]),
         dict(kicker="الثبات،", lines=[[B("نفس"), R("الصوت")],
                                     [R("من"), B("أول")],
                                     [R("فيديو"), R("للآخر.")]],
              pills=[pl("بلا تغيير", "spark", 24, 5)]),
         dict(kicker="المرونة،", lines=[[R("بدّل"), B("الصوت")],
                                      [R("على حساب")],
                                      [B("المشهد.")]],
              pills=[pl("30 صوت", "sound", 24, -5)]),
         dict(kicker="جرّبهم درك،", lines=[[R("خود"), M("50"), B("نقطة")],
                                         [R("و"), B("دير")],
                                         [B("تجربة.")]],
              pills=[pl("sawtify.space", "spark", 23, 5, "lat")]),
     ],
     "fr": [
         dict(kicker="Le choix", lines=[[M("30"), B("voix")],
                                       [R("dans"), B("un")],
                                       [B("seul outil.")]],
              pills=[pl("hommes", "target", 22, -6),
                     pl("femmes", "sound", 22, 5)]),
         dict(kicker="La langue", lines=[[R("Toutes"), R("en")],
                                        [M("darija")],
                                        [B("algérienne.")]],
              pills=[pl("ar-DZ", "target", 22, -5, "lat")]),
         dict(kicker="La constance", lines=[[R("La même"), B("voix")],
                                           [R("du début")],
                                           [B("à la fin.")]],
              pills=[pl("cohérence", "spark", 22, 5)]),
         dict(kicker="La souplesse", lines=[[B("Changez"), R("de")],
                                           [R("voix"), R("selon")],
                                           [B("la scène.")]],
              pills=[pl("30 voix", "sound", 22, -5)]),
         dict(kicker="Testez-les", lines=[[B("Prenez")],
                                         [M("50"), R("points")],
                                         [B("offerts.")]],
              pills=[pl("sawtify.space", "spark", 21, 5, "lat")]),
     ]},

    # ── J05 · la darija ─────────────────────────────────────────────────
    {"n": 5, "comp": "A", "theme": "La darija",
     "dz": [
         dict(kicker="اللغة،", lines=[[B("الدارجة")],
                                     [R("ماشي")],
                                     [M("ترجمة.")]],
              pills=[pl("ar-DZ", "target", 24, -5, "lat")]),
         dict(kicker="الأصل،", lines=[[B("دارجة"), B("جزايرية")],
                                     [B("خالصة،")],
                                     [R("ماشي مستوردة.")]],
              pills=[pl("100 % DZ", "spark", 23, 5, "lat")]),
         dict(kicker="الفهم،", lines=[[R("كي تحكي"), B("كيفك،")],
                                     [R("الزبون")],
                                     [B("يفهم.")]],
              pills=[pl("واش راك", "target", 24, -5)]),
         dict(kicker="الصدق،", lines=[[B("الصوت"), R("يبان")],
                                     [B("تاعك،")],
                                     [R("ماشي تاع روبو.")]],
              pills=[pl("طبيعي", "spark", 23, 5)]),
         dict(kicker="جرّب بنفسك،", lines=[[R("دير"), B("تجربة")],
                                          [R("و"), B("حكم")],
                                          [R("وحدك.")]],
              pills=[pl("sawtify.space", "spark", 22, -5, "lat")]),
     ],
     "fr": [
         dict(kicker="La langue", lines=[[B("La darija")],
                                        [R("n'est pas")],
                                        [M("une traduction.")]],
              pills=[pl("ar-DZ", "target", 22, -5, "lat")]),
         dict(kicker="L'origine", lines=[[B("Une darija")],
                                        [B("algérienne,")],
                                        [R("pas importée.")]],
              pills=[pl("100 % DZ", "spark", 21, 5, "lat")]),
         dict(kicker="La clarté", lines=[[R("Quand vous"), R("parlez")],
                                        [B("juste,")],
                                        [B("on comprend.")]],
              pills=[pl("واش راك", "target", 22, -5)]),
         dict(kicker="Le naturel", lines=[[B("Une voix")],
                                         [R("qui sonne")],
                                         [M("vraie.")]],
              pills=[pl("naturel", "spark", 22, 5)]),
         dict(kicker="Écoutez", lines=[[B("La différence")],
                                      [R("se voit")],
                                      [B("à l'oreille.")]],
              pills=[pl("sawtify.space", "spark", 21, -5, "lat")]),
     ]},
]
