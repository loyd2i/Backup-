import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Signalement déjà déposé par l'utilisateur courant sur ce rendez-vous, s'il existe
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

    const report = await prisma.appointmentReport.findFirst({
      where: { appointmentId: id, reporterId: user.id },
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Erreur récupération signalement:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Signaler un problème sur une session terminée (traité manuellement par l'équipe)
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
      return NextResponse.json({ error: 'Seules les sessions terminées peuvent être signalées' }, { status: 400 });
    }

    const isArtist = appointment.userId === user.id;
    const isStudioOwner = appointment.studio.ownerId === user.id;
    if (!isArtist && !isStudioOwner) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

    const { reason } = await request.json();
    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'Merci de décrire le problème' }, { status: 400 });
    }

    const existing = await prisma.appointmentReport.findFirst({
      where: { appointmentId: id, reporterId: user.id },
    });
    if (existing) {
      return NextResponse.json({ error: 'Tu as déjà signalé un problème pour cette session' }, { status: 400 });
    }

    const report = await prisma.appointmentReport.create({
      data: { appointmentId: id, reporterId: user.id, reason: reason.trim() },
    });

    console.log(`🚩 Signalement déposé sur le rendez-vous ${id} par ${user.email} : ${reason.trim()}`);

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    console.error('Erreur création signalement:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
