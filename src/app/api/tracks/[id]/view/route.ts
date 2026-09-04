import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// POST - Increment view count
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: trackId } = await params;
    const user = await getCurrentUser();

    // Get track
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: { sharedWith: true }
    });

    if (!track) {
      return NextResponse.json({ error: 'Track non trouvée' }, { status: 404 });
    }

    // Check access
    const hasAccess = 
      track.isPublic ||
      (user && track.userId === user.id) ||
      (user && track.sharedWith.some(s => s.userId === user.id));

    if (!hasAccess) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    // Increment view count (don't count owner's views)
    if (user && track.userId !== user.id) {
      await prisma.track.update({
        where: { id: trackId },
        data: { views: { increment: 1 } }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking view:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
