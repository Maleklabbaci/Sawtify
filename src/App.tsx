import React, { useState, Suspense, lazy } from 'react';
import { Header } from './components/Header';
import { AgentAccessGate } from './components/AgentAccessGate';
import { GenerationRecord, PurchaseRecord, CreditPack } from './types';
import type { AppTab } from './types';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ReportWidget } from './components/ReportWidget';
import { WelcomeOnboarding } from './components/WelcomeOnboarding';
import { trackMarketingEvent } from './services/marketingTracking';
import { Mic, AudioLines, History, CreditCard, Code2, Lock, Bot } from 'lucide-react';
import { API_BASE_URL } from './config/apiBase';
import { useGrowth } from './hooks/useGrowth';
import { claimReferral, captureReferralFromUrl, clearPendingReferralCode, getPendingReferralCode } from './services/growth';
import { getGrowthCopy } from './data/growthCopy';
import { OUT_OF_BALANCE_THRESHOLD } from './config/growth';
import { FirstRechargeModal, liveFirstRechargeOffers } from './components/growth/FirstRechargeModal';
import { ReferralModal } from './components/growth/ReferralModal';
import { CashbackNotice } from './components/growth/CashbackNotice';
import { ReferralInviteBanner } from './components/growth/ReferralInviteBanner';

// Lazy seulement pour les pages secondaires (pas le Studio qui est la page principale)
// Le Studio est importé directement en bas pour éviter un Suspense bloquant.
const HistoryList = lazy(() => import('./components/HistoryList').then(m => ({ default: m.HistoryList })));
const LandingPage = lazy(() => import('./components/LandingPage').then(m => ({ default: m.LandingPage })));
const PricingPage = lazy(() => import('./components/PricingPage').then(m => ({ default: m.PricingPage })));
const DeveloperPage = lazy(() => import('./components/DeveloperPage').then(m => ({ default: m.DeveloperPage })));
const AdminPage = lazy(() => import('./components/AdminPage').then(m => ({ default: m.AdminPage })));
const AgentSawtifyPage = lazy(() => import('./components/AgentSawtifyPage').then(m => ({ default: m.AgentSawtifyPage })));
const AgentInfoPage = lazy(() => import('./components/AgentInfoPage').then(m => ({ default: m.AgentInfoPage })));
const AgentCallPage = lazy(() => import('./components/AgentCallPage').then(m => ({ default: m.AgentCallPage })));
const LoginModal = lazy(() => import('./components/LoginModal').then(m => ({ default: m.LoginModal })));
const SigninModal = lazy(() => import('./components/SigninModal').then(m => ({ default: m.SigninModal })));
const SetPasswordScreen = lazy(() => import('./components/SetPasswordScreen').then(m => ({ default: m.SetPasswordScreen })));

// ── LE STUDIO ARRIVE A LA DEMANDE ────────────────────────────────────────
// Il pesait une grosse part du JS de demarrage. Or un visiteur qui arrive
// d'une pub voit la page d'accueil, pas le studio : il telechargeait donc
// tout le studio pour rien (donnees mobiles gaspillees, affichage retarde).
// Le studio est desormais charge a part — MAIS precharge en avance pendant
// que le navigateur est libre (voir l'effet plus bas) : quand l'utilisateur
// clique, le fichier est deja la, et l'ouverture reste instantanee.
const importStudio = () => import('./components/TTSStudio');
const TTSStudio = lazy(() => importStudio().then((m) => ({ default: m.TTSStudio })));

