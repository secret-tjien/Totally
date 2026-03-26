import { GameConfig } from '../config.js';
import { generateLevel } from '../levels.js';
import { evaluateLeftToRight } from '../utils/mathSolver.js';
import { getString } from '../languages.js';

export default class MainGame extends Phaser.Scene {
  constructor() {
    super('MainGame');
  }

  getChainTokens() {
    const tokens = [];
    let currentNum = '';
    
    for (const s of this.currentChain) {
      const val = s.value;
      if (!isNaN(parseInt(val))) {
        currentNum += val;
      } else {
        if (val === '-' && tokens.length === 0 && currentNum === '') {
          currentNum = '-';
        } else {
          if (currentNum !== '') {
            tokens.push(currentNum);
            currentNum = '';
          }
          tokens.push(val);
        }
      }
    }
    if (currentNum !== '' && currentNum !== '-') tokens.push(currentNum);
    return tokens;
  }

  calculateCurrentSum() {
    if (this.currentChain.length === 0) return null;
    const tokens = this.getChainTokens();
    return evaluateLeftToRight(tokens);
  }

  startScalingAnimation(o) {
    o.isAnimating = true;
    o.scalingTween = this.tweens.add({
      targets: o.text,
      scale: GameConfig.scalingAnimation.scale,
      duration: GameConfig.scalingAnimation.duration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    o.orb.setTint(GameConfig.orbColors.matched);
    if (!o.glowFx) {
      o.glowFx = o.orb.postFX.addGlow(GameConfig.orbColors.matched, 4, 0, false, 0.1, 10);
    }
  }
  
  stopScalingAnimation(o) {
    o.isAnimating = false;
    if (o.scalingTween) {
      o.scalingTween.stop();
      o.scalingTween = null;
    }
    o.text.setScale(1);
    
    o.orb.setTint(this.bgColor);
    if (o.glowFx) {
      o.orb.postFX.remove(o.glowFx);
      o.glowFx = null;
    }
  }

  init(data) {
    this.levelNum = data.level || 1;
    GameConfig.saveLevel(this.levelNum);
    this.levelData = generateLevel(this.levelNum);
    this.outcomes = [...this.levelData.outcomes];
    this.inputs = [...this.levelData.inputs];
    
    this.outcomeSpheres = [];
    this.inputSpheres = [];
    this.currentChain = [];
    this.isDragging = false;
    this.currentLang = GameConfig.language;
    this.idleTimer = 0;
    
    this.graphics = null;
  }

  preload() {
    const packNum = GameConfig.getLevelPack(this.levelNum);
    const bgKey = `bg_${packNum}`;
    if (!this.textures.exists(bgKey)) {
      // Loop background images from 001.jpg to 011.jpg (11 level backgrounds)
      const fileNum = ((packNum - 1) % 11) + 1;
      const filename = String(fileNum).padStart(3, '0') + '.jpg';
      this.load.image(bgKey, `./bg/${filename}`);
    }
  }

  playSound(key, config) {
    if (GameConfig.audio.sfxEnabled && this.cache.audio.exists(key)) {
      this.sound.play(key, config);
    }
  }

  create() {
    this.sceneStartTime = this.time.now;
    if (GameConfig.poki && typeof PokiSDK !== 'undefined') {
      PokiSDK.gameplayStart();
    }

    const packNum = GameConfig.getLevelPack(this.levelNum);
    const bgKey = this.textures.exists(`bg_${packNum}`) ? `bg_${packNum}` : 'bg';
    
    // Cache the background color to avoid expensive canvas operations on restart
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
    
    this.bgColor = this.registry.get(`bgColor_${bgKey}`);
    this.cameras.main.setBackgroundColor(this.bgColor);
    
    // Add shockwave pipeline
    if (GameConfig.fancyEffect) {
      this.cameras.main.setPostPipeline('Shockwave');
      const pipeline = this.cameras.main.getPostPipeline('Shockwave');
      this.shockwavePipeline = Array.isArray(pipeline) ? pipeline[0] : pipeline;
    } else {
      this.shockwavePipeline = null;
    }

    this.bg = this.add.image(GameConfig.width / 2, GameConfig.height / 2, bgKey);
    this.bg.setDepth(0);

    this.dustParticles = this.add.particles(0, 0, 'particle', {
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(-200, -200, GameConfig.width + 400, GameConfig.height + 400)
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

    this.graphics = this.add.graphics();
    this.graphics.setDepth(1);
    this.graphics.postFX.addGlow(GameConfig.orbColors.matched, 4, 0, false, 0.1, 10);

    this.bgBlurred = this.add.image(GameConfig.width / 2, GameConfig.height / 2, bgKey);
    this.bgBlurred.setDepth(2);
    this.bgBlurred.postFX.addBlur(1, 2, 2, 1);

    this.orbMaskGraphics = this.add.graphics();
    this.orbMaskGraphics.setVisible(false);
    
    const mask = new Phaser.Display.Masks.BitmapMask(this, this.orbMaskGraphics);
    this.bgBlurred.setMask(mask);

    this.tapsWithoutDrag = 0;
    this.onboardingActive = false;
    this.lastInteractionTime = this.time.now;
    
    this.createCenterDisplay();
    this.createOutcomeSpheres();
    this.createInputSpheres();

    if (this.levelNum === 1) {
      this.showOnboardingOverlay();
    }

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    
    this.particles = this.add.particles(0, 0, 'particle', {
      speed: { min: 100, max: 300 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.0, end: 0 },
      blendMode: 'ADD',
      lifespan: 1500,
      gravityY: 400,
      tint: GameConfig.orbColors.matched,
      emitting: false
    });
    this.particles.setDepth(20);

    const onCollision = (event) => {
      if (this.cache.audio.exists('bounce')) {
        // Calculate rate based on +/- tones config
        // 1 tone = 2^(2/12) = 1.12246
        const tones = GameConfig.audio.bouncePitchRange;
        const minRate = Math.pow(2, (-2 * tones) / 12);
        const maxRate = Math.pow(2, (2 * tones) / 12);
        const rate = Phaser.Math.FloatBetween(minRate, maxRate);
        this.playSound('bounce', { volume: 0.3, rate: rate });
      }
    };
    
    this.matter.world.on('collisionstart', onCollision);

    this.scale.on('resize', this.resize, this);
    this.events.once('shutdown', () => {
      if (this.scale) {
        this.scale.off('resize', this.resize, this);
      }
      if (this.matter && this.matter.world) {
        this.matter.world.off('collisionstart', onCollision);
      }
    });
    this.resize(this.scale.gameSize);
  }

  showOnboardingOverlay(step = 1) {
    if (this.onboardingOverlay) {
      this.onboardingOverlay.destroy();
    }
    if (this.onboardingSpotlight) {
      this.onboardingSpotlight.destroy();
    }

    if (!GameConfig.onboarding.overlayEnabled[step - 1]) return;

    this.onboardingStep = step;
    this.onboardingOverlay = this.add.container(0, 0);
    this.onboardingOverlay.setDepth(1000);
    
    const darkLayer = this.add.graphics();
    darkLayer.fillStyle(0x000000, GameConfig.onboarding.overlayAlpha);
    darkLayer.fillRect(-2000, -2000, 6000, 6000);
    
    this.onboardingSpotlight = this.make.graphics();
    this.onboardingSpotlight.fillStyle(0xffffff, 1);
    
    let spotlightX, spotlightY, spotlightW, spotlightH;
    let mainTextKey;

    if (step === 1) {
      spotlightX = GameConfig.uShape.offsetX;
      spotlightY = GameConfig.uShape.offsetY;
      spotlightW = GameConfig.uShape.sizeX;
      spotlightH = GameConfig.uShape.sizeY;
      mainTextKey = 'matchNumbers';
    } else {
      spotlightW = 320;
      spotlightH = 320;
      spotlightX = GameConfig.width / 2 - spotlightW / 2;
      spotlightY = GameConfig.height * 0.75 - spotlightH / 2;
      mainTextKey = 'dragNumbers';
    }

    this.onboardingSpotlight.fillRoundedRect(spotlightX, spotlightY, spotlightW, spotlightH, 30);
    
    const mask = new Phaser.Display.Masks.BitmapMask(this, this.onboardingSpotlight);
    mask.invertAlpha = true;
    darkLayer.setMask(mask);
    
    this.onboardingOverlay.add(darkLayer);
    
    // Text
    const textY = (step === 1) ? (spotlightY + spotlightH + 40) : (spotlightY - 80);
    this.onboardingMainText = this.add.text(GameConfig.width / 2, textY, getString(GameConfig.language, mainTextKey), {
      fontFamily: GameConfig.fontFamily,
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'normal'
    }).setOrigin(0.5);
    this.onboardingOverlay.add(this.onboardingMainText);
    
    this.onboardingSubText = this.add.text(GameConfig.width / 2, textY + 30, getString(GameConfig.language, 'tapToContinue'), {
      fontFamily: GameConfig.fontFamily,
      fontSize: '16px',
      color: '#aaaaaa'
    }).setOrigin(0.5);
    this.onboardingOverlay.add(this.onboardingSubText);
    
    this.tweens.add({
      targets: this.onboardingSubText,
      alpha: 0.2,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    const hitArea = new Phaser.Geom.Rectangle(-2000, -2000, 6000, 6000);
    this.onboardingOverlay.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    this.onboardingOverlay.once('pointerdown', () => {
      if (step === 1) {
        this.showOnboardingOverlay(2);
      } else {
        this.onboardingOverlay.destroy();
        this.onboardingOverlay = null;
        this.onboardingSpotlight.destroy();
        this.onboardingSpotlight = null;
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
    if (this.bgBlurred) {
      const scale = visibleHeight / this.bgBlurred.height;
      this.bgBlurred.setScale(scale * 1.2);
      this.bgBlurred.setPosition(GameConfig.width / 2, GameConfig.height / 2);
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

  giveHint() {
    this.showOnboarding(true, true);
  }

  showOnboarding(force = false, isHint = false) {
    if (!isHint && this.levelNum > GameConfig.maxAssistLevel) return;
    if (this.onboardingActive) {
      if (!force) return;
      if (this.onboardingTween) {
        this.onboardingTween.stop();
        this.onboardingTween = null;
      }
      if (this.onboardingFinger) {
        this.onboardingFinger.destroy();
        this.onboardingFinger = null;
      }
      if (this.onboardingGraphics) {
        this.onboardingGraphics.destroy();
        this.onboardingGraphics = null;
      }
      this.inputSpheres.forEach(s => {
        s.orb.setTint(0xffffff);
      });
    }
    
    const activeOutcomes = this.outcomeSpheres.filter(o => o.active);
    if (activeOutcomes.length === 0) return;

    const target = activeOutcomes[0];
    const exprStr = target.expression;

    const availableOrbs = [...this.inputSpheres];
    const chainToHighlight = [];

    for (const char of exprStr) {
      const orbIndex = availableOrbs.findIndex(o => o.value === char);
      if (orbIndex !== -1) {
        chainToHighlight.push(availableOrbs[orbIndex]);
        availableOrbs.splice(orbIndex, 1);
      }
    }

    if (chainToHighlight.length < 2) return;

    this.onboardingActive = true;
    this.onboardingLocked = true;
    
    this.time.delayedCall(GameConfig.onboardingCooldown, () => {
      this.onboardingLocked = false;
    });

    this.onboardingFinger = this.add.text(chainToHighlight[0].x, chainToHighlight[0].y + 20, '👆', {
      fontSize: '64px'
    }).setOrigin(0.2, 0).setDepth(100);

    this.onboardingGraphics = this.add.graphics();
    this.onboardingGraphics.setDepth(99);
    this.onboardingGraphics.fillStyle(GameConfig.orbColors.matched, 0.8);

    const tweens = [];

    tweens.push({
      targets: this.onboardingFinger,
      y: chainToHighlight[0].y,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        chainToHighlight[0].orb.setTint(GameConfig.orbColors.matched);
      }
    });

    for (let i = 1; i < chainToHighlight.length; i++) {
      const nextOrb = chainToHighlight[i];
      tweens.push({
        targets: this.onboardingFinger,
        x: nextOrb.x,
        y: nextOrb.y,
        duration: 500,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          this.onboardingGraphics.clear();
          this.onboardingGraphics.fillStyle(GameConfig.orbColors.matched, 0.8);
          
          // Draw lines for previous segments
          for (let j = 0; j < i; j++) {
            this.drawDottedLine(chainToHighlight[j].x, chainToHighlight[j].y, chainToHighlight[j+1].x, chainToHighlight[j+1].y);
          }
          // Draw line to current finger position
          this.drawDottedLine(chainToHighlight[i-1].x, chainToHighlight[i-1].y, this.onboardingFinger.x, this.onboardingFinger.y);
        },
        onComplete: () => {
          nextOrb.orb.setTint(GameConfig.orbColors.matched);
        }
      });
    }

    tweens.push({
      targets: this.onboardingFinger,
      alpha: 0,
      duration: 300,
      delay: 200,
      onComplete: () => {
        if (this.onboardingFinger) {
          this.onboardingFinger.destroy();
          this.onboardingFinger = null;
        }
        if (this.onboardingGraphics) {
          this.onboardingGraphics.destroy();
          this.onboardingGraphics = null;
        }
        if (!this.isDragging) {
          chainToHighlight.forEach(s => s.orb.setTint(0xffffff));
        }
        this.onboardingActive = false;
        this.onboardingTween = null;
      }
    });

    this.onboardingTween = this.tweens.chain({
      tweens: tweens
    });
  }

  drawDottedLine(x1, y1, x2, y2) {
    const dotSize = 6;
    const gap = 8;
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2);
    const numDots = Math.floor(dist / (dotSize + gap));
    
    for (let i = 0; i < numDots; i++) {
      const x = x1 + Math.cos(angle) * i * (dotSize + gap);
      const y = y1 + Math.sin(angle) * i * (dotSize + gap);
      this.onboardingGraphics.fillCircle(x, y, dotSize / 2);
    }
  }

  createCenterDisplay() {
    this.centerCy = GameConfig.height / 2 - 20;
    
    this.centerBg = this.add.graphics();
    this.centerBg.setAlpha(0);
    this.centerBg.setDepth(15);
      
    this.centerText = this.add.text(GameConfig.width / 2, this.centerCy, '', {
      fontFamily: GameConfig.fontFamily,
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.centerText.setAlpha(0);
    this.centerText.setDepth(16);

    this.hintBtnContainer = this.add.container(GameConfig.width / 2 + 140, this.centerCy + 60);
    this.hintBtnContainer.setDepth(20);
    if (this.levelNum <= GameConfig.maxAssistLevel) this.hintBtnContainer.setVisible(false);
    
    const hintBg = this.add.image(0, 0, 'orb').setScale(0.6).setInteractive({ useHandCursor: true });
    const playIcon = this.add.text(0, 0, '▶', {
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5);
    const hintText = this.add.text(0, 40, getString(GameConfig.language, 'hint'), {
      fontFamily: GameConfig.fontFamily,
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    this.hintBtnContainer.add([hintBg, playIcon, hintText]);
    
    hintBg.on('pointerdown', (pointer, localX, localY, event) => {
      event.stopPropagation();
      if (GameConfig.poki && typeof PokiSDK !== 'undefined') {
        this.scene.pause();
        this.sound.pauseAll();
        PokiSDK.rewardedBreak().then((success) => {
          this.scene.resume();
          this.sound.resumeAll();
          if (success) {
            this.giveHint();
          }
        });
      } else if (GameConfig.googleAdsEnabled && window.h5AdsReady && typeof window.adBreak !== 'undefined') {
        this.scene.pause();
        this.sound.pauseAll();
        let rewardEarned = false;
        
        window.adBreak({
          type: 'reward',
          name: 'hint_reward',
          beforeReward: (showAdFn) => {
            showAdFn();
          },
          adDismissed: () => {
            rewardEarned = false;
          },
          adViewed: () => {
            rewardEarned = true;
          },
          adBreakDone: (placementInfo) => {
            this.scene.resume();
            this.sound.resumeAll();
            // If an ad was successfully viewed, give the hint.
            // If no ad was available (e.g. notReady), we give the hint anyway so the player isn't stuck.
            // We only withhold the hint if the user explicitly dismissed the ad before completion.
            if (rewardEarned || (placementInfo && placementInfo.breakStatus !== 'dismissed')) {
              this.giveHint();
            }
          }
        });
      } else {
        this.giveHint();
      }
    });
  }

  createOutcomeSpheres() {
    const values = this.outcomes.map(o => o.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const { minScale, maxScale, baseScale } = GameConfig.orbSize;

    this.matter.world.setBounds(0, -1000, GameConfig.width, GameConfig.height / 2 - 80 + 1000);

    const uShape = this.add.graphics();
    uShape.fillStyle(0x000000, GameConfig.uShape.alpha);
    uShape.fillRoundedRect(GameConfig.uShape.offsetX, GameConfig.uShape.offsetY, GameConfig.uShape.sizeX, GameConfig.uShape.sizeY, 30);
    uShape.fillRect(GameConfig.uShape.offsetX, GameConfig.uShape.offsetY, GameConfig.uShape.sizeX, 30);
    
    uShape.lineStyle(4, 0x000000, GameConfig.uShape.alpha * 1.5);
    uShape.strokeRoundedRect(GameConfig.uShape.offsetX, GameConfig.uShape.offsetY, GameConfig.uShape.sizeX, GameConfig.uShape.sizeY, 30);
    uShape.setDepth(5);

    this.outcomes.forEach((outcomeObj, i) => {
      const val = outcomeObj.value;
      const expr = outcomeObj.expression;
      
      let scale = baseScale;
      if (maxVal > minVal) {
        const t = (val - minVal) / (maxVal - minVal);
        const scaleMultiplier = minScale + t * (maxScale - minScale);
        scale = baseScale * scaleMultiplier;
      }
      
      const x = Phaser.Math.Between(60, GameConfig.width - 60);
      const y = Phaser.Math.Between(-800, -100);
      
      const orb = this.matter.add.image(x, y, 'orb');
      orb.setScale(scale);
      orb.setTint(this.bgColor);
      orb.setDepth(10);
      orb.setInteractive({ useHandCursor: true });
      orb.setCircle(48 * scale);
      orb.setBounce(GameConfig.physics.bounce);
      orb.setFriction(0.005);
      orb.setFrictionAir(0.001);
      
      const text = this.add.text(x, y, val.toString(), {
        fontFamily: GameConfig.fontFamily,
        fontSize: '36px',
        color: '#ffffff',
        fontStyle: 'bold',
        shadow: {
          offsetX: 1,
          offsetY: 1,
          color: '#000000',
          blur: 4,
          stroke: true,
          fill: true
        }
      }).setOrigin(0.5).setDepth(11);
      
      const debugText = this.add.text(x, y - 40, `${expr} = ${val}`, {
        fontFamily: GameConfig.fontFamily,
        fontSize: '16px',
        color: '#00ff00',
        backgroundColor: '#000000',
        padding: { x: 4, y: 4 }
      }).setOrigin(0.5).setDepth(30).setVisible(false);

      if (GameConfig.debugCheatsEnabled) {
        orb.on('pointerover', () => debugText.setVisible(true));
        orb.on('pointerout', () => debugText.setVisible(false));
        orb.on('pointerdown', () => debugText.setVisible(true));
        orb.on('pointerup', () => debugText.setVisible(false));
      }

      // Add double tap detection for onboarding
      orb.on('pointerdown', () => {
        if (this.levelNum <= GameConfig.maxAssistLevel) {
          outcomeObj.tapCount = (outcomeObj.tapCount || 0) + 1;
          if (outcomeObj.tapCount === 2) {
            this.showOnboarding(true);
            outcomeObj.tapCount = 0;
          }
          // Reset tap count after a short delay if not double tapped
          this.time.delayedCall(500, () => {
            outcomeObj.tapCount = 0;
          });
        }
      });
      
      this.outcomeSpheres.push({ value: val, expression: expr, orb, text, debugText, active: true, tapCount: 0, baseScale: scale });
    });
  }

  createInputSpheres() {
    const cx = GameConfig.width / 2;
    const cy = GameConfig.height * 0.75;
    const radius = GameConfig.inputCircleRadius || 115;
    
    const count = this.inputs.length;
    const angleStep = (Math.PI * 2) / count;
    
    this.inputs.forEach((val, i) => {
      const finalAngle = i * angleStep - Math.PI / 2;
      const finalX = cx + Math.cos(finalAngle) * radius;
      const finalY = cy + Math.sin(finalAngle) * radius;
      
      const orb = this.add.image(cx, cy, 'orb').setScale(0);
      orb.setDepth(10);
      
      const text = this.add.text(cx, cy, val, {
        fontFamily: GameConfig.fontFamily,
        fontSize: '48px',
        color: '#ffffff',
        fontStyle: 'bold',
        shadow: {
          offsetX: 1,
          offsetY: 2,
          color: '#000000',
          blur: 4,
          stroke: true,
          fill: true
        }
      }).setOrigin(0.5).setDepth(11).setScale(0);
      
      this.inputSpheres.push({ value: val, orb, text, x: finalX, y: finalY, index: i });
      
      const swirlObj = { angle: finalAngle - Math.PI, radius: 0, scale: 0 };
      
      this.tweens.add({
        targets: swirlObj,
        angle: finalAngle,
        radius: radius,
        scale: 0.8,
        duration: 800,
        ease: 'Back.easeOut',
        delay: i * 100,
        onUpdate: () => {
          const currentX = cx + Math.cos(swirlObj.angle) * swirlObj.radius;
          const currentY = cy + Math.sin(swirlObj.angle) * swirlObj.radius;
          orb.setPosition(currentX, currentY);
          orb.setScale(swirlObj.scale);
          text.setPosition(currentX, currentY);
          text.setScale(swirlObj.scale / 0.8);
        },
        onComplete: () => {
          orb.setInteractive({ useHandCursor: true });
          orb.input.hitArea.setTo(-20, -20, orb.width + 40, orb.height + 40);
        }
      });
    });
  }

  onPointerDown(pointer) {
    this.lastInteractionTime = this.time.now;
    if (this.onboardingLocked) return;

    if (this.onboardingActive) {
      if (this.onboardingTween) {
        this.onboardingTween.stop();
        this.onboardingTween = null;
      }
      if (this.onboardingFinger) {
        this.onboardingFinger.destroy();
        this.onboardingFinger = null;
      }
      if (this.onboardingGraphics) {
        this.onboardingGraphics.destroy();
        this.onboardingGraphics = null;
      }
      this.onboardingActive = false;
    }

    this.isDragging = true;
    this.currentChain = [];
    
    this.inputSpheres.forEach(s => {
      s.orb.setTint(0xffffff);
      s.orb.setAlpha(1);
      s.text.setAlpha(1);
      if (s.hintGlow) {
        s.orb.postFX.remove(s.hintGlow);
        s.hintGlow = null;
      }
    });
    
    this.checkIntersection(pointer);
  }

  onPointerMove(pointer) {
    this.lastInteractionTime = this.time.now;
    if (!this.isDragging) return;
    this.checkIntersection(pointer);
    this.drawTrail(pointer);
  }

  onPointerUp() {
    this.lastInteractionTime = this.time.now;
    if (!this.isDragging) return;
    this.isDragging = false;
    this.graphics.clear();
    
    if (this.currentChain.length === 1) {
      this.tapsWithoutDrag++;
      if (this.tapsWithoutDrag >= 3) {
        if (this.levelNum <= GameConfig.maxAssistLevel) {
          this.showOnboarding();
        }
        this.tapsWithoutDrag = 0;
      }
    } else if (this.currentChain.length > 1) {
      this.tapsWithoutDrag = 0;
    }

    const matched = this.evaluateChain();
    
    if (!matched) {
      if (this.draggedContainer) {
        const containerToDestroy = this.draggedContainer;
        this.draggedContainer = null;
        this.tweens.add({
          targets: containerToDestroy,
          scale: 0,
          alpha: 0,
          duration: 200,
          onComplete: () => {
            containerToDestroy.destroy();
          }
        });
      }
      
      this.inputSpheres.forEach(s => {
        s.orb.setTint(0xffffff);
        s.orb.setAlpha(1);
        s.text.setAlpha(1);
        if (s.glowFx) {
          s.orb.postFX.remove(s.glowFx);
          s.glowFx = null;
        }
      });
      this.currentChain = [];
      this.updateCenterDisplay();
    }
  }

  checkIntersection(pointer) {
    for (const sphere of this.inputSpheres) {
      const dist = Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, sphere.x, sphere.y);
      if (dist < 50) {
        if (this.currentChain.includes(sphere)) {
          if (this.currentChain.length >= 2 && this.currentChain[this.currentChain.length - 2] === sphere) {
            const removed = this.currentChain.pop();
            removed.orb.setTint(0xffffff);
            removed.orb.setAlpha(1);
            removed.text.setAlpha(1);
            if (removed.glowFx) {
              removed.orb.postFX.remove(removed.glowFx);
              removed.glowFx = null;
            }
            this.updateDraggedOrb();
            const chainLength = Math.min(this.currentChain.length, 9);
            this.playSound(`chain${chainLength}`);
            this.updateCenterDisplay();
          }
          return;
        }
        
        this.currentChain.push(sphere);
        sphere.orb.setTint(GameConfig.orbColors.matched);
        sphere.orb.setAlpha(0.3);
        sphere.text.setAlpha(0.3);
        
        if (!sphere.glowFx) {
          sphere.glowFx = sphere.orb.postFX.addGlow(GameConfig.orbColors.matched, 4, 0, false, 0.1, 10);
        }
        
        if (this.currentChain.length === 1) {
          this.createDraggedOrb(sphere);
        } else {
          this.updateDraggedOrb();
          this.animateAttachment(sphere);
        }
        
        if (GameConfig.fancyEffect && this.shockwavePipeline) {
          const cam = this.cameras.main;
          const uvX = (sphere.x - cam.worldView.x) / cam.worldView.width;
          const uvY = 1.0 - ((sphere.y - cam.worldView.y) / cam.worldView.height);
          
          const wave = this.shockwavePipeline.addShockwave(uvX, uvY, 0.3); // 30% scale for miniature effect
          this.tweens.add({
            targets: wave,
            time: 1,
            duration: 600, // Faster for miniature
            ease: 'Sine.easeOut',
            onComplete: () => {
              if (this.shockwavePipeline) {
                this.shockwavePipeline.removeShockwave(wave);
              }
            }
          });
        }
        
        this.tweens.killTweensOf(sphere.orb);
        sphere.orb.setScale(0.8);
        sphere.orb.setAngle(0);
        
        this.tweens.add({
          targets: sphere.orb,
          scale: 1.0,
          angle: { from: -15, to: 15 },
          duration: 50,
          yoyo: true,
          repeat: 1,
          onUpdate: () => {
            if (sphere.glowFx) {
              sphere.glowFx.outerStrength = 8;
            }
          },
          onComplete: () => {
            sphere.orb.setScale(0.8);
            sphere.orb.setAngle(0);
            if (sphere.glowFx) {
              sphere.glowFx.outerStrength = 4;
            }
          }
        });
        
        this.tweens.killTweensOf(sphere.text);
        sphere.text.setScale(1);
        sphere.text.setAngle(0);
        
        this.tweens.add({
          targets: sphere.text,
          scale: 1.2,
          angle: { from: -15, to: 15 },
          duration: 50,
          yoyo: true,
          repeat: 1,
          onComplete: () => {
            sphere.text.setScale(1);
            sphere.text.setAngle(0);
          }
        });
        
        const chainLength = Math.min(this.currentChain.length, 9);
        this.playSound(`chain${chainLength}`);
        this.updateCenterDisplay();
        break;
      }
    }
  }

  drawTrail(pointer) {
    this.graphics.clear();
    if (this.currentChain.length === 0) return;
    
    this.graphics.lineStyle(8, GameConfig.orbColors.matched, 0.8);
    this.graphics.beginPath();
    
    this.graphics.moveTo(this.currentChain[0].x, this.currentChain[0].y);
    for (let i = 1; i < this.currentChain.length; i++) {
      this.graphics.lineTo(this.currentChain[i].x, this.currentChain[i].y);
    }
    this.graphics.lineTo(pointer.worldX, pointer.worldY);
    this.graphics.strokePath();
  }

  updateCenterDisplay() {
    if (this.currentChain.length === 0) {
      if (this.centerText.alpha > 0) {
        this.tweens.add({
          targets: [this.centerBg, this.centerText],
          alpha: 0,
          duration: 150,
          ease: 'Power2'
        });
      }
      return;
    }
    
    const tokens = this.getChainTokens();
    const exprStr = tokens.join('');
    const result = evaluateLeftToRight(tokens);
    
    if (result !== null && !isNaN(result) && exprStr !== String(result)) {
      this.centerText.setText(`${exprStr} = ${result}`);
    } else {
      this.centerText.setText(exprStr);
    }

    const padding = 40;
    const width = Math.max(100, this.centerText.width + padding * 2);
    const height = 60;
    
    this.centerBg.clear();
    this.centerBg.fillStyle(0x000000, 0.5);
    this.centerBg.fillRoundedRect(GameConfig.width / 2 - width / 2, this.centerCy - height / 2, width, height, height / 2);

    if (this.centerText.alpha === 0) {
      this.tweens.add({
        targets: [this.centerBg, this.centerText],
        alpha: 1,
        duration: 150,
        ease: 'Power2'
      });
    }
  }

  evaluateChain() {
    const result = this.calculateCurrentSum();
    
    if (result !== null && !isNaN(result)) {
      return this.checkMatch(result);
    } else {
      if (this.levelNum <= GameConfig.maxAssistLevel) {
        this.showOnboarding(true);
      }
      return false;
    }
  }

  checkMatch(result) {
    const matchIndex = this.outcomeSpheres.findIndex(o => o.active && o.value === result);
    
    if (matchIndex !== -1) {
      const target = this.outcomeSpheres[matchIndex];
      target.active = false;
      
      if (target.orb.body) {
        target.orb.setStatic(true);
        target.orb.setSensor(true);
      }
      
      // Determine compliment group
      const tokens = this.getChainTokens();
      const operators = tokens.filter(t => ['+', '-', '*', '/'].includes(t));
      const hasMultDiv = operators.some(o => ['*', '/'].includes(o));
      
      let group = 'group1';
      if (hasMultDiv || operators.length >= 2) {
        group = 'group3';
      } else if (operators.length === 1) {
        group = 'group2';
      }
      this.scene.get('UI').showComplimentFloater(target.orb.x, target.orb.y, group);
      
      const doExplosion = () => {
        this.tweens.add({
          targets: [target.orb, target.text, target.debugText],
          scale: 1.5,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            target.orb.destroy();
            target.text.destroy();
            target.debugText.destroy();
          }
        });
        
        if (GameConfig.fancyEffect && this.shockwavePipeline) {
          const cam = this.cameras.main;
          const uvX = (target.orb.x - cam.worldView.x) / cam.worldView.width;
          const uvY = 1.0 - ((target.orb.y - cam.worldView.y) / cam.worldView.height);
          
          const t = (target.baseScale - GameConfig.orbSize.minScale) / (GameConfig.orbSize.maxScale - GameConfig.orbSize.minScale);
          const effectScale = (0.7 + (isNaN(t) ? 0.5 : t) * 0.6) * 0.75; // Reduced by 25%
          
          const wave = this.shockwavePipeline.addShockwave(uvX, uvY, effectScale);
          this.tweens.add({
            targets: wave,
            time: 1,
            duration: 1200,
            ease: 'Sine.easeOut',
            onComplete: () => {
              if (this.shockwavePipeline) {
                this.shockwavePipeline.removeShockwave(wave);
              }
            }
          });
        }
        
        this.particles.emitParticleAt(target.orb.x, target.orb.y, 100);
        this.playSound('chained');
        
        if (this.outcomeSpheres.every(o => !o.active)) {
          this.levelComplete();
        }
      };
      
      if (this.draggedContainer) {
        const containerToDestroy = this.draggedContainer;
        this.draggedContainer = null;
        this.tweens.add({
          targets: containerToDestroy,
          x: target.orb.x,
          y: target.orb.y,
          scale: 1.5,
          duration: 200,
          ease: 'Power2',
          onComplete: () => {
            containerToDestroy.destroy();
            
            this.inputSpheres.forEach(s => {
              s.orb.setTint(0xffffff);
              s.orb.setAlpha(1);
              s.text.setAlpha(1);
              if (s.glowFx) {
                s.orb.postFX.remove(s.glowFx);
                s.glowFx = null;
              }
            });
            this.currentChain = [];
            this.updateCenterDisplay();
            
            doExplosion();
          }
        });
      } else {
        this.inputSpheres.forEach(s => {
          s.orb.setTint(0xffffff);
          s.orb.setAlpha(1);
          s.text.setAlpha(1);
          if (s.glowFx) {
            s.orb.postFX.remove(s.glowFx);
            s.glowFx = null;
          }
        });
        this.currentChain = [];
        this.updateCenterDisplay();
        doExplosion();
      }
      
      return true;
    }
    
    return false;
  }

  update(time, delta) {
    if (GameConfig.fancyEffect && this.game.loop.actualFps > 0) {
      // Only start counting low FPS after the first 2 seconds to allow for initial loading/spikes
      if (this.time.now - this.sceneStartTime > 2000) {
        if (this.game.loop.actualFps < 30) {
          this.lowFpsFrames30 = (this.lowFpsFrames30 || 0) + 1;
          this.lowFpsFrames60 = 0;
          
          if (this.lowFpsFrames30 > 120) { // ~2 seconds of sustained < 30 FPS
            GameConfig.fancyEffect = false;
            if (this.shockwavePipeline) {
              this.shockwavePipeline.maxWaves = 0;
              this.shockwavePipeline.shockwaves = [];
            }
            console.log("Auto-disabled fancy effects completely due to < 30 FPS");
          }
        } else if (this.game.loop.actualFps < 55) {
          this.lowFpsFrames60 = (this.lowFpsFrames60 || 0) + 1;
          this.lowFpsFrames30 = 0;
          
          if (this.lowFpsFrames60 > 120) { // ~2 seconds of sustained < 55 FPS
            if (this.shockwavePipeline && this.shockwavePipeline.maxWaves > 2) {
              this.shockwavePipeline.maxWaves = Math.max(2, this.shockwavePipeline.maxWaves - 5);
              console.log(`Reduced max shockwaves to ${this.shockwavePipeline.maxWaves} due to < 55 FPS`);
              this.lowFpsFrames60 = 0; // Reset to give it time to recover
            }
          }
        } else {
          this.lowFpsFrames30 = 0;
          this.lowFpsFrames60 = 0;
        }
      }
    } else {
      this.lowFpsFrames30 = 0;
      this.lowFpsFrames60 = 0;
    }

    if (time - this.lastInteractionTime > GameConfig.idleHandTimeout * 1000) {
      this.showOnboarding(true);
      this.lastInteractionTime = time;
    }

    if (this.currentLang !== GameConfig.language) {
      this.currentLang = GameConfig.language;
      if (this.onboardingOverlay && this.onboardingMainText && this.onboardingSubText) {
        const mainTextKey = (this.onboardingStep === 1) ? 'matchNumbers' : 'dragNumbers';
        this.onboardingMainText.setText(getString(GameConfig.language, mainTextKey));
        this.onboardingSubText.setText(getString(GameConfig.language, 'tapToContinue'));
      }
    }

    if (this.isDragging) {
        const currentSum = this.calculateCurrentSum();
        this.outcomeSpheres.forEach(o => {
            if (o.active && o.value === currentSum) {
                if (!o.isAnimating) {
                    this.startScalingAnimation(o);
                }
            } else {
                if (o.isAnimating) {
                    this.stopScalingAnimation(o);
                }
            }
        });
        
        if (this.draggedContainer) {
            const pointer = this.input.activePointer;
            this.draggedContainer.x += (pointer.worldX - this.draggedContainer.x) * 0.15;
            this.draggedContainer.y += (pointer.worldY - this.draggedContainer.y) * 0.15;
        }
    } else {
        this.outcomeSpheres.forEach(o => {
            if (o.isAnimating) {
                this.stopScalingAnimation(o);
            }
        });
    }

    this.orbMaskGraphics.clear();

    this.outcomeSpheres.forEach(o => {
      if (o.orb && o.orb.active) {
        o.text.setPosition(o.orb.x, o.orb.y);
        if (o.debugText.visible) {
          o.debugText.setPosition(o.orb.x, o.orb.y - 40 * o.orb.scale);
        }
        this.orbMaskGraphics.fillStyle(0xffffff, o.orb.alpha);
        this.orbMaskGraphics.fillCircle(o.orb.x, o.orb.y, 48 * o.orb.scale);
      }
    });

    this.inputSpheres.forEach(o => {
      if (o.orb && o.orb.active !== false) {
        this.orbMaskGraphics.fillStyle(0xffffff, o.orb.alpha);
        this.orbMaskGraphics.fillCircle(o.orb.x, o.orb.y, 48 * o.orb.scale);
      }
    });
  }

  createDraggedOrb(sphere) {
    if (this.draggedContainer) {
      this.draggedContainer.destroy();
    }
    
    this.draggedContainer = this.add.container(sphere.x, sphere.y);
    this.draggedContainer.setDepth(50);
    
    const bg = this.add.image(0, 0, 'orb').setScale(0.8);
    bg.setTint(GameConfig.orbColors.matched);
    this.draggedGlowFx = bg.postFX.addGlow(GameConfig.orbColors.matched, 4, 0, false, 0.1, 10);
    
    const text = this.add.text(0, 0, sphere.value, {
      fontFamily: GameConfig.fontFamily,
      fontSize: '64px',
      color: '#ffffff',
      fontStyle: 'bold',
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 4, stroke: true, fill: true }
    }).setOrigin(0.5);
    
    this.draggedContainer.add([bg, text]);
    this.draggedText = text;
    this.draggedBg = bg;
  }

  updateDraggedOrb() {
    if (!this.draggedContainer) return;
    
    const tokens = this.getChainTokens();
    let displayStr = '';
    
    if (tokens.length > 0) {
      const lastToken = tokens[tokens.length - 1];
      const isLastOperator = ['+', '-', '*', '/'].includes(lastToken);
      
      const evaluated = evaluateLeftToRight(tokens);
      
      if (evaluated !== null && !isNaN(evaluated)) {
        displayStr = evaluated.toString();
        if (isLastOperator) {
          displayStr += lastToken;
        }
      } else {
        displayStr = tokens.join('');
      }
    }
    
    this.draggedText.setText(displayStr);
    
    this.tweens.add({
      targets: this.draggedContainer,
      scale: 1.2,
      duration: 100,
      yoyo: true,
      onUpdate: () => {
        if (this.draggedGlowFx) {
          this.draggedGlowFx.outerStrength = 8;
        }
      },
      onComplete: () => {
        if (this.draggedGlowFx) {
          this.draggedGlowFx.outerStrength = 4;
        }
      }
    });
  }

  animateAttachment(sphere) {
    if (!this.draggedContainer) return;
    
    const flyingOrb = this.add.image(sphere.x, sphere.y, 'orb').setScale(0.8);
    flyingOrb.setTint(GameConfig.orbColors.matched);
    const flyingText = this.add.text(sphere.x, sphere.y, sphere.value, {
      fontFamily: GameConfig.fontFamily,
      fontSize: '64px',
      color: '#ffffff',
      fontStyle: 'bold',
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 4, stroke: true, fill: true }
    }).setOrigin(0.5);
    
    flyingOrb.setDepth(45);
    flyingText.setDepth(46);
    
    this.tweens.add({
      targets: [flyingOrb, flyingText],
      x: this.draggedContainer.x,
      y: this.draggedContainer.y,
      scale: 0.5,
      alpha: 0,
      duration: 150,
      ease: 'Power2',
      onComplete: () => {
        flyingOrb.destroy();
        flyingText.destroy();
      }
    });
  }

  levelComplete() {
    if (GameConfig.poki && typeof PokiSDK !== 'undefined') {
      PokiSDK.gameplayStop();
    }
    this.playSound('winlevel');
    this.swirlOutInputSpheres();
    
    // Delay the UI event to allow the swirl out animation to finish
    this.time.delayedCall(800, () => {
      this.scene.get('UI').events.emit('levelComplete');
    });
  }

  swirlOutInputSpheres() {
    const cx = GameConfig.width / 2;
    const cy = GameConfig.height * 0.75;
    const radius = GameConfig.inputCircleRadius || 115;
    
    this.inputSpheres.forEach((sphere, i) => {
      if (sphere.orb.input) {
        sphere.orb.disableInteractive();
      }
      
      const currentAngle = Math.atan2(sphere.y - cy, sphere.x - cx);
      const swirlObj = { angle: currentAngle, radius: radius, scale: 0.8 };
      
      this.tweens.add({
        targets: swirlObj,
        angle: currentAngle + Math.PI,
        radius: 0,
        scale: 0,
        duration: 800,
        ease: 'Back.easeIn',
        delay: i * 100,
        onUpdate: () => {
          const currentX = cx + Math.cos(swirlObj.angle) * swirlObj.radius;
          const currentY = cy + Math.sin(swirlObj.angle) * swirlObj.radius;
          sphere.orb.setPosition(currentX, currentY);
          sphere.orb.setScale(swirlObj.scale);
          sphere.text.setPosition(currentX, currentY);
          if (swirlObj.scale > 0) {
            sphere.text.setScale(swirlObj.scale / 0.8);
          } else {
            sphere.text.setScale(0);
          }
        }
      });
    });
  }

  proceedToNextLevel() {
    const nextLevel = this.levelNum + 1;
    GameConfig.saveLevel(nextLevel);
    
    const nextPackNum = GameConfig.getLevelPack(nextLevel);
    const nextBgKey = `bg_${nextPackNum}`;
    
    const doTransition = () => {
      const currentPackNum = GameConfig.getLevelPack(this.levelNum);
      if (currentPackNum !== nextPackNum && GameConfig.fancyEffect && this.bg) {
        // We are changing backgrounds. 
        // Create the new background behind the old one
        const newBg = this.add.image(GameConfig.width / 2, GameConfig.height / 2, nextBgKey);
        const scale = this.bg.scaleY * (this.bg.height / newBg.height);
        newBg.setScale(scale);
        newBg.setDepth(-1); // Behind this.bg which is at depth 0
        
        // Apply shockwave to the old background and fade it out
        let shockwavePipeline = null;
        let wave = null;
        if (GameConfig.fancyEffect) {
          this.bg.setPostPipeline('Shockwave');
          const pipeline = this.bg.getPostPipeline('Shockwave');
          shockwavePipeline = Array.isArray(pipeline) ? pipeline[0] : pipeline;
          if (shockwavePipeline) {
            wave = shockwavePipeline.addShockwave(0.5, 0.5, 3.0);
          }
        }
        
        if (shockwavePipeline && wave) {
          const targetsToFade = [this.bg];
          if (this.bgBlurred) targetsToFade.push(this.bgBlurred);
          if (this.dustParticles) targetsToFade.push(this.dustParticles);
          if (this.centerBg) targetsToFade.push(this.centerBg);
          if (this.centerText) targetsToFade.push(this.centerText);
          if (this.hintBtnContainer) targetsToFade.push(this.hintBtnContainer);
          
          this.inputSpheres.forEach(s => {
            if (s.orb) targetsToFade.push(s.orb);
            if (s.text) targetsToFade.push(s.text);
          });
          
          this.tweens.add({
            targets: targetsToFade,
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
              this.scene.restart({ level: nextLevel });
            }
          });
        } else {
          this.scene.restart({ level: nextLevel });
        }
      } else {
        this.scene.restart({ level: nextLevel });
      }
    };
    
    if (!this.textures.exists(nextBgKey)) {
      const fileNum = ((nextPackNum - 1) % 11) + 1;
      const filename = String(fileNum).padStart(3, '0') + '.jpg';
      this.load.image(nextBgKey, `./bg/${filename}`);
      this.load.once('complete', doTransition);
      this.load.start();
    } else {
      doTransition();
    }
  }
}
