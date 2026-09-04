import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Détail d'une session (participants inclus)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;

    const session = await prisma.eStudioSession.findUnique({
      where: { id },
      include: {
        host: { select: { id: true, name: true } },
        participants: {
          where: { leftAt: null },
          include: { user: { select: { id: true, name: true } } },
          orderBy: { joinedAt: 'asc' }
        }
      }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session non trouvée' }, { status: 404 });
    }

    const isMember = session.hostId === user.id || session.participants.some(p => p.userId === user.id);
    if (!isMember) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Erreur récupération session E-Studio:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH - Démarrer / terminer une session (hôte uniquement)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!['waiting', 'live', 'ended'].includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
    }

    const session = await prisma.eStudioSession.findUnique({ where: { id } });
    if (!session) {
      return NextResponse.json({ error: 'Session non trouvée' }, { status: 404 });
    }
    if (session.hostId !== user.id) {
      return NextResponse.json({ error: 'Seul l\'hôte peut modifier le statut' }, { status: 403 });
    }

    const data: { status: string; startedAt?: Date; endedAt?: Date } = { status };
    if (status === 'live' && !session.startedAt) data.startedAt = new Date();
    if (status === 'ended') data.endedAt = new Date();

    const updated = await prisma.eStudioSession.update({
      where: { id },
      data,
      include: {
        host: { select: { id: true, name: true } },
        participants: {
          where: { leftAt: null },
          include: { user: { select: { id: true, name: true } } },
          orderBy: { joinedAt: 'asc' }
        }
      }
    });

    return NextResponse.json({ session: updated });
  } catch (error) {
    console.error('Erreur mise à jour session E-Studio:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
