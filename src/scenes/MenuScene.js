// MenuScene.js - Main menu scene
class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background gradient effect via rectangles
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x1a0a2e, 0x1a0a2e, 1);
    bg.fillRect(0, 0, width, height);

    // Decorative line
    const line = this.add.graphics();
    line.lineStyle(1, 0x00c8ff, 0.3);
    line.lineBetween(width / 2 - 120, height / 2 - 50, width / 2 + 120, height / 2 - 50);

    // Title
    this.add.text(width / 2, height / 2 - 100, '末日房车逃生', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '48px',
      color: '#ccd6f6',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, height / 2 - 60, 'ZOMBIE APOCALYPSE RV SURVIVAL', {
      fontFamily: 'Consolas, monospace',
      fontSize: '12px',
      color: '#4a5568',
      letterSpacing: 4,
    }).setOrigin(0.5);

    // New Game button
    this.createButton(width / 2, height / 2 + 20, '新 游 戏', () => {
      SaveLoad.deleteSave();
      const gameState = SaveLoad.getDefaultState();
      SaveLoad.save(gameState);
      this.scene.start('MapScene', { gameState });
    });

    // Continue Game button (shown only if save exists)
    if (SaveLoad.hasSave()) {
      this.createButton(width / 2, height / 2 + 70, '继续游戏', () => {
        const gameState = SaveLoad.load();
        this.scene.start('MapScene', { gameState });
      });
    }

    // Version text
    this.add.text(width - 10, height - 10, 'v0.1.0', {
      fontFamily: 'Consolas, monospace',
      fontSize: '10px',
      color: '#2d3748',
    }).setOrigin(1, 1);
  }

  createButton(x, y, label, callback) {
    const btnWidth = 200;
    const btnHeight = 40;

    const container = this.add.container(x, y);

    // Button background
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 1);
    bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 4);
    bg.lineStyle(1, 0x00c8ff, 0.4);
    bg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 4);

    // Button text
    const text = this.add.text(0, 0, label, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#ccd6f6',
    }).setOrigin(0.5);

    container.add([bg, text]);

    // Hit area
    const hitArea = this.add.rectangle(x, y, btnWidth, btnHeight)
      .setInteractive({ useHandCursor: true })
      .setOrigin(0.5)
      .setAlpha(0.001);

    hitArea.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x16213e, 1);
      bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 4);
      bg.lineStyle(1, 0x00c8ff, 0.8);
      bg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 4);
      text.setColor('#00c8ff');
    });

    hitArea.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x1a1a2e, 1);
      bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 4);
      bg.lineStyle(1, 0x00c8ff, 0.4);
      bg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 4);
      text.setColor('#ccd6f6');
    });

    hitArea.on('pointerdown', callback);
  }
}
