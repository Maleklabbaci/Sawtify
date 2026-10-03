/**
 * VÉRIFICATION DES PAGES PUBLIQUES (SEO) — Sawtify
 * ---------------------------------------------------------------------------
 * Lancement :  npm run verif:pages
 *
 * Ces pages sont écrites à la main, en HTML pur : rien ne les protège d'une
 * faute de frappe. Ce script relit les 6 fichiers et vérifie ce qui compte
 * pour Google — et ce qui casserait silencieusement :
 *
 *   1. le fichier existe et contient assez de texte (page vide = page ignorée) ;
 *   2. le titre et la description existent et sont UNIQUES (deux pages avec le
 *      même titre se font concurrence entre elles) ;
 *   3. l'adresse canonique est présente (sinon Google choisit lui-même) ;
 *   4. le couple français ↔ arabe est déclaré DANS LES DEUX SENS (hreflang) ;
 *   5. le JSON-LD (données structurées) est un JSON valide — une virgule en
 *      trop le rendait invisible sans que personne ne s'en aperçoive ;
 *   6. chaque lien interne mène quelque part (une page qui existe vraiment) ;
 *   7. le plan du site (sitemap.xml) liste toutes les pages, et robots.txt
 *      n'en bloque aucune.
 *
 * Aucune dépendance : `node scripts/verifier-pages-seo.mjs` suffit.
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(root, 'public');

const SITE = 'https://sawtify.space';

/** Les pages attendues : adresse publique -> fichier réel. */
const PAGES = {
  '/voix-off-darija': 'voix-off-darija.html',
  '/sawt-darija': 'sawt-darija.html',
  '/voix-off-tiktok': 'voix-off-tiktok.html',
  '/voix-off-publicite': 'voix-off-publicite.html',
  '/voix-off-formation': 'voix-off-formation.html',
  '/voix-off-ecommerce': 'voix-off-ecommerce.html',
};

/** Le couple multilingue qui doit se déclarer dans les deux sens. */
const HREFLANG_PAIRS = [['/voix-off-darija', '/sawt-darija']];

/** Adresses internes autorisées en plus des pages ci-dessus (site React + doc). */
const ROUTES_CONNUES = new Set(['/', '/pricing', '/studio', '/historique', '/recharge', '/developer', '/admin', '/docs/developer-api-beta.html']);

let checks = 0;
const failures = [];
const warnings = [];

function ok(label, condition, detail = '') {
  checks += 1;
  if (condition) return true;
  failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
  return false;
}

function warn(label) { warnings.push(label); }

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ');
}

const titles = new Map();
const descriptions = new Map();
const canonicals = new Map();
const hreflangs = new Map();

console.log('\n=== VÉRIFICATION DES PAGES PUBLIQUES (SEO) ===\n');

