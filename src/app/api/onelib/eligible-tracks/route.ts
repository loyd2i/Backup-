import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Tracks terminées de l'utilisateur ne possédant pas encore de release Onelib
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const tracks = await prisma.track.findMany({
      where: {
        userId: user.id,
        status: 'finished',
        onelibRelease: null,
      },
      select: { id: true, title: true, artist: true, coverUrl: true, genre: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error('Erreur récupération tracks éligibles Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
