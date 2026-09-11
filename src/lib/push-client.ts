// Utilitaires côté navigateur pour l'abonnement aux notifications push
// (voir src/lib/push.ts pour l'envoi côté serveur, src/app/api/push/subscribe
// pour la persistance). Rien ici ne s'exécute côté serveur : Notification,
// navigator.serviceWorker et PushManager n'existent que dans le navigateur.

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch (error) {
    console.error('Erreur enregistrement service worker:', error);
    return null;
  }
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready.catch(() => null);
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export async function subscribeToPush(): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: 'Les notifications push ne sont pas prises en charge par ce navigateur' };
  }

  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return { success: false, error: 'Notifications push non configurées côté serveur' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { success: false, error: 'Permission refusée' };
  }

  const registration = await registerServiceWorker();
  if (!registration) {
    return { success: false, error: "Impossible d'enregistrer le service worker" };
  }

  // Le navigateur doit joindre le service de push de son fournisseur (FCM
  // pour Chrome...) pour créer l'abonnement : sur un réseau qui bloque cet
  // accès, l'appel ne rejette jamais de lui-même, il reste juste en attente.
  let subscription;
  try {
    subscription = await Promise.race([
      registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Délai dépassé (service de push injoignable)')), 15000)
      ),
    ]);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Échec de l'abonnement push" };
  }

  const json = subscription.toJSON();
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });

  if (!res.ok) {
    return { success: false, error: "Erreur lors de l'enregistrement de l'abonnement" };
  }

  return { success: true };
}

export async function unsubscribeFromPush(): Promise<{ success: boolean }> {
  const subscription = await getCurrentPushSubscription();
  if (!subscription) return { success: true };

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(endpoint)}`, { method: 'DELETE' }).catch(() => {});

  return { success: true };
}
