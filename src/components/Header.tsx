import React from 'react';
import { Mic, History, Plus, CreditCard, LogOut, Zap } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface HeaderProps {
  balance: number;
  activeTab: 'studio' | 'history' | 'pricing';
  setActiveTab: (tab: 'studio' | 'history' | 'pricing') => void;
  historyCount: number;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  balance,
  activeTab,
  setActiveTab,
  historyCount,
  onLogout,
}) => {
  const { t, language, setLanguage } = useLanguage();
  const isLowBalance = balance < 20;

  return (
    <header className="sticky top-0 z-50 w-full h-16 bg-white/85 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="h-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-full gap-4">
          
          {/* Left: Branding */}
          <div 
            onClick={() => setActiveTab('studio')}
            className="flex items-center gap-2.5 shrink-0 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
              <img src="https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-sm tracking-tight text-slate-900 group-hover:text-purple-700 transition-colors hidden sm:block">
              {t.appTitle}
            </span>
            {/* Online Badge */}
            <span className="hidden lg:flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> 
              {language === 'ar' ? 'متصل' : 'Online'}
            </span>
          </div>

          {/* Center: Navigation Pills */}
          <nav className="flex items-center bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/60 text-xs font-medium">
            {/* Studio Tab */}
            <button
              onClick={() => setActiveTab('studio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'studio' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t.studioTab}</span>
            </button>

            {/* History Tab */}
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'history' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t.historyTab}</span>
              {historyCount > 0 && (
                <span className={`text-[10px] px-1 py-0 rounded-full ${activeTab === 'history' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {historyCount}
                </span>
              )}
            </button>

            {/* Pricing Tab */}
            <button
              onClick={() => setActiveTab('pricing')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'pricing' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t.pricingTab}</span>
            </button>
          </nav>

          {/* Right: Balance & Actions */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Balance Badge */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition ${
              isLowBalance ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'
            }`}>
              <Zap className={`w-3.5 h-3.5 ${isLowBalance ? 'text-rose-600' : 'text-purple-600'}`} />
              <span className="text-xs font-bold text-slate-900 font-num">{balance}</span>
              <span className="text-[10px] text-slate-500 hidden sm:inline">{language === 'ar' ? 'نقاط' : 'pts'}</span>
            </div>

            {/* Recharge CTA */}
            <button
              onClick={() => setActiveTab('pricing')}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm hidden sm:flex items-center gap-1"
            >
              <Plus className="w-3 h-3 stroke-[2.5]" />
              <span>{language === 'ar' ? 'تعبئة' : 'Recharger'}</span>
            </button>

            {/* Language Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 text-[10px] font-medium">
              <button
                onClick={() => setLanguage('fr')}
                className={`px-2 py-1 rounded-md transition cursor-pointer ${language === 'fr' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                FR
              </button>
              <button
                onClick={() => setLanguage('ar')}
                className={`px-2 py-1 rounded-md transition cursor-pointer ${language === 'ar' ? 'bg-white text-purple-800 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                عربي
              </button>
            </div>

            {/* User Menu (Logout) */}
            <button 
              onClick={onLogout} 
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition cursor-pointer" 
              title={language === 'ar' ? 'تسجيل الخروج' : 'Déconnexion'}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
