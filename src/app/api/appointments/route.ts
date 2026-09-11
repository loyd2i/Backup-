import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ARTIST_COMMISSION_RATE, ARTIST_COMMISSION_REFUND_CUTOFF_HOURS } from '@/lib/tax-config';
import { notifyAppointmentEvent, notifyWaitlistForFreedSlot } from '@/lib/notifications';
import { completeAppointment } from '@/lib/appointment-lifecycle';

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
          },
          eStudioSession: { select: { id: true, status: true } }
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
        },
        eStudioSession: { select: { id: true, status: true } }
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
    const { studioId, date, startTime, duration, notes, type, hoursPackId } = body;
    const bookingType = type === 'e_studio' ? 'e_studio' : 'studio';

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

    // Payée avec un pack d'heures prépayées chez ce studio : déjà réglé à
    // l'achat, pas de nouveau prix ni de pré-autorisation pour cette séance.
    let hoursPack: Awaited<ReturnType<typeof prisma.hoursPack.findUnique>> = null;
    if (hoursPackId) {
      hoursPack = await prisma.hoursPack.findUnique({ where: { id: hoursPackId } });
      if (!hoursPack || hoursPack.userId !== user.id || hoursPack.studioId !== studioId) {
        return NextResponse.json({ error: 'Pack d\'heures invalide' }, { status: 400 });
      }
      if (hoursPack.remainingHours < parseInt(duration)) {
        return NextResponse.json({ error: 'Heures insuffisantes dans le pack' }, { status: 400 });
      }
    }

    // Réduction manuelle heures creuses posée par le studio sur ce créneau
    // précis (au cas par cas, pas une règle récurrente) : consommée dès
    // qu'elle sert à une réservation.
    let slotDiscount: Awaited<ReturnType<typeof prisma.slotDiscount.findUnique>> = null;
    if (!hoursPack) {
      slotDiscount = await prisma.slotDiscount.findUnique({
        where: { studioId_date_startTime: { studioId, date: new Date(date), startTime } },
      });
    }

    const hourlyRate = bookingType === 'e_studio'
      ? (studio.eStudioPricePerHour ?? studio.pricePerHour)
      : studio.pricePerHour;
    const totalPrice = hoursPack ? null : (slotDiscount ? slotDiscount.discountedPrice : hourlyRate * parseInt(duration));
    const artistCommissionAmount = hoursPack ? null : Math.round((totalPrice as number) * ARTIST_COMMISSION_RATE * 100) / 100;

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
        artistCommissionAmount,
        type: bookingType,
        status: 'pending',
        hoursPackId: hoursPack?.id,
      },
      include: {
        studio: { select: { name: true, location: true } },
        user: { select: { name: true, email: true } }
      }
    });

    if (slotDiscount) {
      await prisma.slotDiscount.delete({ where: { id: slotDiscount.id } });
    }

    if (hoursPack) {
      await prisma.hoursPack.update({
        where: { id: hoursPack.id },
        data: { remainingHours: { decrement: parseInt(duration) } },
      });
    } else {
      // Create pre-authorization (hold) for the total price + frais de service
      // artiste. In production, this would be a Stripe PaymentIntent with
      // capture_method: 'manual'.
      await prisma.preAuthorization.create({
        data: {
          appointmentId: appointment.id,
          amount: (totalPrice as number) + (artistCommissionAmount as number),
          status: 'held',
          stripeIntentId: `pi_demo_${Date.now()}`
        }
      });
    }

    // Notifie l'artiste (demande envoyée) et le studio (nouvelle demande à traiter)
    await notifyAppointmentEvent('booking_requested', appointment.id);
    await notifyAppointmentEvent('booking_new_request', appointment.id);

    return NextResponse.json({
      appointment,
      message: 'Rendez-vous créé',
      ...(hoursPack ? {} : {
        preAuthorization: {
          amount: (totalPrice as number) + (artistCommissionAmount as number),
          studioAmount: totalPrice,
          artistCommissionAmount,
          status: 'held',
          info: 'Empreinte bancaire mise en attente - aucun débit effectué'
        }
      })
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

    // La complétion (facture, portefeuille, commission, notif avis) est
    // partagée avec le scheduler d'arrière-plan qui l'effectue aussi
    // automatiquement à l'heure de fin prévue - voir appointment-lifecycle.ts.
    if (status === 'completed') {
      await completeAppointment(id);
      const completedAppointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          studio: { select: { name: true } },
          user: { select: { id: true, name: true, email: true } }
        }
      });
      return NextResponse.json({ appointment: completedAppointment, message: 'Rendez-vous mis à jour' });
    }

    // Frais de service artiste : remboursés si le studio annule (ce n'est pas
    // la faute de l'artiste), ou si l'artiste annule assez tôt ; conservés
    // si l'artiste annule tardivement (le studio ne peut plus revendre le
    // créneau).
    let artistCommissionRefunded: boolean | undefined;
    if (status === 'cancelled') {
      if (isStudioOwner) {
        artistCommissionRefunded = true;
      } else {
        const sessionStart = new Date(existingAppt.date);
        const [sessionHour, sessionMinute] = existingAppt.startTime.split(':').map(Number);
        sessionStart.setHours(sessionHour, sessionMinute, 0, 0);
        const hoursUntilSession = (sessionStart.getTime() - Date.now()) / (1000 * 60 * 60);
        artistCommissionRefunded = hoursUntilSession >= ARTIST_COMMISSION_REFUND_CUTOFF_HOURS;
      }
    }

    // Update appointment
    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        status,
        ...(artistCommissionRefunded !== undefined && { artistCommissionRefunded }),
      },
      include: {
        studio: { select: { name: true } },
        user: { select: { id: true, name: true, email: true } }
      }
    });

    // Notifie la partie qui n'a pas déclenché le changement de statut
    if (status === 'confirmed') {
      await notifyAppointmentEvent('booking_confirmed', id);

      // Réservation E-Studio confirmée : crée la session à distance et y
      // rattache directement l'artiste et le studio, sans passer par le
      // circuit d'invitation générique (on connaît déjà les deux parties).
      if (existingAppt.type === 'e_studio') {
        const existingSession = await prisma.eStudioSession.findUnique({
          where: { appointmentId: id }
        });

        if (!existingSession) {
          const [startHour, startMinute] = existingAppt.startTime.split(':').map(Number);
          const [endHour, endMinute] = existingAppt.endTime.split(':').map(Number);
          const scheduledStart = new Date(existingAppt.date);
          scheduledStart.setHours(startHour, startMinute, 0, 0);
          const scheduledEnd = new Date(existingAppt.date);
          scheduledEnd.setHours(endHour, endMinute, 0, 0);

          const eStudioSession = await prisma.eStudioSession.create({
            data: {
              title: `Session E-Studio - ${appointment.studio.name}`,
              hostId: existingAppt.studio.ownerId,
              sessionType: 'session_live',
              scheduledStart,
              scheduledEnd,
              appointmentId: id,
            }
          });

          await prisma.eStudioParticipant.create({
            data: {
              sessionId: eStudioSession.id,
              userId: existingAppt.userId,
              role: 'participant',
            }
          });
        }
      }
    } else if (status === 'cancelled') {
      if (isStudioOwner) {
        await notifyAppointmentEvent(
          existingAppt.status === 'pending' ? 'booking_refused' : 'booking_cancelled_by_studio',
          id
        );
      } else {
        await notifyAppointmentEvent('booking_cancelled_by_artist', id);
      }
      // Le créneau vient de se libérer : alerte la liste d'attente éventuelle
      await notifyWaitlistForFreedSlot(existingAppt.studioId, existingAppt.date, existingAppt.startTime);

      // Séance payée avec un pack d'heures : recrédite les heures consommées
      if (existingAppt.hoursPackId) {
        await prisma.hoursPack.update({
          where: { id: existingAppt.hoursPackId },
          data: { remainingHours: { increment: existingAppt.duration } },
        });
      }
    }

    // Release la pré-autorisation (aucun débit) en cas d'annulation - la
    // capture en cas de complétion est gérée par completeAppointment ci-dessus
    if (status === 'cancelled') {
      const preAuth = await prisma.preAuthorization.findUnique({
        where: { appointmentId: id }
      });
      if (preAuth) {
        await prisma.preAuthorization.update({
          where: { id: preAuth.id },
          data: {
            status: 'released',
            releasedAt: new Date(),
            releaseReason: 'Annulation par l\'utilisateur'
          }
        });
      }
    }

    return NextResponse.json({ appointment, message: 'Rendez-vous mis à jour' });
  } catch (error) {
    console.error('Erreur mise à jour RDV:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
