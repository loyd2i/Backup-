'use client';

import { useEffect, useState, useRef } from 'react';
import { Music, FileText, Pencil, Plus, X, Save, Globe, Lock, Upload, Loader2, Zap, Disc, Building2, Eye, MessageCircle, Trash2, User, BarChart3, Coins } from 'lucide-react';
import CoverDropzone from './cover-dropzone';
import AudioPlayer from './audio-player';
import AudioPlayerWithVersions from './audio-player-with-versions';
import TrackShareButton from './track-share-button';
import TrackDownloadButton from './track-download-button';
import TrackQrCodeButton from './track-qrcode-button';
import TrackOnelibButton from './track-onelib-button';
import TrackNormalizeButton from './track-normalize-button';
import OnelibShareImageButton from './onelib-share-image-button';
import { analyzeAudio, getQuickAudioMetadata, AudioAnalysisResult, QuickAudioMetadata } from '@/lib/audio-analyzer';
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
  linkToken?: string | null;
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
  sampleRate?: number | null;
  bitDepth?: number | null;
  bitrate?: number | null;
  audioFormat?: string | null;
  truePeak?: number | null;
  lufs?: number | null;
  lra?: number | null;
  waveformPeaks?: string | null;
  versions?: {
    id: string; version: number; label: string | null; audioUrl: string | null; duration: number | null; createdAt: string;
    sampleRate?: number | null; bitDepth?: number | null; bitrate?: number | null; audioFormat?: string | null;
    truePeak?: number | null; lufs?: number | null; lra?: number | null; waveformPeaks?: string | null;
  }[];
  masterValidation?: MasterValidation | null;
  onelibRelease?: { id: string; slug: string; status?: string } | null;
  normalizationStatus?: string;
  coverUrl?: string | null;
}

interface MasterValidation {
  id: string;
  status: string; // pending, validated, rejected
  note?: string | null;
  feedback?: string | null;
  createdAt: string;
  respondedAt?: string | null;
  version: { id: string; version: number; label: string | null; audioUrl: string; duration: number | null };
  requestedBy?: { id: string; name: string } | null;
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
  const [activeTab, setActiveTab] = useState<'all' | 'public' | 'private' | 'stats'>('all');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AudioAnalysisResult | null>(null);
  const [quickMetadata, setQuickMetadata] = useState<QuickAudioMetadata | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Analyse complète (tempo, tonalité, loudness, waveform, style) en cours
  // pour le fichier sélectionné : ne bloque jamais la création de la track,
  // dont on complète les caractéristiques dès que la promesse se résout,
  // même si la fenêtre "Nouvelle track" est déjà refermée.
  const pendingAnalysisRef = useRef<Promise<AudioAnalysisResult> | null>(null);
  
