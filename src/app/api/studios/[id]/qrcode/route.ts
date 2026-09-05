import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { prisma } from '@/lib/db';

// GET - QR code (PNG en data URL) pointant vers la fiche publique du studio
// Pas d'authentification requise : la page ciblée est elle-même publique.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const studio = await prisma.studio.findUnique({ where: { id }, select: { id: true } });
    if (!studio) {
      return NextResponse.json({ error: 'Studio non trouvé' }, { status: 404 });
    }

    const origin = request.nextUrl.origin;
    const url = `${origin}/studio/${id}`;

    const dataUrl = await QRCode.toDataURL(url, {
      width: 512,
      margin: 2,
      color: { dark: '#0a0e1cff', light: '#ffffffff' },
    });

    return NextResponse.json({ dataUrl, url });
  } catch (error) {
    console.error('Erreur génération QR code studio:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
