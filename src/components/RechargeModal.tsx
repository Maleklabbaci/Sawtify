import React, { useState, useEffect, useRef } from 'react';
import { X, Check, CreditCard, ShieldCheck, ArrowRight, Lock, ExternalLink, QrCode, RefreshCw, AlertCircle } from 'lucide-react';
import { CreditPack, PurchaseRecord } from '../types';
import { API_BASE_URL } from '../config/apiBase';
import { getCreditPacks } from '../data/voices';
import { useLanguage } from '../context/LanguageContext';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (pack: CreditPack, method: 'edahabia' | 'cib', record: PurchaseRecord) => void;
  initialPackId?: string;
}

export const RechargeModal: React.FC<RechargeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialPackId,
}) => {
  const { t, isRTL, language } = useLanguage();
  const [selectedPackId, setSelectedPackId] = useState<string>('pack_pro');
  const [paymentMethod, setPaymentMethod] = useState<'edahabia' | 'cib'>('edahabia');
  const [phone, setPhone] = useState<string>('0550 12 34 56');
  const [fullName, setFullName] = useState<string>('Client Sawtify');
  const [email, setEmail] = useState<string>('client@sawtify.dz');
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [step, setStep] = useState<'select' | 'checkout' | 'slickpay_frame' | 'success'>('select');
  
  // Sync pack and step when modal opens with initialPackId
  useEffect(() => {
    if (isOpen) {
      if (initialPackId) {
        setSelectedPackId(initialPackId);
        setStep('checkout');
      } else {
        setStep('select');
      }
    }
  }, [isOpen, initialPackId]);
  
  // SlickPay Live Transaction State
  const [invoiceId, setInvoiceId] = useState<string | number | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [pollingActive, setPollingActive] = useState<boolean>(false);
  
  const pollIntervalRef = useRef<number | null>(null);

  const creditPacks = getCreditPacks(language);
  const selectedPack = creditPacks.find(p => p.id === selectedPackId) || creditPacks[1];

  // Cleanup polling when unmounting or closing
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Listen for SlickPay iframe postMessage redirects
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && (event.data.redirect || event.data.status === 'completed' || event.data.success)) {
        console.log('[SlickPay Frame Event]:', event.data);
        handlePaymentSuccess();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [selectedPack, paymentMethod, invoiceId]);

  if (!isOpen) return null;

  // 1. Create Invoice via backend SlickPay API
  const handleInitiateSlickPay = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setStatusMessage(language === 'ar' ? 'جاري الاتصال ببوابة SlickPay الجزائر...' : 'Connexion à la passerelle SlickPay Algérie...');

    try {
      const { getMyAccessToken } = await import('../services/supabaseClient');
      const accessToken = await getMyAccessToken();
      if (!accessToken) {
        setIsProcessing(false);
        setStatusMessage(language === 'ar' ? 'يجب تسجيل الدخول لإعادة شحن النقاط' : 'Connecte-toi pour recharger tes points.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/slickpay/create-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          packId: selectedPack.id,
          firstname: fullName.split(' ')[0] || 'Client',
          lastname: fullName.split(' ').slice(1).join(' ') || 'Sawtify',
          phone: phone.replace(/\s+/g, ''),
          email: email.trim(),
          paymentMethod
        })
      });

      const data = await response.json();
      setIsProcessing(false);

      if (data.success) {
        setInvoiceId(data.invoiceId);
        setPaymentUrl(data.paymentUrl);
        setStep('slickpay_frame');
        startStatusPolling(data.invoiceId);
        if (data.paymentUrl && data.paymentUrl.startsWith('http')) {
          try {
            window.open(data.paymentUrl, '_blank');
          } catch (e) {}
        }
      } else {
        setStatusMessage(data.message || 'Erreur lors de la création de la facture');
      }
    } catch (err) {
      console.warn('[SlickPay Init Warning]:', err);
      setIsProcessing(false);
      setStatusMessage('Erreur de communication avec le serveur');
    }
  };

  // 2. Poll SlickPay Invoice status periodically
  const startStatusPolling = (invId: string | number) => {
    setPollingActive(true);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = window.setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/slickpay/check-status/${invId}`);
        const statusData = await res.json();
        
        if (statusData.isPaid || statusData.status === 'completed' || statusData.status === 'paid') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setPollingActive(false);
          handlePaymentSuccess();
        }
      } catch (e) {
        // silent polling error
      }
    }, 3000);
  };

  // 3. Confirm and Credit points
  const handlePaymentSuccess = async () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setPollingActive(false);

    const activeInvoiceId = invoiceId || `INV_DZ_${Date.now()}`;
    
    // Demande au serveur de créditer réellement les points (idempotent : si check-status
    // ou le webhook l'ont déjà fait, celle-ci ne fait rien de plus).
    try {
      const { getMyAccessToken } = await import('../services/supabaseClient');
      const accessToken = await getMyAccessToken();
      await fetch(`${API_BASE_URL}/api/slickpay/confirm-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ invoiceId: activeInvoiceId })
      });
    } catch (e) {
      console.warn('[Supabase Sync Warning]:', e);
    }

    const record: PurchaseRecord = {
      id: 'rec_' + Math.random().toString(36).substring(2, 9),
      packId: selectedPack.id,
      packName: selectedPack.name,
      pointsCredited: selectedPack.points,
      amountDZD: selectedPack.priceDZD,
      paymentMethod: paymentMethod,
      transactionId: String(activeInvoiceId),
      status: 'paid',
      createdAt: new Date().toISOString()
    };

    setStep('success');

    setTimeout(() => {
      onSuccess(selectedPack, paymentMethod, record);
      onClose();
      setStep('select');
      setInvoiceId(null);
      setPaymentUrl(null);
    }, 1200);
  };

  const checkPaymentStatusManual = async () => {
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
      console.warn('[Status Check Warning]:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-200 relative overflow-hidden text-slate-900 max-h-[92vh] flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer z-10`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-4 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200/60">
              SlickPay • SATIM / CIB / EDAHABIA
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            {step === 'select' && t.choosePackStep}
            {step === 'checkout' && (language === 'ar' ? 'معلومات الدفع والتأكيد' : 'Paiement sécurisé SlickPay')}
            {step === 'slickpay_frame' && (language === 'ar' ? 'بوابة الدفع الإلكتروني SATIM' : 'Portail de Paiement Sécurisé')}
            {step === 'success' && (language === 'ar' ? 'تم الشحن بنجاح' : 'Recharge effectuée')}
          </h2>
          <p className="text-xs text-slate-500">
            {step === 'slickpay_frame' 
              ? (language === 'ar' ? 'يرجى إتمام عملية الدفع عبر البوابة الرسمية' : 'Procédez au règlement officiel via carte Edahabia ou CIB.') 
              : t.rechargeModalSubtitle}
          </p>
        </div>

        {/* STEP 1: Select Pack */}
        {step === 'select' && (
          <div className="space-y-4 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {creditPacks.map((pack) => {
                const isSelected = pack.id === selectedPackId;
                return (
                  <div
                    key={pack.id}
                    id={`pack-card-${pack.id}`}
                    onClick={() => setSelectedPackId(pack.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all duration-150 relative ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50/40 shadow-xs ring-1 ring-purple-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/60 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-xs text-slate-700">{pack.name}</span>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div className="my-2">
                      <div className="text-xl font-bold text-slate-900 font-mono">
                        {pack.priceDZD.toLocaleString()} <span className="text-xs font-sans font-normal text-slate-500">{language === 'ar' ? 'دج' : 'DA'}</span>
                      </div>
                      <div className="text-xs text-purple-700 font-mono mt-0.5 font-semibold">
                        {pack.points} {t.pointsLabel}
                        {pack.bonusPercent && (
                          <span className="mx-1 text-[10px] text-purple-600">
                            (+{pack.bonusPercent}%)
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-1.5">
                      {pack.tagline}
                    </p>

                    <div className="text-[10px] text-slate-400 font-mono">
                      {t.approxGenerations.replace('{count}', Math.floor(pack.points / 20).toString())}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              id="btn-confirm-pack-selection"
              onClick={() => setStep('checkout')}
              className="w-full mt-2 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition shadow-sm cursor-pointer text-xs sm:text-sm"
            >
              <span>{language === 'ar' ? `متابعة (${selectedPack.priceDZD} دج)` : `Continuer vers le paiement (${selectedPack.priceDZD} DA)`}</span>
              <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            </button>
          </div>
        )}

        {/* STEP 2: Checkout Form */}
        {step === 'checkout' && (
          <form onSubmit={handleInitiateSlickPay} className="space-y-4 overflow-y-auto pr-1">
            
            {/* Payment card choice */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                id="btn-select-edahabia"
                onClick={() => setPaymentMethod('edahabia')}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                  paymentMethod === 'edahabia'
                    ? 'border-purple-500 bg-purple-50/50 shadow-2xs ring-1 ring-purple-500/20'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-900">{language === 'ar' ? 'البطاقة الذهبية' : 'Carte Edahabia'}</span>
                  {paymentMethod === 'edahabia' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                </div>
                <span className="text-[10px] text-slate-500">{language === 'ar' ? 'بريد الجزائر • SATIM' : 'Algérie Poste • SATIM'}</span>
              </button>

              <button
                type="button"
                id="btn-select-cib"
                onClick={() => setPaymentMethod('cib')}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                  paymentMethod === 'cib'
                    ? 'border-purple-500 bg-purple-50/50 shadow-2xs ring-1 ring-purple-500/20'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-900">{language === 'ar' ? 'بطاقة بنكية CIB' : 'Carte CIB'}</span>
                  {paymentMethod === 'cib' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                </div>
                <span className="text-[10px] text-slate-500">{language === 'ar' ? 'جميع البنوك الجزائرية' : 'Toutes banques algériennes'}</span>
              </button>
            </div>

            {/* Customer Details */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {language === 'ar' ? 'الاسم الكامل' : 'Nom & Prénom'}
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-2.5 text-xs font-sans bg-white border border-slate-200 rounded-xl focus:border-purple-500 outline-none text-slate-900"
                  placeholder="Nom Prénom"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    {language === 'ar' ? 'رقم الهاتف' : 'Numéro de téléphone'}
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:border-purple-500 outline-none text-slate-900"
                    placeholder="05 / 06 / 07..."
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 text-xs font-sans bg-white border border-slate-200 rounded-xl focus:border-purple-500 outline-none text-slate-900"
                    placeholder="client@mail.dz"
                  />
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="flex items-center justify-between text-xs px-2 py-2 bg-purple-50/70 border border-purple-200/60 rounded-xl text-purple-900 font-mono">
              <span>{selectedPack.name} (+{selectedPack.points} pts)</span>
              <span className="font-bold text-sm">
                {selectedPack.priceDZD} {language === 'ar' ? 'دج' : 'DA'}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setStep('select')}
                className="px-4 py-3 border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-xs font-medium rounded-2xl cursor-pointer"
              >
                {t.cancelBtn}
              </button>

              <button
                type="submit"
                id="btn-submit-slickpay"
                disabled={isProcessing}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition shadow-xs cursor-pointer text-xs"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{statusMessage || t.processingBtn}</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? `دفع ${selectedPack.priceDZD} دج عبر SlickPay` : `Payer ${selectedPack.priceDZD} DA via SlickPay`}</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 pt-1 font-mono">
              <ShieldCheck className="w-3 h-3 text-purple-600" />
              <span>{language === 'ar' ? 'معاملة بنكية مشفرة 256-bit عبر شبكة SATIM الرسمية' : 'Paiement sécurisé et certifié par SATIM Algérie'}</span>
            </div>

          </form>
        )}

        {/* STEP 3: SlickPay Payment Gateway & Live Verification */}
        {step === 'slickpay_frame' && (
          <div className="space-y-4 py-2 flex-1 flex flex-col justify-between">
            
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto shadow-xs">
                <CreditCard className="w-6 h-6" />
              </div>
              
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">
                  {language === 'ar' ? 'فاتورة SlickPay جاهزة للدفع' : 'Facture SlickPay initialisée'}
                </h4>
                <p className="text-xs text-slate-600 font-mono">
                  {selectedPack.name} • <span className="font-bold text-slate-900">{selectedPack.priceDZD} DA</span> (+{selectedPack.points} points)
                </p>
                {invoiceId && (
                  <p className="text-[10px] text-slate-400 font-mono mt-1">
                    N° Facture : {invoiceId}
                  </p>
                )}
              </div>

              {/* Status Polling Indicator */}
              <div className="flex items-center justify-center gap-2 text-xs text-purple-800 bg-purple-50/80 border border-purple-200/80 py-2 px-3 rounded-xl">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-600" />
                <span>{language === 'ar' ? 'في انتظار إتمام الدفع عبر SATIM...' : 'En attente de validation SATIM en temps réel...'}</span>
              </div>
            </div>

            {/* Direct Gateway Buttons */}
            <div className="space-y-2">
              {paymentUrl && (
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="btn-open-satim-gateway"
                  className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition shadow-sm text-xs sm:text-sm text-center"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{language === 'ar' ? 'فتح صفحة الدفع SATIM الرسمية (الذهبية / CIB)' : 'Ouvrir la page de paiement SATIM (Edahabia / CIB)'}</span>
                </a>
              )}

              <button
                type="button"
                id="btn-check-payment-status"
                onClick={checkPaymentStatusManual}
                disabled={isProcessing}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition text-xs cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>{language === 'ar' ? 'التحقق من حالة الدفع' : 'Vérifier le statut du paiement'}</span>
              </button>

              <button
                type="button"
                onClick={() => setStep('select')}
                className="w-full py-2 text-slate-500 hover:text-slate-800 text-xs font-medium cursor-pointer text-center"
              >
                {language === 'ar' ? 'رجوع لتغيير الباقة' : 'Retour / Changer de pack'}
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-mono">
              <ShieldCheck className="w-3 h-3 text-purple-600" />
              <span>{language === 'ar' ? 'سيرفر مشفر ومربوط بـ Supabase و SlickPay' : 'Synchronisé avec Supabase & SlickPay API'}</span>
            </div>

          </div>
        )}

        {/* STEP 4: Success Confirmation */}
        {step === 'success' && (
          <div className="text-center py-8 space-y-3">
            <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-2 shadow-xs ring-4 ring-purple-50">
              <Check className="w-7 h-7 stroke-[3]" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {language === 'ar' ? 'تم شحن رصيد النقاط بنجاح' : 'Solde crédité avec succès !'}
            </h3>
            <p className="text-xs text-purple-700 font-mono font-semibold">
              +{selectedPack.points} {t.pointsLabel}
            </p>
            <p className="text-[11px] text-slate-500">
              {language === 'ar' ? 'يمكنك الآن مواصلة توليد الصوتيات دون انقطاع.' : 'Votre nouveau solde est disponible pour générer vos voix.'}
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
