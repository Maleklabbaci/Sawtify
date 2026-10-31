#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════
 planning.py — plan de publication Instagram : 1 carrousel par jour
───────────────────────────────────────────────────────────────────────────
 Construit un calendrier quotidien (darija algéroise) qui mélange :
   1. les carrousels de la banque 300 sujets (contenu neuf, algérois) ;
   2. les carrousels éditoriaux 03→13 déjà produits.

 Sortie :
   slides/PLAN-PUBLICATION.csv   (import tableur / Metricool / Buffer)
   slides/PLAN-PUBLICATION.md    (version lisible, légende incluse)

   python3 planning.py                       # 30 jours, départ 2026-11-01
   python3 planning.py --days 45 --start 2026-11-15
   python3 planning.py --bank-first 19       # nb de sujets banque en tête
═══════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import argparse
import csv
from datetime import date, timedelta
from pathlib import Path

from topics import BANK, to_carousel
import generate_premium as gp
from generate_shorts import SHORTS

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "slides"

# Heures de pointe Instagram en Algérie (UTC+1) — rotation sur la semaine
SLOTS = ["20:00", "19:30", "21:00", "12:30", "20:30", "18:30", "21:30"]
WEEKDAYS_FR = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
WEEKDAYS_AR = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"]

# Ordre éditorial de la série premium (progression pédagogique)
PREMIUM_ORDER = [3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 5]


def bank_picks(n: int) -> list[int]:
    """Sujets de la banque répartis sur les angles ET les audiences."""
    picks: list[int] = []
    angle = 0
    while len(picks) < n and angle < 30:
        idx = angle * 10 + (3 * angle) % 10 + 1
        if idx <= len(BANK):
            picks.append(idx)
        angle += 1
    return picks


def build_plan(start: date, days: int, bank_count: int) -> list[dict]:
    entries: list[dict] = []

    for bid in bank_picks(bank_count):
        c = to_carousel(BANK[bid - 1])
        entries.append({
            "kind": "banque",
            "slug": c["slug"],
            "title": c["name"],
            "slides": len(c["slides"]),
            "caption": c["caption"],
        })

    by_num = {}
    for c in list(gp.CARROUSELS) + list(SHORTS):
        by_num[int(c["slug"][:2])] = c
    for num in PREMIUM_ORDER:
        c = by_num.get(num)
        if not c:
            continue
        entries.append({
            "kind": "serie",
            "slug": c["slug"],
            "title": c["name"],
            "slides": len(c["slides"]),
            "caption": c["caption"],
        })

    plan = []
    for i, e in enumerate(entries[:days]):
        d = start + timedelta(days=i)
        plan.append({
            "jour": i + 1,
            "date": d.isoformat(),
            "semaine": WEEKDAYS_FR[d.weekday()],
            "semaine_ar": WEEKDAYS_AR[d.weekday()],
            "heure": SLOTS[i % len(SLOTS)],
            "type": e["kind"],
            "slug": e["slug"],
            "titre": e["title"],
            "slides": e["slides"],
            "legende": e["caption"],
        })
    return plan


def write_csv(plan: list[dict], path: Path) -> None:
    cols = ["jour", "date", "semaine", "heure", "type", "slug", "titre", "slides", "legende"]
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for r in plan:
            w.writerow({k: r[k] for k in cols})


def write_md(plan: list[dict], path: Path) -> None:
    lines = [
        "# Plan de publication Instagram — Sawtify",
        "",
        "**1 carrousel par jour · darija algéroise (العاصمة) · 1080×1350 (4:5)**",
        "",
        f"- Période : **{plan[0]['date']} → {plan[-1]['date']}** ({len(plan)} publications)",
        "- Heure : rotation sur les créneaux de pointe algériens (12:30 / 18:30 → 21:30)",
        "- Fichiers : dossier Drive du carrousel = `01.png` → `0N.png` dans l'ordre + `legende-instagram.txt`",
        "",
        "| # | Date | Jour | Heure | Carrousel | Slides |",
        "|---|---|---|---|---|---|",
    ]
    for r in plan:
        lines.append(
            f"| {r['jour']} | {r['date']} | {r['semaine']} | {r['heure']} | `{r['slug']}` | {r['slides']} |"
        )

    lines += ["", "---", "", "## Légendes prêtes à copier-coller", ""]
    for r in plan:
        lines += [
            f"### Jour {r['jour']} — {r['date']} ({r['semaine']}) · {r['heure']}",
            f"`{r['slug']}` · {r['slides']} slides",
            "",
            "```text",
            r["legende"],
            "```",
            "",
        ]
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description="Plan de publication quotidien")
    ap.add_argument("--start", default="2026-11-01", help="première date (AAAA-MM-JJ)")
    ap.add_argument("--days", type=int, default=30, help="nombre de jours")
    ap.add_argument("--bank", type=int, default=19, help="nb de sujets banque en tête")
    args = ap.parse_args()

    plan = build_plan(date.fromisoformat(args.start), args.days, args.bank)
    csv_path = OUT / "PLAN-PUBLICATION.csv"
    md_path = OUT / "PLAN-PUBLICATION.md"
    write_csv(plan, csv_path)
    write_md(plan, md_path)

    banque = [p for p in plan if p["type"] == "banque"]
    serie = [p for p in plan if p["type"] == "serie"]
    print(f"✓ {len(plan)} jours · {len(banque)} sujets banque · {len(serie)} carrousels série")
    print(f"  {csv_path.relative_to(ROOT)}")
    print(f"  {md_path.relative_to(ROOT)}")
    if banque:
        ids = ",".join(str(int(p["slug"].split("-")[1])) for p in banque)
        print(f"\n  à rendre : python3 generate_shorts.py --bank {ids}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
