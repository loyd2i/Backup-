import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Recalcule la note publique du studio à partir de la moyenne réelle des
// avis artiste->studio (remplace le chiffre fixe seedé initialement).
async function recomputeStudioRating(studioId: string) {
  const result = await prisma.review.aggregate({
    where: { direction: 'artist_to_studio', appointment: { studioId } },
    _avg: { rating: true },
  });
  if (result._avg.rating !== null) {
    await prisma.studio.update({
      where: { id: studioId },
      data: { rating: Math.round(result._avg.rating * 10) / 10 },
    });
  }
}

// GET - Avis existants sur ce rendez-vous (les deux sens, si présents)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { id } = await params;
    const appointment = await prisma.appointment.findUnique({ where: { id }, include: { studio: true } });
    if (!appointment) return NextResponse.json({ error: 'Rendez-vous non trouvé' }, { status: 404 });

    const isArtist = appointment.userId === user.id;
    const isStudioOwner = appointment.studio.ownerId === user.id;
    if (!isArtist && !isStudioOwner) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

    const reviews = await prisma.review.findMany({ where: { appointmentId: id } });
    return NextResponse.json({ reviews });
  } catch (error) {
    console.error('Erreur récupération avis:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Laisser un avis sur un rendez-vous terminé (un seul par sens et par rendez-vous)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { id } = await params;
    const appointment = await prisma.appointment.findUnique({ where: { id }, include: { studio: true } });
    if (!appointment) return NextResponse.json({ error: 'Rendez-vous non trouvé' }, { status: 404 });

    if (appointment.status !== 'completed') {
      return NextResponse.json({ error: 'Seules les sessions terminées peuvent être notées' }, { status: 400 });
    }

    const isArtist = appointment.userId === user.id;
    const isStudioOwner = appointment.studio.ownerId === user.id;
    if (!isArtist && !isStudioOwner) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

    const direction = isArtist ? 'artist_to_studio' : 'studio_to_artist';

    const { rating, comment } = await request.json();
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json({ error: 'La note doit être un entier entre 1 et 5' }, { status: 400 });
    }

    const existing = await prisma.review.findUnique({
      where: { appointmentId_direction: { appointmentId: id, direction } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Un avis a déjà été laissé pour ce rendez-vous' }, { status: 400 });
    }

    const review = await prisma.review.create({
      data: {
        appointmentId: id,
        authorId: user.id,
        direction,
        rating: ratingNum,
        comment: comment?.trim() || null,
      },
    });

    if (direction === 'artist_to_studio') {
      await recomputeStudioRating(appointment.studioId);
    }

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error('Erreur création avis:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
