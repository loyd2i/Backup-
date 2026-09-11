import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// POST - Enregistre l'abonnement push de l'appareil courant
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const body = await request.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Abonnement push invalide' }, { status: 400 });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth },
      create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur enregistrement abonnement push:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Retire l'abonnement push de l'appareil courant
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    if (!endpoint) return NextResponse.json({ error: 'endpoint requis' }, { status: 400 });

    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression abonnement push:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
