# Guide d'utilisation de Sawtify

> **Pour qui ?** Pour toi, qui utilises le Studio Sawtify au quotidien.
> **Ce que ça t'apporte :** obtenir une voix off qui sonne **naturelle du premier coup**, au lieu
> d'une voix qui lit un texte comme un robot.

---

## 1. Les trois leviers, du plus fort au plus faible

Il n'y a que trois choses qui changent le résultat :

| Levier | Effet | Où |
|---|---|---|
| ① **Le texte que tu écris** | **70 % du résultat** | la zone de saisie |
| ② **Les balises de sons** | la respiration, les rires, les silences | dans le texte, entre chevrons |
| ③ **La voix, la vitesse, la hauteur** | le timbre et le rythme | les réglages |

La plupart des gens passent une heure sur le ③ et trente secondes sur le ①. C'est l'inverse
qu'il faut faire.

---

## 2. Écrire un texte qui sonne naturel

### Le point le plus important : la ponctuation, c'est la respiration

La voix **respire là où tu mets de la ponctuation**. C'est aussi simple que ça.

| Tu écris | La voix fait |
|---|---|
| `,` | une micro-pause |
| `.` | une vraie pause |
| `؟` `?` | une pause plus longue, avec une intonation montante |
| `…` | une pause d'hésitation |
| `!` | un ton plus appuyé |
| un **retour à la ligne** | une respiration franche |

### Quatre règles simples

1. **Des phrases courtes.** Une phrase = une idée = une respiration.
   ❌ `واش راكم خاوتي اليوم جبتلكم منتج جديد يخلي الصوت يخرج طبيعي وسلس ويريحك بزاف لأنو مصمم خصيصا للدارجة الجزائرية`
   ✅ `واش راكم خاوتي؟ اليوم جبتلكم منتج جديد. الصوت يخرج طبيعي، سلس، ويريّحك بزاف…`

2. **Écris comme tu parles.** Si tu ne le dirais pas à voix haute, ne l'écris pas.

3. **Mets les chiffres en lettres quand ils sont importants.**
   `2500 دج` peut être lu de plusieurs façons. `ألفين وخمسمية دينار` est lu exactement comme tu veux.

4. **Les MAJUSCULES font insister la voix.** À utiliser **rarement**, sinon tout crie.
   ✅ `هاذي فرصة ما تتكرّرش. صراحة؟ ماشي عادية.`

---

## 3. Les balises de sons — la vraie nouveauté

### À quoi ça sert

Une balise demande à la voix de **produire un son** au lieu de parler : un rire, un soupir, une
respiration, une pause, un cri. **Elle n'est jamais prononcée.** La voix ne dira jamais
le mot « laugh ».

### Écris-les comme tu veux : français, arabe ou anglais

C'est le même son, dans les trois écritures. Écris celle qui te vient naturellement.

| Le son | En français | En arabe | En anglais |
|---|---|---|---|
| Rire | `<rire>` | `<ضحكة>` | `<laugh>` |
| Petit rire | `<rire leger>` | `<ضحكة خفيفة>` | `<giggle>` |
| Rire étouffé | `<rire etouffe>` | `<ضحكة مكتومة>` | `<chuckle>` |
| Soupir | `<soupir>` | `<تنهد>` | `<sigh>` |
| Respiration | `<respiration>` | `<نفس>` | `<breath>` |
| Surprise | `<surprise>` | `<شهقة>` | `<gasp>` |
| Exclamation | `<exclamation>` | `<صياح>` | `<shout>` |
| Chuchotement | `<chuchotement>` | `<همس>` | `<whispers>` |
| Toux | `<toux>` | `<كحة>` | `<cough>` |
| Raclement de gorge | `<raclement de gorge>` | `<تنحنح>` | `<throat-clearing>` |
| Pause courte | `<pause courte>` | `<وقفة قصيرة>` | `<short pause>` |
| Pause longue | `<pause longue>` | `<وقفة طويلة>` | `<long pause>` |

**Les accents et les voyelles arabes ne comptent pas** : `<rire léger>`, `<RIRE LEGER>` et
`<ضَحْكة>` fonctionnent tous les trois.

### Comment l'utiliser

Mets la balise **exactement là où tu veux le son**, au milieu de la phrase :

