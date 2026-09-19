/**
 * Aperçu "streaming" d'un master : simule honnêtement ce que l'auditeur
 * entendra réellement une fois le morceau mis en ligne, une fois que les
 * plateformes (Spotify, YouTube, Tidal, Amazon...) auront appliqué LEUR
 * propre normalisation de loudness à la lecture.
 *
 * Contrairement à un simple gain linéaire, on utilise un vrai limiteur à
 * enveloppe (attack quasi instantané, release progressif) pour ne jamais
 * écrêter durement les crêtes introduites par la remise à niveau : seules
 * les crêtes qui dépasseraient le plafond sont atténuées, le reste du
 * signal n'est pas touché plus qu'il ne faut.
 *
 * Ce n'est PAS un mastering IA : aucune égalisation, compression multibande
 * ou traitement créatif n'est appliqué - uniquement la mise à niveau de
 * loudness (gain) et la protection anti-écrêtage (limiteur), soit exactement
 * ce qu'une plateforme de streaming fait elle-même à la lecture.
 */

import { analyzeLoudness, STREAMING_LUFS_TARGET_MIN, STREAMING_LUFS_TARGET_MAX, SAFE_TRUE_PEAK_MAX } from './audio-analyzer';

// Cible unique de mise à niveau : Spotify et YouTube normalisent vers -14
// LUFS, la valeur la plus fréquemment citée comme référence "streaming".
// Reste cohérente avec la fourchette optimale déjà utilisée ailleurs dans
// l'app (STREAMING_LUFS_TARGET_MIN/MAX = -16/-13).
export const TARGET_STREAMING_LUFS = -14;

// On vise une marge de 0.5 dB sous le plafond officiel (-1 dBTP) pendant le
// limiteur, pour absorber la petite imprécision entre crête échantillon et
// vraie crête inter-échantillon (mesurée séparément, avec sur-échantillonnage,
// par analyzeLoudness) sans avoir à ré-itérer le limiteur.
const LIMITER_CEILING_DB = SAFE_TRUE_PEAK_MAX - 0.5;

const PREVIEW_DURATION_SECONDS = 30;

export interface StreamingPreviewResult {
  channels: Float32Array[];
  sampleRate: number;
  startSeconds: number;
  // Mesures réelles sur l'extrait généré (jamais de valeurs théoriques/inventées).
  lufs: number;
  lra: number;
  truePeak: number;
  appliedGainDb: number;
}

export interface MasterResult {
  channels: Float32Array[];
  sampleRate: number;
  // Mesures réelles sur le résultat généré (jamais de valeurs théoriques/inventées).
  lufs: number;
  lra: number;
  truePeak: number;
  appliedGainDb: number;
}

function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

/**
 * Repère la fenêtre de `windowSeconds` la plus énergétique du morceau (RMS
 * simple, suffisant pour ce choix - la mesure de loudness précise se fait
 * séparément, avec pondération K, sur l'extrait une fois choisi).
 */
function findMostRepresentativeWindow(
  channels: Float32Array[],
  sampleRate: number,
  windowSeconds: number
): number {
  const totalSamples = channels[0]?.length || 0;
  const windowSamples = Math.min(totalSamples, Math.round(windowSeconds * sampleRate));
  if (totalSamples <= windowSamples) return 0;

  // Puissance RMS par bloc de 1s, puis moyenne glissante sur `windowSeconds`
  // blocs pour trouver le meilleur point de départ (pas de 1s).
  const blockSamples = Math.max(1, Math.round(sampleRate));
  const blockPowers: number[] = [];
  for (let start = 0; start + blockSamples <= totalSamples; start += blockSamples) {
    let sumSq = 0;
    for (const chan of channels) {
      for (let i = start; i < start + blockSamples; i++) sumSq += chan[i] * chan[i];
    }
    blockPowers.push(sumSq / (blockSamples * channels.length));
  }

  const windowBlocks = Math.max(1, Math.round(windowSeconds));
  let bestStartBlock = 0;
  let bestSum = -Infinity;
  let currentSum = 0;
  for (let i = 0; i < blockPowers.length; i++) {
    currentSum += blockPowers[i];
    if (i >= windowBlocks) currentSum -= blockPowers[i - windowBlocks];
    if (i >= windowBlocks - 1 && currentSum > bestSum) {
      bestSum = currentSum;
      bestStartBlock = i - windowBlocks + 1;
    }
  }

  const startSample = Math.min(totalSamples - windowSamples, bestStartBlock * blockSamples);
  return Math.max(0, startSample);
}

