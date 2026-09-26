import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
    <>
      {/* 3D TILT CARD CSS (Injected globally for this component) */}
      <style>{`
        .u-container {
          position: relative;
          width: 100%;
          height: 440px;
          transition: 200ms ease;
          border-radius: 1.5rem;
          cursor: pointer;
        }
        
        .u-container:active {
          transform: scale(0.96);
        }

        .u-canvas {
          perspective: 800px;
          inset: 0;
          z-index: 10;
          position: absolute;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          grid-template-rows: repeat(5, 1fr);
          grid-template-areas: 
            "tr-1 tr-2 tr-3 tr-4 tr-5"
            "tr-6 tr-7 tr-8 tr-9 tr-10"
            "tr-11 tr-12 tr-13 tr-14 tr-15"
            "tr-16 tr-17 tr-18 tr-19 tr-20"
            "tr-21 tr-22 tr-23 tr-24 tr-25";
        }

        .u-tracker {
          z-index: 20;
          width: 100%;
          height: 100%;
        }

        .u-card {
          position: absolute;
          inset: 0;
          z-index: 5;
          border-radius: 1.5rem;
          transition: 500ms ease-out;
          display: flex;
          flex-direction: column;
          padding: 1.5rem;
        }

        /* Popular Theme (Uiverse Gradient) */
        .theme-popular .u-card {
          background: linear-gradient(43deg, rgb(65, 88, 208) 0%, rgb(200, 80, 192) 46%, rgb(255, 204, 112) 100%);
          color: white;
          box-shadow: 0 20px 40px -10px rgba(200, 80, 192, 0.4);
        }
        
        .theme-popular .u-card::before {
          content: '';
          background: linear-gradient(43deg, rgb(65, 88, 208) 0%, rgb(200, 80, 192) 46%, rgb(255, 204, 112) 100%);
          filter: blur(2rem);
          opacity: 0.4;
          width: 100%;
          height: 100%;
          position: absolute;
          inset: 0;
          z-index: -1;
          transition: 300ms;
        }
        
        .theme-popular:hover .u-card::before {
          opacity: 0.7;
        }

        /* Standard Theme */
        .theme-standard .u-card {
          background: white;
          border: 1px solid #e2e8f0;
          color: #0f172a;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        /* Apply 3D Hover Only on Devices that support Hover (Fixes Mobile Jank) */
        @media (hover: hover) and (pointer: fine) {
          .u-tracker:hover ~ .u-card { filter: brightness(1.05); }
          .tr-1:hover ~ .u-card { transform: rotateX(15deg) rotateY(-10deg); }
          .tr-2:hover ~ .u-card { transform: rotateX(15deg) rotateY(-5deg); }
          .tr-3:hover ~ .u-card { transform: rotateX(15deg) rotateY(0deg); }
          .tr-4:hover ~ .u-card { transform: rotateX(15deg) rotateY(5deg); }
          .tr-5:hover ~ .u-card { transform: rotateX(15deg) rotateY(10deg); }
          .tr-6:hover ~ .u-card { transform: rotateX(8deg) rotateY(-10deg); }
          .tr-7:hover ~ .u-card { transform: rotateX(8deg) rotateY(-5deg); }
          .tr-8:hover ~ .u-card { transform: rotateX(8deg) rotateY(0deg); }
          .tr-9:hover ~ .u-card { transform: rotateX(8deg) rotateY(5deg); }
          .tr-10:hover ~ .u-card { transform: rotateX(8deg) rotateY(10deg); }
          .tr-11:hover ~ .u-card { transform: rotateX(0deg) rotateY(-10deg); }
          .tr-12:hover ~ .u-card { transform: rotateX(0deg) rotateY(-5deg); }
          .tr-13:hover ~ .u-card { transform: rotateX(0deg) rotateY(0deg); }
          .tr-14:hover ~ .u-card { transform: rotateX(0deg) rotateY(5deg); }
          .tr-15:hover ~ .u-card { transform: rotateX(0deg) rotateY(10deg); }
          .tr-16:hover ~ .u-card { transform: rotateX(-8deg) rotateY(-10deg); }
          .tr-17:hover ~ .u-card { transform: rotateX(-8deg) rotateY(-5deg); }
          .tr-18:hover ~ .u-card { transform: rotateX(-8deg) rotateY(0deg); }
          .tr-19:hover ~ .u-card { transform: rotateX(-8deg) rotateY(5deg); }
          .tr-20:hover ~ .u-card { transform: rotateX(-8deg) rotateY(10deg); }
          .tr-21:hover ~ .u-card { transform: rotateX(-15deg) rotateY(-10deg); }
          .tr-22:hover ~ .u-card { transform: rotateX(-15deg) rotateY(-5deg); }
          .tr-23:hover ~ .u-card { transform: rotateX(-15deg) rotateY(0deg); }
          .tr-24:hover ~ .u-card { transform: rotateX(-15deg) rotateY(5deg); }
          .tr-25:hover ~ .u-card { transform: rotateX(-15deg) rotateY(10deg); }
        }
      `}</style>

      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 pb-16">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {language === 'ar' ? 'شحن رصيد النقاط' : 'Recharge de Points'}
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            {language === 'ar'
              ? 'اختر باقتك المفضلة وادفع بأمان عبر Edahabia أو CIB'
              : 'Choisissez votre pack et payez en toute sécurité via Edahabia ou CIB'}
          </p>
        </div>

        {/* Free Bonus Card */}
        {balance <= 50 && (
          <div className="max-w-2xl mx-auto p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {language === 'ar' ? '50 نقطة مجانية' : '50 points offerts'}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {language === 'ar' ? 'ابدأ الآن بدون أي التزام' : 'Commencez gratuitement sans engagement'}
                  </p>
                </div>
              </div>
              <button
                onClick={onNavigateToStudio}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition"
              >
                {language === 'ar' ? 'استخدام' : 'Utiliser'}
              </button>
            </div>
          </div>
        )}

        {/* 3D PRICING CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
          {creditPacks.map((pack: CreditPack, index: number) => {
            const isPopular = pack.id === 'pack_pro' || index === 1;
            const audioCount = Math.floor(pack.points / 20);

            return (
              <div 
                key={pack.id} 
                className={`u-container ${isPopular ? 'theme-popular' : 'theme-standard'}`}
                onClick={() => {
                  setSelectedPackId(pack.id);
                  setPaymentUrl(null);
                  setInvoiceId(null);
                  setIsSuccess(false);
                  setIsCheckoutOpen(true);
                }}
              >
                <div className="u-canvas">
                  {/* 25 Trackers for 3D effect */}
                  {[...Array(25)].map((_, i) => (
                    <div key={i} className={`u-tracker tr-${i + 1}`} style={{ gridArea: `tr-${i + 1}` }} />
                  ))}
                  
                  {/* The actual Card Content */}
                  <div className="u-card">
                    
                    {/* Popular Badge */}
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-white text-purple-700 shadow-md whitespace-nowrap">
                          <Sparkles className="w-3 h-3" />
                          {language === 'ar' ? 'الأكثر طلباً' : 'Populaire'}
                        </span>
                      </div>
                    )}

                    {/* Pack Name */}
                    <div className="mb-4 mt-2">
                      <h3 className={`text-sm font-bold uppercase tracking-wider ${isPopular ? 'text-white/80' : 'text-slate-500'}`}>
                        {pack.name}
                      </h3>
                    </div>

                    {/* Price */}
                    <div className="mb-2 flex items-baseline gap-1.5">
                      <span className="text-4xl font-extrabold tracking-tight">
                        {pack.priceDZD.toLocaleString()}
                      </span>
                      <span className={`text-sm font-bold ${isPopular ? 'text-white/70' : 'text-slate-500'}`}>
                        DZD
                      </span>
                    </div>

                    {/* Points subtitle */}
                    <div className="mb-6 flex flex-wrap items-center gap-2">
                      <p className={`text-sm font-bold ${isPopular ? 'text-white' : 'text-slate-800'}`}>
                        {pack.points.toLocaleString()} {language === 'ar' ? 'نقطة' : 'points'}
                      </p>
                      {pack.bonusPercent && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isPopular ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'
                        }`}>
                          +{pack.bonusPercent}%
                        </span>
                      )}
                    </div>

                    <div className={`h-px w-full mb-6 ${isPopular ? 'bg-white/20' : 'bg-slate-100'}`} />

                    {/* Features List */}
                    <ul className="space-y-3 mb-8 flex-1">
                      <li className="flex items-center gap-2.5 text-sm">
                        <Check className={`w-4 h-4 shrink-0 ${isPopular ? 'text-white' : 'text-purple-600'}`} />
                        <span className={isPopular ? 'text-white/90' : 'text-slate-700'}>
                          <strong>~{audioCount}</strong> {language === 'ar' ? ' مقطع صوتي' : ' audios'}
                        </span>
                      </li>
                      <li className="flex items-center gap-2.5 text-sm">
                        <Check className={`w-4 h-4 shrink-0 ${isPopular ? 'text-white' : 'text-purple-600'}`} />
                        <span className={isPopular ? 'text-white/90' : 'text-slate-600'}>
                          {language === 'ar' ? 'كل الأصوات (HQ)' : 'Toutes les voix HQ'}
                        </span>
                      </li>
                      <li className="flex items-center gap-2.5 text-sm">
                        <Check className={`w-4 h-4 shrink-0 ${isPopular ? 'text-white' : 'text-purple-600'}`} />
                        <span className={isPopular ? 'text-white/90' : 'text-slate-600'}>
                          {language === 'ar' ? 'استخدام تجاري' : 'Usage commercial'}
                        </span>
                      </li>
                    </ul>

                    {/* CTA Button */}
                    <div
                      className={`
                        w-full py-3 px-4 rounded-xl text-sm font-bold transition-all
                        flex items-center justify-center gap-2 relative z-30
                        ${isPopular
                          ? 'bg-white text-purple-700 shadow-lg hover:bg-slate-50'
                          : 'bg-slate-900 text-white hover:bg-slate-800'}
                      `}
                    >
                      <span>{language === 'ar' ? 'اختيار' : 'Choisir'}</span>
                      <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Checkout Popup — s'ouvre directement au clic sur un pack. Rendu via portail
            directement dans <body> pour échapper à tout conteneur parent (max-w, overflow, transform)
            qui pourrait casser le "position: fixed" et écraser la taille du popup. */}
        {isCheckoutOpen && createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(15, 15, 20, 0.6)',
              backdropFilter: 'blur(4px)',
              padding: '16px',
              overflowY: 'auto',
            }}
            onClick={() => setIsCheckoutOpen(false)}
          >
            <div
              className="bg-white rounded-3xl shadow-2xl overflow-hidden relative"
              style={{ maxWidth: '960px', width: '100%', margin: 'auto' }}
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
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center">
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
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
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
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition"
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
                    <span className="text-sm text-slate-600">{language === 'ar' ? 'الباقة' : 'Pack'}</span>
                    <span className="font-semibold text-slate-900">{selectedPack.name}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">{language === 'ar' ? 'النقاط' : 'Points'}</span>
                    <span className="font-bold text-purple-600">+{selectedPack.points}</span>
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
                    <span className="text-purple-600">
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
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
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
                    <div className="space-y-4 p-6 rounded-2xl bg-purple-50 border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                          <span className="text-sm font-bold text-purple-800">
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
                        className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition text-lg"
                      >
                        <ExternalLink className="w-5 h-5" />
                        <span>
                          {language === 'ar'
                            ? `دفع ${totalToPay.toLocaleString()} دج الآن`
                            : `Payer ${totalToPay.toLocaleString()} DZD maintenant`}
                        </span>
                      </a>

                      <div className="flex items-center justify-between pt-4 border-t border-purple-200">
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
                              className="w-full pl-10 pr-3 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
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
                            className="w-full px-3 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
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
                              className="w-full pl-10 pr-3 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
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
                              className="w-full pl-10 pr-3 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition text-lg"
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
                            <ArrowRight className="w-5 h-5" />
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
          </div>
        , document.body)}

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto divide-y divide-slate-100 border-t border-b border-slate-100">
          <div className="flex items-start gap-3 py-4">
            <Zap className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {language === 'ar' ? 'كيف أستخدم النقاط؟' : 'Comment utiliser les points?'}
              </h3>
              <p className="text-sm text-slate-500">
                {language === 'ar'
                  ? 'كل تسجيل صوتي يستهلك 20 نقطة فقط'
                  : 'Chaque génération vocale consomme 20 points'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 py-4">
            <ShieldCheck className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {language === 'ar' ? 'هل الدفع آمن؟' : 'Paiement sécurisé?'}
              </h3>
              <p className="text-sm text-slate-500">
                {language === 'ar'
                  ? 'مدفوعات مشفرة عبر SATIM مع حماية SSL 256-bit'
                  : 'Paiements cryptés via SATIM avec protection SSL 256-bit'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 py-4">
            <HelpCircle className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {language === 'ar' ? 'هل تنتهي صلاحية النقاط؟' : 'Les points expirent-ils?'}
              </h3>
              <p className="text-sm text-slate-500">
                {language === 'ar'
                  ? 'لا، نقاطك تبقى متاحة مدى الحياة'
                  : 'Non, vos points restent disponibles à vie'}
              </p>
            </div>
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
                  <span className="text-sm text-slate-600">{language === 'ar' ? 'الباقة' : 'Pack'}</span>
                  <span className="font-semibold text-slate-900">{selectedPack.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">{language === 'ar' ? 'النقاط' : 'Points'}</span>
                  <span className="font-bold text-purple-600">+{selectedPack.points}</span>
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
                  <span className="text-purple-600">{totalToPay.toLocaleString()} DZD</span>
                </div>
              </div>

              <div className="p-6 pt-0 space-y-3">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    if (paymentUrl) openPaymentUrl(paymentUrl);
                  }}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition"
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
    </>
  );
};
