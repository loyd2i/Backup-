import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// POST - Rejoindre une session via un token d'invitation
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: 'Token requis' }, { status: 400 });
    }

    const invitation = await prisma.eStudioInvitation.findUnique({
      where: { token },
      include: { session: true }
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation invalide' }, { status: 404 });
    }
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Cette invitation a expiré' }, { status: 410 });
    }
    if (invitation.session.status === 'ended') {
      return NextResponse.json({ error: 'Cette session est terminée' }, { status: 400 });
    }

    // Compter les participants actifs
    const activeCount = await prisma.eStudioParticipant.count({
      where: { sessionId: invitation.sessionId, leftAt: null }
    });

    const existing = await prisma.eStudioParticipant.findUnique({
      where: { sessionId_userId: { sessionId: invitation.sessionId, userId: user.id } }
    });

    if (!existing) {
      if (activeCount >= invitation.session.maxParticipants) {
        return NextResponse.json({ error: 'Session complète' }, { status: 403 });
      }
      await prisma.eStudioParticipant.create({
        data: {
          sessionId: invitation.sessionId,
          userId: user.id,
          role: 'participant',
        }
      });
    } else if (existing.leftAt) {
      await prisma.eStudioParticipant.update({
        where: { id: existing.id },
        data: { leftAt: null }
      });
    }

    if (!invitation.usedAt) {
      await prisma.eStudioInvitation.update({
        where: { id: invitation.id },
        data: { usedAt: new Date() }
      });
    }

    return NextResponse.json({ sessionId: invitation.sessionId });
  } catch (error) {
    console.error('Erreur rejoindre session E-Studio:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
