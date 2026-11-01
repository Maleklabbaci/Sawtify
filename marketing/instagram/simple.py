#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════
 simple.py — SYSTÈME « ÉDITORIAL CENTRÉ » (v10)

 Référence client : carrousels minimalistes (un surligneur, un gros titre
 centré, du texte court, une petite illustration, des points de pagination).

 Couleurs : celles du logo — violet #6D27EA, orange #FD6029, crème #F4F1E9.
 Composition : tout est CENTRÉ sur l'axe médian, une idée par slide, air.

    python3 simple.py
    python3 simple.py --only s1
    python3 simple.py --planches
═══════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw

from sawtify_ig import ar_para, font, visual

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "slides" / "simple"
LOGO = ROOT / "assets" / "logo-mark-trim.png"

W, H = 1080, 1350
SS = 2
M = 92

VIO = (109, 39, 234)
VIO_D = (86, 26, 196)
ORANGE = (253, 96, 41)
CREAM = (244, 241, 233)
CREAM_S = (198, 188, 238)          # (archive v8)
MUT = (126, 112, 156)              # texte secondaire sur crème
LINE = (206, 195, 220)             # filets sur crème
INK = (26, 14, 46)

SERIF = "Playfair-Bold.ttf"
SERIF_IT = "Playfair-BoldItalic.ttf"
GROT_M = "SpaceGrotesk-Medium.ttf"
GROT_B = "SpaceGrotesk-Bold.ttf"
AR_B = "IBMPlexSansArabic-Bold.ttf"
AR_S = "IBMPlexSansArabic-SemiBold.ttf"
AR_R = "IBMPlexSansArabic-Regular.ttf"

_logo_cache: dict = {}


def logo(size: int) -> Image.Image:
    """Mascotte détourée, largeur = size (hauteur au prorata)."""
    if size not in _logo_cache:
        src = Image.open(LOGO).convert("RGBA")
        h = int(round(src.height * size / src.width))
        _logo_cache[size] = src.resize((size, h), Image.LANCZOS)
    return _logo_cache[size]


def logo_h(size: int) -> int:
    return logo(size).height


def mascot(base, cx, top, dsize, disc=True, ratio=0.64):
    """Mascotte posée sur un disque violet. Coordonnées en px FINAUX.

    dsize = diamètre du disque, top = haut du disque.
    Retourne le bas du disque.
    """
    if disc:
        ImageDraw.Draw(base).ellipse(
            [(cx - dsize / 2) * SS, top * SS, (cx + dsize / 2) * SS,
             (top + dsize) * SS], fill=(*VIO, 255))
    h = dsize * ratio
    w = h * 417 / 640
    im = logo(int(round(w * SS)))
    bh = im.height / SS
    base.alpha_composite(im, (int((cx - w / 2) * SS),
                              int((top + dsize / 2 - bh / 2) * SS)))
    return top + dsize


# ── primitives ────────────────────────────────────────────────────────────
def layer():
    return Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))


def tw(text, fname, size, track=0.0):
    d = ImageDraw.Draw(Image.new("RGB", (4, 4)))
    t = visual(text)
    w = d.textlength(t, font=font(fname, size)) / SS
    if track:
        w += track * max(0, len(t) - 1)
    return w


def lat(base, text, x, y, size, color, fname=GROT_M, anchor="ls", track=0.0):
    d = ImageDraw.Draw(base)
    if not track:
        d.text((x * SS, y * SS), text, font=font(fname, size), fill=color,
               anchor=anchor)
        return
    total = tw(text, fname, size, track)
    if anchor[0] == "r":
        cx = x - total
    elif anchor[0] == "m":
        cx = x - total / 2
    else:
        cx = x
    for ch in text:
        d.text((cx * SS, y * SS), ch, font=font(fname, size), fill=color,
               anchor="ls")
        cx += d.textlength(ch, font=font(fname, size)) / SS + track


def ar_center(base, text, cx, y, size, color, max_w, fname=AR_B, leading=1.28,
              hi=None):
    """Paragraphe arabe centré sur cx. Retourne le bas d'encre."""
    lay = layer()
    ar_para(lay, cx + max_w / 2, y, text, size, fname, color, max_w=max_w,
            leading=leading, hi_color=hi or color)
    bb = lay.getbbox()
    if bb is None:
        return y
    ink = lay.crop(bb)
    base.alpha_composite(ink, (int((cx - ink.width / 2 / SS) * SS), bb[1]))
    return bb[3] / SS


