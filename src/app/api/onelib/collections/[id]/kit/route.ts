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

// GET - Kit de distribution (ZIP) d'un album/playlist : pochette, liens, QR code,
// fiche technique (tracklist), attestation d'auteur
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
    const collection = await prisma.onelibCollection.findUnique({
      where: { id },
      include: {
        tracks: { include: { track: true }, orderBy: { order: 'asc' } },
        collaborators: { orderBy: { createdAt: 'asc' } }
      }
    });

    if (!collection || collection.userId !== user.id) {
      return NextResponse.json({ error: 'Collection non trouvée' }, { status: 404 });
    }

    const origin = request.nextUrl.origin;
    const smartLinkUrl = `${origin}/?public=onelib&slug=${collection.slug}`;
    const { tracks, collaborators } = collection;

    const zip = new JSZip();

    if (collection.coverUrl) {
      const bytes = await loadImageBytes(collection.coverUrl);
      if (bytes) {
        const ext = collection.coverUrl.split('.').pop()?.split('?')[0] || 'jpg';
        zip.file(`pochette.${ext}`, bytes);
      }
    }

    const qrPngDataUrl = await QRCode.toDataURL(smartLinkUrl, { width: 512, margin: 2 });
    zip.file('qrcode.png', qrPngDataUrl.split(',')[1], { base64: true });

    const linkLines = [`Smart link Onelib : ${smartLinkUrl}`, ''];
    for (const entry of tracks) {
      const t = entry.track;
      linkLines.push(`— ${t.title} (${t.artist})`);
      if (t.spotifyUrl) linkLines.push(`   Spotify : ${t.spotifyUrl}`);
      if (t.appleMusicUrl) linkLines.push(`   Apple Music : ${t.appleMusicUrl}`);
      if (t.youtubeUrl) linkLines.push(`   YouTube : ${t.youtubeUrl}`);
      if (t.deezerUrl) linkLines.push(`   Deezer : ${t.deezerUrl}`);
    }
    zip.file('liens.txt', linkLines.join('\n'));

    const ficheLines = [
      `Titre : ${collection.title}`,
      `Type : ${collection.kind === 'album' ? 'Album' : 'Playlist'}`,
      `Nombre de titres : ${tracks.length}`,
      '',
      'Tracklist :',
      ...tracks.map((entry, i) => `${i + 1}. ${entry.track.title} — ${entry.track.artist}`),
      '',
      'Collaborateurs :',
      ...(collaborators.length > 0
        ? collaborators.map(c => `- ${c.name} (${ROLE_LABELS[c.role] || c.role})`)
        : ['- Aucun collaborateur renseigné']),
    ];
    zip.file('fiche-technique.txt', ficheLines.join('\n'));

    if (collection.authorLegalName && collection.authorSignedAt) {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      let y = 780;
      const lineHeight = 14;
      const maxWidth = 495;

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
          page.drawText(line, { x: 50, y, size, font: activeFont, color: rgb(0.07, 0.07, 0.07) });
          y -= lineHeight;
        }
        y -= (opts.gap || 20) - lineHeight;
      };

      drawLine("Attestation d'auteur", { bold: true, size: 18, gap: 32 });
      drawLine(`Titre : ${collection.title}`, { bold: true });
      drawLine(`Type : ${collection.kind === 'album' ? 'Album' : 'Playlist'} — ${tracks.length} titre(s)`, {});
      drawLine('', { gap: 12 });

      const declarationText =
        `Je soussigné(e) ${collection.authorLegalName}, atteste être l'auteur(e) de l'oeuvre` +
        ` intitulee "${collection.title}"${collaborators.length > 0 ? ', en collaboration avec :' : '.'}`;
      drawLine(declarationText, { gap: 20 });

      if (collaborators.length > 0) {
        for (const c of collaborators) {
          drawLine(`- ${c.name} (${ROLE_LABELS[c.role] || c.role})`, { gap: 18 });
        }
        y -= 8;
      }

      drawLine('Titres inclus :', { bold: true, gap: 18 });
      for (const entry of tracks) {
        drawLine(`${entry.order + 1}. ${entry.track.title} — ${entry.track.artist}`, { gap: 16 });
      }
      y -= 8;

      drawLine(`Date de signature : ${collection.authorSignedAt.toLocaleDateString('fr-FR')} a ${collection.authorSignedAt.toLocaleTimeString('fr-FR')}`, { gap: 28 });

      drawLine('Cette attestation constitue une preuve d\'anteriorite auto-declaree et', { size: 9, gap: 14 });
      drawLine('horodatee. Elle ne remplace pas un depot officiel aupres de la SACEM,', { size: 9, gap: 14 });
      drawLine('d\'un huissier de justice ou de tout autre organisme de protection des', { size: 9, gap: 14 });
      drawLine('droits d\'auteur.', { size: 9, gap: 24 });

      drawLine(`Signature : ${collection.authorLegalName}`, { bold: true, size: 13 });

      const pdfBytes = await pdfDoc.save();
      zip.file('attestation.pdf', pdfBytes);
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="onelib-${collection.slug}.zip"`,
      }
    });
  } catch (error) {
    console.error('Erreur génération kit de distribution collection Onelib:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
