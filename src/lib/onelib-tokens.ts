// Logique serveur des jetons de normalisation Onelib (voir BUSINESS-PLAN.md).
// Séparé de onelib-config.ts (constantes pures, importables côté client)
// car ce fichier dépend de Prisma.

import { prisma } from './db';

export async function hasUnlimitedNormalization(userId: string): Promise<boolean> {
  const subscription = await prisma.onelibSubscription.findUnique({ where: { userId } });
  return !!subscription && subscription.status === 'active' && subscription.plan === 'label';
}

/**
 * Débite un jeton si le solde le permet. Opération atomique (le WHERE porte
 * sur la condition de solde) pour éviter qu'un double appel concurrent ne
 * fasse passer le solde sous zéro. Renvoie true si un jeton a bien été
 * débité, false si le solde était insuffisant (aucune modification faite).
 */
export async function consumeNormalizationToken(userId: string): Promise<boolean> {
  const result = await prisma.user.updateMany({
    where: { id: userId, normalizationTokens: { gte: 1 } },
    data: { normalizationTokens: { decrement: 1 } },
  });
  return result.count > 0;
}
