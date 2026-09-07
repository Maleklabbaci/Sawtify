import React from 'react';
import { Mic, Clock, CreditCard, LogOut, Globe, Zap, ChevronDown } from 'lucide-react';

interface HeaderProps {
  balance: number;
  activeTab: 'studio' | 'history' | 'pricing';
  setActiveTab: (tab: any) => void;
  historyCount: number;
  language: 'fr' | 'ar';
  setLanguage: (lang: any) => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ balance, activeTab, setActiveTab, historyCount, language, setLanguage, onLogout }) => {
  const tabs = [
    { id: 'studio' as const, label: language === 'ar' ? 'استوديو صوتي' : 'Studio Vocal', icon: Mic },
    { id: 'history' as const, label: language === 'ar' ? 'السجل' : 'Historique', icon: Clock, count: historyCount },
    { id: 'pricing' as const, label: language === 'ar' ? 'الأسعار' : 'Tarifs', icon: CreditCard },
  ];

  return (
    <header className="sticky top-0 z-50 w-full h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
      <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        
        {/* Left: Branding */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">S</div>
          <span className="font-bold text-slate-900 hidden sm:block">Sawtify</span>
          <span className="hidden lg:flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
          </span>
        </div>

        {/* Center: Navigation Pills */}
        <nav className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/60">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === tab.id 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-[10px] px-1 py-0 rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Right: Balance & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Balance */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Zap className="w-3.5 h-3.5 text-purple-600" />
            <span className="text-xs font-bold text-slate-900 font-num">{balance}</span>
            <span className="text-[10px] text-slate-500 hidden sm:inline">{language === 'ar' ? 'نقاط' : 'pts'}</span>
          </div>

          {/* Recharge CTA */}
          <button
            onClick={() => setActiveTab('pricing')}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm hidden sm:flex items-center gap-1"
          >
            <Zap className="w-3 h-3" />
            <span>{language === 'ar' ? 'تعبئة' : 'Recharger'}</span>
          </button>

          {/* Language Toggle */}
          <button 
            onClick={() => setLanguage(language === 'fr' ? 'ar' : 'fr')}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            {language === 'fr' ? 'AR' : 'FR'}
          </button>

          {/* User Menu */}
          <button onClick={onLogout} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition cursor-pointer" title="Déconnexion">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
