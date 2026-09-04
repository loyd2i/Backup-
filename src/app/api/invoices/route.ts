import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Get invoices for studio or user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studioId = searchParams.get('studioId');

    let invoices;

    if (studioId || user.role === 'studio_owner') {
      // Get invoices for studio
      const studio = studioId 
        ? await prisma.studio.findUnique({ where: { id: studioId } })
        : await prisma.studio.findFirst({ where: { ownerId: user.id } });

      if (!studio) {
        return NextResponse.json({ invoices: [] });
      }

      invoices = await prisma.invoice.findMany({
        where: { studioName: studio.name },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // Get invoices for user (client)
      invoices = await prisma.invoice.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      });
    }

    // Add appointment info
    const invoicesWithAppointment = await Promise.all(
      invoices.map(async (invoice) => {
        if (invoice.appointmentId) {
          const appointment = await prisma.appointment.findUnique({
            where: { id: invoice.appointmentId },
            select: { date: true, startTime: true }
          });
          return { ...invoice, appointment };
        }
        return invoice;
      })
    );

    return NextResponse.json({ invoices: invoicesWithAppointment });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// Create invoice (auto-generated after session)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { appointmentId, userId, studioName, amount, description } = body;

    const invoice = await prisma.invoice.create({
      data: {
        userId,
        studioName,
        amount,
        description,
        appointmentId,
        status: 'pending'
      }
    });

    // TODO: Send email notification to client and studio

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// Mark invoice as paid
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status } = body;

    const invoice = await prisma.invoice.update({
      where: { id },
      data: { status }
    });

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
