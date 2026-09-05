'use client';

import { useEffect, useState, useRef } from 'react';
import { Music, FileText, Pencil, Plus, X, Save, Globe, Lock, Upload, Loader2, Zap, Disc, Building2, Eye, MessageCircle, Trash2 } from 'lucide-react';
import CoverDropzone from './cover-dropzone';
import AudioPlayer from './audio-player';
import AudioPlayerWithVersions from './audio-player-with-versions';
import { analyzeAudio, AudioAnalysisResult } from '@/lib/audio-analyzer';
import EmptyState from './ui/empty-state';

interface Studio {
  id: string;
  name: string;
  location: string;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; avatar?: string };
}

interface Track {
  id: string;
  title: string;
  artist: string;
  bpm?: number | null;
  key?: string | null;
  status: string;
  isPublic?: boolean;
  isShared?: boolean;
  audioUrl?: string | null;
  duration?: number | null;
  views?: number;
  studio?: { id: string; name: string } | null;
  createdAt: string;
  _count?: { comments: number };
  genre?: string | null;
  releaseDate?: string | null;
  spotifyUrl?: string | null;
  youtubeUrl?: string | null;
  appleMusicUrl?: string | null;
  deezerUrl?: string | null;
  versions?: { id: string; label: string | null; audioUrl: string | null; duration: number | null; createdAt: string }[];
}

interface TextItem {
  id: string;
  title: string;
  artist: string;
  content?: string | null;
  createdAt: string;
}

interface CreationsPageProps {
  isStudioMode?: boolean;
}

