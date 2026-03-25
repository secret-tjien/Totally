export const GameConfig = {
  width: 375,
  height: 812,
  levelCount: 50,
  poki: false,
  fancyEffect: true,
  transitionDuration: 2000, // Duration of the ripple transition in ms
  maxAssistLevel: 10,
  splash: {
    tapToStartOffsetY: 0.1, // 10% down from center
    logo: {
      offsetY: 0.28,
      maxScale: 0.85
    },
    sogLogo: {
      offsetY: 0.85,
      maxScale: 0.20
    },
    copyright: {
      offsetY: 0.92,
      text: "© 2026 Secret of Games",
      fontSize: '16px',
      color: '#0f1620'
    }
  },
  onboarding: {
    overlayAlpha: 0.8,
    overlayEnabled: [false, false]
  },
  onboardingCooldown: 200, //in ms
  idleHandTimeout: 10, // in seconds
  orbColors: {
    input: 0xffffff,
    outcome: 0x4a90e2,
    matched: 0x50e3c2,
    glow: 0xffffff
  },
  evaluationMode: 'leftToRight', // leftToRight or pemdas
  hintCosts: {
    inputSpark: 1,
    targetSpark: 2,
    chainStarter: 3
  },
  fontFamily: 'Arial, sans-serif',
  language: (() => {
    const saved = localStorage.getItem('gameLanguage');
    if (saved) return saved;
    
    const supported = ['en', 'nl', 'de', 'fr', 'it', 'es', 'pt-br', 'ko', 'zh-cn', 'ja', 'tr'];
    const browserLangs = navigator.languages || [navigator.language || 'en'];
    
    for (let lang of browserLangs) {
      lang = lang.toLowerCase();
      if (supported.includes(lang)) return lang;
      const base = lang.split('-')[0];
      if (supported.includes(base)) return base;
    }
    return 'en';
  })(),
  physics: {
    gravityY: 750,
    fps: 60,
    bounce: 0.4,
    drag: 0
  },
  audio: {
    bouncePitchRange: 1, // +/- tones for bounce sound
    sfxEnabled: true,
    musicEnabled: true
  },
  progressBar: {
    width: 300,
    height: 20,
    barColor: 0x50e3c2, // teak color
    barAlpha: 1.0,
    trackColor: 0x000000, // black background
    trackAlpha: 0.33,
    strokeColor: 0xffffff,
    strokeAlpha: 1.0,
    minProgress: 0.05,
    animationSpeed: 300, // ms
    yOffset: -50
  },
  orbSize: {
    minScale: 0.85, // 50% of base size
    maxScale: 1.5, // 150% of base size
    baseScale: 1.0 // current base scale
  },
  inputCircleRadius: 125,
  scalingAnimation: {
    scale: 1.4,
    duration: 200
  },
  dustParticles: {
    minScale: 0.05,
    maxScale: 0.20,
    maxAlpha: 0.3
  },
  dragLine: {
    color: 0xffffff,
    alpha: 0.5,
    width: 4,
    dotSize: 4,
    gapSize: 8
  },
  uShape: {
    offsetX: -6,
    offsetY: -172,
    sizeX: 386,
    sizeY: 500,
    alpha: 0.08
  },
  celebrations: [
    'Intelligent',
    'Clever',
    'Bright',
    'Sharp',
    'Brilliant',
    'Great',
    'Awesome',
    'Fantastic',
    'Super',
    'Very good',
    'Resourceful',
    'Gifted',
    'Profound',
    'Excellent',
    'Well done'
  ],
  orbCompliments: {
    group1: ['Cool!', 'Nice!', 'Great!', 'Good!', 'Ace!', 'OK!', 'Rad!'],
    group2: ['Awesome!', 'Super!', 'Well done!', 'Very Good!', 'Clever!', 'Smart!'],
    group3: ['Intelligent!', 'Bright!', 'Sharp!', 'Brilliant!', 'Fantastic!', 'Resourceful!', 'Gifted!', 'Profound!', 'Excellent!'],
    floaterDelay: 250
  },
  levelCompliments: [
    'Advancing!',
    'Improving!',
    'Better and better!',
    'Committed!',
    'Mastering!',
    'Remarkable!',
    'Phenomenal!',
    'Outstanding!',
    'Dedicated!',
    'Raising IQ!',
    'Exemplary!',
    'Promising!'
  ],
  getLevelPack: (level) => {
    if (level <= 5) return 1;
    if (level <= 10) return 2;
    if (level <= 15) return 3;
    if (level <= 22) return 4;
    if (level <= 29) return 5;
    return 5 + Math.ceil((level - 29) / 10);
  },
  getAvailableNumbers: (level) => {
    if (level === 1) return [1, 2, 3];
    if (level === 2) return [1, 2, 3, 4];
    if (level === 3) return [1, 2, 3, 4, 5];
    if (level === 4) return [1, 2, 3, 4, 5];
    if (level === 5) return [1, 2, 3, 4, 5, 6];
    if (level === 6) return [1, 2, 3];
    if (level === 7) return [1, 2, 3, 4];
    if (level === 8) return [1, 2, 3, 4];
    if (level === 9) return [1, 2, 3, 4];
    if (level === 10) return [1, 2, 3, 4, 5];
    if (level >= 11 && level <= 15) return [1, 2, 3, 4, 5];
    if (level >= 16 && level <= 20) return [1, 2, 3, 4, 5, 6];
    
    let numbers = [1, 2, 3, 4, 5, 6, 7];
    if (level > 20) numbers = [...numbers, 8];
    if (level > 30) numbers = [...numbers, 9, 0];
    return numbers;
  },
  getPackRange: (level) => {
    let pack;
    if (level <= 5) pack = 1;
    else if (level <= 10) pack = 2;
    else if (level <= 15) pack = 3;
    else if (level <= 22) pack = 4;
    else if (level <= 29) pack = 5;
    else pack = 5 + Math.ceil((level - 29) / 10);

    if (pack === 1) return { start: 1, end: 5 };
    if (pack === 2) return { start: 6, end: 10 };
    if (pack === 3) return { start: 11, end: 15 };
    if (pack === 4) return { start: 16, end: 22 };
    if (pack === 5) return { start: 23, end: 29 };
    
    const start = 29 + (pack - 6) * 10 + 1;
    const end = 29 + (pack - 5) * 10;
    return { start, end };
  }
};
