import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// POST - Ajouter une track terminée à un album/playlist
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const collection = await prisma.onelibCollection.findUnique({
      where: { id },
      include: { tracks: true }
    });
    if (!collection || collection.userId !== user.id) {
      return NextResponse.json({ error: 'Collection non trouvée' }, { status: 404 });
    }

    const { trackId } = await request.json();
    if (!trackId) {
      return NextResponse.json({ error: 'Track requise' }, { status: 400 });
    }

    const track = await prisma.track.findUnique({ where: { id: trackId } });
    if (!track || track.userId !== user.id) {
      return NextResponse.json({ error: 'Track non trouvée' }, { status: 404 });
    }
    if (track.status !== 'finished') {
      return NextResponse.json({ error: 'Seules les tracks terminées peuvent être ajoutées' }, { status: 400 });
    }
    if (collection.tracks.some(t => t.trackId === trackId)) {
      return NextResponse.json({ error: 'Cette track est déjà dans la collection' }, { status: 400 });
    }

    const maxOrder = collection.tracks.reduce((max, t) => Math.max(max, t.order), -1);

    const entry = await prisma.onelibCollectionTrack.create({
      data: {
        collectionId: id,
        trackId,
        order: maxOrder + 1,
      },
      include: {
        track: {
          select: {
            id: true, title: true, artist: true, coverUrl: true, genre: true, status: true,
            spotifyUrl: true, youtubeUrl: true, appleMusicUrl: true, deezerUrl: true,
          }
        }
      }
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error('Erreur ajout track à la collection Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
