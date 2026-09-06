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
