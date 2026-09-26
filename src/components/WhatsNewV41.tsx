import React, { useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Check, Coins, Sparkles, X } from 'lucide-react';

/* ==========================================================================
   SAWTIFY 4.1 — « Quoi de neuf ? »
   --------------------------------------------------------------------------
   Pop-up d'accueil affichée à la PREMIÈRE entrée dans le studio, puis
   ré-ouvrable à volonté depuis le bouton « Nouveautés » de la barre d'outils.

   Règle de rédaction : on ne parle QUE de ce que l'utilisateur voit et
   entend. Aucun nom de modèle, aucune route d'API, aucun détail
   d'infrastructure — uniquement des bénéfices concrets.

   ⚠️ STYLE — À NE PAS « EMBELLIR »
   --------------------------------------------------------------------------
   Cette pop-up a d'abord été construite comme un diaporama animé (5 écrans,
   pastilles de progression, gros chiffres en dégradé, halos qui bougent, fond
   flouté). Résultat : on aurait dit un jeu, pas Sawtify.

   Elle reprend donc EXACTEMENT le gabarit des autres modales du studio — la
   même que « Comment la voix doit-elle commencer ? » :
       fixed inset-0 z-[70] … bg-slate-950/60 backdrop-blur-sm
       w-full max-w-sm rounded-3xl border border-purple-200 bg-white p-6 shadow-2xl
       kicker : text-xs font-black uppercase tracking-[.14em] text-purple-600
       titre  : text-base font-extrabold text-slate-900
       texte  : text-xs leading-5 text-slate-500

   Elle ne doit contenir AUCUN style personnalisé : ni feuille <style>, ni
   police importée, ni animation. La police est celle de la plateforme, posée
   une fois pour toutes par `html[lang="ar"]` / `html[lang="fr"]` dans
   index.css — l'écrire ici la ferait diverger.

   ⚠️ ÉTAGE — z-[70]
   Le studio empile ses couches de z-[45] à z-[110] (et z-[80] pour la modale
   de génération). Cette pop-up doit rester EN DESSOUS de toutes : si un
   message important s'affiche (« solde insuffisant », « ajoute des points »),
   il doit passer AU-DESSUS d'elle et ne jamais être masqué.
   ========================================================================== */

/** Change cette valeur à chaque nouvelle annonce : la pop-up se remontrera. */
export const WHATS_NEW_VERSION = '4.1';

/** Clé locale : une pop-up déjà vue ne se remontre pas toute seule. */
export const WHATS_NEW_STORAGE_KEY = 'sawtify_whats_new_seen';

type Bilingue = { fr: string; ar: string };

/* -------------------------------------------------------------------------- */

/** Les 4 nouveautés, en une ligne chacune. Court = lu. */
const NOUVEAUTES: Bilingue[] = [
  {
    fr: '30 voix au lieu de 9 — dont 21 nouvelles',
    ar: '30 صوتاً بدل 9 — منها 21 صوتاً جديداً',
  },
  {
    fr: '35 sons d’émotion, écrits de 197 façons',
    ar: '35 صوتاً تعبيرياً بـ 197 طريقة كتابة',
  },
  {
    fr: 'Prononciation de la darija entièrement retravaillée',
    ar: 'نطق الدارجة أُعيد بناؤه بالكامل',
  },
  {
    fr: 'Écoute n’importe quelle voix gratuitement avant de choisir',
    ar: 'استمع لأي صوت مجاناً قبل الاختيار',
  },
];

/* -------------------------------------------------------------------------- */

export function shouldShowWhatsNew(): boolean {
  try {
    return localStorage.getItem(WHATS_NEW_STORAGE_KEY) !== WHATS_NEW_VERSION;
  } catch {
    // localStorage indisponible (navigation privée) → on ne montre pas la
    // pop-up plutôt que de la remontrer à chaque rendu.
    return false;
  }
}

export function markWhatsNewSeen(): void {
  try {
    localStorage.setItem(WHATS_NEW_STORAGE_KEY, WHATS_NEW_VERSION);
  } catch {
    /* ignoré */
  }
}

export function resetWhatsNew(): void {
  try {
    localStorage.removeItem(WHATS_NEW_STORAGE_KEY);
  } catch {
    /* ignoré */
  }
}

/* -------------------------------------------------------------------------- */

interface WhatsNewV41Props {
  onClose: () => void;
  /** « Commencer à créer » — ferme simplement la pop-up. */
  onStart: () => void;
  /** « Ajouter des points » — mène à la page de recharge. */
  onSupport: () => void;
}

export const WhatsNewV41: React.FC<WhatsNewV41Props> = ({ onClose, onStart, onSupport }) => {
  const { language, isRTL } = useLanguage();
  const t = (b: Bilingue) => (language === 'ar' ? b.ar : b.fr);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Le focus entre dans la carte (accessibilité clavier).
  useEffect(() => {
    cardRef.current?.focus();
  }, []);

  // Échap ferme, comme partout ailleurs dans la plateforme.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={language === 'ar' ? 'ما الجديد في صوتيفي 4.1' : 'Nouveautés de Sawtify 4.1'}
      dir={isRTL ? 'rtl' : 'ltr'}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        className="max-h-[88vh] w-full max-w-sm overflow-y-auto rounded-3xl border border-purple-200 bg-white p-6 shadow-2xl outline-none"
      >
        {/* ── En-tête ───────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[.14em] text-purple-600">
              {language === 'ar' ? 'جديد' : 'Nouveau'}
            </p>
            <h3 className="mt-1 text-base font-extrabold text-slate-900">
              {language === 'ar' ? 'ما الجديد في صوتيفي 4.1' : 'Nouveautés de Sawtify 4.1'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label={language === 'ar' ? 'إغلاق' : 'Fermer'}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-xs leading-5 text-slate-500">
          {language === 'ar'
            ? 'أكبر تحديث منذ انطلاق صوتيفي: محرّك صوتي من الجيل الجديد، وطريقة أفضل للكتابة.'
            : 'La plus grande mise à jour depuis le lancement : un moteur vocal de nouvelle génération, et une meilleure façon d’écrire.'}
        </p>

        {/* ── Les 4 nouveautés ──────────────────────────────────────────── */}
        <ul className="mt-4 space-y-2">
          {NOUVEAUTES.map((item) => (
            <li
              key={item.fr}
              className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3"
            >
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-purple-600">
                <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.5} />
              </span>
              <span className="text-[11px] font-semibold leading-5 text-slate-700">{t(item)}</span>
            </li>
          ))}
        </ul>

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={onStart}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-purple-600/25 transition hover:bg-purple-700"
          >
            <Sparkles className="h-4 w-4" />
            {language === 'ar' ? 'ابدأ الآن' : 'Commencer à créer'}
          </button>
          <button
            type="button"
            onClick={onSupport}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-purple-300 hover:text-purple-700"
          >
            <Coins className="h-4 w-4" />
            {language === 'ar' ? 'أضف نقاطاً' : 'Ajouter des points'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsNewV41;
