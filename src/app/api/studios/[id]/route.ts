import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { isSafeHttpUrl } from '@/lib/url-safety';

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

    // Crédits en tant que collaborateur (ingénieur son...) sur des sorties Onelib
    // publiées d'artistes — formalise la répartition des royalties, voir BUSINESS-PLAN.md
    const [releaseCredits, collectionCredits] = await Promise.all([
      prisma.onelibCollaborator.findMany({
        where: { userId: studio.ownerId, release: { status: 'published' } },
        select: {
          role: true, sharePercent: true,
          release: { select: { slug: true, track: { select: { title: true, artist: true, coverUrl: true } } } },
        },
      }),
      prisma.onelibCollectionCollaborator.findMany({
        where: { userId: studio.ownerId, collection: { status: 'published' } },
        select: {
          role: true, sharePercent: true,
          collection: { select: { slug: true, title: true, kind: true, coverUrl: true } },
        },
      }),
    ]);

    const credits = [
      ...releaseCredits.map(c => ({
        slug: c.release.slug, title: c.release.track.title, artist: c.release.track.artist,
        coverUrl: c.release.track.coverUrl, role: c.role, sharePercent: c.sharePercent,
      })),
      ...collectionCredits.map(c => ({
        slug: c.collection.slug, title: c.collection.title, artist: null,
        coverUrl: c.collection.coverUrl, role: c.role, sharePercent: c.sharePercent,
      })),
    ];

    return NextResponse.json({
      studio,
      photos: studio.photos,
      links: studio.links,
      credits,
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

    // Rendus tels quels en href sur la fiche publique du studio - contrairement
    // à instagram/twitter, toujours interpolés dans un gabarit fixe.
    for (const [field, value] of Object.entries({
      website: body.website,
      facebook: body.facebook,
      youtube: body.youtube,
      spotify: body.spotify,
      soundcloud: body.soundcloud,
    })) {
      if (value && !isSafeHttpUrl(value)) {
        return NextResponse.json({ error: `Lien ${field} invalide (http/https requis)` }, { status: 400 });
      }
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

    // Liste explicite des champs modifiables : `body` passait tel quel vers
    // Prisma, un studio aurait pu écraser n'importe quel champ de sa propre
    // fiche (solde du portefeuille, statut actif...).
    for (const [field, value] of Object.entries({
      website: body.website,
      facebook: body.facebook,
      youtube: body.youtube,
      spotify: body.spotify,
      soundcloud: body.soundcloud,
    })) {
      if (value && !isSafeHttpUrl(value)) {
        return NextResponse.json({ error: `Lien ${field} invalide (http/https requis)` }, { status: 400 });
      }
    }

    const data: Record<string, unknown> = {};
    for (const field of [
      'name', 'description', 'equipment', 'phone', 'country', 'referralOffer',
      'website', 'instagram', 'twitter', 'facebook', 'youtube', 'spotify', 'soundcloud',
    ]) {
      if (body[field] !== undefined) data[field] = body[field];
    }

    if (body.eStudioPricePerHour !== undefined) {
      if (body.eStudioPricePerHour === null) {
        data.eStudioPricePerHour = null;
      } else {
        const price = Number(body.eStudioPricePerHour);
        if (!Number.isFinite(price) || price < 0) {
          return NextResponse.json({ error: 'Tarif E-Studio invalide' }, { status: 400 });
        }
        data.eStudioPricePerHour = price;
      }
    }

    const updated = await prisma.studio.update({
      where: { id },
      data,
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
