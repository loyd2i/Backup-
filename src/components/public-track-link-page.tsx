'use client';

import { useEffect, useRef, useState } from 'react';
import { Music, Play, Pause, Eye, Headphones, Music2, Youtube, Disc3, Apple as AppleIcon } from 'lucide-react';

interface LinkTrack {
  id: string;
  title: string;
  artist: string;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  audioUrl: string | null;
  coverUrl: string | null;
  duration: number | null;
  views: number;
  spotifyUrl: string | null;
  youtubeUrl: string | null;
  appleMusicUrl: string | null;
  deezerUrl: string | null;
  user: { id: string; name: string };
  studio: { id: string; name: string } | null;
}

interface Props {
  token: string;
}

const PLATFORM_META = [
  { key: 'spotifyUrl' as const, label: 'Spotify', icon: Music2, color: '#1DB954' },
  { key: 'appleMusicUrl' as const, label: 'Apple Music', icon: AppleIcon, color: '#FA57C1' },
  { key: 'youtubeUrl' as const, label: 'YouTube', icon: Youtube, color: '#FF0000' },
  { key: 'deezerUrl' as const, label: 'Deezer', icon: Disc3, color: '#A238FF' },
];

export default function PublicTrackLinkPage({ token }: Props) {
  const [track, setTrack] = useState<LinkTrack | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const fetchTrack = async () => {
      try {
        const res = await fetch(`/api/tracks/link/${token}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setTrack(data.track);
      } catch (error) {
        console.error('Error fetching shared track:', error);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTrack();
  }, [token]);

  const togglePlay = () => {
    if (!track) return;
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }
    if (audioRef.current) {
      if (!audioRef.current.src) audioRef.current.src = track.audioUrl || '';
      audioRef.current.play();
      setIsPlaying(true);
      fetch(`/api/tracks/${track.id}/view?token=${token}`, { method: 'POST' }).catch(() => {});
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const duration = track?.duration || 180;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const platformLinks = track ? PLATFORM_META.filter(p => !!track[p.key]) : [];

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
      <div className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(139,92,246,0.04) 0%, transparent 50%)'
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] rounded-lg flex items-center justify-center">
            <Headphones className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-white font-semibold">Studiolib</span>
        </div>

        {isLoading ? (
          <div className="h-64 bg-[#1a1a1a] rounded-2xl animate-pulse" />
        ) : notFound || !track ? (
          <div className="text-center py-16 bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a]">
            <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-300 text-lg font-medium">Ce lien n'est plus valide</p>
            <p className="text-gray-600 text-sm mt-2 px-6">
              Le morceau a peut-être été repassé en privé, ou le lien a été révoqué par son auteur.
            </p>
          </div>
        ) : (
          <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] overflow-hidden shadow-xl">
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-32 h-32 rounded-2xl overflow-hidden shadow-xl shadow-[#6366f1]/20 bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center mb-4">
                {track.coverUrl ? (
                  <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center gap-0.5 h-14">
                    {[0.4, 0.7, 1, 0.8, 0.5, 0.9, 0.6, 0.8, 0.4, 0.7].map((h, i) => (
                      <div key={i} className="w-1 bg-white/80 rounded-full" style={{ height: `${h * 46}px` }} />
                    ))}
                  </div>
                )}
              </div>

              <h1 className="text-white font-bold text-xl">{track.title}</h1>
              <p className="text-gray-400 mt-0.5">{track.artist}</p>
              {track.studio && (
                <p className="text-[#f59e0b] text-xs mt-1">🎙 {track.studio.name}</p>
              )}

              <div className="flex items-center gap-3 text-xs mt-3 flex-wrap justify-center">
                {track.bpm && <span className="bg-[#2a2a3a] text-gray-300 px-2 py-0.5 rounded-md">{track.bpm} BPM</span>}
                {track.key && <span className="bg-[#2a2a3a] text-gray-300 px-2 py-0.5 rounded-md">{track.key}</span>}
                {track.genre && <span className="bg-[#2a2a3a] text-gray-300 px-2 py-0.5 rounded-md">{track.genre}</span>}
                <span className="flex items-center gap-1 text-gray-500">
                  <Eye className="w-3 h-3" /> {track.views}
                </span>
              </div>

              {platformLinks.length > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  {platformLinks.map(p => (
                    <a
                      key={p.key}
                      href={track[p.key] as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={p.label}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ backgroundColor: `${p.color}26`, color: p.color }}
                    >
                      <p.icon className="w-3.5 h-3.5" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={togglePlay}
                disabled={!track.audioUrl}
                className={`w-full h-14 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all disabled:opacity-40 ${
                  isPlaying
                    ? 'bg-[#6366f1] text-white shadow-lg shadow-[#6366f1]/40'
                    : 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white hover:shadow-lg hover:shadow-[#6366f1]/30'
                }`}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                {isPlaying ? 'Pause' : 'Écouter'}
              </button>

              <div className="mt-3">
                <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] rounded-full transition-all duration-100"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-500">{formatTime(currentTime)}</span>
                  <span className="text-xs text-gray-500">{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-gray-600 text-xs mt-6">
          Lien privé partagé par {track?.user.name || 'un artiste'} — non répertorié sur Studiolib.
        </p>

        <audio
          ref={audioRef}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
        />
      </div>
    </div>
  );
}