/**
 * Limiteur à enveloppe (lookahead) : atténue uniquement les échantillons qui
 * dépasseraient le plafond, avec une attaque quasi instantanée (anticipée
 * grâce au lookahead) et un relâchement progressif - pas de cut linéaire
 * global, pas d'écrêtage dur. Le même gain est appliqué à tous les canaux en
 * simultané pour ne pas déplacer l'image stéréo.
 */
function applyLookaheadLimiter(channels: Float32Array[], ceilingLinear: number, sampleRate: number): Float32Array[] {
  const numSamples = channels[0]?.length || 0;
  if (numSamples === 0) return channels;

  const lookaheadSamples = Math.max(1, Math.round(sampleRate * 0.005)); // 5ms
  const releaseSeconds = 0.08; // 80ms : assez lent pour rester transparent
  const releaseCoeff = Math.exp(-1 / (sampleRate * releaseSeconds));

  // Gain requis par échantillon (1 = pas de réduction nécessaire).
  const required = new Float32Array(numSamples).fill(1);
  for (let i = 0; i < numSamples; i++) {
    let maxAbs = 0;
    for (const chan of channels) {
      const v = Math.abs(chan[i]);
      if (v > maxAbs) maxAbs = v;
    }
    if (maxAbs > ceilingLinear) required[i] = ceilingLinear / maxAbs;
  }

  // Lookahead : le gain à l'instant i doit déjà anticiper le minimum requis
  // dans les `lookaheadSamples` échantillons suivants (traitement hors-ligne,
  // donc pas besoin de retarder le signal - on "voit" déjà l'avenir proche).
  // Minimum glissant classique (monotonic deque), fenêtre [i, i+lookaheadSamples).
  const lookahead = new Float32Array(numSamples);
  const deqValues: number[] = [];
  const deqIndices: number[] = [];
  let head = 0;
  for (let i = numSamples - 1; i >= 0; i--) {
    // Retire du fond les valeurs dominées par required[i] (index plus petit
    // ET valeur plus petite ou égale les rend inutiles pour toute fenêtre future).
    while (deqValues.length > head && deqValues[deqValues.length - 1] >= required[i]) {
      deqValues.pop();
      deqIndices.pop();
    }
    deqValues.push(required[i]);
    deqIndices.push(i);
    // Retire en tête les index sortis de la fenêtre [i, i+lookaheadSamples).
    while (deqIndices[head] >= i + lookaheadSamples) head++;
    lookahead[i] = deqValues[head];
  }

  // Enveloppe : attaque instantanée (descend directement à la cible dès
  // qu'elle est plus basse), relâchement exponentiel progressif.
  const envelope = new Float32Array(numSamples);
  let currentGain = 1;
  for (let i = 0; i < numSamples; i++) {
    const target = lookahead[i];
    currentGain = target < currentGain ? target : target + (currentGain - target) * releaseCoeff;
    envelope[i] = currentGain;
  }

  return channels.map((chan) => {
    const out = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) out[i] = chan[i] * envelope[i];
    return out;
  });
}

/**
 * Gain nécessaire pour ramener le morceau entier à la cible streaming, basé
 * sur le loudness intégré de TOUT le signal fourni (comme le ferait une
 * plateforme, qui normalise sur la base du morceau entier, jamais d'un
 * extrait). Un morceau déjà dans la fourchette optimale n'est pas touché.
 */
function computeStreamingGainDb(fullChannels: Float32Array[], sampleRate: number): number {
  const fullTrackLoudness = analyzeLoudness(fullChannels, sampleRate);
  if (
    fullTrackLoudness.integratedLufs >= STREAMING_LUFS_TARGET_MIN &&
    fullTrackLoudness.integratedLufs <= STREAMING_LUFS_TARGET_MAX
  ) {
    return 0;
  }
  return TARGET_STREAMING_LUFS - fullTrackLoudness.integratedLufs;
}

/**
 * Applique le gain de mise à niveau puis le limiteur anti-écrêtage à un jeu
 * de canaux déjà sélectionné (extrait ou morceau entier), avec le garde-fou
 * final habituel si la vraie crête mesurée dépasse malgré tout le plafond.
 */
