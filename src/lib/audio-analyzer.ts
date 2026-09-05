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

        // Get the audio data (mono)
        const channelData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        const duration = audioBuffer.duration;

        // Analyze BPM
        const bpm = detectBPM(channelData, sampleRate);

        // Analyze Key
        const key = detectKey(channelData, sampleRate);

        // Calculate confidence based on signal quality
        const confidence = calculateConfidence(channelData);

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

/**
 * Formate une durée en secondes en mm:ss
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
