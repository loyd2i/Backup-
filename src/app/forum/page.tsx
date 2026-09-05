import type { Metadata } from 'next';
import PublicForumPage from '@/components/public-forum-page';

export const metadata: Metadata = {
  title: 'Forum Amateurs de Son | Studiolib',
  description: 'Échangez avec la communauté sur le mixage, le mastering et la production musicale.',
};

export default function ForumPublicPage() {
  return <PublicForumPage />;
}
