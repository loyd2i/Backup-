import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Récupère l'état de validation du master final d'une track
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;

    const ownedStudios = await prisma.studio.findMany({ where: { ownerId: user.id }, select: { id: true } });
    const studioIds = ownedStudios.map((s) => s.id);

    const track = await prisma.track.findFirst({
      where: { id, OR: [{ userId: user.id }, { studioId: { in: studioIds } }] },
    });

    if (!track) {
      return NextResponse.json({ error: 'Track non trouvée' }, { status: 404 });
    }

    const masterValidation = await prisma.masterValidation.findUnique({
      where: { trackId: id },
      include: { version: true, requestedBy: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ masterValidation });
  } catch (error) {
    console.error('Erreur récupération validation master:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Le studio propose une version comme master final
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const { versionId, note } = await request.json();

    if (!versionId) {
      return NextResponse.json({ error: 'Version requise' }, { status: 400 });
    }

    const ownedStudios = await prisma.studio.findMany({ where: { ownerId: user.id }, select: { id: true } });
    const studioIds = ownedStudios.map((s) => s.id);

    // Seul le studio associé à la track peut proposer un master
    const track = await prisma.track.findFirst({
      where: { id, studioId: { in: studioIds } },
    });

    if (!track) {
      return NextResponse.json({ error: 'Track non trouvée' }, { status: 404 });
    }

    const version = await prisma.trackVersion.findFirst({ where: { id: versionId, trackId: id } });
    if (!version) {
      return NextResponse.json({ error: 'Version non trouvée' }, { status: 404 });
    }

    const masterValidation = await prisma.masterValidation.upsert({
      where: { trackId: id },
      create: {
        trackId: id,
        versionId,
        requestedById: user.id,
        status: 'pending',
        note: note || null,
      },
      update: {
        versionId,
        requestedById: user.id,
        status: 'pending',
        note: note || null,
        feedback: null,
        respondedAt: null,
      },
      include: { version: true, requestedBy: { select: { id: true, name: true } } },
    });

    await prisma.notification.create({
      data: {
        userId: track.userId,
        type: 'master_proposed',
        title: 'Master final proposé',
        body: `Le studio vous propose "${version.label || `V${version.version}`}" comme master final pour "${track.title}".`,
      },
    });

    return NextResponse.json({ masterValidation });
  } catch (error) {
    console.error('Erreur proposition master:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH - L'artiste valide ou demande une révision du master proposé
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
    const { action, feedback } = await request.json();

    if (action !== 'validate' && action !== 'reject') {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
    }

    // Seul l'artiste propriétaire de la track peut valider son master
    const track = await prisma.track.findFirst({ where: { id, userId: user.id } });
    if (!track) {
      return NextResponse.json({ error: 'Track non trouvée' }, { status: 404 });
    }

    const existing = await prisma.masterValidation.findUnique({ where: { trackId: id } });
    if (!existing || existing.status !== 'pending') {
      return NextResponse.json({ error: 'Aucun master en attente de validation' }, { status: 400 });
    }

    const masterValidation = await prisma.masterValidation.update({
      where: { trackId: id },
      data: {
        status: action === 'validate' ? 'validated' : 'rejected',
        feedback: action === 'reject' ? feedback || null : null,
        respondedAt: new Date(),
      },
      include: { version: true },
    });

    if (action === 'validate') {
      await prisma.track.update({
        where: { id },
        data: {
          status: 'finished',
          audioUrl: masterValidation.version.audioUrl,
          duration: masterValidation.version.duration ?? track.duration,
        },
      });
    }

    await prisma.notification.create({
      data: {
        userId: existing.requestedById,
        type: action === 'validate' ? 'master_validated' : 'master_rejected',
        title: action === 'validate' ? 'Master final validé' : 'Révision demandée',
        body: action === 'validate'
          ? `L'artiste a validé le master final de "${track.title}".`
          : `L'artiste a demandé une révision du master final de "${track.title}"${feedback ? ` : "${feedback}"` : '.'}`,
      },
    });

    return NextResponse.json({ masterValidation });
  } catch (error) {
    console.error('Erreur validation master:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
