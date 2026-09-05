import { prisma } from '@/lib/db';

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
