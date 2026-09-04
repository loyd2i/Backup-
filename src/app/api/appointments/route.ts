import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Rendez-vous de l'utilisateur ou du studio
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studioId = searchParams.get('studioId');

    // If studioId is provided or user is studio_owner, get studio appointments
    if (studioId || user.role === 'studio_owner') {
      const studio = studioId 
        ? await prisma.studio.findUnique({ where: { id: studioId } })
        : await prisma.studio.findFirst({ where: { ownerId: user.id } });

      if (!studio) {
        return NextResponse.json({ appointments: [] });
      }

      const appointments = await prisma.appointment.findMany({
        where: { studioId: studio.id },
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true }
          }
        },
        orderBy: { date: 'desc' }
      });

      return NextResponse.json({ appointments });
    }

    // Regular user - get their appointments
    const appointments = await prisma.appointment.findMany({
      where: { userId: user.id },
      include: {
        studio: {
          select: { id: true, name: true, location: true, pricePerHour: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error('Erreur récupération RDV:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Créer un rendez-vous
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { studioId, date, startTime, duration, notes } = body;

    if (!studioId || !date || !startTime || !duration) {
      return NextResponse.json(
        { error: 'Studio, date, heure et durée sont requis' },
        { status: 400 }
      );
    }

    // Récupérer le prix du studio
    const studio = await prisma.studio.findUnique({
      where: { id: studioId }
    });

    if (!studio) {
      return NextResponse.json({ error: 'Studio non trouvé' }, { status: 404 });
    }

    // Calculate end time
    const [startHour] = startTime.split(':').map(Number);
    const endHour = startHour + parseInt(duration);
    const endTime = `${endHour.toString().padStart(2, '0')}:00`;

    const totalPrice = studio.pricePerHour * parseInt(duration);

    const appointment = await prisma.appointment.create({
      data: {
        userId: user.id,
        studioId,
        date: new Date(date),
        startTime,
        endTime,
        duration: parseInt(duration),
        notes,
        totalPrice,
        status: 'pending'
      },
      include: {
        studio: { select: { name: true, location: true } },
        user: { select: { name: true, email: true } }
      }
    });

    // Create pre-authorization (hold) for the total price
    // In production, this would be a Stripe PaymentIntent with capture_method: 'manual'
    await prisma.preAuthorization.create({
      data: {
        appointmentId: appointment.id,
        amount: totalPrice,
        status: 'held',
        stripeIntentId: `pi_demo_${Date.now()}`
      }
    });

    return NextResponse.json({ 
      appointment, 
      message: 'Rendez-vous créé',
      preAuthorization: {
        amount: totalPrice,
        status: 'held',
        info: 'Empreinte bancaire mise en attente - aucun débit effectué'
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Erreur création RDV:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT - Modifier le statut d'un rendez-vous
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status } = body;

    // Get the appointment
    const existingAppt = await prisma.appointment.findUnique({
      where: { id },
      include: { studio: true }
    });

    if (!existingAppt) {
      return NextResponse.json({ error: 'Rendez-vous non trouvé' }, { status: 404 });
    }

    // Check authorization - user who booked or studio owner
    const isOwner = existingAppt.userId === user.id;
    const isStudioOwner = existingAppt.studio.ownerId === user.id;

    if (!isOwner && !isStudioOwner) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Update appointment
    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status },
      include: {
        studio: { select: { name: true } },
        user: { select: { id: true, name: true, email: true } }
      }
    });

    // Handle pre-authorization based on status
    const preAuth = await prisma.preAuthorization.findUnique({
      where: { appointmentId: id }
    });

    if (preAuth) {
      if (status === 'cancelled') {
        // Release the pre-authorization (no charge)
        await prisma.preAuthorization.update({
          where: { id: preAuth.id },
          data: {
            status: 'released',
            releasedAt: new Date(),
            releaseReason: 'Annulation par l\'utilisateur'
          }
        });
      } else if (status === 'completed') {
        // Capture the pre-authorization (charge now)
        await prisma.preAuthorization.update({
          where: { id: preAuth.id },
          data: {
            status: 'captured',
            capturedAt: new Date()
          }
        });
      }
    }

    // If status is 'completed', generate invoice automatically
    if (status === 'completed' && existingAppt.totalPrice) {
      await prisma.invoice.create({
        data: {
          userId: existingAppt.userId,
          studioName: existingAppt.studio.name,
          amount: existingAppt.totalPrice,
          description: `Session du ${new Date(existingAppt.date).toLocaleDateString('fr-FR')} - ${existingAppt.startTime} (${existingAppt.duration}h)`,
          appointmentId: existingAppt.id,
          status: 'paid' // Already captured from pre-auth
        }
      });
    }

    return NextResponse.json({ appointment, message: 'Rendez-vous mis à jour' });
  } catch (error) {
    console.error('Erreur mise à jour RDV:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
