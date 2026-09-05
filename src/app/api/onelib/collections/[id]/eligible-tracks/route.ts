import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Tracks terminées de l'utilisateur pas encore présentes dans cette collection
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
    const collection = await prisma.onelibCollection.findUnique({ where: { id } });
    if (!collection || collection.userId !== user.id) {
      return NextResponse.json({ error: 'Collection non trouvée' }, { status: 404 });
    }

    const tracks = await prisma.track.findMany({
      where: {
        userId: user.id,
        status: 'finished',
        collectionEntries: { none: { collectionId: id } },
      },
      select: { id: true, title: true, artist: true, coverUrl: true, genre: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error('Erreur récupération tracks éligibles collection Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
