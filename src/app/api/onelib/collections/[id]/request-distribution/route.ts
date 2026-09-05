import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// POST - Demander l'hébergement/distribution de l'album/playlist (suivi interne :
// ce n'est PAS une soumission automatique aux plateformes de streaming, mais une
// demande horodatée qu'un humain traite ensuite manuellement)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { id } = await params;
    const collection = await prisma.onelibCollection.findFirst({ where: { id, userId: user.id } });
    if (!collection) return NextResponse.json({ error: 'Collection non trouvée' }, { status: 404 });

    if (collection.distributionStatus !== 'none') {
      return NextResponse.json({ error: 'Une demande est déjà en cours pour cette collection' }, { status: 400 });
    }

    const updated = await prisma.onelibCollection.update({
      where: { id },
      data: { distributionStatus: 'requested', distributionRequestedAt: new Date() },
      include: {
        tracks: {
          include: {
            track: {
              select: {
                id: true, title: true, artist: true, coverUrl: true, genre: true, status: true,
                spotifyUrl: true, youtubeUrl: true, appleMusicUrl: true, deezerUrl: true,
              }
            }
          },
          orderBy: { order: 'asc' }
        },
        collaborators: { orderBy: { createdAt: 'asc' } }
      },
    });

    return NextResponse.json({ collection: updated });
  } catch (error) {
    console.error('Erreur demande de distribution collection Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Annuler une demande en attente
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { id } = await params;
    const collection = await prisma.onelibCollection.findFirst({ where: { id, userId: user.id } });
    if (!collection) return NextResponse.json({ error: 'Collection non trouvée' }, { status: 404 });
    if (collection.distributionStatus !== 'requested') {
      return NextResponse.json({ error: 'Aucune demande en attente à annuler' }, { status: 400 });
    }

    const updated = await prisma.onelibCollection.update({
      where: { id },
      data: { distributionStatus: 'none', distributionRequestedAt: null },
      include: {
        tracks: {
          include: {
            track: {
              select: {
                id: true, title: true, artist: true, coverUrl: true, genre: true, status: true,
                spotifyUrl: true, youtubeUrl: true, appleMusicUrl: true, deezerUrl: true,
              }
            }
          },
          orderBy: { order: 'asc' }
        },
        collaborators: { orderBy: { createdAt: 'asc' } }
      },
    });

    return NextResponse.json({ collection: updated });
  } catch (error) {
    console.error('Erreur annulation demande de distribution collection Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
