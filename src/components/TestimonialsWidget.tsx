import React, { useMemo, useState } from "react";
import { Star, ChevronLeft, ChevronRight, ShieldCheck, PenLine, Quote } from "lucide-react";

/**
 * ═══════════════════════════════════════════════════════════════════════
 * TestimonialsWidget — "Ce que disent nos clients" (darija algérienne)
 * ───────────────────────────────────────────────────────────────────────
 * Repris du widget fourni et intégré au design system Sawtify :
 * mêmes couleurs (PURPLE / AMBER / INK / PAPER / BORDER), même police
 * (Cairo pour l'arabe), mêmes composants de carte/pagination que le reste
 * de la landing page (card-lift, hov-ink, dots de pagination).
 *
 * Les avis restent volontairement en darija (c'est le cœur du widget),
 * seuls les libellés d'interface (titre, boutons, aria-labels) suivent
 * la langue active du site (isRTL).
 *
 * "Voir plus" et "Ajouter votre avis" redirigent tous les deux vers la
 * connexion (onSignIn), comme demandé.
 * ═══════════════════════════════════════════════════════════════════════
 */

const INK = "#1A0F2E";
const PAPER = "#FAF6EE";
const PURPLE = "#6B2DBC";
const PURPLE_SOFT = "#F0E8FA";
const AMBER = "#E9A13B";
const BORDER = "#E5DCCB";

const AR_STACK = "'Cairo', sans-serif";
const MONO_STACK = "'Space Grotesk', 'Inter', sans-serif";

// Palette d'avatars — reprend les teintes déjà utilisées pour les voix sur la plateforme
const AVATAR_COLORS = [PURPLE, "#C13B5E", "#2C5E9E", "#D97706", "#0F766E", "#6B7A34", "#A4123F", "#E15A0B", "#44617E"];

interface Testimonial {
  id: number;
  name: string;
  role: string;
  initials: string;
  rating: number;
  date: string;
  badge: string;
  text: string;
}

