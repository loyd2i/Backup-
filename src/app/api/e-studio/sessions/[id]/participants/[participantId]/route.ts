import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

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
