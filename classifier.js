/**
 * Kozhi Koo Classifier & Satirical Analysis Engine
 * Evaluates audio metrics (dB, Bass %, Duration, Pitch variance)
 * and generates hilarious classifications, ratings, and village predictions.
 */

const KOO_ARCHETYPES = [
  {
    id: 'existential',
    name: 'The 4:00 AM Existential Crisis Koo',
    malayalam: 'അസ്തിത്വ പ്രതിസന്ധി കൂവൽ',
    tagline: 'Why am I awake? What is sun? Why am I a chicken?',
    minBass: 20,
    maxBass: 60,
    minDb: 65,
    maxDb: 85,
    description: 'A prolonged, sorrowful crow filled with deep philosophical angst. The rooster wonders if dawn is an illusion and if worms have consciousness.',
    badge: 'Existential Dread 🌌',
    color: '#8b5cf6',
    quotes: [
      '"Koooo... but what is the meaning of it all?" — Kozhi Chettan',
      '"Sun rises in the east, but my will to live sets in the west."',
      '"I crow, therefore I am... potentially biryani tomorrow."'
    ]
  },
  {
    id: 'bass_808',
    name: 'The Subwoofer 808 Desi Machan Koo',
    malayalam: 'സബ്-വൂഫർ നാടൻ മച്ചാൻ കൂവൽ',
    tagline: 'Pure 120Hz chest vibration. Rattles the tea shop glasses.',
    minBass: 65,
    maxBass: 100,
    minDb: 80,
    maxDb: 120,
    description: 'An absolute unit of a crow. Low-end rumble that bypasses human ears and directly rattles the intestines of neighborhood cats.',
    badge: 'Bass Monster 🔊',
    color: '#b91c1c',
    quotes: [
      '"Panchayath ward member heard this and dropped his morning tea."',
      '"Heavy low-end! The coop floor felt like a techno festival."',
      '"Warning: prolonged exposure will vibrate roof tiles off."'
    ]
  },
  {
    id: 'chilly_chicken',
    name: 'The Chilly Chicken Survival Panic Koo',
    malayalam: 'ചില്ലി ചിക്കൻ ഭയവിഭ്രാന്തി കൂവൽ',
    tagline: 'Spotted the kitchen knife. 100% adrenaline, 0% bass.',
    minBass: 0,
    maxBass: 25,
    minDb: 85,
    maxDb: 110,
    description: 'A piercing, hyper-accelerated ultrasonic shriek. Highly motivated by the sight of ginger-garlic paste on the kitchen counter.',
    badge: 'Survival Instinct 🔪',
    color: '#ea580c',
    quotes: [
      '"Saw Amma buying capsicum and immediately hit 10,000 Hertz!"',
      '"Not a morning alarm, this is an SOS distress beacon."',
      '"Survival probability temporarily increased by +4.2%."'
    ]
  },
  {
    id: 'broken_carb',
    name: 'The Broken Bajaj Auto Carburetor Koo',
    malayalam: 'സ്റ്റാർട്ട് ആവാത്ത ഓട്ടോ കൂവൽ',
    tagline: 'Stutters 4 times, clears throat, runs out of lung capacity.',
    minBass: 25,
    maxBass: 55,
    minDb: 40,
    maxDb: 70,
    description: 'Sounds like a 1998 2-stroke scooter trying to crank on a cold rainy July morning. Lacks lubrication and vocal stamina.',
    badge: 'Mechanical Failure 🛵',
    color: '#ca8a04',
    quotes: [
      '"Needs a 2T oil additive in the grain feeder ASAP."',
      '"K-k-koo... *coughs in Malayali*... kooo."',
      '"Uncle tapped the chicken on the side to make it start."'
    ]
  },
  {
    id: 'opera_diva',
    name: 'The Soprano Opera Pavarotti Hen-Diva',
    malayalam: 'ഓപ്പറ സിംഗർ ഗന്ധർവ്വ കൂവൽ',
    tagline: 'Pure sustained vibrato. Requires velvet curtains and tickets.',
    minBass: 10,
    maxBass: 40,
    minDb: 75,
    maxDb: 95,
    description: 'Dramatic crescendo with impeccable melodic arch. Thinks the chicken coop is the Royal Albert Hall.',
    badge: 'Grammy Contender 🎭',
    color: '#d97706',
    quotes: [
      '"Caruso could never hold a high C like this feathery legend."',
      '"The other chickens threw grain like roses at the stage."',
      '"Demanded sparkling well-water before the next vocal rehearsal."'
    ]
  },
  {
    id: 'gramam_alarm',
    name: 'The Certified Gramam Alarm Clock 3000',
    malayalam: 'പഞ്ചായത്ത് സർട്ടിഫൈഡ് അലാം',
    tagline: 'Precise, punctual, duty-bound, zero nonsense.',
    minBass: 40,
    maxBass: 70,
    minDb: 70,
    maxDb: 90,
    description: 'The golden standard of rural wake-up calls. Punctual, proud, balanced frequency distribution. Has never overslept since 2021.',
    badge: 'Standard Edition ⏰',
    color: '#16a34a',
    quotes: [
      '"Neighbor grandfather looked at his HMT watch and nodded in approval."',
      '"Exactly on pitch. The tea stall kettle whistled in harmony."',
      '"Zero lag, zero buffer, pure organic timekeeping."'
    ]
  },
  {
    id: 'whisper_broiler',
    name: 'The Shy Broiler Introvert Peep',
    malayalam: 'നാണക്കാരൻ ബ്രോയിലർ അടക്കംപറച്ചിൽ',
    tagline: 'Too polite to wake anyone. Apologizes for existing.',
    minBass: 15,
    maxBass: 45,
    minDb: 30,
    maxDb: 55,
    description: 'An understated, timid murmur. Clearly reads self-help books and avoids direct eye contact with crows and pigeons.',
    badge: 'Gentle Soul 🐣',
    color: '#0284c7',
    quotes: [
      '"whispers: *excuse me, sorry to bother, but sun is somewhat up*."',
      '"Even the ants in the yard kept sleeping through this one."',
      '"Would prefer to send an email rather than crow."'
    ]
  }
];

