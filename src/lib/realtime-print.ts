/**
 * Capture et "print" en temps réel d'une source audio - l'équivalent
 * logiciel de ce que fait le DSP embarqué d'une carte son type RME au
 * moment de l'enregistrement : on écoute une MediaStream (micro, ou pilote
 * de bouclage virtuel type BlackHole/VB-Cable routé depuis la sortie
 * master d'un logiciel comme Logic), on la protège des écrêtages pendant
 * la prise avec un limiteur natif du navigateur (coût CPU quasi nul, et
 * aucune charge ajoutée au logiciel source qui ignore tout de cette
 * écoute), puis on applique après coup la même mise à niveau de loudness
 * réelle) sur l'intégralité de la prise, mais SANS appliquer de mise à
 * niveau de loudness ni de limiteur : le print sert à faire entrer la prise
 * dans Créations telle quelle. La normalisation (gain de mise à niveau +
 * limiteur anti-écrêtage) reste une étape distincte et volontaire, effectuée
 * ensuite via OneLib - jamais automatique au moment du print.
 */

import { encodeWav } from './loudness-normalizer';
import { analyzeLoudness } from './audio-analyzer';

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor {
  return window.AudioContext || (window as unknown as { webkitAudioContext: AudioContextCtor }).webkitAudioContext;
}

export interface PrintSession {
  // Arrête la prise et renvoie l'enregistrement brut (webm/opus).
  stop: () => Promise<Blob>;
}

/**
 * Démarre l'enregistrement d'une source en temps réel. Le limiteur de
 * sécurité inséré ici ne fait qu'éviter l'écrêtage dur pendant la prise ;
 * la remise à niveau précise de loudness se fait dans `finalizeRealtimePrint`,
 * une fois la prise terminée, sur le signal réellement capté.
 */
export function startRealtimePrint(stream: MediaStream): PrintSession {
  const Ctor = getAudioContextCtor();
  const audioContext = new Ctor();
  const source = audioContext.createMediaStreamSource(stream);

  const safetyLimiter = audioContext.createDynamicsCompressor();
  safetyLimiter.threshold.value = -6;
  safetyLimiter.knee.value = 0;
  safetyLimiter.ratio.value = 20;
  safetyLimiter.attack.value = 0.001;
  safetyLimiter.release.value = 0.15;

  const destination = audioContext.createMediaStreamDestination();
  source.connect(safetyLimiter).connect(destination);

  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
  const recorder = new MediaRecorder(destination.stream, mimeType ? { mimeType } : undefined);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start();

  return {
    stop: () =>
      new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          source.disconnect();
          safetyLimiter.disconnect();
          audioContext.close();
          resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
        };
        recorder.stop();
      }),
  };
}

export interface FinalizedPrint {
  wavBlob: Blob;
  sampleRate: number;
  durationSeconds: number;
  // Mesures réelles de la prise brute (protégée par le limiteur de sécurité
  // pendant la capture, mais jamais mise à niveau de loudness).
  lufs: number;
  lra: number;
  truePeak: number;
}

/**
 * Décode l'enregistrement brut, mesure honnêtement son loudness réel et
 * l'exporte en WAV - sans aucune mise à niveau ni limiteur supplémentaire.
 * Le print doit produire exactement ce qui a été capté, prêt à rejoindre
 * Créations ; la normalisation est une décision distincte, prise ensuite.
 */
export async function finalizeRealtimePrint(rawBlob: Blob): Promise<FinalizedPrint> {
  const Ctor = getAudioContextCtor();
  const audioContext = new Ctor();
  const arrayBuffer = await rawBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) channels.push(audioBuffer.getChannelData(ch));

  const measured = analyzeLoudness(channels, audioBuffer.sampleRate);
  const wavBlob = encodeWav(channels, audioBuffer.sampleRate);

  return {
    wavBlob,
    sampleRate: audioBuffer.sampleRate,
    durationSeconds: audioBuffer.duration,
    lufs: Math.round(measured.integratedLufs * 10) / 10,
    lra: Math.round(measured.lra * 10) / 10,
    truePeak: Math.round(measured.truePeakDb * 10) / 10,
  };
}
