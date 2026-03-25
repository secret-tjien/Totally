import { GameConfig } from './config.js';
import Preload from './scenes/Preload.js';
import MainGame from './scenes/MainGame.js';
import UI from './scenes/UI.js';
import ShockwavePipeline from './effects/ShockwavePipeline.js';

// Auto-detect Poki environment
const urlParams = new URLSearchParams(window.location.search);
const isPokiEnv = window.location.hostname.includes('poki') || urlParams.has('tag') || urlParams.has('poki');

if (isPokiEnv) {
  GameConfig.poki = true;
}

const initGame = () => {
  const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: GameConfig.width,
      height: GameConfig.height,
      min: {
        width: 1,
        height: 1
      }
    },
    physics: {
      default: 'matter',
      matter: {
        gravity: { y: GameConfig.physics.gravityY / 1000 },
        debug: false
      }
    },
    pipeline: {
      'Shockwave': ShockwavePipeline
    },
    scene: [Preload, MainGame, UI],
    backgroundColor: '#000000'
  };

  new Phaser.Game(config);
};

if (GameConfig.poki && typeof PokiSDK !== 'undefined') {
  PokiSDK.init().then(() => {
    console.log("Poki SDK initialized");
    initGame();
  }).catch(() => {
    console.log("Poki SDK initialized (adblock)");
    initGame();
  });
} else {
  initGame();
}
