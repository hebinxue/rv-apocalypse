// MenuScene.js - Main menu with animated background
class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  preload() {
    // Load cover image if exists
    this.load.image('cover_png', 'src/assets/bg/cover.png');
    this.load.image('cover_jpg', 'src/assets/bg/cover.jpg');
    this.load.on('loaderror', (file) => {
      if (file.type === 'image') this.textures.remove(file.key);
    });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // --- Cover image or fallback background ---
    const coverKey = this.textures.exists('cover_png') ? 'cover_png' : (this.textures.exists('cover_jpg') ? 'cover_jpg' : null);
    if (coverKey) {
      const cover = this.add.image(width / 2, height / 2, coverKey);
      cover.setDisplaySize(width, height);
    } else {
      SceneBackgrounds.drawApartment(this, width, height);
    }

    // Fog / atmosphere layer
    const fog = this.add.graphics();
    for (let i = 0; i < 12; i++) {
      const fx = Math.random() * width;
      const fy = height - 100 + Math.random() * 60;
      fog.fillStyle(0x1a1025, 0.15);
      fog.fillEllipse(fx, fy, 120 + Math.random() * 100, 30 + Math.random() * 20);
    }
    this.tweens.add({
      targets: fog, x: -30, duration: 8000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // --- Atmospheric particles ---
    SceneParticles.addDust(this, width, height);
    SceneParticles.addEmbers(this, width, height);

    // --- Vignette overlay (real gradient edges) ---
    const vignette = this.add.graphics();
    // Top edge
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.5, 0.5, 0, 0);
    vignette.fillRect(0, 0, width, height * 0.25);
    // Bottom edge
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.5, 0.5);
    vignette.fillRect(0, height * 0.75, width, height * 0.25);
    // Left edge
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.4, 0, 0.4, 0);
    vignette.fillRect(0, 0, width * 0.15, height);
    // Right edge
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0.4, 0, 0.4);
    vignette.fillRect(width * 0.85, 0, width * 0.15, height);

    // --- Title glow effect ---
    const titleGlow = this.add.text(width / 2, height / 2 - 190, '末日房车逃生', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '52px',
      color: '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.15);
    this.tweens.add({
      targets: titleGlow, alpha: 0.25, scaleX: 1.02, scaleY: 1.02,
      duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // --- Title ---
    const title = this.add.text(width / 2, height / 2 - 190, '末日房车逃生', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '48px',
      color: UIHelper.COLORS.textPrimary,
      fontStyle: 'bold',
      stroke: '#0f0f1a',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // --- Decorative line ---
    const line = this.add.graphics();
    line.lineStyle(1, 0xe94560, 0.6);
    line.lineBetween(width / 2 - 130, height / 2 - 145, width / 2 + 130, height / 2 - 145);
    line.fillStyle(0xe94560, 1);
    line.fillCircle(width / 2 - 130, height / 2 - 145, 2);
    line.fillCircle(width / 2 + 130, height / 2 - 145, 2);

    // --- Subtitle ---
    this.add.text(width / 2, height / 2 - 128, 'ZOMBIE APOCALYPSE RV SURVIVAL', {
      fontFamily: 'Consolas, monospace',
      fontSize: '11px',
      color: UIHelper.COLORS.textMuted,
      letterSpacing: 3,
    }).setOrigin(0.5);

    // --- BGM ---
    SoundManager.playBGM(this, 'bgm_menu');

    // --- New Game button ---
    UIHelper.createButton(this, width / 2, height / 2 + 140, 220, 44, '新 游 戏', { isPrimary: true, fontSize: '18px' }, () => {
      SoundManager.playSFX(this, 'sfx_click');
      SaveLoad.deleteSave();
      const gameState = SaveLoad.getDefaultState();
      SaveLoad.save(gameState);
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.time.delayedCall(500, () => {
        this.scene.start('MapScene', { gameState, autoEnter: true });
      });
    });

    // --- Continue button ---
    if (SaveLoad.hasSave()) {
      const savedState = SaveLoad.load();
      if (savedState && savedState.gameCompleted) {
        UIHelper.createButton(this, width / 2, height / 2 + 195, 220, 44, '等待第二章...', { fontSize: '18px' }, () => {
          // 不进入游戏
        });
      } else {
        UIHelper.createButton(this, width / 2, height / 2 + 195, 220, 44, '继续游戏', { fontSize: '18px' }, () => {
          SoundManager.playSFX(this, 'sfx_click');
          this.cameras.main.fadeOut(500, 0, 0, 0);
          this.time.delayedCall(500, () => {
            this.scene.start('MapScene', { gameState: savedState });
          });
        });
      }
    }

    // --- Floating particles ---
    for (let i = 0; i < 8; i++) {
      const px = Math.random() * width;
      const py = Math.random() * height;
      const particle = this.add.graphics();
      particle.fillStyle(0xe94560, 0.08 + Math.random() * 0.08);
      particle.fillCircle(0, 0, 1.5 + Math.random() * 2);
      particle.setPosition(px, py);
      this.tweens.add({
        targets: particle,
        y: py - 60 - Math.random() * 40,
        x: px + (Math.random() - 0.5) * 30,
        alpha: 0,
        duration: 4000 + Math.random() * 3000,
        repeat: -1,
        delay: Math.random() * 3000,
        onRepeat: () => {
          particle.setPosition(Math.random() * width, height + 20);
          particle.setAlpha(1);
        },
      });
    }

    // --- Version ---
    this.add.text(width - 12, height - 12, 'v0.2.0', {
      fontFamily: 'Consolas, monospace',
      fontSize: '10px',
      color: '#1a1a2e',
    }).setOrigin(1, 1);

    // --- Fade in ---
    this.cameras.main.fadeIn(600, 0, 0, 0);
  }

}
