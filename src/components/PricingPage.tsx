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
  Mail,
  HelpCircle
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getCreditPacks } from '../data/voices';
import { API_BASE_URL } from '../config/apiBase';
import { CreditPack, PurchaseRecord } from '../types';

interface PricingPageProps {
  balance: number;
  onRechargeSuccess: (pack: CreditPack, method: 'edahabia' | 'cib', record: PurchaseRecord) => void;
  onNavigateToStudio: () => void;
  preselectedPackId?: string;
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

  // Start live polling when invoice is generated
  useEffect(() => {
    let interval: any = null;
    if (invoiceId && !isSuccess) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/slickpay/check-status/${invoiceId}`);
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
      amountDZD: selectedPack.priceDZD,
      paymentMethod,
      createdAt: new Date().toISOString(),
      transactionId: invoiceId ? `SATIM-${invoiceId}` : `SATIM-${Date.now().toString().slice(-6)}`,
      status: 'paid',
    };
    onRechargeSuccess(selectedPack, paymentMethod, newRecord);
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
        if (data.paymentUrl.startsWith('http')) {
          try {
            window.open(data.paymentUrl, '_blank');
          } catch (e) {}
        }
      } else {
        setStatusMessage(data.message || (language === 'ar' ? 'حدث خطأ أثناء إنشاء الفاتورة' : 'Erreur lors de la création de la facture'));
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
      const res = await fetch(`${API_BASE_URL}/api/slickpay/check-status/${invoiceId}`);
      const statusData = await res.json();
      if (statusData.isPaid || statusData.status === 'completed' || statusData.status === 'paid') {
        handlePaymentSuccess();
      } else {
        setStatusMessage(language === 'ar' ? 'لم يتم استلام الدفع بعد عبر SATIM' : 'Paiement non encore validé par SATIM.');
        setTimeout(() => setStatusMessage(''), 3000);
      }
    } catch (e) {
      console.warn('[Manual Status Check]:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
      
      {/* Page Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          <span>{language === 'ar' ? 'هدية الترحيب: 50 نقطة مجانية (توليدين صوتيين + 10 نقاط متبقية)' : 'Offre de bienvenue : 50 points offerts (2 générations + 10 points restants)'}</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {language === 'ar' ? 'شحن رصيد النقاط (DZD)' : 'Recharge de Points Sawtify'}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          {language === 'ar' 
            ? 'كل مستخدم جديد يستفيد من 50 نقطة مجانية للبدء. لشحن رصيد إضافي بالدينار الجزائري (DZD)، اختر عدد النقاط المراد شحنها عبر البطاقة الذهبية أو CIB.' 
            : 'Tout nouvel utilisateur démarre avec 50 points offerts (2 générations complètes + 10 points restants). Choisissez votre recharge en Dinars Algériens (DZD) via Edahabia ou CIB.'}
        </p>
      </div>

      {/* Free Plan Status Banner */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-4 text-left">
          <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-800 bg-purple-100/80 px-2.5 py-0.5 rounded-full">
                {language === 'ar' ? 'الخطة المجانية الترحيبية' : 'Plan Gratuit Inclus'}
              </span>
              <span className="text-xs font-num font-bold text-slate-900">
                {balance} / 50 {t.pointsLabel}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
              {language === 'ar' ? '50 نقطة ترحيبية مجانية (20 نقطة / توليد)' : '50 points gratuits (20 points / génération vocale)'}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {language === 'ar' 
                ? 'تتيح لك توليد تسجيلين كاملين بجودة 24 kHz (40 نقطة) مع بقاء 10 نقاط في رصيدك.' 
                : 'Permet 2 générations haute définition 24 kHz complètes (40 points) avec 10 points de réserve.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onNavigateToStudio}
          className="shrink-0 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl text-xs flex items-center gap-2 transition cursor-pointer shadow-xs"
        >
          <span>{language === 'ar' ? 'جرب في الاستوديو' : 'Essayer au Studio'}</span>
          <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {creditPacks.map((pack: CreditPack) => {
          const isSelected = selectedPack.id === pack.id;
          const isPopular = pack.isPopular;

          return (
            <div
              key={pack.id}
              id={`pricing-card-${pack.id}`}
              onClick={() => {
                setSelectedPackId(pack.id);
                setPaymentUrl(null);
                setInvoiceId(null);
                setIsSuccess(false);
              }}
              className={`relative rounded-3xl p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between border ${
                isSelected
                  ? 'bg-white border-purple-600 ring-2 ring-purple-600/20 shadow-lg'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
              }`}
            >
              {/* Popular Badge */}
              {isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-purple-600 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-current" />
                    {language === 'ar' ? 'الأكثر طلباً' : 'Plus Populaire'}
                  </span>
                </div>
              )}

              <div>
                {/* Pack Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    isPopular ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {pack.points >= 1000 ? <Building2 className="w-5 h-5" /> : pack.points >= 500 ? <Layers className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                  </div>
                  {pack.bonusPercent && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-num">
                      +{pack.bonusPercent}% Bonus
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-slate-900">{pack.name}</h3>
                <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{pack.tagline}</p>

                {/* Price Display */}
                <div className="mt-5 pb-5 border-b border-slate-100">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold font-num text-slate-900 tracking-tight">
                      {pack.priceDZD.toLocaleString()}
                    </span>
                    <span className="text-sm font-bold text-slate-500">DZD</span>
                  </div>
                  <div className="text-xs font-semibold text-purple-700 mt-1">
                    <span className="font-num font-bold">+{pack.points}</span> {t.pointsLabel} <span className="text-slate-400 font-normal">(~<span className="font-num">{Math.floor(pack.points / 20)}</span> {language === 'ar' ? 'تسجيل صوتي' : 'générations'})</span>
                  </div>
                </div>

                {/* Features List */}
                <ul className="mt-5 space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>{language === 'ar' ? 'توليد صوتي استوديو 24 kHz' : 'Qualité studio 24 kHz'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>{language === 'ar' ? 'تصدير MP3 و WAV فوري' : 'Téléchargement MP3 & WAV'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>{language === 'ar' ? 'استخدام تجاري غير محدود' : 'Usage commercial complet'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>{language === 'ar' ? 'صلاحية غير محدودة للنقاط' : 'Crédits valables à vie'}</span>
                  </li>
                </ul>
              </div>

              {/* Action Selector Button */}
              <button
                type="button"
                className={`mt-6 w-full py-2.5 rounded-2xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
              >
                {isSelected ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>{language === 'ar' ? 'النقاط المختارة' : 'Points sélectionnés'}</span>
                  </>
                ) : (
                  <span>{language === 'ar' ? `شحن ${pack.points} نقطة` : `Choisir ${pack.points} points`}</span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Embedded Checkout / Payment Section */}
      <div className="bg-slate-900 rounded-3xl text-white p-6 sm:p-10 shadow-xl border border-slate-800">
        
        {isSuccess ? (
          /* Payment Success Confirmation */
          <div className="text-center py-10 max-w-xl mx-auto space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-purple-500/20 border border-purple-500/40 text-purple-400 rounded-full flex items-center justify-center mx-auto shadow-lg">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">
                {language === 'ar' ? 'تمت عملية الدفع بنجاح!' : 'Paiement effectué avec succès !'}
              </h2>
              <p className="text-slate-300 text-sm">
                {language === 'ar'
                  ? `تمت إضافة +${selectedPack.points} نقطة إلى رصيدك. رصيدك الإجمالي الآن: ${balance} نقطة.`
                  : `Vos +${selectedPack.points} points ont été crédités sur votre compte. Votre solde actuel est de ${balance} points.`}
              </p>
            </div>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                id="btn-return-studio-after-payment"
                onClick={onNavigateToStudio}
                className="w-full sm:w-auto px-6 py-3 bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer text-sm shadow-md"
              >
                <Sparkles className="w-4 h-4" />
                <span>{language === 'ar' ? 'الانتقال إلى استوديو الصوت' : 'Aller au Studio Vocal'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSuccess(false);
                  setPaymentUrl(null);
                  setInvoiceId(null);
                }}
                className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-2xl transition cursor-pointer text-sm"
              >
                <span>{language === 'ar' ? 'شحن رصيد إضافي' : 'Recharger à nouveau'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Active Checkout Workflow */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Summary of Selected Points */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  {language === 'ar' ? 'تفاصيل الشحن' : 'Détails de la recharge'}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                  {selectedPack.name}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedPack.tagline}
                </p>
              </div>

              {/* Price & Points Card */}
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3">
                <div className="flex justify-between items-center text-xs text-slate-300">
                  <span>{language === 'ar' ? 'النقاط المكتسبة :' : 'Points crédités :'}</span>
                  <span className="font-num font-bold text-purple-400 text-sm">+{selectedPack.points} {t.pointsLabel}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-300">
                  <span>{language === 'ar' ? 'المعادل التقديري :' : 'Volume estimé :'}</span>
                  <span className="text-slate-200"><span className="font-num">~{Math.floor(selectedPack.points / 20)}</span> {language === 'ar' ? 'تسجيل صوتي' : 'audios'}</span>
                </div>
                <div className="pt-3 border-t border-slate-700 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-white">{language === 'ar' ? 'المبلغ الإجمالي :' : 'Total à payer :'}</span>
                  <div className="text-right">
                    <span className="text-2xl font-num font-extrabold text-white tracking-tight">
                      {selectedPack.priceDZD.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">DZD</span>
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-300">
                  {language === 'ar' ? 'طريقة الدفع في الجزائر :' : 'Moyen de paiement sécurisé :'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('edahabia')}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      paymentMethod === 'edahabia'
                        ? 'bg-amber-500/10 border-amber-500 text-white ring-1 ring-amber-500'
                        : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-bold text-xs">
                      E
                    </div>
                    <div>
                      <div className="text-xs font-bold">{language === 'ar' ? 'البطاقة الذهبية' : 'Edahabia'}</div>
                      <div className="text-[10px] text-slate-400">{language === 'ar' ? 'بريد الجزائر' : 'Algérie Poste'}</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cib')}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      paymentMethod === 'cib'
                        ? 'bg-blue-500/10 border-blue-500 text-white ring-1 ring-blue-500'
                        : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs">
                      CIB
                    </div>
                    <div>
                      <div className="text-xs font-bold">{language === 'ar' ? 'بطاقة CIB' : 'Carte CIB'}</div>
                      <div className="text-[10px] text-slate-400">{language === 'ar' ? 'البنوك الجزائرية' : 'Banques DZ'}</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Guarantees */}
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                <span>{language === 'ar' ? 'معتمد من SATIM و GIE Monétique بشهادة SSL مشفرة 256-bit.' : 'Certifié SATIM & GIE Monétique avec cryptage SSL 256-bit.'}</span>
              </div>
            </div>

            {/* Right Column: Checkout Form & SATIM Gateway Trigger */}
            <div className="lg:col-span-7 bg-slate-950/60 rounded-2xl p-6 border border-slate-800 space-y-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-purple-400" />
                  <span>{language === 'ar' ? 'معلومات الفاتورة والدفع' : 'Informations de facturation & Paiement'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {language === 'ar' 
                    ? 'سيتم توجيهك مباشرة إلى صفحة SATIM الرسمية لإدخال رمز التحقق وكلمة السر المؤقتة.' 
                    : 'Vous serez redirigé directement vers la passerelle officielle SATIM pour finaliser.'}
                </p>
              </div>

              {statusMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>{statusMessage}</span>
                </div>
              )}

              {paymentUrl ? (
                /* Active SATIM Link Container */
                <div className="space-y-4 p-5 rounded-2xl bg-slate-900 border border-purple-500/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" />
                      <span className="text-xs font-bold text-purple-300">
                        {language === 'ar' ? 'صفحة الدفع SATIM جاهزة ومفتوحة' : 'Session de paiement SATIM active'}
                      </span>
                    </div>
                    {invoiceId && (
                      <span className="text-[10px] font-mono text-slate-400">#{invoiceId}</span>
                    )}
                  </div>

                  <a
                    href={paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    id="btn-pricing-open-satim"
                    className="w-full py-3.5 bg-purple-500 hover:bg-purple-400 active:bg-purple-600 text-slate-950 font-bold rounded-2xl flex items-center justify-center gap-2 transition text-sm text-center shadow-lg shadow-purple-500/10 cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{language === 'ar' ? 'فتح صفحة SATIM الرسمية (الذهبية / CIB)' : 'Ouvrir la page de paiement SATIM (Edahabia / CIB)'}</span>
                  </a>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      id="btn-pricing-check-status"
                      onClick={checkStatusManually}
                      disabled={isProcessing}
                      className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                      <span>{language === 'ar' ? 'تحديث حالة الدفع' : 'Vérifier le statut du paiement'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentUrl(null);
                        setInvoiceId(null);
                      }}
                      className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
                    >
                      {language === 'ar' ? 'تغيير المعلومات' : 'Modifier les infos'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Billing Details Inputs */
                <form onSubmit={handleInitiatePayment} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-300 font-medium">
                        {language === 'ar' ? 'الاسم الأول' : 'Prénom'}
                      </label>
                      <div className="relative">
                        <User className={`w-4 h-4 text-slate-400 absolute top-3 ${isRTL ? 'right-3' : 'left-3'}`} />
                        <input
                          type="text"
                          required
                          value={firstname}
                          onChange={(e) => setFirstname(e.target.value)}
                          className={`w-full bg-slate-900 border border-slate-700 rounded-xl py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
                          placeholder="Mohamed"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-300 font-medium">
                        {language === 'ar' ? 'اللقب' : 'Nom'}
                      </label>
                      <input
                        type="text"
                        required
                        value={lastname}
                        onChange={(e) => setLastname(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                        placeholder="Benali"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-300 font-medium">
                        {language === 'ar' ? 'رقم الهاتف (05/06/07)' : 'Numéro de téléphone'}
                      </label>
                      <div className="relative">
                        <Phone className={`w-4 h-4 text-slate-400 absolute top-3 ${isRTL ? 'right-3' : 'left-3'}`} />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className={`w-full bg-slate-900 border border-slate-700 rounded-xl py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-num ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
                          placeholder="0550123456"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-300 font-medium">
                        {language === 'ar' ? 'الولاية / المدينة' : 'Wilaya / Ville'}
                      </label>
                      <div className="relative">
                        <MapPin className={`w-4 h-4 text-slate-400 absolute top-3 ${isRTL ? 'right-3' : 'left-3'}`} />
                        <input
                          type="text"
                          required
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className={`w-full bg-slate-900 border border-slate-700 rounded-xl py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
                          placeholder="Alger, Oran, Constantine..."
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="btn-submit-pricing-checkout"
                    disabled={isProcessing}
                    className="w-full mt-2 py-3.5 bg-purple-500 hover:bg-purple-400 active:bg-purple-600 text-slate-950 font-bold rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer text-sm shadow-md disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{language === 'ar' ? 'جاري الاتصال بـ SATIM...' : 'Connexion à SATIM en cours...'}</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>
                          {language === 'ar'
                            ? `دفع ${selectedPack.priceDZD.toLocaleString()} دج والتوجه إلى SATIM`
                            : `Payer ${selectedPack.priceDZD.toLocaleString()} DZD via SATIM`}
                        </span>
                        <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                      </>
                    )}
                  </button>
                </form>
              )}

            </div>

          </div>
        )}

      </div>

      {/* FAQ & Information Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-200">
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-purple-600" />
            <span>{language === 'ar' ? 'كيف يتم احتساب النقاط؟' : 'Comment sont décomptés les points ?'}</span>
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            {language === 'ar'
              ? 'كل توليد صوتي عالي الدقة (24 kHz) يستهلك 20 نقطة فقط، مهما كان طول النص أو نوع المؤثرات الصوتية المختارة.'
              : 'Chaque génération vocale haute fidélité (24 kHz) consomme 20 points, quelle que soit l\'émotion ou la voix.'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>{language === 'ar' ? 'هل الدفع آمن؟' : 'Le paiement est-il sécurisé ?'}</span>
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            {language === 'ar'
              ? 'نعم، جميع المعاملات تمر مباشرة عبر خوادم SATIM المشفرة لبريد الجزائر والبنوك الوطنية مع التحقق عبر رمز OTP.'
              : 'Absolument, toutes les transactions transitent par les serveurs bancaires sécurisés SATIM avec code de confirmation SMS.'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-purple-600" />
            <span>{language === 'ar' ? 'هل تنتهي صلاحية النقاط؟' : 'Mes points ont-ils une date limite ?'}</span>
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            {language === 'ar'
              ? 'لا، نقاط رصيدك دائمة ومحفوظة في حسابك دون أي انتهاء للصلاحية، ويمكنك استخدامها في أي وقت.'
              : 'Non, vos crédits n\'expirent jamais et restent disponibles dans votre compte sans aucune limite de durée.'}
          </p>
        </div>
      </div>

    </div>
  );
};
