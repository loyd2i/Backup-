/**
 * Genre Detector - Détecte le style musical d'un morceau via YAMNet
 * (modèle audio de Google, licence Apache 2.0 - https://github.com/tensorflow/models/tree/master/research/audioset/yamnet),
 * converti en TensorFlow.js et exécuté entièrement côté client.
 *
 * YAMNet classe l'audio en 521 catégories AudioSet (parole, animaux, bruits...).
 * On ne retient ici que le sous-ensemble pertinent pour un style musical.
 * Voir /models/yamnet-genre/NOTICE.md pour la provenance exacte du modèle.
 */

// Les 521 classes AudioSet, dans l'ordre exact attendu par le modèle
// (index = position dans le vecteur de sortie du modèle).
const YAMNET_CLASSES: string[] = [
  "Speech", "Child speech, kid speaking", "Conversation", "Narration, monologue",
  "Babbling", "Speech synthesizer", "Shout", "Bellow",
  "Whoop", "Yell", "Children shouting", "Screaming",
  "Whispering", "Laughter", "Baby laughter", "Giggle",
  "Snicker", "Belly laugh", "Chuckle, chortle", "Crying, sobbing",
  "Baby cry, infant cry", "Whimper", "Wail, moan", "Sigh",
  "Singing", "Choir", "Yodeling", "Chant",
  "Mantra", "Child singing", "Synthetic singing", "Rapping",
  "Humming", "Groan", "Grunt", "Whistling",
  "Breathing", "Wheeze", "Snoring", "Gasp",
  "Pant", "Snort", "Cough", "Throat clearing",
  "Sneeze", "Sniff", "Run", "Shuffle",
  "Walk, footsteps", "Chewing, mastication", "Biting", "Gargling",
  "Stomach rumble", "Burping, eructation", "Hiccup", "Fart",
  "Hands", "Finger snapping", "Clapping", "Heart sounds, heartbeat",
  "Heart murmur", "Cheering", "Applause", "Chatter",
  "Crowd", "Hubbub, speech noise, speech babble", "Children playing", "Animal",
  "Domestic animals, pets", "Dog", "Bark", "Yip",
  "Howl", "Bow-wow", "Growling", "Whimper (dog)",
  "Cat", "Purr", "Meow", "Hiss",
  "Caterwaul", "Livestock, farm animals, working animals", "Horse", "Clip-clop",
  "Neigh, whinny", "Cattle, bovinae", "Moo", "Cowbell",
  "Pig", "Oink", "Goat", "Bleat",
  "Sheep", "Fowl", "Chicken, rooster", "Cluck",
  "Crowing, cock-a-doodle-doo", "Turkey", "Gobble", "Duck",
  "Quack", "Goose", "Honk", "Wild animals",
  "Roaring cats (lions, tigers)", "Roar", "Bird", "Bird vocalization, bird call, bird song",
  "Chirp, tweet", "Squawk", "Pigeon, dove", "Coo",
  "Crow", "Caw", "Owl", "Hoot",
  "Bird flight, flapping wings", "Canidae, dogs, wolves", "Rodents, rats, mice", "Mouse",
  "Patter", "Insect", "Cricket", "Mosquito",
  "Fly, housefly", "Buzz", "Bee, wasp, etc.", "Frog",
  "Croak", "Snake", "Rattle", "Whale vocalization",
  "Music", "Musical instrument", "Plucked string instrument", "Guitar",
  "Electric guitar", "Bass guitar", "Acoustic guitar", "Steel guitar, slide guitar",
  "Tapping (guitar technique)", "Strum", "Banjo", "Sitar",
  "Mandolin", "Zither", "Ukulele", "Keyboard (musical)",
  "Piano", "Electric piano", "Organ", "Electronic organ",
  "Hammond organ", "Synthesizer", "Sampler", "Harpsichord",
  "Percussion", "Drum kit", "Drum machine", "Drum",
  "Snare drum", "Rimshot", "Drum roll", "Bass drum",
  "Timpani", "Tabla", "Cymbal", "Hi-hat",
  "Wood block", "Tambourine", "Rattle (instrument)", "Maraca",
  "Gong", "Tubular bells", "Mallet percussion", "Marimba, xylophone",
  "Glockenspiel", "Vibraphone", "Steelpan", "Orchestra",
  "Brass instrument", "French horn", "Trumpet", "Trombone",
  "Bowed string instrument", "String section", "Violin, fiddle", "Pizzicato",
  "Cello", "Double bass", "Wind instrument, woodwind instrument", "Flute",
  "Saxophone", "Clarinet", "Harp", "Bell",
  "Church bell", "Jingle bell", "Bicycle bell", "Tuning fork",
  "Chime", "Wind chime", "Change ringing (campanology)", "Harmonica",
  "Accordion", "Bagpipes", "Didgeridoo", "Shofar",
  "Theremin", "Singing bowl", "Scratching (performance technique)", "Pop music",
  "Hip hop music", "Beatboxing", "Rock music", "Heavy metal",
  "Punk rock", "Grunge", "Progressive rock", "Rock and roll",
  "Psychedelic rock", "Rhythm and blues", "Soul music", "Reggae",
  "Country", "Swing music", "Bluegrass", "Funk",
  "Folk music", "Middle Eastern music", "Jazz", "Disco",
  "Classical music", "Opera", "Electronic music", "House music",
  "Techno", "Dubstep", "Drum and bass", "Electronica",
  "Electronic dance music", "Ambient music", "Trance music", "Music of Latin America",
  "Salsa music", "Flamenco", "Blues", "Music for children",
  "New-age music", "Vocal music", "A capella", "Music of Africa",
  "Afrobeat", "Christian music", "Gospel music", "Music of Asia",
  "Carnatic music", "Music of Bollywood", "Ska", "Traditional music",
  "Independent music", "Song", "Background music", "Theme music",
  "Jingle (music)", "Soundtrack music", "Lullaby", "Video game music",
  "Christmas music", "Dance music", "Wedding music", "Happy music",
  "Sad music", "Tender music", "Exciting music", "Angry music",
  "Scary music", "Wind", "Rustling leaves", "Wind noise (microphone)",
  "Thunderstorm", "Thunder", "Water", "Rain",
  "Raindrop", "Rain on surface", "Stream", "Waterfall",
  "Ocean", "Waves, surf", "Steam", "Gurgling",
  "Fire", "Crackle", "Vehicle", "Boat, Water vehicle",
  "Sailboat, sailing ship", "Rowboat, canoe, kayak", "Motorboat, speedboat", "Ship",
  "Motor vehicle (road)", "Car", "Vehicle horn, car horn, honking", "Toot",
  "Car alarm", "Power windows, electric windows", "Skidding", "Tire squeal",
  "Car passing by", "Race car, auto racing", "Truck", "Air brake",
  "Air horn, truck horn", "Reversing beeps", "Ice cream truck, ice cream van", "Bus",
  "Emergency vehicle", "Police car (siren)", "Ambulance (siren)", "Fire engine, fire truck (siren)",
  "Motorcycle", "Traffic noise, roadway noise", "Rail transport", "Train",
  "Train whistle", "Train horn", "Railroad car, train wagon", "Train wheels squealing",
  "Subway, metro, underground", "Aircraft", "Aircraft engine", "Jet engine",
  "Propeller, airscrew", "Helicopter", "Fixed-wing aircraft, airplane", "Bicycle",
  "Skateboard", "Engine", "Light engine (high frequency)", "Dental drill, dentist's drill",
  "Lawn mower", "Chainsaw", "Medium engine (mid frequency)", "Heavy engine (low frequency)",
  "Engine knocking", "Engine starting", "Idling", "Accelerating, revving, vroom",
  "Door", "Doorbell", "Ding-dong", "Sliding door",
  "Slam", "Knock", "Tap", "Squeak",
  "Cupboard open or close", "Drawer open or close", "Dishes, pots, and pans", "Cutlery, silverware",
  "Chopping (food)", "Frying (food)", "Microwave oven", "Blender",
  "Water tap, faucet", "Sink (filling or washing)", "Bathtub (filling or washing)", "Hair dryer",
  "Toilet flush", "Toothbrush", "Electric toothbrush", "Vacuum cleaner",
  "Zipper (clothing)", "Keys jangling", "Coin (dropping)", "Scissors",
  "Electric shaver, electric razor", "Shuffling cards", "Typing", "Typewriter",
  "Computer keyboard", "Writing", "Alarm", "Telephone",
  "Telephone bell ringing", "Ringtone", "Telephone dialing, DTMF", "Dial tone",
  "Busy signal", "Alarm clock", "Siren", "Civil defense siren",
  "Buzzer", "Smoke detector, smoke alarm", "Fire alarm", "Foghorn",
  "Whistle", "Steam whistle", "Mechanisms", "Ratchet, pawl",
  "Clock", "Tick", "Tick-tock", "Gears",
  "Pulleys", "Sewing machine", "Mechanical fan", "Air conditioning",
  "Cash register", "Printer", "Camera", "Single-lens reflex camera",
  "Tools", "Hammer", "Jackhammer", "Sawing",
  "Filing (rasp)", "Sanding", "Power tool", "Drill",
  "Explosion", "Gunshot, gunfire", "Machine gun", "Fusillade",
  "Artillery fire", "Cap gun", "Fireworks", "Firecracker",
  "Burst, pop", "Eruption", "Boom", "Wood",
  "Chop", "Splinter", "Crack", "Glass",
  "Chink, clink", "Shatter", "Liquid", "Splash, splatter",
  "Slosh", "Squish", "Drip", "Pour",
  "Trickle, dribble", "Gush", "Fill (with liquid)", "Spray",
  "Pump (liquid)", "Stir", "Boiling", "Sonar",
  "Arrow", "Whoosh, swoosh, swish", "Thump, thud", "Thunk",
  "Electronic tuner", "Effects unit", "Chorus effect", "Basketball bounce",
  "Bang", "Slap, smack", "Whack, thwack", "Smash, crash",
  "Breaking", "Bouncing", "Whip", "Flap",
  "Scratch", "Scrape", "Rub", "Roll",
  "Crushing", "Crumpling, crinkling", "Tearing", "Beep, bleep",
  "Ping", "Ding", "Clang", "Squeal",
  "Creak", "Rustle", "Whir", "Clatter",
  "Sizzle", "Clicking", "Clickety-clack", "Rumble",
  "Plop", "Jingle, tinkle", "Hum", "Zing",
  "Boing", "Crunch", "Silence", "Sine wave",
  "Harmonic", "Chirp tone", "Sound effect", "Pulse",
  "Inside, small room", "Inside, large room or hall", "Inside, public space", "Outside, urban or manmade",
  "Outside, rural or natural", "Reverberation", "Echo", "Noise",
  "Environmental noise", "Static", "Mains hum", "Distortion",
  "Sidetone", "Cacophony", "White noise", "Pink noise",
  "Throbbing", "Vibration", "Television", "Radio",
  "Field recording",
];

