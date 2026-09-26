import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeft, ArrowRight, Check, Coins, Mic2, Sparkles, X } from 'lucide-react';

/* ==========================================================================
   SAWTIFY 4.1 — « Quoi de neuf ? »
   --------------------------------------------------------------------------
   Pop-up d'accueil affichée à la PREMIÈRE entrée dans le studio, puis
   ré-ouvrable à volonté depuis le bouton « Nouveautés » de la barre d'outils.

   Réécrite le 26/09 pour reprendre le HABILLAGE STANDARD des autres pop-ups
   du studio (RechargeModal, WelcomeOnboarding) plutôt qu'un style qui lui
   était propre : carte blanche, overlay et z-index (z-50) identiques aux
   autres modales — donc plus jamais au-dessus d'une modale de paiement par
   exemple —, même palette (slate / purple-600), même typographie, sans les
   halos animés, le texte en dégradé ni l'égaliseur, jugés trop chargés.
   Contenu aussi resserré : 5 écrans → 3, pour une lecture plus rapide.

   Règle de rédaction : on ne parle QUE de ce que l'utilisateur voit et
   entend. Aucun nom de modèle, aucune route d'API, aucun détail d'
   infrastructure — uniquement des bénéfices concrets.
   ========================================================================== */

/** Change cette valeur à chaque nouvelle annonce : la pop-up se remontrera. */
export const WHATS_NEW_VERSION = '4.1';

/** Une seule clé : elle contient la version déjà vue. */
export const WHATS_NEW_STORAGE_KEY = 'sawtify_whats_new_seen';

/** Affiche la pop-up si cette version n'a jamais été vue sur cet appareil. */
export function shouldShowWhatsNew(): boolean {
  try {
    return localStorage.getItem(WHATS_NEW_STORAGE_KEY) !== WHATS_NEW_VERSION;
  } catch {
    // Navigation privée / stockage bloqué : on préfère ne pas harceler.
    return false;
  }
}

/** Marque la version comme vue (appelé dès l'ouverture, pas à la fermeture). */
export function markWhatsNewSeen(): void {
  try { localStorage.setItem(WHATS_NEW_STORAGE_KEY, WHATS_NEW_VERSION); } catch { /* ignoré */ }
}

/** Permet de la revoir (utilisé par les tests et le bouton « Nouveautés »). */
export function resetWhatsNew(): void {
  try { localStorage.removeItem(WHATS_NEW_STORAGE_KEY); } catch { /* ignoré */ }
}

type Bilingue = { fr: string; ar: string };

interface Slide {
  kicker: Bilingue;
  titre: Bilingue;
  sousTitre?: Bilingue;
  puces?: Bilingue[];
}

/* -------------------------------------------------------------------------- */

