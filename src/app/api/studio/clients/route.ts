import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Get clients who have booked with this studio
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Find studio owned by this user
    const studio = await prisma.studio.findFirst({
      where: { ownerId: user.id }
    });

    if (!studio) {
      return NextResponse.json({ clients: [] });
    }

    // Get unique clients from appointments
    const appointments = await prisma.appointment.findMany({
      where: { studioId: studio.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    // Group by client
    const clientsMap = new Map();
    appointments.forEach(apt => {
      if (!clientsMap.has(apt.userId)) {
        clientsMap.set(apt.userId, {
          id: apt.user.id,
          name: apt.user.name,
          email: apt.user.email,
          phone: apt.user.phone,
          lastAppointment: {
            date: apt.date,
            startTime: apt.startTime
          },
          totalSessions: 1
        });
      } else {
        const client = clientsMap.get(apt.userId);
        client.totalSessions++;
      }
    });

    return NextResponse.json({ 
      clients: Array.from(clientsMap.values())
    });
  } catch (error) {
    console.error('Error fetching studio clients:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