def rule(base, x0, x1, y, color=CREAM, alpha=70, w=1.2):
    ImageDraw.Draw(base).line([x0 * SS, y * SS, x1 * SS, y * SS],
                              fill=(*color, alpha), width=max(1, int(w * SS)))


def marker(base, text, cx, y, size=19, fname=AR_S, pad=(34, 13),
           mode="orange"):
    """Étiquette du haut : plein orange, contour orange, ou plein violet."""
    w = tw(text, fname, size) + pad[0] * 2
    h = size * 1.42 + pad[1] * 2
    box = [(cx - w / 2) * SS, (y - h + 6) * SS, (cx + w / 2) * SS,
           (y + 6) * SS]
    d = ImageDraw.Draw(base)
    if mode == "outline":
        d.rectangle(box, outline=(*ORANGE, 255), width=int(1.6 * SS))
        ink = ORANGE
    elif mode == "violet":
        d.rectangle(box, fill=(*VIO, 255))
        ink = CREAM
    else:
        d.rectangle(box, fill=(*ORANGE, 255))
        ink = CREAM
    lay = layer()
    ar_para(lay, cx + w, y - h + pad[1] + 8, text, size, fname, ink,
            max_w=w + 60, leading=1.2, hi_color=ink)
    bb = lay.getbbox()
    if bb:
        img = lay.crop(bb)
        base.alpha_composite(img, (int((cx - img.width / 2 / SS) * SS), bb[1]))
    return y + 6


def dots(base, n, k):
    step, r = 24, 4.6
    x0 = W / 2 - (n - 1) * step / 2
    d = ImageDraw.Draw(base)
    for i in range(n):
        cx = x0 + i * step
        col = ORANGE if i == k else (*LINE, 255)
        d.ellipse([(cx - r) * SS, (H - 104 - r) * SS, (cx + r) * SS,
                   (H - 104 + r) * SS], fill=col)


def swipe(base, label="SWIPE"):
    lat(base, label, W - M, H - 104, 9.5, MUT, GROT_M, anchor="rs",
        track=3.0)
    d = ImageDraw.Draw(base)
    ax = W - M
    d.line([(ax - 30) * SS, (H - 116) * SS, (ax - 4) * SS, (H - 116) * SS],
           fill=(*MUT, 255), width=3)
    d.line([(ax - 13) * SS, (H - 123) * SS, (ax - 4) * SS, (H - 116) * SS],
           fill=(*CREAM_S, 220), width=3)
    d.line([(ax - 13) * SS, (H - 109) * SS, (ax - 4) * SS, (H - 116) * SS],
           fill=(*CREAM_S, 220), width=3)


def credit(base, text="500 DA · 30 SECONDES"):
    lat(base, text, M, H - 104, 9.5, MUT, GROT_M, track=2.4)


def page(n, k, mascot=True):
    base = Image.new("RGBA", (W * SS, H * SS), (*CREAM, 255))
    if mascot:
        lat(base, "sawtify", W / 2, 114, 25, VIO, GROT_B, anchor="ms",
            track=7.5)
    dots(base, n, k)
    return base


def signature(base, last=False):
    """Ligne du bas : crédit à gauche, swipe à droite (sauf dernière slide)."""
    credit(base)
    if not last:
        swipe(base)


# ═══════════════════════════════════════════════════════════════════════════
#  1 · couverture
# ═══════════════════════════════════════════════════════════════════════════
def s1(p):
    base = page(p["n"], 0)
    y = marker(base, p["tag"], W / 2, 292, 18, mode=p["mark"])
    y = ar_center(base, p["cover"], W / 2, y + 74, p["cover_size"], INK, 800,
                  AR_B, leading=1.26, hi=VIO_D)
    rule(base, W / 2 - 44, W / 2 + 44, y + 44, VIO_D, 90, 1.4)
    y = ar_center(base, p["sub"], W / 2, y + 86, 20, MUT, 660, AR_R,
                  leading=1.85, hi=INK)
    bottom = mascot(base, W / 2, max(y + 66, 762), 320)
    lat(base, p["ill_label"], W / 2, bottom + 40, 9, MUT, GROT_M,
        anchor="ms", track=3.0)
    signature(base)
    return base


def s2(p):
    base = page(p["n"], 1)
    y = marker(base, p["tag2"], W / 2, 286, 18, mode=p["mark"])
    y = ar_center(base, p["t2"], W / 2, y + 74, p["t2_size"], INK, 820, AR_B,
                  leading=1.28, hi=VIO_D)
    bottom = mascot(base, W / 2, y + 64, 356)
    y2 = ar_center(base, p["b2"], W / 2, bottom + 54, 20, MUT, 640, AR_R,
                   leading=1.85, hi=INK)
    lat(base, p["ill_label"], W / 2, y2 + 56, 9, MUT, GROT_M, anchor="ms",
        track=3.0)
    signature(base)
    return base


