'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Music2, ExternalLink, Music, Youtube, Apple, Disc3, Disc, ListMusic } from 'lucide-react';

interface PublicCollaborator {
  name: string;
  role: string;
}

interface PublicTrackLinks {
  title: string;
  artist: string;
  genre?: string | null;
  coverUrl: string | null;
  spotifyUrl: string | null;
  youtubeUrl: string | null;
  appleMusicUrl: string | null;
  deezerUrl: string | null;
}

interface PublicRelease {
  slug: string;
  description: string | null;
  soundcloudUrl: string | null;
  coverUrl: string | null;
  views: number;
  publishedAt: string | null;
  track: PublicTrackLinks;
  collaborators: PublicCollaborator[];
}

interface PublicCollectionTrackEntry {
  track: PublicTrackLinks;
}

interface PublicCollection {
  slug: string;
  title: string;
  kind: string; // album, playlist
  description: string | null;
  coverUrl: string | null;
  views: number;
  publishedAt: string | null;
  tracks: PublicCollectionTrackEntry[];
  collaborators: PublicCollaborator[];
}

interface PublicOnelibPageProps {
  slug: string;
  onBack?: () => void;
}

const PLATFORM_META = [
  { key: 'spotifyUrl', label: 'Spotify', icon: Music, color: '#1DB954' },
  { key: 'appleMusicUrl', label: 'Apple Music', icon: Apple, color: '#FA57C1' },
  { key: 'youtubeUrl', label: 'YouTube', icon: Youtube, color: '#FF0000' },
  { key: 'deezerUrl', label: 'Deezer', icon: Disc3, color: '#A238FF' },
] as const;

function TrackPlatformLinks({ track }: { track: PublicTrackLinks }) {
  const links = PLATFORM_META.filter(p => !!track[p.key]);
  if (links.length === 0) return null;
  return (
    <div className="flex items-center gap-2 mt-1">
      {links.map(p => (
        <a
          key={p.key}
          href={track[p.key] as string}
          target="_blank"
          rel="noopener noreferrer"
          title={p.label}
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          <p.icon className="w-4 h-4" style={{ color: p.color }} />
        </a>
      ))}
    </div>
  );
}

export default function PublicOnelibPage({ slug, onBack }: PublicOnelibPageProps) {
  const [type, setType] = useState<'release' | 'collection' | null>(null);
  const [release, setRelease] = useState<PublicRelease | null>(null);
  const [collection, setCollection] = useState<PublicCollection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/onelib/public/${slug}`);
        const data = await res.json();
        if (res.ok) {
          setType(data.type);
          if (data.type === 'release') setRelease(data.release);
          else setCollection(data.collection);
        } else {
          setNotFound(true);
          setScheduledAt(data.scheduledAt || null);
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

  if (notFound || (!release && !collection)) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center p-6">
        <div className="text-center">
          <Music2 className="w-14 h-14 text-gray-600 mx-auto mb-4" />
          {scheduledAt ? (
            <>
              <p className="text-white text-lg font-semibold">Bientôt disponible</p>
              <p className="text-gray-500 text-sm mt-1">
                Cette sortie sera en ligne le {new Date(scheduledAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                {' '}à {new Date(scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </>
          ) : (
            <>
              <p className="text-white text-lg font-semibold">Cette sortie n&apos;est pas disponible</p>
              <p className="text-gray-500 text-sm mt-1">Le lien est invalide ou le contenu n&apos;a pas encore été publié</p>
            </>
          )}
          {onBack && (
            <button onClick={onBack} className="mt-4 text-[#6366f1] hover:text-[#818cf8] text-sm">
              Retour à Studiolib
            </button>
          )}
        </div>
      </div>
    );
  }

  const BackButton = onBack ? (
    <div className="p-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 bg-[#1a1a1a] text-white px-4 py-2 rounded-xl hover:bg-[#2a2a2a] transition-colors border border-[#2a2a2a]"
      >
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>
    </div>
  ) : null;

  // ─── Collection (album / playlist) ───
  if (type === 'collection' && collection) {
    return (
      <div className="min-h-screen bg-[#121212]">
        {BackButton}
        <div className="max-w-md mx-auto px-4 py-8 flex flex-col items-center text-center">
          <div className="w-56 h-56 rounded-2xl overflow-hidden bg-[#1a1a1a] border border-[#2a2a2a] mb-6 flex-shrink-0">
            {collection.coverUrl ? (
              <img src={collection.coverUrl} alt={collection.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {collection.kind === 'album' ? (
                  <Disc className="w-16 h-16 text-gray-600" />
                ) : (
                  <ListMusic className="w-16 h-16 text-gray-600" />
                )}
              </div>
            )}
          </div>

          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#6366f1]/15 text-[#818cf8] mb-2">
            {collection.kind === 'album' ? 'Album' : 'Playlist'}
          </span>
          <h1 className="text-2xl font-bold text-white">{collection.title}</h1>
          <p className="text-gray-400 mt-1">{collection.tracks.length} titre{collection.tracks.length > 1 ? 's' : ''}</p>
          {collection.collaborators.length > 0 && (
            <p className="text-gray-500 text-sm mt-1">
              avec {collection.collaborators.map(c => c.name).join(', ')}
            </p>
          )}

          {collection.description && (
            <p className="text-gray-300 text-sm mt-4 leading-relaxed">{collection.description}</p>
          )}

          <div className="w-full mt-8 space-y-2 text-left">
            {collection.tracks.map((entry, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-gray-600 text-sm w-5 flex-shrink-0">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{entry.track.title}</p>
                    <p className="text-gray-500 text-xs truncate">{entry.track.artist}</p>
                  </div>
                </div>
                <TrackPlatformLinks track={entry.track} />
              </div>
            ))}
          </div>

          <p className="text-gray-600 text-xs mt-10">Propulsé par Studiolib</p>
        </div>
      </div>
    );
  }

  // ─── Release (track unique) ───
  const { track } = release!;
  const cover = release!.coverUrl || track.coverUrl;

  const platforms = [
    { key: 'spotify', label: 'Spotify', url: track.spotifyUrl, icon: Music, color: '#1DB954' },
    { key: 'apple', label: 'Apple Music', url: track.appleMusicUrl, icon: Apple, color: '#FA57C1' },
    { key: 'youtube', label: 'YouTube', url: track.youtubeUrl, icon: Youtube, color: '#FF0000' },
    { key: 'deezer', label: 'Deezer', url: track.deezerUrl, icon: Disc3, color: '#A238FF' },
    { key: 'soundcloud', label: 'SoundCloud', url: release!.soundcloudUrl, icon: Music2, color: '#FF7700' },
  ].filter(p => !!p.url);

  return (
    <div className="min-h-screen bg-[#121212]">
      {BackButton}

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
        {release!.collaborators.length > 0 && (
          <p className="text-gray-500 text-sm mt-1">
            avec {release!.collaborators.map(c => c.name).join(', ')}
          </p>
        )}

        {release!.description && (
          <p className="text-gray-300 text-sm mt-4 leading-relaxed">{release!.description}</p>
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
