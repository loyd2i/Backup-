import { prisma } from '@/lib/db';
import { sendPushToUser } from '@/lib/push';

// Dispatcher unifié des notifications liées au cycle de vie d'un rendez-vous :
// centre in-app (Notification), email simulé (EmailLog), SMS simulé (SmsLog),
// et push réel si l'utilisateur a un appareil abonné. Un seul point d'entrée
// pour que chaque évènement (réservation, confirmation, rappel, fin de
// session) parte sur tous les canaux à la fois, sans dépendre d'un appel
// oublié côté client - déclenché directement depuis /api/appointments et le
// scheduler d'arrière-plan.
export type NotificationEventType =
  | 'booking_requested'          // -> artiste : demande envoyée, en attente de confirmation studio
  | 'booking_new_request'        // -> studio  : nouvelle demande à traiter
  | 'booking_confirmed'          // -> artiste : le studio a confirmé (avertissement annulation 24h)
  | 'booking_refused'            // -> artiste : le studio a refusé une demande en attente
  | 'booking_cancelled_by_studio'// -> artiste : le studio a annulé un rendez-vous confirmé
  | 'booking_cancelled_by_artist'// -> studio  : l'artiste a annulé son rendez-vous
  | 'reminder_2h'                // -> artiste + studio : la session démarre dans 2h
  | 'session_completed'          // -> artiste + studio : session terminée, avis + facture disponibles
  | 'waitlist_slot_available'    // -> artiste en liste d'attente : le créneau visé vient de se libérer
  | 'referral_reward';           // -> parrain : son filleul est actif, récompense accordée

interface NotificationContent {
  title: string;
  body: string;
  smsMessage: string;
}

async function dispatch(userId: string, email: string, phone: string | null, type: NotificationEventType, appointmentId: string | null, content: NotificationContent) {
  await prisma.notification.create({
    data: { userId, type, title: content.title, body: content.body, appointmentId },
  });

  await prisma.emailLog.create({
    data: { userId, email, type, appointmentId, subject: content.title, status: 'sent' },
  });
  console.log(`📧 Email envoyé : ${type} -> ${email}`);
  console.log(`Subject: ${content.title}`);

  if (phone) {
    await prisma.smsLog.create({
      data: { userId, phone, type, appointmentId, message: content.smsMessage, status: 'sent' },
    });
    console.log(`📱 SMS envoyé : ${type} -> ${phone} : ${content.smsMessage}`);
  }

  await sendPushToUser(userId, { title: content.title, body: content.body, url: '/' });
}

