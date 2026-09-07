import React, { useState, Suspense, lazy } from 'react';
import { Zap } from 'lucide-react';
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
const SetPasswordScreen = lazy(() => import('./components/SetPasswordScreen').then(m => ({ default: m.SetPasswordScreen })));

const ViewFallback = () => (
  <div className="flex items-center justify-center py-24">
    <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

function AppContent() {
  const { t, isRTL, language, setLanguage, isTransitioning } = useLanguage();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'none' | 'login' | 'signin'>('none');
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState<boolean>(false);
  const [pendingUserEmail, setPendingUserEmail] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(true);
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

  // Recharge le solde de points ET l'historique réels depuis Supabase
  const refreshAccountData = React.useCallback(async () => {
    setIsBalanceLoading(true);
    try {
      const { fetchMyBalance, fetchMyGenerations } = await import('./services/supabaseClient');
      const [realBalance, realGenerations] = await Promise.all([
        fetchMyBalance(),
        fetchMyGenerations(),
      ]);
      if (realBalance !== null) setBalance(realBalance);
      setGenerations(realGenerations);
    } catch (e) {
      console.warn('[Sawtify] Impossible de charger le compte depuis Supabase:', e);
    } finally {
      setIsBalanceLoading(false);
    }
  }, []);

  // Détecte la session Supabase réelle
  React.useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    import('./services/supabaseClient').then(({ supabase, consumeSignupIntent }) => {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          setIsLoggedIn(true);
          setActiveTab('studio');
          refreshAccountData();
        } else {
          setIsBalanceLoading(false);
        }
      });

      const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setIsLoggedIn(true);
          setAuthModalMode('none');
          setActiveTab('studio');
          refreshAccountData();

          if (consumeSignupIntent()) {
            setPendingUserEmail(session.user.email ?? null);
            setNeedsPasswordSetup(true);
          } else {
            showToast(language === 'ar' ? 'مرحباً بك في صوتيفي!' : 'Bienvenue sur Sawtify !');
          }
        }
        if (event === 'SIGNED_OUT') {
          setIsLoggedIn(false);
        }
      });

      unsubscribe = () => listener.subscription.unsubscribe();
    });

    return () => unsubscribe?.();
  }, [language, refreshAccountData]);

  // Check for SlickPay redirect return params
  React.useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment_status') || urlParams.get('status');
      const pointsParam = urlParams.get('points');

      if (paymentStatus === 'success' && pointsParam) {
        setIsLoggedIn(true);
        refreshAccountData();
        showToast(language === 'ar' ? 'تم استلام الدفع بنجاح!' : 'Paiement validé avec succès !');

        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {}
  }, [language, refreshAccountData]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDeductPoints = async (cost: number, record: GenerationRecord): Promise<boolean> => {
    try {
      const { deductCreditsRPC } = await import('./services/supabaseClient');
      const result = await deductCreditsRPC({
        amount: cost,
        voiceId: record.voiceId,
        voiceName: record.voiceName,
        prompt: record.text,
        charCount: record.text.length,
        durationSec: record.durationSec,
        latencyMs: record.latencyMs,
      });

      if (!result.success) {
        showToast(
          language === 'ar'
            ? 'رصيد غير كافٍ أو خطأ في الخادم'
            : (result.error === 'Insufficient credits balance'
                ? 'Solde insuffisant côté serveur.'
                : 'Erreur lors de la déduction des points.')
        );
        if (typeof result.balance === 'number') setBalance(result.balance);
        return false;
      }

      const remaining = result.remaining_balance ?? balance - cost;
      setBalance(remaining);
      setGenerations((prev) => [
        { ...record, id: result.generation_id || record.id },
        ...prev,
      ]);
      showToast(t.toastDeducted.replace('{balance}', remaining.toString()));
      return true;
    } catch (e) {
      console.error('[Sawtify] Erreur handleDeductPoints:', e);
      showToast(language === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Erreur de connexion au serveur.');
      return false;
    }
  };

  const handleRechargeSuccess = (pack: CreditPack, method: 'edahabia' | 'cib', record: PurchaseRecord) => {
    refreshAccountData();
    setPurchases((prev) => [record, ...prev]);
    const methodLabel = method === 'edahabia' ? (language === 'ar' ? 'البطاقة الذهبية' : 'Edahabia') : 'CIB';
    showToast(t.toastRecharged.replace('{points}', pack.points.toString()).replace('{method}', methodLabel));
  };

  if (needsPasswordSetup) {
    return (
      <Suspense fallback={<ViewFallback />}>
        <SetPasswordScreen
          userEmail={pendingUserEmail}
          language={language}
          onDone={() => {
            setNeedsPasswordSetup(false);
            showToast(language === 'ar' ? 'تم إنشاء كلمة المرور! مرحباً بك في صوتيفي' : 'Mot de passe créé ! Bienvenue sur Sawtify');
          }}
        />
      </Suspense>
    );
  }

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
    <div className={`${activeTab === 'studio' ? 'h-dvh overflow-hidden' : 'min-h-screen'} bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-purple-500/20 selection:text-purple-900 ${isRTL ? 'text-right' : 'text-left'}`}>
      
      {/* Header */}
      <Header
        balance={balance}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        historyCount={generations.length}
        onLogout={() => {
          import('./services/supabaseClient').then(({ signOutFromSupabase }) => signOutFromSupabase());
          setIsLoggedIn(false);
          showToast(language === 'ar' ? 'تم تسجيل الخروج' : 'Déconnexion réussie');
        }}
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
        className={`flex-1 w-full transition-opacity duration-150 ${
          activeTab === 'studio' 
            ? 'min-h-0 overflow-hidden flex flex-col' 
            : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8'
        } ${
          isTransitioning ? 'opacity-0' : 'opacity-100 lang-fade-enter'
        }`}
      >
        <Suspense fallback={<ViewFallback />}>
          {activeTab === 'studio' && (
            <TTSStudio
              balance={balance}
              onDeductPoints={handleDeductPoints}
              onOpenRecharge={() => setActiveTab('pricing')}
            />
          )}

          {activeTab === 'history' && (
            <HistoryList
              generations={generations}
              onNavigateToStudio={() => setActiveTab('studio')}
            />
          )}

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

      {/* Pro SaaS Footer */}
      <footer id="app-footer" className="bg-slate-900 text-slate-400 pt-12 pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-8 border-b border-slate-800">
            
            {/* Col 1: Brand & Status */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center overflow-hidden">
                  <img 
                    src="https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg" 
                    alt="Logo Sawtify" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <span className="text-white font-bold">Sawtify</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {language === 'ar' ? 'منصة الذكاء الاصطناعي الصوتي بالدارجة الجزائرية.' : 'Plateforme de synthèse vocale IA en Darija Algérienne.'}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-900/30 w-fit px-2 py-1 rounded-full border border-emerald-800/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {language === 'ar' ? 'خوادم الذكاء الاصطناعي : 100% متصل' : 'Serveurs IA : 100% Opérationnels'}
              </div>
            </div>

            {/* Col 2: Product */}
            <div>
              <h4 className="text-xs font-semibold text-slate-200 mb-3">{language === 'ar' ? 'المنتج' : 'Produit'}</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-xs text-slate-400 hover:text-white transition">{language === 'ar' ? 'استوديو صوتي' : 'Studio Vocal'}</a></li>
                <li><a href="#" className="text-xs text-slate-400 hover:text-white transition">{language === 'ar' ? 'الأسعار والتعبئة' : 'Tarifs & Recharge'}</a></li>
                <li><a href="#" className="text-xs text-slate-400 hover:text-white transition">{language === 'ar' ? 'السجل' : 'Historique'}</a></li>
                <li><a href="#" className="text-xs text-slate-400 hover:text-white transition">{language === 'ar' ? 'مفاتيح API' : 'Clés API'}</a></li>
              </ul>
            </div>

            {/* Col 3: Resources */}
            <div>
              <h4 className="text-xs font-semibold text-slate-200 mb-3">{language === 'ar' ? 'الموارد' : 'Ressources'}</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-xs text-slate-400 hover:text-white transition">{language === 'ar' ? 'أدلة الاستخدام' : 'Guides'}</a></li>
                <li><a href="#" className="text-xs text-slate-400 hover:text-white transition">FAQ</a></li>
                <li><a href="#" className="text-xs text-slate-400 hover:text-white transition">{language === 'ar' ? 'دعم واتساب' : 'Support WhatsApp'}</a></li>
                <li><a href="#" className="text-xs text-slate-400 hover:text-white transition">{language === 'ar' ? 'الشروط' : 'CGU / Confidentialité'}</a></li>
              </ul>
            </div>

            {/* Col 4: Payment */}
            <div>
              <h4 className="text-xs font-semibold text-slate-200 mb-3">{language === 'ar' ? 'الدفع الآمن' : 'Paiement'}</h4>
              <div className="flex items-center gap-3 mt-2">
                <div className="bg-white/10 border border-slate-700 rounded-lg px-3 py-2 text-[10px] font-bold text-slate-300 tracking-wider">CIB</div>
                <div className="bg-white/10 border border-slate-700 rounded-lg px-2 py-2 text-[10px] font-bold text-slate-300 tracking-wider">Edahabia</div>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                <Zap className="w-3 h-3" /> SSL/TLS Encrypted
              </p>
            </div>
          </div>

          {/* Sub-footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 text-[10px] text-slate-500">
            <span>© {new Date().getFullYear()} Sawtify. All rights reserved. v1.4.2</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setLanguage('fr')} 
                className={`px-2 py-0.5 rounded transition cursor-pointer ${language === 'fr' ? 'text-white bg-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
              >
                FR
              </button>
              <button 
                onClick={() => setLanguage('ar')} 
                className={`px-2 py-0.5 rounded transition cursor-pointer ${language === 'ar' ? 'text-white bg-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
              >
                AR
              </button>
            </div>
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
