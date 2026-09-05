import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// DELETE - Retirer une track d'un album/playlist
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; trackEntryId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id, trackEntryId } = await params;
    const collection = await prisma.onelibCollection.findUnique({ where: { id } });
    if (!collection || collection.userId !== user.id) {
      return NextResponse.json({ error: 'Collection non trouvée' }, { status: 404 });
    }

    const entry = await prisma.onelibCollectionTrack.findUnique({ where: { id: trackEntryId } });
    if (!entry || entry.collectionId !== id) {
      return NextResponse.json({ error: 'Track non trouvée dans cette collection' }, { status: 404 });
    }

    await prisma.onelibCollectionTrack.delete({ where: { id: trackEntryId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression track de la collection Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
