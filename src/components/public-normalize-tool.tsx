'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { analyzeAudio, AudioAnalysisResult, formatDuration } from '@/lib/audio-analyzer';
import { generateStreamingPreview, encodeWav } from '@/lib/loudness-normalizer';
import { startRealtimePrint, finalizeRealtimePrint, PrintSession } from '@/lib/realtime-print';
import { Upload, Play, Pause, Loader2, Download, Music, Zap, Check, Disc, Settings2 } from 'lucide-react';

// Mesures affichées du résultat (extrait 30s pour un import, prise entière
// pour un print) - jamais de valeurs théoriques, toujours mesurées.
interface NormalizationMetrics {
  startSeconds: number;
  lufs: number;
  lra: number;
  truePeak: number;
  appliedGainDb: number;
}

// Tarif de l'export en usage libre (visiteur anonyme, sans compte) : simulé
// (pas de vrai Stripe), montant provisoire en attendant l'arbitrage final.
// Gratuit et illimité pour la génération/écoute A/B, quel que soit le
// visiteur ; seul le téléchargement du fichier est concerné, et seulement
// pour un visiteur non connecté (gratuit dès qu'on a un compte).
const FREE_TOOL_EXPORT_FEE = 4;

type Step = 'upload' | 'analyzing' | 'result';

interface PublicNormalizeToolProps {
  // Rebascule dans l'app authentifiée (quitte le mode "page publique") une
  // fois la track ajoutée à Créations - que ce soit après une inscription
  // faite depuis l'outil, ou pour un visiteur déjà connecté.
  onDoneGoToApp?: () => void;
}