def s3(p):
    base = page(p["n"], 2)
    y = marker(base, p["tag3"], W / 2, 292, 18, mode=p["mark"])
    y = ar_center(base, p["t3"], W / 2, y + 74, p["t3_size"], INK, 820, AR_B,
                  leading=1.30, hi=VIO_D)
    items = p["items3"]
    top = y + 78
    gap = 46
    hrow = ((H - 210) - top - gap * (len(items) - 1)) / len(items)
    for i, (head, body) in enumerate(items):
        yy = top + i * (hrow + gap)
        d = ImageDraw.Draw(base)
        cx = W / 2
        d.ellipse([(cx - 5.5) * SS, (yy + hrow * 0.08) * SS,
                   (cx + 5.5) * SS, (yy + hrow * 0.08 + 11) * SS],
                  fill=(*ORANGE, 255))
        yy2 = ar_center(base, head, W / 2, yy + hrow * 0.16 + 26, 27, INK,
                        700, AR_S, leading=1.3)
        ar_center(base, body, W / 2, yy2 + 16, 19, MUT, 640, AR_R,
                  leading=1.8)
        if i < len(items) - 1:
            rule(base, W / 2 - 34, W / 2 + 34, yy + hrow + gap / 2, VIO_D, 70)
    signature(base)
    return base


def s4(p):
    base = page(p["n"], 3)
    y = marker(base, p["tag4"], W / 2, 330, 18, mode=p["mark"])
    y = ar_center(base, p["t4"], W / 2, y + 74, p["t4_size"], INK, 820, AR_B,
                  leading=1.28, hi=VIO_D)
    cy = y + 176
    lat(base, p["num_a"], W / 2 - 132, cy, 104, INK, SERIF, anchor="ms")
    lat(base, p["num_b"], W / 2 + 132, cy, 104, ORANGE, SERIF, anchor="ms")
    ImageDraw.Draw(base).line([W / 2 * SS, (cy - 82) * SS, W / 2 * SS,
                               (cy + 14) * SS], fill=(*LINE, 255), width=2)
    ar_center(base, p["lab_a"], W / 2 - 132, cy + 34, 17, MUT, 300, AR_S,
              leading=1.2)
    ar_center(base, p["lab_b"], W / 2 + 132, cy + 34, 17, MUT, 300, AR_S,
              leading=1.2)
    y2 = ar_center(base, p["b4"], W / 2, cy + 132, 20, MUT, 660, AR_R,
                   leading=1.85, hi=INK)
    rule(base, W / 2 - 40, W / 2 + 40, y2 + 66, VIO_D, 70, 1.3)
    ar_center(base, p["note4"], W / 2, y2 + 108, 17, INK, 620, AR_R,
              leading=1.8, hi=VIO_D)
    signature(base)
    return base


def s5(p):
    base = page(p["n"], 4)
    y = ar_center(base, p["t5"], W / 2, 372, p["t5_size"], INK, 820, AR_B,
                  leading=1.26, hi=VIO_D)
    y = ar_center(base, p["b5"], W / 2, y + 40, 20, MUT, 640, AR_R,
                  leading=1.85)
    top = y + 92
    band = VIO if p["mark"] == "outline" else ORANGE
    ImageDraw.Draw(base).rounded_rectangle(
        [M * SS, top * SS, (W - M) * SS, (top + 190) * SS], radius=28 * SS,
        fill=(*band, 255))
    yy = ar_center(base, p["cta"], W / 2, top + 46, 30, CREAM, 740, AR_B,
                   leading=1.3)
    lat(base, p["url"], W / 2, yy + 52, 24, CREAM, GROT_B, anchor="ms",
        track=0.4)
    bottom = mascot(base, W / 2, top + 244, 236)
    ar_center(base, p["end_note"], W / 2, bottom + 40, 17, MUT, 620, AR_R,
              leading=1.75, hi=INK)
    signature(base, last=True)
    return base


