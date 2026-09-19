/**
 * Audio Analyzer - Détecte le BPM et la tonalité d'un fichier audio
 * Utilise Web Audio API pour l'analyse côté client
 */

// Notes musicals et leurs fréquences
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Profils Krumhansl-Schmuckler pour la détection de tonalité
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

export interface AudioAnalysisResult {
  bpm: number;
  key: string;
  confidence: number;
  duration: number;
  sampleRate: number;
  audioFormat: string;
  // Profondeur de bits réelle : uniquement pour les formats non compressés (WAV, AIFF).
  // Pour un format compressé (MP3, AAC...), cette notion ne s'applique pas.
  bitDepth: number | null;
  // Débit binaire en kbps : uniquement pour les formats compressés. Estimé à partir
  // de la taille du fichier et de sa durée (précis pour un encodage CBR, approximatif en VBR).
  bitrate: number | null;
  // Crête réelle (True Peak) en dBTP, mesurée après sur-échantillonnage x4
  // pour détecter les dépassements inter-échantillons (norme ITU-R BS.1770).
  truePeak: number;
  // Loudness intégré en LUFS sur toute la durée du morceau, avec le
  // pondérage K et le double seuillage (absolu -70 LUFS, relatif -10 LU)
  // définis par la norme ITU-R BS.1770 / EBU R128.
  lufs: number;
  // Empreinte de la forme d'onde réelle : crête d'amplitude par segment
  // (valeurs normalisées 0-1), pour afficher le vrai profil du morceau
  // plutôt que des barres aléatoires.
  waveformPeaks: number[];
}

const FORMAT_LABELS: Record<string, string> = {
  'audio/wav': 'WAV',
  'audio/x-wav': 'WAV',
  'audio/wave': 'WAV',
  'audio/mpeg': 'MP3',
  'audio/mp3': 'MP3',
  'audio/flac': 'FLAC',
  'audio/x-flac': 'FLAC',
  'audio/mp4': 'AAC / M4A',
  'audio/x-m4a': 'AAC / M4A',
  'audio/aac': 'AAC',
  'audio/ogg': 'OGG',
  'audio/webm': 'WEBM',
};

// Formats non compressés (PCM) : la résolution en bits par échantillon est significative.
const UNCOMPRESSED_MIME_TYPES = new Set(['audio/wav', 'audio/x-wav', 'audio/wave']);

function detectAudioFormat(file: File): string {
  if (FORMAT_LABELS[file.type]) return FORMAT_LABELS[file.type];
  const ext = file.name.split('.').pop()?.toLowerCase();
  const byExt: Record<string, string> = {
    wav: 'WAV', mp3: 'MP3', flac: 'FLAC', m4a: 'AAC / M4A', aac: 'AAC', ogg: 'OGG', webm: 'WEBM',
  };
  return (ext && byExt[ext]) || file.type || 'Inconnu';
}

/**
 * Lit l'en-tête RIFF/WAVE pour extraire la profondeur de bits réelle (bitsPerSample).
 * Renvoie null si le fichier n'est pas un WAV PCM valide.
 */
function parseWavBitDepth(arrayBuffer: ArrayBuffer): number | null {
  const view = new DataView(arrayBuffer);
  if (arrayBuffer.byteLength < 44) return null;

  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
  if (riff !== 'RIFF' || wave !== 'WAVE') return null;

  // Parcourt les sous-chunks à la recherche de "fmt "
  let offset = 12;
  while (offset + 8 <= arrayBuffer.byteLength) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3)
    );
    const chunkSize = view.getUint32(offset + 4, true);
    if (chunkId === 'fmt ' && offset + 8 + 16 <= arrayBuffer.byteLength) {
      return view.getUint16(offset + 8 + 14, true); // bitsPerSample
    }
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  return null;
}

/**
 * Analyse un fichier audio pour détecter BPM, tonalité et caractéristiques techniques
 * (fréquence d'échantillonnage, format, résolution/bitrate)
 */
