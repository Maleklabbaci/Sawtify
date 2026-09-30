import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Zap, ShieldCheck, CreditCard, Check, ArrowRight, Sparkles,
  ExternalLink, RefreshCw, Lock, Phone, User, MapPin, HelpCircle, X, Clock, Gift,
  Landmark, Smartphone
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getCreditPacks } from '../data/voices';
import { API_BASE_URL } from '../config/apiBase';
import { CreditPack, PurchaseRecord } from '../types';
import { POINTS_PER_VOICEOVER, pricePerVoiceover, type PackOffer } from '../config/growth';
import { getGrowthCopy } from '../data/growthCopy';
import { useTicker, type GrowthApi } from '../hooks/useGrowth';
import { ReferralCard } from './growth/ReferralCard';
import { formatRemaining, remainingMs } from './growth/time';

/** Moyens de paiement locaux affichés à côté des boutons de paiement (confiance). */
const LocalPayBadges: React.FC = () => {
  const { language } = useLanguage();
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-extrabold text-amber-700">
        <CreditCard className="h-3.5 w-3.5" /> Edahabia
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-extrabold text-blue-700">
        <Landmark className="h-3.5 w-3.5" /> CIB
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-extrabold text-emerald-700">
        <Smartphone className="h-3.5 w-3.5" /> BaridiMob
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-[11px] font-bold text-slate-500">
        <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
        {language === 'ar' ? 'مدفوعات آمنة عبر SATIM' : 'Paiement sécurisé via SATIM'}
      </span>
    </div>
  );
};

interface PricingPageProps {
  balance: number;
  onRechargeSuccess: (pack: CreditPack, method: 'edahabia' | 'cib', record: PurchaseRecord) => void;
  onNavigateToStudio?: () => void;
  preselectedPackId?: string;
  /** Offres 1ère recharge / cashback / parrainage (décidées par le serveur). */
  growth?: GrowthApi;
  /** Ouvre directement le paiement de ce pack (ex. clic sur le pop-up de fin de solde). */
  openPackId?: string | null;
  onOpenPackHandled?: () => void;
}

const CARD_3D_STYLES = `
.u-container {
  position: relative;
  width: 100%;
  height: 500px;
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

/* Popular Theme */
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

/* Apply 3D Hover Only on Devices that support Hover */
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
`;

