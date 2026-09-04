import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

async function assertMember(sessionId: string, userId: string) {
  const session = await prisma.eStudioSession.findUnique({
    where: { id: sessionId },
    include: { participants: { where: { leftAt: null } } }
  });
  if (!session) return null;
  const isMember = session.hostId === userId || session.participants.some(p => p.userId === userId);
  return isMember ? session : null;
}

// GET - Récupérer les messages de signalisation qui me sont adressés
// (livraison unique : supprimés dès qu'ils sont renvoyés)
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
    const session = await assertMember(id, user.id);
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const signals = await prisma.eStudioSignal.findMany({
      where: { sessionId: id, toUserId: user.id },
      orderBy: { createdAt: 'asc' }
    });

    if (signals.length > 0) {
      await prisma.eStudioSignal.deleteMany({
        where: { id: { in: signals.map(s => s.id) } }
      });
    }

    return NextResponse.json({ signals });
  } catch (error) {
    console.error('Erreur récupération signaux E-Studio:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Envoyer un message de signalisation (offer, answer, ice-candidate)
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
    const session = await assertMember(id, user.id);
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { toUserId, type, payload, kind } = await request.json();
    if (!toUserId || !type || !payload) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 });
    }
    if (!['offer', 'answer', 'ice-candidate'].includes(type)) {
      return NextResponse.json({ error: 'Type invalide' }, { status: 400 });
    }
    if (kind && !['screen', 'audio'].includes(kind)) {
      return NextResponse.json({ error: 'Kind invalide' }, { status: 400 });
    }

    const signal = await prisma.eStudioSignal.create({
      data: {
        sessionId: id,
        fromUserId: user.id,
        toUserId,
        type,
        kind: kind || 'screen',
        payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
      }
    });

    return NextResponse.json({ signal }, { status: 201 });
  } catch (error) {
    console.error('Erreur envoi signal E-Studio:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