export async function notifyAppointmentEvent(type: NotificationEventType, appointmentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { user: true, studio: { include: { owner: true } } },
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
      case 'booking_requested': {
        await dispatch(artist.id, artist.email, artist.phone, type, appointmentId, {
          title: `📨 Demande envoyée - ${appointment.studio.name}`,
          body: `Votre demande pour le ${details} a été transmise au studio. Vous serez prévenu(e) dès sa réponse.`,
          smsMessage: `Studiolib : demande envoyée pour le ${details}. Réponse du studio à venir.`,
        });
        break;
      }
      case 'booking_new_request': {
        await dispatch(owner.id, owner.email, owner.phone, type, appointmentId, {
          title: `🆕 Nouvelle demande de réservation - ${artist.name}`,
          body: `${artist.name} souhaite réserver le ${details}. Rendez-vous sur votre tableau de bord pour confirmer ou refuser.`,
          smsMessage: `Studiolib : nouvelle demande de ${artist.name} pour le ${details}.`,
        });
        break;
      }
      case 'booking_confirmed': {
        await dispatch(artist.id, artist.email, artist.phone, type, appointmentId, {
          title: `✅ Confirmation de votre rendez-vous - ${appointment.studio.name}`,
          body: `Votre rendez-vous du ${details} est confirmé. Annulation possible jusqu'à 24h avant le début de la session ; passé ce délai, la présence est obligatoire.`,
          smsMessage: `Studiolib : rendez-vous confirmé le ${details}. Annulation possible jusqu'à 24h avant, obligatoire ensuite.`,
        });
        await prisma.appointment.update({ where: { id: appointmentId }, data: { confirmationSent: true } });
        break;
      }
      case 'booking_refused': {
        await dispatch(artist.id, artist.email, artist.phone, type, appointmentId, {
          title: `❌ Demande refusée - ${appointment.studio.name}`,
          body: `Votre demande pour le ${details} n'a pas été acceptée par le studio.`,
          smsMessage: `Studiolib : votre demande pour le ${details} a été refusée.`,
        });
        break;
      }
      case 'booking_cancelled_by_studio': {
        await dispatch(artist.id, artist.email, artist.phone, type, appointmentId, {
          title: `❌ Rendez-vous annulé par le studio - ${appointment.studio.name}`,
          body: `Votre rendez-vous du ${details} a été annulé par le studio.`,
          smsMessage: `Studiolib : votre rendez-vous du ${details} a été annulé par le studio.`,
        });
        break;
      }
      case 'booking_cancelled_by_artist': {
        await dispatch(owner.id, owner.email, owner.phone, type, appointmentId, {
          title: `❌ Rendez-vous annulé par l'artiste - ${artist.name}`,
          body: `${artist.name} a annulé le rendez-vous du ${details}.`,
          smsMessage: `Studiolib : ${artist.name} a annulé le rendez-vous du ${details}.`,
        });
        break;
      }
      case 'reminder_2h': {
        await dispatch(artist.id, artist.email, artist.phone, type, appointmentId, {
          title: `⏰ Rappel : votre séance commence dans 2h - ${appointment.studio.name}`,
          body: `Rappel : séance ${details} dans 2 heures.`,
          smsMessage: `Studiolib : rappel, séance dans 2h - ${details}.`,
        });
        await dispatch(owner.id, owner.email, owner.phone, type, appointmentId, {
          title: `⏰ Rappel : séance dans 2h avec ${artist.name}`,
          body: `Rappel : ${artist.name} arrive dans 2 heures pour la séance ${details}.`,
          smsMessage: `Studiolib : rappel, séance dans 2h avec ${artist.name} - ${details}.`,
        });
        await prisma.appointment.update({ where: { id: appointmentId }, data: { reminderSent: true } });
        break;
      }
      case 'session_completed': {
        await dispatch(artist.id, artist.email, artist.phone, type, appointmentId, {
          title: `🎉 Session terminée - ${appointment.studio.name}`,
          body: `Votre session du ${details} est terminée. Votre facture est disponible, et votre avis compte : dites-nous comment ça s'est passé !`,
          smsMessage: `Studiolib : session terminée (${details}). Facture disponible, laissez votre avis dans l'app.`,
        });
        await dispatch(owner.id, owner.email, owner.phone, type, appointmentId, {
          title: `🎉 Session terminée avec ${artist.name}`,
          body: `La session du ${details} est terminée. Votre facture est disponible, et votre avis sur l'artiste nous intéresse.`,
          smsMessage: `Studiolib : session terminée avec ${artist.name} (${details}). Facture disponible, laissez votre avis.`,
        });
        await prisma.appointment.update({ where: { id: appointmentId }, data: { sessionEndNotified: true } });
        break;
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Erreur envoi notification rendez-vous:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

// Notifie tous les artistes en liste d'attente qu'un créneau vient de se
// libérer (annulation) sur ce studio, puis retire ces entrées - à charge
// pour eux de se rejoindre en liste d'attente s'ils manquent à nouveau le
// créneau (voir BUSINESS-PLAN.md "Croissance et rétention").
export async function notifyWaitlistForFreedSlot(studioId: string, date: Date, startTime: string): Promise<void> {
  const entries = await prisma.waitlist.findMany({
    where: { studioId, date, startTime },
    include: { user: true, studio: { select: { name: true } } },
  });

  if (entries.length === 0) return;

  const dateStr = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  for (const entry of entries) {
    await dispatch(entry.user.id, entry.user.email, entry.user.phone, 'waitlist_slot_available', null, {
      title: `🔔 Un créneau s'est libéré - ${entry.studio.name}`,
      body: `Le créneau du ${dateStr} à ${startTime} chez ${entry.studio.name} vient de se libérer. Réserve vite si tu es toujours intéressé(e) !`,
      smsMessage: `Studiolib : créneau libéré le ${dateStr} à ${startTime} chez ${entry.studio.name}. Réserve vite !`,
    });
  }

  await prisma.waitlist.deleteMany({ where: { studioId, date, startTime } });
}

// Notifie un parrain que son filleul est devenu actif et que sa récompense
// de parrainage vient d'être accordée (voir src/lib/referrals.ts).
export async function notifyReferralReward(referrerId: string, rewardDescription: string): Promise<void> {
  const referrer = await prisma.user.findUnique({ where: { id: referrerId } });
  if (!referrer) return;

  await dispatch(referrer.id, referrer.email, referrer.phone, 'referral_reward', null, {
    title: '🎉 Ton parrainage a porté ses fruits !',
    body: `Ton filleul est actif sur Studiolib : ${rewardDescription}`,
    smsMessage: `Studiolib : ton parrainage a porté ses fruits ! ${rewardDescription}`,
  });
}
