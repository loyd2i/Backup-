import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { promoteReleaseIfDue, promoteCollectionIfDue } from '@/lib/onelib';

// GET - Page smart link publique (aucune authentification requise), pour une
// release (single) ou une collection (album/playlist) — même espace de slugs.
// Incrémente le compteur de vues à chaque consultation d'un contenu publié.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    let release = await prisma.onelibRelease.findUnique({
      where: { slug },
      include: {
        track: {
          select: {
            title: true, artist: true, genre: true, coverUrl: true,
            spotifyUrl: true, youtubeUrl: true, appleMusicUrl: true, deezerUrl: true,
          }
        },
        collaborators: { orderBy: { createdAt: 'asc' }, select: { name: true, role: true } }
      }
    });

    if (release) {
      const promoted = await promoteReleaseIfDue(release);
      if (promoted) release = { ...release, ...promoted };

      if (release.status === 'scheduled') {
        return NextResponse.json(
          { error: 'Cette release n\'est pas encore disponible', scheduledAt: release.scheduledAt },
          { status: 404 }
        );
      }
      if (release.status !== 'published') {
        return NextResponse.json({ error: 'Cette release n\'est pas disponible' }, { status: 404 });
      }

      await prisma.onelibRelease.update({ where: { slug }, data: { views: { increment: 1 } } });

      return NextResponse.json({ type: 'release', release: { ...release, views: release.views + 1 } });
    }

    let collection = await prisma.onelibCollection.findUnique({
      where: { slug },
      include: {
        tracks: {
          include: {
            track: {
              select: {
                title: true, artist: true, genre: true, coverUrl: true,
                spotifyUrl: true, youtubeUrl: true, appleMusicUrl: true, deezerUrl: true,
              }
            }
          },
          orderBy: { order: 'asc' }
        },
        collaborators: { orderBy: { createdAt: 'asc' }, select: { name: true, role: true } }
      }
    });

    if (!collection) {
      return NextResponse.json({ error: 'Ce contenu n\'est pas disponible' }, { status: 404 });
    }

    const promotedCollection = await promoteCollectionIfDue(collection);
    if (promotedCollection) collection = { ...collection, ...promotedCollection };

    if (collection.status === 'scheduled') {
      return NextResponse.json(
        { error: 'Cet album/playlist n\'est pas encore disponible', scheduledAt: collection.scheduledAt },
        { status: 404 }
      );
    }
    if (collection.status !== 'published') {
      return NextResponse.json({ error: 'Cet album/playlist n\'est pas disponible' }, { status: 404 });
    }

    await prisma.onelibCollection.update({ where: { slug }, data: { views: { increment: 1 } } });

    return NextResponse.json({ type: 'collection', collection: { ...collection, views: collection.views + 1 } });
  } catch (error) {
    console.error('Erreur récupération contenu public Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