// Sous-ensemble des 521 classes pertinent pour un style musical, avec leur
// libellé français affiché à l'utilisateur.
const GENRE_LABELS_FR: Record<string, string> = {
  'Pop music': 'Pop',
  'Hip hop music': 'Hip-Hop',
  'Rock music': 'Rock',
  'Heavy metal': 'Metal',
  'Punk rock': 'Punk',
  'Grunge': 'Grunge',
  'Progressive rock': 'Rock progressif',
  'Rock and roll': "Rock'n'roll",
  'Psychedelic rock': 'Rock psychédélique',
  'Rhythm and blues': 'R&B',
  'Soul music': 'Soul',
  'Reggae': 'Reggae',
  'Country': 'Country',
  'Swing music': 'Swing',
  'Bluegrass': 'Bluegrass',
  'Funk': 'Funk',
  'Folk music': 'Folk',
  'Middle Eastern music': 'Musique orientale',
  'Jazz': 'Jazz',
  'Disco': 'Disco',
  'Classical music': 'Classique',
  'Opera': 'Opéra',
  'Electronic music': 'Électronique',
  'House music': 'House',
  'Techno': 'Techno',
  'Dubstep': 'Dubstep',
  'Drum and bass': 'Drum and Bass',
  'Electronica': 'Électronica',
  'Electronic dance music': 'EDM',
  'Ambient music': 'Ambient',
  'Trance music': 'Trance',
  'Music of Latin America': 'Musique latino-américaine',
  'Salsa music': 'Salsa',
  'Flamenco': 'Flamenco',
  'Blues': 'Blues',
  'New-age music': 'New Age',
  'Music of Africa': 'Musique africaine',
  'Afrobeat': 'Afrobeat',
  'Christian music': 'Musique chrétienne',
  'Gospel music': 'Gospel',
  'Music of Asia': 'Musique asiatique',
  'Carnatic music': 'Musique carnatique',
  'Music of Bollywood': 'Bollywood',
  'Ska': 'Ska',
  'Independent music': 'Musique indépendante',
};

