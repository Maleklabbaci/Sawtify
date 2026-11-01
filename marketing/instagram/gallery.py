"""Galerie locale : toutes les slides en pleine résolution, carrousel par carrousel.

    python3 gallery.py          # écrit slides/carousel/index.html
    python3 gallery.py --serve  # écrit puis sert sur http://0.0.0.0:8000

Chaque carrousel est une bande horizontale de slides 1080 × 1350 lisibles une
par une (scroll / swipe), avec le jour et le titre au-dessus.
"""
from __future__ import annotations

import argparse
import html
import http.server
import os
import socketserver
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "slides" / "carousel"


def build() -> Path:
    folders = sorted(d for d in OUT.iterdir() if d.is_dir())
    cards = []
    for folder in folders:
        imgs = sorted(p.name for p in folder.glob("0*.jpg"))
        if not imgs:
            continue
        day = folder.name.split("-")[1]
        slides = "".join(
            f'<a class="slide" href="{folder.name}/{n}" target="_blank">'
            f'<img loading="lazy" src="{folder.name}/{n}" alt="{n}">'
            f'<span class="num">{n[:-4]}</span></a>'
            for n in imgs
        )
        cards.append(
            f'<section class="pub" id="J{day}">'
            f'<header><span class="day">J{day}</span>'
            f'<span class="count">{len(imgs)} slides</span>'
            f'<a class="full" href="{folder.name}/planche.jpg" target="_blank">planche</a>'
            f"</header>"
            f'<div class="strip">{slides}</div></section>'
        )
    nav = "".join(
        f'<a href="#J{f.name.split("-")[1]}">J{f.name.split("-")[1]}</a>' for f in folders
    )
    doc = f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sawtify · 30 carrousels · novembre 2026</title>
<style>
 :root{{--vio:#6d28d9;--lila:#ede9fe;--paper:#faf9ff;--ink:#1a0f2e}}
 *{{box-sizing:border-box}}
 body{{margin:0;background:var(--paper);color:var(--ink);
       font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}}
 .top{{position:sticky;top:0;z-index:9;background:var(--ink);color:#fff;
       padding:14px 18px;display:flex;gap:14px;align-items:baseline;flex-wrap:wrap}}
 .top b{{font-size:15px;letter-spacing:.02em}}
 .top nav{{display:flex;gap:6px;flex-wrap:wrap;max-height:56px;overflow:auto}}
 .top nav a{{color:var(--lila);text-decoration:none;font-size:12px;padding:3px 7px;
             border:1px solid #ffffff33;border-radius:999px}}
 .top nav a:hover{{background:var(--vio)}}
 .pub{{padding:22px 18px 10px}}
 .pub header{{display:flex;align-items:baseline;gap:12px;margin-bottom:10px}}
 .day{{background:var(--vio);color:#fff;font-weight:800;font-size:13px;
       padding:4px 10px;border-radius:8px;letter-spacing:.04em}}
 .count{{font-size:12px;color:#6d28d9;font-weight:600}}
 .full{{margin-left:auto;font-size:12px;color:var(--ink);text-decoration:underline}}
 .strip{{display:flex;gap:12px;overflow-x:auto;padding-bottom:14px;scroll-snap-type:x mandatory}}
 .slide{{position:relative;flex:0 0 auto;scroll-snap-align:start;border-radius:14px;
         overflow:hidden;box-shadow:0 10px 30px #1a0f2e26;background:#fff}}
 .slide img{{display:block;width:min(78vw,340px);height:auto}}
 .slide .num{{position:absolute;bottom:10px;left:10px;background:#1a0f2ecc;color:#fff;
              font-size:11px;font-weight:700;padding:2px 7px;border-radius:999px}}
 footer{{padding:26px 18px 60px;font-size:12px;color:#6d28d9}}
</style></head><body>
<div class="top"><b>Sawtify — 30 carrousels · novembre 2026</b><nav>{nav}</nav></div>
{"".join(cards)}
<footer>Clique une slide pour l'ouvrir en pleine résolution (1080 × 1350).</footer>
</body></html>"""
    p = OUT / "index.html"
    p.write_text(doc, encoding="utf-8")
    return p


def serve() -> None:
    build()
    os.chdir(OUT)

    class H(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):  # silencieux
            pass

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("0.0.0.0", 8000), H) as httpd:
        httpd.serve_forever()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--serve", action="store_true")
    a = ap.parse_args()
    if a.serve:
        serve()
    else:
        print("✓", build())
