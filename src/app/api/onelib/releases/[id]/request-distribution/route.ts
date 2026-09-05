import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// POST - Demander l'hébergement/distribution de la release (suivi interne : ce n'est
// PAS une soumission automatique aux plateformes de streaming, mais une demande
// horodatée qu'un humain traite ensuite manuellement auprès des vraies plateformes)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { id } = await params;
    const release = await prisma.onelibRelease.findFirst({ where: { id, userId: user.id } });
    if (!release) return NextResponse.json({ error: 'Release non trouvée' }, { status: 404 });

    if (release.distributionStatus !== 'none') {
      return NextResponse.json({ error: 'Une demande est déjà en cours pour cette release' }, { status: 400 });
    }

    const updated = await prisma.onelibRelease.update({
      where: { id },
      data: { distributionStatus: 'requested', distributionRequestedAt: new Date() },
      include: { track: true, collaborators: { orderBy: { createdAt: 'asc' } } },
    });

    return NextResponse.json({ release: updated });
  } catch (error) {
    console.error('Erreur demande de distribution release Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Annuler une demande en attente
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { id } = await params;
    const release = await prisma.onelibRelease.findFirst({ where: { id, userId: user.id } });
    if (!release) return NextResponse.json({ error: 'Release non trouvée' }, { status: 404 });
    if (release.distributionStatus !== 'requested') {
      return NextResponse.json({ error: 'Aucune demande en attente à annuler' }, { status: 400 });
    }

    const updated = await prisma.onelibRelease.update({
      where: { id },
      data: { distributionStatus: 'none', distributionRequestedAt: null },
      include: { track: true, collaborators: { orderBy: { createdAt: 'asc' } } },
    });

    return NextResponse.json({ release: updated });
  } catch (error) {
    console.error('Erreur annulation demande de distribution release Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
