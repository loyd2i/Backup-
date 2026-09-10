import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const ROLES = ['compositeur', 'auteur', 'featuring', 'producteur', 'ingenieur_son'];

// GET - Collaborateurs crédités sur une release
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const release = await prisma.onelibRelease.findUnique({ where: { id } });
    if (!release || release.userId !== user.id) {
      return NextResponse.json({ error: 'Release non trouvée' }, { status: 404 });
    }

    const collaborators = await prisma.onelibCollaborator.findMany({
      where: { releaseId: id },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ collaborators });
  } catch (error) {
    console.error('Erreur récupération collaborateurs Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Ajouter un collaborateur crédité sur la release
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const release = await prisma.onelibRelease.findUnique({ where: { id } });
    if (!release || release.userId !== user.id) {
      return NextResponse.json({ error: 'Release non trouvée' }, { status: 404 });
    }

    // La répartition est formalisée à la demande de distribution : plus de
    // modification possible une fois la demande envoyée (voir BUSINESS-PLAN.md).
    if (release.distributionStatus !== 'none') {
      return NextResponse.json({ error: 'La répartition est verrouillée : une demande de distribution est en cours ou traitée' }, { status: 400 });
    }

    const { name, role, sharePercent, email } = await request.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
    }
    if (role && !ROLES.includes(role)) {
      return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 });
    }

    let share: number | null = null;
    if (sharePercent !== undefined && sharePercent !== null && sharePercent !== '') {
      share = Number(sharePercent);
      if (!Number.isFinite(share) || share < 0 || share > 100) {
        return NextResponse.json({ error: 'La part doit être comprise entre 0 et 100' }, { status: 400 });
      }
      const existing = await prisma.onelibCollaborator.aggregate({
        where: { releaseId: id },
        _sum: { sharePercent: true },
      });
      const currentTotal = existing._sum.sharePercent || 0;
      if (currentTotal + share > 100) {
        return NextResponse.json({ error: `La somme des parts dépasserait 100% (déjà ${currentTotal}%)` }, { status: 400 });
      }
    }

    let linkedUserId: string | null = null;
    let notFoundEmail: string | null = null;
    if (email && email.trim()) {
      const matched = await prisma.user.findUnique({ where: { email: email.trim() } });
      if (matched) linkedUserId = matched.id;
      else notFoundEmail = email.trim();
    }

    const collaborator = await prisma.onelibCollaborator.create({
      data: {
        releaseId: id,
        name: name.trim(),
        role: role || 'compositeur',
        sharePercent: share,
        userId: linkedUserId,
      }
    });

    return NextResponse.json({
      collaborator,
      warning: notFoundEmail ? `Aucun compte trouvé pour ${notFoundEmail} : le crédit reste un texte simple` : undefined,
    }, { status: 201 });
  } catch (error) {
    console.error('Erreur ajout collaborateur Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
