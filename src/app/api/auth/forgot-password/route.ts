import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST - Demande de réinitialisation de mot de passe.
// Pas d'envoi d'e-mail réel (comme le reste de l'app en dev) : le lien
// est journalisé dans EmailLog et renvoyé directement dans la réponse.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'E-mail requis' }, { status: 400 });
    }

    const genericMessage = 'Si un compte existe pour cette adresse, un lien de réinitialisation a été envoyé.';

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Ne pas révéler si l'adresse existe ou non.
      return NextResponse.json({ message: genericMessage });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt }
    });

    const resetLink = `${request.nextUrl.origin}/reset-password?token=${token}`;

    await prisma.emailLog.create({
      data: {
        userId: user.id,
        email: user.email,
        type: 'password_reset',
        subject: 'Réinitialisation de votre mot de passe Studiolib',
        status: 'sent'
      }
    });

    console.log(`📧 Email simulé (password_reset) à ${user.email} : ${resetLink}`);

    return NextResponse.json({ message: genericMessage, resetLink });
  } catch (error) {
    console.error('Erreur demande réinitialisation:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