export default function PublicNormalizeTool({ onDoneGoToApp }: PublicNormalizeToolProps) {
  const isLoggedIn = useAppStore((state) => state.isLoggedIn);
  const user = useAppStore((state) => state.user);
  const login = useAppStore((state) => state.login);
  const setCurrentPage = useAppStore((state) => state.setCurrentPage);
  const setPendingProfileEdit = useAppStore((state) => state.setPendingProfileEdit);

  const [step, setStep] = useState<Step>('upload');
  const [uploadTab, setUploadTab] = useState<'file' | 'print'>('file');
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AudioAnalysisResult | null>(null);
  const [preview, setPreview] = useState<NormalizationMetrics | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Provenance du résultat affiché : import de fichier (extrait 30s A/B), ou
  // print temps réel (prise entière, avant/après le limiteur) - change le
  // comportement de lecture A/B (pas de découpe à 30s pour un print) et les
  // libellés de l'écran de résultat.
  const [source, setSource] = useState<'upload' | 'print'>('upload');

  // Print temps réel : source audio (micro par défaut, ou un pilote de
  // bouclage virtuel type BlackHole/VB-Audio Cable si l'utilisateur y a
  // routé la sortie master de son logiciel - Logic ou autre) - aucune API
  // web ne permettant d'accéder autrement à la sortie d'un logiciel tiers.
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioInputId, setSelectedAudioInputId] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const printSessionRef = useRef<PrintSession | null>(null);
  const printStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [abMode, setAbMode] = useState<'original' | 'normalized'>('normalized');
  const [abPlaying, setAbPlaying] = useState(false);
  const originalAudioRef = useRef<HTMLAudioElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);

  const [isAddingToCreations, setIsAddingToCreations] = useState(false);
  const [addedToCreations, setAddedToCreations] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [signupForm, setSignupForm] = useState({ name: '', email: '', password: '' });
  const [isSubmittingSignup, setIsSubmittingSignup] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('upload');
    setUploadTab('file');
    setSource('upload');
    setFile(null);
    setAnalysis(null);
    setPreview(null);
    setOriginalUrl(null);
    setPreviewUrl(null);
    setPreviewBlob(null);
    setError(null);
    setAddedToCreations(false);
    setShowSignup(false);
  };

  const processFile = async (selectedFile: File) => {
    if (!selectedFile.type.startsWith('audio/')) {
      setError('Merci de choisir un fichier audio.');
      return;
    }
    setSource('upload');
    setFile(selectedFile);
    setStep('analyzing');
    setError(null);

    try {
      const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      const [analysisResult, decoded] = await Promise.all([
        analyzeAudio(selectedFile),
        (async () => {
          const arrayBuffer = await selectedFile.arrayBuffer();
          const audioContext = new AudioContextCtor();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const channels: Float32Array[] = [];
          for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) channels.push(audioBuffer.getChannelData(ch));
          return { channels, sampleRate: audioBuffer.sampleRate };
        })(),
      ]);

      const previewResult = generateStreamingPreview(decoded.channels, decoded.sampleRate);
      const wavBlob = encodeWav(previewResult.channels, previewResult.sampleRate);

      setAnalysis(analysisResult);
      setPreview({
        startSeconds: previewResult.startSeconds,
        lufs: previewResult.lufs,
        lra: previewResult.lra,
        truePeak: previewResult.truePeak,
        appliedGainDb: previewResult.appliedGainDb,
      });
      setPreviewBlob(wavBlob);
      setOriginalUrl(URL.createObjectURL(selectedFile));
      setPreviewUrl(URL.createObjectURL(wavBlob));
      setStep('result');
    } catch (e) {
      console.error('Erreur analyse/normalisation:', e);
      setError("Impossible d'analyser ce fichier. Essaie un autre format (WAV, MP3, FLAC...).");
      setStep('upload');
    }
  };

  // ─── Print temps réel (micro, ou pilote de bouclage virtuel) ───
  const refreshAudioInputDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioInputDevices(devices.filter((d) => d.kind === 'audioinput'));
    } catch (e) {
      console.error('Error listing audio devices:', e);
    }
  };

  useEffect(() => {
    refreshAudioInputDevices();
    navigator.mediaDevices?.addEventListener?.('devicechange', refreshAudioInputDevices);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', refreshAudioInputDevices);
  }, []);

  const startPrint = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedAudioInputId ? { deviceId: { exact: selectedAudioInputId } } : true,
      });
      printStreamRef.current = stream;
      printSessionRef.current = startRealtimePrint(stream);
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
      refreshAudioInputDevices();
    } catch (e) {
      console.error('Error starting print:', e);
      setError('Source audio indisponible ou autorisation refusée.');
    }
  };

  const stopPrint = async () => {
    if (!printSessionRef.current) return;
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setStep('analyzing');
    setError(null);
    try {
      const rawBlob = await printSessionRef.current.stop();
      printSessionRef.current = null;
      printStreamRef.current?.getTracks().forEach((t) => t.stop());
      printStreamRef.current = null;

      const finalized = await finalizeRealtimePrint(rawBlob);
      const stamp = new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      const wavFile = new File([finalized.wavBlob], `Print du ${stamp}.wav`, { type: 'audio/wav' });
      const analysisResult = await analyzeAudio(wavFile);

      setSource('print');
      setFile(wavFile);
      setAnalysis(analysisResult);
      setPreview({
        startSeconds: 0,
        lufs: finalized.lufs,
        lra: finalized.lra,
        truePeak: finalized.truePeak,
        appliedGainDb: finalized.appliedGainDb,
      });
      setPreviewBlob(finalized.wavBlob);
      setOriginalUrl(URL.createObjectURL(rawBlob));
      setPreviewUrl(URL.createObjectURL(finalized.wavBlob));
      setStep('result');
    } catch (e) {
      console.error('Erreur finalisation print:', e);
      setError('Impossible de mettre cette prise aux normes.');
      setStep('upload');
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

  const switchAbMode = (mode: 'original' | 'normalized') => {
    if (mode === abMode) return;
    const wasPlaying = abPlaying;
    originalAudioRef.current?.pause();
    previewAudioRef.current?.pause();
    if (originalAudioRef.current && preview) originalAudioRef.current.currentTime = preview.startSeconds;
    if (previewAudioRef.current) previewAudioRef.current.currentTime = 0;
    setAbMode(mode);
    if (wasPlaying) (mode === 'normalized' ? previewAudioRef : originalAudioRef).current?.play();
  };

  const toggleAbPlay = () => {
    const ref = abMode === 'normalized' ? previewAudioRef : originalAudioRef;
    if (!ref.current) return;
    if (abPlaying) {
      ref.current.pause();
      setAbPlaying(false);
      return;
    }
    if (abMode === 'original' && preview) ref.current.currentTime = preview.startSeconds;
    ref.current.play();
    setAbPlaying(true);
  };

  const handleOriginalTimeUpdate = () => {
    // La découpe à 30s ne concerne que l'extrait d'un import de fichier -
    // un print se joue sur toute sa durée (arrêt naturel via onEnded).
    if (source !== 'upload' || !originalAudioRef.current || !preview) return;
    if (originalAudioRef.current.currentTime >= preview.startSeconds + 30) {
      originalAudioRef.current.pause();
      setAbPlaying(false);
    }
  };

  const handleDownload = () => {
    if (!previewBlob) return;
    if (!isLoggedIn) {
      const ok = confirm(
        `Télécharger ce fichier normalisé sans compte coûte ${FREE_TOOL_EXPORT_FEE}€ (usage libre). ` +
        `Crée un compte Studiolib gratuit pour l'exporter sans frais. Continuer le téléchargement payant ?`
      );
      if (!ok) return;
    }
    const url = URL.createObjectURL(previewBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(file?.name || 'apercu').replace(/\.[^/.]+$/, '')}-normalise.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const createTrackFromAnalysis = async (artistName: string) => {
    if (!file || !analysis) return null;
    const formData = new FormData();
    formData.append('title', file.name.replace(/\.[^/.]+$/, ''));
    formData.append('artist', artistName);
    formData.append('bpm', analysis.bpm.toString());
    formData.append('key', analysis.key);
    formData.append('genre', analysis.genre || '');
    formData.append('studioId', '');
    formData.append('status', 'in_progress');
    formData.append('isPublic', 'false');
    formData.append('duration', analysis.duration.toString());
    formData.append('sampleRate', analysis.sampleRate.toString());
    formData.append('bitDepth', analysis.bitDepth?.toString() || '');
    formData.append('bitrate', analysis.bitrate?.toString() || '');
    formData.append('audioFormat', analysis.audioFormat);
    formData.append('truePeak', analysis.truePeak.toString());
    formData.append('lufs', analysis.lufs.toString());
    formData.append('lra', analysis.lra.toString());
    formData.append('waveformPeaks', JSON.stringify(analysis.waveformPeaks));
    formData.append('instruments', analysis.instruments.length > 0 ? JSON.stringify(analysis.instruments) : '');
    formData.append('audioFile', file);

    const res = await fetch('/api/tracks', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur lors de la création de la track');
    return data.track;
  };

  const handleAddToCreations = async () => {
    setIsAddingToCreations(true);
    setError(null);
    try {
      await createTrackFromAnalysis(user?.name || '');
      setAddedToCreations(true);
      setCurrentPage('creations');
      onDoneGoToApp?.();
    } catch (e) {
      console.error('Error adding to creations:', e);
      setError(e instanceof Error ? e.message : "Erreur lors de l'ajout à Créations");
    } finally {
      setIsAddingToCreations(false);
    }
  };

  const handleSignupAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingSignup(true);
    setSignupError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...signupForm, role: 'artiste' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la création du compte');

      login(data.user);
      await createTrackFromAnalysis(signupForm.name);
      // Direction l'édition du profil (photo, bio, réseaux) : la track est
      // déjà dans Créations, prête, mais la fiche artiste reste à compléter
      // avant de pouvoir la partager.
      setPendingProfileEdit(true);
      setCurrentPage('reglages');
      onDoneGoToApp?.();
    } catch (e) {
      console.error('Error signing up:', e);
      setSignupError(e instanceof Error ? e.message : "Erreur lors de l'inscription");
    } finally {
      setIsSubmittingSignup(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212]">
      <div className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(139,92,246,0.04) 0%, transparent 50%)'
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src="/logo-icon.png" alt="" width={28} height={28} />
          <img src="/logo-text.png" alt="Studiolib" width={110} height={38} />
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[#6366f1]/10 text-[#6366f1] px-3 py-1 rounded-full text-xs font-medium mb-4">
            <Zap className="w-3.5 h-3.5" /> Outil gratuit et illimité, sans compte
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Aperçu streaming normalisé</h1>
          <p className="text-gray-400 mt-2 max-w-lg mx-auto">
            Écoute en A/B ce que ton master donnera réellement une fois en ligne (mise à niveau
            de loudness aux normes streaming + protection anti-écrêtage), et récupère tes
            données techniques (tempo, tonalité, style, LUFS, LRA, crête). Pas de mastering IA :
            juste la mise à niveau que les plateformes appliqueront de toute façon.
          </p>
        </div>

        {step === 'upload' && (
          <>
            <div className="flex items-center gap-1 bg-[#1a1a1a] rounded-lg p-1 mb-4 w-fit mx-auto">
              <button
                onClick={() => setUploadTab('file')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${uploadTab === 'file' ? 'bg-[#2a2a2a] text-white' : 'text-gray-500 hover:text-white'}`}
              >
                Importer un fichier
              </button>
              <button
                onClick={() => setUploadTab('print')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${uploadTab === 'print' ? 'bg-[#2a2a2a] text-white' : 'text-gray-500 hover:text-white'}`}
              >
                <Disc className="w-3.5 h-3.5" /> Print (enregistrer en direct)
              </button>
            </div>

            {uploadTab === 'file' ? (
              <>
                <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileInput} className="hidden" />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
                    isDragging ? 'border-[#6366f1] bg-[#6366f1]/10' : 'border-[#3a3a3a] hover:border-[#6366f1]'
                  }`}
                >
                  <div className="w-16 h-16 bg-[#6366f1]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-[#6366f1]" />
                  </div>
                  <p className="text-white font-medium mb-1">
                    {isDragging ? 'Dépose le fichier ici' : 'Glisse ton fichier audio, ou clique'}
                  </p>
                  <p className="text-gray-500 text-sm">WAV, MP3, FLAC, AAC... Rien n&apos;est envoyé à un serveur pour l&apos;analyse.</p>
                </div>
              </>
            ) : (
              <div className="border-2 border-dashed border-[#3a3a3a] rounded-2xl p-12 text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isRecording ? 'bg-red-600/20' : 'bg-[#6366f1]/20'}`}>
                  <Disc className={`w-8 h-8 ${isRecording ? 'text-red-500 animate-pulse' : 'text-[#6366f1]'}`} />
                </div>

                {!isRecording ? (
                  <>
                    {audioInputDevices.length > 1 && (
                      <div className="flex items-center justify-center gap-1.5 mb-4">
                        <Settings2 className="w-3.5 h-3.5 text-gray-500" />
                        <select
                          value={selectedAudioInputId}
                          onChange={(e) => setSelectedAudioInputId(e.target.value)}
                          className="bg-[#12121a] text-white text-xs rounded-lg px-2 py-1.5 outline-none max-w-[220px]"
                        >
                          <option value="">Micro par défaut</option>
                          {audioInputDevices.map((d) => (
                            <option key={d.deviceId} value={d.deviceId}>{d.label || 'Entrée audio'}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <button
                      onClick={startPrint}
                      className="bg-[#6366f1] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#5558e3] transition-colors"
                    >
                      Démarrer le print
                    </button>
                    <p className="text-gray-500 text-sm mt-3 max-w-sm mx-auto">
                      Micro, ou pilote de bouclage virtuel (BlackHole, VB-Audio Cable...) si tu y as
                      routé la sortie master de ton logiciel (Logic ou autre) - le résultat sera
                      remis aux normes streaming automatiquement à l&apos;arrêt.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-white font-medium mb-3">Enregistrement... {formatDuration(recordingSeconds)}</p>
                    <button
                      onClick={stopPrint}
                      className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                      Arrêter le print
                    </button>
                  </>
                )}
              </div>
            )}
            {error && <p className="text-red-400 text-sm text-center mt-4">{error}</p>}
          </>
        )}

        {step === 'analyzing' && (
          <div className="border border-[#2a2a2a] rounded-2xl p-12 text-center bg-[#1a1a1a]">
            <Loader2 className="w-10 h-10 text-[#6366f1] animate-spin mx-auto mb-4" />
            <p className="text-white font-medium">{source === 'print' ? 'Mise aux normes du print...' : 'Analyse en cours...'}</p>
            <p className="text-gray-500 text-sm mt-1">{file?.name}</p>
          </div>
        )}

        {step === 'result' && analysis && preview && (
          <div className="space-y-6">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] rounded-xl flex items-center justify-center flex-shrink-0">
                  <Music className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">{file?.name}</p>
                  <p className="text-gray-500 text-xs">{formatDuration(analysis.duration)} · {analysis.audioFormat}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center mb-2">
                <div className="bg-[#12121a] rounded-lg py-2 px-1">
                  <p className="text-white text-sm font-semibold">{analysis.bpm}</p>
                  <p className="text-gray-500 text-[10px] mt-0.5">BPM</p>
                </div>
                <div className="bg-[#12121a] rounded-lg py-2 px-1">
                  <p className="text-white text-sm font-semibold">{analysis.key}</p>
                  <p className="text-gray-500 text-[10px] mt-0.5">Tonalité</p>
                </div>
                <div className="bg-[#12121a] rounded-lg py-2 px-1">
                  <p className="text-white text-sm font-semibold truncate">{analysis.genre || '—'}</p>
                  <p className="text-gray-500 text-[10px] mt-0.5">Style</p>
                </div>
                <div className="bg-[#12121a] rounded-lg py-2 px-1">
                  <p className="text-white text-sm font-semibold">{preview.lufs.toFixed(1)}</p>
                  <p className="text-gray-500 text-[10px] mt-0.5">LUFS (normalisé)</p>
                </div>
                <div className="bg-[#12121a] rounded-lg py-2 px-1">
                  <p className="text-white text-sm font-semibold">{preview.lra.toFixed(1)}</p>
                  <p className="text-gray-500 text-[10px] mt-0.5">LRA</p>
                </div>
                <div className="bg-[#12121a] rounded-lg py-2 px-1">
                  <p className="text-white text-sm font-semibold">{preview.truePeak.toFixed(1)}</p>
                  <p className="text-gray-500 text-[10px] mt-0.5">Crête dBTP</p>
                </div>
              </div>
              {analysis.instruments.length > 0 && (
                <p className="text-gray-500 text-xs mt-2">Instruments détectés : {analysis.instruments.join(' · ')}</p>
              )}
            </div>

            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
              <div className="flex items-center gap-1 bg-[#12121a] rounded-lg p-1 mb-4 w-fit">
                <button
                  onClick={() => switchAbMode('original')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${abMode === 'original' ? 'bg-[#2a2a2a] text-white' : 'text-gray-500 hover:text-white'}`}
                >
                  {source === 'print' ? 'Brut (avant print)' : 'Original'}
                </button>
                <button
                  onClick={() => switchAbMode('normalized')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${abMode === 'normalized' ? 'bg-[#2a2a2a] text-white' : 'text-gray-500 hover:text-white'}`}
                >
                  {source === 'print' ? 'Print (aux normes)' : 'Normalisé (streaming)'}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleAbPlay}
                  className="w-12 h-12 rounded-full bg-[#6366f1] flex items-center justify-center text-white flex-shrink-0"
                >
                  {abPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
                <p className="text-gray-400 text-sm">
                  {source === 'print'
                    ? (abMode === 'original' ? 'La prise telle que captée, avant mise aux normes.' : 'La même prise, remise aux normes streaming (gain + anti-écrêtage).')
                    : (abMode === 'original' ? "Le passage tel qu'il sonne aujourd'hui sur ton fichier." : 'Ce que les plateformes en feront réellement une fois en ligne.')}
                </p>
              </div>
              {originalUrl && (
                <audio ref={originalAudioRef} src={originalUrl} onTimeUpdate={handleOriginalTimeUpdate} onEnded={() => setAbPlaying(false)} />
              )}
              {previewUrl && <audio ref={previewAudioRef} src={previewUrl} onEnded={() => setAbPlaying(false)} />}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 bg-[#2a2a2a] text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-[#3a3a3a] transition-colors"
              >
                <Download className="w-4 h-4" />
                {isLoggedIn ? 'Télécharger le fichier normalisé' : `Télécharger — ${FREE_TOOL_EXPORT_FEE}€ (ou crée un compte, c'est gratuit)`}
              </button>
              <button onClick={reset} className="text-gray-500 hover:text-white text-sm px-4 py-3">
                {source === 'print' ? 'Faire un autre print' : 'Analyser un autre fichier'}
              </button>
            </div>

            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
              {isLoggedIn ? (
                addedToCreations ? (
                  <p className="text-green-400 text-sm flex items-center gap-2">
                    <Check className="w-4 h-4" /> Ajoutée à tes Créations !
                  </p>
                ) : (
                  <button
                    onClick={handleAddToCreations}
                    disabled={isAddingToCreations}
                    className="w-full flex items-center justify-center gap-2 bg-[#6366f1] text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-[#5558e3] transition-colors disabled:opacity-50"
                  >
                    {isAddingToCreations ? <Loader2 className="w-4 h-4 animate-spin" /> : <Music className="w-4 h-4" />}
                    {isAddingToCreations ? 'Ajout en cours...' : 'Ajouter à mes Créations'}
                  </button>
                )
              ) : !showSignup ? (
                <>
                  <p className="text-white font-medium mb-1">Envie de la garder ?</p>
                  <p className="text-gray-500 text-sm mb-3">
                    Crée un compte Studiolib gratuit : ta track y sera déjà, prête à compléter (photo,
                    description, réseaux) et à partager.
                  </p>
                  <button
                    onClick={() => setShowSignup(true)}
                    className="w-full bg-[#6366f1] text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-[#5558e3] transition-colors"
                  >
                    Créer un compte gratuit
                  </button>
                </>
              ) : (
                <form onSubmit={handleSignupAndAdd} className="space-y-3">
                  <input
                    type="text" required placeholder="Ton nom"
                    value={signupForm.name}
                    onChange={(e) => setSignupForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full bg-[#12121a] text-white placeholder:text-gray-500 rounded-lg h-11 px-4 focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
                  />
                  <input
                    type="email" required placeholder="Email"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full bg-[#12121a] text-white placeholder:text-gray-500 rounded-lg h-11 px-4 focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
                  />
                  <input
                    type="password" required placeholder="Mot de passe"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm((p) => ({ ...p, password: e.target.value }))}
                    className="w-full bg-[#12121a] text-white placeholder:text-gray-500 rounded-lg h-11 px-4 focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
                  />
                  {signupError && <p className="text-red-400 text-xs">{signupError}</p>}
                  <button
                    type="submit"
                    disabled={isSubmittingSignup}
                    className="w-full flex items-center justify-center gap-2 bg-[#6366f1] text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-[#5558e3] transition-colors disabled:opacity-50"
                  >
                    {isSubmittingSignup ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {isSubmittingSignup ? 'Création du compte...' : 'Créer mon compte et récupérer ma track'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
