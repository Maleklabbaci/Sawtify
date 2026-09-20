import React, { useState, Suspense, lazy } from 'react';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { GenerationRecord, PurchaseRecord, CreditPack } from './types';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ReportWidget } from './components/ReportWidget';
import { WelcomeOnboarding } from './components/WelcomeOnboarding';
import { trackMarketingEvent } from './services/marketingTracking';
import { Mic, History, CreditCard, Code2, Lock } from 'lucide-react';

// Lazy seulement pour les pages secondaires (pas le Studio qui est la page principale)
// Le Studio est importé directement en bas pour éviter un Suspense bloquant.
const HistoryList = lazy(() => import('./components/HistoryList').then(m => ({ default: m.HistoryList })));
const EditVideoPage = lazy(() => import('./components/EditVideoPage').then(m => ({ default: m.EditVideoPage })));
const PricingPage = lazy(() => import('./components/PricingPage').then(m => ({ default: m.PricingPage })));
const DeveloperPage = lazy(() => import('./components/DeveloperPage').then(m => ({ default: m.DeveloperPage })));
const AdminPage = lazy(() => import('./components/AdminPage').then(m => ({ default: m.AdminPage })));
const LoginModal = lazy(() => import('./components/LoginModal').then(m => ({ default: m.LoginModal })));
const SigninModal = lazy(() => import('./components/SigninModal').then(m => ({ default: m.SigninModal })));
const SetPasswordScreen = lazy(() => import('./components/SetPasswordScreen').then(m => ({ default: m.SetPasswordScreen })));

// Import direct de TTSStudio (pas de lazy) pour éviter le Suspense bloquant au démarrage
// Si le fichier est trop lourd, le code splitting peut être fait plus tard avec un ErrorBoundary
import { TTSStudio } from './components/TTSStudio';

/**
 * Loader minimal : ne bloque pas l'interface, juste un indicateur subtil.
 * Avant c'était un écran plein qui empêchait tout accès.
 */
const MinimalLoader = () => (
  <div className="fixed top-16 right-4 z-[100] bg-white/90 backdrop-blur-sm border border-slate-200 
                  rounded-xl px-4 py-2 shadow-lg flex items-center gap-2 animate-in fade-in duration-300">
    <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
    <span className="text-xs font-medium text-slate-600">Chargement...</span>
  </div>
);

/**
 * Ancien ViewFallback conservé uniquement pour les vrais cas d'erreur critique 
 * (mais avec timeout forcé)
 */
