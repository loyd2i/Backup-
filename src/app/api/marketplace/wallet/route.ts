import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Portefeuille marketplace de l'utilisateur courant (ventes de sample
// packs / instrus, commission plateforme déjà déduite)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { walletBalance: true },
    });

    const salesCount = await prisma.marketplacePurchase.count({
      where: { item: { sellerId: user.id } },
    });

    return NextResponse.json({ walletBalance: current?.walletBalance ?? 0, salesCount });
  } catch (error) {
    console.error('Erreur récupération portefeuille marketplace:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
