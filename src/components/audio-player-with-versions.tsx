'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Heart, Globe, Lock, Eye, MessageCircle, X, Send, Users, Trash2, ArrowLeftRight, ChevronDown, Upload, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface TrackVersion {
  id: string;
  label: string; // "V1", "V2", "Mix Final", etc.
  audioUrl: string | null;
  duration: number | null;
  uploadedAt: string;
  notes: string | null;
}

interface Comment {
  id: string;
  content: string;
  timestamp: number | null; // Position en secondes dans la track (marqueur)
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface AudioPlayerWithVersionsProps {
  trackId: string;
  title: string;
  artist: string;
  duration?: number;
  audioUrl?: string;
  versions?: TrackVersion[];
  isPublic?: boolean;
  isShared?: boolean;
  onTogglePublic?: () => void;
  bpm?: number | null;
  keySignature?: string | null;
  views?: number;
  studio?: { id: string; name: string } | null;
  commentCount?: number;
  hideStudio?: boolean;
  onDelete?: () => void;
  onUploadVersion?: (file: File, label: string) => Promise<void>;
}

export default function AudioPlayerWithVersions({
  trackId,
  title,
  artist,
  duration = 180,
  audioUrl,
  versions = [],
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
  onUploadVersion
}: AudioPlayerWithVersionsProps) {
  // Current version state
  const [activeVersionIndex, setActiveVersionIndex] = useState(0);
  const [showVersionSelect, setShowVersionSelect] = useState(false);
  const [showUploadVersion, setShowUploadVersion] = useState(false);
  const [newVersionLabel, setNewVersionLabel] = useState('');
  const [uploadingVersion, setUploadingVersion] = useState(false);
  
  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [addTimestamp, setAddTimestamp] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useAppStore((state) => state.user);

  // Determine all versions (main + uploaded versions)
  const allVersions: TrackVersion[] = [
    { id: 'original', label: 'V1 (Original)', audioUrl: audioUrl || null, duration, uploadedAt: '', notes: null },
    ...versions
  ];
  
  const activeVersion = allVersions[activeVersionIndex];
  const activeDuration = activeVersion?.duration || duration;
  const activeAudioUrl = activeVersion?.audioUrl || audioUrl;

  // Generate waveform bars
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
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Switch version - keep playing (and playback position) if was playing
  const switchVersion = (index: number) => {
    const wasPlaying = isPlaying;

    // Stop current playback
    if (isPlaying) {
      if (audioRef.current) audioRef.current.pause();
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsPlaying(false);
    }

    // Keep the current playback position, clamped to the new version's duration
    const newVersion = allVersions[index];
    const newDuration = newVersion?.duration || duration;
    const resumeTime = Math.min(currentTime, newDuration || 0);

    setActiveVersionIndex(index);
    setCurrentTime(resumeTime);
    setShowVersionSelect(false);

    // Auto-resume on new version, from the same position, after a brief delay
    setTimeout(() => {
      if (newVersion?.audioUrl && audioRef.current) {
        audioRef.current.src = newVersion.audioUrl;
        audioRef.current.currentTime = resumeTime;
        if (wasPlaying) {
          audioRef.current.play();
          setIsPlaying(true);
          intervalRef.current = setInterval(() => {
            if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
          }, 100);
        }
      }
    }, 100);
  };

  const togglePlay = () => {
    if (audioRef.current && activeAudioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        if (audioRef.current.src !== activeAudioUrl) {
          audioRef.current.src = activeAudioUrl;
        }
        audioRef.current.play();
        intervalRef.current = setInterval(() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }, 100);
      }
      setIsPlaying(!isPlaying);
    } else {
      // Simulated playback
      setIsPlaying(!isPlaying);
      if (!isPlaying) {
        intervalRef.current = setInterval(() => {
          setCurrentTime(prev => {
            if (prev >= activeDuration) { setIsPlaying(false); if (intervalRef.current) clearInterval(intervalRef.current); return 0; }
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
      const newTime = percent * activeDuration;
      setCurrentTime(newTime);
      if (audioRef.current) audioRef.current.currentTime = newTime;
    }
  };

  const handleSkip = (delta: number) => {
    const newTime = Math.min(Math.max(currentTime + delta, 0), activeDuration || 0);
    setCurrentTime(newTime);
    if (audioRef.current) audioRef.current.currentTime = newTime;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (currentTime / activeDuration) * 100;

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

  // Load comments on mount so timestamped markers show on the waveform
  // without requiring the user to open the comments modal first
  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId]);

  // Submit comment (with optional timestamp)
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const body: { content: string; timestamp?: number } = { content: newComment };
      if (addTimestamp) {
        body.timestamp = Math.floor(currentTime);
      }

      const res = await fetch(`/api/tracks/${trackId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setNewComment('');
        setAddTimestamp(false);
        fetchComments();
      }
    } catch (e) {
      console.error('Error posting comment:', e);
    }
  };

  // Jump to timestamp
  const jumpToTimestamp = (timestamp: number) => {
    setCurrentTime(timestamp);
    if (audioRef.current) audioRef.current.currentTime = timestamp;
    if (!isPlaying) togglePlay();
  };

  // Handle version upload
  const handleVersionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadVersion || !newVersionLabel) return;

    setUploadingVersion(true);
    try {
      await onUploadVersion(file, newVersionLabel);
      setShowUploadVersion(false);
      setNewVersionLabel('');
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploadingVersion(false);
    }
  };

  // Timestamp markers on waveform
  const timestampComments = comments.filter(c => c.timestamp !== null && c.timestamp !== undefined);

  return (
    <>
      <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-[#2a2a2a] shadow-lg">
        {/* Header */}
        <div className="p-5 pb-3">
          <div className="flex items-start gap-4 flex-wrap">
            {/* Cover + Info */}
            <div className="flex items-start gap-4 flex-1 min-w-[180px]">
              {/* Cover / Play */}
              <div className="w-14 h-14 bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#6366f1]/20">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                </svg>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-semibold truncate">{artist}</h3>
                  {isPublic ? (
                    <Globe className="w-3.5 h-3.5 text-[#6366f1] flex-shrink-0" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-gray-400 text-sm truncate">{title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {bpm && <span className="text-[#6366f1] text-xs font-semibold">{bpm} BPM</span>}
                  {keySignature && <span className="text-[#8b5cf6] text-xs">{keySignature}</span>}
                  {!hideStudio && studio && (
                    <span className="text-[#f59e0b] text-xs">🎙 {studio.name}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Version Switcher */}
            {allVersions.length > 1 && (
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setShowVersionSelect(!showVersionSelect)}
                  className="flex items-center gap-2 bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-[#6366f1]/20"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  {activeVersion?.label || 'V1'}
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showVersionSelect && (
                  <div className="absolute right-0 top-full mt-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl overflow-hidden shadow-xl z-20 min-w-[180px]">
                    {allVersions.map((version, i) => (
                      <button
                        key={version.id}
                        onClick={() => switchVersion(i)}
                        className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between ${
                          i === activeVersionIndex
                            ? 'bg-[#6366f1] text-white'
                            : 'text-gray-300 hover:bg-[#3a3a3a]'
                        }`}
                      >
                        <span className="font-medium">{version.label}</span>
                        {i === activeVersionIndex && (
                          <span className="text-xs opacity-75">▶ En cours</span>
                        )}
                      </button>
                    ))}
                    {onUploadVersion && (
                      <button
                        onClick={() => { setShowVersionSelect(false); setShowUploadVersion(true); }}
                        className="w-full text-left px-4 py-3 text-sm text-[#6366f1] hover:bg-[#3a3a3a] border-t border-[#3a3a3a] flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" /> Ajouter une version
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Stats & Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1 text-gray-500 text-sm">
                <Eye className="w-4 h-4" /> {views}
              </div>
              <button
                onClick={() => { setShowComments(true); fetchComments(); }}
                className="flex items-center gap-1 text-gray-500 hover:text-white text-sm transition-colors"
              >
                <MessageCircle className="w-4 h-4" /> {commentCount}
              </button>
              {onTogglePublic && (
                <button
                  onClick={onTogglePublic}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    isPublic ? 'bg-[#6366f1] text-white' : 'bg-[#2a2a3a] text-gray-400 hover:text-white'
                  }`}
                >
                  {isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                </button>
              )}
              <button
                onClick={() => setIsLiked(!isLiked)}
                className={`p-2 rounded-xl transition-all ${
                  isLiked ? 'text-red-500 bg-red-500/10' : 'text-gray-500 hover:text-white hover:bg-[#2a2a3a]'
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500' : ''}`} />
              </button>
              {onDelete && (
                <button onClick={onDelete} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Waveform Progress Bar with Timestamp Markers */}
        <div className="px-5 pb-4">
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="h-14 bg-[#12121e] rounded-xl cursor-pointer relative overflow-hidden"
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

            {/* Timestamp markers */}
            {timestampComments.map((comment) => {
              const markerPos = ((comment.timestamp || 0) / activeDuration) * 100;
              return (
                <button
                  key={comment.id}
                  onClick={(e) => { e.stopPropagation(); jumpToTimestamp(comment.timestamp!); }}
                  className="absolute top-0 w-1 h-full bg-[#f59e0b]/70 hover:bg-[#f59e0b] transition-colors z-10"
                  style={{ left: `${markerPos}%` }}
                  title={`${formatTime(comment.timestamp!)} - ${comment.user.name}: ${comment.content}`}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#f59e0b] rounded-full border-2 border-[#12121e]" />
                </button>
              );
            })}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-20"
              style={{ left: `${progress}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg" />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">{formatTime(currentTime)}</span>

            <div className="flex items-center gap-2">
              <button onClick={() => handleSkip(-5)} className="p-1 text-gray-500 hover:text-white transition-colors">
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={togglePlay}
                className="w-10 h-10 bg-[#6366f1] rounded-full flex items-center justify-center text-white hover:bg-[#5558e3] transition-all shadow-lg shadow-[#6366f1]/30"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <button onClick={() => handleSkip(5)} className="p-1 text-gray-500 hover:text-white transition-colors">
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            <span className="text-xs text-gray-500">{formatTime(activeDuration)}</span>
          </div>
        </div>

        {activeAudioUrl && (
          <audio
            ref={audioRef}
            src={activeAudioUrl}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onEnded={() => { setIsPlaying(false); if (intervalRef.current) clearInterval(intervalRef.current); }}
          />
        )}
      </div>

      {/* Upload Version Modal */}
      {showUploadVersion && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold text-lg">Ajouter une version</h3>
              <button onClick={() => setShowUploadVersion(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Nom de la version</label>
                <input
                  type="text"
                  value={newVersionLabel}
                  onChange={(e) => setNewVersionLabel(e.target.value)}
                  placeholder="Ex: V2, Mix Final, Master..."
                  className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a] focus:border-[#6366f1] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Fichier audio</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleVersionUpload}
                  className="w-full text-gray-400 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#6366f1] file:text-white file:font-medium file:cursor-pointer"
                  disabled={!newVersionLabel || uploadingVersion}
                />
              </div>
              {uploadingVersion && (
                <div className="flex items-center gap-2 text-[#6366f1]">
                  <Loader2 className="w-4 h-4 animate-spin" /> Upload en cours...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comments Modal with Timestamps */}
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
                    <div className="w-8 h-8 bg-[#6366f1] rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {comment.user.name[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-medium">{comment.user.name}</p>
                        {comment.timestamp !== null && comment.timestamp !== undefined && (
                          <button
                            onClick={() => jumpToTimestamp(comment.timestamp!)}
                            className="text-[#f59e0b] text-xs font-mono bg-[#f59e0b]/10 px-2 py-0.5 rounded hover:bg-[#f59e0b]/20 transition-colors"
                          >
                            ⏱ {formatTime(comment.timestamp)}
                          </button>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSubmitComment} className="p-4 border-t border-[#2a2a2a]">
              {/* Timestamp toggle */}
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setAddTimestamp(!addTimestamp)}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${
                    addTimestamp ? 'bg-[#f59e0b] text-white' : 'bg-[#2a2a2a] text-gray-500 hover:text-white'
                  }`}
                >
                  ⏱ {addTimestamp ? `Marqueur à ${formatTime(currentTime)}` : 'Ajouter marqueur'}
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Ajouter un commentaire..."
                  className="flex-1 bg-[#2a2a2a] text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                />
                <button type="submit" className="p-2 bg-[#6366f1] text-white rounded-xl hover:bg-[#5558e3] transition-colors">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
