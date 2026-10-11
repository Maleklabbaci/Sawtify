import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Check, Coins, Sparkles, X } from 'lucide-react';
import { ModalEyebrow, ModalShell, ModalTitle } from './ui/ModalShell';

/* ==========================================================================
   SAWTIFY 4.1 — « Quoi de neuf ? »
   --------------------------------------------------------------------------
   Pop-up d'accueil affichée à la première entrée dans le studio, puis
   ré-ouvrable depuis le bouton « Nouveautés » de la barre d'outils.

   Le contenu s'appuie sur le socle partagé `ModalShell` : portail au-dessus
   de l'application et de ses barres, arrière-plan flouté, scroll verrouillé,
   fermeture accessible et présentation adaptée aux petits écrans. Les styles
   de contenu restent sobres et utilisent la typographie de la plateforme.

   Règle de rédaction : uniquement des bénéfices concrets visibles ou audibles;
   aucun nom de modèle, route d'API ou détail d'infrastructure.
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
  return (
    <ModalShell
      onClose={onClose}
      ariaLabel={language === 'ar' ? 'ما الجديد في صوتيفي 4.1' : 'Nouveautés de Sawtify 4.1'}
      size="sm"
      panelClassName="border-purple-100 p-6"
      dataModal="whats-new"
    >
      <div dir={isRTL ? 'rtl' : 'ltr'}>
        {/* ── En-tête ───────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <ModalEyebrow>{language === 'ar' ? 'جديد' : 'Nouveau'}</ModalEyebrow>
            <ModalTitle className="mt-1">
              {language === 'ar' ? 'ما الجديد في صوتيفي 4.1' : 'Nouveautés de Sawtify 4.1'}
            </ModalTitle>
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
    </ModalShell>
  );
};

export default WhatsNewV41;
