import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Solde du portefeuille studio + historique des mouvements
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

    const studio = await prisma.studio.findUnique({ where: { id } });

    if (!studio) {
      return NextResponse.json({ error: 'Studio non trouvé' }, { status: 404 });
    }

    if (studio.ownerId !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const transactions = await prisma.walletTransaction.findMany({
      where: { studioId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      walletBalance: studio.walletBalance,
      totalEarnings: studio.totalEarnings,
      transactions,
    });
  } catch (error) {
    console.error('Erreur récupération portefeuille:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
