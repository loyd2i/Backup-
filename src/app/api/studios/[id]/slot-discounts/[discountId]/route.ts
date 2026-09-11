import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// DELETE - Retire une réduction heures creuses avant qu'elle ne serve
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; discountId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { id, discountId } = await params;
    const studio = await prisma.studio.findFirst({ where: { id, ownerId: user.id } });
    if (!studio) return NextResponse.json({ error: 'Studio non trouvé' }, { status: 404 });

    const discount = await prisma.slotDiscount.findUnique({ where: { id: discountId } });
    if (!discount || discount.studioId !== id) {
      return NextResponse.json({ error: 'Réduction non trouvée' }, { status: 404 });
    }

    await prisma.slotDiscount.delete({ where: { id: discountId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression réduction heures creuses:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