for (const [route, file] of Object.entries(PAGES)) {
  const filePath = path.join(PUBLIC, file);
  if (!ok(`${file} : le fichier existe`, existsSync(filePath))) continue;

  const html = readFileSync(filePath, 'utf8');
  const label = file;

  /* 1. Contenu réellement présent ---------------------------------------- */
  const words = stripTags(html).split(/\s+/).filter((w) => w.length > 1).length;
  ok(`${label} : contenu suffisant (${words} mots, minimum 400)`, words >= 400, 'page trop maigre pour être utile aux visiteurs et à Google');

  /* 2. Titre + description ------------------------------------------------ */
  const title = (html.match(/<title>([^<]+)<\/title>/i) || [])[1]?.trim();
  const description = (html.match(/<meta\s+name="description"\s+content="([^"]+)"/i) || [])[1]?.trim();
  ok(`${label} : balise <title> présente`, Boolean(title));
  ok(`${label} : description présente`, Boolean(description));
  if (title && title.length > 65) warn(`${label} : titre long (${title.length} caractères), Google le coupera vers 60`);
  if (description && (description.length < 70 || description.length > 165)) warn(`${label} : description de ${description.length} caractères (idéal : 70 à 160)`);
  /* 2bis. Variantes d'orthographe : « darija » s'écrit aussi « dardja »,
     « derdja », « darja ». Ce sont des recherches DIFFÉRENTES pour Google :
     si la variante disparaît des mots-clés, cette recherche ne tombe plus ici. */
  const keywords = (html.match(/<meta\s+name="keywords"\s+content="([^"]+)"/i) || [])[1] || '';
  const variante = route === '/sawt-darija' ? 'الدردجة' : 'dardja';
  ok(`${label} : variante d'orthographe « ${variante} » couverte`, keywords.includes(variante), 'recherche réelle des utilisateurs — ne pas la retirer des mots-clés');

  if (title) { if (titles.has(title)) failures.push(`${label} : titre identique à ${titles.get(title)}`); titles.set(title, label); }
  if (description) { if (descriptions.has(description)) failures.push(`${label} : description identique à ${descriptions.get(description)}`); descriptions.set(description, label); }

  /* 3. Adresse canonique --------------------------------------------------- */
  const canonical = (html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i) || [])[1]?.trim();
  ok(`${label} : adresse canonique présente`, Boolean(canonical));
  ok(`${label} : adresse canonique correcte (${route})`, canonical === `${SITE}${route}`, `trouvé : ${canonical}`);
  if (canonical) canonicals.set(route, canonical);

  /* 4. hreflang : relevé pour vérification croisée plus bas ---------------- */
  const langs = [...html.matchAll(/<link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"/gi)].map((m) => ({ lang: m[1], href: m[2] }));
  hreflangs.set(route, langs);
  ok(`${label} : hreflang x-default déclaré`, langs.some((l) => l.lang === 'x-default'));
  ok(`${label} : langue de la page cohérente avec hreflang`, langs.some((l) => l.href === `${SITE}${route}`), 'aucun hreflang ne pointe vers cette page elle-même');

  /* 5. Images de partage --------------------------------------------------- */
  ok(`${label} : image de partage (og:image)`, /<meta\s+property="og:image"/i.test(html));

  /* 6. Données structurées (JSON-LD) -------------------------------------- */
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  ok(`${label} : données structurées présentes`, blocks.length > 0);
  blocks.forEach((block, i) => {
    checks += 1;
    try { JSON.parse(block[1]); }
    catch (e) { failures.push(`${label} : JSON-LD n°${i + 1} invalide — ${e.message}`); }
  });

  /* 7. Feuille de style partagée ------------------------------------------ */
  const cssHref = (html.match(/<link\s+rel="stylesheet"\s+href="([^"]+)"/i) || [])[1];
  ok(`${label} : feuille de style présente`, Boolean(cssHref));
  if (cssHref && cssHref.startsWith('/')) {
    ok(`${label} : fichier de style ${cssHref} existe`, existsSync(path.join(PUBLIC, cssHref.replace(/^\//, ''))), 'chemin introuvable dans public/');
  }

  /* 8. Tous les liens internes mènent quelque part ------------------------ */
  const hrefs = [...html.matchAll(/href="(\/[^"#]*)"/g)].map((m) => m[1].split('?')[0]);
  for (const href of new Set(hrefs)) {
    checks += 1;
    const isPage = Boolean(PAGES[href]) || href.endsWith('.html');
    const isRoute = ROUTES_CONNUES.has(href);
    const isFile = existsSync(path.join(PUBLIC, href.replace(/^\//, '')));
    if (!isPage && !isRoute && !isFile) failures.push(`${label} : lien interne cassé → ${href}`);
  }

  console.log(`  ✓ ${route.padEnd(26)} ${String(words).padStart(5)} mots`);
}

/* 9. hreflang dans les deux sens ------------------------------------------ */
for (const [fr, ar] of HREFLANG_PAIRS) {
  const frLinks = hreflangs.get(fr) || [];
  const arLinks = hreflangs.get(ar) || [];
  ok(`hreflang ${fr} → ${ar}`, frLinks.some((l) => l.href === `${SITE}${ar}`));
  ok(`hreflang ${ar} → ${fr}`, arLinks.some((l) => l.href === `${SITE}${fr}`));
}

/* 10. Plan du site (sitemap.xml) ------------------------------------------ */
const sitemapPath = path.join(PUBLIC, 'sitemap.xml');
if (ok('sitemap.xml existe', existsSync(sitemapPath))) {
  const sitemap = readFileSync(sitemapPath, 'utf8');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  ok('sitemap.xml : balise <urlset> fermée correctement', /<\/urlset>\s*$/.test(sitemap.trim()));
  for (const route of Object.keys(PAGES)) {
    ok(`sitemap.xml : ${route} est listée`, locs.includes(`${SITE}${route}`), 'une page absente du plan du site est indexée beaucoup plus lentement');
  }
  ok('sitemap.xml : adresse du site correcte', locs.every((l) => l.startsWith(SITE)), `adresse inattendue : ${locs.find((l) => !l.startsWith(SITE)) || '—'}`);
}

/* 11. robots.txt ne bloque aucune page publique --------------------------- */
const robotsPath = path.join(PUBLIC, 'robots.txt');
if (ok('robots.txt existe', existsSync(robotsPath))) {
  const robots = readFileSync(robotsPath, 'utf8');
  const disallows = [...robots.matchAll(/^Disallow:\s*(\S+)/gim)].map((m) => m[1]);
  for (const route of Object.keys(PAGES)) {
    const blocked = disallows.some((d) => d !== '/' && route.startsWith(d));
    ok(`robots.txt : ${route} non bloquée`, !blocked, `bloquée par « Disallow: ${disallows.find((d) => route.startsWith(d))} »`);
  }
  ok('robots.txt : renvoie vers le plan du site', /Sitemap:\s*https:\/\/sawtify\.space\/sitemap\.xml/i.test(robots));
}

/* 12. Le serveur sert bien ces pages (url propre + fichier) --------------- */
const serverSrc = readFileSync(path.join(root, 'server.ts'), 'utf8');
for (const file of Object.values(PAGES)) {
  ok(`server.ts : ${file} déclarée dans la liste blanche SEO_PAGES`, serverSrc.includes(`"${file.replace('.html', '')}"`), 'adresse propre non servie');
}

/* ------------------------------------------------ Résultat --------------- */
console.log('');
if (warnings.length) {
  console.log(`⚠️  ${warnings.length} remarque(s) (non bloquante) :`);
  for (const w of warnings) console.log(`   • ${w}`);
  console.log('');
}
if (failures.length) {
  console.log(`❌ ${checks} vérifications, ${failures.length} échec(s) :`);
  for (const f of failures) console.log(`   • ${f}`);
  process.exit(1);
}
console.log(`✅ ${checks} vérifications, 0 échec — les pages publiques sont complètes et cohérentes.`);
