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

// GET - Messages du chat (polling)
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

    const messages = await prisma.eStudioChatMessage.findMany({
      where: { sessionId: id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Erreur récupération messages E-Studio:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Envoyer un message
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
    if (!session.enableChat) {
      return NextResponse.json({ error: 'Le chat est désactivé pour cette session' }, { status: 400 });
    }

    const { content } = await request.json();
    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Message vide' }, { status: 400 });
    }

    const message = await prisma.eStudioChatMessage.create({
      data: {
        sessionId: id,
        userId: user.id,
        content: content.trim(),
      },
      include: { user: { select: { id: true, name: true } } }
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Erreur envoi message E-Studio:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
