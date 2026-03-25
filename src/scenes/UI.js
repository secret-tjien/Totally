import { GameConfig } from '../config.js';
import { getString } from '../languages.js';

export default class UI extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    this.scene.bringToTop('UI');
    this.sparks = 3;
    this.lang = GameConfig.language;
    
    this.topBar = this.add.graphics();
      
    this.levelText = this.add.text(GameConfig.width / 2, 30, '', {
      fontFamily: GameConfig.fontFamily,
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    if (!GameConfig.poki) {
      this.prevLevelBtn = this.add.text(GameConfig.width / 2 - 60, 70, '<', {
        fontFamily: GameConfig.fontFamily,
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
        backgroundColor: '#333333',
        padding: { x: 8, y: 4 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      this.prevLevelBtn.on('pointerdown', () => {
        const mainGame = this.scene.get('MainGame');
        mainGame.scene.restart({ level: Math.max(1, mainGame.levelNum - 1) });
      });

      this.nextLevelBtn = this.add.text(GameConfig.width / 2 + 60, 70, '>', {
        fontFamily: GameConfig.fontFamily,
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
        backgroundColor: '#333333',
        padding: { x: 8, y: 4 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      this.nextLevelBtn.on('pointerdown', () => {
        const mainGame = this.scene.get('MainGame');
        mainGame.scene.restart({ level: mainGame.levelNum + 1 });
      });
    }
    
    this.langBtn = this.add.text(GameConfig.width - 70, 30, this.getFlag(this.lang), {
      fontFamily: GameConfig.fontFamily,
      fontSize: '24px'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.langBtn.on('pointerdown', () => {
      this.showLanguageMenu();
    });

    this.menuBtn = this.add.text(GameConfig.width - 20, 30, '☰', {
      fontFamily: GameConfig.fontFamily,
      fontSize: '28px',
      color: '#ffffff'
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });

    this.menuBtn.on('pointerdown', () => {
      this.showSettingsMenu();
    });
    
    this.events.on('levelComplete', () => {
      this.showLevelClear();
    });
    
    this.events.on('update', this.updateUI, this);
    
    this.scale.on('resize', this.resize, this);
    this.events.once('shutdown', () => {
      if (this.scale) {
        this.scale.off('resize', this.resize, this);
      }
    });
    this.resize(this.scale.gameSize);
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
    
    const leftX = GameConfig.width / 2 - visibleWidth / 2;
    const rightX = GameConfig.width / 2 + visibleWidth / 2;
    const topY = GameConfig.height / 2 - visibleHeight / 2;
    
    if (this.topBar) {
      this.topBar.clear();
      this.topBar.fillStyle(0x000000, 0.6);
      this.topBar.fillRect(leftX, topY, visibleWidth, 60);
    }
    
    if (this.langBtn) {
      this.langBtn.setPosition(rightX - 70, topY + 30);
      this.menuBtn.setPosition(rightX - 20, topY + 30);
      
      this.levelText.setPosition(GameConfig.width / 2, topY + 30);
      if (this.prevLevelBtn) this.prevLevelBtn.setPosition(GameConfig.width / 2 - 60, topY + 80);
      if (this.nextLevelBtn) this.nextLevelBtn.setPosition(GameConfig.width / 2 + 60, topY + 80);
    }
  }

  updateUI() {
    const mainGame = this.scene.get('MainGame');
    if (mainGame && mainGame.levelNum) {
      const newLevelText = `${getString(this.lang, 'level')} ${mainGame.levelNum}`;
      if (this.levelText.text !== newLevelText) {
        this.levelText.setText(newLevelText);
      }
    }
    // Update hint text if it exists in MainGame
    if (mainGame && mainGame.hintBtnContainer) {
      const hintText = mainGame.hintBtnContainer.getAt(2);
      if (hintText) {
        hintText.setText(getString(this.lang, 'hint'));
      }
    }
  }

  getFlag(lang) {
    const flags = {
      en: '🇬🇧',
      nl: '🇳🇱',
      de: '🇩🇪',
      fr: '🇫🇷',
      it: '🇮🇹',
      es: '🇪🇸',
      'pt-br': '🇧🇷',
      ko: '🇰🇷',
      'zh-cn': '🇨🇳',
      ja: '🇯🇵',
      tr: '🇹🇷'
    };
    return flags[lang] || '🇬🇧';
  }

  showLanguageMenu() {
    if (this.langMenu) {
      this.langMenu.destroy();
      this.langMenu = null;
      return;
    }
    if (this.settingsMenu) {
      this.settingsMenu.destroy();
      this.settingsMenu = null;
    }

    const langs = ['en', 'nl', 'de', 'fr', 'it', 'es', 'pt-br', 'ko', 'zh-cn', 'ja', 'tr'];
    const x = this.langBtn.x;
    const y = this.langBtn.y + 30;

    this.langMenu = this.add.container(x, y);
    
    const bg = this.add.graphics();
    bg.fillStyle(0x222222, 0.9);
    bg.fillRoundedRect(-30, 0, 60, langs.length * 40 + 10, 8);
    this.langMenu.add(bg);

    langs.forEach((l, i) => {
      const btn = this.add.text(0, 25 + i * 40, this.getFlag(l), {
        fontSize: '24px'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      
      btn.on('pointerdown', () => {
        GameConfig.language = l;
        localStorage.setItem('gameLanguage', l);
        this.lang = l;
        this.langBtn.setText(this.getFlag(l));
        this.updateUI();
        this.langMenu.destroy();
        this.langMenu = null;
      });
      
      this.langMenu.add(btn);
    });
  }

  showSettingsMenu() {
    if (this.settingsMenu) {
      this.settingsMenu.destroy();
      this.settingsMenu = null;
      return;
    }
    if (this.langMenu) {
      this.langMenu.destroy();
      this.langMenu = null;
    }

    const x = this.menuBtn.x - 20;
    const y = this.menuBtn.y + 30;

    this.settingsMenu = this.add.container(x, y);
    
    const bg = this.add.graphics();
    bg.fillStyle(0x222222, 0.9);
    bg.fillRoundedRect(-140, 0, 160, 100, 8);
    this.settingsMenu.add(bg);

    const sfxSwitch = this.createSlideSwitch(-120, 30, 'SFX', GameConfig.audio.sfxEnabled, () => {
      GameConfig.audio.sfxEnabled = !GameConfig.audio.sfxEnabled;
      return GameConfig.audio.sfxEnabled;
    });

    const musicSwitch = this.createSlideSwitch(-120, 70, 'Music', GameConfig.audio.musicEnabled, () => {
      GameConfig.audio.musicEnabled = !GameConfig.audio.musicEnabled;
      
      const bgm = this.sound.get('bgm');
      if (bgm) {
        if (GameConfig.audio.musicEnabled) {
          if (!bgm.isPlaying) bgm.play();
        } else {
          bgm.stop();
        }
      } else if (GameConfig.audio.musicEnabled) {
        this.sound.play('bgm', { loop: true, volume: 0.5 });
      }
      return GameConfig.audio.musicEnabled;
    });

    this.settingsMenu.add([sfxSwitch, musicSwitch]);
  }

  createSlideSwitch(x, y, label, isEnabled, onToggle) {
    const container = this.add.container(x, y);
    
    const labelText = this.add.text(0, 0, label, {
      fontFamily: GameConfig.fontFamily,
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0, 0.5);
    
    const switchWidth = 40;
    const switchHeight = 20;
    const thumbRadius = 8;
    const switchX = 80;
    
    const bg = this.add.graphics();
    const thumb = this.add.circle(0, 0, thumbRadius, 0xffffff);
    
    const updateSwitch = (enabled, animate = true) => {
      bg.clear();
      bg.fillStyle(enabled ? 0x50e3c2 : 0x666666, 1);
      bg.fillRoundedRect(switchX, -switchHeight / 2, switchWidth, switchHeight, switchHeight / 2);
      
      const targetX = enabled ? switchX + switchWidth - thumbRadius - 2 : switchX + thumbRadius + 2;
      if (animate) {
        this.tweens.add({
          targets: thumb,
          x: targetX,
          duration: 100,
          ease: 'Power1'
        });
      } else {
        thumb.x = targetX;
      }
    };
    
    updateSwitch(isEnabled, false);
    
    const hitArea = this.add.rectangle(switchX + switchWidth / 2, 0, switchWidth + 100, switchHeight + 20, 0x000000, 0)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    
    hitArea.on('pointerdown', () => {
      const newState = onToggle();
      updateSwitch(newState);
    });
    
    container.add([labelText, bg, thumb, hitArea]);
    return container;
  }

  showComplimentFloater(x, y, group) {
    const compliments = GameConfig.orbCompliments[group];
    const compliment = compliments[Math.floor(Math.random() * compliments.length)];
    const text = getString(GameConfig.language, compliment);
    
    this.time.delayedCall(GameConfig.orbCompliments.floaterDelay || 0, () => {
      const floater = this.add.text(x, y, text, {
        fontFamily: GameConfig.fontFamily,
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4
      }).setOrigin(0.5).setDepth(100);
      
      this.tweens.add({
        targets: floater,
        y: y - 40,
        alpha: 0,
        duration: 2000,
        ease: 'Power2',
        onComplete: () => floater.destroy()
      });
    });
  }

  showLevelClear() {
    const words = GameConfig.levelCompliments;
    const randomWord = words[Math.floor(Math.random() * words.length)];
    const localizedWord = getString(this.lang, randomWord);
    
    const clearText = this.add.text(GameConfig.width / 2, GameConfig.height / 2, localizedWord, {
      fontFamily: GameConfig.fontFamily,
      fontSize: '40px',
      color: '#50e3c2',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5).setAlpha(0).setScale(0.5);
    
    this.tweens.add({
      targets: clearText,
      alpha: 1,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: 500,
      onComplete: () => {
        clearText.destroy();
        this.showProgressBar();
      }
    });
  }

  showProgressBar() {
    const mainGame = this.scene.get('MainGame');
    const level = mainGame.levelNum;
    const range = GameConfig.getPackRange(level);
    
    // Calculate progress: 0 to 1
    const progress = (level - range.start + 1) / (range.end - range.start + 1);
    const startProgress = Math.max(GameConfig.progressBar.minProgress, (level - 1 - range.start + 1) / (range.end - range.start + 1));
    const endProgress = Math.max(GameConfig.progressBar.minProgress, progress);
    
    // Create progress bar
    const barWidth = GameConfig.progressBar.width;
    const barHeight = GameConfig.progressBar.height;
    const x = GameConfig.width / 2 - barWidth / 2;
    const y = GameConfig.height / 2 + GameConfig.progressBar.yOffset;
    
    const bg = this.add.graphics();
    bg.setDepth(10000);
    bg.lineStyle(2, GameConfig.progressBar.strokeColor, GameConfig.progressBar.strokeAlpha);
    bg.strokeRoundedRect(x, y, barWidth, barHeight, barHeight / 2);
    bg.fillStyle(GameConfig.progressBar.trackColor, GameConfig.progressBar.trackAlpha);
    bg.fillRoundedRect(x, y, barWidth, barHeight, barHeight / 2);
    
    const fill = this.add.graphics();
    fill.setDepth(10001);
    fill.fillStyle(GameConfig.progressBar.barColor, GameConfig.progressBar.barAlpha);
    
    // "new scene" text
    let packKey = 'pack5Plus';
    const pack = GameConfig.getLevelPack(level);
    if (pack === 1) packKey = 'pack1';
    else if (pack === 2) packKey = 'pack2';
    else if (pack === 3) packKey = 'pack3';
    else if (pack === 4) packKey = 'pack4';
    
    const text = this.add.text(GameConfig.width / 2, y + barHeight + 20, getString(this.lang, packKey), {
      fontFamily: GameConfig.fontFamily,
      fontSize: '18px',
      color: '#ffffff',
      shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, stroke: true, fill: true }
    }).setOrigin(0.5);
    text.setDepth(10002);
    
    // Manual animation using timer
    let currentProgress = startProgress;
    const duration = GameConfig.progressBar.animationSpeed;
    const startTime = this.time.now;
    
    const timer = this.time.addEvent({
      delay: 16, // ~60fps
      loop: true,
      callback: () => {
        const elapsed = this.time.now - startTime;
        const t = Math.min(elapsed / duration, 1);
        currentProgress = startProgress + (endProgress - startProgress) * t;
        
        fill.clear();
        fill.fillStyle(GameConfig.progressBar.barColor, GameConfig.progressBar.barAlpha);
        const w = barWidth * currentProgress;
        if (w > 0) {
          fill.fillRoundedRect(x, y, Math.max(w, barHeight / 2), barHeight, barHeight / 2);
        }
        
        if (t >= 1) {
          timer.remove();
          this.time.delayedCall(1000, () => {
            bg.destroy();
            fill.destroy();
            text.destroy();
            mainGame.proceedToNextLevel();
          });
        }
      }
    });
  }
}
