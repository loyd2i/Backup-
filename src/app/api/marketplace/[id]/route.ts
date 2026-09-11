import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Détail d'un article marketplace (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await prisma.marketplaceItem.findUnique({
      where: { id },
      include: { seller: { select: { id: true, name: true, avatar: true } } },
    });
    if (!item) return NextResponse.json({ error: 'Article non trouvé' }, { status: 404 });
    return NextResponse.json({ item });
  } catch (error) {
    console.error('Erreur récupération article marketplace:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Retire son annonce (soft delete : les achats déjà faits restent valides)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { id } = await params;
    const item = await prisma.marketplaceItem.findUnique({ where: { id } });
    if (!item || item.sellerId !== user.id) {
      return NextResponse.json({ error: 'Article non trouvé' }, { status: 404 });
    }

    await prisma.marketplaceItem.update({ where: { id }, data: { isActive: false } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur retrait article marketplace:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