const GENRE_LABEL_INDICES: { index: number; genre: string }[] = Object.entries(GENRE_LABELS_FR)
  .map(([label, genre]) => ({ index: YAMNET_CLASSES.indexOf(label), genre }))
  .filter((e) => e.index !== -1);

const MODEL_URL = '/models/yamnet-genre/model.json';
const MIN_CONFIDENCE = 0.02;

let modelPromise: Promise<any> | null = null;

async function loadModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const tf = await import('@tensorflow/tfjs');
      return tf.loadGraphModel(MODEL_URL);
    })();
  }
  return modelPromise;
}

/**
 * Ré-échantillonne et mixe en mono un AudioBuffer vers 16 kHz, format
 * attendu par YAMNet, via OfflineAudioContext (ré-échantillonnage natif
 * du navigateur, meilleure qualité qu'une interpolation manuelle).
 */
async function resampleToMono16k(audioBuffer: AudioBuffer): Promise<Float32Array> {
  const targetSampleRate = 16000;
  const length = Math.max(1, Math.ceil(audioBuffer.duration * targetSampleRate));
  const OfflineCtx = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  const offlineCtx = new OfflineCtx(1, length, targetSampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start();
  const rendered = await offlineCtx.startRendering();
  return rendered.getChannelData(0);
}

export interface GenreDetectionResult {
  genre: string;
  confidence: number;
  alternatives: { genre: string; confidence: number }[];
}

/**
 * Détecte le style musical dominant d'un morceau à partir de son
 * AudioBuffer déjà décodé, via YAMNet exécuté entièrement dans le
 * navigateur (aucune donnée envoyée à un serveur). Renvoie null si aucun
 * style ne ressort avec une confiance suffisante (morceau non musical,
 * silence, échec de chargement du modèle...) plutôt que de deviner au
 * hasard.
 */
export async function detectGenre(audioBuffer: AudioBuffer): Promise<GenreDetectionResult | null> {
  try {
    const tf = await import('@tensorflow/tfjs');
    const model = await loadModel();
    const mono16k = await resampleToMono16k(audioBuffer);
    const inputTensor = tf.tensor1d(mono16k, 'float32');

    try {
      const result = model.execute({ input_1: inputTensor });
      const outputs = Array.isArray(result) ? result : [result];
      const scoresTensor = outputs.find((t: any) => t.shape[1] === YAMNET_CLASSES.length);
      if (!scoresTensor) {
        outputs.forEach((t: any) => t.dispose());
        return null;
      }

      const scores: number[][] = await scoresTensor.array();
      outputs.forEach((t: any) => t.dispose());

      if (scores.length === 0) return null;

      const avg = new Array(YAMNET_CLASSES.length).fill(0);
      for (const row of scores) {
        for (let i = 0; i < row.length; i++) avg[i] += row[i] / scores.length;
      }

      const ranked = GENRE_LABEL_INDICES
        .map(({ index, genre }) => ({ genre, score: avg[index] }))
        .sort((a, b) => b.score - a.score);

      if (ranked.length === 0 || ranked[0].score < MIN_CONFIDENCE) return null;

      return {
        genre: ranked[0].genre,
        confidence: ranked[0].score,
        alternatives: ranked.slice(1, 4)
          .filter((r) => r.score >= MIN_CONFIDENCE / 2)
          .map((r) => ({ genre: r.genre, confidence: r.score })),
      };
    } finally {
      inputTensor.dispose();
    }
  } catch (error) {
    console.error('Erreur détection du style musical:', error);
    return null;
  }
}
