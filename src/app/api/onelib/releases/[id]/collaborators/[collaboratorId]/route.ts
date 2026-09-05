import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// DELETE - Retirer un collaborateur crédité sur la release
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
    const release = await prisma.onelibRelease.findUnique({ where: { id } });
    if (!release || release.userId !== user.id) {
      return NextResponse.json({ error: 'Release non trouvée' }, { status: 404 });
    }

    const collaborator = await prisma.onelibCollaborator.findUnique({ where: { id: collaboratorId } });
    if (!collaborator || collaborator.releaseId !== id) {
      return NextResponse.json({ error: 'Collaborateur non trouvé' }, { status: 404 });
    }

    await prisma.onelibCollaborator.delete({ where: { id: collaboratorId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression collaborateur Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
