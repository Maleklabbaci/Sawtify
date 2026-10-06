import React, { useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Check, Sparkles, X } from 'lucide-react';

/* ==========================================================================
   ASTUCES « SUPER VOIX »
   --------------------------------------------------------------------------
   Pop-up affichée automatiquement à la PREMIÈRE entrée dans le studio (après
   la pop-up « Nouveautés » si elle s'affiche), puis ré-ouvrable à volonté
   depuis le bouton « i » placé à côté du bouton « + » de l'éditeur.

   ⚠️ STYLE — MÊME GABARIT QUE WhatsNewV41 / les autres modales du studio :
       fixed inset-0 z-[70] … bg-slate-950/60 backdrop-blur-sm
       w-full max-w-sm rounded-3xl border border-purple-200 bg-white p-6 shadow-2xl
       kicker : text-xs font-black uppercase tracking-[.14em] text-purple-600
       titre  : text-base font-extrabold text-slate-900
       texte  : text-xs leading-5 text-slate-500
   Aucun style personnalisé, aucune animation, aucune police importée.

   ⚠️ ÉTAGE — z-[70] : toujours EN DESSOUS des messages importants.

   Règle de rédaction : uniquement ce que l'utilisateur voit et entend.
   Aucun nom de modèle, aucune route d'API.
   ========================================================================== */

/** Change cette valeur pour que la pop-up se remontre à tout le monde. */
export const VOICE_TIPS_VERSION = '1';

/** Clé locale : une pop-up déjà vue ne se remontre pas toute seule. */
export const VOICE_TIPS_STORAGE_KEY = 'sawtify_voice_tips_seen';

type Bilingue = { fr: string; ar: string };

/** Les astuces, une ligne ou deux chacune. Court = lu. */
const ASTUCES: Bilingue[] = [
  {
    fr: 'Écris exactement ce que tu veux entendre. Pas de consignes entre parenthèses comme « (voix triste) » : elles seraient lues à voix haute.',
    ar: 'اكتب بالضبط ما تريد سماعه. لا تضع تعليمات بين قوسين مثل «(بصوت حزين)» لأنها ستُقرأ بصوت عالٍ.',
  },
  {
    fr: 'Ajoute les réactions avec les balises du bouton « + » : <laugh>, <sigh>, <gasp>… Seuls les sons humains sont gérés, pas les bruitages.',
    ar: 'أضف الانفعالات بوسوم الزر «+» مثل <laugh> و <sigh> و <gasp>. الأصوات البشرية فقط مدعومة، وليست المؤثرات الصوتية.',
  },
  {
    fr: 'Place des pauses : <short pause> avant une révélation, <long pause> entre deux idées. C’est le moyen le plus simple d’avoir une voix naturelle.',
    ar: 'ضع وقفات: <short pause> قبل المفاجأة و <long pause> بين فكرتين. هذه أسهل طريقة لصوت طبيعي.',
  },
  {
    fr: 'Ne colle jamais deux balises l’une à côté de l’autre : mets au moins un mot entre les deux.',
    ar: 'لا تضع وسمين متجاورين أبداً: اترك كلمة واحدة على الأقل بينهما.',
  },
  {
    fr: 'Mets l’accent avec les MAJUSCULES et la ponctuation : « C’est la DERNIÈRE chance ! »',
    ar: 'للتأكيد استعمل الحروف الكبيرة وعلامات الترقيم، مثل: «C’est la DERNIÈRE chance !»',
  },
  {
    fr: 'Donne du contexte : un seul mot comme « Allo ? » laisse peu d’indices. Écris « Allo ? Allo ? Vous m’entendez ? » et le ton téléphonique vient tout seul.',
    ar: 'أعطِ سياقاً: كلمة واحدة مثل «Allo ?» لا تكفي. اكتب «Allo ? Allo ? Vous m’entendez ?» فيأتي أسلوب المكالمة تلقائياً.',
  },
  {
    fr: 'Teste d’abord sans balises, puis ajoutes-en une à la fois pour entendre l’effet de chacune.',
    ar: 'جرّب أولاً بدون وسوم، ثم أضف وسماً واحداً في كل مرة لتسمع تأثير كل واحد.',
  },
];

/* -------------------------------------------------------------------------- */

export function shouldShowVoiceTips(): boolean {
  try {
    return localStorage.getItem(VOICE_TIPS_STORAGE_KEY) !== VOICE_TIPS_VERSION;
  } catch {
    // localStorage indisponible (navigation privée) → on ne montre pas la
    // pop-up plutôt que de la remontrer à chaque rendu.
    return false;
  }
}

export function markVoiceTipsSeen(): void {
  try {
    localStorage.setItem(VOICE_TIPS_STORAGE_KEY, VOICE_TIPS_VERSION);
  } catch {
    /* ignoré */
  }
}

/* -------------------------------------------------------------------------- */

interface VoiceTipsModalProps {
  onClose: () => void;
}

export const VoiceTipsModal: React.FC<VoiceTipsModalProps> = ({ onClose }) => {
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
      aria-label={language === 'ar' ? 'نصائح للحصول على صوت رائع' : 'Astuces pour une super voix'}
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
              {language === 'ar' ? 'نصائح' : 'Astuces'}
            </p>
            <h3 className="mt-1 text-base font-extrabold text-slate-900">
              {language === 'ar' ? 'للحصول على صوت رائع' : 'Pour une super voix'}
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
            ? 'صوتيفي ليس محوّل نص إلى كلام تقليدياً: هو يفهم نصّك كاملاً ويستنتج النبرة المناسبة بنفسه. كلما أعطيته سياقاً أوضح، كان الصوت أجمل.'
            : 'Sawtify n’est pas un synthétiseur vocal classique : il comprend ton texte en entier et déduit lui-même le bon ton. Plus ton texte donne de contexte, plus la voix est juste.'}
        </p>

        {/* ── Les astuces ───────────────────────────────────────────────── */}
        <ul className="mt-4 space-y-2">
          {ASTUCES.map((item) => (
            <li
              key={item.fr}
              className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3"
            >
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-purple-600">
                <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.5} />
              </span>
              <span
                className="text-[11px] font-semibold leading-5 text-slate-700"
                style={{ unicodeBidi: 'plaintext' }}
              >
                {t(item)}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-[11px] leading-5 text-slate-500">
          {language === 'ar'
            ? 'ملاحظة: الصوت يُنتَج نظيفاً، دون مؤثرات. أما تأثير «صوت الهاتف» فيُضاف لاحقاً في برنامج المونتاج بتصفية الترددات.'
            : 'À noter : la voix est générée propre, sans effets. L’effet « voix au téléphone » s’ajoute ensuite au montage, avec un filtre de fréquences.'}
        </p>

        {/* ── Action ────────────────────────────────────────────────────── */}
        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-purple-600/25 transition hover:bg-purple-700"
          >
            <Sparkles className="h-4 w-4" />
            {language === 'ar' ? 'فهمت، أبدأ الكتابة' : 'Compris, j’écris mon texte'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceTipsModal;
