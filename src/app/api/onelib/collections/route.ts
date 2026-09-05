import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { generateUniqueOnelibSlug, promoteCollectionIfDue } from '@/lib/onelib';

const TRACK_SELECT = {
  id: true, title: true, artist: true, coverUrl: true, genre: true, status: true,
  spotifyUrl: true, youtubeUrl: true, appleMusicUrl: true, deezerUrl: true,
} as const;

// GET - Mes albums/playlists Onelib
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const collections = await prisma.onelibCollection.findMany({
      where: { userId: user.id },
      include: {
        tracks: { include: { track: { select: TRACK_SELECT } }, orderBy: { order: 'asc' } },
        collaborators: { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const resolved = await Promise.all(
      collections.map(async (c) => (await promoteCollectionIfDue(c)) || c)
    );

    return NextResponse.json({ collections: resolved });
  } catch (error) {
    console.error('Erreur récupération collections Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Créer un album ou une playlist
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { title, kind } = await request.json();
    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Le titre est requis' }, { status: 400 });
    }
    if (!['album', 'playlist'].includes(kind)) {
      return NextResponse.json({ error: 'Type invalide (album ou playlist)' }, { status: 400 });
    }

    const slug = await generateUniqueOnelibSlug(`${user.name}-${title}`);

    const collection = await prisma.onelibCollection.create({
      data: {
        userId: user.id,
        title: title.trim(),
        kind,
        slug,
      },
      include: {
        tracks: { include: { track: { select: TRACK_SELECT } }, orderBy: { order: 'asc' } },
        collaborators: true
      }
    });

    return NextResponse.json({ collection }, { status: 201 });
  } catch (error) {
    console.error('Erreur création collection Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
