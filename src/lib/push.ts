import webpush from 'web-push';
import { prisma } from '@/lib/db';

const vapidPublicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
const vapidContact = process.env.WEB_PUSH_CONTACT_EMAIL || 'mailto:contact@studiolib.fr';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidContact, vapidPublicKey, vapidPrivateKey);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

// Envoie une notification push à tous les appareils abonnés de l'utilisateur.
// Retire silencieusement les abonnements expirés/invalides (410/404) que le
// navigateur ne reconnaît plus.
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!vapidPublicKey || !vapidPrivateKey) return;

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
      } catch (error: unknown) {
        const statusCode = (error as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error('Erreur envoi push:', error);
        }
      }
    })
  );
}
