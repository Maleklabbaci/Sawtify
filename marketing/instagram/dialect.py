#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════
 dialect.py — passe « دارجة جزائرية · جزايرية العاصمة » (darija algéroise)
───────────────────────────────────────────────────────────────────────────
 Le contenu Sawtify est écrit en darija algérienne générique. Ce module
 aligne le vocabulaire sur l'usage d'Alger (العاصمة) : ياسر au lieu de بزاف,
 واش au lieu de شنو, هكّاك au lieu de هكذا, et un jeu de marqueurs propres
 à l'algérois (درك، صحّا، قاع، لاباس، نقولك، بصح…).

 Usage
   python3 dialect.py --check            # signale le vocabulaire non-algérois
   python3 dialect.py --fix [--dry-run]  # réécrit les sources en algérois
   from dialect import to_algiers        # transforme une chaîne à la volée
═══════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCES = ["topics.py", "generate_premium.py", "generate_shorts.py"]

# ── Lexique : (mot générique / oriental, équivalent algérois) ──────────────
# L'ordre compte : les expressions sont traitées avant les mots isolés.
LEXICON: list[tuple[str, str]] = [
    # interrogatifs & démonstratifs
    ("شنو راهو", "واش راهو"),
    ("شنو هو", "واش هو"),
    ("شنو", "واش"),
    ("هكذا", "هكّاك"),
    ("هكي", "هكّاك"),
    ("علاه", "علاش"),
    ("كيفاه", "كيفاش"),
    # quantités & intensité (Alger : ياسر)
    ("بزاف بزاف", "ياسر ياسر"),
    ("بزاف", "ياسر"),
    ("برشا", "ياسر"),
    ("شويّة شويّة", "شوي شوي"),
    # temps (Alger : درك / ضرك)
    ("دروك", "درك"),
    ("توّا", "درك"),
    ("ضرك", "درك"),
    # connecteurs algérois
    ("ولكن", "بصح"),
    ("لكن", "بصح"),
    ("لأنّو", "على خاطر"),
    ("حيت", "على خاطر"),
    ("خاطر", "على خاطر"),
    # verbes / formes locales
    ("تنجّم", "تقدر"),
    ("نجّم", "نقدر"),
    ("خوذ", "خود"),
    ("تْخوذ", "تخود"),
    # salutations & tics de langage algérois
    ("مرحبا بيك", "صحّا بيك"),
    ("أهلا", "صحّا"),
]

# ── Marqueurs typiques de l'algérois (pour le contrôle qualité) ───────────
ALGIERS_MARKERS = [
    "ياسر", "واش", "كيفاش", "علاش", "شحال", "درك", "صحّا", "لاباس",
    "قاع", "بصح", "هكّاك", "تاع", "باش", "غير", "راهو", "نقولك", "خلي",
]

# ── Vocabulaire à éviter (non algérois / trop oriental) ───────────────────
NON_ALGIERS = ["بزاف", "شنو", "برشا", "هكي", "علاه", "كيفاه", "توّا", "ضرك", "دروك"]

AR = re.compile(r"[\u0600-\u06FF]")


def to_algiers(text: str) -> str:
    """Applique le lexique algérois à une chaîne (idempotent)."""
    if not text:
        return text
    for src, dst in LEXICON:
        text = re.sub(rf"(?<![\u0600-\u06FF]){re.escape(src)}(?![\u0600-\u06FF])", dst, text)
    return text


def carousel_to_algiers(carousel: dict) -> dict:
    """Version algéroise d'un carrousel (slides + légende + titre)."""
    def walk(obj):
        if isinstance(obj, str):
            return to_algiers(obj)
        if isinstance(obj, list):
            return [walk(x) for x in obj]
        if isinstance(obj, dict):
            return {k: walk(v) for k, v in obj.items()}
        return obj

    return walk(carousel)


# ── Contrôle qualité ──────────────────────────────────────────────────────
def audit(text: str) -> list[str]:
    """Retourne les mots non algérois trouvés dans une chaîne."""
    return [w for w in NON_ALGIERS if re.search(rf"(?<![\u0600-\u06FF]){re.escape(w)}(?![\u0600-\u06FF])", text)]


def check_sources() -> int:
    total = 0
    for name in SOURCES:
        path = ROOT / name
        hits: dict[str, int] = {}
        for i, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            for w in audit(line):
                hits[w] = hits.get(w, 0) + 1
                total += 1
        if hits:
            print(f"  {name:22s} " + "  ".join(f"{w}×{n}" for w, n in hits.items()))
    if total:
        print(f"\n✗ {total} occurrence(s) non-algéroise(s) — lancer : python3 dialect.py --fix")
        return 1
    print("✓ vocabulaire 100 % algérois")
    return 0


def fix_sources(dry_run: bool = False) -> int:
    changed = 0
    for name in SOURCES:
        path = ROOT / name
        before = path.read_text(encoding="utf-8")
        after = to_algiers(before)
        if after != before:
            diff = sum(1 for a, b in zip(before.splitlines(), after.splitlines()) if a != b)
            changed += diff
            print(f"  {name:22s} {diff} ligne(s) modifiée(s)")
            if not dry_run:
                path.write_text(after, encoding="utf-8")
    print(f"{'(dry-run) ' if dry_run else ''}{changed} ligne(s) au total")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Passe darija algéroise")
    ap.add_argument("--check", action="store_true", help="audit du vocabulaire")
    ap.add_argument("--fix", action="store_true", help="réécrit les sources en algérois")
    ap.add_argument("--dry-run", action="store_true", help="simule --fix")
    ap.add_argument("--text", type=str, help="transforme une chaîne et l'affiche")
    args = ap.parse_args()

    if args.text:
        print(to_algiers(args.text))
        return 0
    if args.fix:
        return fix_sources(args.dry_run)
    return check_sources()


if __name__ == "__main__":
    sys.exit(main())
