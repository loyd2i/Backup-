import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { MARKETPLACE_COMMISSION_RATE } from '@/lib/tax-config';

// POST - Achète un article marketplace (paiement simulé, comme le reste de
// l'app : débité et crédité immédiatement au vendeur, commission plateforme
// alignée sur le taux des réservations)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { id } = await params;
    const item = await prisma.marketplaceItem.findUnique({ where: { id } });
    if (!item || !item.isActive) {
      return NextResponse.json({ error: 'Article non trouvé' }, { status: 404 });
    }
    if (item.sellerId === user.id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas acheter votre propre article' }, { status: 400 });
    }

    const existing = await prisma.marketplacePurchase.findUnique({
      where: { buyerId_itemId: { buyerId: user.id, itemId: id } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Vous possédez déjà cet article' }, { status: 400 });
    }

    const commissionAmount = Math.round(item.price * MARKETPLACE_COMMISSION_RATE * 100) / 100;
    const netAmount = Math.round((item.price - commissionAmount) * 100) / 100;

    const [purchase] = await prisma.$transaction([
      prisma.marketplacePurchase.create({
        data: { buyerId: user.id, itemId: id, pricePaid: item.price, commissionAmount },
      }),
      prisma.user.update({
        where: { id: item.sellerId },
        data: { walletBalance: { increment: netAmount } },
      }),
    ]);

    return NextResponse.json({
      purchase,
      payment: {
        amount: item.price,
        sellerAmount: netAmount,
        commissionAmount,
        info: 'Paiement simulé - débité immédiatement, pas de pré-autorisation',
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Erreur achat article marketplace:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