const SLIDES: Slide[] = [
  {
    kicker: { fr: 'NOUVEAU', ar: 'جديد' },
    titre: { fr: 'Bienvenue dans Sawtify 4.1', ar: 'مرحباً بك في صوتيفي 4.1' },
    sousTitre: {
      fr: 'La plus grande mise à jour depuis le lancement de Sawtify.',
      ar: 'أكبر تحديث منذ انطلاق صوتيفي.',
    },
    puces: [
      { fr: '30 voix au lieu de 9', ar: '30 صوتاً بدل 9' },
      { fr: '35 sons d’émotion, écrits de 197 façons', ar: '35 صوتاً تعبيرياً بـ 197 طريقة كتابة' },
      { fr: 'Prononciation de la darija entièrement retravaillée', ar: 'نطق الدارجة أُعيد بناؤه بالكامل' },
    ],
  },
  {
    kicker: { fr: 'LES VOIX ET LES ÉMOTIONS', ar: 'الأصوات والمشاعر' },
    titre: { fr: '21 nouvelles voix, un son plus juste.', ar: '21 صوتاً جديداً، ونطق أدق.' },
    sousTitre: {
      fr: 'Chaque voix a été reprise, une par une, pour la darija.',
      ar: 'أُعيد ضبط كل صوت، واحداً واحداً، من أجل الدارجة.',
    },
    puces: [
      { fr: 'Écoute n’importe quelle voix gratuitement avant de choisir', ar: 'استمع لأي صوت مجاناً قبل الاختيار' },
      { fr: 'Rire, soupir, chuchotement… reconnus en français, arabe ou anglais', ar: 'ضحكة، تنهيدة، همس… تُفهم بالفرنسية أو العربية أو الإنجليزية' },
      { fr: 'Les 9 effets du menu agissent vraiment maintenant', ar: 'تأثيرات القائمة التسعة تعمل فعلاً الآن' },
    ],
  },
  {
    kicker: { fr: 'C’EST PARTI', ar: 'هيا بنا' },
    titre: { fr: 'À toi de jouer.', ar: 'دورك الآن.' },
    sousTitre: {
      fr: 'Écris, choisis ta voix, génère. Sawtify fait le reste.',
      ar: 'اكتب، اختر صوتك، وولّد. صوتيفي يتولّى الباقي.',
    },
  },
];

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

  const [index, setIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const dernier = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  const suivant = useCallback(() => setIndex((i) => Math.min(i + 1, SLIDES.length - 1)), []);
  const precedent = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  // Échap ferme · flèches naviguent (inversées en arabe).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') (isRTL ? precedent : suivant)();
      else if (e.key === 'ArrowLeft') (isRTL ? suivant : precedent)();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isRTL, suivant, precedent, onClose]);

  // Le fond ne défile pas tant que la pop-up est ouverte.
  useEffect(() => {
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = avant; };
  }, []);

  // Le focus entre dans la carte (accessibilité clavier).
  useEffect(() => { cardRef.current?.focus(); }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={language === 'ar' ? 'ما الجديد في صوتيفي 4.1' : 'Nouveautés de Sawtify 4.1'}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Fond : clic = fermer */}
      <button
        type="button"
        aria-label={language === 'ar' ? 'إغلاق' : 'Fermer'}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        tabIndex={-1}
      />

      <div
        ref={cardRef}
        tabIndex={-1}
        className="relative bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden text-slate-900 max-h-[92vh] flex flex-col outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={language === 'ar' ? 'إغلاق' : 'Fermer'}
          className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer z-10`}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600 text-white shrink-0">
              <Mic2 className="h-3.5 w-3.5" />
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200/60">
              {t(slide.kicker)} · v{WHATS_NEW_VERSION}
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
            {t(slide.titre)}
          </h2>

          {slide.sousTitre && (
            <p className="mt-1.5 text-sm text-slate-500">{t(slide.sousTitre)}</p>
          )}

          {slide.puces && (
            <ul className="mt-4 space-y-2.5">
              {slide.puces.map((p, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                  <span
                    className="min-w-0 text-sm text-slate-700"
                    // Les exemples de balises mélangent arabe et latin : on
                    // laisse le navigateur choisir le sens de chaque segment.
                    dir={/[<>]/.test(t(p)) ? 'auto' : (isRTL ? 'rtl' : 'ltr')}
                  >
                    {t(p)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Le dernier slide porte les deux appels à l'action. */}
          {dernier && (
            <div className="mt-5 grid gap-2.5">
              <button
                type="button"
                onClick={onStart}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition shadow-sm cursor-pointer text-sm"
              >
                <Sparkles className="h-4 w-4" />
                {language === 'ar' ? 'ابدأ الإنشاء الآن' : 'Commencer à créer maintenant'}
              </button>

              <button
                type="button"
                onClick={onSupport}
                className="w-full py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer text-sm"
              >
                <Coins className="h-4 w-4 text-purple-600" />
                {language === 'ar' ? 'أضف نقاطاً' : 'Ajouter des points'}
              </button>
            </div>
          )}
        </div>

        {/* ── PIED : progression + navigation ── */}
        <div className="shrink-0 border-t border-slate-100 px-5 py-3.5 sm:px-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5" role="tablist" aria-label="Étapes">
              {SLIDES.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={t(s.kicker)}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    i === index ? 'w-6 bg-purple-600' : 'w-1.5 bg-slate-200'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {index > 0 && (
                <button
                  type="button"
                  onClick={precedent}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                >
                  {isRTL ? <ArrowRight className="h-3.5 w-3.5" /> : <ArrowLeft className="h-3.5 w-3.5" />}
                  {language === 'ar' ? 'السابق' : 'Retour'}
                </button>
              )}
              {!dernier && (
                <button
                  type="button"
                  onClick={suivant}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition cursor-pointer"
                >
                  {language === 'ar' ? 'التالي' : 'Suivant'}
                  {isRTL ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                </button>
              )}
              {dernier && (
                <span className="text-[11px] font-bold text-emerald-600">
                  {language === 'ar' ? '✓ كل شيء جاهز' : '✓ Tout est prêt'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsNewV41;