```
واش راكم خاوتي <ضحكة> اليوم عندي خبر زين. <وقفة قصيرة>
راني نهدر معاكم على حاجة <تنهد> بدّلت خدمتي كاملة.
```

Résultat : la voix rit **à cet endroit précis**, marque un petit silence, puis soupire à
l'intérieur de la phrase. C'est ce qui donne l'impression d'une personne, pas d'un lecteur.

### Les cinq balises qui changent tout

| Balise | Quand l'utiliser |
|---|---|
| `<وقفة قصيرة>` | pour séparer deux idées sans faire une phrase complète |
| `<تنفس>` / `<respiration>` | après une phrase longue, pour une respiration naturelle |
| `<ضحكة>` / `<rire>` | après une vanne, pour un ton amical |
| `<همس>` / `<chuchotement>` | pour les confidences, les secrets, les fins de vidéo |
| `<وقفة طويلة>` | avant une révélation, pour créer l'attente |

### Trois choses à ne pas faire

| ❌ À éviter | Pourquoi | ✅ À faire plutôt |
|---|---|---|
| `<music>` `<applause>` `<door>` `<bang>` | Ces bruits **ne sont pas des sons humains** : Sawtify les retire automatiquement | Ajoute la musique ou le bruitage au montage vidéo, pas dans la voix |
| `[calm]` `[dramatic]` `[fast]` | L'ancienne syntaxe existe encore mais ces mots-là **ne font rien** | Utilise `speed` (vitesse) et `pitch` (hauteur) dans les réglages |
| Une balise tous les trois mots | La voix devient théâtrale, voire ridicule | **2 à 4 balises** par paragraphe suffisent largement |

> ⚠️ Si tu écris une balise que Sawtify ne connaît pas, elle est simplement retirée : elle ne sera
> **jamais** lue à voix haute. Tu ne risques rien, mais tu n'entendras rien non plus.

---

## 4. Les 30 voix — comment choisir

Tu as 30 voix. Elles ne sont pas rangées par langue (voir §5) mais par **caractère**.

### Les 9 voix que tes utilisateurs connaissent

| Prénom | Nom en arabe | Caractère | Genre |
|---|---|---|---|
| Amine | أمين | Enjouée et dynamique | Homme |
| Khalid | خالد | Informative et posée (documentaire) | Homme |
| Rachid | رشيد | Énergique et survoltée | Homme |
| Bilal | بلال | Grave et rocailleuse (conteur) | Homme |
| Fayçal | فيصل | Ferme et assurée (persuasive) | Homme |
| Yasmine | ياسمين | Éclatante et souriante | Femme |
| Maryam | مريم | Chaleureuse et douce | Femme |
| Layla | ليلى | Juvénile et vive (réseaux sociaux) | Femme |
| Nour | نور | Douce et apaisante | Femme |

### Les 21 nouvelles

Karim, Aya, Sami, Nada, Anis, Zaki, Walid, Nabil, Salma, Rania, Hakim, Riad, Adel, Nassim,
Omar, Yacine, Hicham, Reda, Amina, Sara, Mourad.

### Comment choisir en pratique

1. **Écoute les aperçus** : chaque voix a un fichier audio de démonstration. C'est gratuit et
   instantané.
2. **Commence par le caractère, pas par le prénom.** Tu ne cherches pas « Amine », tu cherches
   « quelqu'un qui donne de l'énergie » ou « quelqu'un qui rassure ».
3. **Repère de repère rapide :**

| Tu veux… | Prends plutôt |
|---|---|
| une pub qui donne envie | Rachid, Karim, Sadachbia |
| une voix de documentaire | Khalid, Gacrux, Sadaltager |
| rassurer un client | Maryam, Nour, Vindemiatrix |
| une vidéo TikTok qui accroche | Layla, Aya, Laomedeia |
| un conte, une histoire | Bilal, Enceladus |
| un message d'entreprise net | Fayçal, Pulcherrima, Rasalgethi |

**Écris le prénom, le nom en arabe, ou l'identifiant technique — les trois marchent.**

---

## 5. Les langues — la fin d'un faux problème

### Tu n'as rien à choisir

**Chaque voix parle toutes les langues.** La langue est détectée automatiquement, mot par mot.

Il n'y a **pas** de « voix française » et de « voix arabe ». Si tu lui écris du français, elle parle
français ; si tu lui écris de l'arabe, elle parle arabe. Avec la même voix.

### Et tu peux tout mélanger dans la même phrase