function applyGainAndLimiter(
  channels: Float32Array[],
  gainDb: number,
  sampleRate: number
): { channels: Float32Array[]; measured: ReturnType<typeof analyzeLoudness> } {
  const gainLinear = dbToLinear(gainDb);
  const gained = channels.map((chan) => {
    const out = new Float32Array(chan.length);
    for (let i = 0; i < chan.length; i++) out[i] = chan[i] * gainLinear;
    return out;
  });

  const limited = applyLookaheadLimiter(gained, dbToLinear(LIMITER_CEILING_DB), sampleRate);

  // Mesure honnête du résultat réellement généré (jamais de valeur théorique).
  let finalChannels = limited;
  let finalMeasured = analyzeLoudness(limited, sampleRate);

  // Garde-fou final : si la crête inter-échantillon mesurée (avec
  // sur-échantillonnage) dépasse malgré tout légèrement le plafond officiel
  // (cas rare, la marge de 0.5 dB du limiteur suffit presque toujours), on
  // applique un tout petit gain global de rattrapage plutôt que d'écrêter.
  if (finalMeasured.truePeakDb > SAFE_TRUE_PEAK_MAX) {
    const correctionDb = SAFE_TRUE_PEAK_MAX - finalMeasured.truePeakDb;
    const correctionLinear = dbToLinear(correctionDb);
    finalChannels = limited.map((chan) => {
      const out = new Float32Array(chan.length);
      for (let i = 0; i < chan.length; i++) out[i] = chan[i] * correctionLinear;
      return out;
    });
    finalMeasured = analyzeLoudness(finalChannels, sampleRate);
  }

  return { channels: finalChannels, measured: finalMeasured };
}

/**
 * Génère l'aperçu "streaming" de 30s : sélectionne le passage le plus
 * représentatif, applique le gain de mise à niveau calculé sur le loudness
 * intégré de TOUT le morceau, protège les crêtes avec le limiteur, puis
 * mesure honnêtement le résultat réel.
 */
export function generateStreamingPreview(fullChannels: Float32Array[], sampleRate: number): StreamingPreviewResult {
  const gainDb = computeStreamingGainDb(fullChannels, sampleRate);

  const startSample = findMostRepresentativeWindow(fullChannels, sampleRate, PREVIEW_DURATION_SECONDS);
  const windowSamples = Math.min(fullChannels[0].length, Math.round(PREVIEW_DURATION_SECONDS * sampleRate));
  const segment = fullChannels.map((chan) => chan.slice(startSample, startSample + windowSamples));

  const { channels, measured } = applyGainAndLimiter(segment, gainDb, sampleRate);

  return {
    channels,
    sampleRate,
    startSeconds: startSample / sampleRate,
    lufs: Math.round(measured.integratedLufs * 10) / 10,
    lra: Math.round(measured.lra * 10) / 10,
    truePeak: Math.round(measured.truePeakDb * 10) / 10,
    appliedGainDb: Math.round(gainDb * 10) / 10,
  };
}

/**
 * Même mise à niveau "streaming" que l'aperçu 30s, mais appliquée au signal
 * entier plutôt qu'à un extrait - utilisé pour le "print" temps réel
 * (E-Studio) : une fois la prise terminée, on remet l'intégralité du
 * fichier capté aux normes, honnêtement mesurées.
 */
export function generateFullMaster(fullChannels: Float32Array[], sampleRate: number): MasterResult {
  const gainDb = computeStreamingGainDb(fullChannels, sampleRate);
  const { channels, measured } = applyGainAndLimiter(fullChannels, gainDb, sampleRate);

  return {
    channels,
    sampleRate,
    lufs: Math.round(measured.integratedLufs * 10) / 10,
    lra: Math.round(measured.lra * 10) / 10,
    truePeak: Math.round(measured.truePeakDb * 10) / 10,
    appliedGainDb: Math.round(gainDb * 10) / 10,
  };
}

/**
 * Encode des canaux PCM float (-1..1) en WAV 16-bit - format simple et
 * universellement lisible pour un extrait de 30s (pas d'enjeu de taille de
 * fichier à cette durée).
 */
export function encodeWav(channels: Float32Array[], sampleRate: number): Blob {
  const numChannels = channels.length;
  const numSamples = channels[0]?.length || 0;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const clamped = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, Math.round(clamped * 32767), true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}