export default function CreationsPage({ isStudioMode = false }: CreationsPageProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [studios, setStudios] = useState<Studio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewTrack, setShowNewTrack] = useState(false);
  const [showNewText, setShowNewText] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'public' | 'private'>('all');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AudioAnalysisResult | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newTrack, setNewTrack] = useState({ 
    title: '', 
    artist: '', 
    bpm: '', 
    key: '', 
    studioId: '', 
    status: 'in_progress',
    isPublic: false 
  });
  const [newText, setNewText] = useState({ title: '', artist: '', content: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tracksRes, textsRes, studiosRes] = await Promise.all([
        fetch('/api/tracks'),
        fetch('/api/texts'),
        fetch('/api/studios')
      ]);
      const tracksData = await tracksRes.json();
      const textsData = await textsRes.json();
      const studiosData = await studiosRes.json();
      setTracks(tracksData.tracks || []);
      setTexts(textsData.texts || []);
      setStudios(studiosData.studios || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const AUDIO_EXTENSIONS = ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'webm'];

  const processFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const looksLikeAudio = file.type.startsWith('audio/') || (ext && AUDIO_EXTENSIONS.includes(ext));
    if (!looksLikeAudio) {
      alert('Veuillez sélectionner un fichier audio');
      return;
    }

    setUploadedFile(file);
    setAnalyzing(true);
    setAnalysisProgress('Lecture du fichier...');

    try {
      setTimeout(() => setAnalysisProgress('Analyse des fréquences...'), 500);
      setTimeout(() => setAnalysisProgress('Détection du tempo...'), 1500);
      setTimeout(() => setAnalysisProgress('Analyse de la tonalité...'), 2500);

      const result = await analyzeAudio(file);
      setAnalysisResult(result);

      setNewTrack(prev => ({
        ...prev,
        bpm: result.bpm.toString(),
        key: result.key,
        title: prev.title || file.name.replace(/\.[^/.]+$/, '')
      }));

      setAnalysisProgress('Analyse terminée !');
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisProgress('Erreur lors de l\'analyse');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingFile) setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleSubmitTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('title', newTrack.title);
    formData.append('artist', newTrack.artist);
    formData.append('bpm', newTrack.bpm || '');
    formData.append('key', newTrack.key || '');
    formData.append('studioId', newTrack.studioId || '');
    formData.append('status', newTrack.status);
    // Studio tracks are always private
    formData.append('isPublic', isStudioMode ? 'false' : newTrack.isPublic.toString());
    formData.append('duration', analysisResult?.duration?.toString() || '');
    formData.append('sampleRate', analysisResult?.sampleRate?.toString() || '');
    formData.append('bitDepth', analysisResult?.bitDepth?.toString() || '');
    formData.append('bitrate', analysisResult?.bitrate?.toString() || '');
    formData.append('audioFormat', analysisResult?.audioFormat || '');

    if (uploadedFile) {
      formData.append('audioFile', uploadedFile);
    }

    try {
      const res = await fetch('/api/tracks', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (coverFile && data.track?.id) {
          const coverFormData = new FormData();
          coverFormData.append('file', coverFile);
          await fetch(`/api/tracks/${data.track.id}/cover`, { method: 'POST', body: coverFormData });
        }
        setShowNewTrack(false);
        setNewTrack({
          title: '',
          artist: '',
          bpm: '',
          key: '',
          studioId: '',
          status: 'in_progress',
          isPublic: false
        });
        setUploadedFile(null);
        setCoverFile(null);
        setAnalysisResult(null);
        fetchData();
      }
    } catch (error) {
      console.error('Error creating track:', error);
    }
  };

  const handleSubmitText = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/texts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newText)
      });
      if (res.ok) {
        setShowNewText(false);
        setNewText({ title: '', artist: '', content: '' });
        fetchData();
      }
    } catch (error) {
      console.error('Error creating text:', error);
    }
  };

  const handleUpdateTrackStatus = async (id: string, status: string) => {
    try {
      await fetch('/api/tracks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      fetchData();
    } catch (error) {
      console.error('Error updating track:', error);
    }
  };

  const handleTogglePublic = async (id: string, isPublic: boolean) => {
    try {
      await fetch('/api/tracks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isPublic: !isPublic })
      });
      fetchData();
    } catch (error) {
      console.error('Error updating track:', error);
    }
  };

  const handleDeleteTrack = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette track ?')) return;
    
    try {
      const res = await fetch(`/api/tracks/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting track:', error);
    }
  };

  const handleUploadVersion = async (trackId: string, file: File, label: string) => {
    const formData = new FormData();
    formData.append('audioFile', file);
    formData.append('label', label);

    const res = await fetch(`/api/tracks/${trackId}/versions`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      throw new Error('Échec de l\'upload de la version');
    }
    fetchData();
  };

  const finishedTracks = tracks.filter(t => t.status === 'finished');
  const inProgressTracks = tracks.filter(t => t.status === 'in_progress');
  
  const filteredTracks = activeTab === 'all' 
    ? finishedTracks 
    : activeTab === 'public' 
      ? finishedTracks.filter(t => t.isPublic)
      : finishedTracks.filter(t => !t.isPublic);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">
            {isStudioMode ? 'Projets du Studio' : 'Mes Créations'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isStudioMode 
              ? 'Gérez les projets travaillés dans votre studio' 
              : 'Stockage sécurisé de vos titres musicaux'}
          </p>
        </div>
        <div className="hidden md:flex gap-2">
          <button
            onClick={() => setShowNewTrack(true)}
            className={`flex items-center gap-2 ${isStudioMode ? 'bg-[#f59e0b]' : 'bg-[#6366f1]'} text-white px-4 py-2 rounded-lg hover:opacity-90 transition-colors`}
          >
            <Music className="w-4 h-4" />
            {isStudioMode ? 'Nouveau projet' : 'Nouvelle track'}
          </button>
          <button
            onClick={() => setShowNewText(true)}
            className="flex items-center gap-2 bg-[#2a2a2a] text-white px-4 py-2 rounded-lg hover:bg-[#3a3a3a] transition-colors"
          >
            <FileText className="w-4 h-4" />
            Nouveau texte
          </button>
        </div>
      </div>

      {/* Tabs for public/private */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === 'all' 
              ? 'bg-[#6366f1] text-white' 
              : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
          }`}
        >
          <Music className="w-4 h-4" />
          Toutes ({finishedTracks.length})
        </button>
        <button
          onClick={() => setActiveTab('public')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === 'public' 
              ? 'bg-[#6366f1] text-white' 
              : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
          }`}
        >
          <Globe className="w-4 h-4" />
          Publiques ({finishedTracks.filter(t => t.isPublic).length})
        </button>
        <button
          onClick={() => setActiveTab('private')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === 'private' 
              ? 'bg-[#6366f1] text-white' 
              : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4" />
          Privées ({finishedTracks.filter(t => !t.isPublic).length})
        </button>
      </div>

      {/* Mobile Buttons */}
      <div className="md:hidden fixed bottom-24 right-6 z-30 flex flex-col gap-3">
        <button
          onClick={() => setShowNewText(true)}
          className="bg-[#2a2a2a] text-white p-4 rounded-full shadow-lg"
        >
          <FileText className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowNewTrack(true)}
          className="bg-[#6366f1] text-white p-4 rounded-full shadow-lg"
        >
          <Music className="w-5 h-5" />
        </button>
      </div>

      {/* New Track Modal */}
      {showNewTrack && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Nouvelle track</h2>
              <button onClick={() => {
                setShowNewTrack(false);
                setUploadedFile(null);
                setCoverFile(null);
                setAnalysisResult(null);
              }} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitTrack} className="space-y-4">
              {/* Pochette (optionnelle) */}
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Pochette (optionnel)</label>
                <CoverDropzone
                  onFileSelected={(file) => setCoverFile(file)}
                  onRemove={() => setCoverFile(null)}
                  accentColor="#6366f1"
                />
              </div>

              {/* Audio Upload Zone */}
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                {!uploadedFile ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`w-full border-2 border-dashed rounded-xl p-8 text-center transition-colors group ${
                      isDraggingFile ? 'border-[#6366f1] bg-[#6366f1]/10' : 'border-[#3a3a3a] hover:border-[#6366f1]'
                    }`}
                  >
                    <div className="w-16 h-16 bg-[#6366f1]/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[#6366f1]/30 transition-colors">
                      <Upload className="w-8 h-8 text-[#6366f1]" />
                    </div>
                    <p className="text-white font-medium mb-1">
                      {isDraggingFile ? 'Déposez le fichier ici' : 'Glissez-déposez votre fichier audio, ou cliquez'}
                    </p>
                    <p className="text-gray-500 text-sm">BPM, tonalité, fréquence, format & résolution automatiques</p>
                    <div className="flex items-center justify-center gap-2 mt-3">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span className="text-yellow-400 text-xs font-medium">Analyse automatique</span>
                    </div>
                  </button>
                ) : (
                  <div className="bg-[#2a2a2a] rounded-xl p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] rounded-xl flex items-center justify-center">
                        {analyzing ? (
                          <Loader2 className="w-7 h-7 text-white animate-spin" />
                        ) : (
                          <Disc className="w-7 h-7 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{uploadedFile.name}</p>
                        <p className="text-gray-500 text-sm">{(uploadedFile.size / 1024 / 1024).toFixed(2)} Mo</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedFile(null);
                          setAnalysisResult(null);
                          setNewTrack(prev => ({ ...prev, bpm: '', key: '' }));
                        }}
                        className="p-2 hover:bg-[#3a3a3a] rounded-lg text-gray-400"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {analyzing && (
                      <div className="mt-4 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-[#6366f1] animate-spin" />
                        <span className="text-gray-400 text-sm">{analysisProgress}</span>
                      </div>
                    )}

                    {analysisResult && !analyzing && (
                      <>
                        <div className="mt-4 grid grid-cols-3 gap-3">
                          <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-[#6366f1]">{analysisResult.bpm}</p>
                            <p className="text-gray-500 text-xs">BPM</p>
                          </div>
                          <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
                            <p className="text-lg font-bold text-green-400">{analysisResult.key}</p>
                            <p className="text-gray-500 text-xs">Tonalité</p>
                          </div>
                          <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
                            <p className="text-lg font-bold text-white">{Math.floor(analysisResult.duration / 60)}:{(analysisResult.duration % 60).toString().padStart(2, '0')}</p>
                            <p className="text-gray-500 text-xs">Durée</p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-3">
                          <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
                            <p className="text-sm font-bold text-white">{analysisResult.sampleRate.toLocaleString('fr-FR')} Hz</p>
                            <p className="text-gray-500 text-xs">Fréquence</p>
                          </div>
                          <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
                            <p className="text-sm font-bold text-white">{analysisResult.audioFormat}</p>
                            <p className="text-gray-500 text-xs">Format</p>
                          </div>
                          <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
                            <p className="text-sm font-bold text-white">
                              {analysisResult.bitDepth ? `${analysisResult.bitDepth}-bit` : analysisResult.bitrate ? `${analysisResult.bitrate} kbps` : '—'}
                            </p>
                            <p className="text-gray-500 text-xs">{analysisResult.bitDepth ? 'Résolution' : 'Débit (estimé)'}</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Titre *</label>
                  <input 
                    type="text" 
                    value={newTrack.title} 
                    onChange={(e) => setNewTrack({...newTrack, title: e.target.value})} 
                    className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a]" 
                    required 
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Artiste *</label>
                  <input 
                    type="text" 
                    value={newTrack.artist} 
                    onChange={(e) => setNewTrack({...newTrack, artist: e.target.value})} 
                    className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a]" 
                    required 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block flex items-center gap-1">
                    <Zap className="w-3 h-3 text-yellow-400" />
                    BPM
                  </label>
                  <input 
                    type="number" 
                    value={newTrack.bpm} 
                    onChange={(e) => setNewTrack({...newTrack, bpm: e.target.value})} 
                    className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a]" 
                    placeholder="Auto"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Tonalité</label>
                  <input 
                    type="text" 
                    value={newTrack.key} 
                    onChange={(e) => setNewTrack({...newTrack, key: e.target.value})} 
                    placeholder="Auto" 
                    className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a]" 
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Statut</label>
                  <select 
                    value={newTrack.status} 
                    onChange={(e) => setNewTrack({...newTrack, status: e.target.value})} 
                    className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a]"
                  >
                    <option value="in_progress">En cours</option>
                    <option value="finished">Terminé</option>
                  </select>
                </div>
              </div>
              
              {/* Studio Selection - Only for artist mode */}
              {!isStudioMode && (
                <div>
                  <label className="text-gray-400 text-sm mb-2 block flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-[#f59e0b]" />
                    Studio (où la track a été travaillée)
                  </label>
                  <select 
                    value={newTrack.studioId} 
                    onChange={(e) => setNewTrack({...newTrack, studioId: e.target.value})} 
                    className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a]"
                  >
                    <option value="">Sélectionner un studio</option>
                    {studios.map((studio) => (
                      <option key={studio.id} value={studio.id}>{studio.name} - {studio.location}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Public/Private toggle - Hidden in studio mode (always private) */}
              {!isStudioMode && (
                <div className="flex items-center justify-between bg-[#2a2a2a] rounded-lg p-4">
                  <div>
                    <p className="text-white font-medium flex items-center gap-2">
                      {newTrack.isPublic ? <Globe className="w-4 h-4 text-[#6366f1]" /> : <Lock className="w-4 h-4" />}
                      {newTrack.isPublic ? 'Publique' : 'Privée'}
                    </p>
                    <p className="text-gray-500 text-sm">
                      {newTrack.isPublic 
                        ? 'Visible par tous les utilisateurs' 
                        : 'Visible uniquement par vous et les personnes choisies'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewTrack({...newTrack, isPublic: !newTrack.isPublic})}
                    className={`relative w-14 h-8 rounded-full transition-colors ${
                      newTrack.isPublic ? 'bg-[#6366f1]' : 'bg-[#3a3a3a]'
                    }`}
                  >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${
                      newTrack.isPublic ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>
              )}

              {/* Studio mode info */}
              {isStudioMode && (
                <div className="flex items-center gap-3 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg p-4">
                  <Lock className="w-5 h-5 text-[#f59e0b]" />
                  <div>
                    <p className="text-white font-medium">Projet privé</p>
                    <p className="text-gray-400 text-sm">Les exports du studio sont automatiquement privés et sécurisés</p>
                  </div>
                </div>
              )}
              
              <button 
                type="submit" 
                className={`w-full ${isStudioMode ? 'bg-[#f59e0b]' : 'bg-[#6366f1]'} text-white py-3 rounded-lg font-medium hover:opacity-90 transition-colors flex items-center justify-center gap-2`}
              >
                <Save className="w-4 h-4" />
                {isStudioMode ? 'Enregistrer le projet' : 'Enregistrer la track'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* New Text Modal */}
      {showNewText && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Nouveau texte</h2>
              <button onClick={() => setShowNewText(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmitText} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Titre</label>
                  <input type="text" value={newText.title} onChange={(e) => setNewText({...newText, title: e.target.value})} className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a]" required />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Artiste</label>
                  <input type="text" value={newText.artist} onChange={(e) => setNewText({...newText, artist: e.target.value})} className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a]" required />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Contenu</label>
                <textarea value={newText.content} onChange={(e) => setNewText({...newText, content: e.target.value})} className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a] min-h-[150px]" />
              </div>
              <button type="submit" className="w-full bg-[#6366f1] text-white py-3 rounded-lg font-medium hover:bg-[#5558e3] transition-colors">Créer</button>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-8">
          {[1, 2].map(i => <div key={i} className="h-48 bg-[#1a1a1a] rounded-xl animate-pulse"></div>)}
        </div>
      ) : (
        <>
          {/* Finished Tracks */}
          {filteredTracks.length > 0 && (
            <div className="mb-8">
              <h2 className="text-gray-400 text-sm mb-4 flex items-center gap-2">
                <Music className="w-4 h-4" />
                Musiques terminées
              </h2>
              <div className="space-y-4">
                {filteredTracks.map((track) => (
                  track.versions && track.versions.length > 0 ? (
                    <AudioPlayerWithVersions
                      key={track.id}
                      trackId={track.id}
                      title={track.title}
                      artist={track.artist}
                      bpm={track.bpm}
                      keySignature={track.key}
                      duration={track.duration || 180}
                      audioUrl={track.audioUrl || undefined}
                      versions={track.versions.map(v => ({
                        id: v.id,
                        label: v.label || 'Version',
                        audioUrl: v.audioUrl,
                        duration: v.duration,
                        uploadedAt: v.createdAt,
                        notes: null
                      }))}
                      isPublic={track.isPublic}
                      isShared={track.isShared}
                      onTogglePublic={() => handleTogglePublic(track.id, track.isPublic || false)}
                      views={track.views}
                      studio={track.studio}
                      commentCount={track._count?.comments || 0}
                      hideStudio={isStudioMode}
                      onDelete={() => handleDeleteTrack(track.id)}
                      onUploadVersion={
                        !isStudioMode && !track.isShared
                          ? (file, label) => handleUploadVersion(track.id, file, label)
                          : undefined
                      }
                    />
                  ) : (
                    <AudioPlayer
                      key={track.id}
                      trackId={track.id}
                      title={track.title}
                      artist={track.artist}
                      bpm={track.bpm}
                      keySignature={track.key}
                      duration={track.duration || 180}
                      audioUrl={track.audioUrl || undefined}
                      isPublic={track.isPublic}
                      isShared={track.isShared}
                      onTogglePublic={() => handleTogglePublic(track.id, track.isPublic || false)}
                      views={track.views}
                      studio={track.studio}
                      commentCount={track._count?.comments || 0}
                      hideStudio={isStudioMode}
                      onDelete={() => handleDeleteTrack(track.id)}
                      status={track.status}
                      genre={track.genre}
                      releaseDate={track.releaseDate}
                      spotifyUrl={track.spotifyUrl}
                      youtubeUrl={track.youtubeUrl}
                      appleMusicUrl={track.appleMusicUrl}
                      deezerUrl={track.deezerUrl}
                      canEditRelease={!isStudioMode && !track.isShared}
                      onReleaseUpdate={fetchData}
                    />
                  )
                ))}
              </div>
            </div>
          )}

          {/* In Progress Tracks */}
          <div className="mb-8">
            <h2 className="text-gray-400 text-sm mb-4 flex items-center gap-2">
              <Music className="w-4 h-4" />
              Musiques en cours
            </h2>
            {inProgressTracks.length === 0 ? (
              <div className="bg-[#1a1a1a] rounded-xl">
                <EmptyState icon={Music} title="Aucune musique en cours" size="sm" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inProgressTracks.map((track) => (
                  <div key={track.id} className="bg-[#1a1a1a] rounded-xl p-5 border border-[#f59e0b]/30 hover:border-[#f59e0b]/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-[#f59e0b] to-[#ef4444] rounded-lg flex items-center justify-center">
                        <Music className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{track.artist}</p>
                        <p className="text-gray-400 text-sm truncate">{track.title}</p>
                        {track.studio && !isStudioMode && (
                          <p className="text-[#f59e0b] text-xs truncate">Studio: {track.studio.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {track.bpm && <span>{track.bpm} bpm</span>}
                        {track.key && <span>• {track.key}</span>}
                        {track.views !== undefined && (
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{track.views}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeleteTrack(track.id)}
                          className="text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded-full hover:bg-red-500/30"
                        >
                          Supprimer
                        </button>
                        <button
                          onClick={() => handleUpdateTrackStatus(track.id, 'finished')}
                          className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded-full hover:bg-green-500/30"
                        >
                          Marquer terminé
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Texts */}
          <div>
            <h2 className="text-gray-400 text-sm mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Textes
            </h2>
            {texts.length === 0 ? (
              <div className="bg-[#1a1a1a] rounded-xl">
                <EmptyState icon={FileText} title="Aucun texte enregistré" size="sm" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {texts.map((text) => (
                  <div key={text.id} className="bg-[#1a1a1a] rounded-xl p-5 border border-[#2a2a2a] hover:border-[#6366f1]/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-[#2a2a2a] rounded-lg flex items-center justify-center">
                        <FileText className="w-7 h-7 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{text.artist}</p>
                        <p className="text-gray-400 text-sm truncate">{text.title}</p>
                      </div>
                      <button className="p-2 hover:bg-[#2a2a2a] rounded-lg"><Pencil className="w-4 h-4 text-gray-400" /></button>
                    </div>
                    {text.content && (
                      <p className="text-gray-500 text-sm mt-3 line-clamp-2">{text.content}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
