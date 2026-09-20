'use client';

import { useEffect, useState } from 'react';
import { Image as ImageIcon, X, Download, Loader2, Calendar, Users } from 'lucide-react';

export type ShareImageVariant = 'teaser' | 'live' | 'team';

interface OnelibShareImageButtonProps {
  releaseId: string;
  title: string;
  artistName: string;
  coverUrl?: string | null;
  accentColor?: string;
  variant: ShareImageVariant;
  // teaser
  scheduledAt?: string | null;
  // live
  distributionLive?: boolean;
  // team
  collaborators?: { name: string; role: string }[];
  label?: string;
}

const CANVAS_SIZE = 1080;

const ROLE_LABELS: Record<string, string> = {
  compositeur: 'Compositeur',
  auteur: 'Auteur',
  featuring: 'Featuring',
  producteur: 'Producteur',
  ingenieur_son: 'Ingénieur son',
};

function roleLabel(role: string) {
  return ROLE_LABELS[role] || role.charAt(0).toUpperCase() + role.slice(1);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Fond de la page studio (console de mixage, lumière bleue) + le dégradé
// sombre qui l'assombrit en haut/bas, pour que l'image partagée s'inscrive
// visuellement dans l'identité Studiolib/Onelib. La fenêtre qui affiche le
// résultat reprend le même fond (voir le composant plus bas).
export const SHARE_IMAGE_BACKGROUND = '/background-studio.jpg';

async function drawBackground(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#06080f';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  try {
    const bg = await loadImage(SHARE_IMAGE_BACKGROUND);
    const scale = Math.max(CANVAS_SIZE / bg.width, CANVAS_SIZE / bg.height);
    const drawWidth = bg.width * scale;
    const drawHeight = bg.height * scale;
    const dx = (CANVAS_SIZE - drawWidth) / 2;
    const dy = (CANVAS_SIZE - drawHeight) / 2;
    ctx.drawImage(bg, dx, dy, drawWidth, drawHeight);
  } catch {
    // Garde le fond uni si l'image est indisponible.
  }

  const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_SIZE);
  gradient.addColorStop(0, 'rgba(6, 8, 15, 0.55)');
  gradient.addColorStop(0.5, 'rgba(6, 8, 15, 0.35)');
  gradient.addColorStop(1, 'rgba(6, 8, 15, 0.75)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
}

async function drawCover(
  ctx: CanvasRenderingContext2D,
  coverUrl: string | null | undefined,
  accentColor: string,
  x: number,
  y: number,
  size: number
) {
  ctx.save();
  ctx.beginPath();
  const radius = 24;
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + size, y, x + size, y + size, radius);
  ctx.arcTo(x + size, y + size, x, y + size, radius);
  ctx.arcTo(x, y + size, x, y, radius);
  ctx.arcTo(x, y, x + size, y, radius);
  ctx.closePath();
  ctx.clip();

  if (coverUrl) {
    try {
      const img = await loadImage(coverUrl);
      ctx.drawImage(img, x, y, size, size);
    } catch {
      ctx.fillStyle = accentColor;
      ctx.fillRect(x, y, size, size);
    }
  } else {
    ctx.fillStyle = accentColor;
    ctx.fillRect(x, y, size, size);
  }
  ctx.restore();
}

const QR_MARGIN = 40;
const QR_PADDING = 6;
const QR_CONTAINER_COLOR = '#ffffff';

function qrBoxTop(qrSize: number) {
  return CANVAS_SIZE - qrSize - QR_PADDING - QR_MARGIN - QR_PADDING;
}