const ViewFallback = () => {
  const [showRealLoader, setShowRealLoader] = React.useState(false);
  
  React.useEffect(() => {
    // On attend max 3 secondes avant de vraiment afficher le gros loader
    // Si c'est plus rapide que 3s, on montre rien (l'utilisateur ne voit pas de flash)
    const timer = setTimeout(() => setShowRealLoader(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!showRealLoader) return <MinimalLoader />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f7ff] px-6 gap-5">
      <div className="sawtify-fallback-loader-wrapper">
        <div className="sawtify-fallback-loader" />
        {'Sawtify'.split('').map((char, i) => (
          <span key={i} className="sawtify-fallback-loader-letter">{char}</span>
        ))}
      </div>
      <div className="text-center">
        <h2 className="text-lg font-extrabold text-slate-900">Sawtify prépare ton espace</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">Chargement un peu long... vérifie ta connexion</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 transition"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
};

function AppContent() {
  const { t, isRTL, language, setLanguage, isTransitioning } = useLanguage();
  const routeToTab = React.useCallback((path: string): 'studio' | 'history' | 'edit-video' | 'pricing' | 'developer' | 'admin' => {
    if (path === '/historique' || path === '/history') return 'history';
    if (path === '/edit-video') return 'studio';
    if (path === '/pricing' || path === '/recharge') return 'pricing';
    if (path === '/developer') return 'developer';
    if (path === '/admin') return 'admin';
    return 'studio';
  }, []);
  
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'none' | 'login' | 'signin'>('none');
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState<boolean>(false);
  const [pendingUserEmail, setPendingUserEmail] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'studio' | 'history' | 'edit-video' | 'pricing' | 'developer' | 'admin'>(() => routeToTab(window.location.pathname));
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showInstagramNudge, setShowInstagramNudge] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  
  // KEY FIX : Timeout de sécurité pour ne jamais rester bloqué sur "checking session"
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [sessionCheckTimeout, setSessionCheckTimeout] = React.useState(false);
  
  const [welcomeUser, setWelcomeUser] = useState<{ name: string; email: string } | null>(null);
  const welcomeBonusPromiseRef = React.useRef<Promise<boolean> | null>(null);
  const bootstrappedUserIdRef = React.useRef<string | null>(null);

  // Force la fin du checking après 5 secondes max (évite l'écran blanc infini)
  React.useEffect(() => {
    if (!isCheckingSession) return;
    const timer = setTimeout(() => {
      console.warn('[App] Session check timeout - forcing display');
      setIsCheckingSession(false);
      setSessionCheckTimeout(true); // Pour savoir qu'on a forcé
    }, 5000); // 5 secondes max
    return () => clearTimeout(timer);
  }, [isCheckingSession]);

  React.useEffect(() => {
    if (!isLoggedIn) return;
    let alreadyShown = false;
    try { alreadyShown = Number(sessionStorage.getItem('sawtify_instagram_nudge_at') || 0) > Date.now() - 24 * 60 * 60 * 1000; } catch {}
    if (alreadyShown) return;
    const timer = window.setTimeout(() => {
      setShowInstagramNudge(true);
      try { sessionStorage.setItem('sawtify_instagram_nudge_at', String(Date.now())); } catch {}
    }, 18000);
    return () => window.clearTimeout(timer);
  }, [isLoggedIn]);

  const [generations, setGenerations] = useState<GenerationRecord[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);

  const navigateTo = React.useCallback((tab: 'studio' | 'history' | 'edit-video' | 'pricing' | 'developer' | 'admin', replace = false) => {
    if (tab === 'edit-video') { setToastMessage('Le montage vidéo est fermé pour le moment — Prochainement.'); return; }
    const path = tab === 'history' ? '/historique' : tab === 'pricing' ? '/pricing' : tab === 'developer' ? '/developer' : tab === 'admin' ? '/admin' : '/studio';
    if (window.location.pathname !== path) window.history[replace ? 'replaceState' : 'pushState']({}, '', path);
    setActiveTab(tab);
  }, []);

  React.useEffect(() => {
    const onPopState = () => {
      if (needsPasswordSetup || welcomeUser) {
        window.history.replaceState({}, '', isLoggedIn ? '/studio' : '/');
        setActiveTab('studio');
        return;
      }
      setActiveTab(routeToTab(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [routeToTab, needsPasswordSetup, welcomeUser, isLoggedIn]);

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

  React.useEffect(() => {
    if (!isLoggedIn && !authModalMode) trackMarketingEvent('landing_view');
  }, [isLoggedIn, authModalMode]);

  // Détecte la session Supabase avec timeout intégré
  React.useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let mounted = true; // Pour éviter les setState si démonté

    import('./services/supabaseClient').then(({ supabase, consumeSignupIntent }) => {
      
      // Promise.race avec timeout pour ne jamais rester bloqué
      const sessionCheck = supabase.auth.getUser().then(({ data, error }) => {
        if (!mounted) return;
        
        if (data.user && !error) {
          trackMarketingEvent('oauth_return');
          setIsLoggedIn(true);
          bootstrappedUserIdRef.current = data.user.id;
          setIsCheckingSession(false);

          const metadata = data.user.user_metadata || {};
          if (!metadata.password_set_at) {
            setPendingUserEmail(data.user.email ?? null);
            setNeedsPasswordSetup(true);
          }
          if (!metadata.onboarding_completed_at) {
            setWelcomeUser({
              name: metadata.full_name || metadata.name || data.user.email?.split('@')[0] || 'Utilisateur Sawtify',
              email: data.user.email || '',
            });
            setIsBootstrapping(false);
            return;
          }

          navigateTo(routeToTab(window.location.pathname), true);
          setIsBootstrapping(true);
          refreshAccountData().finally(() => { if (mounted) setIsBootstrapping(false); });
        } else {
          if (error) {
            supabase.auth.signOut().catch(() => {});
          }
          setIsLoggedIn(false);
          setIsBalanceLoading(false);
          setIsCheckingSession(false);
        }
      }).catch((err) => {
        console.error('[App] Session check error:', err);
        if (mounted) {
          setIsLoggedIn(false);
          setIsCheckingSession(false);
        }
      });

      const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted) return;
        
        if (event === 'SIGNED_IN' && session) {
          if (bootstrappedUserIdRef.current === session.user.id) {
            setIsLoggedIn(true);
            return;
          }
          bootstrappedUserIdRef.current = session.user.id;
          trackMarketingEvent('account_created');
          setIsLoggedIn(true);
          setAuthModalMode('none');
          navigateTo('studio');

          const createdAtMs = session.user.created_at ? new Date(session.user.created_at).getTime() : 0;
          const isBrandNewAccount = createdAtMs > 0 && (Date.now() - createdAtMs) < 2 * 60 * 1000;
          const metadata = session.user.user_metadata || {};
          const needsOnboarding = !metadata.onboarding_completed_at;
          const needsPassword = !metadata.password_set_at;
          const wantsPasswordSetup = consumeSignupIntent();

          if (needsOnboarding) {
            setWelcomeUser({
              name: metadata.full_name || metadata.name || session.user.email?.split('@')[0] || 'Utilisateur Sawtify',
              email: session.user.email || '',
            });
            setIsBootstrapping(false);
          } else {
            setIsBootstrapping(true);
            refreshAccountData().finally(() => { if (mounted) setIsBootstrapping(false); });
          }

          if (needsPassword) {
            setPendingUserEmail(session.user.email ?? null);
            setNeedsPasswordSetup(true);
          }

          if (isBrandNewAccount) {
            welcomeBonusPromiseRef.current = import('./services/supabaseClient').then(({ claimWelcomeBonus }) => claimWelcomeBonus());
            welcomeBonusPromiseRef.current.then((result) => {
              if (result === 'denied') showToast(language === 'ar' ? '⚠️ لديك حساب بالفعل بهذا عنوان IP.' : "⚠️ Tu as déjà un compte avec cette IP.");
              if (result === 'error') showToast(language === 'ar' ? '⚠️ تعذر التحقق من نقاط الترحيب' : "⚠️ Impossible de vérifier ton bonus.");
            });
            if (!wantsPasswordSetup) {
              showToast(language === 'ar' ? 'مرحباً بك في صوتيفي!' : 'Bienvenue sur Sawtify !');
            }
          }
        }
        if (event === 'SIGNED_OUT') {
          bootstrappedUserIdRef.current = null;
          setIsLoggedIn(false);
        }
        if (event === 'PASSWORD_RECOVERY' && session) {
          setPendingUserEmail(session.user.email ?? null);
          setNeedsPasswordSetup(true);
        }
      });

      unsubscribe = () => listener.subscription.unsubscribe();
    }).catch((err) => {
      console.error('[App] Supabase import error:', err);
      if (mounted) {
        setIsCheckingSession(false);
        setIsLoggedIn(false);
      }
    });

    return () => { 
      mounted = false;
      unsubscribe?.(); 
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dependencies vides pour ne se lancer qu'une fois

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
      if (storagePath) {
        const { updateGenerationStoragePath } = await import('./services/supabaseClient');
        await updateGenerationStoragePath(record.id, storagePath);
      }

      const remaining = typeof remainingBalance === 'number' ? remainingBalance : balance - cost;
      setBalance(remaining);
      setGenerations((prev) => [record, ...prev]);
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

  // Etat de connexion forcé si timeout
  const displayContent = (() => {
    // Si on a un utilisateur à accueillir (onboarding), on le montre toujours
    if (welcomeUser) {
      return <WelcomeOnboarding name={welcomeUser.name} email={welcomeUser.email} language={language} onComplete={() => { trackMarketingEvent('onboarding_completed'); return finishWelcome(); }} />;
    }

    // Setup mot de passe prioritaire
    if (needsPasswordSetup) {
      return (
        <Suspense fallback={<MinimalLoader />}>
          <SetPasswordScreen
            userEmail={pendingUserEmail}
            language={language}
            onDone={() => {
              setNeedsPasswordSetup(false);
              navigateTo('studio', true);
              showToast(language === 'ar' ? 'تم إنشاء كلمة المرور! مرحباً بك في صوتيفي' : 'Mot de passe créé ! Bienvenue sur Sawtify');
            }}
          />
        </Suspense>
      );
    }

    // Si pas connecté et pas en train de checker -> Landing ou Modals
    if (!isLoggedIn) {
      // Mais si on est encore en train de checker et qu'on a timeout, on assume non-connecté
      if (isCheckingSession && !sessionCheckTimeout) {
        return <MinimalLoader />; // Subtil, on attend encore un peu
      }

      if (authModalMode === 'login') {
        return (
          <Suspense fallback={<MinimalLoader />}>
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
          <Suspense fallback={<MinimalLoader />}>
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
            onLoginClick={() => { trackMarketingEvent('signup_open', { intent: 'login' }); setAuthModalMode('login'); }}
            onSigninClick={() => { trackMarketingEvent('signup_open'); setAuthModalMode('signin'); }}
            language={language}
            setLanguage={setLanguage}
          />
          {toastMessage && (
            <div className="fixed bottom-[5.5rem] right-4 z-[75] bg-slate-900 text-white text-xs font-mono px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5 sm:bottom-6 sm:right-6">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="font-semibold">{toastMessage}</span>
            </div>
          )}
        </>
      );
    }

    // Utilisateur connecté : Afficher l'interface principale
    // Même si isBootstrapping est true, on affiche le contenu (le solde arrivera après)
    // C'est le KEY FIX : avant, on bloquait ici jusqu'à la fin du bootstrap
    return (
      <div className={`${activeTab === 'studio' ? 'h-dvh overflow-hidden' : 'min-h-screen'} bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-purple-500/20 selection:text-purple-900 ${isRTL ? 'text-right' : 'text-left'}`}>
        
        {/* Header */}
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

        {/* Toast */}
        {toastMessage && (
          <div 
            id="toast-notification"
            className={`fixed bottom-[5.5rem] ${isRTL ? 'left-4' : 'right-4'} z-[75] bg-slate-900 text-white text-xs font-mono px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5 animate-in slide-in-from-bottom-2 sm:bottom-6 sm:${isRTL ? 'left-6' : 'right-6'}`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}

        {/* Main Content */}
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
          {/* Studio : PAS DE SUSPENSE (chargement direct pour éviter le blocage) */}
          {activeTab === 'studio' && (
            <TTSStudio
              balance={balance}
              onDeductPoints={handleDeductPoints}
              onOpenRecharge={() => navigateTo('pricing')}
              recentGenerations={generations}
            />
          )}

          {/* Autres pages : Suspense OK car ce sont des pages secondaires */}
          <Suspense fallback={<MinimalLoader />}>
            {activeTab === 'history' && (
              <HistoryList
                generations={generations}
                purchases={purchases}
                balance={balance}
                onNavigateToStudio={() => navigateTo('studio')}
                onNavigateToEditVideo={() => navigateTo('edit-video')}
              />
            )}
            
            {activeTab === 'edit-video' && <EditVideoPage balance={balance} recentGenerations={generations} onOpenRecharge={() => navigateTo('pricing')} />}
            
            {activeTab === 'pricing' && (
              <PricingPage
                balance={balance}
                onRechargeSuccess={handleRechargeSuccess}
                purchases={purchases}
                language={language}
                onNavigateToStudio={() => navigateTo('studio')}
              />
            )}
            
            {activeTab === 'developer' && <DeveloperPage balance={balance} />}
            {activeTab === 'admin' && <AdminPage />}
          </Suspense>
        </main>

        {/* Bottom Nav Mobile */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-[70] border-t border-slate-200/80 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.10)] backdrop-blur-xl" aria-label={language === 'ar' ? 'التنقل الرئيسي' : 'Navigation principale'}>
          <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
            {[
              { id: 'studio' as const, label: language === 'ar' ? 'استوديو' : 'Studio', icon: Mic },
              { id: 'history' as const, label: language === 'ar' ? 'السجل' : 'Historique', icon: History },
              { id: 'pricing' as const, label: language === 'ar' ? 'النقاط' : 'Points', icon: CreditCard },
              { id: 'developer' as const, label: 'API', icon: balance > 1000 ? Code2 : Lock },
            ].map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              const disabled = id === 'developer' && balance <= 1000;
              return <button key={id} type="button" disabled={disabled} onClick={() => !disabled && navigateTo(id)} className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-bold transition active:scale-95 ${active ? 'bg-purple-50 text-purple-700' : disabled ? 'text-slate-300' : 'text-slate-500 hover:bg-slate-50'}`}>
                <Icon className={`h-5 w-5 ${active ? 'text-purple-600' : ''}`} />
                <span>{label}</span>
                {id === 'history' && generations.length > 0 && <span className="absolute right-2 top-1 min-w-4 rounded-full bg-purple-600 px-1 text-[9px] leading-4 text-white">{generations.length}</span>}
              </button>;
            })}
          </div>
        </nav>

        <ReportWidget />
        
        {showInstagramNudge && (
          <div className={`fixed bottom-5 ${isRTL ? 'right-5' : 'left-5'} z-40 flex max-w-[calc(100vw-6rem)] items-center gap-3 rounded-2xl border border-pink-100 bg-white px-4 py-3 shadow-xl shadow-pink-900/10 animate-in slide-in-from-bottom-3`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 text-sm font-black text-white">◎</div>
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold text-slate-900">{language === 'ar' ? 'تابع Sawtify على Instagram' : 'Suis Sawtify sur Instagram'}</p>
              <p className="text-[10px] text-slate-500">{language === 'ar' ? 'هدايا وأخبار جديدة' : 'Cadeaux et nouveautés'}</p>
            </div>
            <a href="https://www.instagram.com/sawtify.ai" target="_blank" rel="noreferrer" onClick={() => setShowInstagramNudge(false)} className="shrink-0 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-purple-600">@sawtify.ai</a>
            <button type="button" onClick={() => setShowInstagramNudge(false)} className="shrink-0 text-slate-400 hover:text-slate-700" aria-label="Fermer">×</button>
          </div>
        )}
      </div>
    );
  })();

  return displayContent;
}

export function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;
