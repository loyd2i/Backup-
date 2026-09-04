'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Heart, Share2, Download, Globe, Lock, Repeat, Shuffle, Eye, MessageCircle, X, Send, Users, MoreHorizontal, Trash2, Disc3, Music, Youtube, Headphones, Calendar } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface TrackShare {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface AudioPlayerProps {
  trackId: string;
  title: string;
  artist: string;
  duration?: number;
  audioUrl?: string;
  coverUrl?: string;
  isPublic?: boolean;
  isShared?: boolean;
  onTogglePublic?: () => void;
  bpm?: number | null;
  keySignature?: string | null;
  views?: number;
  studio?: { id: string; name: string } | null;
  commentCount?: number;
  hideStudio?: boolean; // Hide studio info (for studio mode)
  onDelete?: () => void; // Delete callback
  status?: string; // in_progress, finished
  genre?: string | null;
  releaseDate?: string | null;
  spotifyUrl?: string | null;
  youtubeUrl?: string | null;
  appleMusicUrl?: string | null;
  deezerUrl?: string | null;
  canEditRelease?: boolean; // Owner can edit the release sheet
  onReleaseUpdate?: () => void;
}

export default function AudioPlayer({
  trackId,
  title,
  artist,
  duration = 180,
  audioUrl,
  coverUrl,
  isPublic = false,
  isShared = false,
  onTogglePublic,
  bpm,
  keySignature,
  views = 0,
  studio,
  commentCount = 0,
  hideStudio = false,
  onDelete,
  status,
  genre,
  releaseDate,
  spotifyUrl,
  youtubeUrl,
  appleMusicUrl,
  deezerUrl,
  canEditRelease = false,
  onReleaseUpdate
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [shares, setShares] = useState<TrackShare[]>([]);
  const [shareEmail, setShareEmail] = useState('');
  const [showRelease, setShowRelease] = useState(false);
  const [isSavingRelease, setIsSavingRelease] = useState(false);
  const [releaseForm, setReleaseForm] = useState({
    genre: genre || '',
    releaseDate: releaseDate ? releaseDate.substring(0, 10) : '',
    spotifyUrl: spotifyUrl || '',
    youtubeUrl: youtubeUrl || '',
    appleMusicUrl: appleMusicUrl || '',
    deezerUrl: deezerUrl || '',
  });
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const user = useAppStore((state) => state.user);

  // Generate waveform bars for visualization
  const waveformBars = useRef<number[]>([]);
  if (waveformBars.current.length === 0) {
    for (let i = 0; i < 64; i++) {
      waveformBars.current.push(Math.random() * 0.6 + 0.2);
    }
  }

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    setReleaseForm({
      genre: genre || '',
      releaseDate: releaseDate ? releaseDate.substring(0, 10) : '',
      spotifyUrl: spotifyUrl || '',
      youtubeUrl: youtubeUrl || '',
      appleMusicUrl: appleMusicUrl || '',
      deezerUrl: deezerUrl || '',
    });
  }, [genre, releaseDate, spotifyUrl, youtubeUrl, appleMusicUrl, deezerUrl]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Track view on first play
  const hasTrackedView = useRef(false);
  
  const trackView = async () => {
    if (hasTrackedView.current) return;
    hasTrackedView.current = true;
    
    try {
      await fetch(`/api/tracks/${trackId}/view`, { method: 'POST' });
    } catch (e) {
      // Ignore
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        audioRef.current.play();
        trackView();
        intervalRef.current = setInterval(() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }, 100);
      }
      setIsPlaying(!isPlaying);
    } else {
      setIsPlaying(!isPlaying);
      trackView();
      if (!isPlaying) {
        intervalRef.current = setInterval(() => {
          setCurrentTime(prev => {
            if (prev >= duration) {
              setIsPlaying(false);
              if (intervalRef.current) clearInterval(intervalRef.current);
              return 0;
            }
            return prev + 0.1;
          });
        }, 100);
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const newTime = percent * duration;
      setCurrentTime(newTime);
      if (audioRef.current) {
        audioRef.current.currentTime = newTime;
      }
    }
  };

  const handleSkip = (delta: number) => {
    const newTime = Math.min(Math.max(currentTime + delta, 0), duration || 0);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (currentTime / duration) * 100;

  // Fetch comments
  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/tracks/${trackId}/comments`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch (e) {
      console.error('Error fetching comments:', e);
    }
  };

  // Fetch shares
  const fetchShares = async () => {
    try {
      const res = await fetch(`/api/tracks/${trackId}/share`);
      const data = await res.json();
      setShares(data.shares || []);
    } catch (e) {
      console.error('Error fetching shares:', e);
    }
  };

  // Submit comment
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const res = await fetch(`/api/tracks/${trackId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment })
      });
      if (res.ok) {
        setNewComment('');
        fetchComments();
      }
    } catch (e) {
      console.error('Error posting comment:', e);
    }
  };

  // Save release sheet
  const handleSaveRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRelease(true);
    try {
      const res = await fetch('/api/tracks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: trackId,
          genre: releaseForm.genre || null,
          releaseDate: releaseForm.releaseDate || null,
          spotifyUrl: releaseForm.spotifyUrl || null,
          youtubeUrl: releaseForm.youtubeUrl || null,
          appleMusicUrl: releaseForm.appleMusicUrl || null,
          deezerUrl: releaseForm.deezerUrl || null,
        })
      });
      if (res.ok) {
        setShowRelease(false);
        onReleaseUpdate?.();
      }
    } catch (e) {
      console.error('Error saving release info:', e);
    } finally {
      setIsSavingRelease(false);
    }
  };

  // Share with user
  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareEmail.trim()) return;

    try {
      // Find user by email
      const res = await fetch(`/api/tracks/${trackId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [shareEmail] }) // We'll use email as userId for demo
      });
      if (res.ok) {
        setShareEmail('');
        fetchShares();
      }
    } catch (e) {
      console.error('Error sharing:', e);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-br from-[#1e1e2e] to-[#121218] rounded-2xl border border-[#2a2a3a] overflow-hidden group hover:border-[#6366f1]/50 transition-all duration-300">
        {/* Main Player Section */}
        <div className="p-5">
          <div className="flex items-center gap-5">
            {/* Album Art */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-xl shadow-[#6366f1]/20 bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center">
                {coverUrl ? (
                  <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center gap-0.5 h-10">
                    {[0.4, 0.7, 1, 0.8, 0.5, 0.9, 0.6, 0.8, 0.4, 0.7].map((h, i) => (
                      <div
                        key={i}
                        className="w-1 bg-white/80 rounded-full"
                        style={{ height: `${h * 30}px` }}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center">
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-[#6366f1]" />
                  ) : (
                    <Play className="w-5 h-5 text-[#6366f1] ml-0.5" />
                  )}
                </div>
              </button>
            </div>

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-white font-semibold text-lg truncate">{title}</h3>
                {isShared && (
                  <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                    Partagé
                  </span>
                )}
              </div>
              <p className="text-gray-400 truncate mb-1">{artist}</p>
              {studio && !hideStudio && (
                <p className="text-gray-500 text-xs truncate flex items-center gap-1">
                  <span className="text-[#f59e0b]">Studio:</span> {studio.name}
                </p>
              )}
              
              {/* BPM and Key */}
              <div className="flex items-center gap-3 text-xs mt-1 flex-wrap">
                {bpm && <span className="bg-[#2a2a3a] text-gray-300 px-2 py-0.5 rounded-md">{bpm} BPM</span>}
                {keySignature && <span className="bg-[#2a2a3a] text-gray-300 px-2 py-0.5 rounded-md">{keySignature}</span>}
                {genre && <span className="bg-[#2a2a3a] text-gray-300 px-2 py-0.5 rounded-md">{genre}</span>}
                {releaseDate && (
                  <span className="flex items-center gap-1 text-gray-500">
                    <Calendar className="w-3 h-3" />
                    {new Date(releaseDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>

              {/* Platform links */}
              {(spotifyUrl || youtubeUrl || appleMusicUrl || deezerUrl) && (
                <div className="flex items-center gap-2 mt-2">
                  {spotifyUrl && (
                    <a href={spotifyUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                      className="p-1.5 bg-[#1DB954]/15 text-[#1DB954] rounded-lg hover:bg-[#1DB954]/25 transition-colors" title="Spotify">
                      <Music className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {youtubeUrl && (
                    <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                      className="p-1.5 bg-[#FF0000]/15 text-[#FF0000] rounded-lg hover:bg-[#FF0000]/25 transition-colors" title="YouTube">
                      <Youtube className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {appleMusicUrl && (
                    <a href={appleMusicUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                      className="p-1.5 bg-white/15 text-white rounded-lg hover:bg-white/25 transition-colors" title="Apple Music">
                      <Disc3 className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {deezerUrl && (
                    <a href={deezerUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                      className="p-1.5 bg-[#FF5500]/15 text-[#FF5500] rounded-lg hover:bg-[#FF5500]/25 transition-colors" title="Deezer">
                      <Headphones className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Stats & Actions */}
            <div className="flex items-center gap-2">
              {/* Views */}
              <div className="flex items-center gap-1 text-gray-500 text-sm">
                <Eye className="w-4 h-4" />
                {views}
              </div>
              
              {/* Comments */}
              <button 
                onClick={() => { setShowComments(true); fetchComments(); }}
                className="flex items-center gap-1 text-gray-500 hover:text-white text-sm transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                {commentCount}
              </button>

              {/* Visibility toggle */}
              {onTogglePublic && (
                <button
                  onClick={onTogglePublic}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    isPublic 
                      ? 'bg-[#6366f1] text-white' 
                      : 'bg-[#2a2a3a] text-gray-400 hover:text-white'
                  }`}
                >
                  {isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                </button>
              )}

              {/* Share button for private tracks */}
              {!isPublic && !isShared && (
                <button
                  onClick={() => { setShowShare(true); fetchShares(); }}
                  className="p-2 text-gray-500 hover:text-white hover:bg-[#2a2a3a] rounded-xl transition-all"
                >
                  <Users className="w-4 h-4" />
                </button>
              )}
              
              <button
                onClick={() => setIsLiked(!isLiked)}
                className={`p-2 rounded-xl transition-all ${
                  isLiked 
                    ? 'text-red-500 bg-red-500/10' 
                    : 'text-gray-500 hover:text-white hover:bg-[#2a2a3a]'
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500' : ''}`} />
              </button>
              
              {/* Release sheet edit button */}
              {canEditRelease && status === 'finished' && (
                <button
                  onClick={() => setShowRelease(true)}
                  className="p-2 text-gray-500 hover:text-white hover:bg-[#2a2a3a] rounded-xl transition-all"
                  title="Fiche de sortie"
                >
                  <Disc3 className="w-4 h-4" />
                </button>
              )}

              {/* Delete button */}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Waveform Progress Bar */}
        <div className="px-5 pb-4">
          <div 
            ref={progressRef}
            onClick={handleProgressClick}
            className="h-14 bg-[#1a1a24] rounded-xl cursor-pointer relative overflow-hidden"
          >
            <div className="absolute inset-0 flex items-center justify-center gap-[2px] px-3">
              {waveformBars.current.map((height, i) => {
                const barProgress = (i / waveformBars.current.length) * 100;
                const isActive = barProgress <= progress;
                
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-full transition-all duration-150 ${
                      isActive 
                        ? 'bg-gradient-to-t from-[#6366f1] to-[#8b5cf6]' 
                        : 'bg-[#2a2a3a]'
                    }`}
                    style={{ height: `${height * 45}px` }}
                  />
                );
              })}
            </div>
            
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
              style={{ left: `${progress}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg" />
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">{formatTime(currentTime)}</span>
            
            <div className="flex items-center gap-2">
              <button onClick={() => handleSkip(-5)} className="p-1 text-gray-500 hover:text-white transition-colors">
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={togglePlay}
                className="w-10 h-10 bg-[#6366f1] rounded-full flex items-center justify-center text-white hover:bg-[#5558e3] transition-all shadow-lg"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <button onClick={() => handleSkip(5)} className="p-1 text-gray-500 hover:text-white transition-colors">
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
            
            <span className="text-xs text-gray-500">{formatTime(duration)}</span>
          </div>
        </div>

        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onEnded={() => setIsPlaying(false)}
          />
        )}
      </div>

      {/* Comments Modal */}
      {showComments && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-[#2a2a2a] flex items-center justify-between">
              <h3 className="text-white font-semibold">Commentaires</h3>
              <button onClick={() => setShowComments(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun commentaire</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 bg-[#6366f1] rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {comment.user.name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{comment.user.name}</p>
                      <p className="text-gray-400 text-sm">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <form onSubmit={handleSubmitComment} className="p-4 border-t border-[#2a2a2a] flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Ajouter un commentaire..."
                className="flex-1 bg-[#2a2a2a] text-white rounded-xl px-4 py-2 text-sm"
              />
              <button type="submit" className="p-2 bg-[#6366f1] text-white rounded-xl">
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShare && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md">
            <div className="p-4 border-b border-[#2a2a2a] flex items-center justify-between">
              <h3 className="text-white font-semibold">Partager avec</h3>
              <button onClick={() => setShowShare(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4">
              {/* Current shares */}
              {shares.length > 0 && (
                <div className="mb-4">
                  <p className="text-gray-500 text-sm mb-2">Déjà partagé avec :</p>
                  <div className="space-y-2">
                    {shares.map((share) => (
                      <div key={share.id} className="flex items-center justify-between bg-[#2a2a2a] rounded-lg p-2">
                        <span className="text-white text-sm">{share.user.name || share.user.email}</span>
                        <button className="text-gray-500 hover:text-red-400">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Add share form */}
              <form onSubmit={handleShare} className="flex gap-2">
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="Email de l'utilisateur..."
                  className="flex-1 bg-[#2a2a2a] text-white rounded-xl px-4 py-2 text-sm"
                />
                <button type="submit" className="px-4 bg-[#6366f1] text-white rounded-xl text-sm font-medium">
                  Partager
                </button>
              </form>
              
              <p className="text-gray-600 text-xs mt-3">
                Seuls les utilisateurs avec qui vous partagez pourront voir cette track privée.
              </p>
            </div>
          </div>
        </div>
      )}

      {showRelease && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-[#2a2a2a] flex items-center justify-between">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Disc3 className="w-5 h-5 text-[#6366f1]" />
                Fiche de sortie
              </h3>
              <button onClick={() => setShowRelease(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRelease} className="p-4 space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Genre</label>
                <input
                  type="text"
                  value={releaseForm.genre}
                  onChange={(e) => setReleaseForm(prev => ({ ...prev, genre: e.target.value }))}
                  placeholder="Rap, Pop, Électro..."
                  className="w-full bg-[#2a2a2a] text-white rounded-xl px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Date de sortie</label>
                <input
                  type="date"
                  value={releaseForm.releaseDate}
                  onChange={(e) => setReleaseForm(prev => ({ ...prev, releaseDate: e.target.value }))}
                  className="w-full bg-[#2a2a2a] text-white rounded-xl px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Lien Spotify</label>
                <input
                  type="url"
                  value={releaseForm.spotifyUrl}
                  onChange={(e) => setReleaseForm(prev => ({ ...prev, spotifyUrl: e.target.value }))}
                  placeholder="https://open.spotify.com/track/..."
                  className="w-full bg-[#2a2a2a] text-white rounded-xl px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Lien YouTube</label>
                <input
                  type="url"
                  value={releaseForm.youtubeUrl}
                  onChange={(e) => setReleaseForm(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full bg-[#2a2a2a] text-white rounded-xl px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Lien Apple Music</label>
                <input
                  type="url"
                  value={releaseForm.appleMusicUrl}
                  onChange={(e) => setReleaseForm(prev => ({ ...prev, appleMusicUrl: e.target.value }))}
                  placeholder="https://music.apple.com/..."
                  className="w-full bg-[#2a2a2a] text-white rounded-xl px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Lien Deezer</label>
                <input
                  type="url"
                  value={releaseForm.deezerUrl}
                  onChange={(e) => setReleaseForm(prev => ({ ...prev, deezerUrl: e.target.value }))}
                  placeholder="https://deezer.com/track/..."
                  className="w-full bg-[#2a2a2a] text-white rounded-xl px-4 py-2.5 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={isSavingRelease}
                className="w-full bg-[#6366f1] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#5558e3] transition-colors disabled:opacity-50"
              >
                {isSavingRelease ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
