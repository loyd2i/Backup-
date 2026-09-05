import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Tracks publiques (pas d'auth requise)
// Filtres optionnels : ?studioId=... (tracks travaillées par un studio donné)
//                      ?userId=...   (tracks d'un artiste donné)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studioId = searchParams.get('studioId');
    const userId = searchParams.get('userId');

    const tracks = await prisma.track.findMany({
      where: {
        isPublic: true,
        status: 'finished',
        ...(studioId ? { studioId } : {}),
        ...(userId ? { userId } : {}),
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        studio: { select: { id: true, name: true, location: true } },
        _count: { select: { comments: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error('Erreur récupération tracks publiques:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
