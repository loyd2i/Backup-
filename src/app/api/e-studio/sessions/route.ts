import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Sessions dont je suis l'hôte ou participant
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const sessions = await prisma.eStudioSession.findMany({
      where: {
        OR: [
          { hostId: user.id },
          { participants: { some: { userId: user.id } } }
        ]
      },
      include: {
        host: { select: { id: true, name: true } },
        participants: {
          include: { user: { select: { id: true, name: true } } }
        },
        _count: { select: { participants: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Erreur récupération sessions E-Studio:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Créer une session
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      sessionType,
      audioQuality,
      enableVideo,
      enableScreenShare,
      enableChat,
      enableAnnotations,
      enableRecording,
      maxParticipants,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Le titre est requis' }, { status: 400 });
    }

    const session = await prisma.eStudioSession.create({
      data: {
        title: title.trim(),
        hostId: user.id,
        sessionType: sessionType || 'session_live',
        audioQuality: audioQuality || 'standard',
        enableVideo: !!enableVideo,
        enableScreenShare: enableScreenShare !== false,
        enableChat: enableChat !== false,
        enableAnnotations: !!enableAnnotations,
        enableRecording: !!enableRecording,
        maxParticipants: maxParticipants ? Math.min(Math.max(parseInt(maxParticipants), 2), 5) : 5,
        participants: {
          create: {
            userId: user.id,
            role: 'host',
          }
        }
      },
      include: {
        host: { select: { id: true, name: true } },
        participants: {
          include: { user: { select: { id: true, name: true } } }
        },
        _count: { select: { participants: true } }
      }
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error('Erreur création session E-Studio:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
