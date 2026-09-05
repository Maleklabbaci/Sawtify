import React, { useState, Suspense, lazy } from 'react';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { GenerationRecord, PurchaseRecord, CreditPack } from './types';
import { LanguageProvider, useLanguage } from './context/LanguageContext';

// Chargées à la demande seulement : évite d'embarquer ffmpeg.wasm, Supabase, etc.
// dans le bundle initial affiché avant même la connexion (page trop longue à charger).
const TTSStudio = lazy(() => import('./components/TTSStudio').then(m => ({ default: m.TTSStudio })));
const HistoryList = lazy(() => import('./components/HistoryList').then(m => ({ default: m.HistoryList })));
const PricingPage = lazy(() => import('./components/PricingPage').then(m => ({ default: m.PricingPage })));
const LoginModal = lazy(() => import('./components/LoginModal').then(m => ({ default: m.LoginModal })));
const SigninModal = lazy(() => import('./components/SigninModal').then(m => ({ default: m.SigninModal })));

const ViewFallback = () => (
  <div className="flex items-center justify-center py-24">
    <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

function AppContent() {
  const { t, isRTL, language, setLanguage, isTransitioning } = useLanguage();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'none' | 'login' | 'signin'>('none');
  const [balance, setBalance] = useState<number>(50);
  const [activeTab, setActiveTab] = useState<'studio' | 'history' | 'pricing'>('studio');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [generations, setGenerations] = useState<GenerationRecord[]>([]);

  const [purchases, setPurchases] = useState<PurchaseRecord[]>([
    {
      id: 'pur_free_welcome',
      packId: 'free_tier',
      packName: 'Offre Gratuite (50 Points)',
      pointsCredited: 50,
      amountDZD: 0,
      paymentMethod: 'edahabia',
      transactionId: 'WELCOME_BONUS_50',
      status: 'paid',
      createdAt: new Date().toISOString()
    }
  ]);

  // Check for SlickPay redirect return params
  React.useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment_status') || urlParams.get('status');
      const pointsParam = urlParams.get('points');

      if (paymentStatus === 'success' && pointsParam) {
        const addedPoints = parseInt(pointsParam, 10) || 100;
        setBalance(prev => prev + addedPoints);
        setIsLoggedIn(true);
        showToast(language === 'ar' ? `تم استلام الدفع بنجاح! +${addedPoints} نقطة` : `Paiement validé avec succès ! +${addedPoints} points ajoutés.`);
        
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {}
  }, [language]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDeductPoints = (cost: number, record: GenerationRecord): boolean => {
    if (balance < cost) return false;
    const remaining = balance - cost;
    setBalance(remaining);
    setGenerations((prev) => [record, ...prev]);
    showToast(t.toastDeducted.replace('{balance}', remaining.toString()));
    return true;
  };

  const handleRechargeSuccess = (pack: CreditPack, method: 'edahabia' | 'cib', record: PurchaseRecord) => {
    setBalance((prev) => prev + pack.points);
    setPurchases((prev) => [record, ...prev]);
    const methodLabel = method === 'edahabia' ? (language === 'ar' ? 'البطاقة الذهبية' : 'Edahabia') : 'CIB';
    showToast(t.toastRecharged.replace('{points}', pack.points.toString()).replace('{method}', methodLabel));
  };

  // If not logged in, render either the Landing Page or a full-page Login/Signin screen
  if (!isLoggedIn) {
    if (authModalMode === 'login') {
      return (
        <Suspense fallback={<ViewFallback />}>
          <LoginModal
            onClose={() => setAuthModalMode('none')}
            onLoginSuccess={() => {
              setAuthModalMode('none');
              setIsLoggedIn(true);
              setActiveTab('studio');
              showToast(language === 'ar' ? 'مرحباً بك مجدداً!' : 'Bon retour ! Connexion réussie.');
            }}
            onSwitchToSignin={() => setAuthModalMode('signin')}
            language={language}
          />
        </Suspense>
      );
    }

    if (authModalMode === 'signin') {
      return (
        <Suspense fallback={<ViewFallback />}>
          <SigninModal
            onClose={() => setAuthModalMode('none')}
            onSigninSuccess={() => {
              setAuthModalMode('none');
              setIsLoggedIn(true);
              setActiveTab('studio');
              showToast(language === 'ar' ? 'تم إنشاء الحساب بنجاح! +50 نقطة هدية' : 'Compte créé avec succès ! +50 points offerts.');
            }}
            onSwitchToLogin={() => setAuthModalMode('login')}
            language={language}
          />
        </Suspense>
      );
    }

    return (
      <>
        <LandingPage
          onLoginClick={() => setAuthModalMode('login')}
          onSigninClick={() => setAuthModalMode('signin')}
          language={language}
          setLanguage={setLanguage}
        />

        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-mono px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}
      </>
    );
  }

  return (
    <div className={`min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-purple-500/20 selection:text-purple-900 ${isRTL ? 'text-right' : 'text-left'}`}>
      
      {/* Product Header with 3 tabs: Studio, History, Pricing */}
      <Header
        balance={balance}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        historyCount={generations.length}
      />

      {/* Floating Micro-Toast Notification */}
      {toastMessage && (
        <div 
          id="toast-notification"
          className={`fixed bottom-6 ${isRTL ? 'left-6' : 'right-6'} z-50 bg-slate-900 text-white text-xs font-mono px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5 animate-in slide-in-from-bottom-2`}
        >
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main 
        key={language}
        className={`flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 transition-opacity duration-150 ${
          isTransitioning ? 'opacity-0' : 'opacity-100 lang-fade-enter'
        }`}
      >
        
        <Suspense fallback={<ViewFallback />}>
          {/* View 1: Studio Vocal */}
          {activeTab === 'studio' && (
            <TTSStudio
              balance={balance}
              onDeductPoints={handleDeductPoints}
              onOpenRecharge={() => setActiveTab('pricing')}
            />
          )}

          {/* View 2: Historique */}
          {activeTab === 'history' && (
            <HistoryList
              generations={generations}
              onNavigateToStudio={() => setActiveTab('studio')}
            />
          )}

          {/* View 3: Tarifs & Packs de Prix (Pricing Page) */}
          {activeTab === 'pricing' && (
            <PricingPage
              balance={balance}
              onRechargeSuccess={handleRechargeSuccess}
              purchases={purchases}
              language={language}
            />
          )}
        </Suspense>

      </main>

      {/* Dashboard Footer with explicit Logout */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
            <span className="text-slate-800 font-semibold">{t.appTitle}</span>
            <span>• {t.footerTagline}</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => {
                setIsLoggedIn(false);
                showToast(language === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Déconnexion réussie');
              }}
              id="btn-dashboard-logout"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold transition cursor-pointer font-sans text-xs border border-slate-200 hover:border-rose-200"
            >
              {language === 'ar' ? 'تسجيل الخروج (Déconnexion)' : 'Déconnexion'}
            </button>
            <span>{t.footerSpecs}</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

export function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;
