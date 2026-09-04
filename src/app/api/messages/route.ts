import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// GET - Messages de l'utilisateur
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: user.id },
          { receiverId: user.id }
        ]
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        receiver: { select: { id: true, name: true, role: true } },
        attachments: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Erreur récupération messages:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Envoyer un message (supporte FormData pour les fichiers)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    
    let messageData: {
      receiverId: string;
      content: string;
      subject?: string;
      type: string;
      amount?: number;
      description?: string;
    };
    let files: { file: File; name: string }[] = [];

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData
      const formData = await request.formData();
      messageData = {
        receiverId: formData.get('receiverId') as string,
        content: formData.get('content') as string,
        subject: formData.get('subject') as string || undefined,
        type: (formData.get('type') as string) || 'message',
      };
      
      // Extract files
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('file-') && value instanceof File) {
          files.push({ file: value, name: key });
        }
      }
    } else {
      // Handle JSON
      const body = await request.json();
      messageData = {
        receiverId: body.receiverId,
        content: body.content,
        subject: body.subject,
        type: body.type || 'message',
        amount: body.amount ? parseFloat(body.amount) : undefined,
        description: body.description,
      };
    }

    if (!messageData.receiverId || !messageData.content) {
      return NextResponse.json(
        { error: 'Destinataire et contenu sont requis' },
        { status: 400 }
      );
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        senderId: user.id,
        receiverId: messageData.receiverId,
        content: messageData.content,
        subject: messageData.subject,
        type: messageData.type,
        amount: messageData.amount,
        description: messageData.description,
      },
      include: {
        sender: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } }
      }
    });

    // Handle file uploads
    if (files.length > 0) {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      for (const { file, name } of files) {
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

        // Create attachment record
        await prisma.messageAttachment.create({
          data: {
            messageId: message.id,
            fileName: file.name,
            fileType,
            fileUrl: `/api/files/${fileName}`,
            fileSize: file.size
          }
        });
      }
    }

    // Return message with attachments
    const fullMessage = await prisma.message.findUnique({
      where: { id: message.id },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        receiver: { select: { id: true, name: true, role: true } },
        attachments: true
      }
    });

    return NextResponse.json({ message: fullMessage, message_text: 'Message envoyé' }, { status: 201 });
  } catch (error) {
    console.error('Erreur envoi message:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
