import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// DELETE - Retire une photo de la galerie du studio
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { id, photoId } = await params;
    const studio = await prisma.studio.findFirst({ where: { id, ownerId: user.id } });
    if (!studio) return NextResponse.json({ error: 'Studio non trouvé' }, { status: 404 });

    const photo = await prisma.studioPhoto.findUnique({ where: { id: photoId } });
    if (!photo || photo.studioId !== id) {
      return NextResponse.json({ error: 'Photo non trouvée' }, { status: 404 });
    }

    await prisma.studioPhoto.delete({ where: { id: photoId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression photo galerie studio:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
