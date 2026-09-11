import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { PLATFORM_COMMISSION_RATE, ARTIST_COMMISSION_RATE } from '@/lib/tax-config';

// GET - Packs d'heures possédés par l'utilisateur courant chez ce studio
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { id } = await params;
    const packs = await prisma.hoursPack.findMany({
      where: { userId: user.id, studioId: id },
      orderBy: { purchasedAt: 'desc' },
    });

    return NextResponse.json({ packs });
  } catch (error) {
    console.error('Erreur récupération packs d\'heures:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Acheter un pack d'heures (paiement simulé, comme le reste de l'app :
// débité et crédité immédiatement au studio, pas de pré-autorisation - un pack
// n'est pas rattaché à une séance précise). S'ajoute aux frais de service
// artiste habituels, mêmes taux que les réservations classiques.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { id } = await params;
    const { offerId } = await request.json();
    if (!offerId) return NextResponse.json({ error: 'offerId requis' }, { status: 400 });

    const offer = await prisma.hoursPackOffer.findUnique({ where: { id: offerId } });
    if (!offer || offer.studioId !== id || !offer.isActive) {
      return NextResponse.json({ error: 'Offre non trouvée' }, { status: 404 });
    }

    const commissionAmount = Math.round(offer.price * PLATFORM_COMMISSION_RATE * 100) / 100;
    const netAmount = Math.round((offer.price - commissionAmount) * 100) / 100;
    const description = `Achat pack ${offer.hours}h`;

    const [pack] = await prisma.$transaction([
      prisma.hoursPack.create({
        data: {
          userId: user.id,
          studioId: id,
          totalHours: offer.hours,
          remainingHours: offer.hours,
          pricePaid: offer.price,
        },
      }),
      prisma.studio.update({
        where: { id },
        data: { walletBalance: { increment: netAmount }, totalEarnings: { increment: netAmount } },
      }),
      prisma.walletTransaction.createMany({
        data: [
          { studioId: id, type: 'earning', amount: netAmount, description },
          { studioId: id, type: 'fee', amount: commissionAmount, description: `Commission plateforme (${(PLATFORM_COMMISSION_RATE * 100).toFixed(0)}%)` },
        ],
      }),
    ]);

    const artistCommissionAmount = Math.round(offer.price * ARTIST_COMMISSION_RATE * 100) / 100;

    return NextResponse.json({
      pack,
      payment: {
        amount: offer.price + artistCommissionAmount,
        studioAmount: offer.price,
        artistCommissionAmount,
        info: 'Paiement simulé - débité immédiatement, pas de pré-autorisation',
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Erreur achat pack d\'heures:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
