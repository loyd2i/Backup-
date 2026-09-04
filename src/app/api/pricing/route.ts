import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Get pricing tiers for a studio
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studioId = searchParams.get('studioId');

    if (!studioId) {
      return NextResponse.json({ error: 'Studio ID requis' }, { status: 400 });
    }

    const tiers = await prisma.pricingTier.findMany({
      where: { studioId, isActive: true },
      orderBy: { price: 'asc' }
    });

    return NextResponse.json({ tiers });
  } catch (error) {
    console.error('Erreur récupération tarifs:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Create a new pricing tier
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { studioId, name, description, price, duration, unit } = body;

    if (!studioId || !name || !price) {
      return NextResponse.json({ error: 'Informations manquantes' }, { status: 400 });
    }

    // Verify ownership
    const studio = await prisma.studio.findUnique({
      where: { id: studioId }
    });

    if (!studio || studio.ownerId !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const tier = await prisma.pricingTier.create({
      data: {
        studioId,
        name,
        description,
        price: parseFloat(price),
        duration: duration || 0,
        unit: unit || 'heure'
      }
    });

    return NextResponse.json({ tier, message: 'Tarif créé' }, { status: 201 });
  } catch (error) {
    console.error('Erreur création tarif:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT - Update a pricing tier
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...data } = body;

    const tier = await prisma.pricingTier.findUnique({
      where: { id },
      include: { studio: true }
    });

    if (!tier || tier.studio.ownerId !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const updated = await prisma.pricingTier.update({
      where: { id },
      data: {
        ...data,
        price: data.price ? parseFloat(data.price) : undefined
      }
    });

    return NextResponse.json({ tier: updated, message: 'Tarif mis à jour' });
  } catch (error) {
    console.error('Erreur mise à jour tarif:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Delete a pricing tier
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    const tier = await prisma.pricingTier.findUnique({
      where: { id },
      include: { studio: true }
    });

    if (!tier || tier.studio.ownerId !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    await prisma.pricingTier.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({ message: 'Tarif supprimé' });
  } catch (error) {
    console.error('Erreur suppression tarif:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
