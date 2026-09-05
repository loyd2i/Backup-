import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// POST - Signer l'attestation d'auteur (preuve d'antériorité écrite et horodatée,
// ne remplace pas un dépôt officiel auprès de la SACEM ou d'un huissier)
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

    const { legalName } = await request.json();
    if (!legalName || !legalName.trim()) {
      return NextResponse.json({ error: 'Le nom légal est requis pour signer' }, { status: 400 });
    }

    const updated = await prisma.onelibRelease.update({
      where: { id },
      data: {
        authorLegalName: legalName.trim(),
        authorSignedAt: new Date(),
      },
      include: { track: true, collaborators: { orderBy: { createdAt: 'asc' } } }
    });

    return NextResponse.json({ release: updated });
  } catch (error) {
    console.error('Erreur signature attestation Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
