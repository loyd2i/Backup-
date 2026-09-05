import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { promoteReleaseIfDue } from '@/lib/onelib';

// GET - Page smart link publique (aucune authentification requise)
// Incrémente le compteur de vues à chaque consultation d'une release publiée.
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

    if (!release) {
      return NextResponse.json({ error: 'Cette release n\'est pas disponible' }, { status: 404 });
    }

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

    await prisma.onelibRelease.update({
      where: { slug },
      data: { views: { increment: 1 } }
    });

    return NextResponse.json({ release: { ...release, views: release.views + 1 } });
  } catch (error) {
    console.error('Erreur récupération release publique Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
