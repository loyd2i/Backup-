// Point d'entrée officiel Next.js pour démarrer du code une seule fois au
// lancement du serveur (voir https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation).
// Sert ici à démarrer le scheduler de rendez-vous (rappel 2h, clôture
// automatique des sessions) - non applicable au runtime edge, qui n'a pas
// accès à Prisma/SQLite.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startScheduler } = await import('@/lib/scheduler');
    startScheduler();
  }
}
