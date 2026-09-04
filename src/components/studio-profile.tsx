'use client';

import { useEffect, useState } from 'react';
import { MapPin, Star, Clock, Phone, Globe, Instagram, Twitter, Facebook, Youtube, Music, ExternalLink, Calendar, Plus, X, ChevronLeft, ChevronRight, Edit2, Save, Link as LinkIcon } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface Studio {
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
  website: string | null;
  instagram: string | null;
  twitter: string | null;
  facebook: string | null;
  youtube: string | null;
  spotify: string | null;
  soundcloud: string | null;
}

interface Photo {
  id: string;
  url: string;
  caption: string | null;
  order: number;
}

interface StudioLink {
  id: string;
  title: string;
  url: string;
  icon: string | null;
  order: number;
}

interface StudioProfileProps {
  studioId: string;
  isOwner?: boolean;
  onBook?: () => void;
}

export default function StudioProfile({ studioId, isOwner = false, onBook }: StudioProfileProps) {
  const [studio, setStudio] = useState<Studio | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [links, setLinks] = useState<StudioLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Studio>>({});
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLink, setNewLink] = useState({ title: '', url: '', icon: 'link' });

  useEffect(() => {
    fetchStudioData();
  }, [studioId]);

  const fetchStudioData = async () => {
    try {
      const res = await fetch(`/api/studios/${studioId}`);
      const data = await res.json();
      
      if (data.studio) {
        setStudio(data.studio);
        setEditForm(data.studio);
      }
      if (data.photos) setPhotos(data.photos);
      if (data.links) setLinks(data.links);
    } catch (error) {
      console.error('Error fetching studio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveStudio = async () => {
    try {
      const res = await fetch(`/api/studios/${studioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      
      if (res.ok) {
        setStudio({ ...studio!, ...editForm } as Studio);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error saving studio:', error);
    }
  };

  const addLink = async () => {
    if (!newLink.title || !newLink.url) return;
    
    try {
      const res = await fetch(`/api/studios/${studioId}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLink)
      });
      
      if (res.ok) {
        const data = await res.json();
        setLinks([...links, data.link]);
        setShowAddLink(false);
        setNewLink({ title: '', url: '', icon: 'link' });
      }
    } catch (error) {
      console.error('Error adding link:', error);
    }
  };

  const deleteLink = async (linkId: string) => {
    try {
      await fetch(`/api/studios/${studioId}/links?id=${linkId}`, {
        method: 'DELETE'
      });
      setLinks(links.filter(l => l.id !== linkId));
    } catch (error) {
      console.error('Error deleting link:', error);
    }
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentPhotoIndex(prev => (prev === 0 ? photos.length - 1 : prev - 1));
    } else {
      setCurrentPhotoIndex(prev => (prev === photos.length - 1 ? 0 : prev + 1));
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-64 bg-[#1a1a1a] rounded-xl" />
        <div className="h-32 bg-[#1a1a1a] rounded-xl" />
      </div>
    );
  }

  if (!studio) return null;

  return (
    <div className="space-y-6">
      {/* Hero Section with Photos */}
      <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden bg-[#1a1a1a]">
        {photos.length > 0 ? (
          <>
            <img
              src={photos[currentPhotoIndex]?.url || '/background-studio.jpg'}
              alt={studio.name}
              className="w-full h-full object-cover"
            />
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => navigatePhoto('prev')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => navigatePhoto('next')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPhotoIndex(i)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i === currentPhotoIndex ? 'bg-white w-6' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#6366f1] to-[#8b5cf6]">
            <span className="text-6xl font-bold text-white/50">{studio.name.charAt(0)}</span>
          </div>
        )}
        
        {/* Overlay Info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">{studio.name}</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-white/80">
                  <MapPin className="w-4 h-4" />
                  {studio.location}
                </span>
                <span className="flex items-center gap-1 text-yellow-400">
                  <Star className="w-4 h-4 fill-yellow-400" />
                  {studio.rating.toFixed(1)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{studio.pricePerHour}€<span className="text-sm font-normal">/h</span></p>
              <span className="text-xs text-white/60 px-2 py-1 bg-white/20 rounded-full">{studio.type}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {onBook && (
          <button
            onClick={onBook}
            className="flex items-center gap-2 bg-[#6366f1] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#5558e3] transition-colors whitespace-nowrap"
          >
            <Calendar className="w-5 h-5" />
            Réserver
          </button>
        )}
        {studio.phone && (
          <a
            href={`tel:${studio.phone}`}
            className="flex items-center gap-2 bg-[#2a2a2a] text-white px-4 py-3 rounded-xl hover:bg-[#3a3a3a] transition-colors whitespace-nowrap"
          >
            <Phone className="w-5 h-5" />
            Appeler
          </a>
        )}
        {isOwner && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-2 bg-[#f59e0b] text-white px-4 py-3 rounded-xl hover:bg-[#e8950a] transition-colors whitespace-nowrap"
          >
            {isEditing ? <Save className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
            {isEditing ? 'Sauvegarder' : 'Modifier'}
          </button>
        )}
      </div>

      {/* Description */}
      <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a]">
        <h2 className="text-lg font-semibold text-white mb-3">À propos</h2>
        {isEditing ? (
          <textarea
            value={editForm.description || ''}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            className="w-full bg-[#2a2a2a] text-white rounded-xl p-4 border border-[#3a3a3a] min-h-[100px]"
            placeholder="Décrivez votre studio..."
          />
        ) : (
          <p className="text-gray-400">{studio.description || 'Aucune description disponible.'}</p>
        )}
        
        {studio.capacity && (
          <p className="text-gray-500 text-sm mt-3">
            Capacité : {studio.capacity} personnes
          </p>
        )}
      </div>

      {/* Equipment */}
      {studio.equipment && !isEditing && (
        <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a]">
          <h2 className="text-lg font-semibold text-white mb-3">Équipement</h2>
          <div className="flex flex-wrap gap-2">
            {studio.equipment.split(',').map((eq, i) => (
              <span key={i} className="bg-[#2a2a2a] text-gray-300 px-3 py-1.5 rounded-lg text-sm">
                {eq.trim()}
              </span>
            ))}
          </div>
        </div>
      )}

      {isEditing && (
        <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a]">
          <h2 className="text-lg font-semibold text-white mb-3">Équipement</h2>
          <input
            value={editForm.equipment || ''}
            onChange={(e) => setEditForm({ ...editForm, equipment: e.target.value })}
            className="w-full bg-[#2a2a2a] text-white rounded-xl p-4 border border-[#3a3a3a]"
            placeholder="Micro, Interface, DAW... (séparés par des virgules)"
          />
        </div>
      )}

      {/* Social Links */}
      <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a]">
        <h2 className="text-lg font-semibold text-white mb-4">Contact & Réseaux</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {studio.website && (
            <a href={studio.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#2a2a2a] p-3 rounded-xl hover:bg-[#3a3a3a] transition-colors">
              <Globe className="w-5 h-5 text-[#6366f1]" />
              <span className="text-white text-sm">Site web</span>
            </a>
          )}
          {studio.instagram && (
            <a href={`https://instagram.com/${studio.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#2a2a2a] p-3 rounded-xl hover:bg-[#3a3a3a] transition-colors">
              <Instagram className="w-5 h-5 text-pink-500" />
              <span className="text-white text-sm">{studio.instagram}</span>
            </a>
          )}
          {studio.twitter && (
            <a href={`https://twitter.com/${studio.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#2a2a2a] p-3 rounded-xl hover:bg-[#3a3a3a] transition-colors">
              <Twitter className="w-5 h-5 text-blue-400" />
              <span className="text-white text-sm">{studio.twitter}</span>
            </a>
          )}
          {studio.youtube && (
            <a href={studio.youtube} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#2a2a2a] p-3 rounded-xl hover:bg-[#3a3a3a] transition-colors">
              <Youtube className="w-5 h-5 text-red-500" />
              <span className="text-white text-sm">YouTube</span>
            </a>
          )}
          {studio.spotify && (
            <a href={studio.spotify} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#2a2a2a] p-3 rounded-xl hover:bg-[#3a3a3a] transition-colors">
              <Music className="w-5 h-5 text-green-500" />
              <span className="text-white text-sm">Spotify</span>
            </a>
          )}
          {studio.facebook && (
            <a href={studio.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#2a2a2a] p-3 rounded-xl hover:bg-[#3a3a3a] transition-colors">
              <Facebook className="w-5 h-5 text-blue-600" />
              <span className="text-white text-sm">Facebook</span>
            </a>
          )}
          {studio.phone && (
            <a href={`tel:${studio.phone}`} className="flex items-center gap-2 bg-[#2a2a2a] p-3 rounded-xl hover:bg-[#3a3a3a] transition-colors">
              <Phone className="w-5 h-5 text-green-400" />
              <span className="text-white text-sm">{studio.phone}</span>
            </a>
          )}
        </div>

        {/* Custom Links (Linktree style) */}
        {links.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="text-gray-400 text-sm">Liens</h3>
            {links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between bg-[#2a2a2a] p-4 rounded-xl hover:bg-[#3a3a3a] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <LinkIcon className="w-5 h-5 text-[#6366f1]" />
                  <span className="text-white">{link.title}</span>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
              </a>
            ))}
          </div>
        )}

        {/* Add Link Button for Owner */}
        {isOwner && (
          <button
            onClick={() => setShowAddLink(true)}
            className="mt-4 flex items-center gap-2 text-[#6366f1] hover:text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ajouter un lien
          </button>
        )}
      </div>

      {/* Add Link Modal */}
      {showAddLink && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Ajouter un lien</h3>
              <button onClick={() => setShowAddLink(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <input
                type="text"
                value={newLink.title}
                onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                placeholder="Titre du lien"
                className="w-full bg-[#2a2a2a] text-white rounded-xl p-3 border border-[#3a3a3a]"
              />
              <input
                type="url"
                value={newLink.url}
                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                placeholder="https://..."
                className="w-full bg-[#2a2a2a] text-white rounded-xl p-3 border border-[#3a3a3a]"
              />
              <button
                onClick={addLink}
                className="w-full bg-[#6366f1] text-white py-3 rounded-xl font-medium hover:bg-[#5558e3] transition-colors"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Button for Edit Mode */}
      {isEditing && (
        <button
          onClick={saveStudio}
          className="w-full bg-[#f59e0b] text-white py-4 rounded-xl font-medium hover:bg-[#e8950a] transition-colors flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5" />
          Sauvegarder les modifications
        </button>
      )}
    </div>
  );
}