/** Branded, page-aware loading surface — no detached spinner or blank screen. */
const MinimalLoader: React.FC<{ page?: AppTab | 'account' }> = ({ page = 'studio' }) => {
  const { language, isRTL } = useLanguage();
  const arabic = language === 'ar';
  const title = page === 'pricing'
    ? (arabic ? 'نحضّرو لك باقات النقاط' : 'Préparation des packs de points')
    : page === 'history'
      ? (arabic ? 'نحمّلو سجلّك' : 'Chargement de ton historique')
      : page === 'account'
        ? (arabic ? 'نحضّرو حسابك' : 'Préparation de ton compte')
        : page === 'agent-sawtify'
          ? (arabic ? 'نحضّرو مساعد Sawtify' : 'Préparation d’Agent Sawtify')
          : (arabic ? 'نحضّرو الاستوديو' : 'Préparation de ton studio');
  const subtitle = arabic ? 'ثواني برك، واجهتك راهي تتحضّر.' : 'Un instant, ton espace se prépare.';

  return (
    <section className={`mx-auto flex min-h-[58vh] w-full max-w-6xl flex-1 flex-col justify-center px-4 py-8 sm:px-6 ${isRTL ? 'text-right' : 'text-left'}`} role="status" aria-live="polite" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="mb-6 flex items-center gap-3 sm:mb-8">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-200/70">{page === 'agent-sawtify' ? <Bot className="h-5 w-5" /> : <AudioLines className="h-5 w-5" />}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-violet-600">Sawtify · {arabic ? 'مساحة العمل' : 'Espace de travail'}</p>
          <h1 className="mt-1 text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">{title}</h1>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        <span className="hidden shrink-0 items-center gap-2 rounded-full border border-violet-100 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 shadow-sm sm:inline-flex">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-50" /><span className="relative inline-flex h-2 w-2 rounded-full bg-violet-600" /></span>
          {arabic ? 'جاري التحضير' : 'En préparation'}
        </span>
      </div>

      {page === 'pricing' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {[0, 1, 2].map((item) => <div key={item} className={`rounded-[26px] border bg-white p-5 shadow-[0_14px_45px_rgba(49,24,90,.05)] sm:p-6 ${item === 1 ? 'border-violet-200 ring-1 ring-violet-100' : 'border-slate-100'}`}>
            <div className="flex justify-between"><div className="h-4 w-24 animate-pulse rounded bg-slate-100" /><div className="h-6 w-14 animate-pulse rounded-full bg-violet-50" /></div>
            <div className="mt-7 h-9 w-32 animate-pulse rounded-lg bg-violet-100/80" />
            <div className="mt-3 h-3 w-40 animate-pulse rounded bg-slate-100" />
            <div className="mt-7 space-y-3"><div className="h-3 w-full animate-pulse rounded bg-slate-50" /><div className="h-3 w-4/5 animate-pulse rounded bg-slate-50" /><div className="h-3 w-3/5 animate-pulse rounded bg-slate-50" /></div>
            <div className="mt-8 h-11 w-full animate-pulse rounded-xl bg-violet-100" />
          </div>)}
        </div>
      ) : (
        <div className="rounded-[26px] border border-slate-100 bg-white p-4 shadow-[0_14px_45px_rgba(49,24,90,.05)] sm:p-6" aria-hidden="true">
          <div className="h-4 w-32 animate-pulse rounded bg-violet-100" />
          <div className="mt-4 h-28 animate-pulse rounded-2xl bg-slate-50 sm:h-36" />
          <div className="mt-4 flex flex-wrap gap-2"><div className="h-9 w-24 animate-pulse rounded-full bg-violet-100" /><div className="h-9 w-20 animate-pulse rounded-full bg-slate-100" /><div className="h-9 w-28 animate-pulse rounded-full bg-slate-100" /></div>
        </div>
      )}
      <div className="mt-6 h-1 overflow-hidden rounded-full bg-violet-100" aria-hidden="true"><span className="saw-loader-progress block h-full w-1/3 rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500" /></div>
    </section>
  );
};

