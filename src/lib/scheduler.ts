import { prisma } from '@/lib/db';
import { notifyAppointmentEvent } from '@/lib/notifications';
import { completeAppointment } from '@/lib/appointment-lifecycle';

// Scheduler en arrière-plan : envoie le rappel 2h avant le début d'une
// session et clôture automatiquement les sessions dont l'heure de fin est
// passée (facture + avis, voir appointment-lifecycle.ts). Aucune tâche cron
// externe dans cet environnement : une boucle setInterval démarrée avec le
// serveur (voir src/instrumentation.ts) fait l'affaire tant que le processus
// Node reste vivant - cohérent avec un hébergement auto-géré persistant,
// mais ne survit pas à un redémarrage ou à un déploiement serverless.
const TICK_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const REMINDER_WINDOW_MIN_MS = 1 * 60 * 60 * 1000 + 50 * 60 * 1000; // 1h50
const REMINDER_WINDOW_MAX_MS = 2 * 60 * 60 * 1000 + 10 * 60 * 1000; // 2h10

function toDateTime(date: Date, time: string): Date {
  const [hour, minute] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hour, minute, 0, 0);
  return result;
}

async function sendDueReminders(now: number) {
  const upcoming = await prisma.appointment.findMany({
    where: { status: 'confirmed', reminderSent: false },
    select: { id: true, date: true, startTime: true },
  });

  for (const appt of upcoming) {
    const msUntilStart = toDateTime(appt.date, appt.startTime).getTime() - now;
    if (msUntilStart >= REMINDER_WINDOW_MIN_MS && msUntilStart <= REMINDER_WINDOW_MAX_MS) {
      await notifyAppointmentEvent('reminder_2h', appt.id);
    }
  }
}

async function completeDueSessions(now: number) {
  const confirmed = await prisma.appointment.findMany({
    where: { status: 'confirmed' },
    select: { id: true, date: true, endTime: true },
  });

  for (const appt of confirmed) {
    if (toDateTime(appt.date, appt.endTime).getTime() <= now) {
      await completeAppointment(appt.id);
    }
  }
}

async function tick() {
  const now = Date.now();
  try {
    await sendDueReminders(now);
    await completeDueSessions(now);
  } catch (error) {
    console.error('Erreur scheduler rendez-vous:', error);
  }
}

let started = false;

export function startScheduler(): void {
  if (started) return;
  started = true;
  console.log(`🕐 Scheduler démarré (vérification toutes les ${TICK_INTERVAL_MS / 60000} min)`);
  tick();
  setInterval(tick, TICK_INTERVAL_MS);
}
