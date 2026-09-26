# 🌍 Langues & balises — français, arabe, darija

**Réponse à : « est-ce que le français et l'arabe sont inclus ? »**
**Et correction d'un bug réel trouvé en vérifiant.**

---

## 1. 🚨 Le bug trouvé (et corrigé)

En testant, j'ai découvert que **2 cas sur 3 étaient cassés** :

| Ce que l'utilisateur écrit | ❌ Avant | ✅ Maintenant |
|---|---|---|
| `<laugh>` (anglais) | ✅ Converti | ✅ Converti |
| `<rire>` (français) | ❌ **Supprimé** — son perdu | ✅ **→ `<laugh>`** |
| `<ضحكة>` (arabe) | 🔴 **ENVOYÉ TEL QUEL → lu à voix haute !** | ✅ **→ `<laugh>`** |

### Le cas `<ضحكة>` était le plus grave

Le modèle recevait la balise arabe telle quelle. Comme Google n'accepte que
l'anglais, il la **lisait à voix haute** : l'utilisateur écrivait « rire »
et entendait le mot « ضحكة » prononcé. **Exactement le bug que tu soupçonnais.**

---

## 2. ✅ Maintenant : 197 façons d'écrire une balise

```
40 écritures officielles anglaises  (garanties par Google)
83 écritures françaises
74 écritures arabes
────────────────────────────────────────
197 écritures acceptées au total
```

### Le catalogue accepte les 3 langues

| Son | 🇬🇧 Anglais (officiel) | 🇫🇷 Français | 🇩🇿 Arabe |
|---|---|---|---|
| Rire | `<laugh>` `<laughter>` | `<rire>` `<fou rire>` | `<ضحكة>` `<ضحك>` |
| Rire léger | `<giggle>` | `<gloussement>` `<rire leger>` | `<ضحكة خفيفة>` |
| Soupir | `<sigh>` `<sighs>` | `<soupir>` `<soupirer>` | `<تنهد>` `<تنهيدة>` |
| Toux | `<cough>` | `<toux>` `<tousser>` | `<كحة>` `<سعال>` |
| Exaspération | `<argh>` | `<ras le bol>` `<zut>` | `<تأفف>` `<طفح الكيل>` |
| Chuchotement | `<whispers>` | `<chuchotement>` `<murmure>` | `<همس>` |
| Pause courte | `<short pause>` | `<pause courte>` | `<وقفة قصيرة>` |
| … et les 28 autres | | | |

### Détails techniques gérés automatiquement

| Cas difficile | Résultat |
|---|---|
| `<RIRE LÉGER>` (majuscules + accent) | ✅ → `<giggle>` |
| `<rire leger>` (sans accent) | ✅ → `<giggle>` |
| `<تأفّف>` (avec diacritiques arabes) | ✅ → `<argh>` |
| `<تأفف>` (sans diacritiques) | ✅ → `<argh>` |
| `<ض ح ك ة>` (espaces parasites) | ✅ → `<laugh>` |

---

## 3. ⚠️ La règle de sécurité, maintenant stricte

```
<...>  (CHEVRONS)  =  l'utilisateur veut un SON
                     → si inconnu : RETIRÉ (jamais laissé, sinon prononcé à voix haute)

[...]  (CROCHETS)  =  l'utilisateur veut un MOT PRONONCÉ
                     → conservé tel quel, quelle que soit la langue
```

### Vérifié dans les tests

| Entrée | Résultat |
|---|---|
| `<ضحكة>` | → `<laugh>` 🇩🇿→EN |
| `<سعاد>` (inconnu, arabe) | **RETIRÉ** — jamais prononcé |
| `<bonjour>` (inconnu, français) | **RETIRÉ** |
| `[مهتم]` (mot arabe) | **PRÉSERVÉ** — sera prononcé ✓ |
| `[promo]` (mot français) | **PRÉSERVÉ** — sera prononcé ✓ |
| `[excited]` (ancienne balise) | → `<cheer>` |
| `[applause]` (bruitage) | RETIRÉ |

---

## 4. 🎯 Ce qui part à Google : toujours 100 % anglais propre

Exemple réel :

```
L'utilisateur écrit :
   مرحبا <ضحكة> واش راكم <soupir> لاباس؟ <blabla> [مهتم]

Ce que Google reçoit :
   مرحبا <laugh> واش راكم <sigh> لاباس؟ [مهتم]
                            ↑                    ↑
              traduit en anglais      mot arabe préservé,
              officiel                il sera PRONONCÉ
```

**Aucune traduction du contenu.** Seules les balises sont normalisées.

---

## 5. 🌐 Les langues parlées supportées (doc Google)

| Langue | 3.8 Flash | 3.8 Flash-Lite |
|---|:---:|:---:|
| **Français** | ✔️ | ✔️ |
| **Arabe standard (écriture arabe)** | ✔️ | ✔️ |
| **Arabe standard (écriture latine)** | ✔️ | ✔️ |
| **Arabe égyptien** | ✔️ | ✔️ |
| **Kabyle (tamazight, Algérie)** | ✔️ | ❌ |
| Anglais | ✔️ | ✔️ |

- La **darija algérienne s'écrit en arabe** → couverte par « Arabe standard ».
- La **détection de langue est AUTOMATIQUE** : rien à configurer, ni par toi ni par l'utilisateur.
- Le **français mélangé dans un texte darija** est préservé et bien prononcé (« online », « CIB », « les leads »).
- ⚠️ Le **Kabyle n'est pas disponible sur Flash-Lite** — à garder en tête si tu utilises ce modèle pour les comptes gratuits.

---

## 6. Pourquoi les balises restent en anglais chez Google

Google recommande explicitement : *« If your transcript is not in English,
for best results we recommend that you still use English audio tags. »*

**Et ça ne change PAS la langue parlée.** La voix parle darija, rigole en
darija, soupire en darija. `<laugh>` est une **instruction**, pas un mot.

C'est pour ça que la traduction est faite **côté serveur, automatiquement** :
l'utilisateur écrit dans sa langue, Google reçoit de l'anglais propre,
et la qualité audio est maximale dans les deux cas.

---

## 7. Tests ✅

```
89 tests au total, 0 échec
   dont 21 nouveaux tests multilingues :
   ✓ <rire> → <laugh>
   ✓ <soupir> → <sigh>
   ✓ <ضحكة> → <laugh>
   ✓ <وقفة قصيرة> → <short pause>
   ✓ <RIRE LÉGER> → <giggle>   (majuscules + accents)
   ✓ <تأفّف> → <argh>          (diacritiques arabes)
   ✓ <سعاد> (inconnu) RETIRÉ
   ✓ [مهتم] PRÉSERVÉ
   ✓ [promo] PRÉSERVÉ
   ✓ 83 écritures françaises
   ✓ 74 écritures arabes
   ✓ 197 écritures au total
   ✓ toutes les balises envoyées sont en anglais officiel
```

### Commandes

```bash
npm run test:tts        # 89 tests
npm run verif:balises   # vérifie les 40 balises officielles
npm run demo:langues    # montre ce qui part à Google, en direct
```

---

## 8. Prochaine étape

Le catalogue des voix studio (`tts/voices.ts`) peut recevoir **le même
traitement** : accepter « Amine », « Yasmine »… et les **descriptions de
voix sur mesure en français et en arabe** pour la création de voix
régionales (Alger / Oran / Constantine).

Dis-moi et je continue.
