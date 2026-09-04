'use client';

import { useEffect, useState } from 'react';
import { Search, MapPin, Star, Building2, Clock, Music, Users, ChevronRight, Headphones, SlidersHorizontal } from 'lucide-react';

interface PublicStudio {
  id: string;
  name: string;
  description: string | null;
  location: string;
  address: string | null;
  type: string;
  pricePerHour: number;
  rating: number;
  imageUrl: string | null;
  equipment: string | null;
  capacity: number | null;
  phone: string | null;
  photos: { id: string; url: string; caption: string | null }[];
  _count: { appointments: number; tracks: number };
}

interface PublicStudiosPageProps {
  onSelectStudio?: (studioId: string) => void;
}

export default function PublicStudiosPage({ onSelectStudio }: PublicStudiosPageProps) {
  const [studios, setStudios] = useState<PublicStudio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'professionnel' | 'home_studio'>('all');
  const [sortBy, setSortBy] = useState<'rating' | 'price' | 'name'>('rating');

  useEffect(() => {
    fetchStudios();
  }, []);

  const fetchStudios = async () => {
    try {
      const res = await fetch('/api/studios/public');
      const data = await res.json();
      setStudios(data.studios || []);
    } catch (error) {
      console.error('Error fetching studios:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStudios = studios
    .filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || s.type === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'price') return a.pricePerHour - b.pricePerHour;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="min-h-screen bg-[#121212]">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(245,158,11,0.05) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(99,102,241,0.04) 0%, transparent 50%)'
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#f59e0b] to-[#d97706] rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white">Studios</h1>
          </div>
          <p className="text-gray-400 text-lg">Trouvez le studio idéal pour vos sessions</p>
        </div>

        {/* Search & Filters */}
        <div className="mb-8">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un studio, une ville..."
                className="w-full bg-[#1a1a1a] text-white placeholder:text-gray-500 h-14 rounded-2xl pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#f59e0b] text-base border border-[#2a2a2a] focus:border-[#f59e0b]"
              />
            </div>
          </div>

          {/* Type Filters */}
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {[
                { value: 'all' as const, label: 'Tous' },
                { value: 'professionnel' as const, label: 'Professionnels' },
                { value: 'home_studio' as const, label: 'Home Studios' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterType(opt.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    filterType === opt.value
                      ? 'bg-[#f59e0b] text-white'
                      : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#2a2a2a]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'rating' | 'price' | 'name')}
              className="bg-[#1a1a1a] text-gray-400 border border-[#2a2a2a] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#f59e0b]"
            >
              <option value="rating">⭐ Mieux notés</option>
              <option value="price">💰 Prix croissant</option>
              <option value="name">🔤 Alphabétique</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <p className="text-gray-500 text-sm mb-4">{filteredStudios.length} studio{filteredStudios.length !== 1 ? 's' : ''} trouvé{filteredStudios.length !== 1 ? 's' : ''}</p>

        {/* Studio Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-[#1a1a1a] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredStudios.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Aucun studio trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredStudios.map((studio) => (
              <button
                key={studio.id}
                onClick={() => onSelectStudio?.(studio.id)}
                className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] hover:border-[#f59e0b]/50 transition-all overflow-hidden text-left group"
              >
                {/* Photo Header */}
                <div className="h-40 relative overflow-hidden">
                  {studio.imageUrl || (studio.photos && studio.photos.length > 0) ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                      style={{ backgroundImage: `url(${studio.imageUrl || studio.photos[0]?.url})` }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#f59e0b]/20 to-[#6366f1]/20 flex items-center justify-center">
                      <Building2 className="w-12 h-12 text-gray-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent" />
                  
                  {/* Type Badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      studio.type === 'professionnel' 
                        ? 'bg-[#6366f1] text-white' 
                        : 'bg-[#f59e0b] text-white'
                    }`}>
                      {studio.type === 'professionnel' ? 'PRO' : 'HOME'}
                    </span>
                  </div>

                  {/* Rating */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    <span className="text-white text-sm font-semibold">{studio.rating.toFixed(1)}</span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-5">
                  <h3 className="text-white font-bold text-lg mb-1">{studio.name}</h3>
                  <div className="flex items-center gap-1.5 text-gray-400 text-sm mb-3">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{studio.location}</span>
                  </div>

                  {studio.description && (
                    <p className="text-gray-500 text-sm line-clamp-2 mb-4">{studio.description}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Music className="w-3.5 h-3.5" />
                        {studio._count.tracks} tracks
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {studio._count.appointments} sessions
                      </span>
                    </div>
                    <div className="bg-[#f59e0b]/10 rounded-xl px-3 py-1.5">
                      <span className="text-[#f59e0b] font-bold">{studio.pricePerHour}€</span>
                      <span className="text-gray-500 text-xs">/h</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
