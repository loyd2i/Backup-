import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Liste des posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search') || '';

    const posts = await prisma.forumPost.findMany({
      where: {
        AND: [
          categoryId ? { categoryId } : {},
          search ? {
            OR: [
              { title: { contains: search } },
              { content: { contains: search } }
            ]
          } : {}
        ]
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        category: { select: { id: true, name: true, slug: true } },
        _count: {
          select: { comments: true, likes: true }
        }
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 20
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Erreur récupération posts:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Créer un post
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, categoryId } = body;

    if (!title || !content || !categoryId) {
      return NextResponse.json(
        { error: 'Titre, contenu et catégorie sont requis' },
        { status: 400 }
      );
    }

    // Générer un slug unique
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now();

    const post = await prisma.forumPost.create({
      data: {
        title,
        content,
        slug,
        authorId: user.id,
        categoryId
      },
      include: {
        author: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json({ post, message: 'Post créé' }, { status: 201 });
  } catch (error) {
    console.error('Erreur création post:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
