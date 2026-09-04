import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
}

async function generateUniqueSlug(base: string) {
  const root = slugify(base) || 'sortie';
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? root : `${root}-${Math.random().toString(36).slice(2, 6)}`;
    const existing = await prisma.onelibRelease.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
  }
  return `${root}-${Date.now()}`;
}

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
        track: { select: { id: true, title: true, artist: true, coverUrl: true, genre: true, status: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ releases });
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

    const slug = await generateUniqueSlug(`${track.artist}-${track.title}`);

    const release = await prisma.onelibRelease.create({
      data: {
        trackId: track.id,
        userId: user.id,
        slug,
      },
      include: {
        track: { select: { id: true, title: true, artist: true, coverUrl: true, genre: true, status: true } }
      }
    });

    return NextResponse.json({ release }, { status: 201 });
  } catch (error) {
    console.error('Erreur création release Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
