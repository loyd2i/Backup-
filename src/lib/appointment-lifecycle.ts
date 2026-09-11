import { prisma } from '@/lib/db';
import { PLATFORM_COMMISSION_RATE } from '@/lib/tax-config';
import { notifyAppointmentEvent } from '@/lib/notifications';

// Complète un rendez-vous confirmé : capture la pré-autorisation, génère la
// facture, crédite le portefeuille studio (commission plateforme), clôture
// la session E-Studio associée s'il y en a une, et notifie les deux parties
// (avis + facture disponible). Partagée entre le clic manuel "Marquer
// terminée" côté studio (PUT /api/appointments) et le scheduler
// d'arrière-plan (fin de session automatique à l'heure prévue).
export async function completeAppointment(appointmentId: string): Promise<void> {
  const existingAppt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { studio: true },
  });

  if (!existingAppt || existingAppt.status === 'completed') return;

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: 'completed', artistCommissionRefunded: false },
  });

  const preAuth = await prisma.preAuthorization.findUnique({ where: { appointmentId } });
  if (preAuth && preAuth.status !== 'captured') {
    await prisma.preAuthorization.update({
      where: { id: preAuth.id },
      data: { status: 'captured', capturedAt: new Date() },
    });
  }

  if (existingAppt.totalPrice) {
    const description = `Session du ${new Date(existingAppt.date).toLocaleDateString('fr-FR')} - ${existingAppt.startTime} (${existingAppt.duration}h)`;

    await prisma.invoice.create({
      data: {
        userId: existingAppt.userId,
        studioName: existingAppt.studio.name,
        amount: existingAppt.totalPrice,
        description,
        appointmentId: existingAppt.id,
        status: 'paid',
      },
    });

    const commissionAmount = Math.round(existingAppt.totalPrice * PLATFORM_COMMISSION_RATE * 100) / 100;
    const netAmount = Math.round((existingAppt.totalPrice - commissionAmount) * 100) / 100;

    await prisma.studio.update({
      where: { id: existingAppt.studioId },
      data: {
        walletBalance: { increment: netAmount },
        totalEarnings: { increment: netAmount },
      },
    });

    await prisma.walletTransaction.createMany({
      data: [
        {
          studioId: existingAppt.studioId,
          type: 'earning',
          amount: netAmount,
          appointmentId: existingAppt.id,
          description,
        },
        {
          studioId: existingAppt.studioId,
          type: 'fee',
          amount: commissionAmount,
          appointmentId: existingAppt.id,
          description: `Commission plateforme (${(PLATFORM_COMMISSION_RATE * 100).toFixed(0)}%)`,
        },
      ],
    });

    if (existingAppt.type === 'e_studio') {
      await prisma.eStudioSession.updateMany({
        where: { appointmentId: existingAppt.id, status: { not: 'ended' } },
        data: { status: 'ended', endedAt: new Date() },
      });
    }
  }

  await notifyAppointmentEvent('session_completed', appointmentId);
}