export async function analyzeAudio(file: File): Promise<AudioAnalysisResult> {
  return new Promise((resolve, reject) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

        // Get the audio data (mono, pour le BPM et la tonalité)
        const channelData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        const duration = audioBuffer.duration;

        // Analyze BPM
        const bpm = detectBPM(channelData, sampleRate);

        // Analyze Key
        const key = detectKey(channelData, sampleRate);

        // Calculate confidence based on signal quality
        const confidence = calculateConfidence(channelData);

        // Loudness (LUFS) et crête réelle (True Peak) : nécessitent tous les
        // canaux (le pondérage stéréo de la norme diffère du mono)
        const channels: Float32Array[] = [];
        for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
          channels.push(audioBuffer.getChannelData(ch));
        }
        const { integratedLufs, truePeakDb } = analyzeLoudness(channels, sampleRate);
        const waveformPeaks = computeWaveformPeaks(channels);

        const audioFormat = detectAudioFormat(file);
        const isUncompressed = UNCOMPRESSED_MIME_TYPES.has(file.type) || audioFormat === 'WAV';
        const bitDepth = isUncompressed ? parseWavBitDepth(arrayBuffer) : null;
        const bitrate = !isUncompressed && duration > 0
          ? Math.round((file.size * 8) / duration / 1000)
          : null;

        resolve({
          bpm: Math.round(bpm),
          key,
          confidence: Math.round(confidence * 100) / 100,
          duration: Math.round(duration),
          sampleRate,
          audioFormat,
          bitDepth,
          bitrate,
          truePeak: Math.round(truePeakDb * 10) / 10,
          lufs: Math.round(integratedLufs * 10) / 10,
          waveformPeaks,
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Erreur lecture fichier'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Détecte le BPM en utilisant la détection de pics énergétiques
 */
function detectBPM(channelData: Float32Array, sampleRate: number): number {
  // Paramètres pour l'analyse
  const windowSize = Math.floor(sampleRate * 0.01); // 10ms window
  const hopSize = Math.floor(windowSize / 2);
  const minBPM = 60;
  const maxBPM = 200;

  // Calculer l'énergie pour chaque fenêtre
  const energies: number[] = [];
  for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
    let energy = 0;
    for (let j = 0; j < windowSize; j++) {
      energy += channelData[i + j] * channelData[i + j];
    }
    energies.push(energy);
  }

  // Calculer les différences d'énergie (onset detection)
  const differences: number[] = [];
  for (let i = 1; i < energies.length; i++) {
    const diff = Math.max(0, energies[i] - energies[i - 1]);
    differences.push(diff);
  }

  // Trouver les pics (beats)
  const threshold = calculateThreshold(differences);
  const peaks: number[] = [];
  
  for (let i = 1; i < differences.length - 1; i++) {
    if (differences[i] > threshold &&
        differences[i] > differences[i - 1] &&
        differences[i] > differences[i + 1]) {
      peaks.push(i);
    }
  }

  // Calculer les intervalles entre les pics
  if (peaks.length < 2) return 120; // Default BPM

  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push(peaks[i] - peaks[i - 1]);
  }

  // Convertir les intervalles en BPM
  const bpms = intervals.map(interval => {
    const secondsPerBeat = (interval * hopSize) / sampleRate;
    return 60 / secondsPerBeat;
  });

  // Filtrer les BPM dans une plage raisonnable
  const validBpms = bpms.filter(bpm => bpm >= minBPM && bpm <= maxBPM);

  if (validBpms.length === 0) return 120;

  // Utiliser l'histogramme pour trouver le BPM le plus fréquent
  const bpmCounts = new Map<number, number>();
  const bpmTolerance = 5;

  for (const bpm of validBpms) {
    let found = false;
    for (const [key] of bpmCounts) {
      if (Math.abs(key - bpm) < bpmTolerance) {
        bpmCounts.set(key, (bpmCounts.get(key) || 0) + 1);
        found = true;
        break;
      }
    }
    if (!found) {
      bpmCounts.set(Math.round(bpm), 1);
    }
  }

  // Trouver le BPM avec le plus grand nombre d'occurrences
  let maxCount = 0;
  let detectedBPM = 120;
  
  for (const [bpm, count] of bpmCounts) {
    if (count > maxCount) {
      maxCount = count;
      detectedBPM = bpm;
    }
  }

  return detectedBPM;
}

/**
 * Calcule un seuil adaptatif pour la détection de pics
 */
function calculateThreshold(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return median + (mean - median) * 0.5 + sorted[sorted.length - 1] * 0.1;
}

/**
 * Détecte la tonalité en utilisant l'analyse spectrale
 */
function detectKey(channelData: Float32Array, sampleRate: number): string {
  // Taille de la FFT
  const fftSize = 8192;
  const hopSize = fftSize / 4;

  // Calculer le spectre moyen
  const chromagram = new Array(12).fill(0);
  let frameCount = 0;

  for (let i = 0; i < channelData.length - fftSize; i += hopSize) {
    const frame = channelData.slice(i, i + fftSize);
    const spectrum = computeSpectrum(frame);

    // Mapper les fréquences aux notes (chromagram)
    for (let j = 0; j < spectrum.length / 2; j++) {
      const frequency = (j * sampleRate) / fftSize;
      if (frequency < 20 || frequency > 5000) continue; // Ignorer hors range

      const note = frequencyToNote(frequency);
      chromagram[note] += spectrum[j];
    }
    frameCount++;
  }

  // Normaliser le chromagram
  const max = Math.max(...chromagram);
  if (max > 0) {
    for (let i = 0; i < chromagram.length; i++) {
      chromagram[i] /= max;
    }
  }

  // Corréler avec les profils majeur/mineur
  let bestCorrelation = -1;
  let bestKey = 'C';
  let isMajor = true;

  for (let shift = 0; shift < 12; shift++) {
    // Test majeur
    const majorCorr = correlate(chromagram, MAJOR_PROFILE, shift);
    if (majorCorr > bestCorrelation) {
      bestCorrelation = majorCorr;
      bestKey = NOTE_NAMES[shift];
      isMajor = true;
    }

    // Test mineur
    const minorCorr = correlate(chromagram, MINOR_PROFILE, shift);
    if (minorCorr > bestCorrelation) {
      bestCorrelation = minorCorr;
      bestKey = NOTE_NAMES[shift];
      isMajor = false;
    }
  }

  return `${bestKey} ${isMajor ? 'majeur' : 'mineur'}`;
}

/**
 * FFT radix-2 itérative (Cooley-Tukey), en place. `n` doit être une puissance de 2.
 * Remplace l'ancienne DFT en O(n²) — beaucoup trop lente sur un fichier réel
 * (des minutes de blocage du thread principal pour un morceau de quelques
 * secondes) — par un calcul en O(n log n), pour un résultat mathématiquement
 * identique.
 */
function fft(real: Float64Array, imag: Float64Array): void {
  const n = real.length;

  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }

  // Butterfly stages
  for (let size = 2; size <= n; size <<= 1) {
    const halfSize = size >> 1;
    const angleStep = (-2 * Math.PI) / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < halfSize; k++) {
        const angle = angleStep * k;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const evenIdx = start + k;
        const oddIdx = start + k + halfSize;
        const oddReal = real[oddIdx] * cos - imag[oddIdx] * sin;
        const oddImag = real[oddIdx] * sin + imag[oddIdx] * cos;
        real[oddIdx] = real[evenIdx] - oddReal;
        imag[oddIdx] = imag[evenIdx] - oddImag;
        real[evenIdx] += oddReal;
        imag[evenIdx] += oddImag;
      }
    }
  }
}

