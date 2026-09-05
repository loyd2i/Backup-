import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { promoteReleaseIfDue } from '@/lib/onelib';

// GET - Détail d'une release Onelib (propriétaire uniquement)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    let release = await prisma.onelibRelease.findUnique({
      where: { id },
      include: { track: true, collaborators: { orderBy: { createdAt: 'asc' } } }
    });

    if (!release || release.userId !== user.id) {
      return NextResponse.json({ error: 'Release non trouvée' }, { status: 404 });
    }

    release = (await promoteReleaseIfDue(release)) || release;

    return NextResponse.json({ release });
  } catch (error) {
    console.error('Erreur récupération release Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH - Modifier une release (description, soundcloudUrl, coverUrl, statut brouillon/publiée)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const release = await prisma.onelibRelease.findUnique({
      where: { id },
      include: { track: { select: { spotifyUrl: true, youtubeUrl: true, appleMusicUrl: true, deezerUrl: true } } }
    });
    if (!release || release.userId !== user.id) {
      return NextResponse.json({ error: 'Release non trouvée' }, { status: 404 });
    }

    const { description, soundcloudUrl, coverUrl, status, scheduledAt } = await request.json();
    const data: {
      description?: string | null;
      soundcloudUrl?: string | null;
      coverUrl?: string | null;
      status?: string;
      publishedAt?: Date | null;
      scheduledAt?: Date | null;
    } = {};

    if (description !== undefined) data.description = description || null;
    if (soundcloudUrl !== undefined) data.soundcloudUrl = soundcloudUrl || null;
    if (coverUrl !== undefined) data.coverUrl = coverUrl || null;

    if (status !== undefined) {
      if (!['draft', 'scheduled', 'published'].includes(status)) {
        return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
      }
      if (status === 'published' || status === 'scheduled') {
        const effectiveSoundcloudUrl = soundcloudUrl !== undefined ? soundcloudUrl : release.soundcloudUrl;
        const hasAnyLink = !!(
          release.track.spotifyUrl || release.track.youtubeUrl ||
          release.track.appleMusicUrl || release.track.deezerUrl || effectiveSoundcloudUrl
        );
        if (!hasAnyLink) {
          return NextResponse.json(
            { error: 'Ajoute au moins un lien de diffusion avant de publier' },
            { status: 400 }
          );
        }
      }
      if (status === 'scheduled') {
        if (!scheduledAt) {
          return NextResponse.json({ error: 'Date de programmation requise' }, { status: 400 });
        }
        const date = new Date(scheduledAt);
        if (isNaN(date.getTime()) || date <= new Date()) {
          return NextResponse.json({ error: 'La date de programmation doit être dans le futur' }, { status: 400 });
        }
        data.scheduledAt = date;
        data.publishedAt = null;
      }
      data.status = status;
      if (status === 'published' && release.status !== 'published') {
        data.publishedAt = new Date();
        data.scheduledAt = null;
      }
      if (status === 'draft') {
        data.publishedAt = null;
        data.scheduledAt = null;
      }
    }

    const updated = await prisma.onelibRelease.update({
      where: { id },
      data,
      include: { track: true, collaborators: { orderBy: { createdAt: 'asc' } } }
    });

    return NextResponse.json({ release: updated });
  } catch (error) {
    console.error('Erreur mise à jour release Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Supprimer une release Onelib
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const release = await prisma.onelibRelease.findUnique({ where: { id } });
    if (!release || release.userId !== user.id) {
      return NextResponse.json({ error: 'Release non trouvée' }, { status: 404 });
    }

    await prisma.onelibRelease.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression release Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
