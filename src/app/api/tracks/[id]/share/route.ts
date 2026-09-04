import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Get users this track is shared with
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id: trackId } = await params;

    // Verify ownership
    const track = await prisma.track.findUnique({
      where: { id: trackId }
    });

    if (!track || track.userId !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const shares = await prisma.trackShare.findMany({
      where: { trackId },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    return NextResponse.json({ shares });
  } catch (error) {
    console.error('Error fetching shares:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Share track with user(s)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id: trackId } = await params;
    const body = await request.json();
    const { userIds } = body; // Array of user IDs to share with

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'Utilisateurs requis' }, { status: 400 });
    }

    // Verify ownership
    const track = await prisma.track.findUnique({
      where: { id: trackId }
    });

    if (!track || track.userId !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Can only share private tracks
    if (track.isPublic) {
      return NextResponse.json({ 
        error: 'Les tracks publiques sont visibles par tous' 
      }, { status: 400 });
    }

    // Create shares
    const shares = await Promise.all(
      userIds.map(userId =>
        prisma.trackShare.upsert({
          where: {
            trackId_userId: { trackId, userId }
          },
          update: {},
          create: {
            trackId,
            userId,
            sharedBy: user.id
          },
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        })
      )
    );

    return NextResponse.json({ shares, message: 'Track partagée' }, { status: 201 });
  } catch (error) {
    console.error('Error sharing track:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Remove share
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id: trackId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'ID utilisateur requis' }, { status: 400 });
    }

    // Verify ownership
    const track = await prisma.track.findUnique({
      where: { id: trackId }
    });

    if (!track || track.userId !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    await prisma.trackShare.delete({
      where: {
        trackId_userId: { trackId, userId }
      }
    });

    return NextResponse.json({ message: 'Partage supprimé' });
  } catch (error) {
    console.error('Error removing share:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
