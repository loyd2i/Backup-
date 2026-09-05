import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST - Upload de la pochette d'un album/playlist
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { id } = await params;
    const collection = await prisma.onelibCollection.findFirst({ where: { id, userId: user.id } });
    if (!collection) return NextResponse.json({ error: 'Collection non trouvée' }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || file.size === 0)
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });
    if (!file.type.startsWith('image/'))
      return NextResponse.json({ error: 'Le fichier doit être une image' }, { status: 400 });
    if (file.size > 10 * 1024 * 1024)
      return NextResponse.json({ error: 'Image trop lourde (10 Mo max)' }, { status: 400 });

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'onelib');
    await mkdir(uploadsDir, { recursive: true });

    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${collection.id}-cover-${Date.now()}-${Math.random().toString(36).slice(7)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadsDir, fileName), buffer);

    const url = `/uploads/onelib/${fileName}`;
    const updated = await prisma.onelibCollection.update({
      where: { id: collection.id },
      data: { coverUrl: url },
      include: {
        tracks: {
          include: {
            track: {
              select: {
                id: true, title: true, artist: true, coverUrl: true, genre: true, status: true,
                spotifyUrl: true, youtubeUrl: true, appleMusicUrl: true, deezerUrl: true,
              }
            }
          },
          orderBy: { order: 'asc' }
        },
        collaborators: { orderBy: { createdAt: 'asc' } }
      },
    });

    return NextResponse.json({ url, collection: updated });
  } catch (error) {
    console.error('Erreur upload pochette collection Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
