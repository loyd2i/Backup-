import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { POINTS_PER_EURO, getPointsTier } from '@/lib/points-config';

// GET - Points fidélité de l'utilisateur courant + classement des artistes
//
// Basés sur les frais de service réellement gardés par la plateforme (non
// remboursés) : c'est la seule donnée réelle disponible aujourd'hui pour
// adosser les points fidélité (voir points-config.ts).
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const grouped = await prisma.appointment.groupBy({
      by: ['userId'],
      where: { artistCommissionRefunded: false },
      _sum: { artistCommissionAmount: true },
    });

    const pointsByUserId = new Map(
      grouped.map((row) => [row.userId, Math.round((row._sum.artistCommissionAmount || 0) * POINTS_PER_EURO)])
    );

    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { referralBonusPoints: true },
    });
    const points = (pointsByUserId.get(user.id) || 0) + (currentUser?.referralBonusPoints || 0);
    const { current, next, pointsToNext } = getPointsTier(points);

    const topUserIds = Array.from(pointsByUserId.entries())
      .filter(([, userPoints]) => userPoints > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId]) => userId);

    const topUsers = topUserIds.length
      ? await prisma.user.findMany({
          where: { id: { in: topUserIds }, role: 'artiste' },
          select: { id: true, name: true, referralBonusPoints: true },
        })
      : [];

    const leaderboard = topUserIds
      .map((userId) => topUsers.find((u) => u.id === userId))
      .filter((u): u is { id: string; name: string; referralBonusPoints: number } => !!u)
      .map((u) => ({ id: u.id, name: u.name, points: (pointsByUserId.get(u.id) || 0) + u.referralBonusPoints }));

    return NextResponse.json({
      points,
      tier: current.name,
      nextTier: next?.name || null,
      pointsToNext,
      leaderboard,
    });
  } catch (error) {
    console.error('Erreur récupération points fidélité:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
