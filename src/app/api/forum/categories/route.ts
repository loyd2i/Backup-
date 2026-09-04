import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Liste des catégories
export async function GET() {
  try {
    const categories = await prisma.forumCategory.findMany({
      include: {
        _count: {
          select: { posts: true }
        }
      },
      orderBy: { order: 'asc' }
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Erreur récupération catégories:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Créer une catégorie (admin seulement)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, slug, icon, order } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Nom et slug sont requis' },
        { status: 400 }
      );
    }

    const category = await prisma.forumCategory.create({
      data: {
        name,
        description,
        slug,
        icon,
        order: order || 0
      }
    });

    return NextResponse.json({ category, message: 'Catégorie créée' }, { status: 201 });
  } catch (error) {
    console.error('Erreur création catégorie:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
