import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Réductions heures creuses à venir pour ce studio (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const discounts = await prisma.slotDiscount.findMany({
      where: { studioId: id, date: { gte: today } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    return NextResponse.json({ discounts });
  } catch (error) {
    console.error('Erreur récupération réductions heures creuses:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Créer une réduction manuelle sur un créneau précis (studio propriétaire)
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

    const { date, startTime, discountedPrice } = await request.json();
    if (!date || !startTime) {
      return NextResponse.json({ error: 'Date et heure requises' }, { status: 400 });
    }
    const priceNum = Number(discountedPrice);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return NextResponse.json({ error: 'Le prix remisé doit être positif ou nul' }, { status: 400 });
    }

    const discount = await prisma.slotDiscount.upsert({
      where: { studioId_date_startTime: { studioId: id, date: new Date(date), startTime } },
      update: { discountedPrice: priceNum },
      create: { studioId: id, date: new Date(date), startTime, discountedPrice: priceNum },
    });

    return NextResponse.json({ discount }, { status: 201 });
  } catch (error) {
    console.error('Erreur création réduction heures creuses:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