const TESTIMONIALS: Testimonial[] = [
  { id: 1, name: "Amine Saadi", role: "متجر ملابس رجالية", initials: "AS", rating: 5, date: "منذ ساعتين", badge: "مشتري موثق", text: "الخدمة خرافية! كنت نخسر 2000 دج على كل تعليق صوتي للفيديوهات. درك نخدم 4 فيديوهات فاليوم والدقة عالية!" },
  { id: 2, name: "Naya Shop", role: "مستحضرات تجميل", initials: "NS", rating: 5, date: "منذ 5 ساعات", badge: "متجر معتمد", text: "الصوت بالدارجة الجزائرية طالع فور بزاف. نسبة المبيعات طلعت بعدما بدينا نستعملوه فالستوريات والإعلانات." },
  { id: 3, name: "Karim Benali", role: "E-commerce DZ", initials: "KB", rating: 5, date: "منذ يوم واحد", badge: "مستخدم بريميوم", text: "سرعة خيالية فالتوليد! فيديو إعلاني كملتو في 5 دقائق برك. النبرة جيدة وتفهم المصطلحات تاعنا." },
  { id: 4, name: "Nina Nina", role: "صانعة محتوى وديكور", initials: "NN", rating: 5, date: "منذ يومين", badge: "صانع محتوى", text: "سلسلة الفيديوهات اليومية ولات تجيني ساهلة. نخدم 4 فيديوهات فاليوم بلا تعب وبلا حس فالميزون." },
  { id: 5, name: "Dz Store Express", role: "متجر إلكتروني شامل", initials: "DZ", rating: 5, date: "منذ يومين", badge: "متجر معتمد", text: "وفرت علينا ميزانية كبيرة تع الصوتيات. الدارجة تاعنا مخدومة صحشي ترجمة جافة!" },
  { id: 6, name: "Chaima Beauty", role: "مؤثرة الجمال", initials: "CB", rating: 5, date: "منذ 3 أيام", badge: "صانع محتوى", text: "الـ voiceover يخرج طبيعي بزاف والناس تحسب بصح طفلة دزايرية تسجل فالميكرو! تحفة بجد." },
  { id: 7, name: "Mohamed Slimani", role: "تسويق رقمي", initials: "MS", rating: 5, date: "منذ 3 أيام", badge: "مستخدم موثق", text: "أحسن أداة لصانع المحتوى فالجزائر. التفاعل فالتيكتوك والانستغرام زاد بـ 300% بعدما استعملتها." },
  { id: 8, name: "Zaki Sneakers", role: "متجر أحذية", initials: "ZS", rating: 5, date: "منذ 4 أيام", badge: "متجر معتمد", text: "كنت نضيع الوقت ننسق مع الفويس أوفر ونستنى أيام، درك نكتب النص ونخرج الفيديو الإعلاني في ثواني." },
  { id: 9, name: "Youcef Design", role: "مصمم فيديوهات", initials: "YD", rating: 5, date: "منذ 4 أيام", badge: "مصمم موثق", text: "السرعة والجودة في أداء النبرات الصوتية ممتازة. ننصح بيها كل واحد يخدم التجارة الإلكترونية." },
  { id: 10, name: "Meriem Khelifi", role: "تسويق بالمحتوى", initials: "MK", rating: 5, date: "منذ 5 أيام", badge: "مستخدم موثق", text: "طبيعية الصوت وتنوع النبرات خلات الإعلانات تاعنا تجيب نتائج ممتازة ونسبة تحويل سريعة." },
  { id: 11, name: "Dz Tech Review", role: "مراجعات تقنية", initials: "TR", rating: 5, date: "منذ 5 أيام", badge: "صفحة تقنية", text: "الـ AI تعكم يفهم الدارجة والكلمات الفرنكو-جزائرية بدقة عالية. حاجة فور تشرف المنتج المحلي!" },
  { id: 12, name: "Samy Digital", role: "وكالة إعلانية", initials: "SD", rating: 5, date: "منذ أسبوع", badge: "وكالة معتمدة", text: "بدلنا كامل طريقة صناعة المحتوى للزبائن تاعنا، نقصنا تكاليف الإنتاج بنسبة 80% والخدمة سريعة." },
  { id: 13, name: "Lynda Mode", role: "أزياء نسائية", initials: "LM", rating: 5, date: "منذ أسبوع", badge: "متجر معتمد", text: "كنت ديما نلقى مشكل مع وقت التسليم تاع التعليق الصوتي، درك نتحكم في الوقت وندير عدة تجارب في دقائق." },
  { id: 14, name: "Yassine Tech", role: "صانع محتوى", initials: "YT", rating: 5, date: "منذ أسبوعين", badge: "مستخدم بريميوم", text: "الصوت ينطق المصطلحات الجزائرية كيما نهدروها فالزنقة، بدون تكلف. يعطاكم الصحة!" },
  { id: 15, name: "Bio Dz Care", role: "منتجات طبيعية", initials: "BD", rating: 5, date: "منذ أسبوعين", badge: "متجر موثق", text: "الزبائن يتعاطفوا أكثر مع الفيديوهات لأن الصوت جزائري محلي ودافئ. المبيعات زادت والحمد لله." },
  { id: 16, name: "Billel Auto", role: "مستلزمات سيارات", initials: "BA", rating: 5, date: "منذ 3 أسابيع", badge: "متجر معتمد", text: "خدمة عملاء ونتائج ممتازة. درنا بيها أزيد من 50 إعلان متوافق مع الفيسبوك والتيكتوك بأقل تكلفة." },
  { id: 17, name: "Sara Home", role: "مستلزمات منزلية", initials: "SH", rating: 5, date: "منذ 3 أسابيع", badge: "صانع محتوى", text: "نقدر نوجد محتوى أسبوع كامل في ساعة وحدة! ربحت الوقت والمال وسهلت عليا التسويق اليومي." },
  { id: 18, name: "Omar Cargo", role: "خدمات شحن وتوصيل", initials: "OC", rating: 5, date: "منذ شهر", badge: "مستخدم موثق", text: "السرعة والدقة والتكلفة المنخفضة، كامل هاد الأمور خلاتنا نعتمدوا على المنصة كلياً في كامل حملاتنا." },
];

const PER_PAGE = 6;

export interface TestimonialsWidgetProps {
  isRTL: boolean;
  /** Appelé par "Voir plus" ET "Ajouter votre avis" — les deux ouvrent la connexion */
  onSignIn: () => void;
}

