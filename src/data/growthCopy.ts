/**
 * TEXTES MARKETING — tout le « super-marketing / psychologie d'achat » est ici,
 * dans un seul fichier, en français et en darija/arabe. Modifier un texte = modifier ici.
 *
 * Les chiffres (points, prix, %) ne sont JAMAIS écrits en dur : ils viennent du serveur
 * (offres) ou de src/config/growth.ts, donc le texte ne peut pas mentir sur l'offre réelle.
 */
import type { LanguageCode } from './voices';

export interface GrowthCopy {
  // — Price framing (page tarifs) —
  framingBanner: string;
  perVoiceStarter: (perVoice: number) => string;
  perVoicePopular: (perVoice: number) => string;
  perVoiceBonus: (perVoice: number, bonusPercent: number) => string;
  perVoicePlain: (perVoice: number) => string;
  /** Badge « offre de bienvenue » sur le pack d'entrée (1re recharge) : +N points offerts. */
  welcomeBadge: (bonusPoints: number) => string;

  // — Offre de première recharge (pop-up fin de solde) —
  flashTitle: string;
  flashBody: (bonusPercent: number, priceDZD: number) => string;
  flashCountdownLabel: string;
  entryTitle: string;
  entryBody: (total: number, base: number, priceDZD: number) => string;
  entryValidToday: string;
  firstOfferBadge: string;
  flashBadge: string;
  instead: string;
  pointsUnit: string;
  ctaFlash: (bonusPercent: number) => string;
  ctaEntry: (priceDZD: number) => string;
  noThanks: string;
  trust: string;
  outOfPoints: string;

  // — Bandeaux page tarifs —
  pricingOfferBanner: (total: number, base: number, priceDZD: number) => string;
  pricingFlashBanner: (bonusPercent: number, priceDZD: number) => string;
  expiresIn: string;
  cashbackBanner: (percent: number) => string;
  cashbackExpiresIn: string;
  cashbackBadge: (percent: number) => string;
  confirmBonusLine: string;
  bonusPointsLabel: string;
  pointsAdded: (points: number) => string;

  // — Cashback (notification après paiement) —
  cashbackTitle: string;
  cashbackBody: (percent: number, days: number) => string;
  cashbackCta: string;
  close: string;

  // — Parrainage (50 pts UNIQUEMENT pour l'expéditeur du lien) —
  referralTitle: string;
  referralBody: (myPoints: number, generations: number) => string;
  referralCopy: string;
  referralCopied: string;
  referralWhatsapp: string;
  referralShare: string;
  referralWhatsappMessage: (link: string, points: number) => string;
  referralStats: (rewarded: number, pending: number, earned: number) => string;
  referralFriendProgress: (done: number, required: number) => string;
  referralFriendDone: string;
  referralInviteButton: string;
  referralLinkLabel: string;
  referralBanner: string;
  referralBannerCta: string;
  referralClaimed: (generations: number) => string;
  referralRewardedReferrer: (points: number) => string;
}

