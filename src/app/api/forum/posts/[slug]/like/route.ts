import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// POST - Bascule le like d'un post pour l'utilisateur connecté
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

    const existing = await prisma.forumLike.findUnique({
      where: { userId_postId: { userId: user.id, postId: post.id } }
    });

    if (existing) {
      await prisma.forumLike.delete({ where: { id: existing.id } });
    } else {
      await prisma.forumLike.create({ data: { userId: user.id, postId: post.id } });
    }

    const likesCount = await prisma.forumLike.count({ where: { postId: post.id } });

    return NextResponse.json({ liked: !existing, likesCount });
  } catch (error) {
    console.error('Erreur like post:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