const TestimonialsWidget: React.FC<TestimonialsWidgetProps> = ({ isRTL, onSignIn }) => {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(TESTIMONIALS.length / PER_PAGE);

  const t = useMemo(() => ({
    eyebrow: isRTL ? "شهادات العملاء" : "Avis clients",
    title: isRTL ? "آراء عملائنا بالدارجة الجزائرية 🇩🇿" : "Ce que disent nos clients, en darija 🇩🇿",
    sub: isRTL
      ? "تجارب حقيقية لأصحاب المتاجر وصنّاع المحتوى اللي يستعملوا صوتيفي كل نهار."
      : "Des retours authentiques de commerçants et créateurs de contenu qui utilisent Sawtify au quotidien.",
    ratingBadge: isRTL ? "4.9 / 5 تقييم ممتازة" : "4.9 / 5 — Note excellente",
    ratingCount: isRTL ? `(${TESTIMONIALS.length} شهادة موثقة)` : `(${TESTIMONIALS.length} avis vérifiés)`,
    trust: isRTL ? "آراء حقيقية لمستخدمي المنصة" : "Avis réels de nos utilisateurs",
    seeMore: isRTL ? "شاهد المزيد من الآراء" : "Voir plus d'avis",
    addReview: isRTL ? "أضف رأيك" : "Ajouter votre avis",
    verified: isRTL ? "لنشر رأيك، سجّل دخولك أولاً" : "Connectez-vous pour publier votre propre avis",
    page: isRTL ? "الصفحة" : "Page",
    of: isRTL ? "من" : "sur",
    prev: isRTL ? "الآراء السابقة" : "Avis précédents",
    next: isRTL ? "الآراء التالية" : "Avis suivants",
  }), [isRTL]);

  const current = TESTIMONIALS.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  const goPrev = () => setPage((p) => Math.max(0, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages - 1, p + 1));

  return (
    <section
      id="avis"
      aria-labelledby="avis-title"
      className="py-14 sm:py-24"
      style={{ background: PAPER }}
    >
      <div className="mx-auto max-w-[1280px] px-5 sm:px-6">
        {/* ── En-tête ── */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-9 sm:mb-12">
          <div className="max-w-2xl">
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-bold mb-3 px-3 py-1 rounded-full"
              style={{ color: PURPLE, background: PURPLE_SOFT, fontFamily: MONO_STACK }}
            >
              <Star className="w-3.5 h-3.5" style={{ color: AMBER, fill: AMBER }} />
              {t.eyebrow}
            </span>
            <h2
              id="avis-title"
              className="text-[clamp(1.9rem,4.2vw,3.1rem)] leading-[1.08] tracking-[-0.015em] font-extrabold"
              style={{ color: INK, fontFamily: isRTL ? AR_STACK : undefined }}
            >
              {t.title}
            </h2>
            <p className="mt-4 text-[14px] sm:text-[15px] text-[#1A0F2E]/65 leading-relaxed">
              {t.sub}
            </p>
          </div>

          {/* Badge de confiance, aligné à droite sur desktop, sous le titre sur mobile */}
          <div className="flex items-center gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-[11px] font-semibold text-[#1A0F2E]/70 shrink-0"
            style={{ borderColor: BORDER }}>
            <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: "#0F766E" }} />
            <span>{t.trust}</span>
          </div>
        </div>

        {/* ── Bandeau note ── */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 mb-7 sm:mb-9">
          <span className="inline-flex items-center gap-1 text-[13px] font-extrabold" style={{ color: INK }}>
            <Star className="w-4 h-4" style={{ color: AMBER, fill: AMBER }} />
            {t.ratingBadge}
          </span>
          <span className="text-[12px] text-[#1A0F2E]/45 font-medium">{t.ratingCount}</span>
        </div>

        {/* ── Grille de cartes (6 par page, responsive : 1 / 2 / 3 colonnes) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5" dir="rtl">
          {current.map((item, i) => {
            const color = AVATAR_COLORS[item.id % AVATAR_COLORS.length];
            return (
              <div
                key={item.id}
                className="relative flex flex-col justify-between rounded-2xl border bg-white p-5 sm:p-6 card-lift overflow-hidden"
                style={{ borderColor: BORDER, animationDelay: `${i * 0.04}s` }}
              >
                <Quote className="absolute -top-2 -end-1 w-16 h-16 opacity-[0.05] pointer-events-none" style={{ color: PURPLE }} aria-hidden />

                <div className="relative">
                  {/* En-tête carte : avatar + nom + badge */}
                  <div className="flex items-start justify-between gap-3 mb-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl text-white font-extrabold text-[12px] flex items-center justify-center shrink-0 shadow-sm"
                        style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, fontFamily: MONO_STACK }}
                      >
                        {item.initials}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-[13px] sm:text-[13.5px] leading-tight truncate" style={{ color: INK, fontFamily: AR_STACK }}>
                          {item.name}
                        </h3>
                        <p className="text-[11px] text-[#1A0F2E]/45 mt-0.5 truncate" style={{ fontFamily: AR_STACK }}>
                          {item.role}
                        </p>
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 whitespace-nowrap"
                      style={{ color: "#0F766E", background: "#0F766E12", borderColor: "#0F766E30", fontFamily: AR_STACK }}
                    >
                      {item.badge}
                    </span>
                  </div>

                  {/* Étoiles + date */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-0.5" dir="ltr">
                      {Array.from({ length: 5 }).map((_, si) => (
                        <Star key={si} className="w-3 h-3" style={{ color: si < item.rating ? AMBER : "#E5DCCB", fill: si < item.rating ? AMBER : "#E5DCCB" }} />
                      ))}
                    </div>
                    <span className="text-[10px] text-[#1A0F2E]/40 shrink-0" style={{ fontFamily: AR_STACK }}>{item.date}</span>
                  </div>

                  {/* Texte de l'avis */}
                  <p className="text-[12.5px] sm:text-[13px] leading-relaxed text-[#1A0F2E]/80" style={{ fontFamily: AR_STACK }}>
                    {item.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Pagination (même look que le carrousel de témoignages existant) ── */}
        {totalPages > 1 && (
          <div className="mt-8 sm:mt-10 flex items-center justify-center gap-4">
            <button type="button" onClick={goPrev} disabled={page === 0} aria-label={t.prev}
              className="w-10 h-10 rounded-full border bg-white hov-ink text-[#1A0F2E]/60 flex items-center justify-center focus-ring disabled:opacity-30 disabled:cursor-not-allowed transition"
              style={{ borderColor: BORDER }}>
              {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={i} type="button" onClick={() => setPage(i)} aria-label={`${t.page} ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${i === page ? "w-6" : "w-1.5 bg-[#1A0F2E]/20 hover:bg-[#1A0F2E]/40"}`}
                  style={i === page ? { background: PURPLE } : undefined} />
              ))}
            </div>
            <button type="button" onClick={goNext} disabled={page === totalPages - 1} aria-label={t.next}
              className="w-10 h-10 rounded-full border bg-white hov-ink text-[#1A0F2E]/60 flex items-center justify-center focus-ring disabled:opacity-30 disabled:cursor-not-allowed transition"
              style={{ borderColor: BORDER }}>
              {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* ── Actions : les deux boutons ouvrent la connexion ── */}
        <div className="mt-9 sm:mt-11 pt-7 sm:pt-8 border-t flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4" style={{ borderColor: BORDER }}>
          <button type="button" onClick={onSignIn}
            className="w-full sm:w-auto h-12 px-6 rounded-full border-2 bg-white hover:bg-[#1A0F2E]/[0.03] text-[13.5px] font-bold transition focus-ring flex items-center justify-center gap-2"
            style={{ borderColor: BORDER, color: INK }}>
            {t.seeMore}
          </button>
          <button type="button" onClick={onSignIn}
            className="w-full sm:w-auto h-12 px-6 rounded-full text-[13.5px] font-bold text-white focus-ring transition hover:brightness-110 flex items-center justify-center gap-2"
            style={{ background: PURPLE, boxShadow: "0 10px 26px -10px rgba(107,45,188,0.7)" }}>
            <PenLine className="w-4 h-4" />
            {t.addReview}
          </button>
        </div>
        <p className="mt-4 text-center text-[11.5px] text-[#1A0F2E]/45">{t.verified}</p>
      </div>
    </section>
  );
};

export default TestimonialsWidget;
