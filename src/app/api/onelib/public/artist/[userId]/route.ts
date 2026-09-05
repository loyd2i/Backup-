import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { promoteReleaseIfDue, promoteCollectionIfDue } from '@/lib/onelib';

// GET - Page publique d'un artiste : profil + toutes ses releases/albums/playlists publiés
// (aucune authentification requise)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const artist = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, avatar: true, role: true }
    });
    if (!artist) {
      return NextResponse.json({ error: 'Artiste non trouvé' }, { status: 404 });
    }

    const [releases, collections] = await Promise.all([
      prisma.onelibRelease.findMany({
        where: { userId },
        include: { track: { select: { title: true, artist: true, coverUrl: true, genre: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.onelibCollection.findMany({
        where: { userId },
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

    const items = [...publishedReleases, ...publishedCollections].sort((a, b) =>
      new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime()
    );

    return NextResponse.json({ artist, items });
  } catch (error) {
    console.error('Erreur récupération page publique artiste Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
