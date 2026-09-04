import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Get studio hours and blocks
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const hours = await prisma.availability.findMany({
      where: { studioId: id },
      orderBy: { dayOfWeek: 'asc' }
    });

    const blocks = await prisma.studioBlock.findMany({
      where: { 
        studioId: id,
        date: { gte: new Date() } // Only future blocks
      },
      orderBy: { date: 'asc' }
    });

    return NextResponse.json({ hours, blocks });
  } catch (error) {
    console.error('Error fetching hours:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Save studio hours
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
    const { hours } = body;

    // Verify user owns this studio
    const studio = await prisma.studio.findFirst({
      where: { id, ownerId: user.id }
    });

    if (!studio) {
      return NextResponse.json({ error: 'Studio non trouvé' }, { status: 404 });
    }

    // Delete existing hours and create new ones
    await prisma.availability.deleteMany({
      where: { studioId: id }
    });

    await prisma.availability.createMany({
      data: hours.map((h: { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }) => ({
        studioId: id,
        dayOfWeek: h.dayOfWeek,
        startTime: h.startTime,
        endTime: h.endTime,
        isActive: h.isActive
      }))
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving hours:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
