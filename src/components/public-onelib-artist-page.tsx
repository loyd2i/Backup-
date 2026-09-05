'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Music2, Disc, ListMusic, User as UserIcon } from 'lucide-react';

interface ArtistItem {
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
}

interface PublicOnelibArtistPageProps {
  userId: string;
  currentSlug?: string | null;
  onBack?: () => void;
  onNavigate: (slug: string) => void;
}

export default function PublicOnelibArtistPage({ userId, currentSlug, onBack, onNavigate }: PublicOnelibArtistPageProps) {
  const [artist, setArtist] = useState<Artist | null>(null);
  const [items, setItems] = useState<ArtistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/onelib/public/artist/${userId}`);
        const data = await res.json();
        if (res.ok) {
          setArtist(data.artist);
          setItems(data.items || []);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [userId]);

  if (isLoading) {
    return <div className="min-h-screen bg-[#121212] p-6" />;
  }

  if (notFound || !artist) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center p-6">
        <div className="text-center">
          <UserIcon className="w-14 h-14 text-gray-600 mx-auto mb-4" />
          <p className="text-white text-lg font-semibold">Cet artiste n&apos;est pas disponible</p>
          {onBack && (
            <button onClick={onBack} className="mt-4 text-[#6366f1] hover:text-[#818cf8] text-sm">
              Retour à Studiolib
            </button>
          )}
        </div>
      </div>
    );
  }

  const accentColor = artist.role === 'studio_owner' ? '#f59e0b' : '#6366f1';
  const currentItem = currentSlug ? items.find(i => i.slug === currentSlug) : null;
  const otherItems = currentItem ? items.filter(i => i.slug !== currentSlug) : items;

  const ItemCard = ({ item, featured = false }: { item: ArtistItem; featured?: boolean }) => (
    <button
      onClick={() => onNavigate(item.slug)}
      className={`w-full flex items-center gap-4 bg-[#1a1a1a] border rounded-2xl p-4 text-left transition-colors hover:border-[#3a3a3a] ${
        featured ? 'border-[#6366f1]' : 'border-[#2a2a2a]'
      }`}
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
        {featured && (
          <span className="text-xs font-medium" style={{ color: accentColor }}>En ce moment</span>
        )}
        <p className="text-white font-medium truncate">{item.title}</p>
        <p className="text-gray-500 text-sm truncate">
          {item.type === 'collection'
            ? `${item.kind === 'album' ? 'Album' : 'Playlist'} • ${item.trackCount} titre${(item.trackCount || 0) > 1 ? 's' : ''}`
            : item.artist}
        </p>
      </div>
    </button>
  );

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

      <div className="max-w-md mx-auto px-4 py-8">
        <div className="flex flex-col items-center text-center mb-8">
          <div
            className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 mb-4"
            style={{ backgroundColor: accentColor }}
          >
            {artist.avatar ? (
              <img src={artist.avatar} alt={artist.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-3xl font-bold">{artist.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white">{artist.name}</h1>
          <p className="text-gray-500 text-sm mt-1">{items.length} sortie{items.length > 1 ? 's' : ''} sur Onelib</p>
        </div>

        {currentItem && (
          <div className="mb-6">
            <ItemCard item={currentItem} featured />
          </div>
        )}

        {otherItems.length > 0 ? (
          <div className="space-y-3">
            {otherItems.map((item) => (
              <ItemCard key={item.slug} item={item} />
            ))}
          </div>
        ) : !currentItem ? (
          <p className="text-gray-500 text-sm text-center">Aucune sortie publiée pour le moment</p>
        ) : null}

        <p className="text-gray-600 text-xs mt-10 text-center">Propulsé par Studiolib</p>
      </div>
    </div>
  );
}
