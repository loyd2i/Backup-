import { prisma } from '@/lib/db';
import { notifyReferralActive } from '@/lib/notifications';

// Marque un parrainage comme actif dès la première session menée à terme
// par le filleul (signal "actif", pas la simple inscription — voir
// BUSINESS-PLAN.md "Croissance et rétention"). Purement informatif : la
// plateforme ne crédite ni ne débite rien ici, elle notifie seulement le
// parrain pour qu'il honore lui-même sa propre offre de parrainage s'il en
// a une (voir Studio.referralOffer) — aucune responsabilité de notre côté.
// Idempotent : ne fait rien si aucun parrainage en attente n'existe pour cet
// utilisateur.
export async function markReferralActiveIfPending(referredUserId: string): Promise<void> {
  const referral = await prisma.referral.findFirst({
    where: { referredUserId, isActive: false },
  });
  if (!referral) return;

  await prisma.referral.update({
    where: { id: referral.id },
    data: { isActive: true, activatedAt: new Date() },
  });

  await notifyReferralActive(referral.referrerId);
}
