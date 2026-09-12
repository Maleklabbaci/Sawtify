import React, { useState } from 'react';
import { AlertTriangle, MessageCircle, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const WHATSAPP_NUMBER = '213697660969';

export const ReportWidget: React.FC = () => {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('Paiement / SlickPay');
  const [detail, setDetail] = useState('Erreur lors de la création de la facture');
  const [description, setDescription] = useState('');

  const sendReport = (event: React.FormEvent) => {
    event.preventDefault();
    const message = [
      'Bonjour Sawtify, je souhaite signaler un problème.',
      `Problème général : ${category}`,
      `Problème précis : ${detail}`,
      `Description : ${description.trim() || 'Aucune description supplémentaire.'}`,
      `Page : ${window.location.pathname}`,
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
        className="fixed bottom-5 left-5 z-40 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-xl hover:bg-purple-700 transition"
        aria-label="Signaler un problème"
      >
        <AlertTriangle className="h-4 w-4" />
        {language === 'ar' ? 'إبلاغ عن مشكلة' : 'Signaler un problème'}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form onSubmit={sendReport} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <div className="flex items-center gap-2 text-purple-700 text-xs font-bold uppercase tracking-wider">
                  <MessageCircle className="h-4 w-4" /> WhatsApp support
                </div>
                <h2 className="mt-1 text-xl font-extrabold text-slate-900">{language === 'ar' ? 'إبلاغ عن مشكلة' : 'Signaler un problème'}</h2>
                <p className="mt-1 text-xs text-slate-500">{language === 'ar' ? 'سيتم فتح واتساب برسالة جاهزة.' : 'WhatsApp va s’ouvrir avec un message prérempli.'}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100" aria-label="Fermer"><X className="h-5 w-5" /></button>
            </div>

            <label className="block text-xs font-bold text-slate-700 mb-1">Problème général</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm mb-4 bg-white">
              <option>Paiement / SlickPay</option>
              <option>Génération vocale</option>
              <option>Studio vocal</option>
              <option>Historique</option>
              <option>Compte / connexion</option>
              <option>Autre</option>
            </select>

            <label className="block text-xs font-bold text-slate-700 mb-1">Problème précis</label>
            <input value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={160} required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm mb-4" placeholder="Ex. Erreur lors de la création de la facture" />

            <label className="block text-xs font-bold text-slate-700 mb-1">Décris le problème</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1200} rows={5} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm resize-none" placeholder="Que s’est-il passé ?" />

            <button type="submit" className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#1fbd5a] transition">
              <MessageCircle className="h-4 w-4" /> Envoyer sur WhatsApp (+213 697 660 969)
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default ReportWidget;
