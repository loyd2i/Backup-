import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { promoteCollectionIfDue } from '@/lib/onelib';

const TRACK_SELECT = {
  id: true, title: true, artist: true, coverUrl: true, genre: true, status: true,
  spotifyUrl: true, youtubeUrl: true, appleMusicUrl: true, deezerUrl: true,
} as const;

async function loadCollection(id: string, userId: string) {
  const collection = await prisma.onelibCollection.findUnique({
    where: { id },
    include: {
      tracks: { include: { track: { select: TRACK_SELECT } }, orderBy: { order: 'asc' } },
      collaborators: { orderBy: { createdAt: 'asc' } }
    }
  });
  if (!collection || collection.userId !== userId) return null;
  return collection;
}

// GET - Détail d'un album/playlist Onelib (propriétaire uniquement)
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
    let collection = await loadCollection(id, user.id);
    if (!collection) {
      return NextResponse.json({ error: 'Collection non trouvée' }, { status: 404 });
    }

    const promoted = await promoteCollectionIfDue(collection);
    if (promoted) collection = { ...collection, ...promoted };

    return NextResponse.json({ collection });
  } catch (error) {
    console.error('Erreur récupération collection Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH - Modifier un album/playlist (titre, description, coverUrl, statut)
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
    const collection = await loadCollection(id, user.id);
    if (!collection) {
      return NextResponse.json({ error: 'Collection non trouvée' }, { status: 404 });
    }

    const { title, description, coverUrl, status, scheduledAt } = await request.json();
    const data: {
      title?: string;
      description?: string | null;
      coverUrl?: string | null;
      status?: string;
      publishedAt?: Date | null;
      scheduledAt?: Date | null;
    } = {};

    if (title !== undefined) {
      if (!title.trim()) {
        return NextResponse.json({ error: 'Le titre est requis' }, { status: 400 });
      }
      data.title = title.trim();
    }
    if (description !== undefined) data.description = description || null;
    if (coverUrl !== undefined) data.coverUrl = coverUrl || null;

    if (status !== undefined) {
      if (!['draft', 'scheduled', 'published'].includes(status)) {
        return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
      }
      if (status === 'published' || status === 'scheduled') {
        if (collection.tracks.length === 0) {
          return NextResponse.json(
            { error: 'Ajoute au moins une track avant de publier' },
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
      if (status === 'published' && collection.status !== 'published') {
        data.publishedAt = new Date();
        data.scheduledAt = null;
      }
      if (status === 'draft') {
        data.publishedAt = null;
        data.scheduledAt = null;
      }
    }

    const updated = await prisma.onelibCollection.update({
      where: { id },
      data,
      include: {
        tracks: { include: { track: { select: TRACK_SELECT } }, orderBy: { order: 'asc' } },
        collaborators: { orderBy: { createdAt: 'asc' } }
      }
    });

    return NextResponse.json({ collection: updated });
  } catch (error) {
    console.error('Erreur mise à jour collection Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Supprimer un album/playlist Onelib
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
    const collection = await prisma.onelibCollection.findUnique({ where: { id } });
    if (!collection || collection.userId !== user.id) {
      return NextResponse.json({ error: 'Collection non trouvée' }, { status: 404 });
    }

    await prisma.onelibCollection.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression collection Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