function AppContent() {
  const { t, isRTL, language, setLanguage, isTransitioning } = useLanguage();
  const routeToTab = React.useCallback((path: string): AppTab => {
    if (path === '/historique' || path === '/history') return 'history';
    if (path === '/pricing' || path === '/recharge') return 'pricing';
    if (path === '/developer') return 'developer';
    if (path === '/admin') return 'admin';
    if (path === '/agent-sawtify') return 'agent-sawtify';
    return 'studio';
  }, []);
  
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'none' | 'login' | 'signin'>('none');
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState<boolean>(false);
  const [pendingUserEmail, setPendingUserEmail] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<AppTab>(() => routeToTab(window.location.pathname));
  const requestedTabRef = React.useRef<AppTab | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showInstagramNudge, setShowInstagramNudge] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  
  // KEY FIX : Timeout de sécurité pour ne jamais rester bloqué sur "checking session"
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  
  const [welcomeUser, setWelcomeUser] = useState<{ name: string; email: string } | null>(null);
  const welcomeBonusPromiseRef = React.useRef<Promise<boolean> | null>(null);
  const bootstrappedUserIdRef = React.useRef<string | null>(null);
  const balanceSyncRequestRef = React.useRef(0);

  const syncDisplayedBalance = React.useCallback((serverBalance: number) => {
    if (!Number.isFinite(serverBalance)) return;
    const requestId = ++balanceSyncRequestRef.current;
    setBalance(serverBalance);

    // Le résultat d'une requête concurrente peut arriver en retard; relire le solde
    // courant empêche une ancienne réponse de faire remonter le crédit affiché.
    void import('./services/supabaseClient')
      .then(({ fetchMyBalance }) => fetchMyBalance())
      .then((latestBalance) => {
        if (latestBalance !== null && requestId === balanceSyncRequestRef.current) setBalance(latestBalance);
      })
      .catch((error) => console.warn('[Sawtify] Impossible de resynchroniser le solde:', error));
  }, []);

  // Force la fin du checking après 5 secondes max (évite l'écran blanc infini)
  React.useEffect(() => {
    if (!isCheckingSession) return;
    const timer = setTimeout(() => {
      console.warn('[App] Session check timeout - forcing display');
      setIsCheckingSession(false);
    }, 5000); // 5 secondes max
    return () => clearTimeout(timer);
  }, [isCheckingSession]);

  // Prechargement du studio : il se telecharge en tache de fond, jamais
  // devant l'utilisateur. Une erreur ici est sans consequence : l'import
  // « a la demande » du studio reessaiera tout seul au moment de l'ouverture.
  React.useEffect(() => {
    const preload = () => { importStudio().catch(() => {}); };
    const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(preload, { timeout: 3000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(preload, 1500);
    return () => window.clearTimeout(t);
  }, []);

  // Session detectee = l'utilisateur va vouloir le studio : on le telecharge
  // tout de suite, sans attendre le clic.
  React.useEffect(() => {
    if (isLoggedIn) importStudio().catch(() => {});
  }, [isLoggedIn]);

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

  const navigateTo = React.useCallback((tab: AppTab, replace = false) => {
    const path = tab === 'history' ? '/historique' : tab === 'pricing' ? '/pricing' : tab === 'developer' ? '/developer' : tab === 'admin' ? '/admin' : tab === 'agent-sawtify' ? '/agent-sawtify' : '/studio';
    if (window.location.pathname !== path) window.history[replace ? 'replaceState' : 'pushState']({}, '', path);
    setActiveTab(tab);
  }, []);

  const navigateToAgentInfo = React.useCallback(() => {
    if (window.location.pathname !== '/agent-ai') window.history.pushState({}, '', '/agent-ai');
    setActiveTab('studio');
  }, []);

  // The owner workspace is private even when a visitor enters its URL directly.
  // Keep the public product page as the return destination and never render its UI
  // until Supabase has confirmed a session.
  React.useEffect(() => {
    if (isCheckingSession || isLoggedIn || activeTab !== 'agent-sawtify') return;
    requestedTabRef.current = 'agent-sawtify';
    if (window.location.pathname === '/agent-sawtify') window.history.replaceState({}, '', '/agent-ai');
    setActiveTab('studio');
    setAuthModalMode('login');
  }, [isCheckingSession, isLoggedIn, activeTab]);

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
    const balanceRequestId = ++balanceSyncRequestRef.current;
    setIsBalanceLoading(true);
    try {
      const { fetchMyBalance, fetchMyGenerations, fetchMyPurchases } = await import('./services/supabaseClient');
      const [realBalance, realGenerations, realPurchases] = await Promise.all([
        fetchMyBalance(),
        fetchMyGenerations(),
        fetchMyPurchases(),
      ]);
      if (realBalance !== null && balanceRequestId === balanceSyncRequestRef.current) setBalance(realBalance);
      setGenerations(realGenerations);
      setPurchases(realPurchases);
    } catch (e) {
      console.warn('[Sawtify] Impossible de charger le compte depuis Supabase:', e);
    } finally {
      setIsBalanceLoading(false);
    }
  }, []);

  // Les débits externes (API développeur, montage...) n'ont pas de callback React.
  // Supabase Realtime propage donc chaque mise à jour de la ligne du profil ouvert.
  React.useEffect(() => {
    if (!isLoggedIn) return;
    let active = true;
    let stopChannel: (() => void) | null = null;
    let starting = false;

    const start = async () => {
      if (starting || stopChannel) return;
      starting = true;
      try {
        const { supabase, fetchMyBalance } = await import('./services/supabaseClient');
        const { data: { user } } = await supabase.auth.getUser();
        if (!active || !user) return;

        const refreshLatestBalance = () => {
          const requestId = ++balanceSyncRequestRef.current;
          void fetchMyBalance()
            .then((latestBalance) => {
              if (active && latestBalance !== null && requestId === balanceSyncRequestRef.current) setBalance(latestBalance);
            })
            .catch((error) => console.warn('[Sawtify] Erreur de lecture du solde en temps réel:', error));
        };
        const channel = supabase
          .channel(`profile-balance:${user.id}`)
          .on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}`,
          }, refreshLatestBalance)
          .subscribe();
        stopChannel = () => { void supabase.removeChannel(channel); stopChannel = null; };
        refreshLatestBalance();
        if (!active) stopChannel();
      } catch (error) {
        console.warn('[Sawtify] Impossible d’activer la synchronisation Realtime du solde:', error);
      } finally {
        starting = false;
      }
    };

    // bfcache : on ferme le WebSocket avant la mise en cache et on le rouvre au retour.
    const onPageHide = () => { stopChannel?.(); };
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) void start(); };
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);

    void start();

    return () => {
      active = false;
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      stopChannel?.();
    };
  }, [isLoggedIn]);

  const finishWelcome = React.useCallback(async () => {
    setWelcomeUser(null);
    setIsBootstrapping(true);
    if (welcomeBonusPromiseRef.current) await welcomeBonusPromiseRef.current;
    await refreshAccountData();
    setIsBootstrapping(false);
    const destination = requestedTabRef.current || 'studio';
    requestedTabRef.current = null;
    navigateTo(destination, true);
  }, [refreshAccountData, navigateTo]);

  // ── CROISSANCE : offre 1ère recharge, cashback, parrainage (décidés par le serveur) ──
  const showToastRef = React.useRef<(msg: string) => void>(() => {});
  const growth = useGrowth({
    isLoggedIn,
    balance,
    balanceReady: isLoggedIn && !isBalanceLoading && !isBootstrapping,
    onReferralRewarded: (points) => {
      const copy = getGrowthCopy(language);
      showToastRef.current(copy.referralRewardedReferrer(points));
      refreshAccountData();
    },
  });
  const [showReferral, setShowReferral] = useState(false);
  const [pricingIntent, setPricingIntent] = useState<string | null>(null);
  const [firstOfferOpen, setFirstOfferOpen] = useState(false);
  // « Réutiliser dans le studio » (depuis l'historique) : texte à pré-remplir dans l'éditeur.
  const [studioPrefill, setStudioPrefill] = useState<string | null>(null);
  const [pendingReferral, setPendingReferral] = useState<string | null>(() => getPendingReferralCode());

  // Lien d'un ami (?ref=CODE) : on mémorise le code (il survit à la redirection Google).
  React.useEffect(() => {
    const code = captureReferralFromUrl();
    if (code) setPendingReferral(code);
  }, []);

  // Une fois connecté, on rattache le nouveau compte à son parrain (le serveur valide tout).
  React.useEffect(() => {
    if (!isLoggedIn || !pendingReferral || isBootstrapping) return;
    let cancelled = false;
    (async () => {
      // Laisse le temps au bonus de bienvenue (règle « 1 compte par IP ») d'être validé d'abord.
      if (!welcomeBonusPromiseRef.current) await new Promise((r) => setTimeout(r, 2500));
      if (welcomeBonusPromiseRef.current) await welcomeBonusPromiseRef.current.catch(() => false);
      if (cancelled) return;
      const result = await claimReferral(pendingReferral);
      if (!result.definitive) return; // réseau : on réessaiera à la prochaine ouverture
      clearPendingReferralCode();
      setPendingReferral(null);
      if (result.success) {
        showToastRef.current(getGrowthCopy(language).referralClaimed(result.requiredGenerations ?? 3));
        refreshAccountData();
        growth.refresh();
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, pendingReferral, isBootstrapping]);

  // Pop-up de première fin de solde (2,5 s après, pour ne pas couper l'écoute de l'audio qui vient d'être généré).
  React.useEffect(() => {
    const status = growth.status;
    if (!isLoggedIn || !status || isBalanceLoading || isBootstrapping || welcomeUser || needsPasswordSetup) return;
    if (status.hasPaid || balance >= OUT_OF_BALANCE_THRESHOLD || activeTab === 'pricing') return;
    const live = liveFirstRechargeOffers(status, growth.nowMs());
    const phase = live.flash ? 'flash' : live.entry ? 'entry' : null;
    if (!phase) return;
    let dismissed = false;
    try { dismissed = sessionStorage.getItem(`sawtify_first_offer_dismissed_${phase}`) === '1'; } catch { /* ignore */ }
    if (dismissed) return;
    const timer = window.setTimeout(() => setFirstOfferOpen(true), 2500);
    return () => window.clearTimeout(timer);
  }, [isLoggedIn, growth.status, growth.nowMs, balance, isBalanceLoading, isBootstrapping, welcomeUser, needsPasswordSetup, activeTab]);

  // Dès le premier paiement validé (hasPaid), le pop-up d'offre disparaît définitivement.
  React.useEffect(() => {
    if (growth.status?.hasPaid && firstOfferOpen) setFirstOfferOpen(false);
  }, [growth.status, firstOfferOpen]);

  const closeFirstOffer = React.useCallback(() => {
    setFirstOfferOpen(false);
    const status = growth.status;
    if (!status) return;
    const live = liveFirstRechargeOffers(status, growth.nowMs());
    try { sessionStorage.setItem(`sawtify_first_offer_dismissed_${live.flash ? 'flash' : 'entry'}`, '1'); } catch { /* ignore */ }
  }, [growth.status, growth.nowMs]);

  React.useEffect(() => {
    if (!isCheckingSession && !isLoggedIn && !authModalMode) trackMarketingEvent('landing_view');
  }, [isCheckingSession, isLoggedIn, authModalMode]);

  // Détecte la session Supabase avec timeout intégré
  React.useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let mounted = true; // Pour éviter les setState si démonté

    import('./services/supabaseClient').then(({ supabase, consumeSignupIntent, isSupabaseConfigured }) => {
      if (!mounted) return;
      if (!isSupabaseConfigured) {
        setIsLoggedIn(false);
        setIsBalanceLoading(false);
        setIsCheckingSession(false);
        return;
      }

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

          const pathname = window.location.pathname;
          const isPublicCallRoute = /^\/call\/[^/]+\/?$/.test(pathname);
          if (pathname !== '/agent-ai' && !isPublicCallRoute) navigateTo(routeToTab(pathname), true);
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
          navigateTo(requestedTabRef.current || 'studio', true);

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
              if (!result) showToast(language === 'ar' ? 'لم نتمكن من منح مكافأة الترحيب.' : "Le bonus de bienvenue n’a pas pu être accordé.");
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
        // Le client revient de la page de paiement au lieu de rester dans l'application :
        // on resynchronise ses factures en attente (crédit si le webhook a été manqué),
        // puis on rafraîchit le solde affiché.
        (async () => {
          try {
            const { getMyAccessToken } = await import('./services/supabaseClient');
            const token = await getMyAccessToken();
            if (!token) return;
            await fetch(`${API_BASE_URL}/api/slickpay/sync-pending`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
          } catch { /* silencieux : le solde se rafraîchit juste après */ }
        })().finally(() => refreshAccountData());
        // Retour de la page de paiement (mobile) : le cashback arrive dès que le crédit est confirmé.
        growth.expectCashback('any');
        // Premier paiement validé : l'offre flash / 1re recharge ne s'affiche plus jamais.
        setFirstOfferOpen(false);
        try {
          sessionStorage.setItem('sawtify_first_offer_dismissed_flash', '1');
          sessionStorage.setItem('sawtify_first_offer_dismissed_entry', '1');
        } catch { /* ignore */ }
        showToast(language === 'ar' ? 'تم استلام الدفع بنجاح!' : 'Paiement validé avec succès !');

        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {}
  }, [language, refreshAccountData, navigateTo, growth.expectCashback]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };
  showToastRef.current = showToast;

  const handleDeductPoints = async (cost: number, record: GenerationRecord, storagePath?: string | null, remainingBalance?: number | null): Promise<boolean> => {
    try {
      if (storagePath) {
        const { updateGenerationStoragePath } = await import('./services/supabaseClient');
        await updateGenerationStoragePath(record.id, storagePath);
      }

      const remaining = typeof remainingBalance === 'number' && Number.isFinite(remainingBalance) ? remainingBalance : balance - cost;
      if (typeof remainingBalance !== 'number' || !Number.isFinite(remainingBalance)) syncDisplayedBalance(remaining);
      setGenerations((prev) => [record, ...prev]);
      showToast(t.toastDeducted.replace('{balance}', remaining.toString()));
      // Filleul en cours de parrainage : met à jour « 2/3 voix testées » (et détecte la récompense).
      if (growth.status?.referral.asFriend?.status === 'pending') growth.refresh();
      return true;
    } catch (e) {
      console.error('[Sawtify] Erreur handleDeductPoints:', e);
      showToast(language === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Erreur de connexion au serveur.');
      return false;
    }
  };

  const handleRechargeSuccess = (pack: CreditPack, method: 'edahabia' | 'cib', record: PurchaseRecord) => {
    refreshAccountData();
    // Premier paiement validé : le pop-up flash / première recharge disparaît définitivement.
    setFirstOfferOpen(false);
    try {
      sessionStorage.setItem('sawtify_first_offer_dismissed_flash', '1');
      sessionStorage.setItem('sawtify_first_offer_dismissed_entry', '1');
    } catch { /* ignore */ }
    // Notification immédiate du cashback (+20 % sur la prochaine recharge) posé par le serveur au crédit.
    growth.expectCashback('previous');
    setPurchases((prev) => [record, ...prev]);
    const methodLabel = method === 'edahabia' ? (language === 'ar' ? 'البطاقة الذهبية' : 'Edahabia') : 'CIB';
    showToast(t.toastRecharged.replace('{points}', pack.points.toString()).replace('{method}', methodLabel));
  };

  const agentInfoPage = (
    <Suspense fallback={<MinimalLoader page="agent-sawtify" />}>
      <AgentInfoPage
        isLoggedIn={isLoggedIn}
        onBack={() => navigateTo('studio')}
        onOpenAgent={() => navigateTo('agent-sawtify')}
        onOpenStudio={() => navigateTo('studio')}
        onLogin={() => {
          requestedTabRef.current = 'agent-sawtify';
          trackMarketingEvent('signup_open', { intent: 'agent_ai_login' });
          setAuthModalMode('login');
        }}
        onSignup={() => {
          requestedTabRef.current = 'agent-sawtify';
          trackMarketingEvent('signup_open', { intent: 'agent_sawtify' });
          setAuthModalMode('signin');
        }}
      />
    </Suspense>
  );

  // Etat de connexion forcé si timeout
  const displayContent = (() => {
    // The customer call page is public and must remain on /call/:slug even when
    // a Supabase session is already present (the studio's session bootstrap must not redirect it).
    const callRouteMatch = window.location.pathname.match(/^\/call\/([^/]+)/);
    if (callRouteMatch) {
      const slug = decodeURIComponent(callRouteMatch[1]);
      return <Suspense fallback={<MinimalLoader page="agent-sawtify" />}><AgentCallPage slug={slug} /></Suspense>;
    }

    // Si on a un utilisateur à accueillir (onboarding), on le montre toujours
    if (welcomeUser) {
      return <WelcomeOnboarding name={welcomeUser.name} email={welcomeUser.email} language={language} onComplete={() => { trackMarketingEvent('onboarding_completed'); return finishWelcome(); }} />;
    }

    // Setup mot de passe prioritaire
    if (needsPasswordSetup) {
      return (
        <Suspense fallback={<MinimalLoader page="account" />}>
          <SetPasswordScreen
            userEmail={pendingUserEmail}
            language={language}
            onDone={() => {
              setNeedsPasswordSetup(false);
              const destination = requestedTabRef.current || 'studio';
              requestedTabRef.current = null;
              navigateTo(destination, true);
              showToast(language === 'ar' ? 'تم إنشاء كلمة المرور! مرحباً بك في صوتيفي' : 'Mot de passe créé ! Bienvenue sur Sawtify');
            }}
          />
        </Suspense>
      );
    }

    // The Agent product information page remains public, whether signed in or not.
    if (window.location.pathname === '/agent-ai') return agentInfoPage;

    // La landing reste visible pendant la vérification de session : aucun écran d'attente vide.
    if (!isLoggedIn) {
      if (authModalMode === 'login') {
        return (
          <Suspense fallback={<MinimalLoader page="account" />}>
            <LoginModal
              onClose={() => { setAuthModalMode('none'); requestedTabRef.current = null; }}
              onLoginSuccess={() => {
                setAuthModalMode('none');
                setIsLoggedIn(true);
                const destination = requestedTabRef.current || 'studio';
                requestedTabRef.current = null;
                navigateTo(destination);
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
          <Suspense fallback={<MinimalLoader page="account" />}>
            <SigninModal
              onClose={() => { setAuthModalMode('none'); requestedTabRef.current = null; }}
              onSigninSuccess={() => {
                setAuthModalMode('none');
                setIsLoggedIn(true);
                const destination = requestedTabRef.current || 'studio';
                requestedTabRef.current = null;
                navigateTo(destination);
                showToast(language === 'ar' ? 'تم إنشاء الحساب بنجاح! +50 نقطة هدية' : 'Compte créé avec succès ! +50 points offerts.');
              }}
              onSwitchToLogin={() => setAuthModalMode('login')}
              language={language}
            />
          </Suspense>
        );
      }

      if (activeTab === 'agent-sawtify') return <MinimalLoader page="account" />;

      return (
        <>
          <Suspense fallback={<MinimalLoader page="studio" />}>
            <LandingPage
              onLoginClick={() => { requestedTabRef.current = null; trackMarketingEvent('signup_open', { intent: 'login' }); setAuthModalMode('login'); }}
              onSigninClick={() => { requestedTabRef.current = null; trackMarketingEvent('signup_open'); setAuthModalMode('signin'); }}
              onAgentClick={navigateToAgentInfo}
              language={language}
              setLanguage={setLanguage}
            />
          </Suspense>
          {pendingReferral && (
            <ReferralInviteBanner
              language={language}
              isRTL={isRTL}
              onSignup={() => { trackMarketingEvent('signup_open', { intent: 'referral' }); setAuthModalMode('signin'); }}
            />
          )}
          {toastMessage && (
            <div className="fixed bottom-[5.5rem] right-4 z-[75] bg-slate-900 text-white text-xs font-mono px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5 sm:bottom-6 sm:right-6">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="font-semibold">{toastMessage}</span>
            </div>
          )}
        </>
      );
    }

    if (window.location.pathname === '/agent-ai') return agentInfoPage;

    // Utilisateur connecté : Afficher l'interface principale
    // Même si isBootstrapping est true, on affiche le contenu (le solde arrivera après)
    // C'est le KEY FIX : avant, on bloquait ici jusqu'à la fin du bootstrap
    return (
      <div className={`${activeTab === 'studio' ? 'h-dvh overflow-hidden' : 'min-h-screen'} saw-app-background text-slate-900 flex flex-col font-sans selection:bg-purple-500/20 selection:text-purple-900 ${isRTL ? 'text-right' : 'text-left'}`}>
        
        {/* Header */}
        <Header
          balance={balance}
          activeTab={activeTab}
          setActiveTab={navigateTo}
          historyCount={generations.length}
          onOpenReferral={growth.status ? () => setShowReferral(true) : undefined}
          onLogout={() => {
            import('./services/supabaseClient').then(({ signOutFromSupabase }) => signOutFromSupabase());
            setIsLoggedIn(false);
            navigateTo('studio');
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
              : activeTab === 'agent-sawtify'
                ? 'max-w-none px-0 py-0'
                : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8'
          } ${
            isTransitioning ? 'opacity-0' : 'opacity-100 lang-fade-enter'
          }`}
        >
          {/* Studio : PAS DE SUSPENSE (chargement direct pour éviter le blocage) */}
          {activeTab === 'studio' && (
            <Suspense fallback={<MinimalLoader page="studio" />}>
              <TTSStudio
                balance={balance}
                onBalanceChange={syncDisplayedBalance}
                onDeductPoints={handleDeductPoints}
                onOpenRecharge={() => navigateTo('pricing')}
                onOpenAgent={() => navigateTo('agent-sawtify')}
                recentGenerations={generations}
                prefillText={studioPrefill}
                onPrefillConsumed={() => setStudioPrefill(null)}
              />
            </Suspense>
          )}

          {/* Autres pages : Suspense OK car ce sont des pages secondaires */}
          <Suspense fallback={<MinimalLoader page={activeTab} />} >
            {activeTab === 'history' && (
              <HistoryList
                generations={generations}
                purchases={purchases}
                onNavigateToStudio={() => navigateTo('studio')}
                onReuseText={(text) => { setStudioPrefill(text); navigateTo('studio'); }}
              />
            )}
            
            {activeTab === 'pricing' && (
              <PricingPage
                balance={balance}
                onRechargeSuccess={handleRechargeSuccess}
                onNavigateToStudio={() => navigateTo('studio')}
                growth={growth}
                openPackId={pricingIntent}
                onOpenPackHandled={() => setPricingIntent(null)}
              />
            )}
            
            {activeTab === 'developer' && <DeveloperPage balance={balance} />}
            {activeTab === 'admin' && <AdminPage />}
            {activeTab === 'agent-sawtify' && <AgentAccessGate onBack={() => navigateTo('studio')}><AgentSawtifyPage /></AgentAccessGate>}
          </Suspense>
        </main>

        {/* Bottom Nav Mobile */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-[70] border-t border-slate-200/80 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.10)] backdrop-blur-xl" aria-label={language === 'ar' ? 'التنقل الرئيسي' : 'Navigation principale'}>
          <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
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

        {/* Croissance : pop-up de fin de solde, parrainage, notification de cashback */}
        {firstOfferOpen && growth.status && (
          <FirstRechargeModal
            language={language}
            isRTL={isRTL}
            growth={growth}
            onClose={closeFirstOffer}
            onChoosePack={(packId) => {
              closeFirstOffer();
              setPricingIntent(packId);
              navigateTo('pricing');
            }}
          />
        )}
        {showReferral && (
          <ReferralModal status={growth.status} language={language} isRTL={isRTL} onClose={() => setShowReferral(false)} />
        )}
        {growth.cashbackNotice && (
          <CashbackNotice
            notice={growth.cashbackNotice}
            language={language}
            isRTL={isRTL}
            onSeePacks={() => navigateTo('pricing')}
            onClose={growth.dismissCashbackNotice}
          />
        )}
        
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

interface AppErrorBoundaryState { hasError: boolean }

class AppErrorBoundary extends React.Component<React.PropsWithChildren<{}>, AppErrorBoundaryState> {
  private readonly appChildren: React.ReactNode;
  state: AppErrorBoundaryState = { hasError: false };

  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.appChildren = props.children;
  }

  static getDerivedStateFromError(): AppErrorBoundaryState { return { hasError: true }; }

  componentDidCatch(error: Error) {
    console.error('[Sawtify] App render failed:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[#f8f7ff] px-5 py-10" role="alert">
          <section className="w-full max-w-md rounded-3xl border border-violet-100 bg-white p-7 text-center shadow-xl shadow-violet-900/5">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-white"><Mic className="h-6 w-6" /></div>
            <h1 className="mt-4 text-lg font-extrabold text-slate-900">Le studio n’a pas pu s’ouvrir</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Actualise la page. Si le problème continue, vérifie ta connexion puis réessaie.</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white hover:bg-violet-700">Actualiser la page</button>
          </section>
        </main>
      );
    }
    return this.appChildren;
  }
}

export function App() {
  return (
    <AppErrorBoundary>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </AppErrorBoundary>
  );
}

export default App;
