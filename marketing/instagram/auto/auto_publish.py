#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════
 auto_publish.py — publie le carrousel du jour sur Instagram, tout seul
───────────────────────────────────────────────────────────────────────────
 Flux : Google Drive (dossier public) → Cloudinary (URL publique) → Instagram

   python3 auto_publish.py --dry-run          # montre ce qui partirait
   python3 auto_publish.py                    # publie si c'est l'heure
   python3 auto_publish.py --day J05 --force  # force un jour précis
   python3 auto_publish.py --day J05 --only-urls   # n'imprime que les URLs

 Variables d'environnement :
   GOOGLE_API_KEY          clé API Google (Drive en lecture)
   CLOUDINARY_CLOUD        nom du cloud
   CLOUDINARY_API_KEY      clé API Cloudinary
   CLOUDINARY_API_SECRET   secret Cloudinary
   IG_USER_ID              id du compte Instagram pro
   IG_ACCESS_TOKEN         jeton longue durée Meta
───────────────────────────────────────────────────────────────────────────
 État : auto/state/published.json — évite tout doublon si le job relance.
═══════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
MANIFEST = HERE / "manifest.json"
STATE = HERE / "state" / "published.json"
GRAPH = "https://graph.facebook.com/v21.0"
IG_TZ = timezone(timedelta(hours=1))          # Africa/Algiers = UTC+1, sans heure d'été
GRACE_HOURS = 6                               # fenêtre de rattrapage si le job a raté son créneau


