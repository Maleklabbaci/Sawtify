# Clés Gemini : quota gratuit puis clé payante

Sawtify peut essayer une clé provenant d'un projet Gemini au palier gratuit, puis basculer vers
une clé payante après la détection de l'épuisement du quota **quotidien** du modèle.

## Configuration Render

Dans **Render → service Sawtify → Environment**, ajouter les secrets suivants (ne jamais les
commiter, les mettre dans une variable `VITE_*` ou les envoyer dans la conversation) :

```text
GEMINI_API_KEY_FREE=clé du projet AI Studio au palier gratuit
GEMINI_API_KEY_PAID=clé d'un projet avec la facturation activée
```

La variable historique `GEMINI_API_KEY` reste acceptée comme clé de secours payante. Donc, pour
une migration sans interruption, on peut garder la clé actuelle dans `GEMINI_API_KEY` et ajouter
seulement `GEMINI_API_KEY_FREE`; ensuite, `GEMINI_API_KEY_PAID` est le nom recommandé.

**Important :** les quotas Gemini sont appliqués **par projet**, pas par clé API. Deux clés créées
dans le même projet partagent donc le même quota gratuit et ne le doublent pas. La clé gratuite
et la clé de secours doivent provenir de projets distincts, et le deuxième projet doit avoir la
facturation activée.

## Comportement

- La clé Free est choisie en premier pour les requêtes TTS, previews, textes, Voice Design et
  l'initialisation des sessions Live.
- Lorsqu'une réponse identifie clairement le quota **par jour** comme épuisé, Sawtify désactive la
  clé gratuite pour ce modèle jusqu'au prochain minuit, heure du Pacifique, puis utilise la clé
  payante. La limite est suivie en mémoire par instance serveur et par modèle; elle se réinitialise
  automatiquement à l'échéance ou au redémarrage.
- Une limite courte par minute ne déclenche pas à elle seule la relève payante : Sawtify suit alors
  la politique temporaire de retry, afin d'éviter de payer simplement pour un petit pic de débit.
- Sur le TTS, la relève utilise le budget de tentative déjà prévu : **au plus deux appels Gemini
  par morceau**. Un 400/404 reste terminal et n'est pas retenté avec l'autre clé.
- Sans clé Free, l'application utilise la clé Paid, puis l'ancienne `GEMINI_API_KEY` si nécessaire.
  Sans clé Paid, l'application renvoie l'erreur de quota gratuit sans boucle ni appels répétés.
- Au démarrage, les logs indiquent uniquement `free=...` et `paid=...`, jamais les clés. Si les deux
  variables contiennent la même valeur, un avertissement précise qu'elles ne fournissent pas deux
  quotas indépendants.

Les quotas actifs varient selon le modèle et le projet. Google AI Studio affiche leur état dans la
page **Rate limits**. Le nom de la variable ne change pas le palier facturé : seule la configuration
du projet Gemini décide si les appels sont gratuits ou payants.
