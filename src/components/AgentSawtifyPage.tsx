import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Activity, ArrowDownToLine, ArrowLeft, ArrowRight, AudioLines, Bot, Check, CheckCircle2,
  CircleHelp, ClipboardList, Copy, ExternalLink, Eye, EyeOff, FileUp,
  Headphones, Link2, MessageCircle, Mic2, Package, Pencil, Plus, QrCode,
  Search, Settings2, ShieldCheck, ShoppingBag, Sparkles, Store, Trash2, Truck, X, Play, Pause,
  CreditCard, Wallet, CalendarDays,
  type LucideIcon,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { API_BASE_URL } from '../config/apiBase';
import { AGENT_PRICING_OFFERS, type AgentPricingOffer } from '../config/agentPricing';
import { getMyAccessToken } from '../services/supabaseClient';
import { getAgentAccessToken } from '../services/agentAccess';
import { getVoices } from '../data/voices';
import { requestVoicePreview } from '../services/api';
import { playNaturalAudio, stopNaturalAudio } from '../utils/audioGenerator';
import {
  getCallLink, makeAgentId, parseProductCsv, readAgentStore, saveAgentStore,
  type AgentFAQ, type AgentLanguage, type AgentOrder, type AgentOrderStatus,
  type AgentProduct, type AgentStore,
} from '../services/agentSawtify';

type DashboardSection = 'overview' | 'assistant' | 'catalog' | 'faq' | 'orders' | 'link' | 'pricing';

const formatDzd = (amount: number, arabic = false) =>
  `${new Intl.NumberFormat(arabic ? 'ar-DZ' : 'fr-DZ', { maximumFractionDigits: 0 }).format(amount)} ${arabic ? 'دج' : 'DA'}`;

const csvEscape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

