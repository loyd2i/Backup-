// Configuration de l'abonnement studio (s'ajoute à la commission par
// réservation, ne la remplace pas — voir BUSINESS-PLAN.md).
//
// Un seul forfait, engagement annuel obligatoire : pas d'option mensuelle
// sans engagement (décision produit — voir BUSINESS-PLAN.md).

export type SubscriptionPlan = 'annual';

export interface SubscriptionPlanConfig {
  plan: SubscriptionPlan;
  label: string;
  monthlyPrice: number; // prix affiché par mois
  commitmentMonths: number; // durée d'engagement
  description: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlanConfig[] = [
  {
    plan: 'annual',
    label: 'Annuel',
    monthlyPrice: 12,
    commitmentMonths: 12,
    description: 'Engagement 1 an obligatoire.',
  },
];

export function getSubscriptionPlanConfig(plan: string): SubscriptionPlanConfig {
  return SUBSCRIPTION_PLANS.find((p) => p.plan === plan) || SUBSCRIPTION_PLANS[0];
}
