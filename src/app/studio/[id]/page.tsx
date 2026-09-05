import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import PublicVitrinePage from '@/components/public-vitrine-page';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getStudio(id: string) {
  return prisma.studio.findUnique({
    where: { id },
    select: { name: true, description: true, location: true, imageUrl: true, pricePerHour: true },
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const studio = await getStudio(id);

  if (!studio) {
    return { title: 'Studio non trouvé - Studiolib' };
  }

  const title = `${studio.name} - ${studio.location} | Studiolib`;
  const description = studio.description
    || `Réservez une session chez ${studio.name} à ${studio.location}, à partir de ${studio.pricePerHour}€/h.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: studio.imageUrl ? [{ url: studio.imageUrl }] : undefined,
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: studio.imageUrl ? [studio.imageUrl] : undefined,
    },
  };
}

export default async function StudioPublicPage({ params }: PageProps) {
  const { id } = await params;
  return <PublicVitrinePage studioId={id} />;
}
