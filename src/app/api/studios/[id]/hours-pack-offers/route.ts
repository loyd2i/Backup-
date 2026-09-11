import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Offres de packs d'heures actives pour ce studio (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const offers = await prisma.hoursPackOffer.findMany({
      where: { studioId: id, isActive: true },
      orderBy: { hours: 'asc' },
    });
    return NextResponse.json({ offers });
  } catch (error) {
    console.error('Erreur récupération offres pack d\'heures:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Créer une offre de pack d'heures (studio propriétaire uniquement)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { id } = await params;
    const studio = await prisma.studio.findFirst({ where: { id, ownerId: user.id } });
    if (!studio) return NextResponse.json({ error: 'Studio non trouvé' }, { status: 404 });

    const { hours, price } = await request.json();
    const hoursNum = Number(hours);
    const priceNum = Number(price);
    if (!Number.isFinite(hoursNum) || hoursNum <= 0) {
      return NextResponse.json({ error: 'Le nombre d\'heures doit être positif' }, { status: 400 });
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      return NextResponse.json({ error: 'Le prix doit être positif' }, { status: 400 });
    }

    const offer = await prisma.hoursPackOffer.create({
      data: { studioId: id, hours: hoursNum, price: priceNum },
    });

    return NextResponse.json({ offer }, { status: 201 });
  } catch (error) {
    console.error('Erreur création offre pack d\'heures:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
