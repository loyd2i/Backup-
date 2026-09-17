import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - QR code (PNG en data URL) pointant vers un morceau public précis
// dans le flux des créations. Réservé aux morceaux publics : un QR code
// vers une track privée n'aurait aucune page à afficher côté visiteur.
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
    const track = await prisma.track.findFirst({ where: { id, userId: user.id } });

    if (!track) {
      return NextResponse.json({ error: 'Track non trouvée' }, { status: 404 });
    }

    if (!track.isPublic) {
      return NextResponse.json({ error: 'Ce morceau doit être public pour générer un QR code' }, { status: 400 });
    }

    const origin = request.nextUrl.origin;
    const url = `${origin}/?public=creations&track=${id}`;

    const dataUrl = await QRCode.toDataURL(url, {
      width: 512,
      margin: 2,
      color: { dark: '#0a0e1cff', light: '#ffffffff' },
    });

    return NextResponse.json({ dataUrl, url });
  } catch (error) {
    console.error('Erreur génération QR code track:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
