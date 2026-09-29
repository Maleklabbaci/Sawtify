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

  // — Parrainage —
  referralTitle: string;
  referralBody: (friendPoints: number, myPoints: number, generations: number) => string;
  referralCopy: string;
  referralCopied: string;
  referralWhatsapp: string;
  referralShare: string;
  referralWhatsappMessage: (link: string, points: number) => string;
  referralStats: (rewarded: number, pending: number, earned: number) => string;
  referralFriendProgress: (done: number, required: number, points: number) => string;
  referralFriendDone: (points: number) => string;
  referralInviteButton: string;
  referralLinkLabel: string;
  referralBanner: (points: number) => string;
  referralBannerCta: string;
  referralClaimed: (generations: number, points: number) => string;
  referralRewardedFriend: (points: number) => string;
  referralRewardedReferrer: (points: number) => string;
}

const fr: GrowthCopy = {
  framingBanner: 'Moins de 100 DZD la voix-off — jusqu’à 10× moins cher qu’un comédien voix-off.',
  perVoiceStarter: (n) => `(≈ ${n} DZD seulement par voix-off)`,
  perVoicePopular: (n) => `(≈ ${n} DZD par voix-off — le plus demandé)`,
  perVoiceBonus: (n, pct) => `(≈ ${n} DZD par voix-off — +${pct} % de points offerts)`,
  perVoicePlain: (n) => `(≈ ${n} DZD par voix-off)`,

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
  referralBody: (friend, mine, gens) => `Envoie Sawtify à ton ami : il n’a qu’à tester ${gens} voix, tu gagnes ${mine} points et il gagne ${friend} points, gratuit. Copie le lien et partage-le !`,
  referralCopy: 'Copier mon lien',
  referralCopied: 'Lien copié ✓',
  referralWhatsapp: 'WhatsApp',
  referralShare: 'Partager',
  referralWhatsappMessage: (link, points) => `Essaie Sawtify, la voix-off IA en darija 🎙️ Crée ton compte avec mon lien et on gagne chacun ${points} points gratuits : ${link}`,
  referralStats: (rewarded, pending, earned) => `${rewarded} ami(s) validé(s) • ${pending} en cours • ${earned} points gagnés`,
  referralFriendProgress: (done, required, points) => `Parrainage : ${done}/${required} voix testées — encore ${required - done} pour gagner ${points} points 🎁`,
  referralFriendDone: (points) => `Parrainage validé : +${points} points reçus 🎉`,
  referralInviteButton: 'Invite un ami +50',
  referralLinkLabel: 'Ton lien personnel',
  referralBanner: (points) => `🎁 Un ami t’offre ${points} points gratuits : crée ton compte et teste 3 voix.`,
  referralBannerCta: 'Créer mon compte',
  referralClaimed: (gens, points) => `🎁 Parrainage activé ! Teste ${gens} voix et gagne ${points} points.`,
  referralRewardedFriend: (points) => `🎉 Parrainage validé : +${points} points offerts !`,
  referralRewardedReferrer: (points) => `🎉 Ton ami a testé Sawtify : +${points} points pour toi !`,
};

const ar: GrowthCopy = {
  framingBanner: 'الفويس أوف يطيحلك بأقل من 100 دج برك — أرخص بـ 10 مرات من معلق صوتي حقيقي.',
  perVoiceStarter: (n) => `(حوالي ${n} دج فقط لكل فويس أوف)`,
  perVoicePopular: (n) => `(حوالي ${n} دج برك لكل فويس أوف — الأكثر طلباً)`,
  perVoiceBonus: (n, pct) => `(حوالي ${n} دج برك لكل فويس أوف — +${pct}% نقاط إضافية)`,
  perVoicePlain: (n) => `(حوالي ${n} دج لكل فويس أوف)`,

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
  referralBody: (friend, mine, gens) => `ابعت السيت لصاحبك، غير يجرب ${gens} أصوات برك، تدي أنت ${mine} نقطة وهو يدي ${friend} نقطة باطل. كبس على الرابط وبارتاجي!`,
  referralCopy: 'انسخ الرابط تاعي',
  referralCopied: 'تم النسخ ✓',
  referralWhatsapp: 'واتساب',
  referralShare: 'مشاركة',
  referralWhatsappMessage: (link, points) => `جرب Sawtify، فويس أوف بالذكاء الاصطناعي بالدارجة 🎙️ سجل بالرابط تاعي ونربحو كل واحد ${points} نقطة باطل: ${link}`,
  referralStats: (rewarded, pending, earned) => `${rewarded} صديق مؤكّد • ${pending} في الانتظار • ${earned} نقطة ربحتها`,
  referralFriendProgress: (done, required, points) => `الإحالة: ${done}/${required} أصوات مجرّبة — باقي ${required - done} باش تاخذ ${points} نقطة 🎁`,
  referralFriendDone: (points) => `تم تأكيد الإحالة: +${points} نقطة وصلتك 🎉`,
  referralInviteButton: 'ادعُ صديق +50',
  referralLinkLabel: 'الرابط الشخصي تاعك',
  referralBanner: (points) => `🎁 صاحبك يهديك ${points} نقطة باطل: سجل وجرب 3 أصوات.`,
  referralBannerCta: 'أنشئ حسابي',
  referralClaimed: (gens, points) => `🎁 تم تفعيل الإحالة! جرب ${gens} أصوات وخذ ${points} نقطة.`,
  referralRewardedFriend: (points) => `🎉 تم تأكيد الإحالة: +${points} نقطة هدية!`,
  referralRewardedReferrer: (points) => `🎉 صاحبك جرب السيت: +${points} نقطة ليك!`,
};

export function getGrowthCopy(lang: LanguageCode = 'fr'): GrowthCopy {
  return lang === 'ar' ? ar : fr;
}