/**
 * Calcule le spectre d'un signal via une vraie FFT
 */
function computeSpectrum(frame: Float32Array): Float32Array {
  const n = frame.length;
  const real = new Float64Array(n);
  const imag = new Float64Array(n);
  real.set(frame);

  fft(real, imag);

  const spectrum = new Float32Array(n);
  for (let k = 0; k < n / 2; k++) {
    spectrum[k] = Math.sqrt(real[k] * real[k] + imag[k] * imag[k]);
  }

  return spectrum;
}

/**
 * Convertit une fréquence en note (0-11)
 */
function frequencyToNote(frequency: number): number {
  // A4 = 440Hz = note 9 (A)
  const A4 = 440;
  const C0 = A4 * Math.pow(2, -4.75);

  if (frequency < C0) return 0;

  const halfSteps = 12 * Math.log2(frequency / C0);
  return Math.round(halfSteps) % 12;
}

/**
 * Calcule la corrélation entre un chromagram et un profil
 */
function correlate(chromagram: number[], profile: number[], shift: number): number {
  let sum = 0;
  const shiftedProfile = [...profile.slice(shift), ...profile.slice(0, shift)];

  for (let i = 0; i < 12; i++) {
    sum += chromagram[i] * shiftedProfile[i];
  }

  return sum;
}

