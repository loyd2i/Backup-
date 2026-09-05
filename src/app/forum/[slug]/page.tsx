import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import PublicForumPostPage from '@/components/public-forum-post-page';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getPost(slug: string) {
  return prisma.forumPost.findUnique({
    where: { slug },
    select: { title: true, content: true, author: { select: { name: true } } },
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return { title: 'Sujet non trouvé - Forum Studiolib' };
  }

  const title = `${post.title} | Forum Studiolib`;
  const description = post.content.length > 160 ? `${post.content.slice(0, 157)}...` : post.content;

  return {
    title,
    description,
    openGraph: { title, description, type: 'article' },
  };
}

export default async function ForumPostPublicPage({ params }: PageProps) {
  const { slug } = await params;
  return <PublicForumPostPage slug={slug} />;
}
