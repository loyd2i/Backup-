import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const ROLES = ['compositeur', 'auteur', 'featuring', 'producteur', 'ingenieur_son'];

// GET - Collaborateurs crédités sur un album/playlist
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
    const collection = await prisma.onelibCollection.findUnique({ where: { id } });
    if (!collection || collection.userId !== user.id) {
      return NextResponse.json({ error: 'Collection non trouvée' }, { status: 404 });
    }

    const collaborators = await prisma.onelibCollectionCollaborator.findMany({
      where: { collectionId: id },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ collaborators });
  } catch (error) {
    console.error('Erreur récupération collaborateurs collection Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Ajouter un collaborateur crédité sur l'album/playlist
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
    const collection = await prisma.onelibCollection.findUnique({ where: { id } });
    if (!collection || collection.userId !== user.id) {
      return NextResponse.json({ error: 'Collection non trouvée' }, { status: 404 });
    }
    if (collection.distributionStatus !== 'none') {
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
      const existing = await prisma.onelibCollectionCollaborator.aggregate({
        where: { collectionId: id },
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

    const collaborator = await prisma.onelibCollectionCollaborator.create({
      data: {
        collectionId: id,
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
    console.error('Erreur ajout collaborateur collection Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
