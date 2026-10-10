export type AgentOfferKind = 'subscription' | 'topup';

export interface AgentPricingOffer {
  id: string;
  kind: AgentOfferKind;
  nameFr: string;
  nameAr: string;
  minutes: number;
  priceDzd: number;
  highlighted?: boolean;
}

/** Coût maximum estimé par minute pour le modèle économique Agent Sawtify. */
export const AGENT_ESTIMATED_COST_PER_MINUTE_DZD = 7.5;

/** Tarifs communiqués pour les forfaits et recharges Agent Sawtify. */
export const AGENT_PRICING_OFFERS: readonly AgentPricingOffer[] = [
  {
    id: 'agent_plan_100',
    kind: 'subscription',
    nameFr: 'Essentiel',
    nameAr: 'أساسي',
    minutes: 100,
    priceDzd: 8900,
  },
  {
    id: 'agent_plan_300',
    kind: 'subscription',
    nameFr: 'Business',
    nameAr: 'أعمال',
    minutes: 300,
    priceDzd: 12000,
    highlighted: true,
  },
  {
    id: 'agent_topup_50',
    kind: 'topup',
    nameFr: 'Recharge 50 min',
    nameAr: 'شحن 50 دقيقة',
    minutes: 50,
    priceDzd: 2500,
  },
  {
    id: 'agent_topup_100',
    kind: 'topup',
    nameFr: 'Recharge 100 min',
    nameAr: 'شحن 100 دقيقة',
    minutes: 100,
    priceDzd: 4500,
  },
] as const;

export function calculateAgentOfferEconomics(offer: AgentPricingOffer) {
  const estimatedCostDzd = offer.minutes * AGENT_ESTIMATED_COST_PER_MINUTE_DZD;
  const grossMarginDzd = offer.priceDzd - estimatedCostDzd;
  return {
    estimatedCostDzd,
    grossMarginDzd,
    grossMarginPercent: offer.priceDzd > 0 ? (grossMarginDzd / offer.priceDzd) * 100 : 0,
    resalePricePerMinuteDzd: offer.priceDzd / offer.minutes,
  };
}