async function drawQrAndWordmark(ctx: CanvasRenderingContext2D, qrDataUrl: string, qrSize = 100) {
  const qrX = CANVAS_SIZE - qrSize - QR_PADDING - QR_MARGIN;
  const qrY = CANVAS_SIZE - qrSize - QR_PADDING - QR_MARGIN;
  const boxSize = qrSize + QR_PADDING * 2;
  const boxX = qrX - QR_PADDING;
  const boxY = qrY - QR_PADDING;

  // Fond blanc arrondi, taille réduite par rapport au format initial.
  // Pas d'ombre ici : sur un bloc plat, elle ne fait que dessiner un
  // contour disgracieux autour du QR code plutôt qu'aider la lisibilité.
  const shadow = { color: ctx.shadowColor, blur: ctx.shadowBlur, offsetY: ctx.shadowOffsetY };
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.fillStyle = QR_CONTAINER_COLOR;
  ctx.beginPath();
  const r = 12;
  ctx.moveTo(boxX + r, boxY);
  ctx.arcTo(boxX + boxSize, boxY, boxX + boxSize, boxY + boxSize, r);
  ctx.arcTo(boxX + boxSize, boxY + boxSize, boxX, boxY + boxSize, r);
  ctx.arcTo(boxX, boxY + boxSize, boxX, boxY, r);
  ctx.arcTo(boxX, boxY, boxX + boxSize, boxY, r);
  ctx.closePath();
  ctx.fill();

  const qrImg = await loadImage(qrDataUrl);
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  ctx.shadowColor = shadow.color;
  ctx.shadowBlur = shadow.blur;
  ctx.shadowOffsetY = shadow.offsetY;

  const byStudiolibY = boxY + boxSize + 26;
  ctx.fillStyle = '#9ca3af';
  ctx.font = '400 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('by Studiolib', boxX + boxSize / 2, byStudiolibY);

  // Logo rond Studiolib centré avec le mot "onelib" (bas gauche), à la
  // même hauteur que "by Studiolib" (bas droite) plutôt qu'au centre du
  // QR code, pour que les deux coins du bas se lisent sur une seule ligne.
  ctx.textAlign = 'left';
  const iconSize = 32;
  const textBaselineY = byStudiolibY;
  let textX = 40;
  try {
    const icon = await loadImage('/logo-icon.png');
    ctx.drawImage(icon, 40, textBaselineY - 11 - iconSize / 2, iconSize, iconSize);
    textX = 40 + iconSize + 12;
  } catch {
    // Ignore si le logo ne charge pas : le texte "onelib" suffit.
  }

  ctx.fillStyle = '#e5e7eb';
  ctx.font = '600 32px sans-serif';
  ctx.fillText('onelib', textX, textBaselineY);
}

// Le texte de la pastille est centré sur le canvas, mais le QR code est
// posé en bas à droite : une pastille trop large (ex. "SUR TOUTES LES
// PLATEFORMES") peut donc physiquement recouvrir le QR. On réduit la
// police jusqu'à ce que la pastille tienne dans une largeur sûre plutôt
// que de risquer ce chevauchement (voir le retour "le QR code masque les
// écrits sur certaines images").
const PILL_MAX_WIDTH = 600;
// Bleu foncé du fond (console de mixage), légèrement transparent plutôt
// qu'un aplat uni à la couleur de l'accent.
const PILL_BACKGROUND = 'rgba(13, 20, 36, 0.55)';

function drawPill(ctx: CanvasRenderingContext2D, text: string, centerX: number, y: number) {
  const paddingX = 36;
  let fontSize = 40;
  while (fontSize > 22) {
    ctx.font = `700 ${fontSize}px sans-serif`;
    if (ctx.measureText(text).width + paddingX * 2 <= PILL_MAX_WIDTH) break;
    fontSize -= 2;
  }
  const textWidth = ctx.measureText(text).width;
  const pillWidth = Math.min(textWidth + paddingX * 2, PILL_MAX_WIDTH);
  const pillHeight = 72;
  const pillX = centerX - pillWidth / 2;

  // Pas d'ombre portée ici : sur un bloc plat translucide, le flou de 20px
  // appliqué au reste du texte déborde largement de la pastille et donne
  // une impression de chevauchement avec ce qui est juste au-dessus.
  const shadow = { color: ctx.shadowColor, blur: ctx.shadowBlur, offsetY: ctx.shadowOffsetY };
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.fillStyle = PILL_BACKGROUND;
  ctx.beginPath();
  const r = pillHeight / 2;
  ctx.moveTo(pillX + r, y);
  ctx.arcTo(pillX + pillWidth, y, pillX + pillWidth, y + pillHeight, r);
  ctx.arcTo(pillX + pillWidth, y + pillHeight, pillX, y + pillHeight, r);
  ctx.arcTo(pillX, y + pillHeight, pillX, y, r);
  ctx.arcTo(pillX, y, pillX + pillWidth, y, r);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(text, centerX, y + pillHeight / 2 + 14);

  ctx.shadowColor = shadow.color;
  ctx.shadowBlur = shadow.blur;
  ctx.shadowOffsetY = shadow.offsetY;
}

