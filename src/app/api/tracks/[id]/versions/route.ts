import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// GET /api/tracks/:id/versions - Get all versions of a track
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const versions = await prisma.trackVersion.findMany({
      where: { trackId: params.id },
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
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audioFile') as File | null;
    const label = formData.get('label') as string | null;
    const duration = formData.get('duration') as string | null;

    // Check track ownership
    const track = await prisma.track.findFirst({
      where: { id: params.id, userId: user.id },
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

      const fileName = `${params.id}-v${nextVersion}-${Date.now()}${path.extname(audioFile.name)}`;
      const filePath = path.join(uploadsDir, fileName);
      const bytes = new Uint8Array(await audioFile.arrayBuffer());
      await writeFile(filePath, bytes);
      audioUrl = `/audio/${fileName}`;
    }

    // Create version
    const version = await prisma.trackVersion.create({
      data: {
        trackId: params.id,
        version: nextVersion,
        label: label || `V${nextVersion}`,
        audioUrl,
        duration: duration ? parseInt(duration) : null,
      },
    });

    // If this is V1 and track has no audioUrl, set it
    if (nextVersion === 1 && !track.audioUrl && audioUrl) {
      await prisma.track.update({
        where: { id: params.id },
        data: { audioUrl, duration: duration ? parseInt(duration) : null },
      });
    }

    return NextResponse.json({ version });
  } catch (error) {
    console.error('Error creating version:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/tracks/:id/versions - Delete a version
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { versionId } = await request.json();

    // Check ownership
    const track = await prisma.track.findFirst({
      where: { id: params.id, userId: user.id },
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
