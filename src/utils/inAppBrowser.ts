// Détecte les "mini-navigateurs" intégrés aux applis Facebook / Instagram
// (et quelques autres). Google y bloque volontairement la connexion OAuth
// ("Se connecter avec Google") pour des raisons de sécurité — la personne
// clique sur le bouton et n'arrive jamais jusqu'au bout de l'inscription.
// Sert à afficher un message clair + proposer l'inscription par e-mail
// (qui, elle, fonctionne dans ces navigateurs) en solution de repli.
export function isInAppBrowser(): boolean {
  const ua = navigator.userAgent || '';
  return /FBAN|FBAV|Instagram|Line\/|MicroMessenger|Snapchat/i.test(ua);
}

// Précise quelle appli est détectée, pour adapter le message affiché.
export function detectInAppBrowserName(): 'facebook' | 'instagram' | 'other' | null {
  const ua = navigator.userAgent || '';
  if (/Instagram/i.test(ua)) return 'instagram';
  if (/FBAN|FBAV/i.test(ua)) return 'facebook';
  if (/Line\/|MicroMessenger|Snapchat/i.test(ua)) return 'other';
  return null;
}
