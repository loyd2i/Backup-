import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Liste des articles marketplace actifs (public), filtrable par catégorie
// ou par vendeur (?sellerId=me pour ses propres annonces)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const sellerIdParam = searchParams.get('sellerId');

    let sellerId: string | undefined;
    if (sellerIdParam === 'me') {
      const user = await getCurrentUser();
      if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
      sellerId = user.id;
    } else if (sellerIdParam) {
      sellerId = sellerIdParam;
    }

    const items = await prisma.marketplaceItem.findMany({
      where: {
        isActive: sellerId ? undefined : true,
        ...(category ? { category } : {}),
        ...(sellerId ? { sellerId } : {}),
      },
      include: {
        seller: { select: { id: true, name: true, avatar: true } },
        _count: { select: { purchases: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Erreur récupération marketplace:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Publier un article (sample pack ou instru) à vendre
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const formData = await request.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const price = formData.get('price') as string;
    const audioFile = formData.get('audioFile') as File | null;

    if (!title || !category || !price) {
      return NextResponse.json({ error: 'Titre, catégorie et prix sont requis' }, { status: 400 });
    }
    if (category !== 'sample_pack' && category !== 'instru') {
      return NextResponse.json({ error: 'Catégorie invalide' }, { status: 400 });
    }
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      return NextResponse.json({ error: 'Le prix doit être positif' }, { status: 400 });
    }
    if (!audioFile || audioFile.size === 0) {
      return NextResponse.json({ error: 'Un fichier audio est requis' }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'marketplace');
    await mkdir(uploadsDir, { recursive: true });

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const ext = audioFile.name.split('.').pop() || 'mp3';
    const fileName = `${timestamp}-${randomStr}.${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    const item = await prisma.marketplaceItem.create({
      data: {
        sellerId: user.id,
        title,
        description: description || null,
        category,
        price: priceNum,
        audioUrl: `/uploads/marketplace/${fileName}`,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('Erreur publication article marketplace:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
