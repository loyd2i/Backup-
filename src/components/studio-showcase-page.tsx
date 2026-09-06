'use client';

import { useEffect, useState, useRef } from 'react';
import {
  MapPin, Star, Clock, Phone, Globe, Instagram, Twitter, Facebook, Youtube, Music, Headphones,
  Camera, Calendar, ChevronLeft, ChevronRight, X, Plus, GripVertical, Pencil, ExternalLink,
  Share2, Heart, Play, Pause
} from 'lucide-react';
import { SUPPORTED_COUNTRIES } from '@/lib/tax-config';

interface StudioPhoto {
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
  isActive: boolean;
}

interface Track {
  id: string;
  title: string;
  artist: string;
  audioUrl: string | null;
  coverUrl: string | null;
  bpm: number | null;
  key: string | null;
  duration: number | null;
  views: number;
}

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
  country: string;
  photos: StudioPhoto[];
  links: StudioLink[];
}

interface StudioShowcasePageProps {
  studioId: string;
  isOwner?: boolean;
  onBook?: () => void;
}

export default function StudioShowcasePage({ studioId, isOwner = false, onBook }: StudioShowcasePageProps) {
  const [studio, setStudio] = useState<Studio | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchStudioData();
  }, [studioId]);

  const fetchStudioData = async () => {
    try {
      const [studioRes, tracksRes] = await Promise.all([
        fetch(`/api/studios/${studioId}`),
        fetch(`/api/tracks?studioId=${studioId}`)
      ]);

      const studioData = await studioRes.json();
      const tracksData = await tracksRes.json();

      setStudio(studioData.studio || studioData);
      setTracks(tracksData.tracks || []);
    } catch (error) {
      console.error('Error fetching studio data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openPhotoModal = (index: number) => {
    setActivePhotoIndex(index);
    setShowPhotoModal(true);
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    if (!studio?.photos) return;
    const total = studio.photos.length + 1; // +1 for main image
    if (direction === 'prev') {
      setActivePhotoIndex((prev) => (prev - 1 + total) % total);
    } else {
      setActivePhotoIndex((prev) => (prev + 1) % total);
    }
  };

  const togglePlayTrack = (trackId: string, audioUrl: string | null) => {
    if (!audioUrl) return;

    if (playingTrack === trackId) {
      setPlayingTrack(null);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    } else {
      setPlayingTrack(trackId);
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      }
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSocialIcon = (platform: string) => {
    const icons: { [key: string]: typeof Instagram } = {
      instagram: Instagram,
      twitter: Twitter,
      facebook: Facebook,
      youtube: Youtube,
      spotify: Music,
      soundcloud: Headphones,
    };
    return icons[platform.toLowerCase()] || Globe;
  };

  const getLinkIcon = (iconName: string | null) => {
    if (!iconName) return ExternalLink;
    const icons: { [key: string]: typeof Globe } = {
      globe: Globe,
      instagram: Instagram,
      twitter: Twitter,
      facebook: Facebook,
      youtube: Youtube,
      music: Music,
      headphones: Headphones,
    };
    return icons[iconName.toLowerCase()] || ExternalLink;
  };

  const handleShare = async () => {
    if (!studio) return;
    const url = `${window.location.origin}/studio/${studio.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: studio.name, url });
      } catch {
        // Partage annulé par l'utilisateur, rien à faire
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert('Lien copié dans le presse-papiers');
      } catch {
        alert(url);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#121212] p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="h-64 bg-[#1a1a1a] rounded-2xl animate-pulse" />
          <div className="h-32 bg-[#1a1a1a] rounded-2xl animate-pulse" />
          <div className="h-48 bg-[#1a1a1a] rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!studio) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <p className="text-gray-400">Studio non trouvé</p>
      </div>
    );
  }

  const allPhotos = [
    { id: 'main', url: studio.imageUrl, caption: studio.name, order: -1 },
    ...(studio.photos || []).sort((a, b) => a.order - b.order)
  ];

  return (
    <div className="min-h-screen bg-[#121212]">
      <audio ref={audioRef} onEnded={() => setPlayingTrack(null)} />

      {/* Hero Section with Photo Gallery */}
      <div className="relative">
        {/* Main Photo */}
        <div
          className="h-72 md:h-96 relative overflow-hidden cursor-pointer group"
          onClick={() => openPhotoModal(0)}
        >
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
            style={{ backgroundImage: `url(${studio.imageUrl || '/background-studio.jpg'})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent" />

          {/* Photo count badge */}
          {allPhotos.length > 1 && (
            <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2">
              <Camera className="w-4 h-4 text-white" />
              <span className="text-white text-sm">{allPhotos.length} photos</span>
            </div>
          )}

          {/* Owner edit button */}
          {isOwner && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowEditModal(true); }}
              className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm p-2 rounded-full hover:bg-black/80 transition-colors"
            >
              <Pencil className="w-4 h-4 text-white" />
            </button>
          )}
        </div>

        {/* Photo thumbnails */}
        {allPhotos.length > 1 && (
          <div className="absolute bottom-4 left-4 right-16 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {allPhotos.slice(0, 5).map((photo, index) => (
              <button
                key={photo.id}
                onClick={() => openPhotoModal(index)}
                className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                  index === 0 ? 'border-[#6366f1]' : 'border-transparent'
                }`}
              >
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${photo.url || '/background-studio.jpg'})` }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Studio Info Header */}
      <div className="px-6 -mt-12 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Logo/Avatar */}
          <div className="w-24 h-24 bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] rounded-2xl flex items-center justify-center mb-4 shadow-xl border-4 border-[#121212]">
            <span className="text-3xl font-bold text-white">{studio.name.charAt(0)}</span>
          </div>

          {/* Name & Type */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{studio.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-gray-400 text-sm">{studio.type === 'professionnel' ? 'Studio Professionnel' : 'Home Studio'}</span>
                <span className="flex items-center gap-1 text-yellow-400 text-sm">
                  <Star className="w-4 h-4 fill-yellow-400" />
                  {studio.rating.toFixed(1)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-[#6366f1]">{studio.pricePerHour}€</p>
              <p className="text-gray-400 text-sm">/heure</p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 mt-3 text-gray-400">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">{studio.location}</span>
            {studio.address && <span className="text-gray-500 text-sm">• {studio.address}</span>}
          </div>

          {/* Description */}
          {studio.description && (
            <p className="text-gray-300 mt-4 leading-relaxed">{studio.description}</p>
          )}

          {/* Quick Actions */}
          <div className="flex gap-3 mt-6">
            {!isOwner && (
              <>
                <button
                  onClick={onBook}
                  className="flex-1 bg-[#6366f1] text-white py-3 px-6 rounded-xl font-semibold hover:bg-[#5558e3] transition-colors flex items-center justify-center gap-2"
                >
                  <Calendar className="w-5 h-5" />
                  Réserver
                </button>
                <button
                  disabled
                  title="Bientôt disponible"
                  className="bg-[#1a1a1a] text-gray-600 py-3 px-4 rounded-xl cursor-not-allowed"
                >
                  <Heart className="w-5 h-5" />
                </button>
              </>
            )}
            <button
              onClick={handleShare}
              className="bg-[#1a1a1a] text-white py-3 px-4 rounded-xl hover:bg-[#2a2a2a] transition-colors"
              title={isOwner ? 'Partager ma fiche' : 'Partager'}
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="px-6 py-8 max-w-4xl mx-auto space-y-8">

        {/* Equipment Section */}
        {studio.equipment && (
          <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a]">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Headphones className="w-5 h-5 text-[#6366f1]" />
              Équipement
            </h2>
            <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
              {studio.equipment}
            </div>
          </div>
        )}

        {/* Links Section (Linktree style) */}
        {(studio.links && studio.links.length > 0) && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-[#6366f1]" />
              Liens
            </h2>
            <div className="space-y-2">
              {studio.links
                .filter(link => link.isActive)
                .sort((a, b) => a.order - b.order)
                .map(link => {
                  const IconComponent = getLinkIcon(link.icon);
                  return (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 hover:border-[#6366f1] hover:bg-[#6366f1]/10 transition-all group"
                    >
                      {isOwner && (
                        <GripVertical className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
                      )}
                      <div className="w-10 h-10 bg-[#2a2a2a] rounded-lg flex items-center justify-center">
                        <IconComponent className="w-5 h-5 text-[#6366f1]" />
                      </div>
                      <span className="text-white font-medium flex-1">{link.title}</span>
                      <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                    </a>
                  );
                })}
            </div>
          </div>
        )}

        {/* Social Links */}
        <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a]">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#6366f1]" />
            Réseaux sociaux
          </h2>
          <div className="flex flex-wrap gap-3">
            {studio.website && (
              <a href={studio.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#2a2a2a] px-4 py-2 rounded-lg hover:bg-[#3a3a3a] transition-colors">
                <Globe className="w-4 h-4 text-white" />
                <span className="text-white text-sm">Site web</span>
              </a>
            )}
            {studio.instagram && (
              <a href={`https://instagram.com/${studio.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                <Instagram className="w-4 h-4 text-white" />
                <span className="text-white text-sm">{studio.instagram}</span>
              </a>
            )}
            {studio.twitter && (
              <a href={`https://twitter.com/${studio.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#1DA1F2] px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                <Twitter className="w-4 h-4 text-white" />
                <span className="text-white text-sm">{studio.twitter}</span>
              </a>
            )}
            {studio.facebook && (
              <a href={studio.facebook} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#1877F2] px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                <Facebook className="w-4 h-4 text-white" />
                <span className="text-white text-sm">Facebook</span>
              </a>
            )}
            {studio.youtube && (
              <a href={studio.youtube} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#FF0000] px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                <Youtube className="w-4 h-4 text-white" />
                <span className="text-white text-sm">YouTube</span>
              </a>
            )}
            {studio.spotify && (
              <a href={studio.spotify} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#1DB954] px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                <Music className="w-4 h-4 text-white" />
                <span className="text-white text-sm">Spotify</span>
              </a>
            )}
            {studio.soundcloud && (
              <a href={studio.soundcloud} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#FF5500] px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                <Headphones className="w-4 h-4 text-white" />
                <span className="text-white text-sm">SoundCloud</span>
              </a>
            )}
            {studio.phone && (
              <a href={`tel:${studio.phone}`}
                className="flex items-center gap-2 bg-[#2a2a2a] px-4 py-2 rounded-lg hover:bg-[#3a3a3a] transition-colors">
                <Phone className="w-4 h-4 text-white" />
                <span className="text-white text-sm">{studio.phone}</span>
              </a>
            )}
          </div>
        </div>

        {/* Portfolio / Recent Tracks */}
        {tracks.length > 0 && (
          <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a]">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Music className="w-5 h-5 text-[#6366f1]" />
              Portfolio
            </h2>
            <div className="space-y-3">
              {tracks.slice(0, 6).map(track => (
                <div
                  key={track.id}
                  className="flex items-center gap-4 bg-[#121212] rounded-xl p-3 hover:bg-[#1e1e1e] transition-colors"
                >
                  {/* Play button */}
                  <button
                    onClick={() => togglePlayTrack(track.id, track.audioUrl)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      playingTrack === track.id
                        ? 'bg-[#6366f1] text-white'
                        : 'bg-[#2a2a2a] text-white hover:bg-[#6366f1]'
                    } transition-colors`}
                  >
                    {playingTrack === track.id ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4 ml-0.5" />
                    )}
                  </button>

                  {/* Track info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{track.title}</p>
                    <p className="text-gray-400 text-sm truncate">{track.artist}</p>
                  </div>

                  {/* BPM & Key */}
                  <div className="hidden sm:flex items-center gap-3 text-xs">
                    {track.bpm && (
                      <span className="bg-[#2a2a2a] px-2 py-1 rounded text-gray-400">{track.bpm} BPM</span>
                    )}
                    {track.key && (
                      <span className="bg-[#2a2a2a] px-2 py-1 rounded text-gray-400">{track.key}</span>
                    )}
                  </div>

                  {/* Duration */}
                  <span className="text-gray-500 text-sm">{formatDuration(track.duration)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Capacity & Info */}
        <div className="grid grid-cols-2 gap-4">
          {studio.capacity && (
            <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] text-center">
              <p className="text-2xl font-bold text-white">{studio.capacity}</p>
              <p className="text-gray-400 text-sm">Personnes max</p>
            </div>
          )}
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] text-center">
            <p className="text-2xl font-bold text-white">{studio.pricePerHour}€</p>
            <p className="text-gray-400 text-sm">Par heure</p>
          </div>
        </div>
      </div>

      {/* Photo Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
          <button
            onClick={() => setShowPhotoModal(false)}
            className="absolute top-4 right-4 p-2 bg-[#1a1a1a] rounded-full text-white hover:bg-[#2a2a2a] transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>

          <button
            onClick={() => navigatePhoto('prev')}
            className="absolute left-4 p-2 bg-[#1a1a1a] rounded-full text-white hover:bg-[#2a2a2a] transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="max-w-4xl max-h-[80vh] px-12">
            <img
              src={allPhotos[activePhotoIndex]?.url || '/background-studio.jpg'}
              alt={allPhotos[activePhotoIndex]?.caption || studio.name}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            {allPhotos[activePhotoIndex]?.caption && (
              <p className="text-white text-center mt-4">{allPhotos[activePhotoIndex].caption}</p>
            )}
          </div>

          <button
            onClick={() => navigatePhoto('next')}
            className="absolute right-4 p-2 bg-[#1a1a1a] rounded-full text-white hover:bg-[#2a2a2a] transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Photo indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {allPhotos.map((_, index) => (
              <button
                key={index}
                onClick={() => setActivePhotoIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === activePhotoIndex ? 'bg-white w-6' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Edit Modal for Owner */}
      {showEditModal && isOwner && (
        <StudioEditModal
          studio={studio}
          onClose={() => setShowEditModal(false)}
          onSave={fetchStudioData}
        />
      )}
    </div>
  );
}

// Edit Modal Component for Studio Owners
function StudioEditModal({
  studio,
  onClose,
  onSave
}: {
  studio: Studio;
  onClose: () => void;
  onSave: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'info' | 'photos' | 'links' | 'social'>('info');
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: studio.name,
    description: studio.description || '',
    equipment: studio.equipment || '',
    phone: studio.phone || '',
    country: studio.country || 'FR',
    website: studio.website || '',
    instagram: studio.instagram || '',
    twitter: studio.twitter || '',
    facebook: studio.facebook || '',
    youtube: studio.youtube || '',
    spotify: studio.spotify || '',
    soundcloud: studio.soundcloud || '',
  });
  const [links, setLinks] = useState<StudioLink[]>(studio.links || []);
  const [newLink, setNewLink] = useState({ title: '', url: '', icon: '' });
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('type', 'profile');
      const res = await fetch(`/api/studios/${studio.id}/upload`, {
        method: 'POST',
        body: uploadData,
      });
      if (res.ok) {
        onSave();
      } else {
        const data = await res.json().catch(() => ({}));
        console.error('Erreur upload photo:', data.error);
      }
    } catch (error) {
      console.error('Erreur upload photo:', error);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveInfo = async () => {
    setIsSaving(true);
    try {
      await fetch(`/api/studios/${studio.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      onSave();
    } catch (error) {
      console.error('Error saving studio:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const addLink = async () => {
    if (!newLink.title || !newLink.url) return;
    try {
      const res = await fetch(`/api/studios/${studio.id}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newLink,
          order: links.length
        })
      });
      const data = await res.json();
      setLinks(prev => [...prev, data.link]);
      setNewLink({ title: '', url: '', icon: '' });
    } catch (error) {
      console.error('Error adding link:', error);
    }
  };

  const deleteLink = async (linkId: string) => {
    try {
      await fetch(`/api/studios/${studio.id}/links?id=${linkId}`, { method: 'DELETE' });
      setLinks(prev => prev.filter(l => l.id !== linkId));
    } catch (error) {
      console.error('Error deleting link:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
          <h2 className="text-xl font-bold text-white">Modifier la vitrine</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#2a2a2a]">
          {[
            { key: 'info', label: 'Infos' },
            { key: 'photos', label: 'Photos' },
            { key: 'links', label: 'Liens' },
            { key: 'social', label: 'Réseaux' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-[#6366f1] border-b-2 border-[#6366f1]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Nom du studio</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a]"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a] min-h-[100px]"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Équipement</label>
                <textarea
                  value={formData.equipment}
                  onChange={(e) => setFormData(prev => ({ ...prev, equipment: e.target.value }))}
                  className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a] min-h-[100px]"
                  placeholder="Listez votre matériel..."
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Téléphone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a]"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Pays</label>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a]"
                >
                  {SUPPORTED_COUNTRIES.map(c => (
                    <option key={c.country} value={c.country}>{c.countryName}</option>
                  ))}
                </select>
                <p className="text-gray-500 text-xs mt-1.5">
                  Détermine le taux de TVA appliqué sur vos factures et reçus.
                </p>
              </div>
              <button
                onClick={handleSaveInfo}
                disabled={isSaving}
                className="w-full bg-[#6366f1] text-white py-3 rounded-lg font-medium hover:bg-[#5558e3] transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          )}

          {activeTab === 'photos' && (
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">
                Gérez les photos de votre studio. La première photo sera utilisée comme image principale.
              </p>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelected}
              />
              <div className="grid grid-cols-3 gap-3">
                {studio.imageUrl && (
                  <div className="aspect-square bg-[#2a2a2a] rounded-lg overflow-hidden relative group">
                    <div
                      className="w-full h-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${studio.imageUrl})` }}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => photoInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="text-white text-sm disabled:opacity-50"
                      >
                        {isUploadingPhoto ? 'Envoi...' : 'Changer'}
                      </button>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="aspect-square bg-[#2a2a2a] rounded-lg border-2 border-dashed border-[#3a3a3a] flex items-center justify-center hover:border-[#6366f1] transition-colors disabled:opacity-50"
                >
                  <Plus className="w-8 h-8 text-gray-500" />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'links' && (
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">
                Ajoutez des liens personnalisés (style Linktree) qui apparaîtront sur votre vitrine.
              </p>

              {/* Existing links */}
              <div className="space-y-2">
                {links.map((link, index) => (
                  <div key={link.id} className="flex items-center gap-3 bg-[#2a2a2a] rounded-lg p-3">
                    <GripVertical className="w-4 h-4 text-gray-500 cursor-grab" />
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{link.title}</p>
                      <p className="text-gray-500 text-xs truncate">{link.url}</p>
                    </div>
                    <button
                      onClick={() => deleteLink(link.id)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add new link */}
              <div className="bg-[#121212] rounded-lg p-4 space-y-3">
                <p className="text-white text-sm font-medium">Ajouter un lien</p>
                <input
                  type="text"
                  value={newLink.title}
                  onChange={(e) => setNewLink(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Titre du lien"
                  className="w-full bg-[#2a2a2a] text-white rounded-lg p-2 border border-[#3a3a3a] text-sm"
                />
                <input
                  type="url"
                  value={newLink.url}
                  onChange={(e) => setNewLink(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full bg-[#2a2a2a] text-white rounded-lg p-2 border border-[#3a3a3a] text-sm"
                />
                <button
                  onClick={addLink}
                  disabled={!newLink.title || !newLink.url}
                  className="w-full bg-[#6366f1] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#5558e3] transition-colors disabled:opacity-50"
                >
                  Ajouter
                </button>
              </div>
            </div>
          )}

          {activeTab === 'social' && (
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Site web</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://votre-site.com"
                  className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a]"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Instagram</label>
                <input
                  type="text"
                  value={formData.instagram}
                  onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                  placeholder="@votre_studio"
                  className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a]"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Twitter</label>
                <input
                  type="text"
                  value={formData.twitter}
                  onChange={(e) => setFormData(prev => ({ ...prev, twitter: e.target.value }))}
                  placeholder="@votre_studio"
                  className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a]"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Facebook URL</label>
                <input
                  type="url"
                  value={formData.facebook}
                  onChange={(e) => setFormData(prev => ({ ...prev, facebook: e.target.value }))}
                  placeholder="https://facebook.com/votre-studio"
                  className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a]"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">YouTube URL</label>
                <input
                  type="url"
                  value={formData.youtube}
                  onChange={(e) => setFormData(prev => ({ ...prev, youtube: e.target.value }))}
                  placeholder="https://youtube.com/@votre-studio"
                  className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a]"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Spotify URL</label>
                <input
                  type="url"
                  value={formData.spotify}
                  onChange={(e) => setFormData(prev => ({ ...prev, spotify: e.target.value }))}
                  placeholder="https://open.spotify.com/artist/..."
                  className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a]"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">SoundCloud URL</label>
                <input
                  type="url"
                  value={formData.soundcloud}
                  onChange={(e) => setFormData(prev => ({ ...prev, soundcloud: e.target.value }))}
                  placeholder="https://soundcloud.com/votre-studio"
                  className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a]"
                />
              </div>
              <button
                onClick={handleSaveInfo}
                disabled={isSaving}
                className="w-full bg-[#6366f1] text-white py-3 rounded-lg font-medium hover:bg-[#5558e3] transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
