import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// DELETE - Retirer un collaborateur crédité sur l'album/playlist
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; collaboratorId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id, collaboratorId } = await params;
    const collection = await prisma.onelibCollection.findUnique({ where: { id } });
    if (!collection || collection.userId !== user.id) {
      return NextResponse.json({ error: 'Collection non trouvée' }, { status: 404 });
    }

    const collaborator = await prisma.onelibCollectionCollaborator.findUnique({ where: { id: collaboratorId } });
    if (!collaborator || collaborator.collectionId !== id) {
      return NextResponse.json({ error: 'Collaborateur non trouvé' }, { status: 404 });
    }

    await prisma.onelibCollectionCollaborator.delete({ where: { id: collaboratorId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression collaborateur collection Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