# ═══════════════════════════════════════════════════════════════════════════
#  copy
# ═══════════════════════════════════════════════════════════════════════════
PUBS = [
    {
        "id": "s1-ancrage", "n": 5, "mark": "orange",
        "tag": "سلسلة البيع 01",
        "cover": "أول سوم تسمعو، هو اللي يبقى في راسك.",
        "cover_size": 52, "hi": "أول سوم",
        "sub": "علاش 500 دج تبان رخيصة كي تجي بعد 3 000، و تبان غالية كي تجي بوحدها.",
        "tag2": "الميكانيزم",
        "t2": "دماغك ياخذ أول رقم و يوقف عليه.", "t2_size": 44,
        "hi2": "أول رقم",
        "b2": "كل سوم بعدو يتقاس بيه، ماشي بالسوق. بدّل الترتيب، ماشي السوم.",
        "ill_size": 330, "ill_label": "ANCHORING · KAHNEMAN 1974",
        "tag3": "كيفاش تطبّقها",
        "t3": "ثلاثة حركات، و الترتيب يولي يبيع.", "t3_size": 40,
        "hi3": "الترتيب",
        "items3": [("بيّن المرجع قبل سومك", "سوم السوق، سوم الوكالة، سوم الاستوديو."),
                   ("فسّر واش كاين في السوم", "30 ثانية، دارجة، تعديل مرتين، تسليم 24 ساعة."),
                   ("خلّي المقارنة واضحة", "قبل / بعد، بلا صوت / بالصوت.")],
        "tag4": "في الجزائر",
        "t4": "نفس الصوت، الفرق في الترتيب.", "t4_size": 42,
        "hi4": "الترتيب",
        "num_a": "3 000", "num_b": "500",
        "lab_a": "المرجع", "lab_b": "سومنا",
        "b4": "حطيت المرجع قبل السوم، الزبون وحدو يفهم بلي 500 دج صفقة.",
        "note4": "3 000 دج سوم السوق، 500 دج سومنا، و الفرق يبان في الأول.",
        "t5": "الترتيب يبيع أكثر من التخفيض.", "t5_size": 44,
        "hi5": "أكثر من التخفيض",
        "b5": "ما تنقصش السوم. بدّل البلاصة اللي تحطو فيها.",
        "cta": "خود الصوت تاعك في 24 ساعة",
        "url": "sawtify.space",
        "end_note": "صوت واحد، دارجة جزايرية، 500 دج. تجربة قبل ما تخلّص.",
        "skel": [s1, s2, s3, s4, s5],
    },
    {
        "id": "s2-perte", "n": 5, "mark": "outline",
        "tag": "سلسلة البيع 02",
        "cover": "الصمت تاعك يعمّر جيب غيرك.",
        "cover_size": 54, "hi": "الصمت تاعك",
        "sub": "الزبون ما يقلكش «ما فهمتش». يمشي بصمت، يشري عند صاحبك، و أنت ما تعرفش علاش.",
        "tag2": "واش راك تخسر",
        "t2": "الخسارة توجع ضوڨ مرتين ما يفرحك الربح.", "t2_size": 40,
        "hi2": "ضوڨ مرتين",
        "b2": "على هادا ما تبيعش «واش راح تربح»، وري «واش راح تخسر».",
        "ill_size": 330, "ill_label": "LOSS AVERSION · KAHNEMAN",
        "tag3": "ثلاثة خسائر صامتة",
        "t3": "كل وحدة تكلّفك زبون.", "t3_size": 42,
        "hi3": "زبون",
        "items3": [("زبون يقرا و ما يسمعش", "الفيديو يمشي بلا صوت، الرسالة تروح معاه."),
                   ("3 أيام باش تجاوب", "كل نهار تأخير، الزبون يعاود يشوف عند غيرك."),
                   ("صوت مسجّل بالتيليفون", "الضجة تضعّف الثقة قبل الكلمة الأولى.")],
        "tag4": "الإحساس",
        "t4": "نفس المبلغ، إحساس مختلف.", "t4_size": 42,
        "hi4": "إحساس مختلف",
        "num_a": "100", "num_b": "50",
        "lab_a": "خسارة", "lab_b": "ربح",
        "b4": "ضياع 100 دج يوجع أكثر ما يفرحك ربح 100 دج. استعملها في صالحك.",
        "note4": "علاش التخفيض ما يشدش، و علاش الصوت يشد.",
        "t5": "قبل ما تخسر زبون آخر، خود 30 ثانية.", "t5_size": 40,
        "hi5": "30 ثانية",
        "b5": "الخسارة ما تتصلّحش بالنية، تتصلّح بصوت.",
        "cta": "صوتك في 24 ساعة",
        "url": "sawtify.space",
        "end_note": "تجربة قبل ما تخلّص. ما كاينش اشتراك، ما كاينش التزام.",
        "skel": [s1, s2, s3, s4, s5],
    },
    {
        "id": "s3-fobo", "n": 5, "mark": "violet",
        "tag": "سلسلة البيع 03",
        "cover": "50 صوت، 50 سوم، و أنت ما زلت ما اخترتش.",
        "cover_size": 48, "hi": "ما اخترتش",
        "sub": "كي تكثر الاختيارات، الدماغ يوقف. الحل ماشي زيد الخيارات، قلّلهم.",
        "tag2": "FOBO",
        "t2": "الخوف من حاجة أحسن يوقّف كلش.", "t2_size": 44,
        "hi2": "يوقّف كلش",
        "b2": "ماشي ما عندكش فلوس، ماشي ما عندكش وقت. عندك خوف من أنك تختار أقل من الأحسن.",
        "ill_size": 330, "ill_label": "FEAR OF BETTER OPTIONS",
        "tag3": "ثلاثة قرارات",
        "t3": "و نكتبو، نقراو، نسلمو. ماشي 50 سؤال.", "t3_size": 40,
        "hi3": "ثلاثة قرارات",
        "items3": [("واش نوع الصوت؟", "إعلان، شرح، ولا ترحيب. تختار واحد."),
                   ("شحال الطول؟", "30 ثانية كافية. 60 كي تحتاج، تدفع الفرق."),
                   ("وقتاش تحبو؟", "24 ساعة، ولا 48 كي تكون القصة طويلة.")],
        "tag4": "القرار",
        "t4": "قرار واحد واضح، ماشي 50 خيار مفتوح.", "t4_size": 38,
        "hi4": "قرار واحد",
        "num_a": "50", "num_b": "3",
        "lab_a": "خيار", "lab_b": "قرارات",
        "b4": "نوع، طول، وقت. تختار ثلاثة، و نبداو في نفس النهار.",
        "note4": "500 دج، تعديل مرتين، تسليم 24 ساعة.",
        "t5": "ما تختارش بين 50، اختار واحد.", "t5_size": 44,
        "hi5": "اختار واحد",
        "b5": "3 قرارات، سوم وحد، 24 ساعة. ماشي كاطالوغ.",
        "cta": "خود الصوت تاعك",
        "url": "sawtify.space",
        "end_note": "دير طلب، و شوف الصوت قبل ما تخلّص.",
        "skel": [s1, s2, s3, s4, s5],
    },
]


