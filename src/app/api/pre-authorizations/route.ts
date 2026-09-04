import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Get pre-authorizations for a studio
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Get user's studios
    const studios = await prisma.studio.findMany({
      where: { ownerId: user.id },
      select: { id: true }
    });
    const studioIds = studios.map(s => s.id);

    // Get pre-authorizations for these studios
    const preAuths = await prisma.preAuthorization.findMany({
      where: {
        appointment: {
          studioId: { in: studioIds }
        }
      },
      include: {
        appointment: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            studio: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ preAuthorizations: preAuths });
  } catch (error) {
    console.error('Error fetching pre-authorizations:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Create a pre-authorization (hold)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { appointmentId, amount } = body;

    // Verify the appointment belongs to the user
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, userId: user.id }
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Rendez-vous non trouvé' }, { status: 404 });
    }

    // Check if already has a pre-auth
    const existing = await prisma.preAuthorization.findUnique({
      where: { appointmentId }
    });

    if (existing) {
      return NextResponse.json({ error: 'Empreinte déjà existante' }, { status: 400 });
    }

    // In production, you would call Stripe API here:
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: amount * 100, // cents
    //   currency: 'eur',
    //   capture_method: 'manual', // This creates a hold, not a charge
    //   ...

    // For demo, we simulate the pre-authorization
    const preAuth = await prisma.preAuthorization.create({
      data: {
        appointmentId,
        amount,
        status: 'held',
        stripeIntentId: `pi_demo_${Date.now()}`
      }
    });

    return NextResponse.json({ preAuthorization: preAuth });
  } catch (error) {
    console.error('Error creating pre-authorization:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT - Capture or release a pre-authorization
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { id, action, reason } = body; // action: 'capture' | 'release'

    // Get the pre-auth
    const preAuth = await prisma.preAuthorization.findUnique({
      where: { id },
      include: { appointment: { include: { studio: true } } }
    });

    if (!preAuth) {
      return NextResponse.json({ error: 'Empreinte non trouvée' }, { status: 404 });
    }

    // Verify user owns the studio
    const studio = await prisma.studio.findFirst({
      where: { id: preAuth.appointment.studioId, ownerId: user.id }
    });

    if (!studio) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    if (preAuth.status !== 'held') {
      return NextResponse.json({ error: 'Cette empreinte ne peut plus être modifiée' }, { status: 400 });
    }

    // In production, call Stripe API:
    // if (action === 'capture') {
    //   await stripe.paymentIntents.capture(preAuth.stripeIntentId);
    // } else {
    //   await stripe.paymentIntents.cancel(preAuth.stripeIntentId);
    // }

    const updateData: Record<string, unknown> = {
      status: action === 'capture' ? 'captured' : 'released'
    };

    if (action === 'capture') {
      updateData.capturedAt = new Date();
    } else {
      updateData.releasedAt = new Date();
      updateData.releaseReason = reason || 'Annulation';
    }

    const updated = await prisma.preAuthorization.update({
      where: { id },
      data: updateData
    });

    // If captured, update appointment status
    if (action === 'capture') {
      await prisma.appointment.update({
        where: { id: preAuth.appointmentId },
        data: { status: 'completed' }
      });
    }

    return NextResponse.json({ preAuthorization: updated });
  } catch (error) {
    console.error('Error updating pre-authorization:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
