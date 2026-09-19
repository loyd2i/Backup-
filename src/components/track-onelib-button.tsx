'use client';

import { useState } from 'react';
import { Radio, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface TrackOnelibButtonProps {
  trackId: string;
  onelibReleaseId?: string | null;
}

// Envoie une track terminée vers OneLib (crée la release si besoin) puis
// ouvre directement sa fiche, prête pour la demande de distribution sur
// les plateformes de streaming.
export default function TrackOnelibButton({ trackId, onelibReleaseId }: TrackOnelibButtonProps) {
  const [isSending, setIsSending] = useState(false);
  const setCurrentPage = useAppStore((state) => state.setCurrentPage);
  const setPendingOnelibReleaseId = useAppStore((state) => state.setPendingOnelibReleaseId);

  const handleClick = async () => {
    if (isSending) return;

    if (onelibReleaseId) {
      setPendingOnelibReleaseId(onelibReleaseId);
      setCurrentPage('onelib');
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch('/api/onelib/releases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId }),
      });
      const data = await res.json();
      if (res.ok && data.release) {
        setPendingOnelibReleaseId(data.release.id);
        setCurrentPage('onelib');
      } else {
        alert(data.error || "Erreur lors de l'envoi vers OneLib");
      }
    } catch (error) {
      console.error('Error sending track to Onelib:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isSending}
      className="p-2 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors disabled:opacity-50"
      title={onelibReleaseId ? 'Voir sur OneLib' : 'Envoyer vers OneLib pour la distribution'}
    >
      {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
    </button>
  );
}
