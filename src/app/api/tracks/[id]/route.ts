import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;

    // Get user's studios if they are a studio owner
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { studios: true }
    });

    const studioIds = user?.studios.map(s => s.id) || [];

    // Check if track exists and belongs to user or their studio
    const track = await prisma.track.findFirst({
      where: {
        id,
        OR: [
          { userId: currentUser.id },
          { studioId: { in: studioIds } }
        ]
      }
    });

    if (!track) {
      return NextResponse.json({ error: 'Track non trouvée' }, { status: 404 });
    }

    // Delete related records first (comments, shares) to avoid foreign key constraints
    await prisma.trackComment.deleteMany({
      where: { trackId: id }
    });

    await prisma.trackShare.deleteMany({
      where: { trackId: id }
    });

    // Delete track
    await prisma.track.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting track:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
