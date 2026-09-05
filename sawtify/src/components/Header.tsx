import React from 'react';
import { Mic, History, Plus, Radio, CreditCard, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface HeaderProps {
  balance: number;
  activeTab: 'studio' | 'history' | 'pricing';
  setActiveTab: (tab: 'studio' | 'history' | 'pricing') => void;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  balance,
  activeTab,
  setActiveTab,
  historyCount,
}) => {
  const { t, language, setLanguage } = useLanguage();
  const isLowBalance = balance < 20;

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-2">
          
          {/* Brand Mark */}
          <div 
            onClick={() => setActiveTab('studio')}
            className="flex items-center gap-3 shrink-0 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs shadow-purple-600/20 group-hover:scale-105 transition-transform overflow-hidden">
              <img src="https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg" alt="Logo Sawtify" className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-slate-900 group-hover:text-purple-700 transition-colors">
                {t.appTitle}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            </div>
          </div>

          {/* Minimal Segmented Navigation: Studio | History | Pricing */}
          <nav className="flex items-center bg-slate-100/90 p-1 rounded-full border border-slate-200/80 text-xs font-medium">
            {/* Studio Tab */}
            <button
              id="nav-tab-studio"
              onClick={() => setActiveTab('studio')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full transition-all duration-150 cursor-pointer ${
                activeTab === 'studio'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mic className="w-3.5 h-3.5 text-purple-600" />
              <span>{t.studioTab}</span>
            </button>

            {/* History Tab */}
            <button
              id="nav-tab-history"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full transition-all duration-150 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5 text-purple-600" />
              <span>{t.historyTab}</span>
              {historyCount > 0 && (
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full font-num font-bold">
                  {historyCount}
                </span>
              )}
            </button>

            {/* Pricing Tab */}
            <button
              id="nav-tab-pricing"
              onClick={() => setActiveTab('pricing')}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full transition-all duration-150 cursor-pointer ${
                activeTab === 'pricing'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-purple-600" />
              <span>{t.pricingTab}</span>
            </button>
          </nav>

          {/* Language Switcher & Persistent Balance / Add Funds */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            
            {/* Language Switcher Segmented Control */}
            <div
              id="language-switcher-segmented"
              className="flex items-center bg-slate-100/90 p-0.5 rounded-full border border-slate-200/80 text-[11px] font-medium"
            >
              <button
                type="button"
                id="btn-lang-fr"
                onClick={() => setLanguage('fr')}
                className={`px-2.5 py-1 rounded-full transition-all duration-200 cursor-pointer flex items-center gap-1 ${
                  language === 'fr'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Passer en Français"
              >
                <span>FR</span>
              </button>
              <button
                type="button"
                id="btn-lang-ar"
                onClick={() => setLanguage('ar')}
                className={`px-2.5 py-1 rounded-full transition-all duration-200 cursor-pointer flex items-center gap-1 ${
                  language === 'ar'
                    ? 'bg-white text-purple-800 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="التحويل للغة العربية"
              >
                <span>عربي</span>
              </button>
            </div>

            {/* Persistent Balance & Add Funds Direct Button (Navigates directly to Pricing tab) */}
            <div 
              className={`flex items-center p-0.5 rounded-full border transition-all duration-150 ${
                isLowBalance 
                  ? 'bg-rose-50/90 border-rose-200/90 text-rose-900' 
                  : 'bg-slate-100/90 border-slate-200/90 text-slate-900'
              }`}
            >
              {/* Persistent Balance Display */}
              <button
                type="button"
                id="user-balance-badge"
                onClick={() => setActiveTab('pricing')}
                title={language === 'ar' ? 'عرض باقات الأسعار وشحن الرصيد' : 'Voir les tarifs et recharger'}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold hover:bg-white/60 transition-colors cursor-pointer"
              >
                <span className={`w-2 h-2 rounded-full ${isLowBalance ? 'bg-rose-500 animate-ping' : 'bg-purple-500'}`} />
                <span>
                  <span className="font-num">{balance}</span> <span className="text-[11px] font-sans font-normal opacity-75">{t.pointsLabel}</span>
                </span>
              </button>

              {/* Add Funds Button */}
              <button
                type="button"
                id="btn-open-reheader"
                onClick={() => setActiveTab('pricing')}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-purple-400 stroke-[2.5]" />
                <span className="hidden sm:inline">{t.rechargeBtn}</span>
              </button>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
