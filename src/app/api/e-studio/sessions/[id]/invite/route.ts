import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// POST - Générer un lien d'invitation (hôte uniquement)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;

    const session = await prisma.eStudioSession.findUnique({ where: { id } });
    if (!session) {
      return NextResponse.json({ error: 'Session non trouvée' }, { status: 404 });
    }
    if (session.hostId !== user.id) {
      return NextResponse.json({ error: 'Seul l\'hôte peut inviter' }, { status: 403 });
    }
    if (session.status === 'ended') {
      return NextResponse.json({ error: 'Cette session est terminée' }, { status: 400 });
    }

    const invitation = await prisma.eStudioInvitation.create({
      data: {
        sessionId: id,
        createdBy: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      }
    });

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error) {
    console.error('Erreur création invitation E-Studio:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