# ── petites aides HTTP ────────────────────────────────────────────────────
def _get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "sawtify-autopost/1.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def _post_form(url: str, data: dict) -> dict:
    body = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(url, data=body, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")
        raise RuntimeError(f"HTTP {e.code} sur {url}\n{detail}") from None


# ── 1. Drive : lister + télécharger les slides, dans l'ordre ──────────────
def drive_slides(folder_id: str) -> list[tuple[str, str]]:
    key = os.environ["GOOGLE_API_KEY"]
    q = urllib.parse.quote(f"'{folder_id}' in parents and trashed = false")
    url = (f"https://www.googleapis.com/drive/v3/files?q={q}"
           f"&key={key}&pageSize=100&orderBy=name&fields=files(id,name,mimeType)")
    files = json.loads(_get(url).decode()).get("files", [])
    slides = [
        (f["id"], f["name"]) for f in files
        if f["name"].endswith((".png", ".jpg", ".jpeg"))
        and f["name"][:2].isdigit()          # 01.png … 06.png, ignore contact-sheet
    ]
    slides.sort(key=lambda t: t[1])          # ordre alphabétique = ordre des slides
    if not slides:
        raise RuntimeError(f"Aucune slide trouvée dans le dossier {folder_id}")
    return slides


def drive_download(file_id: str) -> bytes:
    key = os.environ["GOOGLE_API_KEY"]
    return _get(f"https://www.googleapis.com/drive/v3/files/{file_id}"
                f"?alt=media&key={key}")


# ── 2. PNG → JPEG (Instagram préfère le JPEG, plafond 8 Mo) ───────────────
def to_jpeg(raw: bytes, quality: int = 92) -> bytes:
    try:
        from PIL import Image
    except ImportError:                       # pas de Pillow : on renvoie tel quel
        return raw
    img = Image.open(io.BytesIO(raw))
    if img.mode not in ("RGB",):
        img = img.convert("RGB")
    out = io.BytesIO()
    img.save(out, "JPEG", quality=quality, optimize=True, progressive=True)
    data = out.getvalue()
    if len(data) > 8 * 1024 * 1024:            # marge de sécurité IG
        out = io.BytesIO()
        img.save(out, "JPEG", quality=78, optimize=True)
        data = out.getvalue()
    return data


# ── 3. Cloudinary : héberger pour donner une URL publique à Meta ──────────
def cloudinary_upload(jpeg: bytes, public_id: str) -> str:
    cloud = os.environ["CLOUDINARY_CLOUD"]
    api_key = os.environ["CLOUDINARY_API_KEY"]
    secret = os.environ["CLOUDINARY_API_SECRET"]

    timestamp = int(time.time())
    params = {"folder": "sawtify/instagram", "public_id": public_id,
              "timestamp": timestamp, "overwrite": "true"}
    to_sign = "&".join(f"{k}={params[k]}" for k in sorted(params))
    signature = hashlib.sha1((to_sign + secret).encode()).hexdigest()

    b64 = base64.b64encode(jpeg).decode()
    payload = {**params, "api_key": api_key, "signature": signature,
               "file": f"data:image/jpeg;base64,{b64}"}
    res = _post_form(f"https://api.cloudinary.com/v1_1/{cloud}/image/upload", payload)
    return res["secure_url"]


# ── 4. Instagram : conteneurs enfants → carrousel → publication ───────────
def ig_post(path: str, data: dict) -> dict:
    return _post_form(f"{GRAPH}/{path}",
                      {**data, "access_token": os.environ["IG_ACCESS_TOKEN"]})


def wait_ready(container_id: str, timeout: int = 120) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        url = (f"{GRAPH}/{container_id}?fields=status_code"
               f"&access_token={os.environ['IG_ACCESS_TOKEN']}")
        code = json.loads(_get(url).decode()).get("status_code", "FINISHED")
        if code == "FINISHED":
            return
        if code == "ERROR":
            raise RuntimeError(f"Conteneur {container_id} en erreur")
        time.sleep(5)


def publish_carousel(urls: list[str], caption: str, dry: bool) -> str:
    if dry:
        print("   [dry-run] conteneurs + publication non exécutés")
        return "dry-run"

    ig_id = os.environ["IG_USER_ID"]
    children = []
    for i, u in enumerate(urls, 1):
        r = ig_post(f"{ig_id}/media", {"image_url": u, "is_carousel_item": "true"})
        children.append(r["id"])
        print(f"   slide {i}/{len(urls)} → conteneur {r['id']}")

    parent = ig_post(f"{ig_id}/media", {
        "media_type": "CAROUSEL",
        "children": ",".join(children),
        "caption": caption,
    })["id"]

    for _ in range(24):                       # le parent peut mettre ~1 min à être prêt
        try:
            wait_ready(parent)
            break
        except RuntimeError:
            raise
        except Exception:
            time.sleep(5)

    published = ig_post(f"{ig_id}/media_publish", {"creation_id": parent})
    return published["id"]


# ── 5. état (anti-doublon) ────────────────────────────────────────────────
def load_state() -> dict:
    if STATE.exists():
        return json.loads(STATE.read_text(encoding="utf-8"))
    return {}


def save_state(state: dict) -> None:
    STATE.parent.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


# ── 6. sélection du post à publier ────────────────────────────────────────
def due_posts(now_algiers: datetime, state: dict) -> list[dict]:
    due = []
    for p in json.loads(MANIFEST.read_text(encoding="utf-8"))["posts"]:
        if p["day"] in state:
            continue
        when = datetime.fromisoformat(f"{p['date']}T{p['time']}:00").replace(tzinfo=IG_TZ)
        if when <= now_algiers <= when + timedelta(hours=GRACE_HOURS):
            due.append(p)
    return due


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--day", help="forcer un jour (J01 … J30)")
    ap.add_argument("--force", action="store_true", help="ignorer l'heure et l'état")
    ap.add_argument("--dry-run", action="store_true", help="simulation complète")
    ap.add_argument("--only-urls", action="store_true", help="n'afficher que les URLs")
    args = ap.parse_args()

    now = datetime.now(timezone.utc).astimezone(IG_TZ)
    state = load_state()
    posts = json.loads(MANIFEST.read_text(encoding="utf-8"))["posts"]

    if args.day:
        todo = [p for p in posts if p["day"].lower() == args.day.lower()]
        if not todo:
            print(f"Jour inconnu : {args.day}")
            return 2
        if not args.force and todo[0]["day"] in state:
            print(f"{args.day} déjà publié ({state[todo[0]['day']]}). --force pour republier.")
            return 0
    elif args.force:
        print("--force sans --day : refuse de republier tout le mois d'un coup.")
        return 2
    else:
        todo = due_posts(now, state)

    if not todo:
        print(f"[{now:%Y-%m-%d %H:%M}] rien à publier.")
        return 0

    for post in todo:
        print(f"\n▶ {post['day']} · {post['date']} {post['time']} · {post['dossier']}")
        slides = drive_slides(post["folder_id"])
        print(f"   {len(slides)} slides : {', '.join(n for _, n in slides)}")
        if len(slides) != post["slides_expected"]:
            print(f"   ⚠ attendu {post['slides_expected']} slides, trouvé {len(slides)}"
                  f" — publication annulée par prudence")
            return 3
        if len(slides) < 2 or len(slides) > 10:
            print("   ⚠ Instagram accepte 2 à 10 slides pour un carrousel")
            return 3

        urls = []
        for file_id, name in slides:
            raw = drive_download(file_id)
            jpeg = to_jpeg(raw)
            public_id = f"{post['day'].lower()}-{name.rsplit('.', 1)[0]}"
            if args.only_urls or args.dry_run:
                urls.append(f"(dry-run) {public_id}.jpg")
                continue
            urls.append(cloudinary_upload(jpeg, public_id))
            print(f"   hébergé {name} → {urls[-1]}")

        if args.only_urls:
            print(json.dumps(urls, ensure_ascii=False))
            continue

        media_id = publish_carousel(urls, post["caption"], args.dry_run)
        print(f"   ✅ publié : {media_id}")
        if not args.dry_run:
            state[post["day"]] = {"media_id": media_id, "at": now.isoformat()}
            save_state(state)

    return 0


if __name__ == "__main__":
    sys.exit(main())
