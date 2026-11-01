# -*- coding: utf-8 -*-
"""Construit le pack de livraison : 1 ZIP par jour + planche + LIRE-MOI.

    python3 export_collage.py [--out DIR]

Sortie par défaut : ./exports/collage-nov-2026/
(les ZIP ne sont pas versionnés : ils se régénèrent en quelques secondes)
"""
from __future__ import annotations

import argparse
import shutil
import zipfile
from pathlib import Path

from PIL import Image

from workshop_pubs import PUBS

HERE = Path(__file__).resolve().parent
SLIDES = HERE / "slides" / "workshop"


def build(out: Path) -> list[tuple[str, str]]:
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    rows = []
    for i, pub in enumerate(PUBS, start=1):
        day = f"J{i:02d}"
        zpath = out / f"{day} · {i:02d}-11 · {pub['titre']}.zip"
        with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
            for f in sorted((SLIDES / pub["slug"]).glob("*.jpg")):
                z.write(f, f"{day}/{f.name}")
        rows.append((day, pub["titre"], pub["slug"]))

    # planche des 30 couvertures
    tw, th = 320, 400
    sheet = Image.new("RGB", (5 * tw + 6 * 14, 6 * th + 7 * 14), (14, 10, 16))
    for k, pub in enumerate(PUBS):
        im = Image.open(SLIDES / pub["slug"] / "01.jpg").convert("RGB")
        sheet.paste(im.resize((tw, th), Image.LANCZOS),
                    (14 + (k % 5) * (tw + 14), 14 + (k // 5) * (th + 14)))
    sheet.save(out / "planche-30-publications.jpg", quality=90, optimize=True)

    lines = [
        "SAWTIFY · COLLAGE · NOVEMBRE 2026",
        "30 publications × 4 slides (1080×1350), darija algéroise.", "",
        "Chaque ZIP = une journée, prête à programmer :",
        "  J01/01.jpg → 04.jpg  (dans l'ordre, c'est un carrousel lié)",
        "  J01/contact-sheet.jpg = aperçu des 4 slides côte à côte", "",
        "Un ZIP = un dossier à dézipper dans Drive, ou à glisser dans Business Suite.",
        "", "CALENDRIER", "",
    ]
    for day, titre, slug in rows:
        lines.append(f"{day} · {day[1:]} nov 2026   {titre}   ({slug})")
    lines += [
        "", "RÈGLES D'UTILISATION",
        "- Publier les 4 slides dans l'ordre : la phrase en bas se poursuit "
        "d'une slide à l'autre.",
        "- Accroche : ne rien ajouter sur la slide 01, le sticker « اسحب » "
        "(fais glisser) fait le travail.",
        "- La slide 04 contient le prix (500 دج) et le lien sawtify.space.",
        "- Format : 1080×1350 (4:5). JPG qualité 94, ~200-360 Ko par slide.", "",
        "REGÉNÉRER",
        "  pip install --break-system-packages pillow arabic-reshaper python-bidi",
        "  python3 workshop.py              # les 30 publications",
        "  python3 workshop.py --only 07    # une seule (slug partiel)",
        "  python3 export_collage.py        # ce pack",
        "",
    ]
    (out / "LIRE-MOI · mode d'emploi.txt").write_text("\n".join(lines), encoding="utf-8")
    return rows


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(HERE / "exports" / "collage-nov-2026"))
    a = ap.parse_args()
    out = Path(a.out)
    rows = build(out)
    total = sum(p.stat().st_size for p in out.iterdir())
    print(f"{len(rows)} ZIP + planche + LIRE-MOI → {out}  ({total / 1e6:.1f} Mo)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
