import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const WHATSAPP_NUMBER = '213697660969';
const PHONE_DISPLAY = '+213 697 660 969';

const CATEGORIES: Record<'fr' | 'ar', string[]> = {
  fr: ['Paiement / SlickPay', 'Génération vocale', 'Studio vocal', 'Historique', 'Compte / connexion', 'Autre'],
  ar: ['الدفع / SlickPay', 'التوليد الصوتي', 'الاستوديو الصوتي', 'السجل', 'الحساب / تسجيل الدخول', 'أخرى'],
};

const TEXT = {
  fr: {
    openBtn: 'Signaler un problème',
    title: 'Signaler un problème',
    generalLabel: 'Type de problème',
    detailLabel: 'Problème précis',
    detailPlaceholder: 'Ex. Erreur lors de la génération',
    descLabel: 'Description (optionnel)',
    descPlaceholder: 'Que s\u2019est-il passé ?',
    sendBtn: 'Envoyer sur WhatsApp',
    close: 'Fermer',
    greeting: 'Bonjour Sawtify, je souhaite signaler un problème.',
    generalMsg: 'Problème',
    detailMsg: 'Détail',
    descMsg: 'Description',
    noDesc: 'Aucune description supplémentaire.',
    pageMsg: 'Page',
    detailDefault: 'Erreur lors de la génération',
  },
  ar: {
    openBtn: 'إبلاغ عن مشكلة',
    title: 'إبلاغ عن مشكلة',
    generalLabel: 'نوع المشكلة',
    detailLabel: 'المشكلة بالتحديد',
    detailPlaceholder: 'مثال: خطأ أثناء التوليد',
    descLabel: 'الوصف (اختياري)',
    descPlaceholder: 'ماذا حدث بالضبط؟',
    sendBtn: 'إرسال عبر واتساب',
    close: 'إغلاق',
    greeting: 'مرحباً صوتيفي، أريد الإبلاغ عن مشكلة.',
    generalMsg: 'نوع المشكلة',
    detailMsg: 'المشكلة بالتحديد',
    descMsg: 'الوصف',
    noDesc: 'لا يوجد وصف إضافي.',
    pageMsg: 'الصفحة',
    detailDefault: 'خطأ أثناء التوليد',
  },
};

export const ReportWidget: React.FC = () => {
  const { language, isRTL } = useLanguage();
  const t = TEXT[language];
  const categories = CATEGORIES[language];
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [category, setCategory] = useState(categories[0]);
  const [detail, setDetail] = useState(t.detailDefault);
  const [description, setDescription] = useState('');

  // Garde le choix/texte cohérents si l'utilisateur change de langue en cours de route.
  useEffect(() => {
    setCategory(categories[0]);
    setDetail(t.detailDefault);
  }, [language]);

  // Escape pour fermer
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // La bulle reste visible au début puis se replie en petit onglet discret.
  // Elle redevient immédiatement visible au survol ou au clic.
  useEffect(() => {
    if (open) return;
    if (collapsed) return;
    const timer = window.setTimeout(() => setCollapsed(true), 7000);
    return () => window.clearTimeout(timer);
  }, [open, collapsed]);

  const sendReport = (event: React.FormEvent) => {
    event.preventDefault();
    const message = [
      t.greeting,
      `${t.generalMsg} : ${category}`,
      `${t.detailMsg} : ${detail}`,
      `${t.descMsg} : ${description.trim() || t.noDesc}`,
      `${t.pageMsg} : ${window.location.pathname}`,
    ].join('\n');
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    setOpen(false);
    setDescription('');
  };

  const inputCls = "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 bg-white placeholder:text-slate-400 focus:outline-none focus:border-[#25D366]/60 focus:ring-2 focus:ring-[#25D366]/10 transition";

  return (
    <>
      {/* =====================================================================
         FAB — cercle vert WhatsApp, 48px, minimal et reconnu au premier regard.
         Coin "end" + aligné avec la barre d'actions du studio (espace pe-16).
         ===================================================================== */}
      <button
        type="button"
        onClick={() => { setCollapsed(false); setOpen(true); }}
        onMouseEnter={() => setCollapsed(false)}
        className={`fixed z-40 bottom-[calc(1rem_+_env(safe-area-inset-bottom))] flex items-center justify-center bg-[#25D366] text-white shadow-lg shadow-[#25D366]/40 transition-all duration-300 cursor-pointer ${
          collapsed
            ? 'end-0 h-11 w-3 rounded-s-xl shadow-md hover:w-10'
            : 'end-4 h-11 w-11 rounded-full hover:bg-[#22c15e] hover:scale-105 active:scale-95'
        }`}
        title={t.openBtn}
        aria-label={t.openBtn}
      >
        <MessageCircle className={`${collapsed ? 'h-3.5 w-3.5 opacity-80' : 'h-5 w-5'}`} />
        {collapsed && <span className="sr-only">{t.openBtn}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center bg-slate-950/50 backdrop-blur-sm">
          {/* Clic à l'extérieur pour fermer */}
          <div className="absolute inset-0" onClick={() => setOpen(false)} />

          {/* Bottom-sheet mobile / carte centrée desktop — rien ne déborde :
              largeur contrôlée, hauteur max 88dvh, seul le corps scrolle */}
          <form
            onSubmit={sendReport}
            dir={isRTL ? 'rtl' : 'ltr'}
            className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 max-h-[88dvh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-2 duration-200"
          >
            {/* Poignée (mobile) */}
            <div className="sm:hidden pt-2.5 flex justify-center shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>

            {/* Header compact */}
            <div className="px-5 pt-3 pb-3.5 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <h2 className="text-base font-extrabold text-slate-900 truncate">{t.title}</h2>
                <p className="mt-0.5 text-[11px] text-slate-400 flex items-center gap-1.5">
                  <MessageCircle className="w-3 h-3 text-[#25D366] shrink-0" />
                  <span dir="ltr" className="font-num">{PHONE_DISPLAY}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-xl p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                aria-label={t.close}
              >
                <X className="h-4.5 w-4.5 h-[18px] w-[18px]" />
              </button>
            </div>

            {/* Corps scrollable */}
            <div className="px-5 py-4 space-y-3.5 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">{t.generalLabel}</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputCls} cursor-pointer`}>
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">{t.detailLabel}</label>
                <input
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  maxLength={160}
                  required
                  className={inputCls}
                  placeholder={t.detailPlaceholder}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">{t.descLabel}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={1200}
                  rows={4}
                  className={`${inputCls} resize-none`}
                  placeholder={t.descPlaceholder}
                />
              </div>
            </div>

            {/* Footer avec bouton toujours visible (même clavier ouvert) */}
            <div className="px-5 pt-3 pb-[calc(1.25rem_+_env(safe-area-inset-bottom))] sm:pb-5 border-t border-slate-100 bg-white shrink-0">
              <button
                type="submit"
                className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#22c15e] text-sm font-bold text-white transition cursor-pointer active:scale-[0.98]"
              >
                <Send className="h-4 w-4" />
                {t.sendBtn}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default ReportWidget;
