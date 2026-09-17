'use client';

import { useState } from 'react';
import { QrCode, X, Copy, Check } from 'lucide-react';

interface TrackQrCodeButtonProps {
  trackId: string;
  isPublic: boolean;
  title: string;
  artist: string;
}

export default function TrackQrCodeButton({ trackId, isPublic, title, artist }: TrackQrCodeButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const openModal = async () => {
    if (!isPublic) return;
    setShowModal(true);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tracks/${trackId}/qrcode`);
      const data = await res.json();
      if (res.ok) {
        setDataUrl(data.dataUrl);
        setShareUrl(data.url);
      }
    } catch (e) {
      console.error('Error generating QR code:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        onClick={openModal}
        disabled={!isPublic}
        className="p-2 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title={isPublic ? 'QR code de partage' : 'Rendez le morceau public pour générer un QR code'}
      >
        <QrCode className="w-4 h-4" />
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-sm">
            <div className="p-4 border-b border-[#2a2a2a] flex items-center justify-between">
              <h3 className="text-white font-semibold">QR code de partage</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center">
              {isLoading ? (
                <div className="w-[220px] h-[220px] bg-[#2a2a2a] rounded-2xl animate-pulse" />
              ) : dataUrl ? (
                <div className="bg-white p-4 rounded-2xl mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={dataUrl} alt="QR code de partage" width={200} height={200} />
                </div>
              ) : (
                <p className="text-gray-500 text-sm mb-4">Impossible de générer le QR code.</p>
              )}

              <p className="text-white font-medium text-center">{title}</p>
              <p className="text-gray-500 text-sm text-center mb-4">{artist}</p>

              {shareUrl && (
                <div className="w-full flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 bg-[#2a2a2a] text-white rounded-xl px-3 py-2 text-xs"
                  />
                  <button
                    onClick={handleCopy}
                    className="p-2 bg-[#2a2a2a] text-gray-400 rounded-xl hover:text-white transition-colors"
                    title="Copier le lien"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
