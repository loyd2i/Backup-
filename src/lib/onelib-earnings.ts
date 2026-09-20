import { prisma } from '@/lib/db';

// Répartit la cagnotte de dons Onelib (voir BUSINESS-PLAN.md "Onelib
// streaming") au prorata des écoutes de chaque morceau publié, puis, à
// l'intérieur d'un morceau, selon les parts déjà formalisées à la demande
// de distribution (OnelibCollaborator.sharePercent) — même accord que celui
// affiché publiquement sur la fiche, pas une nouvelle règle inventée ici.
// Tant qu'aucun don réel n'a été collecté (cagnotte à 0, avant Stripe
// Connect), ce calcul renvoie honnêtement 0€ pour tout le monde plutôt que
// d'afficher un montant fictif.
export interface OnelibEarningLine {
  trackId: string;
  title: string;
  role: string;
  sharePercent: number;
  amount: number;
}

export async function getOnelibEarningsForUser(userId: string) {
  const [poolAgg, releases] = await Promise.all([
    prisma.onelibDonation.aggregate({ _sum: { amount: true } }),
    prisma.onelibRelease.findMany({
      where: { status: 'published' },
      select: {
        track: { select: { id: true, title: true, userId: true, views: true } },
        collaborators: { select: { userId: true, role: true, sharePercent: true } },
      },
    }),
  ]);

  const totalPool = poolAgg._sum.amount || 0;
  const totalViews = releases.reduce((sum, r) => sum + r.track.views, 0);

  const perTrack: OnelibEarningLine[] = [];
  let totalEarnings = 0;

  if (totalPool > 0 && totalViews > 0) {
    for (const release of releases) {
      if (release.track.views === 0) continue;
      const trackShareOfPool = totalPool * (release.track.views / totalViews);
      const collaboratorsPercent = release.collaborators.reduce((s, c) => s + (c.sharePercent || 0), 0);

      if (release.track.userId === userId) {
        const ownerPercent = Math.max(0, 100 - collaboratorsPercent);
        const amount = trackShareOfPool * (ownerPercent / 100);
        if (amount > 0) {
          perTrack.push({ trackId: release.track.id, title: release.track.title, role: 'Artiste', sharePercent: ownerPercent, amount });
          totalEarnings += amount;
        }
      }

      for (const collab of release.collaborators) {
        if (collab.userId === userId && collab.sharePercent) {
          const amount = trackShareOfPool * (collab.sharePercent / 100);
          perTrack.push({ trackId: release.track.id, title: release.track.title, role: collab.role, sharePercent: collab.sharePercent, amount });
          totalEarnings += amount;
        }
      }
    }
  }

  return { totalPool, totalEarnings, perTrack };
}
