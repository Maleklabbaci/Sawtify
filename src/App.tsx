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
const EditVideoPage = lazy(() => import('./components/EditVideoPage').then(m => ({ default: m.EditVideoPage })));
const PricingPage = lazy(() => import('./components/PricingPage').then(m => ({ default: m.PricingPage })));
const DeveloperPage = lazy(() => import('./components/DeveloperPage').then(m => ({ default: m.DeveloperPage })));
const AdminPage = lazy(() => import('./components/AdminPage').then(m => ({ default: m.AdminPage })));
const LoginModal = lazy(() => import('./components/LoginModal').then(m => ({ default: m.LoginModal })));
const SigninModal = lazy(() => import('./components/SigninModal').then(m => ({ default: m.SigninModal })));
const SetPasswordScreen = lazy(() => import('./components/SetPasswordScreen').then(m => ({ default: m.SetPasswordScreen })));

const ViewFallback = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f7ff] px-6 gap-5">
    <div className="sawtify-fallback-loader-wrapper">
      <div className="sawtify-fallback-loader" />
      {'Sawtify'.split('').map((char, i) => (
        <span key={i} className="sawtify-fallback-loader-letter">{char}</span>
      ))}
    </div>
    <div className="text-center">
      <h2 className="text-lg font-extrabold text-slate-900">Sawtify prépare ton espace</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">Session sécurisée, solde, historique et bonus de bienvenue en cours de synchronisation…</p>
    </div>
  </div>
);

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
  // Tant que la session Supabase n'a pas encore répondu au premier chargement,
  // on ne sait pas si l'utilisateur est connecté ou non. Avant, isLoggedIn valait
  // "false" par défaut pendant ce court instant, donc la Landing s'affichait une
  // seconde avant de basculer vers la vraie page (ex: /pricing) une fois la
  // session confirmée. On garde donc un loader neutre tant que c'est en cours.
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [welcomeUser, setWelcomeUser] = useState<{ name: string; email: string } | null>(null);
  const welcomeBonusPromiseRef = React.useRef<Promise<boolean> | null>(null);
  // Retient l'utilisateur déjà chargé pour ignorer les évènements SIGNED_IN
  // redondants que Supabase renvoie quand l'onglet redevient actif (retour
  // sur l'onglet, rafraîchissement du token) — sans ça, l'écran "Sawtify
  // prépare ton espace" réapparaissait à chaque fois qu'on revenait sur l'onglet.
  const bootstrappedUserIdRef = React.useRef<string | null>(null);

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
      supabase.auth.getUser().then(({ data, error }) => {
        if (data.user && !error) {
          setIsLoggedIn(true);
          bootstrappedUserIdRef.current = data.user.id;

          const metadata = data.user.user_metadata || {};

          // Même logique que l'onboarding : tant que le compte n'a pas de
          // mot de passe défini (metadata.password_set_at absente), on
          // réaffiche l'écran "Crée ton mot de passe" à chaque connexion —
          // plus de dépendance à un flag sessionStorage perdu au reload.
          if (!metadata.password_set_at) {
            setPendingUserEmail(data.user.email ?? null);
            setNeedsPasswordSetup(true);
          }

          // Tant que l'onboarding (téléphone / usage / source) n'a pas été
          // rempli, on le réaffiche à CHAQUE connexion/reload -> pas de
          // dépendance à un délai de 2 minutes après la création du compte.
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
          refreshAccountData().finally(() => setIsBootstrapping(false));
        } else {
          // Le token local existe peut-être encore, mais le compte n'existe
          // plus (ou plus) côté serveur : on nettoie la session locale pour
          // éviter un faux "connecté" (compte supprimé mais encore affiché).
          if (error) {
            supabase.auth.signOut().catch(() => {});
          }
          setIsLoggedIn(false);
          setIsBalanceLoading(false);
        }
      }).finally(() => setIsCheckingSession(false));

      const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Retour sur l'onglet / token rafraîchi pour un utilisateur déjà
          // chargé : Supabase renvoie SIGNED_IN, mais ce n'est pas une
          // vraie nouvelle connexion. On garde la session active sans
          // relancer tout le bootstrap (pas d'écran de chargement, pas de
          // re-check du bonus de bienvenue).
          if (bootstrappedUserIdRef.current === session.user.id) {
            setIsLoggedIn(true);
            return;
          }
          bootstrappedUserIdRef.current = session.user.id;
          setIsLoggedIn(true);
          setAuthModalMode('none');
          navigateTo('studio');

          // Le bonus de bienvenue (et le check anti-abus par IP) sert UNE
          // seule fois, donc reste basé sur "compte créé il y a moins de
          // 2 minutes". L'affichage du formulaire d'onboarding, lui, ne doit
          // PAS dépendre de ce délai : tant que l'utilisateur n'a pas rempli
          // téléphone / usage / source (metadata.onboarding_completed_at
          // absente), on le lui redemande à chaque connexion, même des jours
          // plus tard.
          const createdAtMs = session.user.created_at ? new Date(session.user.created_at).getTime() : 0;
          const isBrandNewAccount = createdAtMs > 0 && (Date.now() - createdAtMs) < 2 * 60 * 1000;
          const metadata = session.user.user_metadata || {};
          const needsOnboarding = !metadata.onboarding_completed_at;
          const needsPassword = !metadata.password_set_at;
          // Gardé uniquement pour savoir si on doit afficher le toast générique
          // "Bienvenue sur Sawtify !" (évite un doublon avec l'écran mot de passe).
          const wantsPasswordSetup = consumeSignupIntent();

          if (needsOnboarding) {
            setWelcomeUser({
              name: metadata.full_name || metadata.name || session.user.email?.split('@')[0] || 'Utilisateur Sawtify',
              email: session.user.email || '',
            });
            setIsBootstrapping(false);
          } else {
            setIsBootstrapping(true);
            refreshAccountData().finally(() => setIsBootstrapping(false));
          }

          if (needsPassword) {
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
          bootstrappedUserIdRef.current = null;
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

  if (isBootstrapping || isCheckingSession) {
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
}

export function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;
