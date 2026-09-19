import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// GET /api/tracks/:id/versions - Get all versions of a track
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

    // Seul le propriétaire de la track peut lister ses versions (URLs audio incluses)
    const track = await prisma.track.findFirst({
      where: { id, userId: user.id },
    });

    if (!track) {
      return NextResponse.json({ error: 'Track non trouvée' }, { status: 404 });
    }

    const versions = await prisma.trackVersion.findMany({
      where: { trackId: id },
      orderBy: { version: 'asc' },
    });

    return NextResponse.json({ versions });
  } catch (error) {
    console.error('Error fetching versions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tracks/:id/versions - Upload a new version
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

    const formData = await request.formData();
    const audioFile = formData.get('audioFile') as File | null;
    const label = formData.get('label') as string | null;
    const duration = formData.get('duration') as string | null;
    const sampleRate = formData.get('sampleRate') as string | null;
    const bitDepth = formData.get('bitDepth') as string | null;
    const bitrate = formData.get('bitrate') as string | null;
    const audioFormat = formData.get('audioFormat') as string | null;
    const truePeak = formData.get('truePeak') as string | null;
    const lufs = formData.get('lufs') as string | null;
    const lra = formData.get('lra') as string | null;
    const waveformPeaks = formData.get('waveformPeaks') as string | null;

    // Check track ownership
    const track = await prisma.track.findFirst({
      where: { id, userId: user.id },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } }
    });

    if (!track) {
      return NextResponse.json({ error: 'Track non trouvée' }, { status: 404 });
    }

    // Determine next version number
    const nextVersion = track.versions.length > 0 ? track.versions[0].version + 1 : 1;

    let audioUrl = '';

    if (audioFile) {
      // Save audio file
      const uploadsDir = path.join(process.cwd(), 'public', 'audio');
      await mkdir(uploadsDir, { recursive: true });

      const fileName = `${id}-v${nextVersion}-${Date.now()}${path.extname(audioFile.name)}`;
      const filePath = path.join(uploadsDir, fileName);
      const bytes = new Uint8Array(await audioFile.arrayBuffer());
      await writeFile(filePath, bytes);
      audioUrl = `/audio/${fileName}`;
    }

    // Create version
    const version = await prisma.trackVersion.create({
      data: {
        trackId: id,
        version: nextVersion,
        label: label || `V${nextVersion}`,
        audioUrl,
        duration: duration ? parseInt(duration) : null,
        sampleRate: sampleRate ? parseInt(sampleRate) : null,
        bitDepth: bitDepth ? parseInt(bitDepth) : null,
        bitrate: bitrate ? parseInt(bitrate) : null,
        audioFormat: audioFormat || null,
        truePeak: truePeak ? parseFloat(truePeak) : null,
        lufs: lufs ? parseFloat(lufs) : null,
        lra: lra ? parseFloat(lra) : null,
        waveformPeaks: waveformPeaks || null,
      },
    });

    // If this is V1 and track has no audioUrl, set it (avec les mêmes specs techniques)
    if (nextVersion === 1 && !track.audioUrl && audioUrl) {
      await prisma.track.update({
        where: { id },
        data: {
          audioUrl,
          duration: duration ? parseInt(duration) : null,
          sampleRate: sampleRate ? parseInt(sampleRate) : null,
          bitDepth: bitDepth ? parseInt(bitDepth) : null,
          bitrate: bitrate ? parseInt(bitrate) : null,
          audioFormat: audioFormat || null,
          truePeak: truePeak ? parseFloat(truePeak) : null,
          lufs: lufs ? parseFloat(lufs) : null,
          lra: lra ? parseFloat(lra) : null,
          waveformPeaks: waveformPeaks || null,
        },
      });
    }

    return NextResponse.json({ version });
  } catch (error) {
    console.error('Error creating version:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/tracks/:id/versions - Renseigne les caractéristiques techniques
// d'une version (tempo, tonalité, loudness, waveform...) une fois l'analyse
// complète terminée en arrière-plan, après que la version a déjà été créée
// et uploadée avec ses seules métadonnées rapides.
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
    const { versionId, ...data } = body;

    const track = await prisma.track.findFirst({ where: { id, userId: user.id } });
    if (!track) {
      return NextResponse.json({ error: 'Track non trouvée' }, { status: 404 });
    }

    const version = await prisma.trackVersion.findFirst({ where: { id: versionId, trackId: id } });
    if (!version) {
      return NextResponse.json({ error: 'Version non trouvée' }, { status: 404 });
    }

    const specs = {
      duration: data.duration !== undefined && data.duration !== null ? parseInt(data.duration) : version.duration,
      sampleRate: data.sampleRate !== undefined && data.sampleRate !== null ? parseInt(data.sampleRate) : version.sampleRate,
      bitDepth: data.bitDepth !== undefined && data.bitDepth !== null ? parseInt(data.bitDepth) : version.bitDepth,
      bitrate: data.bitrate !== undefined && data.bitrate !== null ? parseInt(data.bitrate) : version.bitrate,
      audioFormat: data.audioFormat ?? version.audioFormat,
      truePeak: data.truePeak !== undefined && data.truePeak !== null ? parseFloat(data.truePeak) : version.truePeak,
      lufs: data.lufs !== undefined && data.lufs !== null ? parseFloat(data.lufs) : version.lufs,
      lra: data.lra !== undefined && data.lra !== null ? parseFloat(data.lra) : version.lra,
      waveformPeaks: data.waveformPeaks ?? version.waveformPeaks,
    };

    const updatedVersion = await prisma.trackVersion.update({
      where: { id: versionId },
      data: specs,
    });

    // Si cette version est celle actuellement reflétée sur la track (même
    // fichier audio), on met aussi à jour ses specs pour rester cohérent.
    if (track.audioUrl && track.audioUrl === version.audioUrl) {
      await prisma.track.update({ where: { id }, data: specs });
    }

    return NextResponse.json({ version: updatedVersion });
  } catch (error) {
    console.error('Error updating version specs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/tracks/:id/versions - Delete a version
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const { versionId } = await request.json();

    // Check ownership
    const track = await prisma.track.findFirst({
      where: { id, userId: user.id },
    });

    if (!track) {
      return NextResponse.json({ error: 'Track non trouvée' }, { status: 404 });
    }

    await prisma.trackVersion.delete({
      where: { id: versionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting version:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
