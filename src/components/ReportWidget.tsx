import React, { useState } from 'react';
import { AlertTriangle, MessageCircle, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const WHATSAPP_NUMBER = '213697660969';

const CATEGORIES: Record<'fr' | 'ar', string[]> = {
  fr: ['Paiement / SlickPay', 'Génération vocale', 'Studio vocal', 'Historique', 'Compte / connexion', 'Autre'],
  ar: ['الدفع / SlickPay', 'التوليد الصوتي', 'الاستوديو الصوتي', 'السجل', 'الحساب / تسجيل الدخول', 'أخرى'],
};

const TEXT = {
  fr: {
    openBtn: 'Signaler un problème',
    title: 'Signaler un problème',
    subtitle: 'WhatsApp va s\u2019ouvrir avec un message prérempli.',
    generalLabel: 'Problème général',
    detailLabel: 'Problème précis',
    detailPlaceholder: 'Ex. Erreur lors de la création de la facture',
    descLabel: 'Décris le problème',
    descPlaceholder: 'Que s\u2019est-il passé ?',
    sendBtn: 'Envoyer sur WhatsApp (+213 697 660 969)',
    close: 'Fermer',
    greeting: 'Bonjour Sawtify, je souhaite signaler un problème.',
    generalMsg: 'Problème général',
    detailMsg: 'Problème précis',
    descMsg: 'Description',
    noDesc: 'Aucune description supplémentaire.',
    pageMsg: 'Page',
    detailDefault: 'Erreur lors de la création de la facture',
  },
  ar: {
    openBtn: 'إبلاغ عن مشكلة',
    title: 'إبلاغ عن مشكلة',
    subtitle: 'سيتم فتح واتساب برسالة جاهزة.',
    generalLabel: 'نوع المشكلة',
    detailLabel: 'المشكلة بالتحديد',
    detailPlaceholder: 'مثال: خطأ أثناء إنشاء الفاتورة',
    descLabel: 'صف المشكلة',
    descPlaceholder: 'ماذا حدث بالضبط؟',
    sendBtn: 'إرسال عبر واتساب (213 697 660 969+)',
    close: 'إغلاق',
    greeting: 'مرحباً صوتيفي، أريد الإبلاغ عن مشكلة.',
    generalMsg: 'نوع المشكلة',
    detailMsg: 'المشكلة بالتحديد',
    descMsg: 'الوصف',
    noDesc: 'لا يوجد وصف إضافي.',
    pageMsg: 'الصفحة',
    detailDefault: 'خطأ أثناء إنشاء الفاتورة',
  },
};

export const ReportWidget: React.FC = () => {
  const { language, isRTL } = useLanguage();
  const t = TEXT[language];
  const categories = CATEGORIES[language];
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(categories[0]);
  const [detail, setDetail] = useState(t.detailDefault);
  const [description, setDescription] = useState('');

  // Garde le choix/texte cohérents si l'utilisateur change de langue en cours de route.
  React.useEffect(() => {
    setCategory(categories[0]);
    setDetail(t.detailDefault);
  }, [language]);

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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed bottom-5 ${isRTL ? 'right-5' : 'left-5'} z-40 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-xl hover:bg-purple-700 transition`}
        aria-label={t.openBtn}
      >
        <AlertTriangle className="h-4 w-4" />
        {t.openBtn}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form onSubmit={sendReport} dir={isRTL ? 'rtl' : 'ltr'} className={`w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 ${isRTL ? 'text-right' : 'text-left'}`}>
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <div className="flex items-center gap-2 text-purple-700 text-xs font-bold uppercase tracking-wider">
                  <MessageCircle className="h-4 w-4" /> WhatsApp support
                </div>
                <h2 className="mt-1 text-xl font-extrabold text-slate-900">{t.title}</h2>
                <p className="mt-1 text-xs text-slate-500">{t.subtitle}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100" aria-label={t.close}><X className="h-5 w-5" /></button>
            </div>

            <label className="block text-xs font-bold text-slate-700 mb-1">{t.generalLabel}</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm mb-4 bg-white">
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>

            <label className="block text-xs font-bold text-slate-700 mb-1">{t.detailLabel}</label>
            <input value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={160} required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm mb-4" placeholder={t.detailPlaceholder} />

            <label className="block text-xs font-bold text-slate-700 mb-1">{t.descLabel}</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1200} rows={5} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm resize-none" placeholder={t.descPlaceholder} />

            <button type="submit" className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#1fbd5a] transition">
              <MessageCircle className="h-4 w-4" /> {t.sendBtn}
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default ReportWidget;
