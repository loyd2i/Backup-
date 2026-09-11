import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { SUBSCRIPTION_PLANS, getSubscriptionPlanConfig, type SubscriptionPlan } from '@/lib/subscription-config';
import { grantPendingReferralRewardForNewSubscriber } from '@/lib/referrals';

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

async function requireOwnedStudio(id: string, userId: string) {
  return prisma.studio.findFirst({ where: { id, ownerId: userId } });
}

// GET - État de l'abonnement du studio
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const studio = await requireOwnedStudio(id, user.id);
    if (!studio) {
      return NextResponse.json({ error: 'Studio non trouvé' }, { status: 404 });
    }

    const subscription = await prisma.studioSubscription.findUnique({ where: { studioId: id } });

    return NextResponse.json({ subscription, plans: SUBSCRIPTION_PLANS });
  } catch (error) {
    console.error('Error fetching studio subscription:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Souscrire à un plan (création, simulée — pas de vrai Stripe)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const studio = await requireOwnedStudio(id, user.id);
    if (!studio) {
      return NextResponse.json({ error: 'Studio non trouvé' }, { status: 404 });
    }

    // Un seul forfait possible : engagement annuel obligatoire (voir BUSINESS-PLAN.md)
    const plan: SubscriptionPlan = 'annual';

    const existing = await prisma.studioSubscription.findUnique({ where: { studioId: id } });
    if (existing && existing.status === 'active') {
      return NextResponse.json({ error: 'Un abonnement est déjà actif pour ce studio' }, { status: 400 });
    }

    const planConfig = getSubscriptionPlanConfig(plan);
    const now = new Date();
    const currentPeriodEnd = addMonths(now, planConfig.commitmentMonths);

    const subscription = await prisma.studioSubscription.upsert({
      where: { studioId: id },
      update: {
        plan,
        monthlyPrice: planConfig.monthlyPrice,
        status: 'active',
        startedAt: now,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        stripeSubscriptionId: `sub_demo_${Date.now()}`,
      },
      create: {
        studioId: id,
        plan,
        monthlyPrice: planConfig.monthlyPrice,
        status: 'active',
        startedAt: now,
        currentPeriodEnd,
        stripeSubscriptionId: `sub_demo_${Date.now()}`,
      },
    });

    await grantPendingReferralRewardForNewSubscriber(user.id);

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error('Error creating studio subscription:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH - Résilier à l'échéance ou réactiver un abonnement en cours
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const studio = await requireOwnedStudio(id, user.id);
    if (!studio) {
      return NextResponse.json({ error: 'Studio non trouvé' }, { status: 404 });
    }

    const existing = await prisma.studioSubscription.findUnique({ where: { studioId: id } });
    if (!existing || existing.status !== 'active') {
      return NextResponse.json({ error: 'Aucun abonnement actif pour ce studio' }, { status: 404 });
    }

    const body = await request.json();

    if (body.cancelAtPeriodEnd === true) {
      const subscription = await prisma.studioSubscription.update({
        where: { studioId: id },
        data: { cancelAtPeriodEnd: true, cancelledAt: new Date() },
      });
      return NextResponse.json({ subscription });
    }

    if (body.cancelAtPeriodEnd === false) {
      const subscription = await prisma.studioSubscription.update({
        where: { studioId: id },
        data: { cancelAtPeriodEnd: false, cancelledAt: null },
      });
      return NextResponse.json({ subscription });
    }

    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  } catch (error) {
    console.error('Error updating studio subscription:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
