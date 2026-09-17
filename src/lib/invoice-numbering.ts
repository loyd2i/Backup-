import { prisma } from '@/lib/db';

// Génère le prochain numéro de facture, séquentiel et sans rupture au sein
// d'une année civile (ex: "2026-000123") - une exigence légale pour toute
// facture émise en France, indépendante de la réforme de la facturation
// électronique. L'incrémentation via `increment` est une opération atomique
// côté base : deux appels concurrents ne peuvent pas obtenir le même numéro.
export async function nextInvoiceNumber(date: Date = new Date()): Promise<string> {
  const year = date.getFullYear();

  const counter = await prisma.invoiceCounter.upsert({
    where: { year },
    create: { year, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });

  return `${year}-${String(counter.lastNumber).padStart(6, '0')}`;
}