/**
 * Calcule un score de confiance basé sur la qualité du signal
 */
function calculateConfidence(channelData: Float32Array): number {
  // Calculer le RMS
  let rms = 0;
  for (let i = 0; i < channelData.length; i++) {
    rms += channelData[i] * channelData[i];
  }
  rms = Math.sqrt(rms / channelData.length);

  // Calculer le facteur de crête
  let peak = 0;
  for (let i = 0; i < channelData.length; i++) {
    peak = Math.max(peak, Math.abs(channelData[i]));
  }

  const crestFactor = peak / (rms || 1);

  // Normaliser en score de confiance (0-1)
  const rmsScore = Math.min(1, rms * 10);
  const crestScore = Math.min(1, 1 / (crestFactor - 1 || 1));

  return (rmsScore + crestScore) / 2;
}

interface BiquadCoeffs {
  b0: number; b1: number; b2: number; a1: number; a2: number;
}

/**
 * Filtre biquad, forme directe II transposée (stable numériquement).
 */
function applyBiquad(input: Float32Array | Float64Array, c: BiquadCoeffs): Float64Array {
  const output = new Float64Array(input.length);
  let z1 = 0;
  let z2 = 0;
  for (let n = 0; n < input.length; n++) {
    const x = input[n];
    const y = c.b0 * x + z1;
    z1 = c.b1 * x - c.a1 * y + z2;
    z2 = c.b2 * x - c.a2 * y;
    output[n] = y;
  }
  return output;
}

/**
 * Filtre de pondération K (norme ITU-R BS.1770) : un premier étage en
 * plateau haute fréquence qui modélise l'effet de la tête, puis un filtre
 * RLB passe-haut. Les coefficients sont dérivés par transformée bilinéaire
 * pré-déformée pour n'importe quelle fréquence d'échantillonnage (les
 * formules de la norme sont données pour 48 kHz mais se généralisent ainsi).
 */
function kWeightingFilters(sampleRate: number): [BiquadCoeffs, BiquadCoeffs] {
  // Étage 1 : plateau haute fréquence (simule la résonance de la tête)
  const f0_1 = 1681.9744509555319;
  const G = 3.99984385397;
  const Q1 = 0.7071752369554193;
  const K1 = Math.tan((Math.PI * f0_1) / sampleRate);
  const Vh = Math.pow(10, G / 20);
  const Vb = Math.pow(Vh, 0.4996667741545416);
  const a0_1 = 1 + K1 / Q1 + K1 * K1;
  const stage1: BiquadCoeffs = {
    b0: (Vh + (Vb * K1) / Q1 + K1 * K1) / a0_1,
    b1: (2 * (K1 * K1 - Vh)) / a0_1,
    b2: (Vh - (Vb * K1) / Q1 + K1 * K1) / a0_1,
    a1: (2 * (K1 * K1 - 1)) / a0_1,
    a2: (1 - K1 / Q1 + K1 * K1) / a0_1,
  };

  // Étage 2 : filtre RLB, passe-haut du second ordre
  const f0_2 = 38.13547087602;
  const Q2 = 0.5003270373238;
  const K2 = Math.tan((Math.PI * f0_2) / sampleRate);
  const a0_2 = 1 + K2 / Q2 + K2 * K2;
  const stage2: BiquadCoeffs = {
    b0: 1 / a0_2,
    b1: -2 / a0_2,
    b2: 1 / a0_2,
    a1: (2 * (K2 * K2 - 1)) / a0_2,
    a2: (1 - K2 / Q2 + K2 * K2) / a0_2,
  };

  return [stage1, stage2];
}

