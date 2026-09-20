import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ONELIB_SUBSCRIPTION_PLANS, getOnelibSubscriptionPlanConfig, type OnelibSubscriptionPlan } from '@/lib/onelib-config';

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

// GET - État de l'abonnement Onelib de l'utilisateur + son solde de jetons
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const [subscription, freshUser] = await Promise.all([
      prisma.onelibSubscription.findUnique({ where: { userId: user.id } }),
      prisma.user.findUnique({ where: { id: user.id }, select: { normalizationTokens: true } }),
    ]);

    return NextResponse.json({
      subscription,
      tokens: freshUser?.normalizationTokens ?? 0,
      unlimited: subscription?.status === 'active' && subscription.plan === 'label',
      plans: ONELIB_SUBSCRIPTION_PLANS,
    });
  } catch (error) {
    console.error('Error fetching Onelib subscription:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Souscrire (ou changer) de plan Onelib (simulé — pas de vrai Stripe)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const body = await request.json();
    const plan = body.plan as OnelibSubscriptionPlan;
    const planConfig = getOnelibSubscriptionPlanConfig(plan);
    if (!planConfig) {
      return NextResponse.json({ error: 'Plan invalide' }, { status: 400 });
    }

    const existing = await prisma.onelibSubscription.findUnique({ where: { userId: user.id } });
    if (existing && existing.status === 'active' && existing.plan === plan) {
      return NextResponse.json({ error: 'Ce plan est déjà actif' }, { status: 400 });
    }

    const now = new Date();
    const currentPeriodEnd = addMonths(now, 1);

    const subscription = await prisma.onelibSubscription.upsert({
      where: { userId: user.id },
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
        userId: user.id,
        plan,
        monthlyPrice: planConfig.monthlyPrice,
        status: 'active',
        startedAt: now,
        currentPeriodEnd,
        stripeSubscriptionId: `sub_demo_${Date.now()}`,
      },
    });

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error('Error creating Onelib subscription:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH - Résilier à l'échéance ou réactiver un abonnement en cours
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const existing = await prisma.onelibSubscription.findUnique({ where: { userId: user.id } });
    if (!existing || existing.status !== 'active') {
      return NextResponse.json({ error: 'Aucun abonnement actif' }, { status: 404 });
    }

    const body = await request.json();

    if (body.cancelAtPeriodEnd === true) {
      const subscription = await prisma.onelibSubscription.update({
        where: { userId: user.id },
        data: { cancelAtPeriodEnd: true, cancelledAt: new Date() },
      });
      return NextResponse.json({ subscription });
    }

    if (body.cancelAtPeriodEnd === false) {
      const subscription = await prisma.onelibSubscription.update({
        where: { userId: user.id },
        data: { cancelAtPeriodEnd: false, cancelledAt: null },
      });
      return NextResponse.json({ subscription });
    }

    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  } catch (error) {
    console.error('Error updating Onelib subscription:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
