import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST - Ajoute une photo à la galerie du studio (carrousel vitrine)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { id } = await params;
    const studio = await prisma.studio.findFirst({ where: { id, ownerId: user.id } });
    if (!studio) return NextResponse.json({ error: 'Studio non trouvé' }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const caption = (formData.get('caption') as string) || null;

    if (!file || file.size === 0)
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });
    if (!file.type.startsWith('image/'))
      return NextResponse.json({ error: 'Le fichier doit être une image' }, { status: 400 });
    if (file.size > 10 * 1024 * 1024)
      return NextResponse.json({ error: 'Image trop lourde (10 Mo max)' }, { status: 400 });

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'studios');
    await mkdir(uploadsDir, { recursive: true });

    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${studio.id}-gallery-${Date.now()}-${Math.random().toString(36).slice(7)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadsDir, fileName), buffer);

    const count = await prisma.studioPhoto.count({ where: { studioId: id } });
    const photo = await prisma.studioPhoto.create({
      data: { studioId: id, url: `/uploads/studios/${fileName}`, caption, order: count },
    });

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    console.error('Erreur ajout photo galerie studio:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
