import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// PATCH - Partage d'écran (un seul présentateur à la fois) : soi-même ou
// l'hôte qui force l'arrêt / passe le tour à quelqu'un d'autre
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id, participantId } = await params;
    const { isScreenSharing } = await request.json();

    if (typeof isScreenSharing !== 'boolean') {
      return NextResponse.json({ error: 'isScreenSharing requis' }, { status: 400 });
    }

    const session = await prisma.eStudioSession.findUnique({ where: { id } });
    if (!session) {
      return NextResponse.json({ error: 'Session non trouvée' }, { status: 404 });
    }

    const participant = await prisma.eStudioParticipant.findUnique({ where: { id: participantId } });
    if (!participant || participant.sessionId !== id || participant.leftAt) {
      return NextResponse.json({ error: 'Participant non trouvé' }, { status: 404 });
    }

    const isSelf = participant.userId === user.id;
    const isHost = session.hostId === user.id;
    if (!isSelf && !isHost) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    if (isScreenSharing) {
      if (!session.enableScreenShare) {
        return NextResponse.json({ error: 'Le partage d\'écran est désactivé pour cette session' }, { status: 400 });
      }
      if (!participant.canShareScreen) {
        return NextResponse.json({ error: 'Ce participant n\'est pas autorisé à partager son écran' }, { status: 403 });
      }
      // Un seul présentateur à la fois : on coupe les autres avant d'activer celui-ci
      await prisma.eStudioParticipant.updateMany({
        where: { sessionId: id, id: { not: participantId } },
        data: { isScreenSharing: false }
      });
    }

    const updated = await prisma.eStudioParticipant.update({
      where: { id: participantId },
      data: { isScreenSharing },
      include: { user: { select: { id: true, name: true } } }
    });

    return NextResponse.json({ participant: updated });
  } catch (error) {
    console.error('Erreur mise à jour participant E-Studio:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Expulser un participant (hôte uniquement) ou quitter soi-même
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id, participantId } = await params;

    const session = await prisma.eStudioSession.findUnique({ where: { id } });
    if (!session) {
      return NextResponse.json({ error: 'Session non trouvée' }, { status: 404 });
    }

    const participant = await prisma.eStudioParticipant.findUnique({ where: { id: participantId } });
    if (!participant || participant.sessionId !== id) {
      return NextResponse.json({ error: 'Participant non trouvé' }, { status: 404 });
    }

    const isSelf = participant.userId === user.id;
    const isHost = session.hostId === user.id;

    if (!isSelf && !isHost) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }
    if (isSelf && isHost) {
      return NextResponse.json({ error: 'L\'hôte ne peut pas quitter sa propre session (terminez-la à la place)' }, { status: 400 });
    }

    await prisma.eStudioParticipant.update({
      where: { id: participantId },
      data: { leftAt: new Date() }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression participant E-Studio:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
