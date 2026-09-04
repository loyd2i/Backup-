import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// POST - Add a block
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
    const body = await request.json();
    const { date, startTime, endTime, reason } = body;

    // Verify user owns this studio
    const studio = await prisma.studio.findFirst({
      where: { id, ownerId: user.id }
    });

    if (!studio) {
      return NextResponse.json({ error: 'Studio non trouvé' }, { status: 404 });
    }

    const block = await prisma.studioBlock.create({
      data: {
        studioId: id,
        date: new Date(date),
        startTime: startTime || null,
        endTime: endTime || null,
        reason: reason || null
      }
    });

    return NextResponse.json({ block });
  } catch (error) {
    console.error('Error adding block:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Remove a block
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
    const url = new URL(request.url);
    const blockId = url.searchParams.get('id');

    if (!blockId) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    // Verify user owns this studio
    const studio = await prisma.studio.findFirst({
      where: { id, ownerId: user.id }
    });

    if (!studio) {
      return NextResponse.json({ error: 'Studio non trouvé' }, { status: 404 });
    }

    await prisma.studioBlock.delete({
      where: { id: blockId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting block:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
