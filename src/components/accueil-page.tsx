'use client';

import { useEffect, useState, useRef } from 'react';
import { Search, Sparkles, MapPin, Star, Filter, List, X, SlidersHorizontal, Users, Clock, ChevronRight, Navigation } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import StudioDetail from './studio-detail';
import EmptyState from './ui/empty-state';

interface Studio {
  id: string;
  name: string;
  location: string;
  address?: string | null;
  type: string;
  pricePerHour: number;
  rating: number;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  equipment?: string | null;
}

interface Filters {
  priceMin: number;
  priceMax: number;
  type: string;
  availability: string;
  minRating: number;
}

export default function AccueilPage() {
  const [studios, setStudios] = useState<Studio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudioId, setSelectedStudioId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMapStudio, setSelectedMapStudio] = useState<Studio | null>(null);
  const [mapZoom, setMapZoom] = useState(1);
  const mapRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<Filters>({
    priceMin: 0,
    priceMax: 500,
    type: 'all',
    availability: 'all',
    minRating: 0
  });

  useEffect(() => {
    fetchStudios();
  }, []);

  const fetchStudios = async () => {
    try {
      const res = await fetch('/api/studios');
      const data = await res.json();
      setStudios(data.studios || []);
    } catch (error) {
      console.error('Error fetching studios:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStudios = studios.filter(studio => {
    // Search query filter
    const matchesSearch = 
      studio.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      studio.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Price filter
    const matchesPrice = 
      studio.pricePerHour >= filters.priceMin && 
      studio.pricePerHour <= filters.priceMax;
    
    // Type filter
    const matchesType = 
      filters.type === 'all' || 
      studio.type === filters.type;
    
    // Rating filter
    const matchesRating = studio.rating >= filters.minRating;
    
    return matchesSearch && matchesPrice && matchesType && matchesRating;
  });

  // Calculate map center based on studios with coordinates
  const studiosWithCoords = filteredStudios.filter(s => s.latitude && s.longitude);
  const mapCenter = studiosWithCoords.length > 0
    ? {
        lat: studiosWithCoords.reduce((sum, s) => sum + (s.latitude || 0), 0) / studiosWithCoords.length,
        lng: studiosWithCoords.reduce((sum, s) => sum + (s.longitude || 0), 0) / studiosWithCoords.length
      }
    : { lat: 48.8566, lng: 2.3522 }; // Paris default

  return (
    <div className="p-6 lg:p-8 pb-24 lg:pb-8">
      {/* Hero Section */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-4xl font-bold text-white mb-2">
          Trouvez votre studio
        </h1>
        <p className="text-gray-400 text-base lg:text-lg">
          et <span className="text-[#6366f1] font-medium">enregistrez</span> vos créations dès aujourd'hui
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un studio, une zone..."
              className="w-full bg-[#1a1a1a] text-white placeholder:text-gray-500 h-14 lg:h-16 rounded-2xl pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#6366f1] text-base lg:text-lg border border-[#2a2a2a] focus:border-[#6366f1]"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-5 h-14 lg:h-16 rounded-2xl transition-all font-medium ${
              showFilters 
                ? 'bg-[#6366f1] text-white shadow-lg shadow-[#6366f1]/30' 
                : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#2a2a2a] hover:border-[#6366f1]'
            }`}
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span className="hidden sm:inline">Filtres</span>
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 bg-[#1a1a1a] rounded-2xl p-5 border border-[#2a2a2a]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Price Range */}
              <div>
                <label className="text-gray-400 text-sm mb-3 block font-medium">Prix max (/h)</label>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="10"
                  value={filters.priceMax}
                  onChange={(e) => setFilters({...filters, priceMax: parseInt(e.target.value)})}
                  className="w-full accent-[#6366f1] h-2"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>0€</span>
                  <span className="text-[#6366f1] font-bold text-sm">{filters.priceMax}€</span>
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="text-gray-400 text-sm mb-3 block font-medium">Type de studio</label>
                <div className="flex gap-2">
                  {[
                    { value: 'all', label: 'Tous' },
                    { value: 'professionnel', label: 'Pro' },
                    { value: 'home_studio', label: 'Home' }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFilters({...filters, type: opt.value})}
                      className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                        filters.type === opt.value
                          ? 'bg-[#6366f1] text-white'
                          : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Min Rating */}
              <div>
                <label className="text-gray-400 text-sm mb-3 block font-medium">Note minimum</label>
                <div className="flex gap-2">
                  {[
                    { value: 0, label: 'Toutes' },
                    { value: 4, label: '4+' },
                    { value: 4.5, label: '4.5+' }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFilters({...filters, minRating: opt.value})}
                      className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1 ${
                        filters.minRating === opt.value
                          ? 'bg-[#6366f1] text-white'
                          : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
                      }`}
                    >
                      {opt.value > 0 && <Star className="w-3 h-3 fill-current" />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Availability */}
              <div>
                <label className="text-gray-400 text-sm mb-3 block font-medium">Disponibilité</label>
                <select
                  value={filters.availability}
                  onChange={(e) => setFilters({...filters, availability: e.target.value})}
                  className="w-full bg-[#2a2a2a] text-white rounded-xl p-3 border border-[#3a3a3a] focus:outline-none focus:border-[#6366f1]"
                >
                  <option value="all">Toutes</option>
                  <option value="today">Aujourd'hui</option>
                  <option value="week">Cette semaine</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center mt-6 pt-4 border-t border-[#2a2a2a]">
              <p className="text-gray-500 text-sm">
                {filteredStudios.length} studio{filteredStudios.length !== 1 ? 's' : ''} trouvé{filteredStudios.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={() => setFilters({
                  priceMin: 0,
                  priceMax: 500,
                  type: 'all',
                  availability: 'all',
                  minRating: 0
                })}
                className="text-[#6366f1] text-sm font-medium hover:underline"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-400 text-sm">
          <span className="text-white font-medium">{filteredStudios.length}</span> studio{filteredStudios.length !== 1 ? 's' : ''} disponible{filteredStudios.length !== 1 ? 's' : ''}
        </p>
        <div className="flex bg-[#1a1a1a] rounded-xl p-1 border border-[#2a2a2a]">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'list' 
                ? 'bg-[#6366f1] text-white shadow-lg' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <List className="w-4 h-4" />
            Liste
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'map' 
                ? 'bg-[#6366f1] text-white shadow-lg' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Carte
          </button>
        </div>
      </div>

      {/* Pro Banner */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#8b5cf6] rounded-2xl p-6 lg:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-white" />
              <span className="text-white/80 text-sm font-medium">Devenez l'ingénieur</span>
            </div>
            <p className="text-white text-lg lg:text-xl font-semibold">
              Un logiciel tout-en-un pour optimiser votre travail
            </p>
          </div>
        </div>
      </div>

      {/* Studios List or Map */}
      {viewMode === 'list' ? (
        <div>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-[#1a1a1a] rounded-2xl p-5 animate-pulse">
                  <div className="h-5 bg-[#2a2a2a] rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-[#2a2a2a] rounded w-1/2 mb-5"></div>
                  <div className="h-16 bg-[#2a2a2a] rounded-xl"></div>
                </div>
              ))}
            </div>
          ) : filteredStudios.length === 0 ? (
            <div className="bg-[#1a1a1a] rounded-2xl">
              <EmptyState
                icon={Search}
                title="Aucun studio trouvé"
                description="Essayez de modifier vos filtres"
                size="lg"
                action={searchQuery ? { label: 'Effacer la recherche', onClick: () => setSearchQuery('') } : undefined}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudios.map((studio) => (
                <button
                  key={studio.id}
                  onClick={() => setSelectedStudioId(studio.id)}
                  className="bg-[#1a1a1a] rounded-2xl p-5 hover:bg-[#222] transition-all cursor-pointer border-2 border-[#2a2a2a] hover:border-[#6366f1] text-left w-full group"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold text-lg group-hover:text-[#6366f1] transition-colors truncate">
                          {studio.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500 text-sm">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{studio.location}</span>
                      </div>
                    </div>
                    <span className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium ${
                      studio.type === 'professionnel' 
                        ? 'bg-[#6366f1]/20 text-[#6366f1]' 
                        : 'bg-[#f59e0b]/20 text-[#f59e0b]'
                    }`}>
                      {studio.type === 'professionnel' ? 'Pro' : 'Home'}
                    </span>
                  </div>
                  
                  {/* Description */}
                  {studio.description && (
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2 min-h-[40px]">{studio.description}</p>
                  )}
                  
                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-[#2a2a2a]">
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-lg">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-white font-semibold text-sm">{studio.rating.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-[#6366f1] transition-colors" />
                    </div>
                  </div>
                  
                  {/* Price Tag */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="bg-[#6366f1]/10 rounded-xl px-4 py-2">
                      <p className="text-[#6366f1] font-bold text-xl">{studio.pricePerHour * 2}€</p>
                      <p className="text-gray-500 text-xs">/ 2 heures</p>
                    </div>
                    {studio.type === 'professionnel' && (
                      <div className="text-right">
                        <p className="text-gray-500 text-xs">À partir de</p>
                        <p className="text-white font-medium">{studio.pricePerHour}€/h</p>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Map View */
        <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-[#2a2a2a]">
          <div className="flex flex-col lg:flex-row h-[600px]">
            {/* Map Container */}
            <div ref={mapRef} className="flex-1 relative bg-[#2a2a2a]">
              {/* Custom Map Visualization */}
              <div className="absolute inset-0">
                {/* Map Background Pattern */}
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: `
                    linear-gradient(rgba(99,102,241,0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(99,102,241,0.1) 1px, transparent 1px)
                  `,
                  backgroundSize: '40px 40px'
                }} />
                
                {/* Center Point */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="relative">
                    <div className="w-32 h-32 bg-[#6366f1]/10 rounded-full animate-ping" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-[#6366f1] rounded-full shadow-lg shadow-[#6366f1]/50" />
                  </div>
                </div>
                
                {/* Studio Markers */}
                {studiosWithCoords.map((studio, index) => {
                  // Position markers in a relative grid
                  const offsetX = ((studio.longitude || 0) - mapCenter.lng) * 5000 * mapZoom;
                  const offsetY = ((studio.latitude || 0) - mapCenter.lat) * -5000 * mapZoom;
                  
                  return (
                    <button
                      key={studio.id}
                      onClick={() => setSelectedMapStudio(studio)}
                      className={`absolute top-1/2 left-1/2 transform transition-all hover:scale-110 ${
                        selectedMapStudio?.id === studio.id ? 'scale-125 z-20' : 'z-10'
                      }`}
                      style={{
                        transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`
                      }}
                    >
                      <div className={`relative flex flex-col items-center ${
                        selectedMapStudio?.id === studio.id ? '' : ''
                      }`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${
                          selectedMapStudio?.id === studio.id
                            ? 'bg-[#6366f1] shadow-[#6366f1]/50 scale-110'
                            : 'bg-[#6366f1]/80 hover:bg-[#6366f1]'
                        }`}>
                          <MapPin className="w-6 h-6 text-white" />
                        </div>
                        <div className={`mt-1 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                          selectedMapStudio?.id === studio.id
                            ? 'bg-[#6366f1] text-white'
                            : 'bg-[#1a1a1a]/90 text-white'
                        }`}>
                          {studio.pricePerHour * 2}€/2h
                        </div>
                      </div>
                    </button>
                  );
                })}
                
                {/* No coordinates fallback */}
                {studiosWithCoords.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Navigation className="w-12 h-12 text-[#6366f1] mx-auto mb-4" />
                      <p className="text-gray-400 font-medium">Carte interactive</p>
                      <p className="text-gray-500 text-sm mt-1">
                        Les studios apparaîtront ici avec leurs coordonnées
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Map Controls */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button
                  onClick={() => setMapZoom((z) => Math.min(3, +(z + 0.5).toFixed(2)))}
                  disabled={mapZoom >= 3}
                  className="w-10 h-10 bg-[#1a1a1a]/90 backdrop-blur rounded-lg flex items-center justify-center text-white hover:bg-[#2a2a2a] transition-colors shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="text-xl font-bold">+</span>
                </button>
                <button
                  onClick={() => setMapZoom((z) => Math.max(0.5, +(z - 0.5).toFixed(2)))}
                  disabled={mapZoom <= 0.5}
                  className="w-10 h-10 bg-[#1a1a1a]/90 backdrop-blur rounded-lg flex items-center justify-center text-white hover:bg-[#2a2a2a] transition-colors shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="text-xl font-bold">−</span>
                </button>
              </div>
              
              {/* Legend */}
              <div className="absolute bottom-4 left-4 bg-[#1a1a1a]/90 backdrop-blur rounded-xl p-3 shadow-lg">
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-[#6366f1] rounded-full" />
                    <span className="text-gray-400">Studio Pro</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-[#f59e0b] rounded-full" />
                    <span className="text-gray-400">Home Studio</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Side Panel - Studio List */}
            <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-[#2a2a2a] flex flex-col">
              <div className="p-4 border-b border-[#2a2a2a]">
                <p className="text-white font-medium">
                  {filteredStudios.length} studio{filteredStudios.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {filteredStudios.map((studio) => (
                  <button
                    key={studio.id}
                    onClick={() => {
                      setSelectedMapStudio(studio);
                      setSelectedStudioId(studio.id);
                    }}
                    className={`w-full text-left p-4 rounded-xl transition-all ${
                      selectedMapStudio?.id === studio.id
                        ? 'bg-[#6366f1]/20 border-2 border-[#6366f1]'
                        : 'bg-[#2a2a2a] border-2 border-transparent hover:border-[#3a3a3a]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        studio.type === 'professionnel' ? 'bg-[#6366f1]' : 'bg-[#f59e0b]'
                      }`}>
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{studio.name}</p>
                        <p className="text-gray-500 text-sm truncate">{studio.location}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                            <span className="text-white text-sm">{studio.rating.toFixed(1)}</span>
                          </div>
                          <span className="text-[#6366f1] font-semibold">{studio.pricePerHour * 2}€/2h</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Studio Detail Modal */}
      {selectedStudioId && (
        <StudioDetail 
          studioId={selectedStudioId} 
          onClose={() => {
            setSelectedStudioId(null);
            setSelectedMapStudio(null);
          }} 
        />
      )}
    </div>
  );
}
