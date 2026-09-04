import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getTaxConfig } from '@/lib/tax-config';
import { renderDocumentHtml, formatMoney } from '@/lib/document-template';

// GET - Facture client (HTML imprimable) pour une session terminée
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        user: true,
        studio: true,
      }
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Rendez-vous non trouvé' }, { status: 404 });
    }

    const isClient = appointment.userId === user.id;
    const isStudioOwner = appointment.studio.ownerId === user.id;
    if (!isClient && !isStudioOwner) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    if (!appointment.totalPrice) {
      return NextResponse.json({ error: 'Aucun montant associé à ce rendez-vous' }, { status: 400 });
    }

    const { countryName, vatRate } = getTaxConfig(appointment.studio.country);
    const totalTTC = appointment.totalPrice;
    const totalHT = totalTTC / (1 + vatRate);
    const vatAmount = totalTTC - totalHT;

    const dateStr = new Date(appointment.date).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    const issuedStr = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    const html = renderDocumentHtml(`Facture - ${appointment.studio.name}`, `
      <div class="header">
        <div>
          <div class="brand">Studiolib</div>
          <div class="brand-tagline">Vivez la musique comme vous l'entendez, on s'occupe du reste</div>
        </div>
        <div class="doc-title">
          <h1>Facture</h1>
          <p>N° ${appointment.id.slice(-8).toUpperCase()}</p>
          <p>${issuedStr}</p>
        </div>
      </div>

      <div class="parties">
        <div class="party">
          <h2>Studio</h2>
          <p><strong>${appointment.studio.name}</strong></p>
          <p>${appointment.studio.address || appointment.studio.location}</p>
          <p>${countryName}</p>
        </div>
        <div class="party">
          <h2>Client</h2>
          <p><strong>${appointment.user.name}</strong></p>
          <p>${appointment.user.email}</p>
          ${appointment.user.phone ? `<p>${appointment.user.phone}</p>` : ''}
        </div>
      </div>

      <div class="section">
        <h2>Détail de la session</h2>
        <table>
          <thead>
            <tr><th>Description</th><th>Durée</th><th style="text-align:right">Montant HT</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Session studio - ${dateStr} à ${appointment.startTime}</td>
              <td>${appointment.duration}h</td>
              <td style="text-align:right">${formatMoney(totalHT)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="totals">
        <div class="totals-row"><span>Total HT</span><span>${formatMoney(totalHT)}</span></div>
        <div class="totals-row"><span>TVA (${(vatRate * 100).toFixed(1)}%)</span><span>${formatMoney(vatAmount)}</span></div>
        <div class="totals-row total"><span>Total TTC</span><span>${formatMoney(totalTTC)}</span></div>
      </div>

      <div class="footer">
        Studiolib - Plateforme de mise en relation artistes / studios d'enregistrement
      </div>
    `);

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  } catch (error) {
    console.error('Erreur génération facture:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