/**
 * Interpolation de Catmull-Rom (spline cubique) - utilisée pour estimer les
 * valeurs inter-échantillons lors du sur-échantillonnage x4 de la crête réelle.
 */
function catmullRom(y0: number, y1: number, y2: number, y3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    2 * y1 +
    (-y0 + y2) * t +
    (2 * y0 - 5 * y1 + 4 * y2 - y3) * t2 +
    (-y0 + 3 * y1 - 3 * y2 + y3) * t3
  );
}

/**
 * Estime la crête réelle (True Peak) d'un canal en sur-échantillonnant x4
 * par interpolation cubique, pour détecter les dépassements inter-échantillons
 * qu'un simple max() sur les échantillons d'origine manquerait (norme
 * ITU-R BS.1770). Approximation par interpolation plutôt que le filtre
 * polyphasé exact de la norme, mais du même ordre de précision en pratique.
 */
function estimateTruePeak(channel: Float32Array, oversample = 4): number {
  let peak = 0;
  const n = channel.length;
  for (let i = 0; i < n; i++) {
    const y0 = i > 0 ? channel[i - 1] : channel[i];
    const y1 = channel[i];
    const y2 = i + 1 < n ? channel[i + 1] : channel[i];
    const y3 = i + 2 < n ? channel[i + 2] : y2;
    for (let k = 0; k < oversample; k++) {
      const abs = Math.abs(catmullRom(y0, y1, y2, y3, k / oversample));
      if (abs > peak) peak = abs;
    }
  }
  return peak;
}

/**
 * Mesure le loudness intégré (LUFS) et la crête réelle (True Peak, dBTP)
 * sur l'ensemble du morceau, selon la norme ITU-R BS.1770 / EBU R128 :
 * pondération K, découpage en blocs de 400ms (pas de 100ms), puis double
 * seuillage (absolu à -70 LUFS, relatif à -10 LU sous la moyenne).
 */
function analyzeLoudness(channels: Float32Array[], sampleRate: number): { integratedLufs: number; truePeakDb: number } {
  const [stage1, stage2] = kWeightingFilters(sampleRate);
  const weightedChannels = channels.map((chan) => applyBiquad(applyBiquad(chan, stage1), stage2));
  // Pondération de canal de la norme : 1.0 pour chaque canal avant/gauche-droite
  // (le cas 5.1 avec ses canaux surround à 1.41 ne s'applique pas aux mixdowns
  // mono/stéréo qu'on traite ici).
  const channelWeight = 1.0;

  const blockSize = Math.max(1, Math.round(0.4 * sampleRate));
  const hopSize = Math.max(1, Math.round(0.1 * sampleRate));
  const totalLength = weightedChannels[0]?.length || 0;

  const blockPowers: number[] = [];
  if (totalLength <= blockSize) {
    // Morceau plus court qu'un bloc : on mesure sur toute la longueur disponible.
    let weightedSum = 0;
    for (const chan of weightedChannels) {
      let sumSq = 0;
      for (let i = 0; i < totalLength; i++) sumSq += chan[i] * chan[i];
      weightedSum += channelWeight * (totalLength > 0 ? sumSq / totalLength : 0);
    }
    blockPowers.push(weightedSum);
  } else {
    for (let start = 0; start + blockSize <= totalLength; start += hopSize) {
      let weightedSum = 0;
      for (const chan of weightedChannels) {
        let sumSq = 0;
        for (let i = start; i < start + blockSize; i++) sumSq += chan[i] * chan[i];
        weightedSum += channelWeight * (sumSq / blockSize);
      }
      blockPowers.push(weightedSum);
    }
  }

  const powerToLoudness = (power: number) => (power > 0 ? -0.691 + 10 * Math.log10(power) : -Infinity);

  const absoluteGated = blockPowers.filter((p) => powerToLoudness(p) > -70);
  let integratedLufs: number;
  if (absoluteGated.length === 0) {
    integratedLufs = -70;
  } else {
    const meanAbsPower = absoluteGated.reduce((a, b) => a + b, 0) / absoluteGated.length;
    const relativeThreshold = powerToLoudness(meanAbsPower) - 10;
    const relativeGated = absoluteGated.filter((p) => powerToLoudness(p) > relativeThreshold);
    const finalPower = relativeGated.length > 0
      ? relativeGated.reduce((a, b) => a + b, 0) / relativeGated.length
      : meanAbsPower;
    integratedLufs = powerToLoudness(finalPower);
  }

  let peak = 0;
  for (const chan of channels) {
    const chanPeak = estimateTruePeak(chan);
    if (chanPeak > peak) peak = chanPeak;
  }
  const truePeakDb = peak > 0 ? 20 * Math.log10(peak) : -100;

  return { integratedLufs, truePeakDb };
}

