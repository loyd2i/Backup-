import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Commentaires d'un post (par slug du post), pas d'auth requise.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const post = await prisma.forumPost.findUnique({ where: { slug }, select: { id: true } });
    if (!post) {
      return NextResponse.json({ error: 'Sujet non trouvé' }, { status: 404 });
    }

    const comments = await prisma.forumComment.findMany({
      where: { postId: post.id },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        _count: { select: { likes: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Erreur récupération commentaires:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Ajouter un commentaire (connexion requise)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { slug } = await params;
    const post = await prisma.forumPost.findUnique({ where: { slug }, select: { id: true } });
    if (!post) {
      return NextResponse.json({ error: 'Sujet non trouvé' }, { status: 404 });
    }

    const body = await request.json();
    const { content } = body;
    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Contenu requis' }, { status: 400 });
    }

    const comment = await prisma.forumComment.create({
      data: {
        content: content.trim(),
        postId: post.id,
        authorId: user.id
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } }
      }
    });

    return NextResponse.json({ comment, message: 'Commentaire publié' }, { status: 201 });
  } catch (error) {
    console.error('Erreur création commentaire:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