```
اليوم راني نهدّر معاكم على un nouveau service لي راهو يبدل كامل
la façon اللي راكم تكتبو بيها.
```

C'est lu **exactement comme c'est écrit** : le darija reste du darija, le français reste du
français. Rien n'est traduit, rien n'est transformé.

### La règle à retenir sur les balises

Une balise **ne change jamais la langue du texte**.

```
مرحبا خاوتي <laugh> واش راكم؟
```

est lu : « مرحبا خاوتي » (arabe) + **un rire** + « واش راكم؟ » (arabe).
La balise est une **instruction**, pas un mot. **Aucun mot anglais n'est ajouté.**

---

## 6. Le style : automatique, et tu peux le corriger

### Par défaut, tu n'as rien à faire

Sawtify choisit un style qui va bien avec la voix que tu as prise : Amine sera enjoué,
Khalid sera posé, Nour sera apaisante. C'est le **style automatique**.

### Si tu veux forcer le ton

| Réglage | Effet | Conseil |
|---|---|---|
| `speed` (vitesse) | `0.9` = posé, `1.1` = dynamique | Au-delà de `1.2`, ça devient dur à suivre |
| `pitch` (hauteur) | `0.95` = un peu plus grave, `1.05` = plus clair | Reste entre `0.9` et `1.1` |

> 💡 **Le style est tenu du début à la fin.** Même si ton texte est long, la voix ne change pas
> de ton en cours de route. Tu n'as pas à le découper toi-même.

---

## 7. Cinq exemples prêts à copier

### ① Publicité produit — darija énergique

> **Voix : Rachid** · **Vitesse : 1.1**

```
واش راكم خاوتي؟ <ضحكة> اليوم جبتلكم حاجة تفرح.
منتج جديد، بجودة عالية، وسعر ما تتوقعوهش.
<وقفة قصيرة> الكمية محدودة، فما تتراطيوش.
```

### ② Message d'accueil téléphonique — français posé

> **Voix : Khalid** · **Vitesse : 0.95**

```
Bonjour, et bienvenue chez nous. <pause courte>
Votre appel est important. Un conseiller va vous répondre dans quelques instants. <pause longue>
Merci de votre patience.
```

### ③ Tutoriel — français clair

> **Voix : Maryam** · **Vitesse : 1**

```
Aujourd'hui, je vous montre comment utiliser l'application, étape par étape. <pause courte>
D'abord, ouvrez l'écran d'accueil. <respiration>
Ensuite, appuyez sur le bouton violet, en bas à droite.
Et voilà : c'est terminé. <soupir>
```

### ④ Récit personnel — darija intime

> **Voix : Nour** · **Vitesse : 0.95**

```
راني نحكيلكم حاجة <تنهد> ما قلتهاش من قبل.
كان عندي حلم صغير… <وقفة طويلة> وقلت: علاش لا؟
<ضحكة خفيفة> واليوم، راني هنا.
```

### ⑤ TikTok qui accroche en 5 secondes

> **Voix : Layla** · **Vitesse : 1.15**

```
حبست! <شهقة> ما تسكرش الفيديو.
هاذي الحاجة <ضحكة> بدّلت كلشي.
شوف للآخر…
```

---

## 8. Aide-mémoire

### ✅ À faire

- Des **phrases courtes**, une idée par phrase.
- De la **ponctuation généreuse** — c'est ça qui fait respirer la voix.
- **2 à 4 balises** de sons par paragraphe, placées exactement où tu veux le son.
- Écrire les balises **dans la langue qui te vient** : français, arabe ou anglais.
- **Écouter l'aperçu** avant de lancer une longue génération.

### ❌ À éviter

- Un seul long paragraphe sans ponctuation.
- Des balises toutes les trois mots.
- Des majuscules partout.
- Des bruits non humains (`<music>`, `<applause>`) : ils sont retirés.
- Croire qu'il faut choisir une voix « arabe » ou une voix « française ». Ce n'est pas le cas.

---

## 9. Où trouver de l'aide

| Question | Où |
|---|---|
| Combien ça coûte, comment recharger | page **Tarifs** |
| Découvrir les voix | les **aperçus audio** de chaque voix dans le Studio |
| Intégrer Sawtify dans ton application | la page **Developer API** |
| Le détail technique des balises et des langues | `docs/langues-et-balises.md` |
