import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Get invoices for studio or user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studioId = searchParams.get('studioId');

    let invoices;

    if (studioId || user.role === 'studio_owner') {
      // Get invoices for studio - seul le propriétaire du studio peut les consulter
      const studio = studioId
        ? await prisma.studio.findFirst({ where: { id: studioId, ownerId: user.id } })
        : await prisma.studio.findFirst({ where: { ownerId: user.id } });

      if (!studio) {
        return NextResponse.json({ invoices: [] });
      }

      invoices = await prisma.invoice.findMany({
        where: { studioId: studio.id },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // Get invoices for user (client)
      invoices = await prisma.invoice.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      });
    }

    // Add appointment info
    const invoicesWithAppointment = await Promise.all(
      invoices.map(async (invoice) => {
        if (invoice.appointmentId) {
          const appointment = await prisma.appointment.findUnique({
            where: { id: invoice.appointmentId },
            select: { date: true, startTime: true }
          });
          return { ...invoice, appointment };
        }
        return invoice;
      })
    );

    return NextResponse.json({ invoices: invoicesWithAppointment });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// Les factures sont exclusivement générées par completeAppointment()
// (voir src/lib/appointment-lifecycle.ts), avec numérotation légale et
// mentions figées à l'émission. Aucune route de création/modification
// manuelle n'est exposée : ni le studio ni l'artiste ne doivent pouvoir
// éditer une facture après coup.