export const PricingPage: React.FC<PricingPageProps> = ({
  balance,
  onRechargeSuccess,
  onNavigateToStudio,
  preselectedPackId = 'pack_pro',
  growth,
  openPackId,
  onOpenPackHandled
}) => {
  const { language, isRTL } = useLanguage();
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
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [paymentPopupOpened, setPaymentPopupOpened] = useState<boolean>(false);
  const paymentRequestInFlightRef = useRef(false);
  const handledSuccessInvoiceRef = useRef<string | number | null>(null);
  // Points annoncés par le SERVEUR à la création de la facture (bonus inclus) et points réellement crédités.
  const [promisedPoints, setPromisedPoints] = useState<number | null>(null);
  const [creditedPoints, setCreditedPoints] = useState<number | null>(null);

  const selectedPack = creditPacks.find(p => p.id === selectedPackId) || creditPacks[1];
  const paymentFee = Math.round(selectedPack.priceDZD * 0.03);
  const totalToPay = selectedPack.priceDZD + paymentFee;

  // ── Croissance : offres (1ère recharge, cashback) — toujours décidées par le serveur ──
  const copy = getGrowthCopy(language);
  const growthStatus = growth?.status ?? null;
  const nowMs = growth ? growth.nowMs() : Date.now();
  const allOffers: PackOffer[] = growthStatus ? Object.values(growthStatus.packOffers) : [];
  // Dès le premier paiement validé (hasPaid), les offres « première recharge » (flash inclus) disparaissent définitivement.
  const liveOffers = allOffers.filter((o) => remainingMs(o.endsAt, nowMs) > 0 && !(growthStatus?.hasPaid && o.type !== 'cashback'));
  const flashOffer = liveOffers.find((o) => o.type === 'first_recharge_flash') ?? null;
  const entryOffer = liveOffers.find((o) => o.type === 'first_recharge_entry') ?? null;
  const cashbackOffer = liveOffers.find((o) => o.type === 'cashback') ?? null;
  useTicker(liveOffers.length > 0, flashOffer ? 1000 : 30000);
  const offerFor = (packId: string): PackOffer | null => liveOffers.find((o) => o.packId === packId) ?? null;
  const selectedOffer = offerFor(selectedPack.id);
  const selectedPoints = promisedPoints ?? selectedOffer?.totalPoints ?? selectedPack.points;
  const selectedBonus = Math.max(0, selectedPoints - selectedPack.points);
  // Le nom du pack affiche les points RÉELLEMENT crédités (ex. « 150 Points » pendant l'offre, pas « 100 »).
  const pointsWord = language === 'ar' ? 'نقطة' : 'Points';
  const selectedLabel = selectedPoints !== selectedPack.points ? `${selectedPoints.toLocaleString()} ${pointsWord}` : selectedPack.name;

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
              handlePaymentSuccess(data.pointsCredited);
            }
          }
        } catch (e) {
          // Silent polling
        }
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [invoiceId, isSuccess]);

  const handlePaymentSuccess = (serverPoints?: number) => {
    if (invoiceId !== null && handledSuccessInvoiceRef.current === invoiceId) return;
    if (invoiceId !== null) handledSuccessInvoiceRef.current = invoiceId;
    const pointsCredited = typeof serverPoints === 'number' && serverPoints > 0 ? serverPoints : selectedPoints;
    setCreditedPoints(pointsCredited);
    setIsSuccess(true);
    const newRecord: PurchaseRecord = {
      id: `pur_${Date.now()}`,
      packId: selectedPack.id,
      packName: selectedPack.name,
      pointsCredited,
      amountDZD: totalToPay,
      paymentMethod,
      createdAt: new Date().toISOString(),
      transactionId: invoiceId ? `SATIM-${invoiceId}` : `SATIM-${Date.now().toString().slice(-6)}`,
      status: 'paid',
    };
    onRechargeSuccess({ ...selectedPack, points: pointsCredited }, paymentMethod, newRecord);
  };

  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    // Ouvre/réserve l'onglet pendant le clic utilisateur, avant le moindre await.
    // Sinon les navigateurs bloquent window.open et le fallback envoyait l'onglet
    // Sawtify lui-même vers SATIM, ce qui arrêtait le suivi du paiement.
    if (paymentRequestInFlightRef.current) return;
    paymentRequestInFlightRef.current = true;
    setIsProcessing(true);
    setStatusMessage('');
    setPaymentPopupOpened(false);

    let paymentWindow: Window | null = null;
    try {
      paymentWindow = window.open('about:blank', '_blank');
      if (paymentWindow) {
        const title = language === 'ar' ? 'تحضير الدفع — Sawtify' : 'Préparation du paiement — Sawtify';
        const message = language === 'ar'
          ? 'يرجى الانتظار، جارٍ فتح بوابة الدفع الآمنة…'
          : 'Patientez, la page de paiement sécurisée est en cours de préparation…';
        try {
          paymentWindow.document.open();
          paymentWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#f8fafc;color:#0f172a;font:16px system-ui,sans-serif"><main style="max-width:440px;padding:32px;text-align:center"><h1 style="font-size:22px">${title}</h1><p style="color:#475569">${message}</p></main></body></html>`);
          paymentWindow.document.close();
          // Empêche la page de paiement de piloter l'onglet Sawtify.
          paymentWindow.opener = null;
        } catch {
          // Même sans écran d'attente, on garde la fenêtre réservée pour SATIM.
        }
      }
    } catch {
      // Si le navigateur bloque la fenêtre, Sawtify reste ouvert et proposera un lien.
      paymentWindow = null;
    }

    try {
      const { getMyAccessToken } = await import('../services/supabaseClient');
      const accessToken = await getMyAccessToken();
      if (!accessToken) {
        if (paymentWindow && !paymentWindow.closed) paymentWindow.close();
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
        setPromisedPoints(typeof data.pointsPromised === 'number' ? data.pointsPromised : null);
        setStatusMessage('');
        // Le nouvel onglet va vers SATIM. Celui-ci reste sur Sawtify et son polling
        // ne crédite les points qu'après confirmation serveur du paiement.
        if (paymentWindow && !paymentWindow.closed) {
          try {
            paymentWindow.location.replace(data.paymentUrl);
            setPaymentPopupOpened(true);
          } catch {
            paymentWindow.close();
          }
        }
      } else {
        if (paymentWindow && !paymentWindow.closed) paymentWindow.close();
        const message = data.error || data.message ||
          (language === 'ar' ? 'خطأ في إنشاء الفاتورة' : 'Erreur de création de facture');
        setStatusMessage(message);
      }
    } catch (err) {
      console.warn('[Pricing Checkout Error]:', err);
      if (paymentWindow && !paymentWindow.closed) paymentWindow.close();
      setStatusMessage(language === 'ar' ? 'خطأ في الاتصال' : 'Erreur de connexion');
    } finally {
      paymentRequestInFlightRef.current = false;
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
        handlePaymentSuccess(statusData.pointsCredited);
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

  const openCheckout = (packId: string) => {
    setSelectedPackId(packId);
    setPaymentUrl(null);
    setInvoiceId(null);
    setIsSuccess(false);
    setPaymentPopupOpened(false);
    setPromisedPoints(null);
    setCreditedPoints(null);
    setIsCheckoutOpen(true);
  };

  // Clic sur le pop-up de fin de solde : on ouvre directement le paiement du pack choisi.
  useEffect(() => {
    if (!openPackId) return;
    if (creditPacks.some((p) => p.id === openPackId)) openCheckout(openPackId);
    onOpenPackHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openPackId]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CARD_3D_STYLES }} />

      <div className="saw-secondary-page saw-pricing-page w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-7 pb-16">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 rounded-[28px] border border-white/70 bg-white/45 px-5 py-7 shadow-[0_12px_38px_rgba(76,29,149,.05)] backdrop-blur-xl sm:px-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {language === 'ar' ? 'شحن رصيد النقاط' : 'Recharge de Points'}
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            {language === 'ar'
              ? 'اختر باقتك المفضلة وادفع بأمان عبر Edahabia أو CIB'
              : 'Choisissez votre pack et payez en toute sécurité via Edahabia ou CIB'}
          </p>
          {/* Price framing : on ne vend pas « 1 000 DZD », on vend « une voix-off à ~90 DZD ». */}
          <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-4 py-1.5 text-sm font-bold text-emerald-700">
            <Zap className="w-4 h-4 shrink-0" />
            {copy.framingBanner}
          </p>
        </div>

        {/* Offre de première recharge (compte à rebours réel, horloge serveur) */}
        {(flashOffer || entryOffer) && (
          <div className="max-w-2xl mx-auto rounded-2xl bg-gradient-to-r from-purple-700 via-fuchsia-600 to-orange-400 p-[1.5px] shadow-lg shadow-purple-500/20">
            <div className="rounded-[14px] bg-white px-4 py-3 sm:px-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  {flashOffer && (
                    <p className="text-sm font-extrabold text-slate-900">
                      {copy.pricingFlashBanner(flashOffer.bonusPercent, creditPacks.find((p) => p.id === flashOffer.packId)?.priceDZD ?? 0)}
                    </p>
                  )}
                  {entryOffer && (
                    <p className={`${flashOffer ? 'text-xs text-slate-600' : 'text-sm font-extrabold text-slate-900'}`}>
                      {copy.pricingOfferBanner(entryOffer.totalPoints, entryOffer.basePoints, creditPacks.find((p) => p.id === entryOffer.packId)?.priceDZD ?? 0)}
                    </p>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-center sm:text-end">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{copy.expiresIn}</p>
                <p dir="ltr" className="text-2xl font-black tabular-nums text-purple-700 font-num">
                  {formatRemaining(remainingMs((flashOffer ?? entryOffer)!.endsAt, nowMs), language)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cashback actif : « argent récupéré » à dépenser sur la prochaine recharge */}
        {cashbackOffer && (
          <div className="max-w-2xl mx-auto flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                <Gift className="w-5 h-5" />
              </div>
              <p className="text-sm font-extrabold text-emerald-900">{copy.cashbackBanner(cashbackOffer.bonusPercent)}</p>
            </div>
            <p className="text-xs font-bold text-emerald-700 sm:text-end">
              {copy.cashbackExpiresIn} <span dir="ltr" className="font-num tabular-nums">{formatRemaining(remainingMs(cashbackOffer.endsAt, nowMs), language)}</span>
            </p>
          </div>
        )}

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
            const offer = offerFor(pack.id);
            const effectivePoints = offer ? offer.totalPoints : pack.points;
            const audioCount = Math.floor(effectivePoints / POINTS_PER_VOICEOVER);
            // Price framing : le prix devient un « coût par voix-off ».
            const perVoice = pricePerVoiceover(pack.priceDZD, effectivePoints);
            const framingLine = isPopular
              ? copy.perVoicePopular(perVoice)
              : pack.id === 'pack_starter'
                ? copy.perVoiceStarter(perVoice)
                : pack.bonusPercent && pack.bonusPercent >= 20
                  ? copy.perVoiceBonus(perVoice, pack.bonusPercent)
                  : copy.perVoicePlain(perVoice);
            const offerLabel = !offer ? '' : offer.type === 'first_recharge_flash'
              ? copy.flashBadge
              : offer.type === 'first_recharge_entry'
                ? copy.welcomeBadge(offer.bonusPoints)
                : copy.cashbackBadge(offer.bonusPercent);

            return (
              <div 
                key={pack.id} 
                className={`u-container ${isPopular ? 'theme-popular' : 'theme-standard'}`}
                onClick={() => openCheckout(pack.id)}
              >
                <div className="u-canvas">
                  {/* 25 Trackers for 3D effect */}
                  {[...Array(25)].map((_, i) => (
                    <div key={i} className={`u-tracker tr-${i + 1}`} style={{ gridArea: `tr-${i + 1}` }} />
                  ))}
                  
                  {/* The Card Content */}
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

                    {/* Offre de bienvenue (1ʳᵉ recharge) : badge « +N points gratuits » qui casse la barrière du 1ᵉʳ achat */}
                    {offer?.type === 'first_recharge_entry' && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow-md whitespace-nowrap">
                          <Gift className="w-3 h-3" />
                          {offerLabel}
                        </span>
                      </div>
                    )}

                    {/* Offre active (flash / cashback) */}
                    {offer && offer.type !== 'first_recharge_entry' && (
                      <span className={`absolute top-3 end-3 z-30 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold shadow-sm ${
                        offer.type === 'cashback' ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white'
                      }`}>
                        {offer.type === 'cashback' ? <Gift className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {offerLabel}
                      </span>
                    )}

                    {/* Pack Name */}
                    <div className="mb-3 mt-2">
                      <h3 className={`text-sm font-bold uppercase tracking-wider ${isPopular ? 'text-white/80' : 'text-slate-500'}`}>
                        {offer ? `${effectivePoints.toLocaleString()} ${pointsWord}` : pack.name}
                      </h3>
                    </div>

                    {/* Price */}
                    <div className="mb-1.5 flex items-baseline gap-1.5">
                      <span className="text-4xl font-extrabold tracking-tight">
                        {pack.priceDZD.toLocaleString()}
                      </span>
                      <span className={`text-sm font-bold ${isPopular ? 'text-white/70' : 'text-slate-500'}`}>
                        DZD
                      </span>
                    </div>

                    {/* Price framing : « soit ≈ X DZD par voix-off » directement sous le prix total. */}
                    <p className={`mb-2 text-[12px] leading-snug font-semibold ${isPopular ? 'text-white/90' : 'text-emerald-700'}`}>
                      {framingLine}
                    </p>

                    {/* Points subtitle */}
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <p className={`text-sm font-bold ${isPopular ? 'text-white' : 'text-slate-800'}`}>
                        {effectivePoints.toLocaleString()} {language === 'ar' ? 'نقطة' : 'points'}
                      </p>
                      {offer && (
                        <span className={`text-xs line-through decoration-2 ${isPopular ? 'text-white/60' : 'text-slate-400'}`}>
                          {pack.points.toLocaleString()}
                        </span>
                      )}
                      {(offer || pack.bonusPercent) && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isPopular ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'
                        }`}>
                          +{offer ? offer.bonusPercent : pack.bonusPercent}%
                        </span>
                      )}
                    </div>

                    <div className={`h-px w-full mb-4 ${isPopular ? 'bg-white/20' : 'bg-slate-100'}`} />

                    {/* Features List */}
                    <ul className="space-y-2.5 mb-5 flex-1">
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

        {/* Moyens de paiement locaux (rassure avant le clic) */}
        <div className="flex justify-center pt-2">
          <LocalPayBadges />
        </div>

        {/* Checkout Popup */}
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
                      {selectedLabel} • {totalToPay.toLocaleString()} DZD
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
                    {copy.pointsAdded(creditedPoints ?? selectedPoints)}
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
                        <span className="font-semibold text-slate-900">{selectedLabel}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">{language === 'ar' ? 'النقاط' : 'Points'}</span>
                        <span className="font-bold text-purple-600">+{selectedPoints}</span>
                      </div>

                      {selectedBonus > 0 && (
                        <div className="flex justify-between items-center text-sm text-emerald-600 font-semibold">
                          <span>{copy.confirmBonusLine}</span>
                          <span>+{selectedBonus}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-sm text-slate-500">
                        <span>{language === 'ar' ? 'التقدير' : 'Estimation'}</span>
                        <span>~{Math.floor(selectedPoints / POINTS_PER_VOICEOVER)} {language === 'ar' ? 'مقطع صوتي' : 'audios'}</span>
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

                    {/* Moyens de paiement locaux visibles : Edahabia · CIB · BaridiMob (confiance avant le clic). */}
                    <div className="mt-6 rounded-lg bg-slate-50 p-3">
                      <LocalPayBadges />
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

                          {paymentPopupOpened ? (
                            <p className="rounded-xl border border-purple-200 bg-white/80 px-4 py-3 text-sm text-purple-900">
                              {language === 'ar'
                                ? 'تم فتح الدفع في علامة تبويب أخرى. اترك هذه الصفحة مفتوحة؛ ستُضاف النقاط بعد تأكيد SATIM للدفع.'
                                : 'La page de paiement est ouverte dans un autre onglet. Garde Sawtify ouvert : les points seront ajoutés après la confirmation de SATIM.'}
                            </p>
                          ) : (
                            <a
                              href={paymentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition text-lg"
                            >
                              <ExternalLink className="w-5 h-5" />
                              <span>
                                {language === 'ar'
                                  ? `فتح صفحة الدفع في علامة تبويب جديدة · ${totalToPay.toLocaleString()} دج`
                                  : `Ouvrir le paiement dans un nouvel onglet · ${totalToPay.toLocaleString()} DZD`}
                              </span>
                            </a>
                          )}

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
                                setPaymentPopupOpened(false);
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
                              ? 'ستُفتح صفحة الدفع الآمنة في علامة تبويب جديدة. اترك هذه الصفحة مفتوحة حتى تأكيد الدفع.'
                              : 'La page de paiement SATIM s’ouvrira dans un nouvel onglet. Garde cette page ouverte jusqu’à la validation.'}
                          </p>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

        {/* Parrainage viral */}
        {growthStatus && (
          <div className="max-w-2xl mx-auto">
            <ReferralCard status={growthStatus} language={language} />
          </div>
        )}

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

      </div>
    </>
  );
};
