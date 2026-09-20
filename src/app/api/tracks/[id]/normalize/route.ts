import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { ONELIB_TOKEN_PRICE } from '@/lib/onelib-config';
import { hasUnlimitedNormalization, consumeNormalizationToken } from '@/lib/onelib-tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST - Consomme un jeton de normalisation (illimité si abonnement label,
// sinon un jeton si le solde le permet, sinon paiement simulé à l'unité).
// Geste sur la track elle-même, dans Créations, avant toute éventuelle
// sortie Onelib (voir BUSINESS-PLAN.md). Le calcul (gain + limiteur) est
// fait côté client juste après, sans traitement manuel - chaque appel
// correspond directement à une génération.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { id } = await params;
    const track = await prisma.track.findFirst({ where: { id, userId: user.id } });
    if (!track) return NextResponse.json({ error: 'Track non trouvée' }, { status: 404 });
    if (!track.audioUrl) return NextResponse.json({ error: 'Cette track n\'a pas encore de fichier audio' }, { status: 400 });

    const unlimited = await hasUnlimitedNormalization(user.id);
    let usedToken = false;
    let chargedAmount = 0;

    if (!unlimited) {
      usedToken = await consumeNormalizationToken(user.id);
      if (!usedToken) {
        // Aucun jeton disponible : paiement simulé à l'unité (pas de vrai Stripe).
        chargedAmount = ONELIB_TOKEN_PRICE;
      }
    }

    const updated = await prisma.track.update({
      where: { id },
      data: {
        normalizationRequestedAt: new Date(),
        normalizationFeeAmount: chargedAmount,
      },
    });

    const freshUser = await prisma.user.findUnique({ where: { id: user.id }, select: { normalizationTokens: true } });

    return NextResponse.json({
      track: updated,
      unlimited,
      usedToken,
      chargedAmount,
      tokensRemaining: freshUser?.normalizationTokens ?? 0,
    });
  } catch (error) {
    console.error('Erreur paiement aperçu normalisé:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT - Enregistre le résultat de la génération (extrait 30s + mesures
// réelles) une fois le DSP exécuté côté client.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { id } = await params;
    const track = await prisma.track.findFirst({ where: { id, userId: user.id } });
    if (!track) return NextResponse.json({ error: 'Track non trouvée' }, { status: 404 });
    if (!track.normalizationRequestedAt) {
      return NextResponse.json({ error: "Aucune génération payée pour cette track" }, { status: 400 });
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

    const updated = await prisma.track.update({
      where: { id },
      data: {
        normalizationStatus: 'done',
        previewAudioUrl: `/uploads/previews/${fileName}`,
        previewStartSeconds: startSeconds ? parseFloat(startSeconds) : null,
        normalizedLufs: lufs ? parseFloat(lufs) : null,
        normalizedLra: lra ? parseFloat(lra) : null,
        normalizedTruePeak: truePeak ? parseFloat(truePeak) : null,
      },
    });

    return NextResponse.json({ track: updated });
  } catch (error) {
    console.error('Erreur enregistrement aperçu normalisé:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
