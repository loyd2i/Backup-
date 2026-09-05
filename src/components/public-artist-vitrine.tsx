'use client';

import { useEffect, useRef, useState } from 'react';
import {
  MapPin, Music2, Globe, Instagram, Youtube, Headphones, Music,
  Play, Pause, Eye, Disc, ListMusic, QrCode, Copy, Check, X, User as UserIcon
} from 'lucide-react';

interface PublicTrack {
  id: string;
  title: string;
  artist: string;
  audioUrl: string | null;
  duration: number | null;
  bpm: number | null;
  key: string | null;
  views: number;
  coverUrl: string | null;
}

interface ReleaseItem {
  type: 'release' | 'collection';
  slug: string;
  title: string;
  artist?: string;
  genre?: string | null;
  kind?: string;
  trackCount?: number;
  coverUrl: string | null;
  publishedAt: string | null;
}

interface Artist {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
  bio: string | null;
  city: string | null;
  genre: string | null;
  instagram: string | null;
  spotify: string | null;
  soundcloud: string | null;
  youtube: string | null;
  website: string | null;
}

interface PublicArtistVitrineProps {
  artistId: string;
}

export default function PublicArtistVitrine({ artistId }: PublicArtistVitrineProps) {
  const [artist, setArtist] = useState<Artist | null>(null);
  const [tracks, setTracks] = useState<PublicTrack[]>([]);
  const [releaseItems, setReleaseItems] = useState<ReleaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/artists/${artistId}/public`);
        const data = await res.json();
        if (res.ok) {
          setArtist(data.artist);
          setTracks(data.tracks || []);
          setReleaseItems(data.releaseItems || []);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    })();

    fetch(`/api/artists/${artistId}/qrcode`)
      .then(res => res.json())
      .then(data => setQrDataUrl(data.dataUrl || null))
      .catch(() => {});
  }, [artistId]);

  const togglePlayTrack = (trackId: string, audioUrl: string | null) => {
    if (!audioUrl) return;
    if (playingTrack === trackId) {
      setPlayingTrack(null);
      if (audioRef.current) audioRef.current.pause();
    } else {
      setPlayingTrack(trackId);
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      }
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#121212] p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="h-40 bg-[#1a1a1a] rounded-2xl animate-pulse" />
          <div className="h-32 bg-[#1a1a1a] rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (notFound || !artist) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center p-6">
        <div className="text-center">
          <UserIcon className="w-14 h-14 text-gray-600 mx-auto mb-4" />
          <p className="text-white text-lg font-semibold">Cet artiste n&apos;est pas disponible</p>
          <a href="/" className="mt-4 inline-block text-[#6366f1] hover:text-[#818cf8] text-sm">
            ← Retour à Studiolib
          </a>
        </div>
      </div>
    );
  }

  const accentColor = artist.role === 'studio_owner' ? '#f59e0b' : '#6366f1';

  // Défense en profondeur : même si l'API valide déjà ces champs à l'écriture,
  // on ne rend jamais un lien dont le schéma n'est pas http(s) (ex: javascript:).
  const isSafeHttpUrl = (value: string) => {
    try {
      const { protocol } = new URL(value);
      return protocol === 'http:' || protocol === 'https:';
    } catch {
      return false;
    }
  };

  const socialLinks = [
    artist.website && isSafeHttpUrl(artist.website) && { icon: Globe, url: artist.website, label: 'Site web' },
    artist.instagram && { icon: Instagram, url: `https://instagram.com/${artist.instagram.replace('@', '')}`, label: 'Instagram' },
    artist.spotify && isSafeHttpUrl(artist.spotify) && { icon: Music, url: artist.spotify, label: 'Spotify' },
    artist.soundcloud && isSafeHttpUrl(artist.soundcloud) && { icon: Headphones, url: artist.soundcloud, label: 'SoundCloud' },
    artist.youtube && isSafeHttpUrl(artist.youtube) && { icon: Youtube, url: artist.youtube, label: 'YouTube' },
  ].filter(Boolean) as { icon: typeof Globe; url: string; label: string }[];

  return (
    <div className="min-h-screen bg-[#121212]">
      <audio ref={audioRef} onEnded={() => setPlayingTrack(null)} />

      <div className="p-4">
        <a
          href="/"
          className="inline-flex items-center gap-2 bg-[#1a1a1a] text-white px-4 py-2 rounded-xl hover:bg-[#2a2a2a] transition-colors border border-[#2a2a2a] font-semibold"
        >
          Studiolib
        </a>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-12">
        {/* Hero */}
        <div className="flex flex-col items-center text-center mb-8">
          <div
            className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 mb-4 ring-4 ring-[#1a1a1a]"
            style={{ backgroundColor: accentColor }}
          >
            {artist.avatar ? (
              <img src={artist.avatar} alt={artist.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-4xl font-bold">{artist.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{artist.name}</h1>

          <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
            {artist.genre && (
              <span
                className="px-3 py-1 rounded-lg text-xs font-bold text-white"
                style={{ backgroundColor: accentColor }}
              >
                {artist.genre}
              </span>
            )}
            {artist.city && (
              <span className="flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 text-xs px-3 py-1 rounded-lg">
                <MapPin className="w-3 h-3" /> {artist.city}
              </span>
            )}
          </div>

          {artist.bio && (
            <p className="text-gray-400 max-w-lg leading-relaxed">{artist.bio}</p>
          )}

          {socialLinks.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {socialLinks.map((social, i) => {
                const Icon = social.icon;
                return (
                  <a
                    key={i}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:border-[#3a3a3a] transition-all"
                    title={social.label}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* QR Code / Partage */}
        <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-[#2a2a2a] mb-8 max-w-sm mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => qrDataUrl && setShowQrModal(true)}
              className="w-16 h-16 rounded-xl overflow-hidden bg-white flex items-center justify-center flex-shrink-0"
            >
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR code de cette fiche" className="w-full h-full object-cover" />
              ) : (
                <QrCode className="w-6 h-6 text-gray-400" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium">Fiche artiste</p>
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs transition-colors mt-1"
              >
                {linkCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {linkCopied ? 'Lien copié' : 'Copier le lien'}
              </button>
            </div>
          </div>
        </div>

        {/* Tracks */}
        {tracks.length > 0 && (
          <div className="mb-8">
            <h2 className="text-white font-bold text-lg mb-4">🎵 Créations</h2>
            <div className="space-y-3">
              {tracks.map((track) => (
                <div key={track.id} className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] flex items-center gap-4">
                  <button
                    onClick={() => togglePlayTrack(track.id, track.audioUrl)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                      playingTrack === track.id
                        ? 'shadow-lg'
                        : 'bg-[#2a2a2a] hover:opacity-90'
                    }`}
                    style={playingTrack === track.id ? { backgroundColor: accentColor } : undefined}
                  >
                    {playingTrack === track.id ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{track.title}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {track.bpm && <span>{track.bpm} BPM</span>}
                      {track.key && <span>{track.key}</span>}
                      <span>{formatDuration(track.duration)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500 text-sm">
                    <Eye className="w-3.5 h-3.5" /> {track.views}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sorties Onelib */}
        {releaseItems.length > 0 && (
          <div>
            <h2 className="text-white font-bold text-lg mb-4">💿 Sorties</h2>
            <div className="space-y-3">
              {releaseItems.map((item) => (
                <a
                  key={item.slug}
                  href={`/?public=onelib&slug=${item.slug}`}
                  className="w-full flex items-center gap-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 text-left transition-colors hover:border-[#3a3a3a]"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#121212] flex-shrink-0 flex items-center justify-center">
                    {item.coverUrl ? (
                      <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                    ) : item.type === 'collection' ? (
                      item.kind === 'album' ? <Disc className="w-6 h-6 text-gray-600" /> : <ListMusic className="w-6 h-6 text-gray-600" />
                    ) : (
                      <Music2 className="w-6 h-6 text-gray-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{item.title}</p>
                    <p className="text-gray-500 text-sm truncate">
                      {item.type === 'collection'
                        ? `${item.kind === 'album' ? 'Album' : 'Playlist'} • ${item.trackCount} titre${(item.trackCount || 0) > 1 ? 's' : ''}`
                        : item.artist}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {tracks.length === 0 && releaseItems.length === 0 && (
          <p className="text-gray-500 text-sm text-center">Aucune création publique pour le moment</p>
        )}

        <p className="text-gray-600 text-xs mt-10 text-center">Propulsé par Studiolib</p>
      </div>

      {/* QR Code Modal */}
      {showQrModal && qrDataUrl && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <button
            onClick={() => setShowQrModal(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white z-10"
          >
            <X className="w-8 h-8" />
          </button>
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full text-center">
            <img src={qrDataUrl} alt="QR code de cette fiche" className="w-full rounded-xl mb-4" />
            <p className="text-[#121212] font-semibold mb-4">{artist.name}</p>
            <a
              href={qrDataUrl}
              download={`qrcode-${artist.name.toLowerCase().replace(/\s+/g, '-')}.png`}
              className="inline-block w-full bg-[#121212] text-white py-3 rounded-xl font-medium hover:bg-black transition-colors"
            >
              Télécharger le QR code
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
