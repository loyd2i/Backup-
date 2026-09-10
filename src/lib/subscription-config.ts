// Configuration de l'abonnement studio (s'ajoute à la commission par
// réservation, ne la remplace pas — voir BUSINESS-PLAN.md).

export type SubscriptionPlan = 'monthly' | 'annual';

export interface SubscriptionPlanConfig {
  plan: SubscriptionPlan;
  label: string;
  monthlyPrice: number; // prix affiché par mois
  commitmentMonths: number; // durée d'engagement
  description: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlanConfig[] = [
  {
    plan: 'monthly',
    label: 'Mensuel sans engagement',
    monthlyPrice: 12,
    commitmentMonths: 1,
    description: 'Résiliable à tout moment.',
  },
  {
    plan: 'annual',
    label: 'Annuel',
    monthlyPrice: 10,
    commitmentMonths: 12,
    description: 'Engagement 1 an, tarif réduit.',
  },
];

export function getSubscriptionPlanConfig(plan: string): SubscriptionPlanConfig {
  return SUBSCRIPTION_PLANS.find((p) => p.plan === plan) || SUBSCRIPTION_PLANS[0];
}
