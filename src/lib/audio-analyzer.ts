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
  // Loudness Range (LRA) en LU : variation de volume du morceau dans le
  // temps (norme EBU Tech 3342). Un master très compressé/limité aura un
  // LRA proche de 0 ; un morceau avec de vrais passages calmes et forts
  // aura un LRA plus élevé.
  lra: number;
  // Empreinte de la forme d'onde réelle : crête d'amplitude par segment
  // (valeurs normalisées 0-1), pour afficher le vrai profil du morceau
  // plutôt que des barres aléatoires.
  waveformPeaks: number[];
  // Style musical détecté (YAMNet, cf. genre-detector.ts) - null si aucun
  // style ne ressort avec une confiance suffisante.
  genre: string | null;
  genreConfidence: number | null;
  // Instruments détectés comme audibles dans le mix (YAMNet) - détection
  // sur le mix global, pas une séparation de pistes.
  instruments: string[];
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

interface WavFormatInfo {
  sampleRate: number;
  bitDepth: number;
}

/**
 * Lit l'en-tête RIFF/WAVE pour extraire la fréquence d'échantillonnage et la
 * profondeur de bits réelles (chunk "fmt "). Nécessaire car decodeAudioData()
 * du navigateur ré-échantillonne le signal vers la fréquence de sortie de
 * l'AudioContext (souvent 44100 Hz) : audioBuffer.sampleRate ne reflète donc
 * PAS la fréquence du fichier d'origine, seul l'en-tête le peut.
 * Renvoie null si le fichier n'est pas un WAV PCM valide.
 */
function parseWavFormat(arrayBuffer: ArrayBuffer): WavFormatInfo | null {
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
      return {
        sampleRate: view.getUint32(offset + 8 + 4, true),
        bitDepth: view.getUint16(offset + 8 + 14, true),
      };
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
        const { integratedLufs, lra, truePeakDb } = analyzeLoudness(channels, sampleRate);
        const waveformPeaks = computeWaveformPeaks(channels);

        // Détection du style musical et des instruments (YAMNet) - best-effort :
        // ne doit jamais faire échouer ni bloquer le reste de l'analyse. Sur un
        // appareil sans accélération GPU (WebGL logiciel), l'inférence peut
        // être lente : on abandonne au-delà d'un délai raisonnable plutôt que
        // de faire attendre l'utilisateur indéfiniment pour cet enrichissement.
        let genreResult: { genre: string; confidence: number } | null = null;
        let instruments: string[] = [];
        try {
          const { analyzeAudioStyle } = await import('./genre-detector');
          const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 20000));
          const styleResult = await Promise.race([analyzeAudioStyle(audioBuffer), timeout]);
          if (styleResult) {
            genreResult = styleResult.genre;
            instruments = styleResult.instruments;
          }
        } catch (styleError) {
          console.error('Détection du style musical indisponible:', styleError);
        }

        const audioFormat = detectAudioFormat(file);
        const isUncompressed = UNCOMPRESSED_MIME_TYPES.has(file.type) || audioFormat === 'WAV';
        const wavFormat = isUncompressed ? parseWavFormat(arrayBuffer) : null;
        const bitDepth = wavFormat?.bitDepth ?? null;
        // Fréquence réelle du fichier (en-tête WAV) plutôt que celle, ré-échantillonnée,
        // de l'AudioContext - seule utilisée pour l'affichage, pas pour les calculs DSP
        // ci-dessus qui doivent rester cohérents avec channelData/channels.
        const reportedSampleRate = wavFormat?.sampleRate ?? sampleRate;
        const bitrate = !isUncompressed && duration > 0
          ? Math.round((file.size * 8) / duration / 1000)
          : null;

        resolve({
          bpm: Math.round(bpm),
          key,
          confidence: Math.round(confidence * 100) / 100,
          duration: Math.round(duration),
          sampleRate: reportedSampleRate,
          audioFormat,
          bitDepth,
          bitrate,
          truePeak: Math.round(truePeakDb * 10) / 10,
          lufs: Math.round(integratedLufs * 10) / 10,
          lra: Math.round(lra * 10) / 10,
          waveformPeaks,
          genre: genreResult?.genre ?? null,
          genreConfidence: genreResult ? Math.round(genreResult.confidence * 100) / 100 : null,
          instruments,
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Erreur lecture fichier'));
    reader.readAsArrayBuffer(file);
  });
}

