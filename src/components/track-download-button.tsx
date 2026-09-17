'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';

interface TrackDownloadButtonProps {
  title: string;
  artist: string;
  audioUrl?: string | null;
  versions?: { id: string; label: string | null; audioUrl: string | null }[];
}

export default function TrackDownloadButton({ title, artist, audioUrl, versions }: TrackDownloadButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const options = (versions && versions.length > 0)
    ? versions.filter((v) => v.audioUrl)
    : (audioUrl ? [{ id: 'main', label: null, audioUrl }] : []);

  const triggerDownload = (url: string, label: string | null) => {
    const extMatch = url.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
    const ext = extMatch ? extMatch[1] : 'mp3';
    const link = document.createElement('a');
    link.href = url;
    link.download = `${artist} - ${title}${label ? ` (${label})` : ''}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowMenu(false);
  };

  if (options.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => (options.length > 1 ? setShowMenu((v) => !v) : triggerDownload(options[0].audioUrl!, options[0].label))}
        className="p-2 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
        title="Télécharger"
      >
        <Download className="w-4 h-4" />
      </button>

      {showMenu && options.length > 1 && (
        <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-lg z-20 min-w-[160px] overflow-hidden">
          {options.map((v) => (
            <button
              key={v.id}
              onClick={() => triggerDownload(v.audioUrl!, v.label)}
              className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-[#2a2a2a] transition-colors"
            >
              {v.label || 'Version'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
