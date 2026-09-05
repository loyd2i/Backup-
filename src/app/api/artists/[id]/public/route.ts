import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { promoteReleaseIfDue, promoteCollectionIfDue } from '@/lib/onelib';

// GET - Fiche publique d'un artiste : profil + tracks publiques + sorties Onelib publiées
// Aucune authentification requise.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const artist = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, avatar: true, role: true,
        bio: true, city: true, genre: true,
        instagram: true, spotify: true, soundcloud: true, youtube: true, website: true,
      }
    });

    if (!artist) {
      return NextResponse.json({ error: 'Artiste non trouvé' }, { status: 404 });
    }

    const [tracks, releases, collections] = await Promise.all([
      prisma.track.findMany({
        where: { userId: id, isPublic: true, status: 'finished' },
        select: {
          id: true, title: true, artist: true, audioUrl: true, duration: true,
          bpm: true, key: true, views: true, coverUrl: true,
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.onelibRelease.findMany({
        where: { userId: id },
        include: { track: { select: { title: true, artist: true, coverUrl: true, genre: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.onelibCollection.findMany({
        where: { userId: id },
        include: { tracks: { select: { id: true } } },
        orderBy: { createdAt: 'desc' }
      }),
    ]);

    const resolvedReleases = await Promise.all(
      releases.map(async (r) => (await promoteReleaseIfDue(r)) || r)
    );
    const resolvedCollections = await Promise.all(
      collections.map(async (c) => (await promoteCollectionIfDue(c)) || c)
    );

    const publishedReleases = resolvedReleases
      .filter(r => r.status === 'published')
      .map(r => ({
        type: 'release' as const,
        slug: r.slug,
        title: r.track.title,
        artist: r.track.artist,
        genre: r.track.genre,
        coverUrl: r.coverUrl || r.track.coverUrl,
        publishedAt: r.publishedAt,
      }));

    const publishedCollections = resolvedCollections
      .filter(c => c.status === 'published')
      .map(c => ({
        type: 'collection' as const,
        slug: c.slug,
        title: c.title,
        kind: c.kind,
        trackCount: c.tracks.length,
        coverUrl: c.coverUrl,
        publishedAt: c.publishedAt,
      }));

    const releaseItems = [...publishedReleases, ...publishedCollections].sort((a, b) =>
      new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime()
    );

    return NextResponse.json({ artist, tracks, releaseItems });
  } catch (error) {
    console.error('Erreur récupération fiche publique artiste:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