const fr: GrowthCopy = {
  framingBanner: 'Moins de 100 DZD la voix-off — jusqu’à 10× moins cher qu’un comédien voix-off.',
  perVoiceStarter: (n) => `(≈ ${n} DZD seulement par voix-off)`,
  perVoicePopular: (n) => `(≈ ${n} DZD par voix-off — le plus demandé)`,
  perVoiceBonus: (n, pct) => `(≈ ${n} DZD par voix-off — +${pct} % de points offerts)`,
  perVoicePlain: (n) => `(≈ ${n} DZD par voix-off)`,
  welcomeBadge: (pts) => `Offre de bienvenue : +${pts} points gratuits`,

  flashTitle: '⏳ Offre de première recharge : 5 minutes seulement !',
  flashBody: (pct, price) => `Rechargez maintenant et obtenez +${pct} % de points bonus sur le pack ${price.toLocaleString('fr-FR')} DZD.`,
  flashCountdownLabel: 'Cette offre exceptionnelle expire dans :',
  entryTitle: 'Offre de première recharge',
  entryBody: (total, base, price) => `Obtenez ${total} points au lieu de ${base} points pour votre premier paiement de ${price.toLocaleString('fr-FR')} DZD aujourd’hui.`,
  entryValidToday: 'Valable aujourd’hui, pour votre 1ʳᵉ recharge uniquement.',
  firstOfferBadge: '1ʳᵉ recharge',
  flashBadge: 'Flash 5 min',
  instead: 'au lieu de',
  pointsUnit: 'points',
  ctaFlash: (pct) => `Profiter du bonus +${pct} %`,
  ctaEntry: (price) => `Commencer à ${price.toLocaleString('fr-FR')} DZD`,
  noThanks: 'Non merci, peut-être plus tard',
  trust: 'Paiement sécurisé Edahabia / CIB • Sans abonnement • Points sans expiration',
  outOfPoints: 'Vous n’avez plus de points',

  pricingOfferBanner: (total, base, price) => `Offre de première recharge : ${total} points au lieu de ${base} pour ${price.toLocaleString('fr-FR')} DZD.`,
  pricingFlashBanner: (pct, price) => `Flash : +${pct} % de points sur le pack ${price.toLocaleString('fr-FR')} DZD.`,
  expiresIn: 'Expire dans',
  cashbackBanner: (pct) => `🎁 Cashback actif : +${pct} % de points offerts sur votre prochaine recharge.`,
  cashbackExpiresIn: 'Valable encore',
  cashbackBadge: (pct) => `Cashback +${pct} %`,
  confirmBonusLine: 'dont bonus',
  bonusPointsLabel: 'Bonus',
  pointsAdded: (points) => `+${points} points ajoutés à votre compte`,

  cashbackTitle: '🎁 Bravo !',
  cashbackBody: (pct, days) => `On a ajouté à ton compte un cashback de +${pct} % de points bonus sur ta prochaine recharge, valable ${days} jours seulement.`,
  cashbackCta: 'Voir les packs',
  close: 'Fermer',

  referralTitle: '🎁 Ne paie plus tes voix-off dès aujourd’hui !',
  referralBody: (mine, gens) => `Envoie ton lien à un ami : dès qu’il teste ${gens} voix (il recharge pour la 3ᵉ), tu reçois ${mine} points gratuits. Copie le lien et partage-le !`,
  referralCopy: 'Copier mon lien',
  referralCopied: 'Lien copié ✓',
  referralWhatsapp: 'WhatsApp',
  referralShare: 'Partager',
  referralWhatsappMessage: (link, points) => `Essaie Sawtify, la voix-off IA en darija 🎙️ Crée ton compte avec mon lien — je gagne ${points} points quand tu testes 3 voix : ${link}`,
  referralStats: (rewarded, pending, earned) => `${rewarded} ami(s) validé(s) • ${pending} en cours • ${earned} points gagnés`,
  referralFriendProgress: (done, required) => `Invitation d’un ami : ${done}/${required} voix testées`,
  referralFriendDone: 'Invitation d’un ami validée ✓',
  referralInviteButton: 'Invite un ami +50',
  referralLinkLabel: 'Ton lien personnel',
  referralBanner: '🎁 Un ami t’invite sur Sawtify : crée ton compte et teste la voix-off IA.',
  referralBannerCta: 'Créer mon compte',
  referralClaimed: (gens) => `🎁 Invitation activée ! Teste ${gens} voix pour valider le parrainage de ton ami.`,
  referralRewardedReferrer: (points) => `🎉 Ton ami a testé Sawtify : +${points} points pour toi !`,
};

