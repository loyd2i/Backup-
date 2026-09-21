import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { prisma } from '@/lib/db';

// GET - QR code (PNG en data URL) pointant vers la fiche publique d'une
// release ou d'un album/playlist, sans authentification. Utilisé par le
// générateur d'image de partage accessible à tout visiteur sur la page
// publique Onelib - contrairement à /api/onelib/releases/[id]/qrcode
// (réservé au propriétaire, utilisé dans Créations).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const [release, collection] = await Promise.all([
      prisma.onelibRelease.findUnique({ where: { slug }, select: { id: true } }),
      prisma.onelibCollection.findUnique({ where: { slug }, select: { id: true } }),
    ]);
    if (!release && !collection) {
      return NextResponse.json({ error: 'Contenu non trouvé' }, { status: 404 });
    }

    const origin = request.nextUrl.origin;
    const smartLinkUrl = `${origin}/?public=onelib&slug=${slug}`;

    const dataUrl = await QRCode.toDataURL(smartLinkUrl, {
      width: 512,
      margin: 2,
      color: { dark: '#121212ff', light: '#ffffffff' },
    });

    return NextResponse.json({ dataUrl, url: smartLinkUrl });
  } catch (error) {
    console.error('Erreur génération QR code public Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