// Génère une image carrée de partage (1080x1080), en trois variantes — voir
// BUSINESS-PLAN.md "Onelib streaming" :
// - teaser : avant la sortie programmée, avec la date de sortie
// - live : une fois sorti, avec la disponibilité réelle (Onelib seul ou
//   toutes plateformes une fois la distribution effective)
// - team : met en avant tous les protagonistes crédités (split sheet)
// Tout se fait côté client (canvas), même logique que le reste du
// DSP/rendu déjà calculé sur le poste de l'utilisateur dans ce projet.
async function renderShareImage(opts: {
  variant: ShareImageVariant;
  title: string;
  artistName: string;
  coverUrl?: string | null;
  qrDataUrl: string;
  accentColor: string;
  scheduledAt?: string | null;
  onAllPlatforms?: boolean;
  collaborators?: { name: string; role: string }[];
}): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas non supporté');

  await drawBackground(ctx);

  const coverSize = 580;
  const coverX = (CANVAS_SIZE - coverSize) / 2;
  const coverY = 60;
  await drawCover(ctx, opts.coverUrl, opts.accentColor, coverX, coverY, coverSize);

  // Ombre légère sur tout le texte dessiné après la pochette : le fond est
  // désormais une photo (console de mixage), pas un aplat sombre uni, donc
  // le texte a besoin de contraste garanti quel que soit ce qu'il y a derrière.
  // Flou volontairement faible : un flou large bave largement au-delà de la
  // lettre et donne une impression de chevauchement entre lignes voisines,
  // même quand l'écart entre elles est correct.
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 1;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px sans-serif';
  const titleY = coverY + coverSize + 80;
  ctx.fillText(opts.title, CANVAS_SIZE / 2, titleY, CANVAS_SIZE - 120);

  ctx.fillStyle = '#9ca3af';
  ctx.font = '36px sans-serif';
  ctx.fillText(opts.artistName, CANVAS_SIZE / 2, titleY + 54, CANVAS_SIZE - 120);

  if (opts.variant === 'teaser') {
    const dateLabel = opts.scheduledAt
      ? new Date(opts.scheduledAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';
    drawPill(ctx, 'BIENTÔT DISPONIBLE', CANVAS_SIZE / 2, titleY + 100);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 46px sans-serif';
    ctx.fillText(`Sortie le ${dateLabel}`, CANVAS_SIZE / 2, titleY + 240);
    await drawQrAndWordmark(ctx, opts.qrDataUrl);
  } else if (opts.variant === 'live') {
    const availabilityText = opts.onAllPlatforms ? 'SUR TOUTES LES PLATEFORMES' : 'DISPONIBLE SUR ONELIB';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(availabilityText, CANVAS_SIZE / 2, titleY + 145, CANVAS_SIZE - 120);
    await drawQrAndWordmark(ctx, opts.qrDataUrl);
  } else if (opts.variant === 'team') {
    // Pochette agrandie à la même taille que les autres images (voir
    // demande) : moins de place reste sous le titre, donc la liste des
    // protagonistes tient sur une ligne par personne (nom — rôle) plutôt
    // que deux, et un QR réduit pour préserver le maximum de place.
    const qrSize = 70;
    await drawQrAndWordmark(ctx, opts.qrDataUrl, qrSize);
    const qrTop = qrBoxTop(qrSize);
    const rowLimit = qrTop - 20;

    const pillY = titleY + 90;
    drawPill(ctx, 'L’ÉQUIPE', CANVAS_SIZE / 2, pillY);

    const rows = [{ name: opts.artistName, role: 'Artiste' }, ...(opts.collaborators || []).map(c => ({ name: c.name, role: roleLabel(c.role) }))];
    const rowStep = 30;
    const rowsStartY = pillY + 72 + 10;

    // Combien de lignes tiennent avant le QR ? Si tout le monde ne rentre
    // pas, on réserve la dernière ligne pour "+N autres" plutôt que de
    // risquer que le compte manquant disparaisse silencieusement.
    let maxSlots = 0;
    while (rowsStartY + maxSlots * rowStep + 12 <= rowLimit) maxSlots++;
    const needsOverflow = rows.length > maxSlots;
    const namedRowCount = needsOverflow ? Math.max(0, maxSlots - 1) : rows.length;

    ctx.textAlign = 'center';
    ctx.font = '500 26px sans-serif';
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < namedRowCount; i++) {
      const row = rows[i];
      ctx.fillText(`${row.name} — ${row.role}`, CANVAS_SIZE / 2, rowsStartY + i * rowStep, CANVAS_SIZE - 160);
    }
    if (needsOverflow) {
      const overflowCount = rows.length - namedRowCount;
      ctx.fillStyle = '#9ca3af';
      ctx.font = '400 24px sans-serif';
      ctx.fillText(`+${overflowCount} autre${overflowCount > 1 ? 's' : ''}`, CANVAS_SIZE / 2, rowsStartY + namedRowCount * rowStep);
    }
  }

  return canvas.toDataURL('image/png');
}

