import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// POST - Add a custom link
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
    const { title, url, icon } = body;

    // Verify ownership
    const studio = await prisma.studio.findFirst({
      where: { id, ownerId: user.id }
    });

    if (!studio) {
      return NextResponse.json({ error: 'Studio non trouvé' }, { status: 404 });
    }

    // Get max order
    const maxOrder = await prisma.studioLink.findFirst({
      where: { studioId: id },
      orderBy: { order: 'desc' },
      select: { order: true }
    });

    const link = await prisma.studioLink.create({
      data: {
        studioId: id,
        title,
        url,
        icon: icon || 'link',
        order: (maxOrder?.order || 0) + 1
      }
    });

    return NextResponse.json({ link });
  } catch (error) {
    console.error('Error adding link:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Remove a custom link
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
    const linkId = url.searchParams.get('id');

    if (!linkId) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    // Verify ownership
    const studio = await prisma.studio.findFirst({
      where: { id, ownerId: user.id }
    });

    if (!studio) {
      return NextResponse.json({ error: 'Studio non trouvé' }, { status: 404 });
    }

    await prisma.studioLink.delete({
      where: { id: linkId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting link:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
