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

    const { name, role } = await request.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
    }
    if (role && !ROLES.includes(role)) {
      return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 });
    }

    const collaborator = await prisma.onelibCollaborator.create({
      data: {
        releaseId: id,
        name: name.trim(),
        role: role || 'compositeur',
      }
    });

    return NextResponse.json({ collaborator }, { status: 201 });
  } catch (error) {
    console.error('Erreur ajout collaborateur Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
