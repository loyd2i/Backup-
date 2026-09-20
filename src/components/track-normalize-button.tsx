'use client';

import { useRef, useState } from 'react';
import { Sparkles, Loader2, X, Play, Pause, Download } from 'lucide-react';
import { generateStreamingPreview, encodeWav } from '@/lib/loudness-normalizer';
import { ONELIB_TOKEN_PRICE } from '@/lib/onelib-config';

interface TrackNormalizeButtonProps {
  trackId: string;
  audioUrl: string | null | undefined;
  normalizationStatus?: string;
  tokens: number;
  unlimited: boolean;
  onTokensChanged: (tokens: number, unlimited: boolean) => void;
}

// Génère l'aperçu streaming normalisé (30s, A/B) d'une track de Créations,
// avant toute éventuelle sortie Onelib (voir BUSINESS-PLAN.md) : mise à
// niveau de loudness + limiteur anti-écrêtage, calculée côté client, sans
// mastering IA. Consomme un jeton (ou paiement à l'unité, ou illimité en
// abonnement label - voir Réglages).
export default function TrackNormalizeButton({
  trackId, audioUrl, normalizationStatus, tokens, unlimited, onTokensChanged,
}: TrackNormalizeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ lufs: number; lra: number; truePeak: number; previewUrl: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleGenerate = async () => {
    if (!audioUrl) return;
    const confirmMessage = unlimited
      ? 'Générer cet aperçu (abonnement Label, illimité) ?'
      : tokens > 0
        ? `Générer cet aperçu consommera 1 jeton (il t'en reste ${tokens}). Continuer ?`
        : `Aucun jeton disponible : cette génération débite ${ONELIB_TOKEN_PRICE}€ à l'unité, non remboursable. Continuer ?`;
    if (!confirm(confirmMessage)) return;

    setIsGenerating(true);
    setError(null);
    try {
      const chargeRes = await fetch(`/api/tracks/${trackId}/normalize`, { method: 'POST' });
      const chargeData = await chargeRes.json();
      if (!chargeRes.ok) throw new Error(chargeData.error || 'Erreur lors du paiement');
      onTokensChanged(chargeData.tokensRemaining ?? 0, !!chargeData.unlimited);

      const audioRes = await fetch(audioUrl);
      const arrayBuffer = await audioRes.arrayBuffer();
      const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextCtor();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const channels: Float32Array[] = [];
      for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) channels.push(audioBuffer.getChannelData(ch));

      const previewResult = generateStreamingPreview(channels, audioBuffer.sampleRate);
      const wavBlob = encodeWav(previewResult.channels, previewResult.sampleRate);

      const formData = new FormData();
      formData.append('audioFile', wavBlob, 'preview.wav');
      formData.append('lufs', previewResult.lufs.toString());
      formData.append('lra', previewResult.lra.toString());
      formData.append('truePeak', previewResult.truePeak.toString());
      formData.append('startSeconds', previewResult.startSeconds.toString());

      const saveRes = await fetch(`/api/tracks/${trackId}/normalize`, { method: 'PUT', body: formData });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || "Erreur lors de l'enregistrement");

      setResult({
        lufs: previewResult.lufs,
        lra: previewResult.lra,
        truePeak: previewResult.truePeak,
        previewUrl: URL.createObjectURL(wavBlob),
      });
    } catch (e) {
      console.error('Error normalizing track:', e);
      setError(e instanceof Error ? e.message : 'Erreur lors de la normalisation');
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={!audioUrl}
        className="p-2 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors disabled:opacity-50"
        title={normalizationStatus === 'done' ? 'Aperçu streaming normalisé' : 'Normaliser (aperçu streaming)'}
      >
        <Sparkles className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#6366f1]" /> Normalisation
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!result ? (
              <>
                <p className="text-gray-400 text-sm">
                  Génère un extrait de 30s qui simule ce que les auditeurs entendront réellement
                  une fois en ligne (mise à niveau de loudness + protection anti-écrêtage), sans
                  mastering IA.
                </p>
                <p className="text-gray-500 text-xs">
                  {unlimited
                    ? 'Illimité (abonnement Label).'
                    : `${tokens} jeton${tokens !== 1 ? 's' : ''} restant${tokens !== 1 ? 's' : ''}${tokens === 0 ? ` — sinon ${ONELIB_TOKEN_PRICE}€ à l'unité.` : '.'}`}
                </p>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2 bg-[#6366f1] text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-[#5558e3] transition-colors disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {isGenerating
                    ? 'Génération...'
                    : unlimited
                      ? "Générer l'aperçu"
                      : tokens > 0
                        ? 'Générer — 1 jeton'
                        : `Générer — ${ONELIB_TOKEN_PRICE}€`}
                </button>
                {error && <p className="text-red-400 text-xs">{error}</p>}
              </>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[#12121a] rounded-lg py-2 px-1">
                    <p className="text-white text-sm font-semibold">{result.lufs.toFixed(1)}</p>
                    <p className="text-gray-500 text-[10px] mt-0.5">LUFS</p>
                  </div>
                  <div className="bg-[#12121a] rounded-lg py-2 px-1">
                    <p className="text-white text-sm font-semibold">{result.lra.toFixed(1)}</p>
                    <p className="text-gray-500 text-[10px] mt-0.5">LRA</p>
                  </div>
                  <div className="bg-[#12121a] rounded-lg py-2 px-1">
                    <p className="text-white text-sm font-semibold">{result.truePeak.toFixed(1)}</p>
                    <p className="text-gray-500 text-[10px] mt-0.5">dBTP</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="w-11 h-11 rounded-full bg-[#6366f1] flex items-center justify-center text-white flex-shrink-0"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </button>
                  <p className="text-gray-400 text-xs">Extrait normalisé, prêt à être publié sur OneLib.</p>
                </div>
                <audio ref={audioRef} src={result.previewUrl} onEnded={() => setIsPlaying(false)} />
                <a
                  href={result.previewUrl}
                  download="apercu-normalise.wav"
                  className="flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-white"
                >
                  <Download className="w-3.5 h-3.5" /> Télécharger l&apos;extrait
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
