import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Get available time slots for a studio on a specific date
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const dateStr = url.searchParams.get('date');
    
    if (!dateStr) {
      return NextResponse.json({ error: 'Date requise' }, { status: 400 });
    }

    const date = new Date(dateStr);
    const dayOfWeek = date.getDay(); // 0-6 (dimanche à samedi)

    // Get studio availabilities for this day
    const availability = await prisma.availability.findUnique({
      where: {
        studioId_dayOfWeek: {
          studioId: id,
          dayOfWeek
        }
      }
    });

    // If no availability defined, use default hours
    const startHour = availability?.startTime ? parseInt(availability.startTime.split(':')[0]) : 10;
    const endHour = availability?.endTime ? parseInt(availability.endTime.split(':')[0]) : 22;

    // Check if studio is closed this day
    if (availability && !availability.isActive) {
      return NextResponse.json({ 
        slots: [],
        message: 'Studio fermé ce jour'
      });
    }

    // Check for studio blocks (vacation, maintenance, etc.)
    const blocks = await prisma.studioBlock.findMany({
      where: {
        studioId: id,
        date: {
          gte: new Date(dateStr + 'T00:00:00.000Z'),
          lte: new Date(dateStr + 'T23:59:59.999Z')
        }
      }
    });

    // Get existing appointments for this date
    const appointments = await prisma.appointment.findMany({
      where: {
        studioId: id,
        date: {
          gte: new Date(dateStr + 'T00:00:00.000Z'),
          lte: new Date(dateStr + 'T23:59:59.999Z')
        },
        status: { not: 'cancelled' }
      }
    });

    // Generate 2-hour slots
    const slots = [];
    for (let hour = startHour; hour < endHour; hour += 2) {
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endTime = `${(hour + 2).toString().padStart(2, '0')}:00`;
      
      // Check if slot is blocked
      const isBlocked = blocks.some(block => {
        if (!block.startTime) return true; // Full day block
        const blockStart = parseInt(block.startTime.split(':')[0]);
        const blockEnd = block.endTime ? parseInt(block.endTime.split(':')[0]) : 24;
        return hour >= blockStart && hour < blockEnd;
      });

      // Check if slot is already booked
      const isBooked = appointments.some(apt => {
        const aptStart = parseInt(apt.startTime.split(':')[0]);
        const aptEnd = parseInt(apt.endTime.split(':')[0]);
        return (hour >= aptStart && hour < aptEnd) || (hour + 2 > aptStart && hour <= aptStart);
      });

      // Check if slot is in the past (for today)
      const now = new Date();
      const slotDate = new Date(dateStr + 'T' + startTime + ':00');
      const isPast = slotDate < now;

      slots.push({
        startTime,
        endTime,
        available: !isBlocked && !isBooked && !isPast
      });
    }

    return NextResponse.json({ slots });
  } catch (error) {
    console.error('Error fetching slots:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
