import { prisma } from '@/lib/db';
import type { Referral } from '@prisma/client';
import { REFERRAL_BONUS_POINTS } from '@/lib/referral-config';
import { notifyReferralReward } from '@/lib/notifications';

async function markReferralGranted(referralId: string): Promise<void> {
  await prisma.referral.update({
    where: { id: referralId },
    data: { rewardGranted: true, rewardGrantedAt: new Date() },
  });
}

// Tente d'accorder la récompense "1 mois d'abonnement offert" à un parrain
// studio : ne peut s'appliquer que s'il a un abonnement actif à prolonger.
// Retourne false si rien n'a pu être accordé (le parrainage reste en
// attente, repris plus tard par grantPendingReferralRewardForNewSubscriber).
async function tryGrantStudioReferralReward(referral: Referral): Promise<boolean> {
  const studio = await prisma.studio.findFirst({ where: { ownerId: referral.referrerId } });
  const subscription = studio
    ? await prisma.studioSubscription.findUnique({ where: { studioId: studio.id } })
    : null;

  if (!subscription || subscription.status !== 'active') return false;

  const base = subscription.currentPeriodEnd > new Date() ? subscription.currentPeriodEnd : new Date();
  const extended = new Date(base);
  extended.setMonth(extended.getMonth() + 1);

  await prisma.studioSubscription.update({
    where: { id: subscription.id },
    data: { currentPeriodEnd: extended },
  });
  await markReferralGranted(referral.id);
  await notifyReferralReward(referral.referrerId, 'un mois d\'abonnement studio offert.');
  return true;
}

async function isReferredUserActive(userId: string): Promise<boolean> {
  const asArtist = await prisma.appointment.findFirst({ where: { userId, status: 'completed' } });
  if (asArtist) return true;

  const studio = await prisma.studio.findFirst({ where: { ownerId: userId } });
  if (!studio) return false;

  const asStudio = await prisma.appointment.findFirst({ where: { studioId: studio.id, status: 'completed' } });
  return !!asStudio;
}

// Accorde la récompense de parrainage en attente pour ce filleul, s'il y en
// a une : appelée à chaque première session menée à terme (voir
// completeAppointment), qui sert de signal "filleul actif" (voir
// BUSINESS-PLAN.md "Croissance et rétention"). Idempotent : ne fait rien si
// aucun parrainage en attente n'existe pour cet utilisateur. Si le parrain
// est un studio sans abonnement actif à prolonger, le parrainage reste en
// attente jusqu'à ce qu'il souscrive (voir
// grantPendingReferralRewardForNewSubscriber).
export async function grantReferralRewardIfPending(referredUserId: string): Promise<void> {
  const referral = await prisma.referral.findFirst({
    where: { referredUserId, rewardGranted: false },
    include: { referrer: true },
  });
  if (!referral) return;

  if (referral.referrer.role === 'studio_owner') {
    await tryGrantStudioReferralReward(referral);
  } else {
    await prisma.user.update({
      where: { id: referral.referrerId },
      data: { referralBonusPoints: { increment: REFERRAL_BONUS_POINTS } },
    });
    await markReferralGranted(referral.id);
    await notifyReferralReward(referral.referrerId, `${REFERRAL_BONUS_POINTS} points bonus.`);
  }
}

// Reprend un parrainage laissé en attente faute d'abonnement actif, au
// moment où le parrain studio souscrit enfin : si son filleul est déjà
// actif, la récompense est accordée immédiatement sur ce nouvel abonnement.
export async function grantPendingReferralRewardForNewSubscriber(studioOwnerId: string): Promise<void> {
  const referral = await prisma.referral.findFirst({
    where: { referrerId: studioOwnerId, rewardGranted: false },
  });
  if (!referral) return;

  const active = await isReferredUserActive(referral.referredUserId);
  if (!active) return;

  await tryGrantStudioReferralReward(referral);
}
