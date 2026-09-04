import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Get studio details with photos and links
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const studio = await prisma.studio.findUnique({
      where: { id },
      include: {
        photos: { orderBy: { order: 'asc' } },
        links: { orderBy: { order: 'asc' }, where: { isActive: true } },
        pricingTiers: { where: { isActive: true }, orderBy: { price: 'asc' } },
        availabilities: { orderBy: { dayOfWeek: 'asc' } }
      }
    });

    if (!studio) {
      return NextResponse.json({ error: 'Studio non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ 
      studio,
      photos: studio.photos,
      links: studio.links
    });
  } catch (error) {
    console.error('Error fetching studio:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT - Update studio details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verify ownership
    const studio = await prisma.studio.findFirst({
      where: { id, ownerId: user.id }
    });

    if (!studio) {
      return NextResponse.json({ error: 'Studio non trouvé' }, { status: 404 });
    }

    const updated = await prisma.studio.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        location: body.location,
        address: body.address,
        type: body.type,
        pricePerHour: body.pricePerHour,
        equipment: body.equipment,
        capacity: body.capacity,
        phone: body.phone,
        website: body.website,
        instagram: body.instagram,
        twitter: body.twitter,
        facebook: body.facebook,
        youtube: body.youtube,
        spotify: body.spotify,
        soundcloud: body.soundcloud,
      }
    });

    return NextResponse.json({ studio: updated });
  } catch (error) {
    console.error('Error updating studio:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH - Partial update studio details
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verify ownership
    const studio = await prisma.studio.findFirst({
      where: { id, ownerId: user.id }
    });

    if (!studio) {
      return NextResponse.json({ error: 'Studio non trouvé' }, { status: 404 });
    }

    const updated = await prisma.studio.update({
      where: { id },
      data: body,
      include: {
        photos: { orderBy: { order: 'asc' } },
        links: { orderBy: { order: 'asc' } },
        pricingTiers: { where: { isActive: true }, orderBy: { price: 'asc' } },
        availabilities: { orderBy: { dayOfWeek: 'asc' } }
      }
    });

    return NextResponse.json({ studio: updated });
  } catch (error) {
    console.error('Error updating studio:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
