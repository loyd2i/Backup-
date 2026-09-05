// URL publique de base du site, utilisée pour générer des URLs absolues
// (sitemap, robots.txt, métadonnées Open Graph côté serveur où request.url
// n'est pas disponible). À renseigner via NEXT_PUBLIC_SITE_URL en production.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
