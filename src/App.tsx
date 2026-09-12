import React, { useState, Suspense, lazy } from 'react';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { GenerationRecord, PurchaseRecord, CreditPack } from './types';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ReportWidget } from './components/ReportWidget';
import { WelcomeOnboarding } from './components/WelcomeOnboarding';

// Chargées à la demande seulement : évite d'embarquer ffmpeg.wasm, Supabase, etc.
// dans le bundle initial affiché avant même la connexion (page trop longue à charger).
const TTSStudio = lazy(() => import('./components/TTSStudio').then(m => ({ default: m.TTSStudio })));
const HistoryList = lazy(() => import('./components/HistoryList').then(m => ({ default: m.HistoryList })));
const PricingPage = lazy(() => import('./components/PricingPage').then(m => ({ default: m.PricingPage })));
const LoginModal = lazy(() => import('./components/LoginModal').then(m => ({ default: m.LoginModal })));
const SigninModal = lazy(() => import('./components/SigninModal').then(m => ({ default: m.SigninModal })));
const SetPasswordScreen = lazy(() => import('./components/SetPasswordScreen').then(m => ({ default: m.SetPasswordScreen })));

const ViewFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#f8f7ff] px-6">
    <div className="w-full max-w-sm rounded-3xl border border-purple-100 bg-white p-8 text-center shadow-xl shadow-purple-900/10">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-lg shadow-purple-600/25">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      </div>
      <h2 className="mt-5 text-lg font-extrabold text-slate-900">Sawtify prépare ton espace</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">Session sécurisée, solde, historique et bonus de bienvenue en cours de synchronisation…</p>
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-purple-100"><div className="h-full w-1/2 animate-pulse rounded-full bg-purple-600" /></div>
    </div>
  </div>
);

