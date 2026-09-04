'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Music2, ExternalLink, Music, Youtube, Apple, Disc3 } from 'lucide-react';

interface PublicRelease {
  slug: string;
  description: string | null;
  soundcloudUrl: string | null;
  coverUrl: string | null;
  views: number;
  publishedAt: string | null;
  track: {
    title: string;
    artist: string;
    genre: string | null;
    coverUrl: string | null;
    spotifyUrl: string | null;
    youtubeUrl: string | null;
    appleMusicUrl: string | null;
    deezerUrl: string | null;
  };
}

interface PublicOnelibPageProps {
  slug: string;
  onBack?: () => void;
}

export default function PublicOnelibPage({ slug, onBack }: PublicOnelibPageProps) {
  const [release, setRelease] = useState<PublicRelease | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/onelib/public/${slug}`);
        const data = await res.json();
        if (res.ok) {
          setRelease(data.release);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [slug]);

  if (isLoading) {
    return <div className="min-h-screen bg-[#121212] p-6" />;
  }

  if (notFound || !release) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center p-6">
        <div className="text-center">
          <Music2 className="w-14 h-14 text-gray-600 mx-auto mb-4" />
          <p className="text-white text-lg font-semibold">Cette sortie n&apos;est pas disponible</p>
          <p className="text-gray-500 text-sm mt-1">Le lien est invalide ou la release n&apos;a pas encore été publiée</p>
          {onBack && (
            <button onClick={onBack} className="mt-4 text-[#6366f1] hover:text-[#818cf8] text-sm">
              Retour à Studiolib
            </button>
          )}
        </div>
      </div>
    );
  }

  const { track } = release;
  const cover = release.coverUrl || track.coverUrl;

  const platforms = [
    { key: 'spotify', label: 'Spotify', url: track.spotifyUrl, icon: Music, color: '#1DB954' },
    { key: 'apple', label: 'Apple Music', url: track.appleMusicUrl, icon: Apple, color: '#FA57C1' },
    { key: 'youtube', label: 'YouTube', url: track.youtubeUrl, icon: Youtube, color: '#FF0000' },
    { key: 'deezer', label: 'Deezer', url: track.deezerUrl, icon: Disc3, color: '#A238FF' },
    { key: 'soundcloud', label: 'SoundCloud', url: release.soundcloudUrl, icon: Music2, color: '#FF7700' },
  ].filter(p => !!p.url);

  return (
    <div className="min-h-screen bg-[#121212]">
      {onBack && (
        <div className="p-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 bg-[#1a1a1a] text-white px-4 py-2 rounded-xl hover:bg-[#2a2a2a] transition-colors border border-[#2a2a2a]"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
        </div>
      )}

      <div className="max-w-md mx-auto px-4 py-8 flex flex-col items-center text-center">
        <div className="w-56 h-56 rounded-2xl overflow-hidden bg-[#1a1a1a] border border-[#2a2a2a] mb-6 flex-shrink-0">
          {cover ? (
            <img src={cover} alt={track.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music2 className="w-16 h-16 text-gray-600" />
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold text-white">{track.title}</h1>
        <p className="text-gray-400 mt-1">{track.artist}{track.genre ? ` • ${track.genre}` : ''}</p>

        {release.description && (
          <p className="text-gray-300 text-sm mt-4 leading-relaxed">{release.description}</p>
        )}

        <div className="w-full mt-8 space-y-3">
          {platforms.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune plateforme de diffusion renseignée pour le moment</p>
          ) : (
            platforms.map((p) => (
              <a
                key={p.key}
                href={p.url as string}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-5 py-4 hover:border-[#3a3a3a] transition-colors group"
              >
                <span className="flex items-center gap-3">
                  <p.icon className="w-5 h-5" style={{ color: p.color }} />
                  <span className="text-white font-medium">Écouter sur {p.label}</span>
                </span>
                <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" />
              </a>
            ))
          )}
        </div>

        <p className="text-gray-600 text-xs mt-10">Propulsé par Studiolib</p>
      </div>
    </div>
  );
}
