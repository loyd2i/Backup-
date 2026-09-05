'use client';

import { useEffect, useState, useRef } from 'react';
import {
  MapPin, Star, Clock, Phone, Globe, Instagram, Twitter, Facebook, Youtube, Music, Headphones,
  Camera, Calendar, ChevronLeft, ChevronRight, X, ExternalLink, Share2, Heart, Play, Pause,
  Eye, ArrowLeft, Mail, QrCode, Copy, Check
} from 'lucide-react';

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

interface PricingTier {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  unit: string;
}

interface Availability {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface PublicTrack {
  id: string;
  title: string;
  artist: string;
  audioUrl: string | null;
  duration: number | null;
  bpm: number | null;
  key: string | null;
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
  photos: StudioPhoto[];
  links: StudioLink[];
  pricingTiers: PricingTier[];
  availabilities: Availability[];
}

interface PublicVitrinePageProps {
  studioId: string;
  onBack?: () => void;
}

const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default function PublicVitrinePage({ studioId, onBack }: PublicVitrinePageProps) {
  const [studio, setStudio] = useState<Studio | null>(null);
  const [tracks, setTracks] = useState<PublicTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchStudioData();
    fetch(`/api/studios/${studioId}/qrcode`)
      .then(res => res.json())
      .then(data => setQrDataUrl(data.dataUrl || null))
      .catch(() => {});
  }, [studioId]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const fetchStudioData = async () => {
    try {
      const [studioRes, tracksRes] = await Promise.all([
        fetch(`/api/studios/${studioId}`),
        fetch(`/api/tracks/public?studioId=${studioId}`)
      ]);
      const studioData = await studioRes.json();
      const tracksData = await tracksRes.json();
      setStudio(studioData.studio || studioData);
      setTracks(tracksData.tracks || []);
    } catch (error) {
      console.error('Error fetching studio:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const getSocialLinks = () => {
    if (!studio) return [];
    const links = [];
    if (studio.website) links.push({ icon: Globe, url: studio.website, label: 'Site web' });
    if (studio.instagram) links.push({ icon: Instagram, url: `https://instagram.com/${studio.instagram.replace('@', '')}`, label: 'Instagram' });
    if (studio.twitter) links.push({ icon: Twitter, url: `https://twitter.com/${studio.twitter.replace('@', '')}`, label: 'Twitter' });
    if (studio.facebook) links.push({ icon: Facebook, url: studio.facebook, label: 'Facebook' });
    if (studio.youtube) links.push({ icon: Youtube, url: studio.youtube, label: 'YouTube' });
    if (studio.spotify) links.push({ icon: Music, url: studio.spotify, label: 'Spotify' });
    if (studio.soundcloud) links.push({ icon: Headphones, url: studio.soundcloud, label: 'SoundCloud' });
    return links;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#121212] p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="h-72 bg-[#1a1a1a] rounded-2xl animate-pulse" />
          <div className="h-32 bg-[#1a1a1a] rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!studio) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-lg">Studio non trouvé</p>
          {onBack && (
            <button onClick={onBack} className="mt-4 text-[#6366f1] hover:text-[#818cf8] text-sm">
              ← Retour aux studios
            </button>
          )}
        </div>
      </div>
    );
  }

  const allPhotos = [
    ...(studio.imageUrl ? [{ id: 'main', url: studio.imageUrl, caption: studio.name, order: -1 }] : []),
    ...(studio.photos || []).sort((a, b) => a.order - b.order)
  ];

  const socialLinks = getSocialLinks();
  const activeLinks = (studio.links || []).filter(l => l.isActive).sort((a, b) => a.order - b.order);
  const activeAvailabilities = (studio.availabilities || []).filter(a => a.isActive).sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  return (
    <div className="min-h-screen bg-[#121212]">
      <audio ref={audioRef} onEnded={() => setPlayingTrack(null)} />

      {/* Hero */}
      <div className="relative h-72 md:h-96 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${allPhotos[0]?.url || '/background-studio.jpg'})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/50 to-transparent" />

        {/* Back Button / Studiolib home link */}
        {onBack ? (
          <button
            onClick={onBack}
            className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-xl hover:bg-black/70 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
        ) : (
          <a
            href="/"
            className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-xl hover:bg-black/70 transition-colors font-semibold"
          >
            Studiolib
          </a>
        )}

        {/* Photo Count */}
        {allPhotos.length > 1 && (
          <button
            onClick={() => setShowPhotoModal(true)}
            className="absolute bottom-4 right-4 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-xl hover:bg-black/70"
          >
            <Camera className="w-4 h-4" /> {allPhotos.length} photos
          </button>
        )}

        {/* Studio Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                studio.type === 'professionnel' ? 'bg-[#6366f1] text-white' : 'bg-[#f59e0b] text-white'
              }`}>
                {studio.type === 'professionnel' ? 'PRO' : 'HOME STUDIO'}
              </span>
              <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-lg px-2 py-1">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                <span className="text-white text-sm font-semibold">{studio.rating.toFixed(1)}</span>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">{studio.name}</h1>
            <div className="flex items-center gap-1.5 text-gray-300 text-sm">
              <MapPin className="w-4 h-4" />
              <span>{studio.location}{studio.address ? ` — ${studio.address}` : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Description & Price */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            {studio.description && (
              <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a] mb-6">
                <h2 className="text-white font-bold text-lg mb-3">À propos</h2>
                <p className="text-gray-400 leading-relaxed">{studio.description}</p>
              </div>
            )}

            {studio.equipment && (
              <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a]">
                <h2 className="text-white font-bold text-lg mb-3">🎛 Équipement</h2>
                <p className="text-gray-400 leading-relaxed">{studio.equipment}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Price Card */}
            <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a]">
              <div className="text-center mb-4">
                <p className="text-gray-500 text-sm">À partir de</p>
                <p className="text-4xl font-bold text-[#f59e0b]">{studio.pricePerHour}€</p>
                <p className="text-gray-500 text-sm">/heure</p>
              </div>
              <button className="w-full bg-[#6366f1] text-white py-3 rounded-xl font-semibold hover:bg-[#5558e3] transition-colors flex items-center justify-center gap-2">
                <Calendar className="w-4 h-4" /> Réserver
              </button>
            </div>

            {/* Contact */}
            {studio.phone && (
              <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-[#2a2a2a]">
                <a href={`tel:${studio.phone}`} className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors">
                  <Phone className="w-5 h-5 text-[#6366f1]" />
                  <span>{studio.phone}</span>
                </a>
              </div>
            )}

            {/* Social Links */}
            {socialLinks.length > 0 && (
              <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-[#2a2a2a]">
                <div className="flex flex-wrap gap-3">
                  {socialLinks.map((social, i) => {
                    const Icon = social.icon;
                    return (
                      <a
                        key={i}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 bg-[#2a2a2a] rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#3a3a3a] transition-all"
                        title={social.label}
                      >
                        <Icon className="w-5 h-5" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* QR Code / Partage */}
            <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-[#2a2a2a]">
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
                  <p className="text-white text-sm font-medium">Fiche studio</p>
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
          </div>
        </div>

        {/* Pricing Tiers */}
        {studio.pricingTiers && studio.pricingTiers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-white font-bold text-lg mb-4">💰 Tarifs</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {studio.pricingTiers.map((tier) => (
                <div key={tier.id} className="bg-[#1a1a1a] rounded-2xl p-5 border border-[#2a2a2a] hover:border-[#f59e0b]/30 transition-colors">
                  <h3 className="text-white font-semibold mb-1">{tier.name}</h3>
                  {tier.description && <p className="text-gray-500 text-sm mb-3">{tier.description}</p>}
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-[#f59e0b]">{tier.price}€</span>
                    <span className="text-gray-500 text-sm">/ {tier.unit === 'heure' ? `${tier.duration}h` : tier.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Horaires */}
        {activeAvailabilities.length > 0 && (
          <div className="mb-8">
            <h2 className="text-white font-bold text-lg mb-4">🕐 Horaires d'ouverture</h2>
            <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] overflow-hidden">
              {activeAvailabilities.map((avail, i) => (
                <div key={i} className={`flex items-center justify-between px-5 py-3 ${i > 0 ? 'border-t border-[#2a2a2a]' : ''}`}>
                  <span className="text-white font-medium">{dayNames[avail.dayOfWeek]}</span>
                  <span className="text-gray-400">{avail.startTime} — {avail.endTime}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom Links (Linktree style) */}
        {activeLinks.length > 0 && (
          <div className="mb-8">
            <h2 className="text-white font-bold text-lg mb-4">🔗 Liens</h2>
            <div className="space-y-3 max-w-md">
              {activeLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#6366f1] rounded-2xl px-5 py-4 transition-all group"
                >
                  <span className="text-white font-medium group-hover:text-[#6366f1]">{link.title}</span>
                  <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-[#6366f1]" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Tracks */}
        {tracks.length > 0 && (
          <div className="mb-8">
            <h2 className="text-white font-bold text-lg mb-4">🎵 Productions</h2>
            <div className="space-y-3">
              {tracks.map((track) => (
                <div key={track.id} className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] flex items-center gap-4">
                  <button
                    onClick={() => togglePlayTrack(track.id, track.audioUrl)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                      playingTrack === track.id 
                        ? 'bg-[#6366f1] shadow-lg shadow-[#6366f1]/30' 
                        : 'bg-[#2a2a2a] hover:bg-[#6366f1]'
                    }`}
                  >
                    {playingTrack === track.id ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{track.artist} — {track.title}</p>
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

        {/* Photo Gallery */}
        {allPhotos.length > 1 && (
          <div className="mb-8">
            <h2 className="text-white font-bold text-lg mb-4">📸 Photos</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {allPhotos.map((photo, i) => (
                <button
                  key={photo.id}
                  onClick={() => { setActivePhotoIndex(i); setShowPhotoModal(true); }}
                  className="aspect-video bg-[#2a2a2a] rounded-xl overflow-hidden group"
                >
                  <div
                    className="w-full h-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                    style={{ backgroundImage: `url(${photo.url})` }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Photo Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <button
            onClick={() => setShowPhotoModal(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white z-10"
          >
            <X className="w-8 h-8" />
          </button>
          
          <button
            onClick={() => setActivePhotoIndex(prev => (prev - 1 + allPhotos.length) % allPhotos.length)}
            className="absolute left-4 text-white/70 hover:text-white"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          <div className="max-w-4xl max-h-[80vh] relative">
            <img
              src={allPhotos[activePhotoIndex]?.url}
              alt={allPhotos[activePhotoIndex]?.caption || 'Photo du studio'}
              className="max-h-[80vh] object-contain rounded-lg"
            />
            {allPhotos[activePhotoIndex]?.caption && (
              <p className="text-white text-center mt-3">{allPhotos[activePhotoIndex].caption}</p>
            )}
          </div>

          <button
            onClick={() => setActivePhotoIndex(prev => (prev + 1) % allPhotos.length)}
            className="absolute right-4 text-white/70 hover:text-white"
          >
            <ChevronRight className="w-8 h-8" />
          </button>

          <div className="absolute bottom-4 text-gray-400 text-sm">
            {activePhotoIndex + 1} / {allPhotos.length}
          </div>
        </div>
      )}

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
            <p className="text-[#121212] font-semibold mb-4">{studio.name}</p>
            <a
              href={qrDataUrl}
              download={`qrcode-${studio.name.toLowerCase().replace(/\s+/g, '-')}.png`}
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