const ar: GrowthCopy = {
  framingBanner: 'الفويس أوف يطيحلك بأقل من 100 دج برك — أرخص بـ 10 مرات من معلق صوتي حقيقي.',
  perVoiceStarter: (n) => `(حوالي ${n} دج فقط لكل فويس أوف)`,
  perVoicePopular: (n) => `(حوالي ${n} دج برك لكل فويس أوف — الأكثر طلباً)`,
  perVoiceBonus: (n, pct) => `(حوالي ${n} دج برك لكل فويس أوف — +${pct}% نقاط إضافية)`,
  perVoicePlain: (n) => `(حوالي ${n} دج لكل فويس أوف)`,
  welcomeBadge: (pts) => `عرض الترحيب: +${pts} نقطة مجانية`,

  flashTitle: '⏳ عرض الشحن الأول لخمس دقائق فقط!',
  flashBody: (pct, price) => `اشحن حسابك الآن واحصل على +${pct}% نقاط إضافية (بونيس) على باقة ${price.toLocaleString('en-US')} دج.`,
  flashCountdownLabel: 'ينتهي هذا العرض الاستثنائي خلال:',
  entryTitle: 'عرض الشحن الأول',
  entryBody: (total, base, price) => `احصل على ${total} نقطة بدل ${base} نقطة عند أول دفع بقيمة ${price.toLocaleString('en-US')} دج اليوم.`,
  entryValidToday: 'صالح اليوم، للشحنة الأولى فقط.',
  firstOfferBadge: 'الشحنة الأولى',
  flashBadge: 'فلاش 5 دقائق',
  instead: 'بدل',
  pointsUnit: 'نقطة',
  ctaFlash: (pct) => `استفد من بونيس +${pct}%`,
  ctaEntry: (price) => `ابدأ بـ ${price.toLocaleString('en-US')} دج`,
  noThanks: 'لا شكراً، ربما فيما بعد',
  trust: 'دفع آمن Edahabia / CIB • بدون اشتراك • نقاط بدون انتهاء صلاحية',
  outOfPoints: 'رصيدك من النقاط انتهى',

  pricingOfferBanner: (total, base, price) => `عرض الشحن الأول: ${total} نقطة بدل ${base} مقابل ${price.toLocaleString('en-US')} دج.`,
  pricingFlashBanner: (pct, price) => `فلاش: +${pct}% نقاط إضافية على باقة ${price.toLocaleString('en-US')} دج.`,
  expiresIn: 'ينتهي خلال',
  cashbackBanner: (pct) => `🎁 كاشباك مفعّل: +${pct}% نقاط إضافية على شحنتك الجاية.`,
  cashbackExpiresIn: 'صالح لمدة',
  cashbackBadge: (pct) => `كاشباك +${pct}%`,
  confirmBonusLine: 'منها بونيس',
  bonusPointsLabel: 'بونيس',
  pointsAdded: (points) => `تمت إضافة +${points} نقطة إلى حسابك`,

  cashbackTitle: '🎁 مبروك!',
  cashbackBody: (pct, days) => `حطينا في حسابك كاشباك بقيمة +${pct}% نقاط إضافية على شحنتك الجاية، صالحة لمدة ${days} أيام برك.`,
  cashbackCta: 'شوف الباقات',
  close: 'إغلاق',

  referralTitle: '🎁 ما تزيدش تخلص على الفويس أوف من اليوم!',
  referralBody: (mine, gens) => `ابعت الرابط لصاحبك: كي يجرب ${gens} أصوات (يشحن على الثالثة)، تدي أنت ${mine} نقطة باطل. كبس على الرابط وبارتاجي!`,
  referralCopy: 'انسخ الرابط تاعي',
  referralCopied: 'تم النسخ ✓',
  referralWhatsapp: 'واتساب',
  referralShare: 'مشاركة',
  referralWhatsappMessage: (link, points) => `جرب Sawtify، فويس أوف بالذكاء الاصطناعي بالدارجة 🎙️ سجل بالرابط تاعي — نربح ${points} نقطة كي تجرب 3 أصوات: ${link}`,
  referralStats: (rewarded, pending, earned) => `${rewarded} صديق مؤكّد • ${pending} في الانتظار • ${earned} نقطة ربحتها`,
  referralFriendProgress: (done, required) => `دعوة صديق: ${done}/${required} أصوات مجرّبة`,
  referralFriendDone: 'تم تأكيد دعوة الصديق ✓',
  referralInviteButton: 'ادعُ صديق +50',
  referralLinkLabel: 'الرابط الشخصي تاعك',
  referralBanner: '🎁 صاحبك يدعوك لـ Sawtify: سجل وجرب الفويس أوف بالذكاء الاصطناعي.',
  referralBannerCta: 'أنشئ حسابي',
  referralClaimed: (gens) => `🎁 تم تفعيل الدعوة! جرب ${gens} أصوات باش يتأكد باريناج صاحبك.`,
  referralRewardedReferrer: (points) => `🎉 صاحبك جرب السيت: +${points} نقطة ليك!`,
};

export function getGrowthCopy(lang: LanguageCode = 'fr'): GrowthCopy {
  return lang === 'ar' ? ar : fr;
}