  const [newTrack, setNewTrack] = useState({
    title: '',
    artist: '',
    bpm: '',
    key: '',
    genre: '',
    studioId: '',
    status: 'in_progress',
    isPublic: false,
    assignedArtistId: ''
  });
  // Clients du studio ayant une réservation confirmée/terminée : seuls eux
  // peuvent recevoir un dépôt direct de fichier dans leurs Créations (voir
  // BUSINESS-PLAN.md / vérification côté API dans /api/tracks).
  const [studioClients, setStudioClients] = useState<{ id: string; name: string }[]>([]);
  const [newText, setNewText] = useState({ title: '', artist: '', content: '' });
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editText, setEditText] = useState({ title: '', artist: '', content: '' });
  const [masterDraft, setMasterDraft] = useState<Record<string, string>>({});
  const [showRevisionFor, setShowRevisionFor] = useState<Record<string, boolean>>({});
  const [revisionDraft, setRevisionDraft] = useState<Record<string, string>>({});

  // Jetons de normalisation (voir BUSINESS-PLAN.md) : partagés par tous les
  // boutons "Normaliser" de la liste, chargés une seule fois ici.
  const [normalizationTokens, setNormalizationTokens] = useState(0);
  const [hasUnlimitedNormalization, setHasUnlimitedNormalization] = useState(false);

  // Part de l'artiste dans la cagnotte de dons Onelib (voir BUSINESS-PLAN.md
  // "Onelib streaming") : chargée une seule fois pour l'onglet Statistiques.
  const [onelibEarnings, setOnelibEarnings] = useState<{
    totalPool: number;
    totalEarnings: number;
    perTrack: { trackId: string; title: string; role: string; sharePercent: number; amount: number }[];
  }>({ totalPool: 0, totalEarnings: 0, perTrack: [] });

  useEffect(() => {
    fetchData();
    fetch('/api/onelib/subscription')
      .then((res) => res.json())
      .then((data) => {
        setNormalizationTokens(data.tokens || 0);
        setHasUnlimitedNormalization(!!data.unlimited);
      })
      .catch(() => {});

    if (!isStudioMode) {
      fetch('/api/onelib/earnings')
        .then((res) => res.json())
        .then((data) => setOnelibEarnings({
          totalPool: data.totalPool || 0,
          totalEarnings: data.totalEarnings || 0,
          perTrack: data.perTrack || [],
        }))
        .catch(() => {});
    }

    if (isStudioMode) {
      fetch('/api/appointments')
        .then((res) => res.json())
        .then((data) => {
          const appointments = data.appointments || [];
          const clientsById = new Map<string, { id: string; name: string }>();
          for (const appt of appointments) {
            if ((appt.status === 'confirmed' || appt.status === 'completed') && appt.user) {
              clientsById.set(appt.user.id, { id: appt.user.id, name: appt.user.name });
            }
          }
          setStudioClients(Array.from(clientsById.values()).sort((a, b) => a.name.localeCompare(b.name)));
        })
        .catch(() => {});
    }
  }, [isStudioMode]);

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
    setAnalysisResult(null);
    setQuickMetadata(null);
    setNewTrack(prev => ({ ...prev, title: prev.title || file.name.replace(/\.[^/.]+$/, '') }));

    // Métadonnées quasi instantanées (durée, format...) : pas besoin d'attendre
    // l'analyse complète pour les afficher ou pour pouvoir créer la track.
    getQuickAudioMetadata(file).then(setQuickMetadata).catch(() => {});

    // Analyse complète (tempo, tonalité, loudness, waveform, style) : lancée
    // en parallèle, sans bloquer le formulaire. Si l'utilisateur crée la
    // track avant qu'elle se termine, elle continue en arrière-plan et met
    // à jour la track une fois le résultat disponible (cf. handleSubmitTrack).
    setAnalyzing(true);
    setAnalysisProgress('Analyse en arrière-plan (tempo, tonalité, style...)');
    const analysisPromise = analyzeAudio(file);
    pendingAnalysisRef.current = analysisPromise;
    analysisPromise
      .then((result) => {
        setAnalysisResult(result);
        setNewTrack(prev => ({
          ...prev,
          bpm: prev.bpm || result.bpm.toString(),
          key: prev.key || result.key,
          genre: prev.genre || result.genre || '',
        }));
      })
      .catch((error) => {
        console.error('Analysis error:', error);
      })
      .finally(() => setAnalyzing(false));
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

    // Si l'artiste a déjà saisi le bpm/tonalité/genre à la main avant la fin
    // de l'analyse, on ne veut pas que le résultat auto-détecté vienne les
    // écraser plus tard une fois la track déjà créée.
    const hadManualBpm = !!newTrack.bpm;
    const hadManualKey = !!newTrack.key;
    const hadManualGenre = !!newTrack.genre;

    const formData = new FormData();
    formData.append('title', newTrack.title);
    formData.append('artist', newTrack.artist);
    formData.append('bpm', newTrack.bpm || '');
    formData.append('key', newTrack.key || '');
    formData.append('genre', newTrack.genre || '');
    formData.append('studioId', newTrack.studioId || '');
    formData.append('status', newTrack.status);
    // Studio tracks are always private
    formData.append('isPublic', isStudioMode ? 'false' : newTrack.isPublic.toString());
    if (isStudioMode && newTrack.assignedArtistId) {
      formData.append('assignedArtistId', newTrack.assignedArtistId);
    }
    // L'analyse complète n'a peut-être pas encore fini : on envoie ce qu'on a
    // (les métadonnées rapides suffisent à créer la track sans attendre),
    // le reste sera complété en arrière-plan une fois l'analyse terminée.
    formData.append('duration', (analysisResult?.duration ?? quickMetadata?.duration)?.toString() || '');
    formData.append('sampleRate', (analysisResult?.sampleRate ?? quickMetadata?.sampleRate)?.toString() || '');
    formData.append('bitDepth', (analysisResult?.bitDepth ?? quickMetadata?.bitDepth)?.toString() || '');
    formData.append('bitrate', (analysisResult?.bitrate ?? quickMetadata?.bitrate)?.toString() || '');
    formData.append('audioFormat', analysisResult?.audioFormat || quickMetadata?.audioFormat || '');
    formData.append('truePeak', analysisResult?.truePeak?.toString() || '');
    formData.append('lufs', analysisResult?.lufs?.toString() || '');
    formData.append('lra', analysisResult?.lra?.toString() || '');
    formData.append('waveformPeaks', analysisResult?.waveformPeaks ? JSON.stringify(analysisResult.waveformPeaks) : '');
    formData.append('instruments', analysisResult?.instruments && analysisResult.instruments.length > 0 ? JSON.stringify(analysisResult.instruments) : '');

    if (uploadedFile) {
      formData.append('audioFile', uploadedFile);
    }

    // Si l'analyse complète est toujours en cours, on la récupère maintenant :
    // sa promesse continuera de vivre même après la fermeture de la fenêtre.
    const stillPendingAnalysis = !analysisResult ? pendingAnalysisRef.current : null;

    try {
      const res = await fetch('/api/tracks', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        const newTrackId = data.track?.id;
        if (coverFile && newTrackId) {
          const coverFormData = new FormData();
          coverFormData.append('file', coverFile);
          await fetch(`/api/tracks/${newTrackId}/cover`, { method: 'POST', body: coverFormData });
        }
        setShowNewTrack(false);
        setNewTrack({
          title: '',
          artist: '',
          bpm: '',
          key: '',
          genre: '',
          studioId: '',
          status: 'in_progress',
          isPublic: false,
          assignedArtistId: ''
        });
        setUploadedFile(null);
        setCoverFile(null);
        setAnalysisResult(null);
        setQuickMetadata(null);
        fetchData();

        if (newTrackId && stillPendingAnalysis) {
          stillPendingAnalysis
            .then((result) => applyBackgroundAnalysis(newTrackId, result, { hadManualBpm, hadManualKey, hadManualGenre }))
            .catch((error) => console.error('Analyse en arrière-plan échouée:', error));
        }
      }
    } catch (error) {
      console.error('Error creating track:', error);
    }
  };

  // Complète une track déjà créée avec le résultat de l'analyse complète
  // (tempo, tonalité, loudness, waveform, style), une fois celle-ci terminée.
  const applyBackgroundAnalysis = async (
    trackId: string,
    result: AudioAnalysisResult,
    manual: { hadManualBpm: boolean; hadManualKey: boolean; hadManualGenre: boolean } = { hadManualBpm: false, hadManualKey: false, hadManualGenre: false }
  ) => {
    try {
      await fetch('/api/tracks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: trackId,
          bpm: manual.hadManualBpm ? undefined : result.bpm,
          key: manual.hadManualKey ? undefined : result.key,
          genre: manual.hadManualGenre ? undefined : (result.genre || undefined),
          duration: result.duration,
          sampleRate: result.sampleRate,
          bitDepth: result.bitDepth,
          bitrate: result.bitrate,
          audioFormat: result.audioFormat,
          truePeak: result.truePeak,
          lufs: result.lufs,
          lra: result.lra,
          waveformPeaks: JSON.stringify(result.waveformPeaks),
          instruments: result.instruments.length > 0 ? JSON.stringify(result.instruments) : undefined,
        })
      });
      fetchData();
    } catch (error) {
      console.error('Error applying background analysis:', error);
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

  const startEditText = (text: TextItem) => {
    setEditingTextId(text.id);
    setEditText({ title: text.title, artist: text.artist, content: text.content || '' });
  };

  const handleSaveEditText = async (id: string) => {
    if (!editText.title.trim() || !editText.artist.trim()) return;
    try {
      const res = await fetch('/api/texts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editText })
      });
      if (res.ok) {
        setEditingTextId(null);
        fetchData();
      }
    } catch (error) {
      console.error('Error updating text:', error);
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

  const handleSetVisibility = async (id: string, visibility: 'public' | 'link' | 'private') => {
    try {
      await fetch('/api/tracks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, visibility })
      });
      fetchData();
    } catch (error) {
      console.error('Error updating track visibility:', error);
    }
  };

  const handleRegenerateLink = async (id: string) => {
    try {
      await fetch('/api/tracks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, visibility: 'link', regenerateLink: true })
      });
      fetchData();
    } catch (error) {
      console.error('Error regenerating track link:', error);
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

    // Métadonnées rapides seulement (durée, format...) : la version est
    // uploadée tout de suite, sans attendre l'analyse complète (tempo,
    // tonalité, loudness, waveform), qui continue ensuite en arrière-plan.
    try {
      const quick = await getQuickAudioMetadata(file);
      formData.append('duration', quick.duration.toString());
      formData.append('sampleRate', quick.sampleRate?.toString() || '');
      formData.append('bitDepth', quick.bitDepth?.toString() || '');
      formData.append('bitrate', quick.bitrate?.toString() || '');
      formData.append('audioFormat', quick.audioFormat);
    } catch (e) {
      console.error('Lecture des métadonnées de la version échouée:', e);
    }

    const res = await fetch(`/api/tracks/${trackId}/versions`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      throw new Error('Échec de l\'upload de la version');
    }
    const data = await res.json();
    const versionId = data.version?.id;
    fetchData();

    if (versionId) {
      analyzeAudio(file)
        .then((analysis) => fetch(`/api/tracks/${trackId}/versions`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            versionId,
            duration: analysis.duration,
            sampleRate: analysis.sampleRate,
            bitDepth: analysis.bitDepth,
            bitrate: analysis.bitrate,
            audioFormat: analysis.audioFormat,
            truePeak: analysis.truePeak,
            lufs: analysis.lufs,
            lra: analysis.lra,
            waveformPeaks: JSON.stringify(analysis.waveformPeaks),
          })
        }))
        .then(() => fetchData())
        .catch((e) => console.error('Analyse en arrière-plan de la version échouée:', e));
    }
  };

  const handleProposeMaster = async (trackId: string) => {
    const versionId = masterDraft[trackId];
    if (!versionId) return;
    try {
      const res = await fetch(`/api/tracks/${trackId}/master-validation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      });
      if (res.ok) {
        setMasterDraft((prev) => ({ ...prev, [trackId]: '' }));
        fetchData();
      }
    } catch (error) {
      console.error('Error proposing master:', error);
    }
  };

  const handleValidateMaster = async (trackId: string) => {
    try {
      const res = await fetch(`/api/tracks/${trackId}/master-validation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate' }),
      });
      if (res.ok) fetchData();
    } catch (error) {
      console.error('Error validating master:', error);
    }
  };

  const handleRejectMaster = async (trackId: string) => {
    try {
      const res = await fetch(`/api/tracks/${trackId}/master-validation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', feedback: revisionDraft[trackId] || undefined }),
      });
      if (res.ok) {
        setRevisionDraft((prev) => ({ ...prev, [trackId]: '' }));
        setShowRevisionFor((prev) => ({ ...prev, [trackId]: false }));
        fetchData();
      }
    } catch (error) {
      console.error('Error rejecting master:', error);
    }
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
        {!isStudioMode && (
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === 'stats'
                ? 'bg-[#6366f1] text-white'
                : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Statistiques
          </button>
        )}
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
                    <p className="text-gray-500 text-sm">BPM, tonalité, genre, fréquence, format & résolution automatiques</p>
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
                          setQuickMetadata(null);
                          pendingAnalysisRef.current = null;
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
                        {analysisResult.genre && (
                          <div className="mt-3 bg-[#1a1a1a] rounded-lg p-3 text-center">
                            <p className="text-sm font-bold text-[#f59e0b]">{analysisResult.genre}</p>
                            <p className="text-gray-500 text-xs">Style musical détecté</p>
                          </div>
                        )}
                        {analysisResult.instruments && analysisResult.instruments.length > 0 && (
                          <div className="mt-3 bg-[#1a1a1a] rounded-lg p-3 text-center">
                            <p className="text-sm font-bold text-[#a78bfa]">{analysisResult.instruments.join(' · ')}</p>
                            <p className="text-gray-500 text-xs">Instruments détectés</p>
                          </div>
                        )}
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
              
              <div className="grid grid-cols-2 gap-4">
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
                  <label className="text-gray-400 text-sm mb-2 block">Genre</label>
                  <input
                    type="text"
                    value={newTrack.genre}
                    onChange={(e) => setNewTrack({...newTrack, genre: e.target.value})}
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

              {/* Attribution à un client - uniquement en mode studio */}
              {isStudioMode && (
                <div>
                  <label className="text-gray-400 text-sm mb-2 block flex items-center gap-1">
                    <User className="w-3 h-3 text-[#f59e0b]" />
                    Client (optionnel)
                  </label>
                  <select
                    value={newTrack.assignedArtistId}
                    onChange={(e) => setNewTrack({ ...newTrack, assignedArtistId: e.target.value })}
                    className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a]"
                  >
                    <option value="">Garder dans les projets du studio</option>
                    {studioClients.map((client) => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                  <p className="text-gray-500 text-sm mt-1">
                    {newTrack.assignedArtistId
                      ? 'Le fichier sera déposé directement dans les Créations de ce client'
                      : 'Seuls les clients ayant une réservation confirmée ou terminée apparaissent ici'}
                  </p>
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

      {activeTab === 'stats' && !isStudioMode && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-5">
              <p className="text-gray-500 text-sm flex items-center gap-1.5 mb-2"><Eye className="w-3.5 h-3.5" /> Écoutes totales</p>
              <p className="text-white text-2xl font-bold">
                {finishedTracks.reduce((sum, t) => sum + (t.views || 0), 0).toLocaleString('fr-FR')}
              </p>
            </div>
            <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-5">
              <p className="text-gray-500 text-sm flex items-center gap-1.5 mb-2"><Coins className="w-3.5 h-3.5" /> Cagnotte Onelib (tous artistes)</p>
              <p className="text-white text-2xl font-bold">{onelibEarnings.totalPool.toFixed(2)} €</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-5">
              <p className="text-gray-500 text-sm flex items-center gap-1.5 mb-2"><Coins className="w-3.5 h-3.5 text-[#6366f1]" /> Mes gains estimés</p>
              <p className="text-white text-2xl font-bold">{onelibEarnings.totalEarnings.toFixed(2)} €</p>
            </div>
          </div>

          {onelibEarnings.totalPool === 0 && (
            <p className="text-gray-500 text-sm bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
              La cagnotte Onelib n&apos;a pas encore reçu de dons réels : les montants affichés reflètent honnêtement 0€ tant que la collecte n&apos;est pas active. La répartition se fera au prorata des écoutes puis selon les parts déjà formalisées sur chaque titre.
            </p>
          )}

          <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] overflow-hidden">
            <div className="p-5 border-b border-[#2a2a2a]">
              <h2 className="text-white font-semibold">Détail par morceau</h2>
            </div>
            {finishedTracks.filter(t => t.onelibRelease?.status === 'published').length === 0 ? (
              <div className="p-5">
                <EmptyState icon={BarChart3} title="Aucun morceau publié sur Onelib pour l'instant" size="sm" />
              </div>
            ) : (
              <div className="divide-y divide-[#2a2a2a]">
                {finishedTracks.filter(t => t.onelibRelease?.status === 'published').map((track) => {
                  const lines = onelibEarnings.perTrack.filter(l => l.trackId === track.id);
                  const trackTotal = lines.reduce((sum, l) => sum + l.amount, 0);
                  return (
                    <div key={track.id} className="p-5 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-white font-medium">{track.title}</p>
                        <p className="text-gray-500 text-sm flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {(track.views || 0).toLocaleString('fr-FR')}</span>
                          {lines.length > 0
                            ? lines.map((l, i) => <span key={i}>{l.role} ({l.sharePercent.toFixed(0)}%)</span>)
                            : <span>Aucun gain pour l&apos;instant</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-white font-semibold">{trackTotal.toFixed(2)} €</p>
                        {track.onelibRelease && (
                          <OnelibShareImageButton
                            releaseId={track.onelibRelease.id}
                            title={track.title}
                            artistName={track.artist}
                            coverUrl={track.coverUrl}
                            waveformPeaks={track.waveformPeaks}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab !== 'stats' && (isLoading ? (
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
                  track.versions && track.versions.length > 0 && track.masterValidation?.status !== 'validated' ? (
                    <div key={track.id} className="relative">
                      <AudioPlayerWithVersions
                        trackId={track.id}
                        title={track.title}
                        artist={track.artist}
                        bpm={track.bpm}
                        keySignature={track.key}
                        duration={track.duration || 180}
                        audioUrl={track.audioUrl || undefined}
                        sampleRate={track.sampleRate}
                        bitDepth={track.bitDepth}
                        bitrate={track.bitrate}
                        audioFormat={track.audioFormat}
                        truePeak={track.truePeak}
                        lufs={track.lufs}
                        lra={track.lra}
                        waveformPeaks={track.waveformPeaks}
                        versions={track.versions.map(v => ({
                          id: v.id,
                          label: v.label || 'Version',
                          audioUrl: v.audioUrl,
                          duration: v.duration,
                          uploadedAt: v.createdAt,
                          notes: null,
                          sampleRate: v.sampleRate,
                          bitDepth: v.bitDepth,
                          bitrate: v.bitrate,
                          audioFormat: v.audioFormat,
                          truePeak: v.truePeak,
                          lufs: v.lufs,
                          lra: v.lra,
                          waveformPeaks: v.waveformPeaks,
                        }))}
                        isPublic={track.isPublic}
                        linkToken={track.linkToken}
                        isShared={track.isShared}
                        onSetVisibility={!isStudioMode ? (mode) => handleSetVisibility(track.id, mode) : undefined}
                        onRegenerateLink={!isStudioMode ? () => handleRegenerateLink(track.id) : undefined}
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
                      <div className="absolute top-5 right-5 z-10 flex items-center gap-1 bg-[#1a1a1a]/90 rounded-lg">
                        <TrackDownloadButton
                          title={track.title}
                          artist={track.artist}
                          audioUrl={track.audioUrl}
                          versions={track.versions}
                        />
                        {track.isPublic && (
                          <TrackQrCodeButton trackId={track.id} isPublic={track.isPublic} title={track.title} artist={track.artist} />
                        )}
                        {!track.isPublic && !track.isShared && (
                          <TrackShareButton trackId={track.id} />
                        )}
                        {!isStudioMode && !track.isShared && (
                          <TrackNormalizeButton
                            trackId={track.id}
                            audioUrl={track.audioUrl}
                            normalizationStatus={track.normalizationStatus}
                            tokens={normalizationTokens}
                            unlimited={hasUnlimitedNormalization}
                            onTokensChanged={(tokens, unlimited) => { setNormalizationTokens(tokens); setHasUnlimitedNormalization(unlimited); }}
                          />
                        )}
                        {!isStudioMode && !track.isShared && (
                          <TrackOnelibButton trackId={track.id} onelibReleaseId={track.onelibRelease?.id} />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div key={track.id} className="relative">
                      <AudioPlayer
                        trackId={track.id}
                        title={track.title}
                        artist={track.artist}
                        bpm={track.bpm}
                        keySignature={track.key}
                        duration={track.duration || 180}
                        audioUrl={track.audioUrl || undefined}
                        sampleRate={track.sampleRate}
                        bitDepth={track.bitDepth}
                        bitrate={track.bitrate}
                        audioFormat={track.audioFormat}
                        truePeak={track.truePeak}
                        lufs={track.lufs}
                        lra={track.lra}
                        waveformPeaks={track.waveformPeaks}
                        isPublic={track.isPublic}
                        linkToken={track.linkToken}
                        isShared={track.isShared}
                        onSetVisibility={!isStudioMode ? (mode) => handleSetVisibility(track.id, mode) : undefined}
                        onRegenerateLink={!isStudioMode ? () => handleRegenerateLink(track.id) : undefined}
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
                      <div className="absolute top-5 right-5 z-10 flex items-center gap-1 bg-[#1a1a1a]/90 rounded-lg">
                        <TrackDownloadButton title={track.title} artist={track.artist} audioUrl={track.audioUrl} />
                        {track.isPublic && (
                          <TrackQrCodeButton trackId={track.id} isPublic={track.isPublic} title={track.title} artist={track.artist} />
                        )}
                        {!track.isPublic && !track.isShared && (
                          <TrackShareButton trackId={track.id} />
                        )}
                        {!isStudioMode && !track.isShared && (
                          <TrackNormalizeButton
                            trackId={track.id}
                            audioUrl={track.audioUrl}
                            normalizationStatus={track.normalizationStatus}
                            tokens={normalizationTokens}
                            unlimited={hasUnlimitedNormalization}
                            onTokensChanged={(tokens, unlimited) => { setNormalizationTokens(tokens); setHasUnlimitedNormalization(unlimited); }}
                          />
                        )}
                        {!isStudioMode && !track.isShared && (
                          <TrackOnelibButton trackId={track.id} onelibReleaseId={track.onelibRelease?.id} />
                        )}
                      </div>
                    </div>
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

                    {/* Lecteur dès l'upload - pas besoin d'attendre "Terminé" pour écouter/travailler le morceau */}
                    <div className="mt-4">
                      {track.versions && track.versions.length > 0 ? (
                        <AudioPlayerWithVersions
                          trackId={track.id}
                          title={track.title}
                          artist={track.artist}
                          bpm={track.bpm}
                          keySignature={track.key}
                          duration={track.duration || 180}
                          audioUrl={track.audioUrl || undefined}
                          sampleRate={track.sampleRate}
                          bitDepth={track.bitDepth}
                          bitrate={track.bitrate}
                          audioFormat={track.audioFormat}
                          truePeak={track.truePeak}
                          lufs={track.lufs}
                          lra={track.lra}
                          waveformPeaks={track.waveformPeaks}
                          versions={track.versions.map(v => ({
                            id: v.id,
                            label: v.label || 'Version',
                            audioUrl: v.audioUrl,
                            duration: v.duration,
                            uploadedAt: v.createdAt,
                            notes: null,
                            sampleRate: v.sampleRate,
                            bitDepth: v.bitDepth,
                            bitrate: v.bitrate,
                            audioFormat: v.audioFormat,
                            truePeak: v.truePeak,
                            lufs: v.lufs,
                            lra: v.lra,
                            waveformPeaks: v.waveformPeaks,
                          }))}
                          isPublic={track.isPublic}
                          isShared={track.isShared}
                          views={track.views}
                          studio={track.studio}
                          commentCount={track._count?.comments || 0}
                          hideStudio={isStudioMode}
                          onUploadVersion={
                            !isStudioMode && !track.isShared
                              ? (file, label) => handleUploadVersion(track.id, file, label)
                              : undefined
                          }
                        />
                      ) : (
                        <AudioPlayer
                          trackId={track.id}
                          title={track.title}
                          artist={track.artist}
                          bpm={track.bpm}
                          keySignature={track.key}
                          duration={track.duration || 180}
                          audioUrl={track.audioUrl || undefined}
                          sampleRate={track.sampleRate}
                          bitDepth={track.bitDepth}
                          bitrate={track.bitrate}
                          audioFormat={track.audioFormat}
                          truePeak={track.truePeak}
                          lufs={track.lufs}
                          lra={track.lra}
                          waveformPeaks={track.waveformPeaks}
                          isPublic={track.isPublic}
                          isShared={track.isShared}
                          views={track.views}
                          studio={track.studio}
                          commentCount={track._count?.comments || 0}
                          hideStudio={isStudioMode}
                          status={track.status}
                        />
                      )}
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

                    {/* Studio : proposer une version comme master final */}
                    {isStudioMode && track.versions && track.versions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[#3a3a3a]/50">
                        {track.masterValidation?.status === 'pending' ? (
                          <p className="text-xs text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
                            En attente de validation par l'artiste — « {track.masterValidation.version.label || `V${track.masterValidation.version.version}`} »
                          </p>
                        ) : (
                          <>
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                value={masterDraft[track.id] || ''}
                                onChange={(e) => setMasterDraft((prev) => ({ ...prev, [track.id]: e.target.value }))}
                                className="flex-1 min-w-[140px] bg-[#2a2a2a] text-white text-xs rounded-lg px-2 py-1.5 border border-[#3a3a3a] focus:outline-none focus:border-[#f59e0b]"
                              >
                                <option value="">Choisir une version…</option>
                                {track.versions.map((v) => (
                                  <option key={v.id} value={v.id}>{v.label || `V${v.version}`}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleProposeMaster(track.id)}
                                disabled={!masterDraft[track.id]}
                                className="text-xs bg-[#f59e0b]/20 text-[#f59e0b] px-3 py-1.5 rounded-full hover:bg-[#f59e0b]/30 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                              >
                                Proposer comme master final
                              </button>
                            </div>
                            {track.masterValidation?.status === 'rejected' && (
                              <p className="text-xs text-red-400 mt-2">
                                Révision demandée{track.masterValidation.feedback ? ` : "${track.masterValidation.feedback}"` : ''}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Artiste : valider ou renvoyer le master proposé par le studio */}
                    {!isStudioMode && track.masterValidation?.status === 'pending' && (
                      <div className="mt-3 pt-3 border-t border-[#3a3a3a]/50">
                        <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg p-3">
                          <p className="text-xs text-white font-medium mb-2">
                            {track.studio?.name || 'Le studio'} propose un master final : « {track.masterValidation.version.label || `V${track.masterValidation.version.version}`} »
                          </p>
                          {track.masterValidation.note && (
                            <p className="text-xs text-gray-400 mb-2">« {track.masterValidation.note} »</p>
                          )}
                          <audio controls src={track.masterValidation.version.audioUrl} className="w-full h-8 mb-2" />
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => handleValidateMaster(track.id)}
                              className="text-xs bg-green-500/20 text-green-400 px-3 py-1.5 rounded-full hover:bg-green-500/30"
                            >
                              Valider le master
                            </button>
                            <button
                              onClick={() => setShowRevisionFor((prev) => ({ ...prev, [track.id]: !prev[track.id] }))}
                              className="text-xs bg-[#2a2a2a] text-gray-300 px-3 py-1.5 rounded-full hover:bg-[#3a3a3a]"
                            >
                              Demander une révision
                            </button>
                          </div>
                          {showRevisionFor[track.id] && (
                            <div className="mt-2 flex gap-2">
                              <input
                                type="text"
                                value={revisionDraft[track.id] || ''}
                                onChange={(e) => setRevisionDraft((prev) => ({ ...prev, [track.id]: e.target.value }))}
                                placeholder="Ce qui doit être revu (optionnel)"
                                className="flex-1 bg-[#2a2a2a] text-white text-xs rounded-lg px-2 py-1.5 border border-[#3a3a3a] focus:outline-none focus:border-[#f59e0b]"
                              />
                              <button
                                onClick={() => handleRejectMaster(track.id)}
                                className="text-xs bg-red-500/20 text-red-400 px-3 py-1.5 rounded-full hover:bg-red-500/30 whitespace-nowrap"
                              >
                                Envoyer
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
                    {editingTextId === text.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editText.artist}
                          onChange={(e) => setEditText({ ...editText, artist: e.target.value })}
                          placeholder="Artiste"
                          className="w-full bg-[#2a2a2a] text-white rounded-lg p-2 border border-[#3a3a3a] focus:outline-none focus:border-[#6366f1] text-sm font-medium"
                        />
                        <input
                          type="text"
                          value={editText.title}
                          onChange={(e) => setEditText({ ...editText, title: e.target.value })}
                          placeholder="Titre"
                          className="w-full bg-[#2a2a2a] text-white rounded-lg p-2 border border-[#3a3a3a] focus:outline-none focus:border-[#6366f1] text-sm"
                        />
                        <textarea
                          value={editText.content}
                          onChange={(e) => setEditText({ ...editText, content: e.target.value })}
                          placeholder="Contenu"
                          className="w-full bg-[#2a2a2a] text-white rounded-lg p-2 border border-[#3a3a3a] focus:outline-none focus:border-[#6366f1] text-sm min-h-[80px]"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEditText(text.id)}
                            className="text-xs bg-[#6366f1] text-white px-3 py-1.5 rounded-lg hover:bg-[#5558e3]"
                          >
                            Enregistrer
                          </button>
                          <button
                            onClick={() => setEditingTextId(null)}
                            className="text-xs bg-[#2a2a2a] text-white px-3 py-1.5 rounded-lg hover:bg-[#3a3a3a]"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-[#2a2a2a] rounded-lg flex items-center justify-center">
                            <FileText className="w-7 h-7 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{text.artist}</p>
                            <p className="text-gray-400 text-sm truncate">{text.title}</p>
                          </div>
                          <button onClick={() => startEditText(text)} className="p-2 hover:bg-[#2a2a2a] rounded-lg">
                            <Pencil className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                        {text.content && (
                          <p className="text-gray-500 text-sm mt-3 line-clamp-2">{text.content}</p>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ))}
    </div>
  );
}
