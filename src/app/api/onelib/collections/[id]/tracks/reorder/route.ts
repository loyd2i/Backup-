import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// PATCH - Réordonner les tracks d'un album/playlist
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
    const collection = await prisma.onelibCollection.findUnique({
      where: { id },
      include: { tracks: true }
    });
    if (!collection || collection.userId !== user.id) {
      return NextResponse.json({ error: 'Collection non trouvée' }, { status: 404 });
    }

    const { entryIds } = await request.json();
    if (!Array.isArray(entryIds)) {
      return NextResponse.json({ error: 'Liste d\'ordre invalide' }, { status: 400 });
    }

    const validIds = new Set(collection.tracks.map(t => t.id));
    if (entryIds.length !== collection.tracks.length || !entryIds.every((eid: string) => validIds.has(eid))) {
      return NextResponse.json({ error: 'La liste ne correspond pas aux tracks de la collection' }, { status: 400 });
    }

    await prisma.$transaction(
      entryIds.map((entryId: string, index: number) =>
        prisma.onelibCollectionTrack.update({ where: { id: entryId }, data: { order: index } })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur réordonnancement de la collection Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
