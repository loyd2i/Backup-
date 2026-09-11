import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Articles marketplace achetés par l'utilisateur courant
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const purchases = await prisma.marketplacePurchase.findMany({
      where: { buyerId: user.id },
      include: {
        item: {
          include: { seller: { select: { id: true, name: true, avatar: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ purchases });
  } catch (error) {
    console.error('Erreur récupération achats marketplace:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
