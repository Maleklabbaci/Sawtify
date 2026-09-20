import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  ShieldCheck, 
  CreditCard, 
  Check, 
  ArrowRight, 
  Sparkles, 
  ExternalLink, 
  RefreshCw, 
  Building2, 
  Layers, 
  CheckCircle2, 
  Lock, 
  Info,
  Phone,
  User,
  MapPin,
  HelpCircle,
  ArrowLeft
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getCreditPacks } from '../data/voices';
import { API_BASE_URL } from '../config/apiBase';
import { CreditPack, PurchaseRecord } from '../types';

interface PricingPageProps {
  balance: number;
  onRechargeSuccess: (pack: CreditPack, method: 'edahabia' | 'cib', record: PurchaseRecord) => void;
  onNavigateToStudio?: () => void;
  preselectedPackId?: string;
  purchases?: PurchaseRecord[];
  language?: string;
}

export const PricingPage: React.FC<PricingPageProps> = ({
  balance,
  onRechargeSuccess,
  onNavigateToStudio,
  preselectedPackId = 'pack_pro'
}) => {
  const { t, language, isRTL } = useLanguage();
  const creditPacks = getCreditPacks(language);

  const [selectedPackId, setSelectedPackId] = useState<string>(preselectedPackId);
  const [paymentMethod, setPaymentMethod] = useState<'edahabia' | 'cib'>('edahabia');
  
  // Client checkout info
  const [firstname, setFirstname] = useState<string>('Client');
  const [lastname, setLastname] = useState<string>('Sawtify');
  const [phone, setPhone] = useState<string>('0550123456');
  const [email, setEmail] = useState<string>('client@sawtify.dz');
  const [address, setAddress] = useState<string>('Alger');

  // Checkout process states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [invoiceId, setInvoiceId] = useState<string | number | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const selectedPack = creditPacks.find(p => p.id === selectedPackId) || creditPacks[1];
  const paymentFee = Math.round(selectedPack.priceDZD * 0.03);
  const totalToPay = selectedPack.priceDZD + paymentFee;

  // Start live polling when invoice is generated
  useEffect(() => {
    let interval: any = null;
    if (invoiceId && !isSuccess) {
      interval = setInterval(async () => {
        try {
          const { getMyAccessToken } = await import('../services/supabaseClient');
          const token = await getMyAccessToken();
          const res = await fetch(`${API_BASE_URL}/api/slickpay/check-status/${invoiceId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
          if (res.ok) {
            const data = await res.json();
            if (data.isPaid || data.status === 'completed' || data.status === 'paid') {
              clearInterval(interval);
              handlePaymentSuccess();
            }
          }
        } catch (e) {
          // Status polling background check
        }
      }, 3500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [invoiceId, isSuccess]);

  const handlePaymentSuccess = () => {
    setIsSuccess(true);
    const newRecord: PurchaseRecord = {
      id: `pur_${Date.now()}`,
      packId: selectedPack.id,
      packName: selectedPack.name,
      pointsCredited: selectedPack.points,
      amountDZD: totalToPay,
      paymentMethod,
      createdAt: new Date().toISOString(),
      transactionId: invoiceId ? `SATIM-${invoiceId}` : `SATIM-${Date.now().toString().slice(-6)}`,
      status: 'paid',
    };
    onRechargeSuccess(selectedPack, paymentMethod, newRecord);
  };

  // FIX MOBILE : Gestionnaire d'ouverture de lien robuste
  const openPaymentUrl = (url: string) => {
    // Sur mobile, window.open peut être bloqué si non synchrone avec user gesture
    // On force la navigation directe pour éviter les popups bloqués
    try {
      // Essai 1 : Nouvel onglet (desktop)
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer,width=600,height=800');
      if (newWindow && !newWindow.closed && typeof newWindow.closed !== 'undefined') {
        return; // Succès desktop
      }
      // Si popup bloqué ou mobile : même fenêtre
      window.location.href = url;
    } catch (e) {
      // Fallback ultime
      window.location.href = url;
    }
  };

  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setStatusMessage('');

    try {
      const { getMyAccessToken } = await import('../services/supabaseClient');
      const accessToken = await getMyAccessToken();
      if (!accessToken) {
        setIsProcessing(false);
        setStatusMessage(language === 'ar' ? 'يجب تسجيل الدخول لإعادة شحن النقاط' : 'Connecte-toi pour recharger tes points.');
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/slickpay/create-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          packId: selectedPack.id,
          paymentMethod,
          firstname,
          lastname,
          phone,
          email,
          address
        })
      });

      const data = await res.json();

      if (data.success && data.paymentUrl) {
        setInvoiceId(data.invoiceId);
        setPaymentUrl(data.paymentUrl);
        
        // Ouvrir immédiatement après création invoice (dans le contexte du clic utilisateur)
        setTimeout(() => {
          openPaymentUrl(data.paymentUrl);
        }, 100); // Petit délai pour que le state soit mis à jour
        
      } else {
        const message = `${data.error || data.message || (language === 'ar' ? 'حدث خطأ أثناء إنشاء الفاتورة' : 'Erreur lors de la création de la facture')}${data.error_id ? ` [${data.error_id}]` : ''}`;
        setStatusMessage(message);
      }
    } catch (err) {
      console.warn('[Pricing Checkout Error]:', err);
      setStatusMessage(language === 'ar' ? 'تعذر الاتصال بخادم الدفع' : 'Erreur de communication avec le serveur');
    } finally {
      setIsProcessing(false);
    }
  };

  const checkStatusManually = async () => {
    if (!invoiceId) return;
    setIsProcessing(true);
    try {
      const { getMyAccessToken } = await import('../services/supabaseClient');
      const token = await getMyAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/slickpay/check-status/${invoiceId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const statusData = await res.json();
      if (statusData.isPaid || statusData.status === 'completed' || statusData.status === 'paid') {
        handlePaymentSuccess();
      } else {
        setStatusMessage(language === 'ar' ? 'لم يتم استلام الدفع بعد عبر SATIM' : 'Paiement non encore validé par SATIM.');
        setTimeout(() => setStatusMessage(''), 4000);
      }
    } catch (e) {
      console.warn('[Manual Status Check]:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 pb-24 lg:pb-6">
      
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          <span>{language === 'ar' ? '50 نقطة هدية لكل جديد' : '50 points offerts à chaque nouveau compte'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {language === 'ar' ? 'شحن رصيد نقاطي' : 'Recharge tes points'}
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          {language === 'ar' 
            ? 'اختر باقتك وادفع ببطاقة Edahabia أو CIB مباشرة عبر SATIM.'
            : 'Choisis ton pack et paie par carte Edahabia/CIB via SATIM sécurisé.'}
        </p>
      </div>

      {/* Free Bonus Card — Lighter version */}
      {balance <= 50 && (
        <div className="
          max-w-xl mx-auto p-4 sm:p-5 
          bg-white border border-emerald-200 
          rounded-2xl shadow-sm flex items-center justify-between gap-4
        ">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">Gratuit inclus</p>
              <p className="text-xs text-slate-500 truncate">{balance} pts disponibles maintenant</p>
            </div>
          </div>
          <button
            onClick={onNavigateToStudio}
            className="shrink-0 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition active:scale-[0.98] min-h-[40px]"
          >
            {language === 'ar' ? 'استخدمهم' : 'Utiliser'}
          </button>
        </div>
      )}

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {creditPacks.map((pack: CreditPack) => {
          const isSelected = selectedPack.id === pack.id;
          const isPopular = pack.isPopular;

          return (
            <div
              key={pack.id}
              onClick={() => {
                setSelectedPackId(pack.id);
                setPaymentUrl(null);
                setInvoiceId(null);
                setIsSuccess(false);
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
              }}
              className={`
                relative p-5 sm:p-6 transition-all duration-200 cursor-pointer 
                rounded-2xl border flex flex-col justify-between
                ${isSelected
                  ? 'bg-white border-purple-600 ring-1 ring-purple-600/30 shadow-md scale-[1.02]'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'}
              `}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-slate-900 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                    Populaire
                  </span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {pack.points >= 1000 ? <Building2 className="w-4 h-4" /> : pack.points >= 500 ? <Layers className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                  </div>
                  {pack.bonusPercent && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                      +{pack.bonusPercent}%
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900">{pack.name}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 min-h-[32px]">{pack.tagline}</p>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      {pack.priceDZD.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-slate-400">DZD</span>
                  </div>
                  <div className="text-xs font-medium text-purple-600 mt-1">
                    +{pack.points} pts ({Math.floor(pack.points / 20)} gén.)
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={`mt-4 w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 min-h-[44px] touch-manipulation ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-md hover:bg-slate-800'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : <ArrowRight className="w-4 h-4" />}
                <span>{isSelected ? (language === 'ar' ? 'محدد' : 'Sélectionné') : (language === 'ar' ? 'اختر' : 'Choisir')}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* ==================================================================
          CHECKOUT SECTION — VERSION PRO BLANCHE (Pas de_dark_theme_I_A_vibe)
          ================================================================== */}
      <div className="
        bg-white border border-slate-200 
        rounded-3xl overflow-hidden shadow-sm
        max-w-5xl mx-auto
      ">
        
        {/* Header Checkout */}
        <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {language === 'ar' ? 'إتمام عملية الدفع' : 'Finaliser le paiement'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedPack.name} • {totalToPay.toLocaleString()} DZD
              </p>
            </div>
            
            {/* Badge méthode de paiement */}
            <div className="ml-auto hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-slate-600">
                {paymentMethod === 'edahabia' ? 'Edahabia Poste' : 'CIB Banques DZ'}
              </span>
            </div>
          </div>
        </div>

        {isSuccess ? (
          /* Success State */
          <div className="p-8 sm:p-12 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {language === 'ar' ? 'تم بنجاح!' : 'Paiement validé!'}
            </h3>
            <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
              +{selectedPack.points} points crédités sur ton compte Sawtify.
            </p>
            <button
              onClick={onNavigateToStudio}
              className="w-full sm:w-auto px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition min-h-[48px] touch-manipulation"
            >
              <Zap className="w-4 h-4 inline mr-2" />
              {language === 'ar' ? 'الذهاب للاستوديو' : 'Aller au Studio →'}
            </button>
          </div>
        ) : (
          /* Checkout Grid */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-8 p-6 sm:p-8">
            
            {/* Col Gauche : Résumé */}
            <div className="lg:col-span-5 order-2 lg:order-1 border-t lg:border-t-0 lg:border-r border-slate-100 pr-0 lg:pr-8 pt-6 lg:pt-0">
              
              {/* Récapitulatif financier */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                  {language === 'ar' ? 'ملخص الطلب' : 'Résumé de la commande'}
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{language === 'ar' ? 'الباقة' : 'Pack'}</span>
                    <span className="font-semibold text-slate-900">{selectedPack.name}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{language === 'ar' ? 'النقاط' : 'Points'}</span>
                    <span className="font-bold text-purple-600">+{selectedPack.points}</span>
                  </div>

                  <div className="flex justify-between text-sm text-slate-500">
                    <span>{language === 'ar' ? 'الكمية المتوقعة' : 'Estimation'}</span>
                    <span>~{Math.floor(selectedPack.points / 20)} {language === 'ar' ? 'صوت' : 'audios'}</span>
                  </div>

                  <div className="border-t border-dashed border-slate-200 my-3"></div>

                  <div className="flex justify-between text-sm text-slate-500">
                    <span>{language === 'ar' ? 'رسوم المعاملة' : 'Frais transaction'}</span>
                    <span>{paymentFee.toLocaleString()} DZD</span>
                  </div>

                  <div className="flex justify-between items-baseline text-base font-bold border-t border-slate-200 pt-3 mt-2">
                    <span className="text-slate-900">{language === 'ar' ? 'المجموع' : 'Total'}</span>
                    <span className="text-xl text-slate-900">
                      {totalToPay.toLocaleString()} <span className="text-sm text-slate-400 ml-1">DZD</span>
                    </span>
                  </div>
                </div>

                {/* Sélecteur Méthode de paiement */}
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-600 block mb-3">
                    {language === 'ar' ? 'طريقة الدفع' : 'Moyen de paiement'}
                  </label>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('edahabia')}
                      className={`
                        relative p-3 rounded-xl border-2 text-left transition-all cursor-pointer
                        min-h-[56px] touch-manipulation
                        ${paymentMethod === 'edahabia'
                          ? 'border-amber-400 bg-amber-50/50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold 
                          ${paymentMethod === 'edahabia' ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600'}`}>
                          E
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800">Edahabia</div>
                          <div className="text-[10px] text-slate-400">{language === 'ar' ? 'بريد الجزائر' : 'Algérie Poste'}</div>
                        </div>
                        
                        {/* Indicateur sélection */}
                        {paymentMethod === 'edahabia' && (
                          <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cib')}
                      className={`
                        relative p-3 rounded-xl border-2 text-left transition-all cursor-pointer
                        min-h-[56px] touch-manipulation
                        ${paymentMethod === 'cib'
                          ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold
                          ${paymentMethod === 'cib' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'}`}>
                          CIB
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800">CIB</div>
                          <div className="text-[10px] text-slate-400">{language === 'ar' ? 'بنوك جزائرية' : 'Banques DZ'}</div>
                        </div>
                        
                        {paymentMethod === 'cib' && (
                          <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Guarantees discret */}
                <div className="mt-4 flex items-start gap-2 text-[11px] text-slate-400 bg-slate-50 rounded-lg p-3">
                  <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>Paiement sécurisé via SATIM • Cryptage SSL 256-bit</span>
                </div>
              </div>
            </div>

            {/* Col Droite : Formulaire */}
            <div className="lg:col-span-7 order-1 lg:order-2 pl-0 lg:pl-4">
              
              <div className="space-y-5">
                
                {/* Info banner */}
                <div className="flex items-start gap-2 text-xs text-slate-500 bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                  <span>
                    {language === 'ar' 
                      ? 'بعد الضغط sur "payer", tu seras redirigé vers la page officielle SATIM pour entrer ton code OTP.'
                      : 'Après avoir cliqué sur payer, tu seras redirigé vers SATIM pour confirmer le paiement.'}
                  </span>
                </div>

                {/* Erreur */}
                {statusMessage && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{statusMessage}</span>
                  </div>
                )}

                {/* Lien SATIM si déjà créé */}
                {paymentUrl ? (
                  <div className="space-y-4 p-5 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm font-bold text-emerald-800">
                          {language === 'ar' ? 'جاهز للدفع' : 'Prêt à payer'}
                        </span>
                      </div>
                      {invoiceId && (
                        <span className="text-[10px] font-mono text-slate-400 bg-white px-2 py-1 rounded border">
                          #{invoiceId}
                        </span>
                      )}
                    </div>

                    {/* BOUTON PRINCIPAL MOBILE FIXE — Taille et comportement optimisés */}
                    <a
                      href={paymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        // Sur mobile : on préfère souvent window.location pour éviter les bloqueurs de popup
                        if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                          e.preventDefault();
                          window.location.href = paymentUrl;
                        }
                      }}
                      id="btn-pricing-open-satim"
                      className="
                        w-full py-4 bg-emerald-600 hover:bg-emerald-700 
                        text-white font-bold rounded-xl flex items-center justify-center 
                        gap-2 text-base transition-all duration-150
                        shadow-lg shadow-emerald-600/20 
                        active:scale-[0.99]
                        min-h-[52px] /* Touch target confortable */
                        touch-manipulation
                        select-none
                      "
                    >
                      <ExternalLink className="w-5 h-5" />
                      <span className="tracking-wide">
                        {language === 'ar' 
                          ? `دفع ${totalToPay.toLocaleString()} دج via SATIM →`
                          : `Payer ${totalToPay.toLocaleString()} DZD via SATIM →`}
                      </span>
                    </a>

                    <div className="flex items-center justify-between pt-2 border-t border-emerald-200">
                      <button
                        onClick={checkStatusManually}
                        disabled={isProcessing}
                        className="py-2 px-4 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-semibold flex items-center gap-2 hover:bg-slate-50 transition min-h-[40px] disabled:opacity-60"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                        {isProcessing 
                          ? (language === 'ar' ? 'جاري...' : 'Vérification...')
                          : (language === 'ar' ? 'تأكيد الاستلام' : 'J\'ai payé')
                        }
                      </button>

                      <button
                        onClick={() => {
                          setPaymentUrl(null);
                          setInvoiceId(null);
                        }}
                        className="text-xs text-slate-400 hover:text-slate-600 underline py-2 min-h-[36px]"
                      >
                        {language === 'ar' ? 'تعديل البيانات' : 'Modifier'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Formulaire initial */
                  <form onSubmit={handleInitiatePayment} className="space-y-4" id="pricing-form">
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      {/* Prénom */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">
                          {language === 'ar' ? 'الاسم الأول' : 'Prénom'} *
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            required
                            value={firstname}
                            onChange={(e) => setFirstname(e.target.value)}
                            placeholder="Mohamed"
                            className="w-full pl-10 pr-3 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 
                                       placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500
                                       transition-colors min-h-[48px]"
                          />
                        </div>
                      </div>

                      {/* Nom */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">
                          {language === 'ar' ? 'اللقب' : 'Nom'} *
                        </label>
                        <input
                          type="text"
                          required
                          value={lastname}
                          onChange={(e) => setLastname(e.target.value)}
                          placeholder="Benali"
                          className="w-full px-3 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 
                                     placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500
                                     transition-colors min-h-[48px]"
                        />
                      </div>

                      {/* Téléphone */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">
                          {language === 'ar' ? 'الهاتف (05/06/07)' : 'Téléphone'} *
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="0550123456"
                            dir="ltr"
                            className="w-full pl-10 pr-3 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 
                                       placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500
                                       font-num min-h-[48px]"
                          />
                        </div>
                      </div>

                      {/* Ville */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">
                          {language === 'ar' ? 'الولاية' : 'Wilaya'} *
                        </label>
                        <div className="relative">
                          <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            required
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Alger, Oran..."
                            className="w-full pl-10 pr-3 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 
                                       placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500
                                       transition-colors min-h-[48px]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      id="btn-submit-pricing-checkout"
                      disabled={isProcessing}
                      className="
                        w-full mt-2 py-4 bg-slate-900 hover:bg-slate-800 
                        disabled:bg-slate-300 disabled:cursor-not-allowed
                        text-white font-bold rounded-xl flex items-center justify-center 
                        gap-2 text-base transition-all duration-150
                        shadow-lg shadow-slate-900/20 active:scale-[0.99]
                        min-h-[56px] /* Très grand target tactile */
                        touch-manipulation select-none
                      "
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span className="animate-pulse opacity-80">
                            {language === 'ar' ? 'جاري الاتصال...' : 'Connexion au paiement...'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-5 h-5" />
                          <span className="tracking-wide">
                            {language === 'ar'
                              ? `دفع ${totalToPay.toLocaleString()} دج الآن`
                              : `Payer ${totalToPay.toLocaleString()} DZD maintenant`}
                          </span>
                          <ArrowRight className="w-5 h-5 ml-auto" />
                        </>
                      )}
                    </button>

                    <p className="text-[10px] text-center text-slate-400 px-4">
                      {language === 'ar' 
                        ? 'Tu seras redirigé vers la page bancaire SATIM sécurisée.'
                        : 'Redirection vers la page de paiement SATIM sécurisée.'}
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FAQ Section — Style discret */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-slate-100">
        {[
          { icon: Zap, q: language === 'ar' ? 'أستخدم النقاط كيف؟' : 'Comment utiliser?', a: '20 pts/génération vocale. Valables à vie.' },
          { icon: ShieldCheck, q: language === 'ar' ? 'هل هو آمن?' : 'Sécurisé?', a: 'SATIM certifié, cryptage SSL 256-bit, OTP SMS.' },
          { icon: HelpCircle, q: language === 'ar' ? 'انتهاء الصلاحية?' : 'Expiration?', a: 'Aucune expiration. Tes points restent toujours dispo.' }
        ].map(({ icon: Icon, q, a }) => (
          <div key={q} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <Icon className="w-4 h-4 text-purple-600" />
            <h4 className="text-xs font-bold text-slate-800">{q}</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">{a}</p>
          </div>
        ))}
      </div>

    </div>
  );
};
