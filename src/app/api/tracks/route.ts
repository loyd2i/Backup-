import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';

// GET - Tracks de l'utilisateur + tracks partagées avec lui + tracks du studio (si studio owner)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Check if user owns a studio
    const ownedStudios = await prisma.studio.findMany({
      where: { ownerId: user.id },
      select: { id: true }
    });
    const studioIds = ownedStudios.map(s => s.id);

    // Get user's own tracks
    const ownTracks = await prisma.track.findMany({
      where: { userId: user.id },
      include: {
        user: { select: { id: true, name: true } },
        studio: { select: { id: true, name: true, location: true } },
        comments: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        versions: { orderBy: { version: 'asc' } },
        masterValidation: { include: { version: true, requestedBy: { select: { id: true, name: true } } } },
        onelibRelease: { select: { id: true, slug: true } },
        _count: { select: { comments: true, sharedWith: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get tracks from user's studio (if studio owner)
    let studioTracks: typeof ownTracks = [];
    if (studioIds.length > 0) {
      studioTracks = await prisma.track.findMany({
        where: { 
          studioId: { in: studioIds },
          userId: { not: user.id } // Exclude own tracks to avoid duplicates
        },
        include: {
          user: { select: { id: true, name: true } },
          studio: { select: { id: true, name: true, location: true } },
          comments: {
            include: { user: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 5
          },
          versions: { orderBy: { version: 'asc' } },
          masterValidation: { include: { version: true, requestedBy: { select: { id: true, name: true } } } },
          onelibRelease: { select: { id: true, slug: true } },
          _count: { select: { comments: true, sharedWith: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    // Get tracks shared with user
    const sharedTracks = await prisma.trackShare.findMany({
      where: { userId: user.id },
      include: {
        track: {
          include: {
            user: { select: { id: true, name: true } },
            studio: { select: { id: true, name: true } },
            comments: {
              include: { user: { select: { id: true, name: true } } },
              orderBy: { createdAt: 'desc' },
              take: 5
            },
            versions: { orderBy: { version: 'asc' } },
            masterValidation: { include: { version: true, requestedBy: { select: { id: true, name: true } } } },
            onelibRelease: { select: { id: true, slug: true } },
            _count: { select: { comments: true } }
          }
        }
      }
    });

    const tracks = [
      ...ownTracks,
      ...studioTracks,
      ...sharedTracks.map(st => ({ ...st.track, isShared: true }))
    ];

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error('Erreur récupération tracks:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Créer une track avec fichier audio
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const formData = await request.formData();
    const title = formData.get('title') as string;
    const artist = formData.get('artist') as string;
    const bpm = formData.get('bpm') as string;
    const key = formData.get('key') as string;
    const genre = formData.get('genre') as string;
    const studioId = formData.get('studioId') as string;
    const status = formData.get('status') as string;
    // Une track en cours ne peut être rendue publique : seules les tracks
    // terminées peuvent être visibles publiquement ou via un lien.
    const isPublic = (status || 'in_progress') === 'finished' && formData.get('isPublic') === 'true';
    const duration = formData.get('duration') as string;
    const audioFile = formData.get('audioFile') as File | null;
    const sampleRate = formData.get('sampleRate') as string;
    const bitDepth = formData.get('bitDepth') as string;
    const bitrate = formData.get('bitrate') as string;
    const audioFormat = formData.get('audioFormat') as string;
    const truePeak = formData.get('truePeak') as string;
    const lufs = formData.get('lufs') as string;
    const lra = formData.get('lra') as string;
    const waveformPeaks = formData.get('waveformPeaks') as string;
    const instruments = formData.get('instruments') as string;

    if (!title || !artist) {
      return NextResponse.json(
        { error: 'Titre et artiste sont requis' },
        { status: 400 }
      );
    }

    let audioUrl: string | null = null;

    // Handle audio file upload
    if (audioFile && audioFile.size > 0) {
      try {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'tracks');
        await mkdir(uploadsDir, { recursive: true });

        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const ext = audioFile.name.split('.').pop() || 'mp3';
        const fileName = `${timestamp}-${randomStr}.${ext}`;
        const filePath = path.join(uploadsDir, fileName);

        const bytes = await audioFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        audioUrl = `/uploads/tracks/${fileName}`;
      } catch (fileError) {
        console.error('Erreur sauvegarde fichier:', fileError);
      }
    }

    const track = await prisma.track.create({
      data: {
        userId: user.id,
        title,
        artist,
        bpm: bpm ? parseInt(bpm) : null,
        key,
        genre: genre || null,
        studioId: studioId || null,
        status: status || 'in_progress',
        isPublic,
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
        instruments: instruments || null,
      },
      include: {
        studio: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json({ track, message: 'Track créée' }, { status: 201 });
  } catch (error) {
    console.error('Erreur création track:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT - Modifier une track
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...data } = body;

    const updateData: Record<string, unknown> = {};

    if (data.status !== undefined) updateData.status = data.status;

    // Visibilité : publique, lien uniquement (jeton d'accès partageable), ou
    // privée (invités seulement) — réservée aux tracks terminées. On charge
    // la track dès qu'une de ces trois choses est en jeu, pour vérifier le
    // statut effectif (celui déjà en base, ou celui demandé dans ce même PUT).
    if (data.visibility !== undefined || data.isPublic !== undefined) {
      const existing = await prisma.track.findUnique({
        where: { id },
        select: { userId: true, status: true, linkToken: true }
      });
      if (!existing || existing.userId !== user.id) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
      }

      const effectiveStatus = data.status !== undefined ? data.status : existing.status;
      const wantsVisible = data.visibility !== undefined ? data.visibility !== 'private' : !!data.isPublic;

      if (wantsVisible && effectiveStatus !== 'finished') {
        return NextResponse.json(
          { error: 'Seules les tracks terminées peuvent être rendues publiques ou partagées par lien' },
          { status: 400 }
        );
      }

      if (data.visibility === 'public') {
        updateData.isPublic = true;
      } else if (data.visibility === 'link') {
        updateData.isPublic = false;
        updateData.linkToken = existing.linkToken || randomBytes(24).toString('base64url');
      } else if (data.visibility === 'private') {
        updateData.isPublic = false;
        updateData.linkToken = null;
      } else if (data.isPublic !== undefined) {
        updateData.isPublic = data.isPublic;
      }
    }

    // Filet de sécurité : une track qui redevient "en cours" perd sa
    // visibilité publique et son lien de partage actif.
    if (data.status !== undefined && data.status !== 'finished') {
      updateData.isPublic = false;
      updateData.linkToken = null;
    }

    if (data.bpm !== undefined) updateData.bpm = data.bpm ? parseInt(data.bpm) : null;
    if (data.key !== undefined) updateData.key = data.key;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.artist !== undefined) updateData.artist = data.artist;
    if (data.studioId !== undefined) updateData.studioId = data.studioId;
    if (data.views !== undefined) updateData.views = data.views;
    if (data.genre !== undefined) updateData.genre = data.genre;
    if (data.releaseDate !== undefined) updateData.releaseDate = data.releaseDate ? new Date(data.releaseDate) : null;
    if (data.spotifyUrl !== undefined) updateData.spotifyUrl = data.spotifyUrl;
    if (data.youtubeUrl !== undefined) updateData.youtubeUrl = data.youtubeUrl;
    if (data.appleMusicUrl !== undefined) updateData.appleMusicUrl = data.appleMusicUrl;
    if (data.deezerUrl !== undefined) updateData.deezerUrl = data.deezerUrl;

    const track = await prisma.track.update({
      where: { id, userId: user.id },
      data: updateData,
      include: {
        studio: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json({ track, message: 'Track mise à jour' });
  } catch (error) {
    console.error('Erreur mise à jour track:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
