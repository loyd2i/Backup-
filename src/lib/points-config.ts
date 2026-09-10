// Points fidélité (gamification) — voir BUSINESS-PLAN.md.
//
// Représentation ludique de l'argent réellement engagé par l'artiste sur la
// plateforme (frais de service déjà payés, non remboursés). Ce ne sont QUE
// des points d'affichage : ils ne sont ni échangeables entre utilisateurs,
// ni convertibles en cash par qui que ce soit — aucun mécanisme de transfert
// ou de remboursement n'existe pour eux. C'est ce qui permet de rester hors
// du champ de la réglementation e-money.

export const POINTS_PER_EURO = 100;

export interface PointsTier {
  name: string;
  minPoints: number;
}

export const POINTS_TIERS: PointsTier[] = [
  { name: 'Débutant', minPoints: 0 },
  { name: 'Bronze', minPoints: 1000 },
  { name: 'Argent', minPoints: 5000 },
  { name: 'Or', minPoints: 15000 },
  { name: 'Platine', minPoints: 40000 },
];

export function getPointsTier(points: number): { current: PointsTier; next: PointsTier | null; pointsToNext: number | null } {
  let current = POINTS_TIERS[0];
  let next: PointsTier | null = null;
  for (let i = 0; i < POINTS_TIERS.length; i++) {
    if (points >= POINTS_TIERS[i].minPoints) {
      current = POINTS_TIERS[i];
      next = POINTS_TIERS[i + 1] || null;
    }
  }
  return { current, next, pointsToNext: next ? next.minPoints - points : null };
}
