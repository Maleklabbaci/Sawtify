#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""viewer.py — galerie-lecteur pour relire les 30 carrousels dans le navigateur.

Sort `slides/carousel/voir.html` : vignettes par jour, clic → lecteur plein
écran, flèches clavier, et comparaison des 30 couvertures.
"""
from __future__ import annotations

import json
import os

ROOT = "slides/carousel"

DIRS = {
    "magazine": "Magazine", "affiche": "Affiche", "cinema": "Cinéma",
    "bento": "Bento", "diptyque": "Diptyque", "fiche": "Fiche",
    "ticket": "Ticket", "frise": "Frise", "manifeste": "Manifeste",
    "geometrie": "Géométrie",
}

ORDER = ["magazine", "affiche", "cinema", "bento", "diptyque", "fiche",
         "ticket", "frise", "manifeste", "geometrie"]


def direction_for(i: int) -> str:
    seg, pos = divmod(i, len(ORDER))
    return ORDER[(pos + seg * 3) % len(ORDER)]


def build() -> str:
    dirs = sorted(d for d in os.listdir(ROOT) if d.startswith("workshop-"))
    data = []
    for i, d in enumerate(dirs):
        slides = sorted(f for f in os.listdir(os.path.join(ROOT, d))
                        if f[:2].isdigit())
        data.append({"dir": d, "n": len(slides), "i": i,
                     "kind": direction_for(i),
                     "kindfr": DIRS[direction_for(i)]})
    payload = json.dumps(data, ensure_ascii=False)
    return f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sawtify · 30 carrousels · lecteur</title>
<style>
 :root{{--vio:#6d28d9;--lila:#ede9fe;--paper:#f7f5ff;--ink:#1a0f2e;--aura:#ff5e3a}}
 *{{box-sizing:border-box}}
 html,body{{margin:0;background:var(--paper);color:var(--ink);
   font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
   -webkit-font-smoothing:antialiased}}
 header.top{{position:sticky;top:0;z-index:20;background:var(--ink);color:#fff;
   padding:12px 16px;display:flex;gap:14px;align-items:center;flex-wrap:wrap}}
 header.top b{{font-size:15px}}
 header.top .hint{{font-size:11.5px;color:#c9bcf0}}
 header.top input{{margin-left:auto;background:#ffffff14;border:1px solid #ffffff26;
   color:#fff;border-radius:999px;padding:6px 12px;font-size:12px;width:180px}}
 nav.days{{display:flex;gap:6px;flex-wrap:wrap;padding:10px 16px;background:#fff;
   border-bottom:1px solid #e9e4f8;position:sticky;top:52px;z-index:19}}
 nav.days a{{font-size:11.5px;font-weight:700;text-decoration:none;color:var(--vio);
   border:1px solid #ddd3f7;border-radius:999px;padding:3px 9px}}
 nav.days a:hover{{background:var(--vio);color:#fff}}
 .wrap{{padding:18px 16px 80px;max-width:1500px;margin:0 auto}}
 .pub{{margin-bottom:26px}}
 .pub h2{{display:flex;align-items:baseline;gap:10px;font-size:14px;margin:0 0 10px}}
 .day{{background:var(--vio);color:#fff;border-radius:8px;padding:3px 9px;
   font-size:12.5px;letter-spacing:.04em}}
 .kind{{font-size:11px;color:#fff;background:#1a0f2e;border-radius:999px;
   padding:3px 9px;letter-spacing:.05em}}
 .n{{font-size:11.5px;color:#6d28d9;font-weight:700}}
 .strip{{display:flex;gap:12px;overflow-x:auto;padding:4px 2px 12px;
   scroll-snap-type:x mandatory}}
 .strip::-webkit-scrollbar{{height:8px}}
 .strip::-webkit-scrollbar-thumb{{background:#ddd3f7;border-radius:99px}}
 .slide{{position:relative;flex:0 0 auto;scroll-snap-align:start;border-radius:12px;
   overflow:hidden;box-shadow:0 8px 26px #1a0f2e1f;background:#fff;cursor:zoom-in;
   transition:transform .12s ease}}
 .slide:hover{{transform:translateY(-2px)}}
 .slide img{{display:block;width:min(72vw,300px);height:auto}}
 .slide .num{{position:absolute;bottom:8px;left:8px;background:#1a0f2ecc;color:#fff;
   font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:999px}}
 #lb{{position:fixed;inset:0;background:#12081fF2;display:none;
   z-index:99;flex-direction:column}}
 #lb.on{{display:flex}}
 #lb .bar{{display:flex;gap:12px;align-items:center;padding:10px 14px;color:#fff;
   font-size:12.5px}}
 #lb .bar b{{letter-spacing:.06em}}
 #lb .bar .sp{{margin-left:auto}}
 #lb figure{{flex:1;margin:0;display:flex;align-items:center;justify-content:center;
   padding:0 10px 10px;min-height:0}}
 #lb img{{max-width:100%;max-height:100%;object-fit:contain;border-radius:10px;
   box-shadow:0 20px 60px #0009}}
 #lb button{{background:#ffffff1a;color:#fff;border:1px solid #ffffff33;
   border-radius:999px;padding:6px 14px;font-size:13px;cursor:pointer}}
 #lb button:hover{{background:var(--vio)}}
 .covers{{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));
   gap:12px;padding-bottom:40px}}
 .covers figure{{margin:0;border-radius:12px;overflow:hidden;background:#fff;
   box-shadow:0 8px 22px #1a0f2e17;cursor:zoom-in;position:relative}}
 .covers img{{display:block;width:100%;height:auto}}
 .covers figcaption{{position:absolute;left:8px;bottom:8px;background:#1a0f2ecc;
   color:#fff;font-size:10.5px;padding:2px 7px;border-radius:999px}}
 h3.sec{{font-size:13px;letter-spacing:.14em;text-transform:uppercase;
   color:var(--vio);margin:6px 0 12px}}
</style></head>
<body>
<header class="top">
  <b>Sawtify — 30 carrousels · novembre 2026</b>
  <span class="hint">clic sur une slide → plein écran · ← → pour naviguer · échap pour sortir</span>
  <input id="q" placeholder="filtrer par direction…">
</header>
<nav class="days" id="days"></nav>
<div class="wrap">
  <h3 class="sec">Les 30 couvertures côte à côte</h3>
  <div class="covers" id="covers"></div>
  <h3 class="sec">Les carrousels, jour par jour</h3>
  <div id="list"></div>
</div>
<div id="lb">
  <div class="bar">
    <b id="lbt"></b>
    <span id="lbd" style="color:#c9bcf0"></span>
    <span class="sp"></span>
    <button id="prev">←</button>
    <button id="next">→</button>
    <button id="close">échap ✕</button>
  </div>
  <figure><img id="lbi" alt=""></figure>
</div>
<script>
const DATA = {payload};
const list = document.getElementById('list');
const days = document.getElementById('days');
const covers = document.getElementById('covers');
let flat = [];

DATA.forEach((p, idx) => {{
  const a = document.createElement('a');
  a.href = '#' + p.dir; a.textContent = 'J' + String(idx + 1).padStart(2, '0');
  days.appendChild(a);

  const f = document.createElement('figure');
  f.innerHTML = `<img loading="lazy" src="${{p.dir}}/01.jpg" alt="">
                 <figcaption>J${{String(idx+1).padStart(2,'0')}} · ${{p.kindfr}}</figcaption>`;
  f.onclick = () => open_(idx, 0);
  covers.appendChild(f);

  const sec = document.createElement('section');
  sec.className = 'pub';
  sec.id = p.dir;
  sec.dataset.kind = p.kindfr.toLowerCase();
  let strip = '';
  for (let k = 0; k < p.n; k++) {{
    const num = String(k + 1).padStart(2, '0');
    flat.push({{dir: p.dir, file: num + '.jpg'}});
    strip += `<div class="slide" data-day="${{idx}}" data-k="${{k}}">
      <img loading="lazy" src="${{p.dir}}/${{num}}.jpg" alt="">
      <span class="num">${{num}}</span></div>`;
  }}
  sec.innerHTML = `<h2><span class="day">J${{String(idx+1).padStart(2,'0')}}</span>
      <span class="kind">${{p.kindfr}}</span>
      <span class="n">${{p.n}} slides</span></h2>
    <div class="strip">${{strip}}</div>`;
  list.appendChild(sec);
}});

// index plat : (jour, slide)
let ptr = DATA.map(() => 0);
let cursor = 0;
let at = [];

DATA.forEach((p, d) => {{
  at[d] = [];
  for (let k = 0; k < p.n; k++) at[d].push(p.dir + '/' + String(k+1).padStart(2,'0') + '.jpg');
  ptr[d] = 0;
}});

let curDay = 0, curK = 0;
const lb = document.getElementById('lb'), lbi = document.getElementById('lbi');
const lbt = document.getElementById('lbt'), lbd = document.getElementById('lbd');

function open_(d, k) {{
  curDay = d; curK = k;
  lb.classList.add('on');
  show();
}}
function show() {{
  const p = DATA[curDay];
  lbi.src = p.dir + '/' + String(curK+1).padStart(2,'0') + '.jpg';
  lbt.textContent = 'J' + String(curDay+1).padStart(2,'0');
  lbd.textContent = p.kindfr + ' · slide ' + (curK+1) + '/' + p.n;
}}
document.getElementById('close').onclick = () => lb.classList.remove('on');
document.getElementById('prev').onclick = () => step(-1);
document.getElementById('next').onclick = () => step(1);
function step(v) {{
  curK += v;
  const p = DATA[curDay];
  if (curK < 0) {{ curDay = (curDay - 1 + DATA.length) % DATA.length; curK = DATA[curDay].n - 1; }}
  if (curK >= p.n) {{ curDay = (curDay + 1) % DATA.length; curK = 0; }}
  show();
}}
document.addEventListener('keydown', e => {{
  if (!lb.classList.contains('on')) return;
  if (e.key === 'ArrowRight') step(1);
  if (e.key === 'ArrowLeft') step(-1);
  if (e.key === 'Escape') lb.classList.remove('on');
}});
lb.addEventListener('click', e => {{ if (e.target === lb) lb.classList.remove('on'); }});
document.addEventListener('click', e => {{
  const s = e.target.closest('.slide');
  if (s) {{ open_(+s.dataset.day, +s.dataset.k); }}
}});
document.getElementById('q').oninput = e => {{
  const v = e.target.value.toLowerCase().trim();
  document.querySelectorAll('.pub').forEach(sec => {{
    sec.style.display = (!v || sec.dataset.kind.includes(v)) ? '' : 'none';
  }});
}};
</script>
</body></html>
"""


if __name__ == "__main__":
    html = build()
    for name in ("voir.html", "index.html"):
        out = os.path.join(ROOT, name)
        open(out, "w", encoding="utf-8").write(html)
        print("✓", os.path.abspath(out), len(html), "octets")
