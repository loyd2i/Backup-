import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Détail d'un post (par slug), pas d'auth requise. Incrémente les vues.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const post = await prisma.forumPost.findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { comments: true, likes: true } }
      }
    });

    if (!post) {
      return NextResponse.json({ error: 'Sujet non trouvé' }, { status: 404 });
    }

    await prisma.forumPost.update({
      where: { id: post.id },
      data: { views: { increment: 1 } }
    });

    const user = await getCurrentUser();
    let likedByMe = false;
    if (user) {
      const like = await prisma.forumLike.findUnique({
        where: { userId_postId: { userId: user.id, postId: post.id } }
      });
      likedByMe = !!like;
    }

    return NextResponse.json({ post: { ...post, likedByMe } });
  } catch (error) {
    console.error('Erreur récupération post:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT - Modifier un post (auteur uniquement)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { slug } = await params;
    const existing = await prisma.forumPost.findUnique({ where: { slug }, select: { id: true, authorId: true } });
    if (!existing) {
      return NextResponse.json({ error: 'Sujet non trouvé' }, { status: 404 });
    }
    if (existing.authorId !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const body = await request.json();
    const { title, content } = body;
    if (!title || !title.trim() || !content || !content.trim()) {
      return NextResponse.json({ error: 'Titre et contenu requis' }, { status: 400 });
    }

    const post = await prisma.forumPost.update({
      where: { id: existing.id },
      data: { title: title.trim(), content: content.trim() },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { comments: true, likes: true } }
      }
    });

    return NextResponse.json({ post, message: 'Sujet modifié' });
  } catch (error) {
    console.error('Erreur modification post:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Supprimer un post (auteur uniquement)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { slug } = await params;
    const existing = await prisma.forumPost.findUnique({ where: { slug }, select: { id: true, authorId: true } });
    if (!existing) {
      return NextResponse.json({ error: 'Sujet non trouvé' }, { status: 404 });
    }
    if (existing.authorId !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    await prisma.$transaction([
      prisma.forumLike.deleteMany({ where: { comment: { postId: existing.id } } }),
      prisma.forumComment.deleteMany({ where: { postId: existing.id } }),
      prisma.forumLike.deleteMany({ where: { postId: existing.id } }),
      prisma.forumPost.delete({ where: { id: existing.id } })
    ]);

    return NextResponse.json({ message: 'Sujet supprimé' });
  } catch (error) {
    console.error('Erreur suppression post:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
