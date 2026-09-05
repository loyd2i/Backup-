import { prisma } from '@/lib/db';

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
}

/**
 * Génère un slug unique partagé entre releases et collections (albums/playlists) :
 * les deux types de page publique vivent sous le même espace d'URL /o/{slug}.
 */
export async function generateUniqueOnelibSlug(base: string) {
  const root = slugify(base) || 'sortie';
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? root : `${root}-${Math.random().toString(36).slice(2, 6)}`;
    const [existingRelease, existingCollection] = await Promise.all([
      prisma.onelibRelease.findUnique({ where: { slug: candidate } }),
      prisma.onelibCollection.findUnique({ where: { slug: candidate } }),
    ]);
    if (!existingRelease && !existingCollection) return candidate;
  }
  return `${root}-${Date.now()}`;
}

/**
 * Promeut automatiquement une release/collection Onelib programmée ("scheduled")
 * vers "published" si sa date programmée est passée. Pas de tâche cron dans cet
 * environnement : la promotion se fait paresseusement, à chaque lecture.
 */
export async function promoteReleaseIfDue(release: { id: string; status: string; scheduledAt: Date | null }) {
  if (release.status === 'scheduled' && release.scheduledAt && release.scheduledAt <= new Date()) {
    return prisma.onelibRelease.update({
      where: { id: release.id },
      data: { status: 'published', publishedAt: release.scheduledAt },
      include: { track: true, collaborators: { orderBy: { createdAt: 'asc' } } }
    });
  }
  return null;
}

export async function promoteCollectionIfDue(collection: { id: string; status: string; scheduledAt: Date | null }) {
  if (collection.status === 'scheduled' && collection.scheduledAt && collection.scheduledAt <= new Date()) {
    return prisma.onelibCollection.update({
      where: { id: collection.id },
      data: { status: 'published', publishedAt: collection.scheduledAt },
      include: {
        tracks: { include: { track: true }, orderBy: { order: 'asc' } },
        collaborators: { orderBy: { createdAt: 'asc' } }
      }
    });
  }
  return null;
}
