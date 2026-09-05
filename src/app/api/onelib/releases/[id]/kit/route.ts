import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import JSZip from 'jszip';
import QRCode from 'qrcode';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const ROLE_LABELS: Record<string, string> = {
  compositeur: 'Compositeur',
  auteur: 'Auteur',
  featuring: 'Featuring',
  producteur: 'Producteur',
  ingenieur_son: 'Ingénieur son',
};

async function loadImageBytes(url: string): Promise<Buffer | null> {
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const res = await fetch(url);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    }
    const filePath = path.join(process.cwd(), 'public', url.replace(/^\//, ''));
    return await readFile(filePath);
  } catch {
    return null;
  }
}

// GET - Kit de distribution (ZIP) : pochette, liens, QR code, fiche technique, attestation d'auteur
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
    const release = await prisma.onelibRelease.findUnique({
      where: { id },
      include: { track: true, collaborators: { orderBy: { createdAt: 'asc' } }, user: true }
    });

    if (!release || release.userId !== user.id) {
      return NextResponse.json({ error: 'Release non trouvée' }, { status: 404 });
    }

    const origin = request.nextUrl.origin;
    const smartLinkUrl = `${origin}/?public=onelib&slug=${release.slug}`;
    const { track, collaborators } = release;

    const zip = new JSZip();

    // Pochette
    const cover = release.coverUrl || track.coverUrl;
    if (cover) {
      const bytes = await loadImageBytes(cover);
      if (bytes) {
        const ext = cover.split('.').pop()?.split('?')[0] || 'jpg';
        zip.file(`pochette.${ext}`, bytes);
      }
    }

    // QR code
    const qrPngDataUrl = await QRCode.toDataURL(smartLinkUrl, { width: 512, margin: 2 });
    const qrBase64 = qrPngDataUrl.split(',')[1];
    zip.file('qrcode.png', qrBase64, { base64: true });

    // Liens
    const linkLines = [
      `Smart link Onelib : ${smartLinkUrl}`,
      track.spotifyUrl ? `Spotify : ${track.spotifyUrl}` : null,
      track.appleMusicUrl ? `Apple Music : ${track.appleMusicUrl}` : null,
      track.youtubeUrl ? `YouTube : ${track.youtubeUrl}` : null,
      track.deezerUrl ? `Deezer : ${track.deezerUrl}` : null,
      release.soundcloudUrl ? `SoundCloud : ${release.soundcloudUrl}` : null,
    ].filter(Boolean);
    zip.file('liens.txt', linkLines.join('\n'));

    // Fiche technique
    const ficheLines = [
      `Titre : ${track.title}`,
      `Artiste : ${track.artist}`,
      track.genre ? `Genre : ${track.genre}` : null,
      track.bpm ? `BPM : ${track.bpm}` : null,
      track.key ? `Tonalité : ${track.key}` : null,
      track.duration ? `Durée : ${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}` : null,
      track.releaseDate ? `Date de sortie : ${new Date(track.releaseDate).toLocaleDateString('fr-FR')}` : null,
      '',
      'Collaborateurs :',
      ...(collaborators.length > 0
        ? collaborators.map(c => `- ${c.name} (${ROLE_LABELS[c.role] || c.role})`)
        : ['- Aucun collaborateur renseigné']),
    ].filter(l => l !== null);
    zip.file('fiche-technique.txt', ficheLines.join('\n'));

    // Attestation d'auteur (si signée)
    if (release.authorLegalName && release.authorSignedAt) {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      let y = 780;
      const lineHeight = 14;
      const maxWidth = 495;

      // Découpe manuelle en lignes (mesurée), pour garder le curseur y synchronisé
      // avec le nombre réel de lignes dessinées (page.drawText({ maxWidth }) seul
      // ne renvoie pas ce compte, ce qui provoquait un chevauchement de texte).
      const wrapText = (text: string, size: number, activeFont: typeof font) => {
        const words = text.split(' ');
        const lines: string[] = [];
        let current = '';
        for (const word of words) {
          const candidate = current ? `${current} ${word}` : word;
          if (activeFont.widthOfTextAtSize(candidate, size) > maxWidth && current) {
            lines.push(current);
            current = word;
          } else {
            current = candidate;
          }
        }
        if (current) lines.push(current);
        return lines;
      };

      const drawLine = (text: string, opts: { bold?: boolean; size?: number; gap?: number } = {}) => {
        const size = opts.size || 11;
        const activeFont = opts.bold ? bold : font;
        const lines = text ? wrapText(text, size, activeFont) : [''];
        for (const line of lines) {
          page.drawText(line, {
            x: 50, y,
            size,
            font: activeFont,
            color: rgb(0.07, 0.07, 0.07),
          });
          y -= lineHeight;
        }
        y -= (opts.gap || 20) - lineHeight;
      };

      drawLine("Attestation d'auteur", { bold: true, size: 18, gap: 32 });
      drawLine(`Titre de l'oeuvre : ${track.title}`, { bold: true });
      drawLine(`Artiste : ${track.artist}`, {});
      if (track.genre) drawLine(`Genre : ${track.genre}`, {});
      drawLine('', { gap: 12 });

      const declarationText =
        `Je soussigné(e) ${release.authorLegalName}, atteste être l'auteur(e) de l'oeuvre` +
        ` intitulee "${track.title}" (${track.artist})${collaborators.length > 0 ? ', en collaboration avec :' : '.'}`;
      drawLine(declarationText, { gap: 20 });

      if (collaborators.length > 0) {
        for (const c of collaborators) {
          drawLine(`- ${c.name} (${ROLE_LABELS[c.role] || c.role})`, { gap: 18 });
        }
        y -= 8;
      }

      drawLine(`Date de signature : ${release.authorSignedAt.toLocaleDateString('fr-FR')} a ${release.authorSignedAt.toLocaleTimeString('fr-FR')}`, { gap: 28 });

      drawLine('Cette attestation constitue une preuve d\'anteriorite auto-declaree et', { size: 9, gap: 14 });
      drawLine('horodatee. Elle ne remplace pas un depot officiel aupres de la SACEM,', { size: 9, gap: 14 });
      drawLine('d\'un huissier de justice ou de tout autre organisme de protection des', { size: 9, gap: 14 });
      drawLine('droits d\'auteur.', { size: 9, gap: 24 });

      drawLine(`Signature : ${release.authorLegalName}`, { bold: true, size: 13 });

      const pdfBytes = await pdfDoc.save();
      zip.file('attestation.pdf', pdfBytes);
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="onelib-${release.slug}.zip"`,
      }
    });
  } catch (error) {
    console.error('Erreur génération kit de distribution Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
