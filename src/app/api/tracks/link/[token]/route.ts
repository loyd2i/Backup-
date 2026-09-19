import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Résout une track via son jeton de lien de partage (pas d'auth requise).
// Réservé aux tracks terminées avec un lien actif : une track repassée en
// "en cours" ou en visibilité "privée" efface son linkToken côté API tracks,
// ce qui invalide automatiquement tout lien déjà distribué.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const track = await prisma.track.findUnique({
      where: { linkToken: token },
      select: {
        id: true, title: true, artist: true, bpm: true, key: true, genre: true,
        status: true, audioUrl: true, coverUrl: true, duration: true, views: true,
        isPublic: true,
        spotifyUrl: true, youtubeUrl: true, appleMusicUrl: true, deezerUrl: true,
        user: { select: { id: true, name: true } },
        studio: { select: { id: true, name: true } },
      }
    });

    if (!track || track.status !== 'finished') {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 });
    }

    return NextResponse.json({ track });
  } catch (error) {
    console.error('Erreur résolution lien track:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
