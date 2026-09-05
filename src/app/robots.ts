import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/studio/', '/artiste/', '/forum'],
      // Racine (SPA authentifiée) et routes API : rien d'utile à indexer.
      disallow: ['/', '/api/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
