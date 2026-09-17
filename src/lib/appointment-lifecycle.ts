import { prisma } from '@/lib/db';
import { PLATFORM_COMMISSION_RATE, getTaxConfig } from '@/lib/tax-config';
import { notifyAppointmentEvent } from '@/lib/notifications';
import { markReferralActiveIfPending } from '@/lib/referrals';
import { nextInvoiceNumber } from '@/lib/invoice-numbering';

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

    // Mentions légales figées à l'émission : la facture ne doit pas changer
    // rétroactivement si le studio modifie sa fiche (SIRET, adresse...) ensuite.
    const { vatRate: countryVatRate } = getTaxConfig(existingAppt.studio.country);
    const vatRate = existingAppt.studio.vatExempt ? 0 : countryVatRate;
    const amountTTC = existingAppt.totalPrice;
    const amountHT = Math.round((amountTTC / (1 + vatRate)) * 100) / 100;
    const vatAmount = Math.round((amountTTC - amountHT) * 100) / 100;

    await prisma.invoice.create({
      data: {
        invoiceNumber: await nextInvoiceNumber(),
        userId: existingAppt.userId,
        studioId: existingAppt.studioId,
        studioName: existingAppt.studio.name,
        sellerLegalName: existingAppt.studio.legalName || existingAppt.studio.name,
        sellerSiret: existingAppt.studio.siret,
        sellerAddress: existingAppt.studio.address || existingAppt.studio.location,
        sellerVatNumber: existingAppt.studio.vatNumber,
        sellerVatExempt: existingAppt.studio.vatExempt,
        amountHT,
        vatRate,
        vatAmount,
        amount: amountTTC,
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

  // Première session menée à terme = signal "filleul actif" pour un
  // éventuel parrainage en attente, côté artiste comme côté studio.
  await markReferralActiveIfPending(existingAppt.userId);
  await markReferralActiveIfPending(existingAppt.studio.ownerId);
}
