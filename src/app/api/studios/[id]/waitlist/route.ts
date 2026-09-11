import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Créneaux sur lesquels l'utilisateur courant est en liste d'attente pour ce studio
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { id } = await params;
    const entries = await prisma.waitlist.findMany({
      where: { studioId: id, userId: user.id },
      select: { date: true, startTime: true },
    });

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Erreur récupération liste d\'attente:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Rejoindre la liste d'attente d'un créneau déjà réservé
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { id } = await params;
    const { date, startTime } = await request.json();
    if (!date || !startTime) {
      return NextResponse.json({ error: 'Date et heure requises' }, { status: 400 });
    }

    const studio = await prisma.studio.findUnique({ where: { id } });
    if (!studio) return NextResponse.json({ error: 'Studio non trouvé' }, { status: 404 });

    const entry = await prisma.waitlist.upsert({
      where: { userId_studioId_date_startTime: { userId: user.id, studioId: id, date: new Date(date), startTime } },
      update: {},
      create: { userId: user.id, studioId: id, date: new Date(date), startTime },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error('Erreur inscription liste d\'attente:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Quitter la liste d'attente d'un créneau
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const startTime = searchParams.get('startTime');
    if (!date || !startTime) {
      return NextResponse.json({ error: 'Date et heure requises' }, { status: 400 });
    }

    await prisma.waitlist.deleteMany({
      where: { userId: user.id, studioId: id, date: new Date(date), startTime },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur désinscription liste d\'attente:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
