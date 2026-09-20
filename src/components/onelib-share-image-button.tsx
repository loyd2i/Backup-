'use client';

import { useState } from 'react';
import { Image as ImageIcon, X, Download, Loader2 } from 'lucide-react';

interface OnelibShareImageButtonProps {
  releaseId: string;
  title: string;
  artistName: string;
  coverUrl?: string | null;
  waveformPeaks?: string | null;
  accentColor?: string;
}

const CANVAS_SIZE = 1080;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Génère une image carrée de partage (1080x1080) : pochette, nom d'artiste,
// titre, extrait visuel du morceau (sa waveform réelle, pas une décoration
// inventée) et un QR code vers la fiche Onelib du titre — voir
// BUSINESS-PLAN.md "Onelib streaming". Tout se fait côté client (canvas),
// même logique que le reste du DSP/rendu déjà calculé sur le poste de
// l'utilisateur dans ce projet.
async function renderShareImage(opts: {
  title: string;
  artistName: string;
  coverUrl?: string | null;
  waveformPeaks?: string | null;
  qrDataUrl: string;
  accentColor: string;
}): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas non supporté');

  const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_SIZE);
  gradient.addColorStop(0, '#1a1a1a');
  gradient.addColorStop(1, '#0a0a0a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const coverSize = 640;
  const coverX = (CANVAS_SIZE - coverSize) / 2;
  const coverY = 80;

  ctx.save();
  ctx.beginPath();
  const radius = 24;
  ctx.moveTo(coverX + radius, coverY);
  ctx.arcTo(coverX + coverSize, coverY, coverX + coverSize, coverY + coverSize, radius);
  ctx.arcTo(coverX + coverSize, coverY + coverSize, coverX, coverY + coverSize, radius);
  ctx.arcTo(coverX, coverY + coverSize, coverX, coverY, radius);
  ctx.arcTo(coverX, coverY, coverX + coverSize, coverY, radius);
  ctx.closePath();
  ctx.clip();

  if (opts.coverUrl) {
    try {
      const img = await loadImage(opts.coverUrl);
      ctx.drawImage(img, coverX, coverY, coverSize, coverSize);
    } catch {
      ctx.fillStyle = opts.accentColor;
      ctx.fillRect(coverX, coverY, coverSize, coverSize);
    }
  } else {
    ctx.fillStyle = opts.accentColor;
    ctx.fillRect(coverX, coverY, coverSize, coverSize);
  }
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px sans-serif';
  const titleY = coverY + coverSize + 90;
  ctx.fillText(opts.title, CANVAS_SIZE / 2, titleY, CANVAS_SIZE - 120);

  ctx.fillStyle = '#9ca3af';
  ctx.font = '36px sans-serif';
  ctx.fillText(opts.artistName, CANVAS_SIZE / 2, titleY + 54, CANVAS_SIZE - 120);

  const bars: number[] = (() => {
    if (!opts.waveformPeaks) return [];
    try {
      const parsed = JSON.parse(opts.waveformPeaks);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  const waveY = titleY + 110;
  const waveHeight = 90;
  const waveWidth = coverSize;
  const waveX = coverX;
  if (bars.length > 0) {
    const barCount = Math.min(bars.length, 60);
    const step = waveWidth / barCount;
    ctx.fillStyle = opts.accentColor;
    for (let i = 0; i < barCount; i++) {
      const value = bars[Math.floor((i / barCount) * bars.length)];
      const barHeight = Math.max(4, value * waveHeight);
      const x = waveX + i * step;
      const y = waveY + (waveHeight - barHeight) / 2;
      ctx.fillRect(x, y, step * 0.6, barHeight);
    }
  }

  const qrSize = 150;
  const qrPadding = 16;
  const qrX = CANVAS_SIZE - qrSize - qrPadding - 40;
  const qrY = CANVAS_SIZE - qrSize - qrPadding - 40;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(qrX - qrPadding, qrY - qrPadding, qrSize + qrPadding * 2, qrSize + qrPadding * 2);
  const qrImg = await loadImage(opts.qrDataUrl);
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#6b7280';
  ctx.font = '600 32px sans-serif';
  ctx.fillText('onelib', 40, CANVAS_SIZE - 60);

  return canvas.toDataURL('image/png');
}

export default function OnelibShareImageButton({
  releaseId,
  title,
  artistName,
  coverUrl,
  waveformPeaks,
  accentColor = '#6366f1',
}: OnelibShareImageButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const openModal = async () => {
    setShowModal(true);
    setIsLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/onelib/releases/${releaseId}/qrcode`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur QR code');
      const dataUrl = await renderShareImage({
        title,
        artistName,
        coverUrl,
        waveformPeaks,
        qrDataUrl: data.dataUrl,
        accentColor,
      });
      setImageUrl(dataUrl);
    } catch (e) {
      console.error('Erreur génération image de partage:', e);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={openModal}
        className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] transition-colors"
        title="Générer une image carrée à partager"
      >
        <ImageIcon className="w-4 h-4" />
        Image de partage
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-sm">
            <div className="p-4 border-b border-[#2a2a2a] flex items-center justify-between">
              <h3 className="text-white font-semibold">Image de partage</h3>
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
                  <img src={imageUrl} alt="Image de partage" className="w-[280px] h-[280px] rounded-xl object-cover mb-4" />
                  <a
                    href={imageUrl}
                    download={`onelib-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`}
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
