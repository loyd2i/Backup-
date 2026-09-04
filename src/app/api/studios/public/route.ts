import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Studios publics (pas d'auth requise)
export async function GET(request: NextRequest) {
  try {
    const studios = await prisma.studio.findMany({
      where: { isActive: true },
      include: {
        photos: { orderBy: { order: 'asc' }, take: 3 },
        links: { where: { isActive: true }, orderBy: { order: 'asc' } },
        pricingTiers: { where: { isActive: true } },
        availabilities: { where: { isActive: true } },
        _count: { select: { appointments: true, tracks: true } }
      },
      orderBy: { rating: 'desc' }
    });

    return NextResponse.json({ studios });
  } catch (error) {
    console.error('Erreur récupération studios publics:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
