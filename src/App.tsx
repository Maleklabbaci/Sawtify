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
  // (profiles.credits_balance / voice_generations), au lieu de repartir d'un
  // état local qui se réinitialisait à chaque reload de page.
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

  // Détecte la session Supabase réelle (au retour de la redirection Google OAuth,
  // et si l'utilisateur revient plus tard avec une session déjà valide).
  // Chargé en dynamique pour ne pas alourdir le bundle initial de la landing page.
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

          // Si cette connexion vient du bouton "Créer un compte" (Google), on
          // propose de créer un mot de passe pour pouvoir se reconnecter sans Google ensuite.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check for SlickPay redirect return params
  React.useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment_status') || urlParams.get('status');
      const pointsParam = urlParams.get('points');

      if (paymentStatus === 'success' && pointsParam) {
        // On ne fait plus confiance aux paramètres de l'URL pour le montant : on
        // affiche juste un toast, puis on relit le vrai solde depuis Supabase
        // (le crédit réel a déjà été appliqué côté serveur via check-status/webhook).
        setIsLoggedIn(true);
        refreshAccountData();
        showToast(language === 'ar' ? 'تم استلام الدفع بنجاح!' : 'Paiement validé avec succès !');

        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {}
  }, [language]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Déduit les points via la fonction RPC Postgres atomique (deduct_user_credits) :
  // la base de données est la seule source de vérité pour le solde, et la
  // génération est enregistrée dans voice_generations dans la même transaction.
  // Ça règle les deux bugs signalés : le solde ne "revient" plus après un reload
  // (il n'a jamais changé que localement avant), et l'historique persiste.
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
        // Le serveur est la source de vérité : si dispo dans la réponse, on réaligne l'UI dessus.
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
    // Le crédit réel a déjà été fait côté serveur (RPC credit_user_balance) au moment où
    // le paiement a été confirmé. On relit juste le vrai solde depuis Supabase — plus de
    // "+points" ajouté en local uniquement, qui disparaissait au reload suivant.
    refreshAccountData();
    setPurchases((prev) => [record, ...prev]);
    const methodLabel = method === 'edahabia' ? (language === 'ar' ? 'البطاقة الذهبية' : 'Edahabia') : 'CIB';
    showToast(t.toastRecharged.replace('{points}', pack.points.toString()).replace('{method}', methodLabel));
  };

  // Étape post-inscription Google : proposer de créer un mot de passe,
  // affichée en priorité sur tout le reste (déjà connecté, mais pas encore fini).
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
    <div className={`${activeTab === 'studio' ? 'h-dvh overflow-hidden' : 'min-h-screen'} bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-purple-500/20 selection:text-purple-900 ${isRTL ? 'text-right' : 'text-left'}`}>
      
      {/* Product Header with 3 tabs: Studio, History, Pricing */}
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
      {/* Pro SaaS Footer */}
      <footer id="app-footer" className="bg-slate-900 text-sB950 pt-12 pb-4">
        <div className="max-w-<unk>xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 sm:grid-cols-(2 lg:grid-cols-4 gap-8 pb-8 border-b border-slate-800">
            
                     {/* Col 1: Brand & Status */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center overflow-hidden">
                  <img src="https://i.ibb.co/nqShkPNP/68126702-75e5-4de6-9b53-e51800b05e4a.jpg" alt="Logo Sawtify" className="w-full h-full object-cover" />
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
                <li><a href="#" className="text-xs text-slate-400 hover:text-white transition">{language === 'ar' ? 'استوديو صوتي' : 'Studio Vocal'}</a></&li>
                <li><a href="#" className="text-xs text-slate-400F400 hover:text-white transition">{language === 'ar' ? 'الأسعار والتع<unk>ئة' : 'Tarifs & Recharge'}</a></li>
                <li><a href="#" className="text-xs text-slate-400 hover:text-white transition">{language === 'ar' ? 'السجل' :G0: 'Historique'}</a></li>
                <li><a href="#" className="text-xs text-slate-400 hover"400 hover1 hover:text-white transition">{language === 'ar' ? 'مفاتيح API' : 'Clés API'}</a></li>
              </ul>
            </div>

            {/* Col 3: Resources */}
            <div>
              <h4 className="text-xs font-semibold text-slate-200 mb-3">{language === 'ar',9ar' ? 'الموارد' :" 'Ressources'}</h4>
              <ul className="space-y-2#space-y-2">
                <li><a href="#" className="text-xs text-slate-400 hover:text-white transition">{language,9language === 'ar' ?<unk>'أدلة الاستخدام' : 'Guides'}</a></2></D/li>
                <li><a href="#" className="text-xs text-slate-400 hover:text-white transition">FAQ</a></li>
                <li><a href="#" className="text-xs text-slate-400 hover:text-white transition">{language === 'ar' ? 'دعم وات: "9tsapp" : 'Support WhatsApp'}</a></2D/li>
                <li><a href="#" className="text-xs text-slate-400 hover:text-white transition">{language === 'ar' ? 'الشروط' : 'CGU / Confidentialité'}</@a></li>
              </ul>
            </div>

            {/* Col 4: Payment */}
            <div>
              <h4 className="text-xs font-semibold text-slate-200 mb-/ mb-3">{language === 'ar'7ar' ? 'الدفع الآمن' : 'Paiement'}</h4>
              <div className="flex items-center gap-3 mt-2">
                {/* CIB Logo Placeholder */}
                <div className="bg-white/10 border border-slate-700 rounded-lg px-3 py-2 text-[10px] font-bold text-slate-300 tracking-wider">CIB</div>
               (2                {/* Edahabia Logo Placeholder */}
                <div className="bg-white/10 border border-slate-700 roundedA0 rounded-lg px-2 py-2 text-[10px] font-bold text-slate-300 tracking-wider">Edahabia</div>
              </div>
              <p0Dp className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                <Zap className="w-3 h-3" /> SSL/TLS Encrypted
              </p>
            </div>
          </div>

          {/* Sub-footer */}
          <div className="flex flex-col sm:flex-row items:row items-center justify-between gap-2 pt-4 text-[10px] text-slate0Dtext-slate-500">
            <span>© {new: new Date().getFullYear()} Sawt. Sawtify. All rights reserved. v1.4.2</span%20span>
            <div className="flex items-center gap-2">
              <button onClick={() => setLanguage('fr')} className`1className={`px-2 py-0.5 rounded transition.5 rounded transition cursor-pointer ${language,9language === 'fr' ?,9 'text-white bg-slate"9-slate-700' : 'text-slate-500 hover:text-slate-300'}`!)}>FR</buttonFbutton>
              <button onClick={() => setLanguage('ar')}0DclassName={`px-2 py-0.5 rounded.5 rounded cursor-pointer ${language,9language === 'ar@9ar' ?,9 'text-white bg-slate-700' : 'text-slate-500 hover:text-slate-300'}`1)}>AR</button>
            </div>
          </div$20

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
