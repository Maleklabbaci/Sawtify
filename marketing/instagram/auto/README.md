# auto/ — publication Instagram sans intervention

| Fichier | Rôle |
|---|---|
| `manifest.json` | les 30 posts : date, heure (Africa/Algiers), dossier Drive, légende |
| `auto_publish.py` | Drive → Cloudinary → API Instagram, avec anti-doublon |
| `state/published.json` | jours déjà publiés |
| `SETUP.md` | installation pas à pas (~40 min) |

Workflow : `.github/workflows/instagram-auto.yml` (cron 2×/heure + lancement manuel).

Test rapide : `python3 auto_publish.py --dry-run`