export const AgentSawtifyPage: React.FC<{
  previewMode?: boolean;
  onBack?: () => void;
  onSignIn?: () => void;
}> = ({ previewMode = false, onBack, onSignIn }) => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const bi = (fr: string, ar: string) => isArabic ? ar : fr;
  const [store, setStore] = useState<AgentStore>(() => readAgentStore());
  const [section, setSection] = useState<DashboardSection>('overview');
  const [qrImage, setQrImage] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [orderFilter, setOrderFilter] = useState<'all' | AgentOrderStatus>('all');
  const [editingProduct, setEditingProduct] = useState<AgentProduct | null | 'new'>(null);
  const [editingFaq, setEditingFaq] = useState<AgentFAQ | null | 'new'>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const link = useMemo(() => getCallLink(store.slug), [store.slug]);

  useEffect(() => {
    saveAgentStore(store);
  }, [store]);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(link, {
      width: 260,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#21163b', light: '#ffffff' },
    }).then((image) => { if (active) setQrImage(image); }).catch(() => { if (active) setQrImage(''); });
    return () => { active = false; };
  }, [link]);

  useEffect(() => {
    const refresh = (event: StorageEvent) => {
      if (event.key === 'sawtify-agent-sawtify-demo-v1') setStore(readAgentStore());
    };
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 3000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const activeProducts = store.products.filter((product) => product.active);
  const newOrders = store.orders.filter((order) => order.status === 'new').length;
  const filteredProducts = store.products.filter((product) => {
    const needle = query.trim().toLocaleLowerCase();
    return !needle || `${product.name} ${product.category}`.toLocaleLowerCase().includes(needle);
  });
  const filteredOrders = [...store.orders]
    .filter((order) => orderFilter === 'all' || order.status === orderFilter)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const updateStore = (patch: Partial<AgentStore>) => setStore((current) => ({ ...current, ...patch }));
  const showNotice = (message: string) => setNotice(message);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      showNotice(bi('Lien copié, prêt à être partagé.', 'تم نسخ الرابط، جاهز للمشاركة.'));
    } catch {
      showNotice(bi('Sélectionne le lien pour le copier.', 'حدّد الرابط لنسخه.'));
    }
  };

  const openCallPage = () => window.open(link, '_blank', 'noopener,noreferrer');

  const downloadQr = () => {
    if (!qrImage) return;
    const anchor = document.createElement('a');
    anchor.href = qrImage;
    anchor.download = `${store.slug || 'sawtify-call-link'}-qr.png`;
    anchor.click();
  };

  const exportCatalogTemplate = () => {
    const contents = [
      'nom,prix,stock,tailles,categorie,description',
      'Sneakers Atlas,8500,12,"39|40|41|42|43",Chaussures,"Sneakers légères"',
    ].join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${contents}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'modele-catalogue-sawtify.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importCatalog = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      showNotice(bi('Choisis un fichier CSV exporté depuis Excel ou Google Sheets.', 'اختَر ملف CSV مُصدَّر من Excel أو Google Sheets.'));
      return;
    }
    try {
      const products = parseProductCsv(await file.text());
      if (!products.length) {
        showNotice(bi('Aucun produit valide. Vérifie les colonnes nom et prix.', 'ما لقيناش منتجات صالحة. تأكّد من أعمدة الاسم والسعر.'));
        return;
      }
      setStore((current) => ({ ...current, products: [...products, ...current.products] }));
      showNotice(bi(`${products.length} produit${products.length > 1 ? 's' : ''} ajouté${products.length > 1 ? 's' : ''}.`, `تمت إضافة ${products.length} منتج.`));
    } catch {
      showNotice(bi('Impossible de lire ce fichier. Réessaie avec un CSV simple.', 'تعذّر قراءة الملف. أعد المحاولة بملف CSV بسيط.'));
    }
  };

  const saveProduct = (product: AgentProduct) => {
    setStore((current) => ({
      ...current,
      products: current.products.some((item) => item.id === product.id)
        ? current.products.map((item) => item.id === product.id ? product : item)
        : [product, ...current.products],
    }));
    setEditingProduct(null);
    showNotice(bi('Catalogue mis à jour.', 'تم تحديث الكتالوج.'));
  };

  const removeProduct = (id: string) => {
    setStore((current) => ({ ...current, products: current.products.filter((product) => product.id !== id) }));
    showNotice(bi('Produit supprimé du catalogue.', 'تم حذف المنتج من الكتالوج.'));
  };

  const saveFaq = (faq: AgentFAQ) => {
    setStore((current) => ({
      ...current,
      faqs: current.faqs.some((item) => item.id === faq.id)
        ? current.faqs.map((item) => item.id === faq.id ? faq : item)
        : [faq, ...current.faqs],
    }));
    setEditingFaq(null);
    showNotice(bi('Réponse enregistrée.', 'تم حفظ الإجابة.'));
  };

  const removeFaq = (id: string) => {
    setStore((current) => ({ ...current, faqs: current.faqs.filter((faq) => faq.id !== id) }));
    showNotice(bi('Question supprimée.', 'تم حذف السؤال.'));
  };

  const changeOrderStatus = (id: string, status: AgentOrderStatus) => {
    setStore((current) => ({
      ...current,
      orders: current.orders.map((order) => order.id === id ? { ...order, status } : order),
    }));
  };

  const exportOrders = () => {
    const header = ['date', 'client', 'telephone', 'wilaya', 'produit', 'taille', 'quantite', 'total_dzd', 'statut'];
    const rows = store.orders.map((order) => [order.createdAt, order.customerName, order.phone, order.wilaya, order.productName, order.size, order.quantity, order.amountDzd, order.status]);
    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'commandes-sawtify.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const tabs: Array<{ id: DashboardSection; label: string; icon: LucideIcon; badge?: number }> = [
    { id: 'overview', label: bi('Vue d’ensemble', 'نظرة عامة'), icon: Activity },
    { id: 'assistant', label: bi('Mon assistant', 'مساعدي'), icon: Bot },
    { id: 'catalog', label: bi('Catalogue', 'الكتالوج'), icon: Package },
    { id: 'faq', label: 'FAQ', icon: CircleHelp },
    { id: 'orders', label: bi('Commandes', 'الطلبات'), icon: ClipboardList, badge: newOrders },
    { id: 'pricing', label: bi('Forfaits', 'الأسعار'), icon: CreditCard },
    { id: 'link', label: bi('Lien & QR', 'الرابط و QR'), icon: QrCode },
  ];

  return (
    <div className="saw-app-background relative min-h-screen overflow-hidden">
      <div className="saw-aurora" aria-hidden="true">
        <div className="saw-blob" style={{ width: 620, height: 620, top: -180, left: -120, background: 'radial-gradient(circle, rgba(139,92,246,0.24), transparent 65%)' }} />
        <div className="saw-blob" style={{ width: 560, height: 560, top: -120, right: -140, background: 'radial-gradient(circle, rgba(232,121,249,0.18), transparent 65%)' }} />
        <div className="saw-blob" style={{ width: 720, height: 720, bottom: -320, left: '50%', transform: 'translateX(-50%)', background: 'radial-gradient(circle, rgba(129,140,248,0.18), transparent 65%)' }} />
      </div>
      <section
        className="agent-sawtify-page relative z-[1] mx-auto w-full max-w-6xl px-4 pb-24 pt-5 text-slate-900 sm:px-6 sm:pt-7 lg:px-8"
        dir={isArabic ? 'rtl' : 'ltr'}
        style={{ fontFamily: isArabic ? 'var(--font-sans-arabic)' : "'Sora', var(--font-sans-latin)" }}
      >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-500">
          {onBack && (
            <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 rounded-xl border border-white/80 bg-white/80 px-3 py-2 text-slate-600 shadow-sm transition hover:border-violet-200 hover:text-violet-700">
              <ArrowLeft className="h-3.5 w-3.5" /> {bi('Retour à Sawtify', 'العودة إلى Sawtify')}
            </button>
          )}
          <span className="hidden h-1 w-1 rounded-full bg-violet-300 sm:block" />
          <span className="truncate">{bi('Espace commerçant', 'مساحة التاجر')}</span>
          <span className="font-black text-violet-500">/</span>
          <span className="truncate text-slate-900">Agent Sawtify</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">
            <span className={`h-1.5 w-1.5 rounded-full ${store.isActive ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'}`} />
            {store.isActive ? bi('Assistant actif', 'المساعد نشط') : bi('En pause', 'متوقف مؤقتاً')}
          </span>
          {previewMode && onSignIn && (
            <button type="button" onClick={onSignIn} className="inline-flex items-center gap-1.5 rounded-xl bg-violet-700 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-violet-600">
              {bi('Se connecter / créer un compte', 'تسجيل الدخول / إنشاء حساب')} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <header className="mx-auto mb-7 flex max-w-3xl flex-col items-center text-center">
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/75 px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[.16em] text-violet-700 shadow-sm shadow-violet-900/[.03]">
          <AudioLines className="h-4 w-4" />
          {bi('Votre boutique, à l’écoute', 'متجرك ديما قريب من زبائنك')}
        </span>
        <h1 className="text-4xl font-semibold tracking-[-.045em] text-[#2e1065] sm:text-5xl">Agent Sawtify</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">
          {bi('Un lien à partager. Un assistant qui répond en français ou en darija, présente vos produits et recueille les demandes de vos clients.', 'رابط واحد تشاركه، ومساعد يجاوب زبائنك بالدارجة ولا بالفرنسية، يعرّف بمنتجاتك ويسجّل طلباتهم.')}
        </p>
        <button type="button" onClick={openCallPage} className="group mt-5 inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#6d28d9] px-5 py-3 text-sm font-extrabold text-white shadow-[0_8px_24px_rgba(109,40,217,.22)] transition hover:bg-violet-600">
          <Eye className="h-4 w-4" /> {bi('Voir la page client', 'شوف صفحة الزبون')}
          <ExternalLink className="h-3.5 w-3.5 opacity-70 transition group-hover:translate-x-0.5" />
        </button>
      </header>

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-violet-100/90 bg-white/65 px-4 py-3 text-violet-950 shadow-sm shadow-violet-900/[0.03] backdrop-blur-xl">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
        <p className="text-xs leading-5 sm:text-[13px]">
          <strong>{bi('Aperçu interactif.', 'معاينة تفاعلية.')}</strong>{' '}
          {bi('Les exemples et modifications restent enregistrés sur cet appareil. La page client et les formulaires sont prêts à être testés.', 'الأمثلة والتعديلات يبقاو محفوظين في هذا الجهاز. جرّب صفحة الزبون والنماذج.')}
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard icon={Store} label={bi('Ma boutique', 'متجري')} value={store.name || bi('Ma boutique', 'متجري')} detail={store.location || bi('Algerie', 'الجزائر')} tone="violet" />
        <StatCard icon={Package} label={bi('Produits en ligne', 'المنتجات المعروضة')} value={String(activeProducts.length)} detail={bi('prêts à présenter', 'جاهزة للعرض')} tone="blue" />
        <StatCard icon={CircleHelp} label={bi('Réponses prêtes', 'أجوبة جاهزة')} value={String(store.faqs.filter((item) => item.active).length)} detail={bi('livraison, tailles…', 'التوصيل، المقاسات…')} tone="amber" />
        <StatCard icon={ClipboardList} label={bi('À confirmer', 'بانتظار التأكيد')} value={String(newOrders)} detail={bi('demandes reçues', 'طلبات جديدة')} tone="rose" />
      </div>

      <div className="mb-5 rounded-[24px] border border-white/90 bg-white/80 p-1.5 shadow-[0_12px_40px_rgba(49,24,90,.06)] backdrop-blur-xl">
        <nav className="scrollbar-none flex gap-1 overflow-x-auto" aria-label={bi('Sections Agent Sawtify', 'أقسام Agent Sawtify')}>
          {tabs.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              aria-current={section === id ? 'page' : undefined}
              className={`relative flex shrink-0 items-center gap-2 rounded-[18px] px-3.5 py-3 text-xs font-bold transition sm:px-4 ${section === id ? 'bg-[#6d28d9] text-white shadow-md shadow-violet-700/20' : 'text-slate-600 hover:bg-violet-50 hover:text-violet-800'}`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              {typeof badge === 'number' && badge > 0 && <span className={`min-w-5 rounded-full px-1.5 py-0.5 text-[10px] ${section === id ? 'bg-white/15 text-white' : 'bg-rose-100 text-rose-700'}`}>{badge}</span>}
            </button>
          ))}
        </nav>
      </div>

      {section === 'overview' && (
        <OverviewSection
          store={store}
          link={link}
          qrImage={qrImage}
          isArabic={isArabic}
          onCopy={copyLink}
          onOpen={openCallPage}
          onDownloadQr={downloadQr}
          onNavigate={setSection}
        />
      )}

      {section === 'assistant' && (
        <AssistantSettings store={store} isArabic={isArabic} onChange={updateStore} onSaved={() => showNotice(bi('Profil de l’assistant enregistré.', 'تم حفظ إعدادات المساعد.'))} />
      )}

      {section === 'catalog' && (
        <section className="saw-glass rounded-[26px] p-4 sm:p-6">
          <SectionHeading
            icon={Package}
            title={bi('Votre catalogue', 'كتالوج المنتجات')}
            subtitle={bi('L’assistant s’appuie sur ces informations pour présenter les bons articles, leurs prix et leurs disponibilités.', 'المساعد يستعمل هاذ المعلومات باش يعرّف بالمنتجات، الأسعار والمخزون.')}
            action={<button type="button" onClick={() => setEditingProduct('new')} className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-3.5 py-2.5 text-xs font-extrabold text-white transition hover:bg-violet-600"><Plus className="h-4 w-4" />{bi('Ajouter un produit', 'أضف منتجاً')}</button>}
          />
          <div className="mb-4 flex flex-col gap-3 border-b border-violet-100/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative block w-full sm:max-w-xs">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={bi('Rechercher un produit…', 'ابحث عن منتج…')} className="w-full rounded-xl border border-slate-200 bg-white/85 py-2.5 pe-3 ps-9 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={importCatalog} className="hidden" aria-label={bi('Importer un catalogue CSV', 'استيراد كتالوج CSV')} />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-xs font-bold text-violet-800 transition hover:bg-violet-50"><FileUp className="h-4 w-4" />{bi('Importer CSV', 'استيراد CSV')}</button>
              <button type="button" onClick={exportCatalogTemplate} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700"><ArrowDownToLine className="h-4 w-4" />{bi('Modèle CSV', 'نموذج CSV')}</button>
            </div>
          </div>
          <p className="mb-4 text-[11px] text-slate-500">{bi('Importe un CSV depuis Excel ou Google Sheets. Colonnes : nom, prix, stock, tailles, catégorie, description.', 'استورد CSV من Excel أو Google Sheets. الأعمدة: الاسم، السعر، المخزون، المقاسات، الصنف والوصف.')}</p>
          {filteredProducts.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} isArabic={isArabic} onEdit={() => setEditingProduct(product)} onDelete={() => removeProduct(product.id)} onToggle={() => setStore((current) => ({ ...current, products: current.products.map((item) => item.id === product.id ? { ...item, active: !item.active } : item) }))} />
              ))}
            </div>
          ) : <EmptyState icon={Package} title={bi('Aucun produit trouvé', 'ما لقيناش منتج')} subtitle={bi('Essaie une autre recherche ou ajoute ton premier produit.', 'جرّب كلمة أخرى أو أضف أول منتج.')} />}
        </section>
      )}

      {section === 'faq' && (
        <section className="saw-glass rounded-[26px] p-4 sm:p-6">
          <SectionHeading
            icon={CircleHelp}
            title={bi('Questions fréquentes', 'الأسئلة المتكررة')}
            subtitle={bi('Préparez vos réponses une fois : vos clients les retrouveront à toute heure.', 'حضّر إجاباتك مرة وحدة، وزبائنك يلقاوها في أي وقت.')}
            action={<button type="button" onClick={() => setEditingFaq('new')} className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-3.5 py-2.5 text-xs font-extrabold text-white transition hover:bg-violet-600"><Plus className="h-4 w-4" />{bi('Ajouter une question', 'أضف سؤالاً')}</button>}
          />
          <div className="space-y-3">
            {store.faqs.length ? store.faqs.map((faq) => (
              <article key={faq.id} className={`rounded-2xl border bg-white/85 p-4 transition sm:p-5 ${faq.active ? 'border-violet-100' : 'border-slate-200 opacity-70'}`}>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><MessageCircle className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-extrabold text-slate-900">{faq.question}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${faq.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{faq.active ? bi('Visible', 'معروض') : bi('Masquée', 'مخفي')}</span>
                    </div>
                    <p className="mt-1.5 text-xs leading-5 text-slate-600">{faq.answer}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" onClick={() => setStore((current) => ({ ...current, faqs: current.faqs.map((item) => item.id === faq.id ? { ...item, active: !item.active } : item) }))} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-violet-700" aria-label={faq.active ? bi('Masquer la question', 'إخفاء السؤال') : bi('Afficher la question', 'إظهار السؤال')}>{faq.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                    <button type="button" onClick={() => setEditingFaq(faq)} className="rounded-lg p-2 text-slate-400 transition hover:bg-violet-50 hover:text-violet-700" aria-label={bi('Modifier', 'تعديل')}><Pencil className="h-4 w-4" /></button>
                    <button type="button" onClick={() => removeFaq(faq.id)} className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" aria-label={bi('Supprimer', 'حذف')}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </article>
            )) : <EmptyState icon={CircleHelp} title={bi('Pas encore de réponse', 'مازال ما كاين حتى جواب')} subtitle={bi('Ajoute quelques questions pour aider l’assistant à répondre rapidement.', 'أضف شوية أسئلة باش المساعد يجاوب بسرعة.')} />}
          </div>
        </section>
      )}

      {section === 'orders' && (
        <section className="saw-glass rounded-[26px] p-4 sm:p-6">
          <SectionHeading
            icon={ClipboardList}
            title={bi('Le suivi des commandes', 'متابعة الطلبات')}
            subtitle={bi('Retrouvez les demandes clients, confirmez-les et préparez la livraison.', 'تابع طلبات الزبائن، أكّدها وحضّر التوصيل.')}
            action={<button type="button" onClick={exportOrders} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-3.5 py-2.5 text-xs font-bold text-violet-800 transition hover:bg-violet-50"><ArrowDownToLine className="h-4 w-4" />{bi('Exporter CSV', 'تصدير CSV')}</button>}
          />
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {(['all', 'new', 'confirmed', 'delivered'] as const).map((filter) => {
              const label = filter === 'all' ? bi('Toutes', 'الكل') : orderStatusLabel(filter, isArabic);
              return <button key={filter} type="button" onClick={() => setOrderFilter(filter)} className={`rounded-full px-3.5 py-2 text-[11px] font-bold transition ${orderFilter === filter ? 'bg-violet-700 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700'}`}>{label}{filter === 'new' && newOrders > 0 ? ` · ${newOrders}` : ''}</button>;
            })}
          </div>
          {filteredOrders.length ? (
            <div className="space-y-3">
              {filteredOrders.map((order) => <OrderCard key={order.id} order={order} isArabic={isArabic} onStatusChange={(status) => changeOrderStatus(order.id, status)} />)}
            </div>
          ) : <EmptyState icon={ShoppingBag} title={bi('Aucune commande ici', 'ما كاين حتى طلب هنا')} subtitle={bi('Les demandes envoyées depuis votre page client s’afficheront dans cet espace.', 'الطلبات اللي يبعثوها الزبائن من صفحتك يبانوا هنا.')} />}
        </section>
      )}

      {section === 'pricing' && (
        <AgentPricingSection isArabic={isArabic} previewMode={previewMode} onSignIn={onSignIn} />
      )}

      {section === 'link' && (
        <LinkSection
          store={store}
          link={link}
          qrImage={qrImage}
          isArabic={isArabic}
          onChangeSlug={(slug) => updateStore({ slug })}
          onCopy={copyLink}
          onOpen={openCallPage}
          onDownloadQr={downloadQr}
          onNotice={showNotice}
        />
      )}

      {notice && <div role="status" aria-live="polite" className="fixed bottom-5 end-4 z-[100] flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs font-semibold text-white shadow-2xl sm:bottom-7 sm:end-7"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />{notice}</div>}

      {editingProduct && (
        <ProductDialog product={editingProduct === 'new' ? null : editingProduct} isArabic={isArabic} onClose={() => setEditingProduct(null)} onSave={saveProduct} />
      )}
      {editingFaq && (
        <FaqDialog faq={editingFaq === 'new' ? null : editingFaq} isArabic={isArabic} onClose={() => setEditingFaq(null)} onSave={saveFaq} />
      )}
      </section>
    </div>
  );
};

function StatCard({ icon: Icon, label, value, detail, tone }: { icon: LucideIcon; label: string; value: string; detail: string; tone: 'violet' | 'blue' | 'amber' | 'rose' }) {
  const tones = {
    violet: 'bg-violet-100 text-violet-700',
    blue: 'bg-sky-100 text-sky-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
  };
  return (
    <div className="min-w-0 rounded-[20px] border border-white/90 bg-white/75 p-3.5 shadow-[0_10px_28px_rgba(49,24,90,.04)] sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-[10px] font-bold text-slate-500 sm:text-[11px]">{label}</p>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="h-4 w-4" /></span>
      </div>
      <p className="mt-2 truncate text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{value}</p>
      <p className="mt-1 truncate text-[10px] text-slate-500 sm:text-[11px]">{detail}</p>
    </div>
  );
}

function SectionHeading({ icon: Icon, title, subtitle, action }: { icon: LucideIcon; title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-violet-100/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><Icon className="h-5 w-5" /></span>
        <div><h2 className="text-lg font-black tracking-tight text-slate-950">{title}</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">{subtitle}</p></div>
      </div>
      {action && <div className="shrink-0 sm:pt-0.5">{action}</div>}
    </div>
  );
}

function OverviewSection({ store, link, qrImage, isArabic, onCopy, onOpen, onDownloadQr, onNavigate }: {
  store: AgentStore; link: string; qrImage: string; isArabic: boolean; onCopy: () => void; onOpen: () => void; onDownloadQr: () => void; onNavigate: (section: DashboardSection) => void;
}) {
  const bi = (fr: string, ar: string) => isArabic ? ar : fr;
  const selectedVoice = getVoices(isArabic ? 'ar' : 'fr').find((voice) => voice.id === store.agentVoiceId);
  const checks = [
    { done: !!store.name, label: bi('Présentez votre boutique', 'عرّف بمتجرك'), target: 'assistant' as const, icon: Store },
    { done: store.products.some((product) => product.active), label: bi('Ajoutez vos produits et leurs stocks', 'أضف منتجاتك ومخزونها'), target: 'catalog' as const, icon: Package },
    { done: store.faqs.some((faq) => faq.active), label: bi('Préparez les réponses aux questions courantes', 'حضّر أجوبة للأسئلة المتكررة'), target: 'faq' as const, icon: CircleHelp },
    { done: !!store.slug, label: bi('Partagez votre lien ou votre QR code', 'شارك رابطك أو رمز QR'), target: 'link' as const, icon: QrCode },
  ];
  const progress = Math.round(checks.filter((item) => item.done).length / checks.length * 100);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
      <section className="saw-glass rounded-[26px] p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-violet-700">{bi('Votre lien client', 'رابط الزبائن')}</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">{bi('Toujours disponible. Partout où vous le partagez.', 'ديما متاح، وين ما تشاركو.')}</h2>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">{bi('Prêt à tester', 'جاهز للتجربة')}</span>
        </div>
        <div className="grid items-center gap-5 sm:grid-cols-[1fr_164px]">
          <div className="min-w-0">
            <p className="mb-2 text-[11px] font-semibold text-slate-500">{bi('Copiez le lien dans votre bio ou envoyez-le à vos clients.', 'انسخ الرابط في البايو أو ابعثو لزبائنك.')}</p>
            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-violet-100 bg-white p-2">
              <Link2 className="ms-1 h-4 w-4 shrink-0 text-violet-600" />
              <input readOnly value={link} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-slate-700 outline-none" aria-label={bi('Lien d’appel client', 'رابط اتصال الزبون')} />
              <button type="button" onClick={onCopy} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-700 text-white transition hover:bg-violet-600" aria-label={bi('Copier le lien', 'نسخ الرابط')}><Copy className="h-4 w-4" /></button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={onOpen} className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-violet-600"><ExternalLink className="h-3.5 w-3.5" />{bi('Tester la page client', 'جرّب صفحة الزبون')}</button>
              <button type="button" onClick={() => onNavigate('link')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 transition hover:border-violet-200 hover:text-violet-700"><QrCode className="h-3.5 w-3.5" />{bi('Gérer le QR code', 'إدارة رمز QR')}</button>
            </div>
          </div>
          <div className="mx-auto w-[164px] rounded-[22px] border border-violet-100 bg-white p-3 text-center shadow-sm">
            {qrImage ? <img src={qrImage} alt={bi(`QR code pour ${store.name}`, `رمز QR لمتجر ${store.name}`)} className="mx-auto aspect-square w-full rounded-xl" /> : <div className="aspect-square animate-pulse rounded-xl bg-violet-50" />}
            <p className="mt-2 text-[10px] font-extrabold text-slate-800">{bi('Scannez pour parler', 'امسح باش تهدر')}</p>
          </div>
        </div>
      </section>

      <section className="saw-glass rounded-[26px] p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-md shadow-violet-300/40"><Bot className="h-5 w-5" /></span>
            <div><p className="text-[10px] font-black uppercase tracking-[.15em] text-violet-700">{bi('Votre assistant', 'مساعدك')}</p><p className="text-sm font-extrabold text-slate-950">{store.name || bi('Ma boutique', 'متجري')}</p></div>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${store.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{store.isActive ? bi('Disponible', 'متاح') : bi('En pause', 'متوقف')}</span>
        </div>
        <div className="mt-5 rounded-2xl rounded-ts-sm border border-violet-100 bg-violet-50/75 p-3.5 text-xs leading-5 text-slate-700">
          {store.greeting || bi('Bonjour ! Comment puis-je vous aider ?', 'سلام، كيفاش نقدر نعاونك؟')}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />{bi('Français et darija · sans inscription', 'بالفرنسية والدارجة · بلا حساب')}</div>
          {selectedVoice && <button type="button" onClick={() => onNavigate('assistant')} className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1.5 text-[10px] font-extrabold text-violet-700 transition hover:bg-violet-100"><AudioLines className="h-3.5 w-3.5" />{bi('Voix :', 'الصوت:')} {selectedVoice.name}<span className="ms-1 underline underline-offset-2">{bi('modifier', 'تغيير')}</span></button>}
        </div>
      </section>

      <section className="saw-glass rounded-[26px] p-4 sm:p-6 xl:col-span-2">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-base font-black text-slate-950">{bi('Mise en place de votre espace', 'تجهيز مساحتك')}</h2><p className="mt-1 text-xs text-slate-500">{bi('Quelques étapes simples pour donner à l’assistant les bonnes informations.', 'خطوات بسيطة باش تعطي المساعد المعلومات اللازمة.')}</p></div>
          <span className="text-xs font-black text-violet-700">{progress}%</span>
        </div>
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-violet-100"><div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-all" style={{ width: `${progress}%` }} /></div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {checks.map(({ done, label, target, icon: Icon }) => (
            <button key={target} type="button" onClick={() => onNavigate(target)} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 p-3 text-start transition hover:border-violet-200 hover:bg-violet-50/70">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700'}`}>{done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}</span>
              <span className="text-[11px] font-bold leading-4 text-slate-700">{label}</span>
              <ArrowRight className="ms-auto h-3.5 w-3.5 shrink-0 text-slate-400" />
            </button>
          ))}
        </div>
      </section>

      <section className="saw-glass rounded-[26px] p-4 sm:p-6 xl:col-span-2">
        <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-base font-black text-slate-950">{bi('Vos produits en un coup d’œil', 'منتجاتك بنظرة وحدة')}</h2><p className="mt-1 text-xs text-slate-500">{bi('Les articles actifs que votre assistant peut proposer.', 'المنتجات اللي يقدر المساعد يعرضها.')}</p></div><button type="button" onClick={() => onNavigate('catalog')} className="inline-flex items-center gap-1 text-xs font-extrabold text-violet-700 hover:text-violet-900">{bi('Voir le catalogue', 'شوف الكتالوج')} <ArrowRight className="h-3.5 w-3.5" /></button></div>
        {store.products.filter((product) => product.active).length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{store.products.filter((product) => product.active).slice(0, 3).map((product) => <div key={product.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 p-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-50 text-violet-700"><ShoppingBag className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold text-slate-900">{product.name}</p><p className="mt-1 truncate text-[10px] text-slate-500">{product.stock > 0 ? `${product.stock} ${bi('en stock', 'في المخزون')}` : bi('Rupture de stock', 'نفد المخزون')}</p></div><span className="shrink-0 text-xs font-black text-violet-800">{formatDzd(product.priceDzd, isArabic)}</span></div>)}</div> : <EmptyState icon={Package} title={bi('Ajoutez un produit', 'أضف منتجاً')} subtitle={bi('Votre catalogue apparaîtra ici.', 'الكتالوج تاعك يبان هنا.')} />}
      </section>
    </div>
  );
}

function AssistantSettings({ store, isArabic, onChange, onSaved }: { store: AgentStore; isArabic: boolean; onChange: (patch: Partial<AgentStore>) => void; onSaved: () => void }) {
  const bi = (fr: string, ar: string) => isArabic ? ar : fr;
  const selectedVoice = getVoices(isArabic ? 'ar' : 'fr').find((voice) => voice.id === store.agentVoiceId);
  return (
    <section className="saw-glass rounded-[26px] p-4 sm:p-6">
      <SectionHeading icon={Settings2} title={bi('Personnalisez votre assistant', 'خصّص مساعدك')} subtitle={bi('Présentez votre activité et choisissez comment votre assistant accueille les clients.', 'عرّف بنشاطك واختار كيفاش يستقبل المساعد زبائنك.')} />
      <VoicePicker selectedVoiceId={store.agentVoiceId} isArabic={isArabic} onSelect={(agentVoiceId) => onChange({ agentVoiceId })} />
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_.7fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={bi('Nom de la boutique', 'اسم المتجر')}><input value={store.name} onChange={(event) => onChange({ name: event.target.value })} maxLength={60} placeholder={bi('Ex. Atelier Amine', 'مثال: Atelier Amine')} className={inputClass} /></FormField>
          <FormField label={bi('Activité', 'نوع النشاط')}><input value={store.category} onChange={(event) => onChange({ category: event.target.value })} maxLength={60} placeholder={bi('Mode, restaurant, beauté…', 'ملابس، مطعم، تجميل…')} className={inputClass} /></FormField>
          <FormField label={bi('Ville / adresse de départ', 'المدينة')}><input value={store.location} onChange={(event) => onChange({ location: event.target.value })} maxLength={80} placeholder={bi('Alger', 'الجزائر')} className={inputClass} /></FormField>
          <FormField label={bi('Téléphone de la boutique', 'هاتف المتجر')}><input value={store.phone} onChange={(event) => onChange({ phone: event.target.value })} maxLength={24} inputMode="tel" placeholder="05 00 00 00 00" className={inputClass} /></FormField>
          <FormField label={bi('Langues de conversation', 'لغة المحادثة')}>
            <select value={store.language} onChange={(event) => onChange({ language: event.target.value as AgentLanguage })} className={inputClass}>
              <option value="both">{bi('Français + darija', 'الفرنسية + الدارجة')}</option><option value="fr">Français</option><option value="ar">الدارجة</option>
            </select>
          </FormField>
          <div className="flex items-end">
            <button type="button" onClick={() => onChange({ isActive: !store.isActive })} className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-start transition ${store.isActive ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-200 bg-white'}`}>
              <span><span className="block text-xs font-extrabold text-slate-900">{bi('Assistant disponible', 'المساعد متاح')}</span><span className="mt-1 block text-[10px] text-slate-500">{store.isActive ? bi('Vos clients peuvent essayer la démo.', 'زبائنك يقدرو يجربو المعاينة.') : bi('Mettez-le en pause.', 'وقفو مؤقتاً.')}</span></span>
              <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${store.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${store.isActive ? 'start-6' : 'start-1'}`} /></span>
            </button>
          </div>
          <FormField label={bi('Message d’accueil', 'رسالة الترحيب')} className="sm:col-span-2">
            <textarea value={store.greeting} onChange={(event) => onChange({ greeting: event.target.value })} rows={4} maxLength={280} placeholder={bi('Ex. Salam ! Bienvenue dans ma boutique…', 'مثال: سلام! مرحبا بيك في المتجر…')} className={`${inputClass} resize-y leading-6`} />
            <span className="mt-1 block text-end text-[10px] text-slate-400">{store.greeting.length}/280</span>
          </FormField>
        </div>
        <div className="rounded-[24px] border border-violet-100 bg-gradient-to-br from-white via-violet-50/70 to-fuchsia-50/60 p-5">
          <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-700 text-white shadow-lg shadow-violet-300/30"><Bot className="h-6 w-6" /></span><div><span className="text-[10px] font-black uppercase tracking-[.15em] text-violet-700">{bi('Aperçu de l’accueil', 'معاينة الترحيب')}</span><p className="text-sm font-extrabold text-slate-950">{store.name || bi('Votre boutique', 'متجرك')}</p></div></div>
          <div className="mt-5 rounded-2xl border border-white bg-white/90 p-4 text-sm leading-6 text-slate-700 shadow-sm">{store.greeting || bi('Bonjour ! Comment puis-je vous aider ?', 'سلام، كيفاش نقدر نعاونك؟')}</div>
          <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-slate-500"><Headphones className="h-4 w-4 text-violet-600" />{store.language === 'fr' ? 'Français' : store.language === 'ar' ? 'الدارجة' : bi('Français et darija', 'الفرنسية والدارجة')}</div>
          {selectedVoice && <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-slate-500"><AudioLines className="h-4 w-4 text-violet-600" />{bi('Voix de l’agent :', 'صوت المساعد:')} <span className="font-extrabold text-slate-800">{selectedVoice.name}</span></div>}
          <button type="button" onClick={onSaved} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 text-xs font-extrabold text-white transition hover:bg-violet-600"><Check className="h-4 w-4" />{bi('Enregistrer mes réglages', 'احفظ الإعدادات')}</button>
        </div>
      </div>
    </section>
  );
}

function VoicePicker({ selectedVoiceId, isArabic, onSelect }: { selectedVoiceId: string; isArabic: boolean; onSelect: (voiceId: string) => void }) {
  const bi = (fr: string, ar: string) => isArabic ? ar : fr;
  const voices = useMemo(() => getVoices(isArabic ? 'ar' : 'fr'), [isArabic]);
  const [query, setQuery] = useState('');
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState('');
  const previewRequestRef = useRef<string | null>(null);
  const selectedVoice = voices.find((voice) => voice.id === selectedVoiceId) || voices[0];
  const filteredVoices = voices.filter((voice) =>
    `${voice.name} ${voice.dialect} ${voice.badge || ''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );

  useEffect(() => () => stopNaturalAudio(), []);

  const previewVoice = async (event: React.MouseEvent<HTMLButtonElement>, voiceId: string, sampleAudioUrl?: string) => {
    event.stopPropagation();
    if (previewingVoiceId === voiceId || previewRequestRef.current === voiceId) {
      stopNaturalAudio();
      previewRequestRef.current = null;
      setLoadingVoiceId(null);
      setPreviewingVoiceId(null);
      return;
    }

    stopNaturalAudio();
    previewRequestRef.current = voiceId;
    setPreviewError('');
    setLoadingVoiceId(voiceId);
    setPreviewingVoiceId(voiceId);
    try {
      const audioUrl = sampleAudioUrl || await requestVoicePreview(voiceId);
      if (previewRequestRef.current !== voiceId) return;
      previewRequestRef.current = null;
      setLoadingVoiceId(null);
      playNaturalAudio(audioUrl, () => {
        setPreviewingVoiceId((current) => current === voiceId ? null : current);
      });
    } catch (error) {
      if (previewRequestRef.current === voiceId) {
        previewRequestRef.current = null;
        setLoadingVoiceId(null);
        setPreviewingVoiceId(null);
        setPreviewError(bi('Impossible de lire cet extrait. Réessaie dans un instant.', 'تعذّر تشغيل المقطع. أعد المحاولة بعد لحظة.'));
      }
      console.warn('Agent Sawtify voice preview failed:', error);
    }
  };

  return (
    <section className="rounded-[24px] border border-violet-100/80 bg-white/65 p-4 shadow-[0_14px_36px_rgba(49,24,90,.05)] backdrop-blur-xl sm:p-5" aria-label={bi('Choix de la voix de l’agent', 'اختيار صوت المساعد')}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.15em] text-violet-700">{bi('Voix de l’agent', 'صوت المساعد')}</p>
          <h3 className="mt-1 text-base font-extrabold text-slate-950">{bi('Choisissez sa voix', 'اختار صوت المساعد')}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{bi('Retrouvez les voix du studio et écoutez un extrait avant de choisir.', 'اختار من أصوات الاستوديو واسمع عيّنة قبل ما تقرر.')}</p>
        </div>
        <span className="rounded-full border border-violet-100 bg-white/80 px-3 py-1.5 text-[10px] font-bold text-violet-700">{bi(`${voices.length} voix disponibles`, `${voices.length} صوت متاح`)}</span>
      </div>

      {selectedVoice && (
        <div className="mb-4 flex flex-col gap-3 rounded-[20px] border border-violet-100 bg-gradient-to-r from-white via-violet-50/70 to-fuchsia-50/60 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-700 text-white shadow-md shadow-violet-300/30"><AudioLines className="h-5 w-5" /></span>
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-[.14em] text-violet-700">{bi('Voix sélectionnée', 'الصوت المختار')}</span>
              <p className="truncate text-sm font-extrabold text-slate-950">{selectedVoice.name}</p>
              <p className="truncate text-[10px] text-slate-500">{selectedVoice.dialect}</p>
            </div>
          </div>
          <button type="button" onClick={(event) => previewVoice(event, selectedVoice.id, selectedVoice.sampleAudioUrl)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-3.5 py-2.5 text-xs font-extrabold text-violet-800 transition hover:bg-violet-50" aria-label={bi(`Écouter ${selectedVoice.name}`, `استمع إلى ${selectedVoice.name}`)}>
            {loadingVoiceId === selectedVoice.id ? <AudioLines className="h-4 w-4 animate-pulse" /> : previewingVoiceId === selectedVoice.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {previewingVoiceId === selectedVoice.id ? bi('Arrêter l’écoute', 'إيقاف الاستماع') : bi('Écouter la voix', 'استمع للصوت')}
          </button>
        </div>
      )}

      <label className="relative mb-3 block w-full sm:max-w-sm">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={bi('Rechercher une voix…', 'ابحث عن صوت…')} aria-label={bi('Rechercher parmi les voix disponibles', 'ابحث بين الأصوات المتاحة')} className="w-full rounded-xl border border-slate-200 bg-white/85 py-2.5 pe-3 ps-9 text-xs outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
      </label>

      {previewError && <p role="status" className="mb-3 text-[11px] font-semibold text-rose-600">{previewError}</p>}
      {filteredVoices.length ? (
        <div className="grid max-h-[390px] gap-2 overflow-y-auto overscroll-contain p-1 sm:grid-cols-2 lg:grid-cols-3" role="group" aria-label={bi('Voix disponibles', 'الأصوات المتاحة')}>
          {filteredVoices.map((voice) => {
            const isSelected = selectedVoice?.id === voice.id;
            const isPreviewing = previewingVoiceId === voice.id;
            const isLoading = loadingVoiceId === voice.id;
            const gender = voice.gender === 'female' ? bi('Féminine', 'نسائي') : voice.gender === 'male' ? bi('Masculine', 'رجالي') : bi('Voix', 'صوت');
            return (
              <article key={voice.id} className={`min-w-0 rounded-2xl border transition ${isSelected ? 'border-violet-300 bg-violet-50/80 shadow-sm shadow-violet-900/[.04]' : 'border-slate-100 bg-white/75 hover:border-violet-200 hover:bg-white'}`}>
                <button type="button" onClick={() => onSelect(voice.id)} aria-pressed={isSelected} className="flex w-full items-start gap-2.5 p-3 text-start">
                  <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isSelected ? 'bg-violet-700 text-white' : 'bg-violet-100 text-violet-700'}`}><AudioLines className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-extrabold text-slate-950">{voice.name}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-violet-700" />}
                    </span>
                    <span className="mt-1 block line-clamp-2 min-h-8 text-[10px] leading-4 text-slate-500">{voice.dialect}</span>
                    {voice.badge && <span className="mt-2 inline-flex max-w-full truncate rounded-full bg-white/80 px-2 py-1 text-[9px] font-bold text-violet-700">{voice.badge}</span>}
                  </span>
                </button>
                <div className="flex items-center justify-between border-t border-slate-100/80 px-3 py-2">
                  <span className="text-[9px] font-semibold text-slate-400">{gender}</span>
                  <button type="button" onClick={(event) => previewVoice(event, voice.id, voice.sampleAudioUrl)} aria-pressed={isPreviewing} aria-label={bi(`${isPreviewing ? 'Arrêter' : 'Écouter'} ${voice.name}`, `${isPreviewing ? 'إيقاف' : 'استمع إلى'} ${voice.name}`)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-extrabold text-violet-700 transition hover:bg-violet-100">
                    {isLoading ? <AudioLines className="h-3.5 w-3.5 animate-pulse" /> : isPreviewing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    {isPreviewing ? bi('Arrêter', 'إيقاف') : bi('Écouter', 'استمع')}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-violet-200 bg-white/55 px-4 py-7 text-center text-xs text-slate-500">{bi('Aucune voix ne correspond à cette recherche.', 'ما لقيناش صوت بهاد البحث.')}</div>
      )}
    </section>
  );
}

type AgentPaymentHistoryItem = { invoice_id: string | null; offer_id: string; offer_kind: 'subscription' | 'topup'; offer_name: string; minutes: number; amount_dzd: number; status: string; created_at: string; paid_at: string | null };
type AgentWallet = {
  plan_id: string | null;
  plan_seconds_remaining: number;
  topup_seconds_remaining: number;
  plan_seconds_purchased: number;
  topup_seconds_purchased: number;
  remaining_seconds: number;
  purchased_seconds: number;
  remaining_minutes_exact: number;
  progress_percent: number;
  low_balance: boolean;
  plan_active: boolean;
  plan_expires_at: string | null;
};

function formatRemainingDuration(totalSeconds: number, isArabic: boolean) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = String(seconds % 60).padStart(2, '0');
  if (isArabic) return hours > 0 ? `${hours} س ${minutes} د ${remainder} ث` : `${Math.floor(seconds / 60)} د ${remainder} ث`;
  return hours > 0 ? `${hours} h ${minutes} min ${remainder} s` : `${Math.floor(seconds / 60)} min ${remainder} s`;
}

function AgentPricingSection({ isArabic, previewMode, onSignIn }: { isArabic: boolean; previewMode: boolean; onSignIn?: () => void }) {
  const bi = (fr: string, ar: string) => isArabic ? ar : fr;
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [payments, setPayments] = useState<AgentPaymentHistoryItem[]>([]);
  const [wallet, setWallet] = useState<AgentWallet | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const plans = AGENT_PRICING_OFFERS.filter((offer) => offer.kind === 'subscription');
  const topups = AGENT_PRICING_OFFERS.filter((offer) => offer.kind === 'topup');

  useEffect(() => {
    if (previewMode) return;
    let active = true;
    const refreshAccount = async (initial = false, processPaymentReturn = false) => {
      if (initial) setIsLoadingHistory(true);
      try {
        const token = await getMyAccessToken();
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}`, 'X-Agent-Access-Token': getAgentAccessToken() || '' };
        let credited = 0;
        if (processPaymentReturn) {
          const syncResponse = await fetch(`${API_BASE_URL}/api/agent/slickpay/sync-pending`, { method: 'POST', headers });
          if (syncResponse.ok) credited = Number((await syncResponse.json()).credited || 0);
        }
        const response = await fetch(`${API_BASE_URL}/api/agent/sawtify/account`, { headers });
        const account = await response.json();
        if (!active) return;
        if (!response.ok || !account.success) {
          if (initial || processPaymentReturn) setMessage(account.error || bi('Impossible de charger votre solde Agent.', 'تعذّر تحميل رصيد Agent.'));
          return;
        }
        setPayments(account.payments || []);
        setWallet(account.wallet || null);
        if (processPaymentReturn) {
          const latestPayment = account.payments?.[0];
          const recentlyCompleted = latestPayment?.status === 'completed'
            && latestPayment.paid_at
            && Date.now() - Date.parse(latestPayment.paid_at) < 15 * 60 * 1000;
          setMessage(credited > 0 || recentlyCompleted
            ? bi('Paiement confirmé : les minutes sont ajoutées à votre solde.', 'تم تأكيد الدفع وإضافة الدقائق إلى رصيدك.')
            : bi('Retour de SlickPay reçu. Le paiement sera confirmé dès sa vérification.', 'وصلنا رجوعك من SlickPay، وسيتم تأكيد الدفع بعد التحقق.'));
          const nextUrl = new URL(window.location.href);
          nextUrl.searchParams.delete('agent_payment');
          window.history.replaceState({}, document.title, `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
        }
      } catch {
        if (active && (initial || processPaymentReturn)) setMessage(bi('Impossible de charger votre solde Agent pour le moment.', 'تعذّر تحميل رصيد Agent حالياً.'));
      } finally {
        if (active && initial) setIsLoadingHistory(false);
      }
    };
    const cameBackFromPayment = new URLSearchParams(window.location.search).get('agent_payment') === 'success';
    void refreshAccount(true, cameBackFromPayment);
    const refreshTimer = window.setInterval(() => void refreshAccount(), 20_000);
    return () => { active = false; window.clearInterval(refreshTimer); };
  }, [previewMode, isArabic]);

  const beginCheckout = async (offer: AgentPricingOffer) => {
    setMessage('');
    if (previewMode) {
      if (onSignIn) onSignIn();
      else setMessage(bi('Connectez-vous pour payer avec SlickPay.', 'سجّل الدخول للدفع عبر SlickPay.'));
      return;
    }
    setBusyOfferId(offer.id);
    try {
      const token = await getMyAccessToken();
      if (!token) {
        setMessage(bi('Connectez-vous pour payer avec SlickPay.', 'سجّل الدخول للدفع عبر SlickPay.'));
        return;
      }
      const response = await fetch(`${API_BASE_URL}/api/agent/slickpay/create-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Agent-Access-Token': getAgentAccessToken() || '' },
        body: JSON.stringify({ offerId: offer.id }),
      });
      const data = await response.json();
      if (!response.ok || !data.success || !data.paymentUrl) {
        setMessage(data.error || bi('Impossible de préparer le paiement SlickPay.', 'تعذّر تحضير الدفع عبر SlickPay.'));
        return;
      }
      window.location.assign(data.paymentUrl);
    } catch {
      setMessage(bi('Erreur de connexion à SlickPay. Réessaie dans un instant.', 'تعذّر الاتصال بـ SlickPay. أعد المحاولة بعد لحظة.'));
    } finally {
      setBusyOfferId(null);
    }
  };

  const walletRemainingSeconds = Math.max(0, Number(wallet?.remaining_seconds || 0));
  const walletProgressPercent = Math.min(100, Math.max(0, Number(wallet?.progress_percent || 0)));
  const scrollToTopups = () => document.getElementById('agent-topups')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const renderOffer = (offer: AgentPricingOffer) => {
    const isPlan = offer.kind === 'subscription';
    const isBusy = busyOfferId === offer.id;
    const pricePerMinute = offer.priceDzd / offer.minutes;
    return (
      <article key={offer.id} className={`relative flex h-full flex-col overflow-hidden rounded-[24px] border p-5 transition sm:p-6 ${offer.highlighted ? 'border-violet-300 bg-gradient-to-br from-white via-violet-50/80 to-fuchsia-50/60 shadow-[0_18px_48px_rgba(109,40,217,.12)]' : 'border-white/90 bg-white/70 shadow-[0_12px_38px_rgba(49,24,90,.06)] backdrop-blur-xl'}`}>
        {offer.highlighted && <span className="absolute end-4 top-4 rounded-full bg-violet-700 px-3 py-1 text-[9px] font-black uppercase tracking-wide text-white">{bi('Meilleur rapport', 'أفضل قيمة')}</span>}
        <div className="flex items-start gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${offer.highlighted ? 'bg-violet-700 text-white' : 'bg-violet-100 text-violet-700'}`}><CreditCard className="h-5 w-5" /></span>
          <div className="min-w-0 pe-20 sm:pe-24">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-violet-700">{isPlan ? bi('Forfait mensuel', 'عرض شهري') : bi('Recharge de minutes', 'شحن الدقائق')}</p>
            <h3 className="mt-1 text-lg font-extrabold text-slate-950">{isArabic ? offer.nameAr : offer.nameFr}</h3>
          </div>
        </div>
        <div className="mt-5 flex items-end gap-2">
          <strong className="text-3xl font-black tracking-tight text-slate-950">{formatDzd(offer.priceDzd, isArabic)}</strong>
          {isPlan && <span className="pb-1 text-xs font-semibold text-slate-500">{bi('/ mois', '/ شهر')}</span>}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-violet-100 bg-white/75 px-3.5 py-3">
          <span className="text-sm font-extrabold text-slate-800">{offer.minutes} {bi('minutes', 'دقيقة')}</span>
          <span className="text-[10px] font-bold text-slate-500">{new Intl.NumberFormat(isArabic ? 'ar-DZ' : 'fr-DZ', { maximumFractionDigits: 0 }).format(pricePerMinute)} {bi('DA / min', 'دج / دقيقة')}</span>
        </div>
        <p className="mt-3 min-h-10 text-xs leading-5 text-slate-500">
          {isPlan
            ? bi('Un forfait pour accueillir vos clients et traiter leurs demandes chaque mois.', 'عرض شهري لاستقبال الزبائن والتعامل مع طلباتهم.')
            : bi('Ajoutez des minutes lorsque votre forfait est presque épuisé.', 'زيد دقائق كي يقرب يكمّل العرض تاعك.')}
        </p>
        <button type="button" onClick={() => void beginCheckout(offer)} disabled={isBusy} className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold text-white transition disabled:cursor-wait disabled:opacity-70 ${offer.highlighted ? 'bg-violet-700 hover:bg-violet-600' : 'bg-slate-950 hover:bg-violet-700'}`}>
          {isBusy ? <AudioLines className="h-4 w-4 animate-pulse" /> : <CreditCard className="h-4 w-4" />}
          {isBusy ? bi('Préparation…', 'جاري التحضير…') : previewMode ? bi('Continuer avec mon compte Sawtify', 'واصل بحساب Sawtify تاعك') : bi('Payer avec SlickPay', 'ادفع عبر SlickPay')}
        </button>
      </article>
    );
  };

  return (
    <div className="space-y-5">
      <section className="saw-glass rounded-[26px] p-4 sm:p-6">
        <SectionHeading icon={CreditCard} title={bi('Forfaits Agent Sawtify', 'عروض Agent Sawtify')} subtitle={bi('Choisissez votre volume mensuel. Le paiement de chaque forfait passe par SlickPay.', 'اختار حجم الدقائق الشهري. الدفع لكل عرض يتم عبر SlickPay.')} />
        <div className="grid gap-4 lg:grid-cols-2">{plans.map(renderOffer)}</div>
        <div className="mt-5 rounded-2xl border border-violet-100 bg-white/65 p-3.5 text-[11px] leading-5 text-slate-600">
          <ShieldCheck className="me-2 inline h-4 w-4 align-[-3px] text-emerald-600" />
          {bi('Paiement en une fois via SlickPay · CIB et Edahabia · renouvellement manuel.', 'دفع مرة واحدة عبر SlickPay · CIB والذهبية · تجديد يدوي.')}
        </div>
      </section>

      {!previewMode && (
        <section className={`rounded-[24px] border p-4 sm:p-5 ${wallet?.low_balance ? 'border-amber-300 bg-amber-50/90' : 'border-violet-100 bg-white/80'}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-black text-slate-950">{bi('Solde de minutes', 'رصيد الدقائق')}</h2>
                {wallet?.plan_active && <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[9px] font-bold text-violet-800">{bi('Forfait actif', 'العرض نشط')}</span>}
              </div>
              <p className="mt-2 text-2xl font-black tracking-tight text-violet-900" aria-live="polite">
                {isLoadingHistory && !wallet ? bi('Chargement…', 'جاري التحميل…') : formatRemainingDuration(walletRemainingSeconds, isArabic)}
              </p>
              <p className="mt-1 text-[10px] leading-4 text-slate-600">
                {wallet
                  ? bi(`Forfait : ${formatRemainingDuration(wallet.plan_seconds_remaining, false)} · Recharges : ${formatRemainingDuration(wallet.topup_seconds_remaining, false)}`, `العرض: ${formatRemainingDuration(wallet.plan_seconds_remaining, true)} · الشحن: ${formatRemainingDuration(wallet.topup_seconds_remaining, true)}`)
                  : isLoadingHistory ? bi('Lecture du solde exact sur votre compte.', 'جاري قراءة الرصيد الدقيق من حسابك.') : bi('Aucun solde de minutes disponible pour le moment.', 'ما كاينش رصيد دقائق حالياً.')}
                {wallet?.plan_active && wallet.plan_expires_at && <span className="ms-1">· {bi('Forfait valable jusqu’au', 'العرض صالح حتى')} {new Date(wallet.plan_expires_at).toLocaleDateString(isArabic ? 'ar-DZ' : 'fr-DZ')}</span>}
              </p>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label={bi('Minutes restantes', 'الدقائق المتبقية')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={walletProgressPercent}>
                <div className={`h-full rounded-full transition-all duration-500 ${wallet?.low_balance ? 'bg-amber-500' : 'bg-gradient-to-r from-violet-600 to-fuchsia-500'}`} style={{ width: `${walletProgressPercent}%` }} />
              </div>
              <div className="mt-1.5 flex justify-between text-[9px] font-semibold text-slate-500"><span>{bi('Minutes consommées', 'دقائق مستهلكة')}</span><span>{walletProgressPercent.toFixed(1)} % {bi('restant', 'متبقي')}</span></div>
              <p className="mt-2 text-[9px] leading-4 text-slate-500">{bi('Le débit se fait à la seconde : le forfait passe d’abord, puis les recharges. La page client actuelle est encore une démo et ne consomme pas ce solde.', 'يتم الخصم بالثانية: يُستهلك العرض أولاً ثم الشحن. صفحة الزبون الحالية معاينة ولا تخصم من هذا الرصيد بعد.')}</p>
            </div>
            <button type="button" onClick={scrollToTopups} className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-extrabold text-white transition ${wallet?.low_balance ? 'bg-amber-600 hover:bg-amber-700' : 'bg-violet-700 hover:bg-violet-600'}`}>
              <Plus className="h-4 w-4" />{bi(wallet?.low_balance ? 'Recharger avant épuisement' : 'Recharger des minutes', wallet?.low_balance ? 'اشحن قبل ما يكمل الرصيد' : 'اشحن الدقائق')}
            </button>
          </div>
          {wallet?.low_balance && <p role="status" className="mt-3 rounded-xl border border-amber-200 bg-white/80 px-3 py-2 text-[10px] font-bold text-amber-900">{walletRemainingSeconds <= 0 ? bi('Votre solde est épuisé. Rechargez pour reprendre l’utilisation.', 'رصيدك كمل. اشحن باش تواصل الاستعمال.') : bi('Votre solde approche de zéro. Une recharge est disponible ci-dessous.', 'رصيدك راه يقرب يكمل. تقدر تشحن من الخيارات لتحت.')}</p>}
        </section>
      )}

      <section id="agent-topups" className="saw-glass scroll-mt-6 rounded-[26px] p-4 sm:p-6">
        <SectionHeading icon={Wallet} title={bi('Recharges hors forfait', 'شحن خارج العرض')} subtitle={bi('Besoin de minutes supplémentaires ? Ajoutez une recharge avec SlickPay.', 'تحتاج دقائق إضافية؟ زيد رصيدك بالدفع عبر SlickPay.')} />
        <div className="grid gap-4 sm:grid-cols-2">{topups.map(renderOffer)}</div>
      </section>

      {message && <p role="status" aria-live="polite" className="rounded-2xl border border-violet-100 bg-white/80 px-4 py-3 text-xs font-semibold text-slate-700">{message}</p>}

      {!previewMode && (
        <section className="saw-glass rounded-[26px] p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><h2 className="text-base font-black text-slate-950">{bi('Mes paiements Agent', 'دفعات Agent')}</h2><p className="mt-1 text-xs text-slate-500">{bi('Retrouvez les forfaits et recharges commandés.', 'تلقى هنا العروض وعمليات الشحن.')}</p></div>
            <CalendarDays className="h-5 w-5 text-violet-600" />
          </div>
          {isLoadingHistory ? <p className="py-5 text-center text-xs text-slate-500">{bi('Chargement…', 'جاري التحميل…')}</p> : payments.length ? (
            <div className="space-y-2">
              {payments.slice(0, 5).map((payment) => <div key={payment.invoice_id || `${payment.offer_id}-${payment.created_at}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white/75 px-3.5 py-3 text-xs"><span className="font-bold text-slate-800">{payment.offer_name} · {payment.minutes} {bi('min', 'د')}</span><span className="font-black text-slate-900">{formatDzd(Number(payment.amount_dzd), isArabic)}</span><span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${payment.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : payment.status === 'failed' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{payment.status === 'completed' ? bi('Payé', 'مدفوع') : payment.status === 'failed' ? bi('Échoué', 'فشل') : bi('En attente', 'قيد الانتظار')}</span></div>)}
            </div>
          ) : <p className="rounded-2xl border border-dashed border-violet-200 bg-white/55 px-4 py-7 text-center text-xs text-slate-500">{bi('Aucun paiement Agent pour le moment.', 'ما كاين حتى دفع Agent حالياً.')}</p>}
        </section>
      )}

      {previewMode && <p className="text-center text-[10px] leading-4 text-slate-500">{bi('Les offres sont visibles en aperçu. Connectez-vous à votre compte Sawtify — ou créez-en un — pour régler un forfait via SlickPay.', 'العروض باينة في المعاينة. سجّل الدخول لحساب Sawtify تاعك، ولا أنشئ حساب واحد، باش تشتري عرض عبر SlickPay.')}</p>}
    </div>
  );
}

function ProductCard({ product, isArabic, onEdit, onDelete, onToggle }: { product: AgentProduct; isArabic: boolean; onEdit: () => void; onDelete: () => void; onToggle: () => void }) {
  const bi = (fr: string, ar: string) => isArabic ? ar : fr;
  return (
    <article className="rounded-2xl border border-slate-100 bg-white/90 p-4 transition hover:border-violet-200 hover:shadow-md hover:shadow-violet-900/[.03]">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-50 text-violet-700"><ShoppingBag className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-extrabold text-slate-950">{product.name}</h3><span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${product.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{product.active ? bi('En ligne', 'معروض') : bi('Masqué', 'مخفي')}</span></div><p className="mt-1 text-[10px] text-slate-500">{product.category}</p></div>
        <span className="shrink-0 text-sm font-black text-violet-800">{formatDzd(product.priceDzd, isArabic)}</span>
      </div>
      {product.description && <p className="mt-3 text-xs leading-5 text-slate-600">{product.description}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-[10px] font-semibold text-slate-500">
        <span className="inline-flex items-center gap-1.5"><Package className="h-3.5 w-3.5 text-violet-500" />{product.stock > 0 ? `${product.stock} ${bi('en stock', 'في المخزون')}` : <span className="font-bold text-rose-600">{bi('Rupture de stock', 'نفد المخزون')}</span>}</span>
        {product.sizes.length > 0 && <span>{bi('Tailles', 'المقاسات')}: {product.sizes.join(', ')}</span>}
        <div className="ms-auto flex items-center gap-1">
          <button type="button" onClick={onToggle} className="rounded-lg p-2 text-slate-400 transition hover:bg-violet-50 hover:text-violet-700" aria-label={product.active ? bi('Masquer', 'إخفاء') : bi('Afficher', 'إظهار')}>{product.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
          <button type="button" onClick={onEdit} className="rounded-lg p-2 text-slate-400 transition hover:bg-violet-50 hover:text-violet-700" aria-label={bi('Modifier', 'تعديل')}><Pencil className="h-4 w-4" /></button>
          <button type="button" onClick={onDelete} className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" aria-label={bi('Supprimer', 'حذف')}><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
    </article>
  );
}

function OrderCard({ order, isArabic, onStatusChange }: { order: AgentOrder; isArabic: boolean; onStatusChange: (status: AgentOrderStatus) => void }) {
  const bi = (fr: string, ar: string) => isArabic ? ar : fr;
  const statusColors: Record<AgentOrderStatus, string> = {
    new: 'bg-amber-50 text-amber-800 border-amber-200',
    confirmed: 'bg-sky-50 text-sky-800 border-sky-200',
    delivered: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  };
  const waPhone = order.phone.replace(/\D/g, '').replace(/^0/, '213');
  const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(bi(`Bonjour ${order.customerName}, je vous contacte pour votre demande ${order.productName}.`, `سلام ${order.customerName}، نتصل بيك بخصوص طلبك ${order.productName}.`))}`;
  const date = new Date(order.createdAt);
  return (
    <article className="rounded-2xl border border-slate-100 bg-white/90 p-4 sm:flex sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><ShoppingBag className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><h3 className="text-sm font-extrabold text-slate-950">{order.customerName}</h3><span className="text-[10px] text-slate-400">{Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(isArabic ? 'ar-DZ' : 'fr-DZ', { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
          <p className="mt-1 text-xs font-semibold text-slate-700">{order.productName}{order.size ? ` · ${bi('Taille', 'المقاس')} ${order.size}` : ''}{order.quantity > 1 ? ` · ×${order.quantity}` : ''}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500"><span className="inline-flex items-center gap-1"><Truck className="h-3.5 w-3.5" />{order.wilaya}</span><span>{order.phone}</span></div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 sm:mt-0 sm:border-0 sm:pt-0">
        <span className="text-sm font-black text-slate-950">{formatDzd(order.amountDzd, isArabic)}</span>
        <select aria-label={bi('Statut de la commande', 'حالة الطلب')} value={order.status} onChange={(event) => onStatusChange(event.target.value as AgentOrderStatus)} className={`rounded-full border px-2.5 py-1.5 text-[10px] font-bold outline-none ${statusColors[order.status]}`}>
          <option value="new">{bi('À confirmer', 'بانتظار التأكيد')}</option><option value="confirmed">{bi('Confirmée', 'مؤكدة')}</option><option value="delivered">{bi('Livrée', 'تم التوصيل')}</option>
        </select>
        <a href={waUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[10px] font-bold text-emerald-800 transition hover:bg-emerald-100"><MessageCircle className="h-3.5 w-3.5" />{bi('Contacter', 'اتصل')}</a>
      </div>
    </article>
  );
}

function LinkSection({ store, link, qrImage, isArabic, onChangeSlug, onCopy, onOpen, onDownloadQr, onNotice }: { store: AgentStore; link: string; qrImage: string; isArabic: boolean; onChangeSlug: (slug: string) => void; onCopy: () => void; onOpen: () => void; onDownloadQr: () => void; onNotice: (message: string) => void }) {
  const bi = (fr: string, ar: string) => isArabic ? ar : fr;
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(bi(`Parlez directement avec ${store.name} : ${link}`, `اهدر مباشرة مع ${store.name}: ${link}`))}`;
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_.76fr]">
      <section className="saw-glass rounded-[26px] p-4 sm:p-6">
        <SectionHeading icon={Link2} title="Sawtify Call Link" subtitle={bi('Votre lien est prêt à partager. Ajoutez-le à votre bio Instagram, TikTok ou Facebook : vos clients ouvrent la page et découvrent votre boutique.', 'رابطك جاهز للمشاركة. زيدو في بايو Instagram ولا TikTok ولا Facebook باش زبائنك يكتشفو متجرك.')} />
        <FormField label={bi('Nom court de votre lien', 'الاسم المختصر للرابط')}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center rounded-xl border border-slate-200 bg-white px-3">
              <span className="shrink-0 text-[11px] font-semibold text-slate-400">{window.location.host}/call/</span>
              <input value={store.slug} onChange={(event) => onChangeSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} maxLength={36} className="min-w-0 flex-1 bg-transparent py-3 text-sm font-bold text-violet-800 outline-none" placeholder="ma-boutique" aria-label={bi('Nom court du lien', 'الاسم المختصر للرابط')} />
            </div>
            <button type="button" onClick={() => { if (!store.slug.trim()) { onNotice(bi('Choisis un nom pour ton lien.', 'اختار اسم للرابط.')); return; } onNotice(bi('Lien prêt à être partagé.', 'الرابط جاهز للمشاركة.')); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 text-xs font-extrabold text-white transition hover:bg-violet-600"><Check className="h-4 w-4" />{bi('Enregistrer', 'حفظ')}</button>
          </div>
          <p className="mt-2 text-[10px] leading-4 text-slate-500">{bi('Lettres sans accents, chiffres et tirets. Exemple : atelier-amine.', 'حروف لاتينية وأرقام وشرطات فقط. مثال: atelier-amine.')}</p>
        </FormField>
        <div className="mt-5 rounded-2xl border border-violet-100 bg-white p-3">
          <div className="flex items-center gap-2"><Link2 className="h-4 w-4 shrink-0 text-violet-600" /><input readOnly value={link} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 bg-transparent text-xs font-bold text-slate-700 outline-none" aria-label={bi('Votre lien client', 'رابط الزبون')} /></div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={onCopy} className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-violet-600"><Copy className="h-4 w-4" />{bi('Copier le lien', 'نسخ الرابط')}</button>
          <a href={shareUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"><MessageCircle className="h-4 w-4" />WhatsApp</a>
          <button type="button" onClick={onOpen} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-xs font-bold text-violet-800 transition hover:bg-violet-50"><ExternalLink className="h-4 w-4" />{bi('Aperçu client', 'معاينة صفحة الزبون')}</button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Mic2, title: bi('Parler', 'يهدر'), text: bi('Le client peut essayer la démo vocale.', 'الزبون يقدر يجرب المعاينة الصوتية.') },
            { icon: ShieldCheck, title: bi('Sans compte', 'بلا حساب'), text: bi('Un simple lien, aucune inscription.', 'رابط بسيط بلا تسجيل.') },
            { icon: Store, title: bi('Vos infos', 'معلوماتك'), text: bi('Catalogue et réponses à jour.', 'كتالوج وإجابات محدّثة.') },
          ].map(({ icon: Icon, title, text }) => <div key={title} className="rounded-2xl border border-slate-100 bg-white/75 p-3"><Icon className="h-4 w-4 text-violet-700" /><p className="mt-2 text-[11px] font-extrabold text-slate-800">{title}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">{text}</p></div>)}
        </div>
      </section>
      <section className="saw-glass flex flex-col items-center rounded-[26px] p-4 text-center sm:p-6">
        <div className="flex w-full items-start justify-between gap-3 text-start"><div><h2 className="text-lg font-black text-slate-950">{bi('Votre QR code', 'رمز QR تاعك')}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{bi('À imprimer sur vos emballages, cartes ou affiches.', 'اطبعو على التغليف، الكارطات ولا الإعلانات.')}</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><QrCode className="h-5 w-5" /></span></div>
        <div className="mt-5 w-full max-w-[280px] rounded-[26px] border border-violet-100 bg-white p-4 shadow-[0_16px_45px_rgba(49,24,90,.08)]">
          {qrImage ? <img src={qrImage} alt={bi(`QR code de ${store.name}`, `رمز QR لمتجر ${store.name}`)} className="mx-auto aspect-square w-full rounded-xl" /> : <div className="aspect-square animate-pulse rounded-xl bg-violet-50" />}
          <p className="mt-3 text-xs font-extrabold text-slate-900">{store.name || bi('Votre boutique', 'متجرك')}</p>
          <p className="mt-1 truncate text-[10px] font-semibold text-violet-700">{link}</p>
        </div>
        <button type="button" onClick={onDownloadQr} disabled={!qrImage} className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 py-3 text-xs font-extrabold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50"><ArrowDownToLine className="h-4 w-4" />{bi('Télécharger le QR (PNG)', 'تحميل QR (PNG)')}</button>
        <p className="mt-3 text-[10px] leading-4 text-slate-500">{bi('Conseil : gardez une bonne taille d’impression pour faciliter le scan.', 'نصيحة: اطبعو بحجم واضح باش يسهل المسح.')}</p>
      </section>
    </div>
  );
}

function ProductDialog({ product, isArabic, onClose, onSave }: { product: AgentProduct | null; isArabic: boolean; onClose: () => void; onSave: (product: AgentProduct) => void }) {
  const bi = (fr: string, ar: string) => isArabic ? ar : fr;
  const [name, setName] = useState(product?.name || '');
  const [category, setCategory] = useState(product?.category || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product ? String(product.priceDzd) : '');
  const [stock, setStock] = useState(product ? String(product.stock) : '');
  const [sizes, setSizes] = useState(product?.sizes.join(', ') || '');
  const [error, setError] = useState('');
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(price);
    const quantity = Number(stock);
    if (!name.trim() || !Number.isFinite(amount) || amount < 0 || !Number.isFinite(quantity) || quantity < 0) { setError(bi('Vérifie le nom, le prix et le stock.', 'تأكّد من الاسم والسعر والمخزون.')); return; }
    onSave({ id: product?.id || makeAgentId('p'), name: name.trim(), category: category.trim() || bi('Autre', 'أخرى'), description: description.trim(), priceDzd: amount, stock: quantity, sizes: sizes.split(/[,،]/).map((item) => item.trim()).filter(Boolean), active: product?.active ?? true });
  };
  return <DialogShell title={product ? bi('Modifier le produit', 'تعديل المنتج') : bi('Ajouter un produit', 'إضافة منتج')} isArabic={isArabic} onClose={onClose}>
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2"><FormField label={bi('Nom du produit *', 'اسم المنتج *')}><input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={80} className={inputClass} /></FormField><FormField label={bi('Catégorie', 'الصنف')}><input value={category} onChange={(event) => setCategory(event.target.value)} maxLength={50} className={inputClass} /></FormField><FormField label={bi('Prix (DA) *', 'السعر (دج) *')}><input type="number" min="0" step="1" value={price} onChange={(event) => setPrice(event.target.value)} className={inputClass} /></FormField><FormField label={bi('Stock disponible *', 'المخزون المتاح *')}><input type="number" min="0" step="1" value={stock} onChange={(event) => setStock(event.target.value)} className={inputClass} /></FormField><FormField label={bi('Tailles / variantes', 'المقاسات / الخيارات')} className="sm:col-span-2"><input value={sizes} onChange={(event) => setSizes(event.target.value)} placeholder={bi('Ex. 38, 39, 40 ou Unique', 'مثال: 38، 39، 40 أو مقاس واحد')} className={inputClass} /></FormField><FormField label={bi('Description', 'الوصف')} className="sm:col-span-2"><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={280} className={`${inputClass} resize-y`} /></FormField></div>
      {error && <p role="alert" className="text-xs font-semibold text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">{bi('Annuler', 'إلغاء')}</button><button type="submit" className="rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-violet-600">{bi('Enregistrer', 'حفظ')}</button></div>
    </form>
  </DialogShell>;
}

function FaqDialog({ faq, isArabic, onClose, onSave }: { faq: AgentFAQ | null; isArabic: boolean; onClose: () => void; onSave: (faq: AgentFAQ) => void }) {
  const bi = (fr: string, ar: string) => isArabic ? ar : fr;
  const [question, setQuestion] = useState(faq?.question || '');
  const [answer, setAnswer] = useState(faq?.answer || '');
  const [error, setError] = useState('');
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!question.trim() || !answer.trim()) { setError(bi('Ajoute une question et une réponse.', 'أضف السؤال والجواب.')); return; }
    onSave({ id: faq?.id || makeAgentId('faq'), question: question.trim(), answer: answer.trim(), active: faq?.active ?? true });
  };
  return <DialogShell title={faq ? bi('Modifier la réponse', 'تعديل الإجابة') : bi('Ajouter une question', 'إضافة سؤال')} isArabic={isArabic} onClose={onClose}>
    <form onSubmit={submit} className="space-y-4"><FormField label={bi('Question du client *', 'سؤال الزبون *')}><input autoFocus value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={180} placeholder={bi('Ex. Livrez-vous à Oran ?', 'مثال: توصلو لوهران؟')} className={inputClass} /></FormField><FormField label={bi('Réponse de votre assistant *', 'جواب المساعد *')}><textarea value={answer} onChange={(event) => setAnswer(event.target.value)} rows={5} maxLength={500} placeholder={bi('Écrivez une réponse claire et utile…', 'اكتب جواب واضح ومفيد…')} className={`${inputClass} resize-y leading-6`} /></FormField>{error && <p role="alert" className="text-xs font-semibold text-rose-600">{error}</p>}<div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">{bi('Annuler', 'إلغاء')}</button><button type="submit" className="rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-violet-600">{bi('Enregistrer', 'حفظ')}</button></div></form>
  </DialogShell>;
}

function DialogShell({ title, isArabic, onClose, children }: { title: string; isArabic: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-label={title} dir={isArabic ? 'rtl' : 'ltr'} className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] border border-white bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-[28px] sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-lg font-black text-slate-950">{title}</h2><button type="button" onClick={onClose} className="rounded-xl bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200" aria-label={isArabic ? 'إغلاق' : 'Fermer'}><X className="h-4 w-4" /></button></div>
        {children}
      </section>
    </div>
  );
}

function FormField({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block min-w-0 ${className}`}><span className="mb-1.5 block text-[11px] font-bold text-slate-700">{label}</span>{children}</label>;
}

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100';

function EmptyState({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle: string }) {
  return <div className="rounded-2xl border border-dashed border-violet-200 bg-white/55 px-5 py-10 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><Icon className="h-5 w-5" /></span><h3 className="mt-3 text-sm font-extrabold text-slate-900">{title}</h3><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">{subtitle}</p></div>;
}

function orderStatusLabel(status: AgentOrderStatus, isArabic: boolean) {
  const labels: Record<AgentOrderStatus, [string, string]> = {
    new: ['À confirmer', 'بانتظار التأكيد'],
    confirmed: ['Confirmée', 'مؤكدة'],
    delivered: ['Livrée', 'تم التوصيل'],
  };
  return labels[status][isArabic ? 1 : 0];
}
