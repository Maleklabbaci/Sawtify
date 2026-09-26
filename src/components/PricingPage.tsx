import React, { useState, useEffect } from 'react';
import {
  Zap, ShieldCheck, CreditCard, Check, ArrowRight, Sparkles,
  ExternalLink, RefreshCw, Lock, Phone, User, MapPin, HelpCircle, X
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
  const [firstname, setFirstname] = useState<string>('Client');
  const [lastname, setLastname] = useState<string>('Sawtify');
  const [phone, setPhone] = useState<string>('0550123456');
  const [address, setAddress] = useState<string>('Alger');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [invoiceId, setInvoiceId] = useState<string | number | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);

  const selectedPack = creditPacks.find(p => p.id === selectedPackId) || creditPacks[1];
  const paymentFee = Math.round(selectedPack.priceDZD * 0.03);
  const totalToPay = selectedPack.priceDZD + paymentFee;

  // Polling payment status
  useEffect(() => {
    let interval: any = null;
    if (invoiceId && !isSuccess) {
      interval = setInterval(async () => {
        try {
          const { getMyAccessToken } = await import('../services/supabaseClient');
          const token = await getMyAccessToken();
          const res = await fetch(`${API_BASE_URL}/api/slickpay/check-status/${invoiceId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (res.ok) {
            const data = await res.json();
            if (data.isPaid || data.status === 'completed' || data.status === 'paid') {
              clearInterval(interval);
              handlePaymentSuccess();
            }
          }
        } catch (e) {
          // Silent polling
        }
      }, 3500);
    }
    return () => clearInterval(interval);
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

  const openPaymentUrl = (url: string) => {
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      window.location.href = url;
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
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
        setStatusMessage(language === 'ar' ? 'يجب تسجيل الدخول' : 'Veuillez vous connecter');
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
          address
        })
      });

      const data = await res.json();

      if (data.success && data.paymentUrl) {
        setInvoiceId(data.invoiceId);
        setPaymentUrl(data.paymentUrl);
        setShowConfirmModal(true);
      } else {
        const message = data.error || data.message ||
          (language === 'ar' ? 'خطأ في إنشاء الفاتورة' : 'Erreur de création de facture');
        setStatusMessage(message);
      }
    } catch (err) {
      console.warn('[Pricing Checkout Error]:', err);
      setStatusMessage(language === 'ar' ? 'خطأ في الاتصال' : 'Erreur de connexion');
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
      const res = await fetch(`${API_BASE_URL}/api/slickpay/check-status/${invoiceId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const statusData = await res.json();
      if (statusData.isPaid || statusData.status === 'completed' || statusData.status === 'paid') {
        handlePaymentSuccess();
      } else {
        setStatusMessage(language === 'ar' ? 'لم يتم الدفع بعد' : 'Paiement non confirmé');
        setTimeout(() => setStatusMessage(''), 4000);
      }
    } catch (e) {
      console.warn('[Manual Status Check]:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16 space-y-12 pb-24">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
          {language === 'ar' ? 'اختر الباقة المناسبة لك' : 'Choisissez votre Forfait'}
        </h1>
        <p className="text-lg text-slate-600 leading-relaxed">
          {language === 'ar'
            ? 'باقات مرنة تمنحك أفضل قيمة مقابل السعر. ادفع بأمان عبر Edahabia أو CIB'
            : 'Des forfaits flexibles qui vous offrent le meilleur rapport qualité-prix. Paiement sécurisé via Edahabia ou CIB'}
        </p>
      </div>

      {/* Free Bonus Card */}
      {balance <= 50 && (
        <div className="max-w-2xl mx-auto p-6 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl shadow-xl shadow-slate-900/10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="text-center sm:text-start">
                <h3 className="text-lg font-bold text-white">
                  {language === 'ar' ? '50 نقطة مجانية' : '50 points offerts'}
                </h3>
                <p className="text-sm text-slate-300">
                  {language === 'ar' ? 'ابدأ الآن بدون أي التزام وجرب أصواتنا' : 'Commencez gratuitement sans engagement et testez nos voix'}
                </p>
              </div>
            </div>
            <button
              onClick={onNavigateToStudio}
              className="px-6 py-2.5 bg-purple-500 hover:bg-purple-400 text-white font-bold rounded-xl transition whitespace-nowrap"
            >
              {language === 'ar' ? 'جرب الآن' : 'Essayer'}
            </button>
          </div>
        </div>
      )}

      {/* PRICING CARDS - Clean Forfaits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 max-w-6xl mx-auto pt-6">
        {creditPacks.map((pack: CreditPack, index: number) => {
          // Highlight ONLY ONE pack (usually index 1, or 'pack_pro')
          const isPopular = pack.id === 'pack_pro' || index === 1;
          const audioCount = Math.floor(pack.points / 20);

          return (
            <div
              key={pack.id}
              className={`
                relative flex flex-col rounded-2xl p-6 transition-all duration-300
                ${isPopular
                  ? 'bg-slate-900 text-white shadow-2xl shadow-purple-900/30 ring-2 ring-purple-500 scale-100 xl:scale-105 z-10'
                  : 'bg-white text-slate-900 border border-slate-200 hover:border-slate-300 hover:shadow-lg'}
              `}
            >
              {/* Popular Badge - ONLY on the popular card */}
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg whitespace-nowrap">
                    <Sparkles className="w-3.5 h-3.5" />
                    {language === 'ar' ? 'الأكثر طلباً' : 'Populaire'}
                  </span>
                </div>
              )}

              {/* Pack Name */}
              <div className="mb-5 mt-1 text-center">
                <h3 className={`text-sm font-bold uppercase tracking-wider ${isPopular ? 'text-purple-300' : 'text-slate-500'}`}>
                  {pack.name}
                </h3>
              </div>

              {/* Price */}
              <div className="mb-2 flex justify-center items-baseline gap-1.5">
                <span className="text-4xl font-extrabold tracking-tight">
                  {pack.priceDZD.toLocaleString()}
                </span>
                <span className={`text-sm font-semibold ${isPopular ? 'text-slate-400' : 'text-slate-500'}`}>
                  DZD
                </span>
              </div>

              {/* Points subtitle */}
              <div className="text-center mb-6">
                <p className={`text-sm ${isPopular ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span className={`font-bold ${isPopular ? 'text-white' : 'text-slate-800'}`}>
                    {pack.points.toLocaleString()}
                  </span>
                  {' '}{language === 'ar' ? 'نقطة' : 'points'}
                </p>
                {pack.bonusPercent ? (
                  <span className={`inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    isPopular ? 'bg-purple-500/20 text-purple-200' : 'bg-green-50 text-green-700'
                  }`}>
                    + {pack.bonusPercent}% Bonus
                  </span>
                ) : <div className="h-5 mt-1" /> /* Spacer if no bonus */}
              </div>

              {/* Divider */}
              <div className={`h-px w-full mb-6 ${isPopular ? 'bg-slate-700' : 'bg-slate-100'}`} />

              {/* Features List */}
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3 text-sm">
                  <Check className={`w-4 h-4 mt-0.5 shrink-0 ${isPopular ? 'text-purple-400' : 'text-slate-400'}`} />
                  <span>
                    <strong className={`font-bold ${isPopular ? 'text-white' : 'text-slate-700'}`}>~{audioCount}</strong>
                    {language === 'ar' ? ' توليد صوتي' : ' générations'}
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Check className={`w-4 h-4 mt-0.5 shrink-0 ${isPopular ? 'text-purple-400' : 'text-slate-400'}`} />
                  <span className={isPopular ? 'text-slate-300' : 'text-slate-600'}>
                    {language === 'ar' ? 'كل الأصوات عالية الدقة' : 'Toutes les voix HQ'}
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Check className={`w-4 h-4 mt-0.5 shrink-0 ${isPopular ? 'text-purple-400' : 'text-slate-400'}`} />
                  <span className={isPopular ? 'text-slate-300' : 'text-slate-600'}>
                    {language === 'ar' ? 'استخدام تجاري مسموح' : 'Usage commercial autorisé'}
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <Check className={`w-4 h-4 mt-0.5 shrink-0 ${isPopular ? 'text-purple-400' : 'text-slate-400'}`} />
                  <span className={isPopular ? 'text-slate-300' : 'text-slate-600'}>
                    {language === 'ar' ? 'صلاحية مدى الحياة' : 'Points valables à vie'}
                  </span>
                </li>
              </ul>

              {/* CTA Button */}
              <button
                type="button"
                onClick={() => {
                  setSelectedPackId(pack.id);
                  setPaymentUrl(null);
                  setInvoiceId(null);
                  setIsSuccess(false);
                  setIsCheckoutOpen(true);
                }}
                className={`
                  w-full py-3.5 px-4 rounded-xl text-sm font-bold transition-all
                  flex items-center justify-center gap-2
                  ${isPopular
                    ? 'bg-purple-500 hover:bg-purple-400 text-white shadow-lg shadow-purple-500/25'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'}
                `}
              >
                <span>{language === 'ar' ? 'اختيار الباقة' : 'Choisir ce forfait'}</span>
                <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Checkout Popup */}
      {isCheckoutOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setIsCheckoutOpen(false)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-5xl w-full my-8 overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsCheckoutOpen(false)}
              className={`absolute top-4 z-20 w-9 h-9 rounded-lg flex items-center justify-center bg-white shadow-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition ${isRTL ? 'left-4' : 'right-4'}`}
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {language === 'ar' ? 'إتمام الدفع' : 'Finaliser le paiement'}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {selectedPack.name} • {totalToPay.toLocaleString()} DZD
                  </p>
                </div>
              </div>
            </div>

            {isSuccess ? (
              <div className="p-8 sm:p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {language === 'ar' ? 'تم الدفع بنجاح!' : 'Paiement réussi!'}
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                  +{selectedPack.points} points ajoutés à votre compte
                </p>
                <button
                  onClick={onNavigateToStudio}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition"
                >
                  {language === 'ar' ? 'الذهاب للاستوديو' : 'Aller au Studio'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-8 p-6 sm:p-8">
                {/* Left Column: Order Summary */}
                <div className="lg:col-span-5 order-2 lg:order-1 border-t lg:border-t-0 lg:border-r border-slate-100 pr-0 lg:pr-8 pt-6 lg:pt-0">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-6">
                    {language === 'ar' ? 'ملخص الطلب' : 'RÉSUMÉ DE LA COMMANDE'}
                  </h3>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">{language === 'ar' ? 'الباقة' : 'Forfait'}</span>
                      <span className="font-semibold text-slate-900">{selectedPack.name}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">{language === 'ar' ? 'النقاط' : 'Points'}</span>
                      <span className="font-bold text-slate-900">+{selectedPack.points}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm text-slate-500">
                      <span>{language === 'ar' ? 'التقدير' : 'Estimation'}</span>
                      <span>~{Math.floor(selectedPack.points / 20)} audios</span>
                    </div>

                    <div className="border-t border-dashed border-slate-200 my-4"></div>

                    <div className="flex justify-between items-center text-sm text-slate-500">
                      <span>{language === 'ar' ? 'رسوم المعاملة' : 'Frais transaction'}</span>
                      <span>{paymentFee.toLocaleString()} DZD</span>
                    </div>

                    <div className="flex justify-between items-center text-lg font-bold border-t border-slate-200 pt-4 mt-2">
                      <span className="text-slate-900">{language === 'ar' ? 'المجموع' : 'Total'}</span>
                      <span className="text-slate-900">
                        {totalToPay.toLocaleString()} <span className="text-sm text-slate-500">DZD</span>
                      </span>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <h3 className="text-sm font-bold text-slate-600 mb-4">
                      {language === 'ar' ? 'طريقة الدفع' : 'MOYEN DE PAIEMENT'}
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('edahabia')}
                        className={`
                          p-4 rounded-xl border-2 transition-all
                          ${paymentMethod === 'edahabia'
                            ? 'border-amber-400 bg-amber-50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                            paymentMethod === 'edahabia'
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            E
                          </div>
                          <div>
                            <div className="text-sm font-bold">Edahabia</div>
                            <div className="text-xs text-slate-500">{language === 'ar' ? 'بريد الجزائر' : 'Algérie Poste'}</div>
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cib')}
                        className={`
                          p-4 rounded-xl border-2 transition-all
                          ${paymentMethod === 'cib'
                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                            paymentMethod === 'cib'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            CIB
                          </div>
                          <div>
                            <div className="text-sm font-bold">CIB</div>
                            <div className="text-xs text-slate-500">{language === 'ar' ? 'بنوك جزائرية' : 'Banques DZ'}</div>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
                    <ShieldCheck className="w-4 h-4 text-green-600" />
                    <span>{language === 'ar' ? 'مدفوعات آمنة عبر SATIM' : 'Paiement sécurisé via SATIM'}</span>
                  </div>
                </div>

                {/* Right Column: Checkout Form */}
                <div className="lg:col-span-7 order-1 lg:order-2 pl-0 lg:pl-8">
                  <div className="space-y-6">
                    {statusMessage && (
                      <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                        {statusMessage}
                      </div>
                    )}

                    {paymentUrl ? (
                      <div className="space-y-4 p-6 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-sm font-bold text-slate-800">
                              {language === 'ar' ? 'جاهز للدفع' : 'Prêt à payer'}
                            </span>
                          </div>
                          {invoiceId && (
                            <span className="text-xs font-mono text-slate-500">#{invoiceId}</span>
                          )}
                        </div>

                        <a
                          href={paymentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                              e.preventDefault();
                              window.location.href = paymentUrl;
                            }
                          }}
                          className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition text-lg shadow-lg"
                        >
                          <ExternalLink className="w-5 h-5" />
                          <span>
                            {language === 'ar'
                              ? `دفع ${totalToPay.toLocaleString()} دج الآن`
                              : `Payer ${totalToPay.toLocaleString()} DZD maintenant`}
                          </span>
                        </a>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                          <button
                            onClick={checkStatusManually}
                            disabled={isProcessing}
                            className="py-2 px-4 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm hover:bg-slate-50 transition"
                          >
                            {isProcessing ? (
                              <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                            ) : (
                              language === 'ar' ? 'تأكيد الدفع' : 'J\'ai payé'
                            )}
                          </button>

                          <button
                            onClick={() => {
                              setPaymentUrl(null);
                              setInvoiceId(null);
                            }}
                            className="text-sm text-slate-500 hover:text-slate-700 underline"
                          >
                            {language === 'ar' ? 'تعديل' : 'Modifier'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleInitiatePayment} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">
                              {language === 'ar' ? 'الاسم الأول *' : 'Prénom *'}
                            </label>
                            <div className="relative">
                              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                required
                                value={firstname}
                                onChange={(e) => setFirstname(e.target.value)}
                                placeholder="Mohamed"
                                className="w-full pl-10 pr-3 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">
                              {language === 'ar' ? 'اللقب *' : 'Nom *'}
                            </label>
                            <input
                              type="text"
                              required
                              value={lastname}
                              onChange={(e) => setLastname(e.target.value)}
                              placeholder="Benali"
                              className="w-full px-3 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">
                              {language === 'ar' ? 'الهاتف *' : 'Téléphone *'}
                            </label>
                            <div className="relative">
                              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="tel"
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="0550123456"
                                className="w-full pl-10 pr-3 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">
                              {language === 'ar' ? 'الولاية *' : 'Wilaya *'}
                            </label>
                            <div className="relative">
                              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                required
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Alger"
                                className="w-full pl-10 pr-3 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
                              />
                            </div>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isProcessing}
                          className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition text-lg shadow-md"
                        >
                          {isProcessing ? (
                            <>
                              <RefreshCw className="w-5 h-5 animate-spin" />
                              <span>{language === 'ar' ? 'جاري المعالجة...' : 'Traitement...'}</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-5 h-5" />
                              <span>
                                {language === 'ar'
                                  ? `دفع ${totalToPay.toLocaleString()} دج الآن`
                                  : `Payer ${totalToPay.toLocaleString()} DZD maintenant`}
                              </span>
                              <ArrowRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                            </>
                          )}
                        </button>

                        <p className="text-xs text-center text-slate-500">
                          {language === 'ar'
                            ? 'سيتم توجيهك إلى صفحة الدفع الآمنة لـ SATIM'
                            : 'Vous serez redirigé vers la page de paiement sécurisée SATIM'}
                        </p>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FAQ Section */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 mt-12 border-t border-slate-200">
        <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-4 text-slate-700">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            {language === 'ar' ? 'كيف أستخدم النقاط؟' : 'Comment utiliser les points?'}
          </h3>
          <p className="text-slate-600 leading-relaxed text-sm">
            {language === 'ar'
              ? 'كل عملية توليد صوتي تستهلك 20 نقطة فقط. يمكنك توليد مئات المقاطع الصوتية باستخدام باقاتنا.'
              : 'Chaque génération vocale consomme 20 points. Vous pouvez générer des centaines d\'audios avec nos forfaits.'}
          </p>
        </div>

        <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-4 text-slate-700">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            {language === 'ar' ? 'هل الدفع آمن؟' : 'Paiement sécurisé?'}
          </h3>
          <p className="text-slate-600 leading-relaxed text-sm">
            {language === 'ar'
              ? 'نعم، نستخدم بوابة SATIM الرسمية. جميع معاملاتك مشفرة ومحمية بأحدث تقنيات الأمان.'
              : 'Oui, nous utilisons la passerelle officielle SATIM. Toutes vos transactions sont cryptées et protégées.'}
          </p>
        </div>

        <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-4 text-slate-700">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            {language === 'ar' ? 'هل تنتهي صلاحية النقاط؟' : 'Les points expirent-ils?'}
          </h3>
          <p className="text-slate-600 leading-relaxed text-sm">
            {language === 'ar'
              ? 'إطلاقاً! نقاطك تبقى في حسابك مدى الحياة ويمكنك استخدامها في أي وقت تشاء بدون قيود.'
              : 'Absolument pas! Vos points restent dans votre compte à vie et vous pouvez les utiliser quand vous le souhaitez.'}
          </p>
        </div>
      </div>

      {/* Confirmation Popup */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {language === 'ar' ? 'تأكيد الطلب' : 'Confirmer votre commande'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {language === 'ar' ? 'تحقق من التفاصيل قبل الدفع' : 'Vérifiez les détails avant de payer'}
                </p>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">{language === 'ar' ? 'الباقة' : 'Forfait'}</span>
                <span className="font-semibold text-slate-900">{selectedPack.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">{language === 'ar' ? 'النقاط' : 'Points'}</span>
                <span className="font-bold text-slate-900">+{selectedPack.points}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">{language === 'ar' ? 'الاسم' : 'Nom'}</span>
                <span className="font-semibold text-slate-900">{firstname} {lastname}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">{language === 'ar' ? 'الهاتف' : 'Téléphone'}</span>
                <span className="font-semibold text-slate-900">{phone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">{language === 'ar' ? 'الولاية' : 'Wilaya'}</span>
                <span className="font-semibold text-slate-900">{address}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">{language === 'ar' ? 'طريقة الدفع' : 'Paiement'}</span>
                <span className="font-semibold text-slate-900 uppercase">{paymentMethod}</span>
              </div>

              <div className="border-t border-dashed border-slate-200 my-2"></div>

              <div className="flex justify-between items-center text-sm text-slate-500">
                <span>{language === 'ar' ? 'رسوم المعاملة' : 'Frais transaction'}</span>
                <span>{paymentFee.toLocaleString()} DZD</span>
              </div>
              <div className="flex justify-between items-center text-lg font-bold pt-2">
                <span className="text-slate-900">{language === 'ar' ? 'المجموع' : 'Total'}</span>
                <span className="text-slate-900">{totalToPay.toLocaleString()} DZD</span>
              </div>
            </div>

            <div className="p-6 pt-0 space-y-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  if (paymentUrl) openPaymentUrl(paymentUrl);
                }}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition"
              >
                <Lock className="w-4 h-4" />
                {language === 'ar'
                  ? `دفع ${totalToPay.toLocaleString()} دج الآن`
                  : `Payer ${totalToPay.toLocaleString()} DZD maintenant`}
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 transition"
              >
                {language === 'ar' ? 'إلغاء' : 'Annuler'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
