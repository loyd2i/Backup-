import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Liste des studios
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';

    const studios = await prisma.studio.findMany({
      where: {
        AND: [
          search ? {
            OR: [
              { name: { contains: search } },
              { location: { contains: search } }
            ]
          } : {},
          type ? { type } : {}
        ]
      },
      include: {
        owner: {
          select: { id: true, name: true }
        }
      },
      orderBy: { rating: 'desc' }
    });

    return NextResponse.json({ studios });
  } catch (error) {
    console.error('Erreur récupération studios:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Créer un studio
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, location, type, pricePerHour, country } = body;

    if (!name || !location || !pricePerHour) {
      return NextResponse.json(
        { error: 'Nom, location et prix sont requis' },
        { status: 400 }
      );
    }

    const studio = await prisma.studio.create({
      data: {
        name,
        description,
        location,
        type: type || 'professionnel',
        pricePerHour: parseFloat(pricePerHour),
        country: country || 'FR',
        ownerId: user.id
      }
    });

    return NextResponse.json({ studio, message: 'Studio créé avec succès' }, { status: 201 });
  } catch (error) {
    console.error('Erreur création studio:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
