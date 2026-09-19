import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { ONELIB_NORMALIZATION_FEE } from '@/lib/onelib-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST - Débite (simulé) le forfait de l'aperçu streaming normalisé. Le
// calcul lui-même (gain + limiteur) est fait côté client juste après, sans
// traitement manuel - contrairement à la distribution, il n'y a donc pas
// d'état "requested" en attente : chaque appel correspond à une génération.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { id } = await params;
    const release = await prisma.onelibRelease.findFirst({ where: { id, userId: user.id } });
    if (!release) return NextResponse.json({ error: 'Release non trouvée' }, { status: 404 });

    const updated = await prisma.onelibRelease.update({
      where: { id },
      data: {
        normalizationRequestedAt: new Date(),
        normalizationFeeAmount: ONELIB_NORMALIZATION_FEE,
      },
      include: { track: true, collaborators: { orderBy: { createdAt: 'asc' } } },
    });

    return NextResponse.json({ release: updated });
  } catch (error) {
    console.error('Erreur paiement aperçu normalisé Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT - Enregistre le résultat de la génération (extrait 30s + mesures
// réelles) une fois le DSP exécuté côté client, et publie l'aperçu.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { id } = await params;
    const release = await prisma.onelibRelease.findFirst({ where: { id, userId: user.id } });
    if (!release) return NextResponse.json({ error: 'Release non trouvée' }, { status: 404 });
    if (!release.normalizationRequestedAt) {
      return NextResponse.json({ error: "Aucun aperçu payé pour cette release" }, { status: 400 });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audioFile') as File | null;
    const lufs = formData.get('lufs') as string | null;
    const lra = formData.get('lra') as string | null;
    const truePeak = formData.get('truePeak') as string | null;
    const startSeconds = formData.get('startSeconds') as string | null;

    if (!audioFile || audioFile.size === 0) {
      return NextResponse.json({ error: 'Extrait audio requis' }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'previews');
    await mkdir(uploadsDir, { recursive: true });
    const fileName = `${id}-preview-${Date.now()}.wav`;
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    await writeFile(path.join(uploadsDir, fileName), buffer);

    const updated = await prisma.onelibRelease.update({
      where: { id },
      data: {
        normalizationStatus: 'done',
        previewAudioUrl: `/uploads/previews/${fileName}`,
        previewStartSeconds: startSeconds ? parseFloat(startSeconds) : null,
        normalizedLufs: lufs ? parseFloat(lufs) : null,
        normalizedLra: lra ? parseFloat(lra) : null,
        normalizedTruePeak: truePeak ? parseFloat(truePeak) : null,
      },
      include: { track: true, collaborators: { orderBy: { createdAt: 'asc' } } },
    });

    return NextResponse.json({ release: updated });
  } catch (error) {
    console.error('Erreur enregistrement aperçu normalisé Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