const VARIANT_LABELS: Record<ShareImageVariant, { button: string; modalTitle: string; icon: typeof ImageIcon }> = {
  teaser: { button: 'Image "Bientôt disponible"', modalTitle: 'Image de sortie à venir', icon: Calendar },
  live: { button: 'Image de partage', modalTitle: 'Image de partage', icon: ImageIcon },
  team: { button: 'Image équipe', modalTitle: 'Image de l’équipe', icon: Users },
};

export default function OnelibShareImageButton({
  releaseId,
  title,
  artistName,
  coverUrl,
  accentColor = '#6366f1',
  variant,
  scheduledAt,
  distributionLive = false,
  collaborators = [],
  label,
}: OnelibShareImageButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [onAllPlatforms, setOnAllPlatforms] = useState(distributionLive);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const meta = VARIANT_LABELS[variant];
  const Icon = meta.icon;

  const generate = async (qr: string, platforms: boolean) => {
    setIsLoading(true);
    setError(false);
    try {
      const dataUrl = await renderShareImage({
        variant,
        title,
        artistName,
        coverUrl,
        qrDataUrl: qr,
        accentColor,
        scheduledAt,
        onAllPlatforms: platforms,
        collaborators,
      });
      setImageUrl(dataUrl);
    } catch (e) {
      console.error('Erreur génération image de partage:', e);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = async () => {
    setShowModal(true);
    setIsLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/onelib/releases/${releaseId}/qrcode`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur QR code');
      setQrDataUrl(data.dataUrl);
      await generate(data.dataUrl, onAllPlatforms);
    } catch (e) {
      console.error('Erreur génération image de partage:', e);
      setError(true);
      setIsLoading(false);
    }
  };

  // Régénère l'image quand l'artiste change la disponibilité (variant "live").
  useEffect(() => {
    if (showModal && qrDataUrl && variant === 'live') {
      generate(qrDataUrl, onAllPlatforms);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onAllPlatforms]);

  return (
    <>
      <button
        onClick={openModal}
        className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] transition-colors"
        title={meta.button}
      >
        <Icon className="w-4 h-4" />
        {label || meta.button}
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div
            className="relative rounded-2xl w-full max-w-sm overflow-hidden bg-cover bg-center"
            style={{ backgroundImage: `linear-gradient(rgba(6,8,15,0.82), rgba(6,8,15,0.9)), url(${SHARE_IMAGE_BACKGROUND})` }}
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-semibold">{meta.modalTitle}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center">
              {isLoading ? (
                <div className="w-[280px] h-[280px] bg-[#2a2a2a] rounded-2xl flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
                </div>
              ) : error || !imageUrl ? (
                <p className="text-gray-500 text-sm mb-4">Impossible de générer l&apos;image.</p>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt={meta.modalTitle} className="w-[280px] h-[280px] rounded-xl object-cover mb-4" />

                  {variant === 'live' && (
                    <label className="flex items-center gap-2 w-full mb-4 text-sm text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={onAllPlatforms}
                        onChange={(e) => setOnAllPlatforms(e.target.checked)}
                        className="rounded"
                      />
                      Disponible sur toutes les plateformes (Spotify, Apple Music, Deezer...)
                    </label>
                  )}

                  <a
                    href={imageUrl}
                    download={`onelib-${variant}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`}
                    className="flex items-center gap-2 w-full justify-center text-sm px-3 py-2.5 rounded-lg text-white hover:opacity-90 transition-colors"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Download className="w-4 h-4" />
                    Télécharger (1080×1080)
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
