import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Email types
type EmailType = 'confirmation' | 'reminder' | 'reminder_3h' | 'cancellation';

interface EmailData {
  to: string;
  subject: string;
  html: string;
  type: EmailType;
  appointmentId?: string;
  userId: string;
}

// Simulated email sending - in production, connect to SendGrid, Mailgun, etc.
async function sendEmail(data: EmailData): Promise<{ success: boolean; error?: string }> {
  try {
    // Log the email in database
    await prisma.emailLog.create({
      data: {
        userId: data.userId,
        email: data.to,
        type: data.type,
        appointmentId: data.appointmentId,
        subject: data.subject,
        status: 'sent'
      }
    });

    // In production, you would send actual email here:
    // Example with a hypothetical email service:
    // await emailService.send({
    //   to: data.to,
    //   subject: data.subject,
    //   html: data.html
    // });

    console.log(`📧 Email sent: ${data.type} to ${data.to}`);
    console.log(`Subject: ${data.subject}`);
    
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

// Send confirmation email
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { type, appointmentId } = body;

    if (!type || !appointmentId) {
      return NextResponse.json({ error: 'Type et appointmentId requis' }, { status: 400 });
    }

    // Get appointment details
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        user: true,
        studio: true
      }
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Rendez-vous non trouvé' }, { status: 404 });
    }

    const dateStr = new Date(appointment.date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    let subject: string;
    let html: string;

    switch (type) {
      case 'confirmation':
        subject = `✅ Confirmation de votre rendez-vous - ${appointment.studio.name}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; padding: 30px; border-radius: 10px;">
            <h1 style="color: #6366f1; text-align: center;">Rendez-vous confirmé !</h1>
            <p style="color: #fff; font-size: 16px;">Bonjour ${appointment.user.name},</p>
            <p style="color: #ccc;">Votre rendez-vous a été confirmé avec succès.</p>
            <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #6366f1; margin-top: 0;">📍 ${appointment.studio.name}</h2>
              <p style="color: #fff; margin: 10px 0;">📅 ${dateStr}</p>
              <p style="color: #fff; margin: 10px 0;">🕐 ${appointment.startTime} (${appointment.duration}h)</p>
              <p style="color: #fff; margin: 10px 0;">📍 ${appointment.studio.location}</p>
              ${appointment.totalPrice ? `<p style="color: #6366f1; font-size: 18px; font-weight: bold;">💰 ${appointment.totalPrice}€ TTC</p>` : ''}
            </div>
            <p style="color: #ccc;">Vous recevrez un rappel 3 heures avant votre rendez-vous.</p>
            <p style="color: #666; text-align: center; margin-top: 30px;">Studiolib - Votre plateforme de réservation studio</p>
          </div>
        `;
        break;

      case 'reminder_3h':
        subject = `⏰ Rappel : Votre séance commence dans 3h - ${appointment.studio.name}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; padding: 30px; border-radius: 10px;">
            <h1 style="color: #f59e0b; text-align: center;">⏰ Rappel !</h1>
            <p style="color: #fff; font-size: 16px;">Bonjour ${appointment.user.name},</p>
            <p style="color: #ccc;">Votre séance commence dans <strong style="color: #f59e0b;">3 heures</strong> !</p>
            <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #6366f1; margin-top: 0;">📍 ${appointment.studio.name}</h2>
              <p style="color: #fff; margin: 10px 0;">🕐 ${appointment.startTime}</p>
              <p style="color: #fff; margin: 10px 0;">📍 ${appointment.studio.location}</p>
            </div>
            <p style="color: #ccc;">Préparez vos morceaux et arrivez quelques minutes en avance !</p>
            <p style="color: #666; text-align: center; margin-top: 30px;">Studiolib - À tout de suite !</p>
          </div>
        `;
        break;

      case 'cancellation':
        subject = `❌ Annulation de rendez-vous - ${appointment.studio.name}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; padding: 30px; border-radius: 10px;">
            <h1 style="color: #ef4444; text-align: center;">Rendez-vous annulé</h1>
            <p style="color: #fff; font-size: 16px;">Bonjour ${appointment.user.name},</p>
            <p style="color: #ccc;">Votre rendez-vous du ${dateStr} à ${appointment.studio.name} a été annulé.</p>
            <p style="color: #666; text-align: center; margin-top: 30px;">Studiolib</p>
          </div>
        `;
        break;

      default:
        return NextResponse.json({ error: 'Type non supporté' }, { status: 400 });
    }

    const result = await sendEmail({
      to: appointment.user.email,
      subject,
      html,
      type,
      appointmentId,
      userId: appointment.user.id
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Update appointment if confirmation
    if (type === 'confirmation') {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { confirmationSent: true }
      });
    } else if (type === 'reminder_3h') {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { reminderSent: true }
      });
    }

    return NextResponse.json({ 
      message: 'Email envoyé avec succès',
      email: appointment.user.email,
      type
    });
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// GET - Get email logs
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const logs = await prisma.emailLog.findMany({
      where: { userId: user.id },
      orderBy: { sentAt: 'desc' },
      take: 50
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Erreur récupération logs:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
