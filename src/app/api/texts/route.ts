import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Textes de l'utilisateur
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const texts = await prisma.text.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ texts });
  } catch (error) {
    console.error('Erreur récupération textes:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Créer un texte
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { title, artist, content } = body;

    if (!title || !artist) {
      return NextResponse.json(
        { error: 'Titre et artiste sont requis' },
        { status: 400 }
      );
    }

    const text = await prisma.text.create({
      data: {
        userId: user.id,
        title,
        artist,
        content
      }
    });

    return NextResponse.json({ text, message: 'Texte créé' }, { status: 201 });
  } catch (error) {
    console.error('Erreur création texte:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT - Modifier un texte
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...data } = body;

    const text = await prisma.text.update({
      where: { id, userId: user.id },
      data
    });

    return NextResponse.json({ text, message: 'Texte mis à jour' });
  } catch (error) {
    console.error('Erreur mise à jour texte:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
