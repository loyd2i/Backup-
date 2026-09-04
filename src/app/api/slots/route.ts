import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studioId = searchParams.get('studioId');
    const dateStr = searchParams.get('date');

    if (!studioId || !dateStr) {
      return NextResponse.json({ error: 'Studio ID et date requis' }, { status: 400 });
    }

    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();

    // Get studio availability for this day
    const availability = await prisma.availability.findUnique({
      where: {
        studioId_dayOfWeek: {
          studioId,
          dayOfWeek
        }
      }
    });

    if (!availability || !availability.isActive) {
      return NextResponse.json({ 
        slots: [], 
        message: 'Studio fermé ce jour' 
      });
    }

    // Generate 2-hour time slots (Doctolib style)
    const [startHour, startMin] = availability.startTime.split(':').map(Number);
    const [endHour, endMin] = availability.endTime.split(':').map(Number);
    
    const slots: { time: string; endTime: string; available: boolean; reason?: string }[] = [];
    
    // Generate slots starting at each hour, each slot is 2 hours
    let currentHour = startHour;
    
    while (currentHour + 2 <= endHour) {
      const startTimeStr = `${currentHour.toString().padStart(2, '0')}:00`;
      const endTimeHour = currentHour + 2;
      const endTimeStr = `${endTimeHour.toString().padStart(2, '0')}:00`;
      
      slots.push({ 
        time: startTimeStr, 
        endTime: endTimeStr,
        available: true 
      });
      
      // Move to next slot (can overlap by 1 hour for flexibility)
      currentHour += 1;
    }

    // Get blocks for this date
    const blocks = await prisma.studioBlock.findMany({
      where: {
        studioId,
        date: {
          gte: new Date(dateStr + 'T00:00:00.000Z'),
          lte: new Date(dateStr + 'T23:59:59.999Z')
        }
      }
    });

    // Mark blocked slots as unavailable
    for (const block of blocks) {
      if (!block.startTime) {
        // Full day block
        slots.forEach(slot => {
          slot.available = false;
          slot.reason = block.reason || 'Indisponible';
        });
      } else {
        // Partial day block
        const [blockStartHour] = block.startTime.split(':').map(Number);
        const [blockEndHour] = (block.endTime || '23:59').split(':').map(Number);
        
        slots.forEach(slot => {
          const [slotHour] = slot.time.split(':').map(Number);
          const slotEndHour = slotHour + 2;
          // Slot is blocked if any part overlaps with the block
          if (slotHour < blockEndHour && slotEndHour > blockStartHour) {
            slot.available = false;
            slot.reason = block.reason || 'Indisponible';
          }
        });
      }
    }

    // Check existing appointments for this date
    const appointments = await prisma.appointment.findMany({
      where: {
        studioId,
        date: {
          gte: new Date(dateStr + 'T00:00:00.000Z'),
          lte: new Date(dateStr + 'T23:59:59.999Z')
        },
        status: { in: ['pending', 'confirmed'] }
      }
    });

    // Mark booked slots as unavailable
    for (const appt of appointments) {
      const [apptStartHour] = appt.startTime.split(':').map(Number);
      const apptEndHour = apptStartHour + appt.duration;
      
      slots.forEach(slot => {
        const [slotHour] = slot.time.split(':').map(Number);
        const slotEndHour = slotHour + 2;
        // Slot overlaps with appointment
        if (slotHour < apptEndHour && slotEndHour > apptStartHour) {
          slot.available = false;
          slot.reason = 'Déjà réservé';
        }
      });
    }

    return NextResponse.json({ slots });
  } catch (error) {
    console.error('Erreur récupération créneaux:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