def render(pub):
    d = OUT / pub["id"]
    d.mkdir(parents=True, exist_ok=True)
    for i, fn in enumerate(pub["skel"]):
        img = fn(pub).convert("RGB").resize((W, H), Image.LANCZOS)
        img.save(d / f"{i + 1:02d}.jpg", quality=95, optimize=True,
                 subsampling=1)
        print("  ✓", d.name, f"{i + 1:02d}")


def planches():
    for pub in PUBS:
        files = sorted((OUT / pub["id"]).glob("*.jpg"))
        tw_, th_ = 500, 625
        sheet = Image.new("RGB", (len(files) * (tw_ + 8) + 8, th_ + 16),
                          (30, 18, 56))
        for i, f in enumerate(files):
            sheet.paste(Image.open(f).convert("RGB").resize((tw_, th_),
                                                            Image.LANCZOS),
                        (8 + i * (tw_ + 8), 8))
        sheet.save(OUT / f"planche-{pub['id']}.jpg", quality=93, optimize=True)
        print("  ✓", f"planche-{pub['id']}.jpg")
    tw_, th_ = 300, 375
    sheet = Image.new("RGB", (8 + 5 * (tw_ + 8), 3 * (th_ + 10) + 10),
                      (30, 18, 56))
    for r, pub in enumerate(PUBS):
        for i, f in enumerate(sorted((OUT / pub["id"]).glob("*.jpg"))):
            sheet.paste(Image.open(f).convert("RGB").resize((tw_, th_),
                                                            Image.LANCZOS),
                        (8 + i * (tw_ + 8), 8 + r * (th_ + 10)))
    sheet.save(OUT / "planche-3-pubs.jpg", quality=93, optimize=True)
    print("  ✓ planche-3-pubs.jpg")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default=None)
    ap.add_argument("--planches", action="store_true")
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    if a.planches:
        planches()
        return
    for pub in PUBS:
        if a.only and a.only not in pub["id"]:
            continue
        print("·", pub["id"])
        render(pub)


if __name__ == "__main__":
    main()
