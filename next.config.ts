import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  agentRules: false,
  // Depuis Next.js 15, le serveur de dev bloque par défaut les requêtes vers
  // ses ressources internes (chunks JS, HMR websocket) quand l'origine n'est
  // ni "localhost" ni celle utilisée pour démarrer le serveur. Ça casse
  // silencieusement l'app (page visible mais totalement inerte, aucun bouton
  // ne répond) quand on teste `npm run dev` depuis un téléphone via l'IP
  // locale du réseau Wi-Fi plutôt que via localhost. On autorise donc les
  // plages d'IP privées habituelles pour le développement uniquement (aucun
  // effet en production/build).
  allowedDevOrigins: [
    "192.168.*.*",
    "10.*.*.*",
    "172.16.*.*", "172.17.*.*", "172.18.*.*", "172.19.*.*",
    "172.20.*.*", "172.21.*.*", "172.22.*.*", "172.23.*.*",
    "172.24.*.*", "172.25.*.*", "172.26.*.*", "172.27.*.*",
    "172.28.*.*", "172.29.*.*", "172.30.*.*", "172.31.*.*",
  ],
};

export default nextConfig;
