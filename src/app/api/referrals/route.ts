import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Parrainages de l'utilisateur courant : code à partager et suivi des
// filleuls (en attente / actif). Purement informatif — la plateforme ne
// crédite ni ne débite rien ici (voir src/lib/referrals.ts).
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const referrals = await prisma.referral.findMany({
      where: { referrerId: user.id },
      include: { referredUser: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      referralCode: user.id,
      referrals: referrals.map((r) => ({
        id: r.id,
        referredUserName: r.referredUser.name,
        referredUserRole: r.referredUser.role,
        isActive: r.isActive,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('Erreur récupération parrainages:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
