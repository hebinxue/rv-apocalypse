// BootScene.js - Resource loading scene with progress bar
class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x1a0a0a, 0x1a0a0a, 1);
    bg.fillRect(0, 0, width, height);

    // Progress bar background (rounded)
    const barW = 300, barH = 8;
    const barX = width / 2 - barW / 2, barY = height / 2;
    const barBg = this.add.graphics();
    barBg.fillStyle(0x1a1a2e, 1);
    barBg.fillRoundedRect(barX, barY, barW, barH, 4);
    barBg.lineStyle(1, 0x222244, 0.5);
    barBg.strokeRoundedRect(barX, barY, barW, barH, 4);

    // Progress bar fill
    const bar = this.add.graphics();

    // Loading text
    const loadingText = this.add.text(width / 2, height / 2 - 40, '正在加载...', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#5a6578',
    }).setOrigin(0.5);

    // Percent text
    const percentText = this.add.text(width / 2, height / 2 + 25, '0%', {
      fontFamily: 'Consolas, monospace',
      fontSize: '12px',
      color: '#4a5568',
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      bar.clear();
      bar.fillStyle(0xe94560, 0.8);
      bar.fillRoundedRect(barX + 2, barY + 2, (barW - 4) * value, barH - 4, 3);
      percentText.setText(`${Math.round(value * 100)}%`);
    });

    this.load.on('complete', () => {
      bar.destroy();
      barBg.destroy();
      loadingText.destroy();
      percentText.destroy();
    });

    // Load JSON data files
    this.load.json('itemsData', 'src/data/items.json');
    this.load.json('npcsData', 'src/data/npcs.json');
    this.load.json('zombiesData', 'src/data/zombies.json');
    this.load.json('eventsData', 'src/data/events.json');
    this.load.json('storyData', 'src/data/story.json');
    this.load.json('specialEventsData', 'src/data/special_events.json');

    // Load background images (PNG or JPG, missing files silently skipped)
    const bgScenes = ['apartment', 'gas_station', 'supermarket', 'hospital', 'highway', 'mountain', 'safe_zone', 'battlefield', 'campfire', 'apartment_wangzai', 'gas_station_meet', 'hospital_laojing', 'apartment_zombies', 'safe_zone_xuehe', 'boss_appear'];
    bgScenes.forEach(name => {
      this.load.image(`bg_${name}_png`, `src/assets/bg/${name}.png`);
      this.load.image(`bg_${name}_jpg`, `src/assets/bg/${name}.jpg`);
    });
    // Character portraits (PNG or JPG, with expression variants)
    const characters = ['player', 'wangzai', 'bingjie', 'caoge', 'laojing', 'xuehe', 'boss', 'sangshi'];
    characters.forEach(name => {
      this.load.image(`char_${name}_png`, `src/assets/characters/${name}.png`);
      this.load.image(`char_${name}_jpg`, `src/assets/characters/${name}.jpg`);
      // Load expression variants (1-4)
      for (let i = 1; i <= 4; i++) {
        this.load.image(`char_${name}-${i}_png`, `src/assets/characters/${name}-${i}.png`);
        this.load.image(`char_${name}-${i}_jpg`, `src/assets/characters/${name}-${i}.jpg`);
      }
    });

    // 音频加载（文件不存在时自动跳过）
    SoundManager.preloadAll(this);

    // Silently skip missing image files — remove broken texture entries
    this.load.on('loaderror', (file) => {
      if (file.type === 'image') {
        this.textures.remove(file.key);
      }
    });
  }

  create() {
    // 生成缺失的音效（文件不存在时自动用代码生成）
    SoundManager.generateMissing(this);

    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.time.delayedCall(300, () => {
      this.scene.start('MenuScene');
    });
  }
}
