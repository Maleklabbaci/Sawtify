#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════
 qa.py — contrôle qualité des contenus avant rendu
───────────────────────────────────────────────────────────────────────────
 Attrape les bugs « invisibles » qui coûtent un post :

   1. glyphes manquants   → un caractère absent de la police s'affiche en carré
   2. emoji               → même problème, et Instagram les rend mal
   3. caractères de contrôle bidi/ZWJ laissés dans le texte
   4. textes trop longs   → dépasse la largeur utile d'une slide
   5. slides vides / mal typées

   python3 qa.py                 # vérifie tous les carrousels
   python3 qa.py --bank          # inclut aussi la banque de sujets
═══════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from fontTools.ttLib import TTFont

import sawtify_ig as ig
from sawtify_ig import ARABIC_RE, visual

ROOT = Path(__file__).resolve().parent
FONT_DIR = ROOT / "fonts"

EMOJI_RE = re.compile("[\U0001F000-\U0001FAFF\u2600-\u27BF\uFE0F\u2190-\u21FF\u2B00-\u2BFF]")
JUNK_RE = re.compile(r"[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]")

_cmap_cache: dict[str, set[int]] = {}


def cmap(font_file: str) -> set[int]:
    if font_file not in _cmap_cache:
        f = TTFont(str(FONT_DIR / font_file))
        chars: set[int] = set()
        for table in f["cmap"].tables:
            chars |= set(table.cmap.keys())
        _cmap_cache[font_file] = chars
    return _cmap_cache[font_file]


def missing_glyphs(text: str, font_file: str) -> list[str]:
    """Caractères de `text` que la police ne sait pas dessiner."""
    chars = cmap(font_file)
    shown = visual(text) if ARABIC_RE.search(text) else text
    out = []
    for ch in shown:
        if ch.isspace():
            continue
        if ord(ch) not in chars:
            out.append(ch)
    return out


def font_for(text: str) -> str:
    return ig.AR_REG if ARABIC_RE.search(text) else ig.LATIN_REG


def check_text(text: str, where: str) -> list[str]:
    problems = []
    if not isinstance(text, str) or not text.strip():
        return problems
    if EMOJI_RE.search(text):
        problems.append(f"{where} : emoji interdit → {text[:40]!r}")
    if JUNK_RE.search(text):
        problems.append(f"{where} : caractères de contrôle bidi → {text[:40]!r}")
    miss = missing_glyphs(text, font_for(text))
    if miss:
        problems.append(f"{where} : glyphes manquants {miss} → {text[:40]!r}")
    if len(text) > 190:
        problems.append(f"{where} : texte trop long ({len(text)} car.) → {text[:40]!r}")
    return problems


def walk_strings(obj, path="", out=None):
    """Toutes les chaînes d'une structure (dict/list)."""
    out = [] if out is None else out
    if isinstance(obj, str):
        out.append((path, obj))
    elif isinstance(obj, dict):
        for k, v in obj.items():
            walk_strings(v, f"{path}.{k}" if path else k, out)
    elif isinstance(obj, (list, tuple)):
        for i, v in enumerate(obj):
            walk_strings(v, f"{path}[{i}]", out)
    return out


KNOWN_TYPES = {"cover", "problem", "errors", "features", "steps", "grid", "list",
               "usecases", "solution", "stats", "compare", "quotes", "pricing", "cta"}


def check_carousels(carousels) -> tuple[int, list[str]]:
    problems: list[str] = []
    checked = 0
    for c in carousels:
        slug = c.get("slug", "?")
        slides = c.get("slides", [])
        checked += 1
        if not slides:
            problems.append(f"{slug} : aucune slide")
        if not (3 <= len(slides) <= 8):
            problems.append(f"{slug} : {len(slides)} slides (attendu 3 à 8)")
        if not c.get("caption"):
            problems.append(f"{slug} : légende Instagram manquante")
        for i, slide in enumerate(slides, start=1):
            t = slide.get("type")
            if t not in KNOWN_TYPES:
                problems.append(f"{slug} slide {i} : type inconnu « {t} »")
            for path, s in walk_strings(slide):
                problems += check_text(s, f"{slug} slide {i} ({path})")
    return checked, problems


def main():
    from generate_premium import CARROUSELS as PREMIUM
    banks = [("premium", PREMIUM)]
    if "--bank" in sys.argv:
        try:
            from topics import BANK, to_carousel
            # la banque est validée sous sa forme « carrousel » (c'est ce qu'on rendra)
            banks.append(("banque de sujets", [to_carousel(t) for t in BANK]))
        except Exception as exc:  # pragma: no cover
            print(f"⚠ banque illisible : {exc}")

    total_issues = 0
    for name, data in banks:
        n, problems = check_carousels(data)
        print(f"\n▶ {name} : {n} carrousels, {sum(len(c['slides']) for c in data)} slides")
        if problems:
            total_issues += len(problems)
            for p in problems[:40]:
                print(f"  ✗ {p}")
            if len(problems) > 40:
                print(f"  … et {len(problems) - 40} autres")
        else:
            print("  ✓ aucun problème détecté (glyphes, emoji, longueurs, types)")

    print(f"\n{'✓ QA OK' if total_issues == 0 else f'✗ {total_issues} problème(s)'}")
    return 0 if total_issues == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
