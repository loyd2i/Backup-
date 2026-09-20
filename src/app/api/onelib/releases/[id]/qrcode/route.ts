import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - QR code (PNG en data URL) pointant vers la page smart link de la release
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
    const release = await prisma.onelibRelease.findUnique({ where: { id } });
    if (!release || release.userId !== user.id) {
      return NextResponse.json({ error: 'Release non trouvée' }, { status: 404 });
    }

    const origin = request.nextUrl.origin;
    const smartLinkUrl = `${origin}/?public=onelib&slug=${release.slug}`;

    // Couleurs personnalisables (utilisé par le générateur d'image de
    // partage pour un QR code plus sombre/original) - défaut inchangé pour
    // l'affichage QR classique de la page Onelib.
    const dark = request.nextUrl.searchParams.get('dark') || '#121212ff';
    const light = request.nextUrl.searchParams.get('light') || '#ffffffff';

    const dataUrl = await QRCode.toDataURL(smartLinkUrl, {
      width: 512,
      margin: 2,
      color: { dark, light },
    });

    return NextResponse.json({ dataUrl, url: smartLinkUrl });
  } catch (error) {
    console.error('Erreur génération QR code Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
