'use client';

import { useEffect, useState, useRef } from 'react';
import { Music, Play, Pause, Eye, Heart, Star, Search, Globe, ArrowLeft, MessageCircle, Headphones } from 'lucide-react';

interface PublicTrack {
  id: string;
  title: string;
  artist: string;
  bpm: number | null;
  key: string | null;
  audioUrl: string | null;
  coverUrl: string | null;
  duration: number | null;
  views: number;
  createdAt: string;
  user: { id: string; name: string; avatar: string | null };
  studio: { id: string; name: string; location: string } | null;
  _count: { comments: number };
}

export default function PublicCreationsPage() {
  const [tracks, setTracks] = useState<PublicTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [likedTracks, setLikedTracks] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchPublicTracks();
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const fetchPublicTracks = async () => {
    try {
      const res = await fetch('/api/tracks/public');
      const data = await res.json();
      setTracks(data.tracks || []);
    } catch (error) {
      console.error('Error fetching public tracks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlay = (trackId: string, audioUrl: string | null) => {
    if (playingTrackId === trackId) {
      // Pause
      setPlayingTrackId(null);
      if (audioRef.current) audioRef.current.pause();
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      // Play
      setPlayingTrackId(trackId);
      setCurrentTime(0);
      if (audioRef.current && audioUrl) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      }
      // Track view
      fetch(`/api/tracks/${trackId}/view`, { method: 'POST' }).catch(() => {});
      
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      }, 100);
    }
  };

  const toggleLike = (trackId: string) => {
    setLikedTracks(prev => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredTracks = tracks.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#121212]">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(139,92,246,0.04) 0%, transparent 50%)'
        }}
      />

      <audio ref={audioRef} onEnded={() => { setPlayingTrackId(null); if (intervalRef.current) clearInterval(intervalRef.current); }} />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] rounded-xl flex items-center justify-center">
              <Headphones className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white">Créations</h1>
          </div>
          <p className="text-gray-400 text-lg">Découvrez les créations de la communauté Studiolib</p>
        </div>

        {/* Search */}
        <div className="relative mb-8 max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un artiste, un titre..."
            className="w-full bg-[#1a1a1a] text-white placeholder:text-gray-500 h-14 rounded-2xl pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#6366f1] text-base border border-[#2a2a2a] focus:border-[#6366f1]"
          />
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-6 mb-8">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{tracks.length}</p>
            <p className="text-gray-500 text-sm">Créations</p>
          </div>
          <div className="w-px h-8 bg-[#2a2a2a]" />
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{tracks.reduce((sum, t) => sum + t.views, 0)}</p>
            <p className="text-gray-500 text-sm">Écoutes</p>
          </div>
          <div className="w-px h-8 bg-[#2a2a2a]" />
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{new Set(tracks.map(t => t.user.id)).size}</p>
            <p className="text-gray-500 text-sm">Artistes</p>
          </div>
        </div>

        {/* Track List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-[#1a1a1a] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="text-center py-16">
            <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Aucune création trouvée</p>
            <p className="text-gray-600 text-sm mt-2">Les artistes n'ont pas encore publié de créations</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTracks.map((track) => {
              const isPlaying = playingTrackId === track.id;
              const isLiked = likedTracks.has(track.id);
              const duration = track.duration || 180;
              const progress = isPlaying ? (currentTime / duration) * 100 : 0;

              return (
                <div
                  key={track.id}
                  className={`bg-[#1a1a1a] rounded-2xl border transition-all overflow-hidden ${
                    isPlaying ? 'border-[#6366f1] shadow-lg shadow-[#6366f1]/10' : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-center gap-4">
                      {/* Play Button / Cover */}
                      <button
                        onClick={() => togglePlay(track.id, track.audioUrl)}
                        className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                          isPlaying 
                            ? 'bg-[#6366f1] shadow-lg shadow-[#6366f1]/40' 
                            : 'bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] hover:shadow-lg hover:shadow-[#6366f1]/30'
                        }`}
                      >
                        {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-0.5" />}
                      </button>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-semibold truncate">{track.artist}</h3>
                          <Globe className="w-3.5 h-3.5 text-[#6366f1]" />
                        </div>
                        <p className="text-gray-400 text-sm truncate">{track.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          {track.bpm && <span className="text-[#6366f1] font-semibold">{track.bpm} BPM</span>}
                          {track.key && <span>{track.key}</span>}
                          {track.studio && (
                            <span className="text-[#f59e0b]">🎙 {track.studio.name}</span>
                          )}
                          <span>{formatTime(duration)}</span>
                        </div>
                      </div>

                      {/* Stats & Actions */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                          <Eye className="w-4 h-4" />
                          <span>{track.views}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                          <MessageCircle className="w-4 h-4" />
                          <span>{track._count.comments}</span>
                        </div>
                        <button
                          onClick={() => toggleLike(track.id)}
                          className={`p-2 rounded-xl transition-all ${
                            isLiked ? 'text-red-500 bg-red-500/10' : 'text-gray-500 hover:text-white hover:bg-[#2a2a2a]'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Progress bar when playing */}
                    {isPlaying && (
                      <div className="mt-4">
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
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
