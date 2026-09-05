import { prisma } from '@/lib/db';

// Emails liés au cycle de vie d'un rendez-vous, envoyés côté serveur directement
// depuis /api/appointments (POST/PUT) - ainsi ils partent quel que soit le flux
// de réservation/annulation utilisé côté front (studio-detail, rendezvous-page,
// studio-dashboard...), sans dépendre d'un appel fetch oublié côté client.
export type AppointmentEmailType =
  | 'request_sent'        // -> artiste : demande envoyée, en attente de confirmation studio
  | 'new_request'         // -> studio  : nouvelle demande à traiter
  | 'confirmation'        // -> artiste : le studio a confirmé
  | 'refused'             // -> artiste : le studio a refusé une demande en attente
  | 'cancelled_by_studio' // -> artiste : le studio a annulé un rendez-vous confirmé
  | 'cancelled_by_artist' // -> studio  : l'artiste a annulé son rendez-vous
  | 'reminder_3h';        // -> artiste : rappel 3h avant (déclenchement manuel uniquement, pas de cron)

interface SendResult {
  success: boolean;
  error?: string;
}

async function logEmail(userId: string, email: string, type: AppointmentEmailType, appointmentId: string, subject: string) {
  await prisma.emailLog.create({
    data: { userId, email, type, appointmentId, subject, status: 'sent' }
  });
  console.log(`📧 Email envoyé : ${type} -> ${email}`);
  console.log(`Subject: ${subject}`);
}

export async function sendAppointmentEmail(type: AppointmentEmailType, appointmentId: string): Promise<SendResult> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        user: true,
        studio: { include: { owner: true } }
      }
    });

    if (!appointment) {
      return { success: false, error: 'Rendez-vous non trouvé' };
    }

    const artist = appointment.user;
    const owner = appointment.studio.owner;
    const dateStr = new Date(appointment.date).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const details = `${dateStr} à ${appointment.startTime} (${appointment.duration}h) - ${appointment.studio.name}`;

    switch (type) {
      case 'request_sent': {
        const subject = `📨 Demande envoyée - ${appointment.studio.name}`;
        console.log(`Votre demande pour le ${details} a été transmise au studio. Vous serez prévenu(e) dès sa réponse.`);
        await logEmail(artist.id, artist.email, type, appointmentId, subject);
        break;
      }
      case 'new_request': {
        const subject = `🆕 Nouvelle demande de réservation - ${artist.name}`;
        console.log(`${artist.name} souhaite réserver le ${details}. Rendez-vous sur votre tableau de bord pour confirmer ou refuser.`);
        await logEmail(owner.id, owner.email, type, appointmentId, subject);
        break;
      }
      case 'confirmation': {
        const subject = `✅ Confirmation de votre rendez-vous - ${appointment.studio.name}`;
        console.log(`Votre rendez-vous du ${details} est confirmé.`);
        await logEmail(artist.id, artist.email, type, appointmentId, subject);
        await prisma.appointment.update({ where: { id: appointmentId }, data: { confirmationSent: true } });
        break;
      }
      case 'refused': {
        const subject = `❌ Demande refusée - ${appointment.studio.name}`;
        console.log(`Votre demande pour le ${details} n'a pas été acceptée par le studio.`);
        await logEmail(artist.id, artist.email, type, appointmentId, subject);
        break;
      }
      case 'cancelled_by_studio': {
        const subject = `❌ Rendez-vous annulé par le studio - ${appointment.studio.name}`;
        console.log(`Votre rendez-vous du ${details} a été annulé par le studio.`);
        await logEmail(artist.id, artist.email, type, appointmentId, subject);
        break;
      }
      case 'cancelled_by_artist': {
        const subject = `❌ Rendez-vous annulé par l'artiste - ${artist.name}`;
        console.log(`${artist.name} a annulé le rendez-vous du ${details}.`);
        await logEmail(owner.id, owner.email, type, appointmentId, subject);
        break;
      }
      case 'reminder_3h': {
        const subject = `⏰ Rappel : votre séance commence dans 3h - ${appointment.studio.name}`;
        console.log(`Rappel : séance ${details} dans 3 heures.`);
        await logEmail(artist.id, artist.email, type, appointmentId, subject);
        await prisma.appointment.update({ where: { id: appointmentId }, data: { reminderSent: true } });
        break;
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Erreur envoi email rendez-vous:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}
