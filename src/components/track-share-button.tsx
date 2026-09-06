'use client';

import { useState } from 'react';
import { Share2, X } from 'lucide-react';

interface TrackShare {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface TrackShareButtonProps {
  trackId: string;
}

export default function TrackShareButton({ trackId }: TrackShareButtonProps) {
  const [showShare, setShowShare] = useState(false);
  const [shares, setShares] = useState<TrackShare[]>([]);
  const [shareEmail, setShareEmail] = useState('');

  const fetchShares = async () => {
    try {
      const res = await fetch(`/api/tracks/${trackId}/share`);
      const data = await res.json();
      setShares(data.shares || []);
    } catch (e) {
      console.error('Error fetching shares:', e);
    }
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareEmail.trim()) return;

    try {
      const res = await fetch(`/api/tracks/${trackId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: [shareEmail] })
      });
      const data = await res.json();
      if (res.ok) {
        setShareEmail('');
        fetchShares();
      } else {
        alert(data.error || 'Erreur lors du partage');
      }
    } catch (e) {
      console.error('Error sharing:', e);
    }
  };

  const handleRemoveShare = async (userId: string) => {
    try {
      const res = await fetch(`/api/tracks/${trackId}/share?userId=${userId}`, {
        method: 'DELETE'
      });
      if (res.ok) fetchShares();
    } catch (e) {
      console.error('Error removing share:', e);
    }
  };

  return (
    <>
      <button
        onClick={() => { setShowShare(true); fetchShares(); }}
        className="p-2 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
        title="Partager"
      >
        <Share2 className="w-4 h-4" />
      </button>

      {showShare && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md">
            <div className="p-4 border-b border-[#2a2a2a] flex items-center justify-between">
              <h3 className="text-white font-semibold">Partager avec</h3>
              <button onClick={() => setShowShare(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              {shares.length > 0 && (
                <div className="mb-4">
                  <p className="text-gray-500 text-sm mb-2">Déjà partagé avec :</p>
                  <div className="space-y-2">
                    {shares.map((share) => (
                      <div key={share.id} className="flex items-center justify-between bg-[#2a2a2a] rounded-lg p-2">
                        <span className="text-white text-sm">{share.user.name || share.user.email}</span>
                        <button
                          onClick={() => handleRemoveShare(share.user.id)}
                          className="text-gray-500 hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleShare} className="flex gap-2">
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="Email de l'utilisateur..."
                  className="flex-1 bg-[#2a2a2a] text-white rounded-xl px-4 py-2 text-sm"
                />
                <button type="submit" className="px-4 bg-[#6366f1] text-white rounded-xl text-sm font-medium">
                  Partager
                </button>
              </form>

              <p className="text-gray-600 text-xs mt-3">
                Seuls les utilisateurs avec qui vous partagez pourront voir cette track privée.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
