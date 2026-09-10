import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Bannières publicitaires actives, une par emplacement (gauche/droite).
// Public : ces emplacements s'affichent aussi sur des pages non authentifiées
// (forum public). Pas d'endpoint d'écriture : gérées directement en base par
// l'équipe (partenariats directs, pas de self-serve — voir BUSINESS-PLAN.md).
export async function GET() {
  try {
    const now = new Date();
    const banners = await prisma.adBanner.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    const left = banners.find((b) => b.position === 'left') || null;
    const right = banners.find((b) => b.position === 'right') || null;

    return NextResponse.json({ left, right });
  } catch (error) {
    console.error('Erreur récupération bannières publicitaires:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
