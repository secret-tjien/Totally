import { GameConfig } from '../config.js';
import { getString } from '../languages.js';

export default class Preload extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    this.load.image('bg', 'bg/000.jpg');
    const savedLevel = GameConfig.getSavedLevel();
    const packNum = GameConfig.getLevelPack(savedLevel);
    const fileNum = ((packNum - 1) % 11) + 1;
    const filename = String(fileNum).padStart(3, '0') + '.jpg';
    this.load.image(`bg_${packNum}`, `./bg/${filename}`);
    this.load.image('logo', 'bg/Totally Logo.png');
    this.load.image('sogLogo', 'bg/SOGLogo.png');

    const orbCanvas = document.createElement('canvas');
    orbCanvas.width = 100;
    orbCanvas.height = 100;
    const oCtx = orbCanvas.getContext('2d');
    
    oCtx.beginPath();
    oCtx.arc(50, 50, 48, 0, Math.PI * 2);
    oCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    oCtx.fill();
    
    oCtx.beginPath();
    oCtx.arc(50, 50, 48, 0, Math.PI * 2);
    const innerGrad = oCtx.createRadialGradient(50, 50, 30, 50, 50, 48);
    innerGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    innerGrad.addColorStop(1, 'rgba(255, 255, 255, 0.4)');
    oCtx.fillStyle = innerGrad;
    oCtx.fill();
    
    oCtx.lineWidth = 2;
    oCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    oCtx.stroke();
    
    oCtx.beginPath();
    oCtx.arc(50, 30, 20, 0, Math.PI * 2);
    const hGrad = oCtx.createRadialGradient(50, 30, 0, 50, 30, 20);
    hGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    hGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    oCtx.fillStyle = hGrad;
    oCtx.fill();

    this.load.image('orb', orbCanvas.toDataURL());
    
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 16;
    pCanvas.height = 16;
    const pCtx = pCanvas.getContext('2d');
    pCtx.beginPath();
    pCtx.arc(8, 8, 8, 0, Math.PI * 2);
    pCtx.fillStyle = '#ffffff';
    pCtx.fill();
    this.load.image('particle', pCanvas.toDataURL());

    // Load audio files
    this.load.audio('bgm', './music/bg.mp3');
    this.load.audio('bounce', './sfx/bounce.mp3');
    this.load.audio('chain', './sfx/chain.mp3');
    for (let i = 1; i <= 9; i++) {
      this.load.audio(`chain${i}`, `./sfx/chain${i}.mp3`);
    }
    this.load.audio('chained', './sfx/chained.mp3');
    this.load.audio('error', './sfx/error.mp3');
    this.load.audio('unchain', './sfx/unchain.mp3');
    this.load.audio('winlevel', './sfx/winlevel.mp3');
    this.load.audio('swoosh', './sfx/swoosh.mp3');
  }

  create() {
    const bgKey = 'bg';
    
    // Calculate average color for background
    if (!this.registry.has(`bgColor_${bgKey}`)) {
      try {
        const texture = this.textures.get(bgKey);
        const image = texture.getSourceImage();
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, 1, 1);
        const data = ctx.getImageData(0, 0, 1, 1).data;
        this.registry.set(`bgColor_${bgKey}`, Phaser.Display.Color.GetColor(data[0], data[1], data[2]));
      } catch (e) {
        this.registry.set(`bgColor_${bgKey}`, 0x000000);
      }
    }
    
    this.cameras.main.setBackgroundColor(this.registry.get(`bgColor_${bgKey}`));

    this.bg = this.add.image(GameConfig.width / 2, GameConfig.height / 2, bgKey);
    this.bg.setDepth(0);

    this.dustParticles = this.add.particles(0, 0, 'particle', {
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(-200, -200, this.cameras.main.width + 400, this.cameras.main.height + 400)
      },
      lifespan: { min: 4000, max: 8000 },
      speedY: { min: -15, max: -5 },
      speedX: { min: -10, max: 10 },
      scale: { min: GameConfig.dustParticles.minScale, max: GameConfig.dustParticles.maxScale },
      alpha: [0, GameConfig.dustParticles.maxAlpha, GameConfig.dustParticles.maxAlpha, 0],
      quantity: 1,
      frequency: 50,
      blendMode: 'ADD'
    });
    this.dustParticles.setDepth(0.5);

    this.scale.on('resize', this.resize, this);
    this.resize(this.scale.gameSize);

    if (GameConfig.poki && typeof PokiSDK !== 'undefined') {
      PokiSDK.gameLoadingFinished();
    }

    const width = GameConfig.width;
    const height = GameConfig.height;

    const logo = this.add.image(width / 2, height * (GameConfig.splash.logo.offsetY || 0.28), 'logo');
    logo.setOrigin(0.5);
    
    // Scale logo to fit nicely, max 80% of width
    const maxLogoWidth = width * (GameConfig.splash.logo.maxScale || 0.8);
    if (logo.width > maxLogoWidth) {
      logo.setScale(maxLogoWidth / logo.width);
    }

    // Add a gentle floating animation to the logo
    this.tweens.add({
      targets: logo,
      y: logo.y + 15,
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // SOG Logo
    const sogLogo = this.add.image(width / 2, height * (GameConfig.splash.sogLogo.offsetY || 0.75), 'sogLogo');
    sogLogo.setOrigin(0.5);
    const maxSogLogoWidth = width * (GameConfig.splash.sogLogo.maxScale || 0.1);
    if (sogLogo.width > maxSogLogoWidth) {
      sogLogo.setScale(maxSogLogoWidth / sogLogo.width);
    }

    // Copyright
    const copyrightText = this.add.text(width / 2, height * (GameConfig.splash.copyright.offsetY || 0.92), GameConfig.splash.copyright.text, {
      fontFamily: 'Arial, sans-serif',
      fontSize: GameConfig.splash.copyright.fontSize || '14px',
      color: GameConfig.splash.copyright.color || '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    const yPos = height / 2 + (height * (GameConfig.splash?.tapToStartOffsetY || 0));

    const text = this.add.text(width / 2, yPos, getString(GameConfig.language, 'tapToStart'), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '32px',
      color: '#ffffff',
      align: 'center',
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',
        blur: 4,
        fill: true
      }
    }).setOrigin(0.5);

    // Add a simple pulsing animation to the text
    this.tweens.add({
      targets: text,
      alpha: 0.5,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    this.input.once('pointerdown', () => {
      // Unlock audio context on first interaction
      if (this.sound.context && this.sound.context.state === 'suspended') {
        this.sound.context.resume();
      }
      
      if (GameConfig.audio.musicEnabled) {
        this.sound.play('bgm', { loop: true, volume: 0.5 });
      }

      // Ripple transition
      if (GameConfig.fancyEffect) {
        // Create the new background behind the old one
        const packNum = GameConfig.getLevelPack(GameConfig.getSavedLevel());
        const newBg = this.add.image(width / 2, height / 2, `bg_${packNum}`);
        const scale = this.bg.scaleY * (this.bg.height / newBg.height);
        newBg.setScale(scale);
        newBg.setDepth(-1);
        
        this.bg.setPostPipeline('Shockwave');
        const pipeline = this.bg.getPostPipeline('Shockwave');
        const shockwavePipeline = Array.isArray(pipeline) ? pipeline[0] : pipeline;
        
        if (shockwavePipeline) {
          const wave = shockwavePipeline.addShockwave(0.5, 0.5, 3.0); // Large scale for full screen transition
          
          this.tweens.add({
            targets: [this.bg, this.dustParticles, logo, sogLogo, text, copyrightText],
            alpha: 0,
            duration: GameConfig.transitionDuration || 2000,
            ease: 'Power2'
          });
          
          this.tweens.add({
            targets: wave,
            time: 1,
            duration: GameConfig.transitionDuration || 2000,
            ease: 'Power2',
            onComplete: () => {
              shockwavePipeline.removeShockwave(wave);
              this.scene.start('MainGame', { level: GameConfig.getSavedLevel() });
              this.scene.start('UI');
            }
          });
        } else {
          this.scene.start('MainGame', { level: GameConfig.getSavedLevel() });
          this.scene.start('UI');
        }
      } else {
        this.scene.start('MainGame', { level: GameConfig.getSavedLevel() });
        this.scene.start('UI');
      }
    });
  }

  resize(gameSize) {
    const width = gameSize.width;
    const height = gameSize.height;
    
    if (width === 0 || height === 0) return;
    
    const zoomX = width / GameConfig.width;
    const zoomY = height / GameConfig.height;
    const zoom = Math.min(zoomX, zoomY);
    
    this.cameras.main.setZoom(zoom);
    this.cameras.main.centerOn(GameConfig.width / 2, GameConfig.height / 2);
    
    const visibleWidth = width / zoom;
    const visibleHeight = height / zoom;
    
    if (this.bg) {
      const scale = visibleHeight / this.bg.height;
      this.bg.setScale(scale);
      this.bg.setPosition(GameConfig.width / 2, GameConfig.height / 2);
    }
    
    if (this.dustParticles) {
      const minX = GameConfig.width / 2 - visibleWidth / 2 - 200;
      const maxX = GameConfig.width / 2 + visibleWidth / 2 + 200;
      const minY = GameConfig.height / 2 - visibleHeight / 2 - 200;
      const maxY = GameConfig.height / 2 + visibleHeight / 2 + 200;
      
      this.dustParticles.setEmitZone({
        type: 'random',
        source: new Phaser.Geom.Rectangle(minX, minY, maxX - minX, maxY - minY)
      });
    }
  }
}
