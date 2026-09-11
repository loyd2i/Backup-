import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// DELETE - Désactive une offre de pack d'heures (soft delete : les packs déjà
// achetés restent valides, seule la vente de nouveaux packs s'arrête)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; offerId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { id, offerId } = await params;
    const studio = await prisma.studio.findFirst({ where: { id, ownerId: user.id } });
    if (!studio) return NextResponse.json({ error: 'Studio non trouvé' }, { status: 404 });

    const offer = await prisma.hoursPackOffer.findUnique({ where: { id: offerId } });
    if (!offer || offer.studioId !== id) {
      return NextResponse.json({ error: 'Offre non trouvée' }, { status: 404 });
    }

    await prisma.hoursPackOffer.update({ where: { id: offerId }, data: { isActive: false } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur désactivation offre pack d\'heures:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
