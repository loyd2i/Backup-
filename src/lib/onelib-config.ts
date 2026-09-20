// Constantes Onelib partagées client/serveur (aucune dépendance Prisma ici,
// contrairement à src/lib/onelib.ts, pour rester importable côté client).

// Forfait de distribution par sortie (modèle TuneCore), débité à la demande.
// Voir BUSINESS-PLAN.md : pas de forfait illimité tant que le traitement
// reste manuel, chaque sortie a un vrai coût de traitement pour l'équipe.
export const ONELIB_DISTRIBUTION_FEE = 50;

// Aperçu "streaming" normalisé (30s, A/B) : mise à niveau de loudness +
// anti-écrêtage, calculée et rendue immédiatement côté client (pas de
// traitement manuel) - système de jetons plutôt qu'un tarif fixe par
// génération (voir BUSINESS-PLAN.md, section "Normalisation audio").
// Coût marginal quasi nul (pas de traitement humain), donc un forfait
// illimité (label) est sain ici, contrairement à la distribution Onelib.
export const ONELIB_TOKEN_PRICE = 2; // € par jeton, achat à l'unité
export const ONELIB_SIGNUP_TOKENS = 3; // offerts à l'inscription, cumulables, jamais renouvelés

export type OnelibSubscriptionPlan = 'artiste' | 'label';

export interface OnelibSubscriptionPlanConfig {
  plan: OnelibSubscriptionPlan;
  label: string;
  monthlyPrice: number;
  monthlyTokens: number | null; // null = illimité
  description: string;
}

export const ONELIB_SUBSCRIPTION_PLANS: OnelibSubscriptionPlanConfig[] = [
  {
    plan: 'artiste',
    label: 'Artiste',
    monthlyPrice: 10,
    monthlyTokens: 10,
    description: '10 jetons offerts chaque mois, cumulables si non utilisés.',
  },
  {
    plan: 'label',
    label: 'Label',
    monthlyPrice: 39,
    monthlyTokens: null,
    description: 'Normalisations illimitées.',
  },
];

export function getOnelibSubscriptionPlanConfig(plan: string): OnelibSubscriptionPlanConfig | undefined {
  return ONELIB_SUBSCRIPTION_PLANS.find((p) => p.plan === plan);
}
