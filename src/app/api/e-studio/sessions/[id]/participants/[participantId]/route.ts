import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// PATCH - Écran partagé (un seul présentateur à la fois), micro (mute) et
// statut de connexion audio ("connected" = a rejoint l'audio collaboratif)
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
    const { isScreenSharing, isMuted, connectionState } = await request.json();

    if (isScreenSharing === undefined && isMuted === undefined && connectionState === undefined) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 });
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

    const data: { isScreenSharing?: boolean; isMuted?: boolean; connectionState?: string } = {};

    if (typeof isScreenSharing === 'boolean') {
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
      data.isScreenSharing = isScreenSharing;
    }

    if (typeof isMuted === 'boolean') {
      // Se rendre muet : soi-même ou l'hôte. Se démuter : soi-même uniquement
      // (l'hôte ne peut pas activer le micro de quelqu'un d'autre à sa place).
      if (isMuted === false && !isSelf) {
        return NextResponse.json({ error: 'Seul le participant peut réactiver son propre micro' }, { status: 403 });
      }
      data.isMuted = isMuted;
    }

    if (typeof connectionState === 'string') {
      if (!isSelf) {
        return NextResponse.json({ error: 'Seul le participant peut modifier son propre statut de connexion' }, { status: 403 });
      }
      if (!['new', 'connecting', 'connected', 'disconnected', 'failed'].includes(connectionState)) {
        return NextResponse.json({ error: 'Statut de connexion invalide' }, { status: 400 });
      }
      data.connectionState = connectionState;
    }

    const updated = await prisma.eStudioParticipant.update({
      where: { id: participantId },
      data,
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