function AppContent() {
  const { t, isRTL, language, setLanguage, isTransitioning } = useLanguage();
  const routeToTab = React.useCallback((path: string): 'studio' | 'history' | 'pricing' => {
    if (path === '/historique' || path === '/history') return 'history';
    if (path === '/pricing' || path === '/recharge') return 'pricing';
    return 'studio';
  }, []);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'none' | 'login' | 'signin'>('none');
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState<boolean>(false);
  const [pendingUserEmail, setPendingUserEmail] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'studio' | 'history' | 'pricing'>(() => routeToTab(window.location.pathname));
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [welcomeUser, setWelcomeUser] = useState<{ name: string; email: string } | null>(null);
  const welcomeBonusPromiseRef = React.useRef<Promise<boolean> | null>(null);

  const [generations, setGenerations] = useState<GenerationRecord[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);

  const navigateTo = React.useCallback((tab: 'studio' | 'history' | 'pricing', replace = false) => {
    const path = tab === 'history' ? '/historique' : tab === 'pricing' ? '/pricing' : '/studio';
    if (window.location.pathname !== path) window.history[replace ? 'replaceState' : 'pushState']({}, '', path);
    setActiveTab(tab);
  }, []);

  React.useEffect(() => {
    const onPopState = () => setActiveTab(routeToTab(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [routeToTab]);

  // Recharge le solde, l'historique ET les achats réels depuis Supabase
  // (avant : "purchases" démarrait avec un faux achat mocké "pur_free_welcome"
  // qui n'existait pas forcément en base, désynchronisé de la réalité).
  const refreshAccountData = React.useCallback(async () => {
    setIsBalanceLoading(true);
    try {
      const { fetchMyBalance, fetchMyGenerations, fetchMyPurchases } = await import('./services/supabaseClient');
      const [realBalance, realGenerations, realPurchases] = await Promise.all([
        fetchMyBalance(),
        fetchMyGenerations(),
        fetchMyPurchases(),
      ]);
      if (realBalance !== null) setBalance(realBalance);
      setGenerations(realGenerations);
      setPurchases(realPurchases);
    } catch (e) {
      console.warn('[Sawtify] Impossible de charger le compte depuis Supabase:', e);
    } finally {
      setIsBalanceLoading(false);
    }
  }, []);

  const finishWelcome = React.useCallback(async () => {
    setWelcomeUser(null);
    setIsBootstrapping(true);
    if (welcomeBonusPromiseRef.current) await welcomeBonusPromiseRef.current;
    await refreshAccountData();
    setIsBootstrapping(false);
    navigateTo('studio', true);
  }, [refreshAccountData, navigateTo]);

  // Détecte la session Supabase réelle
  React.useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    import('./services/supabaseClient').then(({ supabase, consumeSignupIntent }) => {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          setIsLoggedIn(true);
          navigateTo(routeToTab(window.location.pathname), true);
          setIsBootstrapping(true);
          refreshAccountData().finally(() => setIsBootstrapping(false));
        } else {
          setIsBalanceLoading(false);
        }
      });

      const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setIsLoggedIn(true);
          setAuthModalMode('none');
          navigateTo('studio');

          // FIX: le bonus de bienvenue (et donc le check anti-abus par IP) ne
          // doit PAS dépendre d'un flag posé côté navigateur uniquement quand
          // un bouton "Créer un compte" précis est cliqué — Google OAuth ne
          // fait aucune vraie différence entre connexion et inscription, donc
          // ce flag peut rester absent même pour un compte tout juste créé
          // (le check IP était alors silencieusement sauté). On se base à la
          // place sur l'horodatage réel fourni par Supabase : ce compte a-t-il
          // été créé il y a moins de 2 minutes ? Fiable quel que soit le
          // bouton cliqué ou la méthode d'inscription.
          const createdAtMs = session.user.created_at ? new Date(session.user.created_at).getTime() : 0;
          const isBrandNewAccount = createdAtMs > 0 && (Date.now() - createdAtMs) < 2 * 60 * 1000;
          const wantsPasswordSetup = consumeSignupIntent();

          if (isBrandNewAccount) {
            const metadata = session.user.user_metadata || {};
            setWelcomeUser({
              name: metadata.full_name || metadata.name || session.user.email?.split('@')[0] || 'Utilisateur Sawtify',
              email: session.user.email || '',
            });
            setIsBootstrapping(false);
          } else {
            setIsBootstrapping(true);
            refreshAccountData().finally(() => setIsBootstrapping(false));
          }

          if (wantsPasswordSetup) {
            setPendingUserEmail(session.user.email ?? null);
            setNeedsPasswordSetup(true);
          }

          if (isBrandNewAccount) {
            welcomeBonusPromiseRef.current = import('./services/supabaseClient').then(({ claimWelcomeBonus }) => claimWelcomeBonus());
            welcomeBonusPromiseRef.current.then((result) => {
              if (result === 'denied') showToast(language === 'ar' ? '⚠️ لديك حساب بالفعل بهذا عنوان IP. لم يتم منح نقاط الترحيب.' : "⚠️ Tu as déjà un compte avec cette IP. Aucun point de bienvenue offert cette fois-ci.");
              if (result === 'error') showToast(language === 'ar' ? '⚠️ تعذر التحقق من نقاط الترحيب، أعد المحاولة لاحقاً.' : "⚠️ Impossible de vérifier ton bonus pour le moment, réessaie plus tard.");
            });
            if (!wantsPasswordSetup) {
              showToast(language === 'ar' ? 'مرحباً بك في صوتيفي!' : 'Bienvenue sur Sawtify !');
            }
          }
        }
        if (event === 'SIGNED_OUT') {
          setIsLoggedIn(false);
        }
        // Lien "mot de passe oublié" cliqué dans l'e-mail reçu : Supabase ouvre
        // une session temporaire avec cet évènement -> on réutilise l'écran de
        // définition de mot de passe existant pour laisser l'utilisateur en
        // choisir un nouveau.
        if (event === 'PASSWORD_RECOVERY' && session) {
          setPendingUserEmail(session.user.email ?? null);
          setNeedsPasswordSetup(true);
        }
      });

      unsubscribe = () => listener.subscription.unsubscribe();
    });

    return () => unsubscribe?.();
  }, [language, refreshAccountData, navigateTo, routeToTab]);

  // Check for SlickPay redirect return params
  React.useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment_status') || urlParams.get('status');
      const pointsParam = urlParams.get('points');

      if (paymentStatus === 'success' && pointsParam) {
        setIsLoggedIn(true);
        navigateTo('pricing', true);
        refreshAccountData();
        showToast(language === 'ar' ? 'تم استلام الدفع بنجاح!' : 'Paiement validé avec succès !');

        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {}
  }, [language, refreshAccountData, navigateTo]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDeductPoints = async (cost: number, record: GenerationRecord, storagePath?: string | null, remainingBalance?: number | null): Promise<boolean> => {
    try {
      // Le débit est maintenant fait côté serveur lors de la génération TTS.
      // Cette fonction met à jour le chemin de stockage et l'état local.
      if (storagePath) {
        const { updateGenerationStoragePath } = await import('./services/supabaseClient');
        await updateGenerationStoragePath(record.id, storagePath);
      }

      const remaining = typeof remainingBalance === 'number' ? remainingBalance : balance - cost;
      setBalance(remaining);
      setGenerations((prev) => [
        record,
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

  if (welcomeUser) {
    return <WelcomeOnboarding name={welcomeUser.name} email={welcomeUser.email} language={language} onComplete={finishWelcome} />;
  }

  if (isBootstrapping) {
    return <ViewFallback />;
  }

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
              navigateTo('studio');
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
              navigateTo('studio');
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
      
      {/* Header (64px) */}
      <Header
        balance={balance}
        activeTab={activeTab}
        setActiveTab={navigateTo}
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

      {/* Main Container : Prend tout l'espace restant de l'écran (100vh - 64px de Header) */}
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
              onOpenRecharge={() => navigateTo('pricing')}
              recentGenerations={generations}
            />
          )}

          {activeTab === 'history' && (
            <HistoryList
              generations={generations}
              onNavigateToStudio={() => navigateTo('studio')}
            />
          )}

          {activeTab === 'pricing' && (
            <PricingPage
              balance={balance}
              onRechargeSuccess={handleRechargeSuccess}
              purchases={purchases}
              language={language}
              onNavigateToStudio={() => navigateTo('studio')}
            />
          )}
        </Suspense>
      </main>
      <ReportWidget />

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