const EGG_PREDICTIONS = [
  'Egg production forecast: +14% due to chest resonance alignment.',
  'Warning: Low bass detected. Eggs may come out pre-scrambled.',
  'Planetary rooster alignment indicates double-yolk fortune tomorrow!',
  'Egg output steady; local hens rated this performance 4.5/5 stars on Yelp.',
  'Koo frequency too sharp: Shell calcium density currently fluctuating.',
  'Prediction: 3 brown eggs, 1 philosophical contemplation egg.'
];

const NEIGHBOR_REACTIONS = [
  'Next door Uncle threw his left slippers onto the asbestos roof.',
  'Local tea stall owner started making the 3rd batch of chai.',
  'Street dog stopped barking and gave a respectful slow nod.',
  'Neighbor aunty woke up thinking the mixer-grinder was running on its own.',
  'Village Panchayat convened an emergency decibel committee.',
  'Entire rubber estate workers checked their mobile alarms in confusion.'
];

/**
 * Classify a detected crow based on audio metrics
 * @param {Object} metrics - { peakDb, bassRatio, durationMs, pitchCentroid }
 * @returns {Object} Full analysis result
 */
function classifyKoo(metrics) {
  const db = Math.round(metrics.peakDb || 70);
  const bassPct = Math.round((metrics.bassRatio || 0.4) * 100);
  const durationSec = ((metrics.durationMs || 1500) / 1000).toFixed(2);
  const pitchCentroid = Math.round(metrics.pitchCentroid || 600);

  // Intensity category
  let intensityLevel, intensityDesc, intensityBadge;
  if (db < 50) {
    intensityLevel = 'Feather-Soft Whisper';
    intensityDesc = 'Barely disturbed the morning dew.';
    intensityBadge = '🟢 Subdued';
  } else if (db < 70) {
    intensityLevel = 'Modest Village Chime';
    intensityDesc = 'Woke up only light sleepers and sensitive kittens.';
    intensityBadge = '🟡 Respectable';
  } else if (db < 88) {
    intensityLevel = 'Assertive Alpha Roo';
    intensityDesc = 'Clear, resonant, penetrated through closed bedroom windows.';
    intensityBadge = '🟠 Pungent';
  } else {
    intensityLevel = 'EAR-SHATTERING MEGAPACK';
    intensityDesc = 'Dislodged three coconuts from the tree across the fence!';
    intensityBadge = '🔴 Seismic Boom';
  }

  // Bass category
  let bassLevel;
  if (bassPct < 25) {
    bassLevel = 'Paper-Thin Treble Screech (Soprano Hen)';
  } else if (bassPct < 45) {
    bassLevel = 'Crisp Balanced Midrange (Nadan Standard)';
  } else if (bassPct < 65) {
    bassLevel = 'Deep Chest Resonator (Macho Rooster)';
  } else {
    bassLevel = '808 Sub-Bass Trap King (Roof Rattler)';
  }

  // Best matching archetype based on distance in (bass, db) space
  let bestArchetype = KOO_ARCHETYPES[0];
  let bestScore = -999999;

  KOO_ARCHETYPES.forEach((arch) => {
    let score = 0;
    // Bass match
    if (bassPct >= arch.minBass && bassPct <= arch.maxBass) {
      score += 50;
    } else {
      score -= Math.min(Math.abs(bassPct - arch.minBass), Math.abs(bassPct - arch.maxBass)) * 2;
    }

    // Db match
    if (db >= arch.minDb && db <= arch.maxDb) {
      score += 40;
    } else {
      score -= Math.min(Math.abs(db - arch.minDb), Math.abs(db - arch.maxDb)) * 1.5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestArchetype = arch;
    }
  });

  // Pick random quotes/predictions
  const randomQuote = bestArchetype.quotes[Math.floor(Math.random() * bestArchetype.quotes.length)];
  const randomEgg = EGG_PREDICTIONS[Math.floor(Math.random() * EGG_PREDICTIONS.length)];
  const randomReaction = NEIGHBOR_REACTIONS[Math.floor(Math.random() * NEIGHBOR_REACTIONS.length)];

  // Rooster Roast Rating (1 - 10)
  const roastRating = Math.min(10, Math.max(1, Number((db * 0.06 + bassPct * 0.04 + Math.min(durationSec * 1.2, 3)).toFixed(1))));

  return {
    id: 'koo_' + Date.now(),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    metrics: {
      db,
      bassPct,
      durationSec,
      pitchCentroid
    },
    archetype: bestArchetype,
    intensity: {
      level: intensityLevel,
      desc: intensityDesc,
      badge: intensityBadge
    },
    bass: {
      level: bassLevel,
      percentage: bassPct
    },
    quote: randomQuote,
    eggPrediction: randomEgg,
    neighborReaction: randomReaction,
    roastRating: roastRating
  };
}

// Export to window
if (typeof window !== 'undefined') {
  window.KooClassifier = {
    classifyKoo,
    KOO_ARCHETYPES
  };
}
