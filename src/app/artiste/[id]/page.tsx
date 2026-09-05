import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import PublicArtistVitrine from '@/components/public-artist-vitrine';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getArtist(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { name: true, avatar: true, bio: true, genre: true, city: true },
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const artist = await getArtist(id);

  if (!artist) {
    return { title: 'Artiste non trouvé - Studiolib' };
  }

  const title = `${artist.name}${artist.genre ? ` - ${artist.genre}` : ''} | Studiolib`;
  const description = artist.bio
    || `Découvrez le profil et les créations de ${artist.name} sur Studiolib${artist.city ? ` (${artist.city})` : ''}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: artist.avatar ? [{ url: artist.avatar }] : undefined,
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: artist.avatar ? [artist.avatar] : undefined,
    },
  };
}

export default async function ArtistPublicPage({ params }: PageProps) {
  const { id } = await params;
  return <PublicArtistVitrine artistId={id} />;
}
