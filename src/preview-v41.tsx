/* ==========================================================================
   PAGE D'APERÇU — « Quoi de neuf en Sawtify 4.1 »
   --------------------------------------------------------------------------
   Sert uniquement à REGARDER la pop-up sans avoir à se connecter au studio.
   N'est pas incluse dans le build de production (Vite ne compile que
   index.html) : elle n'existe que sur le serveur de développement.

       npm run dev      →      http://localhost:3000/v41.html
   ========================================================================== */

import React, { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { WhatsNewV41, resetWhatsNew } from './components/WhatsNewV41';
import './index.css';

const Apercu: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const [ouvert, setOuvert] = useState(true);
  const [dernierBouton, setDernierBouton] = useState<string>('—');

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="font-outfit text-xl font-black text-slate-900">
          Aperçu — Nouveautés Sawtify 4.1
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Cette page ne sert qu'à regarder la pop-up. Elle n'existe pas en production.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOuvert(true)}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-500"
          >
            Ouvrir la pop-up
          </button>
          <button
            type="button"
            onClick={() => setLanguage(language === 'fr' ? 'ar' : 'fr')}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            {language === 'fr' ? 'Passer en arabe' : 'Basculer en français'}
          </button>
          <button
            type="button"
            onClick={() => { resetWhatsNew(); setDernierBouton('mémoire remise à zéro'); }}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Remettre la mémoire à zéro
          </button>
        </div>

        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
          Dernier bouton cliqué : <b className="text-slate-800">{dernierBouton}</b>
        </p>
      </div>

      {ouvert && (
        <WhatsNewV41
          onClose={() => { setDernierBouton('Fermer (croix, fond, Échap ou « Plus tard »)'); setOuvert(false); }}
          onStart={() => { setDernierBouton('Commencer à créer'); setOuvert(false); }}
          onSupport={() => { setDernierBouton('Ajouter des points'); setOuvert(false); }}
        />
      )}
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <Apercu />
    </LanguageProvider>
  </StrictMode>,
);
