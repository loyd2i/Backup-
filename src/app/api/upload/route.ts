import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const ext = file.name.split('.').pop();
    const fileName = `${timestamp}-${randomStr}.${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    // Write file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Determine file type
    let fileType = 'document';
    if (file.type.startsWith('image/')) fileType = 'image';
    else if (file.type.startsWith('audio/')) fileType = 'audio';
    else if (file.type.startsWith('video/')) fileType = 'video';

    return NextResponse.json({
      success: true,
      file: {
        fileName: file.name,
        fileType,
        fileUrl: `/api/files/${fileName}`,
        fileSize: file.size
      }
    });
  } catch (error) {
    console.error('Erreur upload:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
