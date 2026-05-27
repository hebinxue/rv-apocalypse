// BootScene.js - Resource loading scene with progress bar
class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Progress bar background
    const barBg = this.add.graphics();
    barBg.fillStyle(0x1a1a2e, 1);
    barBg.fillRect(width / 2 - 160, height / 2 - 12, 320, 24);

    // Progress bar fill
    const bar = this.add.graphics();

    // Loading text
    const loadingText = this.add.text(width / 2, height / 2 - 40, '正在加载资源...', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#8892b0',
    }).setOrigin(0.5);

    // Percent text
    const percentText = this.add.text(width / 2, height / 2 + 30, '0%', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#ccd6f6',
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      bar.clear();
      bar.fillStyle(0x00c8ff, 1);
      bar.fillRect(width / 2 - 156, height / 2 - 8, 312 * value, 16);
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
  }

  create() {
    this.scene.start('MenuScene');
  }
}
