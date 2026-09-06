import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// PUT - Modifier un commentaire (auteur uniquement)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; commentId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { commentId } = await params;
    const existing = await prisma.forumComment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Commentaire non trouvé' }, { status: 404 });
    }
    if (existing.authorId !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const body = await request.json();
    const { content } = body;
    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Contenu requis' }, { status: 400 });
    }

    const comment = await prisma.forumComment.update({
      where: { id: commentId },
      data: { content: content.trim() },
      include: { author: { select: { id: true, name: true, avatar: true } } }
    });

    return NextResponse.json({ comment, message: 'Commentaire modifié' });
  } catch (error) {
    console.error('Erreur modification commentaire:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Supprimer un commentaire (auteur uniquement)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; commentId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { commentId } = await params;
    const existing = await prisma.forumComment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Commentaire non trouvé' }, { status: 404 });
    }
    if (existing.authorId !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    await prisma.$transaction([
      prisma.forumLike.deleteMany({ where: { commentId } }),
      prisma.forumComment.delete({ where: { id: commentId } })
    ]);

    return NextResponse.json({ message: 'Commentaire supprimé' });
  } catch (error) {
    console.error('Erreur suppression commentaire:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