export interface QuickAudioMetadata {
  duration: number;
  audioFormat: string;
  sampleRate: number | null;
  bitDepth: number | null;
  bitrate: number | null;
}

/**
 * Métadonnées quasi instantanées (durée + format), sans décoder le signal ni
 * lancer la moindre analyse DSP - contrairement à analyzeAudio() qui décode
 * tout le fichier et peut prendre plusieurs secondes (voire jusqu'à 20s avec
 * la détection de style). Permet de créer la track tout de suite avec ses
 * caractéristiques de base ; le reste (tempo, tonalité, loudness, waveform,
 * style) est calculé en arrière-plan une fois la track déjà visible dans
 * Créations, via analyzeAudio() suivi d'une mise à jour de la track.
 */
export function getQuickAudioMetadata(file: File): Promise<QuickAudioMetadata> {
  return new Promise((resolve) => {
    const audioFormat = detectAudioFormat(file);
    const isUncompressed = UNCOMPRESSED_MIME_TYPES.has(file.type) || audioFormat === 'WAV';

    const finish = (duration: number) => {
      (async () => {
        let sampleRate: number | null = null;
        let bitDepth: number | null = null;
        if (isUncompressed) {
          try {
            // L'en-tête "fmt " d'un WAV apparaît toujours très tôt : quelques Ko
            // suffisent, pas besoin de lire le fichier entier.
            const headerBuffer = await file.slice(0, 4096).arrayBuffer();
            const wavFormat = parseWavFormat(headerBuffer);
            sampleRate = wavFormat?.sampleRate ?? null;
            bitDepth = wavFormat?.bitDepth ?? null;
          } catch {
            // Pas grave : ces champs seront de toute façon complétés par
            // l'analyse complète en arrière-plan.
          }
        }
        const bitrate = !isUncompressed && duration > 0
          ? Math.round((file.size * 8) / duration / 1000)
          : null;
        resolve({ duration: Math.round(duration), audioFormat, sampleRate, bitDepth, bitrate });
      })();
    };

    // Lecture des métadonnées seules (durée) : le navigateur n'a besoin de
    // lire que l'en-tête du conteneur, pas de décoder l'audio.
    const audioEl = document.createElement('audio');
    audioEl.preload = 'metadata';
    const objectUrl = URL.createObjectURL(file);
    audioEl.src = objectUrl;

    const cleanup = () => URL.revokeObjectURL(objectUrl);

    audioEl.onloadedmetadata = () => {
      const duration = Number.isFinite(audioEl.duration) ? audioEl.duration : 0;
      cleanup();
      finish(duration);
    };
    audioEl.onerror = () => {
      cleanup();
      finish(0);
    };
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

const powerToLoudness = (power: number) => (power > 0 ? -0.691 + 10 * Math.log10(power) : -Infinity);

/**
 * Découpe les canaux (déjà pondérés K) en blocs de `blockSize` échantillons
 * (pas de `hopSize`) et renvoie la puissance moyenne (somme pondérée des
 * canaux) de chaque bloc - la brique de base commune au loudness intégré
 * et au LRA, qui ne diffèrent que par la taille de bloc et le seuillage.
 */
function computeBlockPowers(weightedChannels: Float64Array[], blockSize: number, hopSize: number): number[] {
  const totalLength = weightedChannels[0]?.length || 0;
  const channelWeight = 1.0;
  const blockPowers: number[] = [];

  if (totalLength <= blockSize) {
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
  return blockPowers;
}

/**
 * Loudness intégré (LUFS), norme ITU-R BS.1770 / EBU R128 : blocs de 400ms
 * (pas 100ms), double seuillage (absolu -70 LUFS, relatif -10 LU sous la
 * moyenne des blocs restants).
 */
function computeIntegratedLoudness(weightedChannels: Float64Array[], sampleRate: number): number {
  const blockSize = Math.max(1, Math.round(0.4 * sampleRate));
  const hopSize = Math.max(1, Math.round(0.1 * sampleRate));
  const blockPowers = computeBlockPowers(weightedChannels, blockSize, hopSize);

  const absoluteGated = blockPowers.filter((p) => powerToLoudness(p) > -70);
  if (absoluteGated.length === 0) return -70;

  const meanAbsPower = absoluteGated.reduce((a, b) => a + b, 0) / absoluteGated.length;
  const relativeThreshold = powerToLoudness(meanAbsPower) - 10;
  const relativeGated = absoluteGated.filter((p) => powerToLoudness(p) > relativeThreshold);
  const finalPower = relativeGated.length > 0
    ? relativeGated.reduce((a, b) => a + b, 0) / relativeGated.length
    : meanAbsPower;
  return powerToLoudness(finalPower);
}

/**
 * Loudness Range (LRA), norme EBU Tech 3342 : blocs de 3s (pas 100ms),
 * seuillage absolu à -70 LUFS puis relatif à -20 LU (specifique au LRA,
 * différent des -10 LU du loudness intégré), puis écart entre les 10e et
 * 95e centiles des loudness de blocs restants. Reflète la variation de
 * volume du morceau (un master très compressé aura un LRA proche de 0).
 */
function computeLoudnessRange(weightedChannels: Float64Array[], sampleRate: number): number {
  const blockSize = Math.max(1, Math.round(3 * sampleRate));
  const hopSize = Math.max(1, Math.round(0.1 * sampleRate));
  const blockPowers = computeBlockPowers(weightedChannels, blockSize, hopSize);

  const absoluteGated = blockPowers.filter((p) => powerToLoudness(p) > -70);
  if (absoluteGated.length === 0) return 0;

  const meanAbsPower = absoluteGated.reduce((a, b) => a + b, 0) / absoluteGated.length;
  const relativeThreshold = powerToLoudness(meanAbsPower) - 20;
  const loudnessValues = absoluteGated
    .filter((p) => powerToLoudness(p) > relativeThreshold)
    .map(powerToLoudness)
    .sort((a, b) => a - b);
  if (loudnessValues.length === 0) return 0;

  const percentile = (sorted: number[], p: number) => {
    const idx = p * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  };

  return percentile(loudnessValues, 0.95) - percentile(loudnessValues, 0.10);
}

/**
 * Mesure le loudness intégré (LUFS), le Loudness Range (LRA) et la crête
 * réelle (True Peak, dBTP) sur l'ensemble du morceau, selon la norme
 * ITU-R BS.1770 / EBU R128.
 */
export function analyzeLoudness(channels: Float32Array[], sampleRate: number): { integratedLufs: number; lra: number; truePeakDb: number } {
  const [stage1, stage2] = kWeightingFilters(sampleRate);
  const weightedChannels = channels.map((chan) => applyBiquad(applyBiquad(chan, stage1), stage2));

  const integratedLufs = computeIntegratedLoudness(weightedChannels, sampleRate);
  const lra = computeLoudnessRange(weightedChannels, sampleRate);

  let peak = 0;
  for (const chan of channels) {
    const chanPeak = estimateTruePeak(chan);
    if (chanPeak > peak) peak = chanPeak;
  }
  const truePeakDb = peak > 0 ? 20 * Math.log10(peak) : -100;

  return { integratedLufs, lra, truePeakDb };
}

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

// Cible générale des principales plateformes de streaming actuelles (Spotify
// et YouTube normalisent vers -14 LUFS, Apple Music vers -16, Tidal/Amazon
// autour de -14) : une master dans cette fourchette, avec assez de marge de
// crête, ne sera pas fortement écrêtée/compressée par leur normalisation.
// Ce ne sont que des repères généraux ("à peu près"), pas une norme unique.
export const STREAMING_LUFS_TARGET_MIN = -16;
export const STREAMING_LUFS_TARGET_MAX = -13;
// Au-delà, master "guerre du volume" (loudness war) : sera fortement
// écrêtée par les plateformes et perd en dynamique.
const STREAMING_LUFS_HOT = -9;
// Marge usuelle contre l'écrêtage inter-échantillon après transcodage.
export const SAFE_TRUE_PEAK_MAX = -1;

export type StreamingLoudnessStatus = 'optimal' | 'hot' | 'neutral';

/**
 * Évalue si le loudness mesuré correspond, à peu près, au niveau de sortie
 * attendu par les plateformes de streaming actuelles. Renvoie 'neutral'
 * quand la donnée n'est pas disponible (pas d'alerte injustifiée).
 */
export function getStreamingLoudnessStatus(lufs?: number | null, truePeak?: number | null): StreamingLoudnessStatus {
  if (lufs === null || lufs === undefined || truePeak === null || truePeak === undefined) return 'neutral';
  if (truePeak > SAFE_TRUE_PEAK_MAX || lufs > STREAMING_LUFS_HOT) return 'hot';
  if (lufs >= STREAMING_LUFS_TARGET_MIN && lufs <= STREAMING_LUFS_TARGET_MAX && truePeak <= SAFE_TRUE_PEAK_MAX) return 'optimal';
  return 'neutral';
}

export interface MasteringAdvice {
  severity: 'good' | 'warning' | 'info' | 'unknown';
  message: string;
}

/**
 * Sous le repère simple (optimal/hot/neutral) utilisé pour la couleur de la
 * waveform, un diagnostic plus nuancé en une phrase, adapté au profil du
 * master : écrêtage technique, mastering "guerre du volume", master fort
 * mais encore correct, niveau optimal, ou master trop calme (les
 * plateformes vont alors le remonter elles-mêmes, ce qui n'est pas neutre).
 * Le LRA vient nuancer le diagnostic de dynamique quand il est disponible.
 */
export function getMasteringAdvice(lufs?: number | null, truePeak?: number | null, lra?: number | null): MasteringAdvice {
  if (lufs === null || lufs === undefined || truePeak === null || truePeak === undefined) {
    return { severity: 'unknown', message: 'Analyse de loudness non disponible pour ce fichier.' };
  }

  const lowDynamics = lra !== null && lra !== undefined && lra < 4;
  const dynamicsNote = lowDynamics
    ? ' La dynamique est par ailleurs très réduite (LRA faible), signe d\'un mastering très compressé.'
    : '';

  if (truePeak > SAFE_TRUE_PEAK_MAX) {
    return {
      severity: 'warning',
      message: `Crête à ${truePeak.toFixed(1)} dBTP : risque d'écrêtage inter-échantillon après encodage (MP3/AAC) sur certaines plateformes. Réduisez le gain de sortie ou le limiteur final.${dynamicsNote}`,
    };
  }

  if (lufs > STREAMING_LUFS_HOT) {
    return {
      severity: 'warning',
      message: `Master très compressé (${lufs.toFixed(1)} LUFS) : les plateformes de streaming vont fortement l'atténuer à la lecture. À ce niveau, la dynamique est souvent déjà sacrifiée.${dynamicsNote}`,
    };
  }

  if (lufs > STREAMING_LUFS_TARGET_MAX) {
    return {
      severity: 'info',
      message: `Master plus fort que la cible streaming (${lufs.toFixed(1)} LUFS). Le son peut très bien sonner ainsi, mais les plateformes vont l'atténuer à l'écoute : attention à la perte de dynamique perçue une fois remis au niveau standard.${dynamicsNote}`,
    };
  }

  if (lufs < STREAMING_LUFS_TARGET_MIN) {
    return {
      severity: 'info',
      message: `Master plus calme que la cible streaming (${lufs.toFixed(1)} LUFS). Les plateformes vont le remonter automatiquement pour l'aligner sur les autres titres : cet ajustement n'est pas toujours neutre (bruit de fond remonté, moins de contrôle qu'un gain réglé en amont).`,
    };
  }

  return {
    severity: 'good',
    message: `Niveau optimal pour le streaming (${lufs.toFixed(1)} LUFS, crête ${truePeak.toFixed(1)} dBTP) : proche des cibles Spotify/YouTube (~-14 LUFS) et Apple Music (-16 LUFS).${dynamicsNote}`,
  };
}

// Amplitude (0-1, normalisée par rapport au pic du morceau) à partir de
// laquelle un segment de la waveform est considéré comme un pic et reçoit
// un dégradé de couleur d'alerte à sa pointe.
export const PEAK_BAR_THRESHOLD = 0.85;

/**
 * Couleur de fond d'une barre de la waveform : le corps reste bleu/indigo,
 * et seule la pointe des pics (amplitude >= PEAK_BAR_THRESHOLD) se fond
 * progressivement vers une couleur d'alerte (rouge si le master écrête,
 * vert sinon). Le dégradé n'est pas figé : plus le pic est fort, plus la
 * transition remonte bas dans la barre ET plus elle devient abrupte -
 * un pic tout juste au-dessus du seuil reste presque entièrement bleu
 * avec un fondu large et discret, tandis qu'un pic proche de l'écrêtage
 * devient franchement rouge avec une transition serrée et agressive.
 */
export function getWaveformBarBackground(height: number, isActive: boolean, isHot: boolean): string {
  const bodyFrom = isActive ? '#6366f1' : '#2a2a3a';
  const bodyTo = isActive ? '#8b5cf6' : '#2a2a3a';

  if (height < PEAK_BAR_THRESHOLD) {
    return `linear-gradient(to top, ${bodyFrom}, ${bodyTo})`;
  }

  const tipColor = isHot ? '#ef4444' : '#22c55e';
  // r=0 tout juste au seuil, r=1 à l'amplitude maximale du morceau.
  const r = Math.min(1, Math.max(0, (height - PEAK_BAR_THRESHOLD) / (1 - PEAK_BAR_THRESHOLD)));
  const fadeCenter = 90 - 40 * r; // le point de bascule descend vers le milieu de la barre
  const fadeWidth = 25 - 20 * r; // la zone de fondu se resserre (transition plus agressive)
  const fadeStart = Math.max(0, fadeCenter - fadeWidth / 2);
  const fadeEnd = Math.min(100, fadeCenter + fadeWidth / 2);

  return `linear-gradient(to top, ${bodyFrom} 0%, ${bodyFrom} ${fadeStart}%, ${tipColor} ${fadeEnd}%, ${tipColor} 100%)`;
}

/**
 * Formate les caractéristiques techniques d'un fichier audio en une ligne
 * discrète, ex: "WAV · 44.1 kHz · 24 bits · Crête -1.2 dBTP · -14.0 LUFS",
 * complétée d'un repère sur le niveau de sortie streaming quand pertinent.
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
  if (parts.length === 0) return null;

  const status = getStreamingLoudnessStatus(specs.lufs, specs.truePeak);
  const line = parts.join(' · ');
  if (status === 'optimal') return `${line} · ✓ Prêt streaming`;
  if (status === 'hot') return `${line} · ⚠ Trop fort pour le streaming`;
  return line;
}

/**
 * Formate une durée en secondes en mm:ss
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
