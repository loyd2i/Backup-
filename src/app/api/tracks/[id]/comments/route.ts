import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Comments for a track
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: trackId } = await params;
    
    const comments = await prisma.trackComment.findMany({
      where: { trackId },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Add comment
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
    const { content } = body;

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'Commentaire vide' }, { status: 400 });
    }

    // Check if user has access to this track
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: { sharedWith: true }
    });

    if (!track) {
      return NextResponse.json({ error: 'Track non trouvée' }, { status: 404 });
    }

    // User can comment if:
    // 1. Track is public
    // 2. User owns the track
    // 3. Track is shared with user
    const canComment = 
      track.isPublic ||
      track.userId === user.id ||
      track.sharedWith.some(s => s.userId === user.id);

    if (!canComment) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const comment = await prisma.trackComment.create({
      data: {
        trackId,
        userId: user.id,
        content: content.trim()
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      }
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Delete comment
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
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json({ error: 'ID commentaire requis' }, { status: 400 });
    }

    // Check if user owns the comment or the track
    const comment = await prisma.trackComment.findUnique({
      where: { id: commentId },
      include: { track: true }
    });

    if (!comment) {
      return NextResponse.json({ error: 'Commentaire non trouvé' }, { status: 404 });
    }

    if (comment.userId !== user.id && comment.track.userId !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    await prisma.trackComment.delete({
      where: { id: commentId }
    });

    return NextResponse.json({ message: 'Commentaire supprimé' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
