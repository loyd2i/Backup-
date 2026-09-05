import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { SITE_URL } from '@/lib/site-config';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [studios, artists, posts] = await Promise.all([
    prisma.studio.findMany({
      where: { isActive: true },
      select: { id: true, updatedAt: true },
    }),
    // Seuls les artistes ayant au moins une création publique ou une sortie
    // Onelib publiée ont une fiche utile à indexer.
    prisma.user.findMany({
      where: {
        OR: [
          { tracks: { some: { isPublic: true, status: 'finished' } } },
          { onelibReleases: { some: { status: 'published' } } },
          { onelibCollections: { some: { status: 'published' } } },
        ],
      },
      select: { id: true, updatedAt: true },
    }),
    prisma.forumPost.findMany({
      select: { slug: true, updatedAt: true },
    }),
  ]);

  return [
    { url: `${SITE_URL}/forum`, changeFrequency: 'hourly', priority: 0.8 },
    ...studios.map((s) => ({
      url: `${SITE_URL}/studio/${s.id}`,
      lastModified: s.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
    ...artists.map((a) => ({
      url: `${SITE_URL}/artiste/${a.id}`,
      lastModified: a.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...posts.map((p) => ({
      url: `${SITE_URL}/forum/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ];
}