// Seuil (sur l'amplitude normalisée 0-1, après compression) à partir duquel
// un segment de la forme d'onde est mis en évidence en rouge dans le lecteur
// comme étant l'un des passages les plus forts du morceau.
export const LOUD_WAVEFORM_THRESHOLD = 0.85;

/**
 * Calcule une empreinte de forme d'onde réelle (crête d'amplitude par
 * segment, normalisée 0-1) à partir du signal décodé, pour afficher le
 * vrai profil du morceau dans le lecteur au lieu de barres aléatoires.
 * Une légère compression (racine carrée) évite que les passages calmes
 * disparaissent complètement, comme sur les vrais lecteurs (SoundCloud...).
 */
function computeWaveformPeaks(channels: Float32Array[], numBars = 96): number[] {
  const length = channels[0]?.length || 0;
  if (length === 0) return new Array(numBars).fill(0.05);

  const segmentSize = Math.max(1, Math.floor(length / numBars));
  const peaks: number[] = [];
  for (let bar = 0; bar < numBars; bar++) {
    const start = bar * segmentSize;
    const end = bar === numBars - 1 ? length : start + segmentSize;
    let peak = 0;
    for (const chan of channels) {
      for (let i = start; i < end; i++) {
        const abs = Math.abs(chan[i]);
        if (abs > peak) peak = abs;
      }
    }
    peaks.push(peak);
  }

  const maxPeak = Math.max(...peaks, 0.0001);
  return peaks.map((p) => Math.max(0.05, Math.min(1, Math.sqrt(p / maxPeak))));
}

export interface TechnicalSpecs {
  audioFormat?: string | null;
  sampleRate?: number | null;
  bitDepth?: number | null;
  bitrate?: number | null;
  truePeak?: number | null;
  lufs?: number | null;
}

/**
 * Formate les caractéristiques techniques d'un fichier audio en une ligne
 * discrète, ex: "WAV · 44.1 kHz · 24 bits · Crête -1.2 dBTP · -14.0 LUFS".
 * Ignore les champs absents (analyse non disponible pour ce fichier).
 */
export function formatTechnicalSpecs(specs: TechnicalSpecs): string | null {
  const parts: string[] = [];
  if (specs.audioFormat) parts.push(specs.audioFormat);
  if (specs.sampleRate) parts.push(`${(specs.sampleRate / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} kHz`);
  if (specs.bitDepth) parts.push(`${specs.bitDepth} bits`);
  else if (specs.bitrate) parts.push(`${specs.bitrate} kbps`);
  if (specs.truePeak !== null && specs.truePeak !== undefined) parts.push(`Crête ${specs.truePeak.toFixed(1)} dBTP`);
  if (specs.lufs !== null && specs.lufs !== undefined) parts.push(`${specs.lufs.toFixed(1)} LUFS`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

/**
 * Formate une durée en secondes en mm:ss
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
