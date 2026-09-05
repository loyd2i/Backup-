import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { promoteReleaseIfDue, generateUniqueOnelibSlug } from '@/lib/onelib';

// GET - Mes releases Onelib
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const releases = await prisma.onelibRelease.findMany({
      where: { userId: user.id },
      include: {
        track: {
          select: {
            id: true, title: true, artist: true, coverUrl: true, genre: true, status: true,
            spotifyUrl: true, youtubeUrl: true, appleMusicUrl: true, deezerUrl: true,
          }
        },
        collaborators: { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const resolvedReleases = await Promise.all(
      releases.map(async (release) => (await promoteReleaseIfDue(release)) || release)
    );

    return NextResponse.json({ releases: resolvedReleases });
  } catch (error) {
    console.error('Erreur récupération releases Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Créer une release Onelib à partir d'une track terminée
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { trackId } = await request.json();
    if (!trackId) {
      return NextResponse.json({ error: 'Track requise' }, { status: 400 });
    }

    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: { onelibRelease: true }
    });

    if (!track || track.userId !== user.id) {
      return NextResponse.json({ error: 'Track non trouvée' }, { status: 404 });
    }
    if (track.status !== 'finished') {
      return NextResponse.json({ error: 'Seules les tracks terminées peuvent être publiées sur Onelib' }, { status: 400 });
    }
    if (track.onelibRelease) {
      return NextResponse.json({ error: 'Cette track a déjà une release Onelib' }, { status: 400 });
    }

    const slug = await generateUniqueOnelibSlug(`${track.artist}-${track.title}`);

    const release = await prisma.onelibRelease.create({
      data: {
        trackId: track.id,
        userId: user.id,
        slug,
      },
      include: {
        track: {
          select: {
            id: true, title: true, artist: true, coverUrl: true, genre: true, status: true,
            spotifyUrl: true, youtubeUrl: true, appleMusicUrl: true, deezerUrl: true,
          }
        },
        collaborators: true
      }
    });

    return NextResponse.json({ release }, { status: 201 });
  } catch (error) {
    console.error('Erreur création release Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
