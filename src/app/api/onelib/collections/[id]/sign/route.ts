import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// POST - Signer l'attestation d'auteur de l'album/playlist (preuve d'antériorité
// écrite et horodatée, ne remplace pas un dépôt officiel auprès de la SACEM ou d'un huissier)
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
    const collection = await prisma.onelibCollection.findUnique({ where: { id } });
    if (!collection || collection.userId !== user.id) {
      return NextResponse.json({ error: 'Collection non trouvée' }, { status: 404 });
    }

    const { legalName } = await request.json();
    if (!legalName || !legalName.trim()) {
      return NextResponse.json({ error: 'Le nom légal est requis pour signer' }, { status: 400 });
    }

    const updated = await prisma.onelibCollection.update({
      where: { id },
      data: {
        authorLegalName: legalName.trim(),
        authorSignedAt: new Date(),
      },
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
      }
    });

    return NextResponse.json({ collection: updated });
  } catch (error) {
    console.error('Erreur signature attestation collection Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
