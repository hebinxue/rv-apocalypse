// UIHelper.js - Shared UI utilities for premium visual style
class UIHelper {

  // ─── Unified color palette ───
  static COLORS = {
    // Backgrounds
    panelBg:      0x10142a,
    cardBg:       0x161c36,
    overlay:      0x080c1a,
    statusBarBg:  0x0f1328,

    // Borders
    border:       0x2a3158,
    borderLight:  0x3a4578,
    borderDim:    0x1e2548,

    // Text (hex strings for Phaser text)
    textPrimary:   '#dce4f7',
    textSecondary: '#9aa5c4',
    textMuted:     '#5e6a84',
    textDim:       '#4a5570',
    textWhite:     '#ffffff',

    // Accents
    danger:    0xe94560,
    dangerHover: 0xff6b81,
    info:      0x38bdf8,
    infoHover: 0x5cc8ff,
    success:   0x34d399,
    warning:   0xfbbf24,

    // Speaker colors (keep existing)
    speakerPlayer:  0x00c8ff,
    speakerWangzai: 0xffaa00,
    speakerBingjie: 0x66ccff,
    speakerCaoge:   0x44dd66,
    speakerLaojing: 0xccaa66,
  };

  // ─── Draw a panel with depth (shadow + fill + highlight + border + inner glow) ───
  static drawPanel(scene, x, y, w, h, opts = {}) {
    const {
      fillColor = UIHelper.COLORS.panelBg,
      fillAlpha = 0.92,
      borderColor = UIHelper.COLORS.border,
      borderAlpha = 0.5,
      radius = 10,
      shadowOffset = 3,
      showHighlight = true,
      showInnerGlow = true,
    } = opts;

    const g = scene.add.graphics();

    // Layer 1: Drop shadow (two layers for soft blur effect)
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(x + shadowOffset, y + shadowOffset, w, h, radius);
    g.fillStyle(0x000000, 0.12);
    g.fillRoundedRect(x + 1, y + 2, w, h, radius);

    // Layer 2: Base fill
    g.fillStyle(fillColor, fillAlpha);
    g.fillRoundedRect(x, y, w, h, radius);

    // Layer 3: Top highlight edge
    if (showHighlight) {
      g.lineStyle(1, 0xffffff, 0.05);
      g.lineBetween(x + radius, y + 1, x + w - radius, y + 1);
    }

    // Layer 4: Border
    g.lineStyle(1, borderColor, borderAlpha);
    g.strokeRoundedRect(x, y, w, h, radius);

    // Layer 5: Inner glow (subtle inset border)
    if (showInnerGlow) {
      g.lineStyle(1, 0xffffff, 0.04);
      g.strokeRoundedRect(x + 2, y + 2, w - 4, h - 4, Math.max(1, radius - 1));
    }

    return g;
  }

  // ─── Create an interactive button with press feedback ───
  static createButton(scene, x, y, w, h, label, opts = {}, callback) {
    // Support (scene, x, y, w, h, label, callback) signature
    if (typeof opts === 'function') {
      callback = opts;
      opts = {};
    }

    const {
      fontSize = '16px',
      fillColor = 0x1a1a2e,
      hoverColor = 0x222244,
      pressColor = 0x0f0f1f,
      borderColor = UIHelper.COLORS.border,
      borderAlpha = 0.4,
      hoverBorderAlpha = 0.8,
      textColor = UIHelper.COLORS.textPrimary,
      hoverTextColor = '#00c8ff',
      accentColor = 0x00c8ff,
      radius = 8,
      isPrimary = false,
      primaryFillColor = UIHelper.COLORS.danger,
      primaryHoverColor = 0xff5577,
      primaryBorderColor = UIHelper.COLORS.danger,
    } = opts;

    // Resolve primary vs secondary colors
    const bgFill = isPrimary ? primaryFillColor : fillColor;
    const bgHover = isPrimary ? primaryHoverColor : hoverColor;
    const bgPress = isPrimary ? 0xaa2244 : pressColor;
    const bdrColor = isPrimary ? primaryBorderColor : borderColor;
    const bdrAlpha = isPrimary ? 0.6 : borderAlpha;
    const hBdrAlpha = isPrimary ? 1.0 : hoverBorderAlpha;
    const hTextColor = isPrimary ? '#ffffff' : hoverTextColor;

    const container = scene.add.container(x, y);

    // Glow layer (hidden by default)
    const glow = scene.add.graphics();
    container.add(glow);

    // Background layer
    const bg = scene.add.graphics();
    container.add(bg);

    // Draw base state
    const drawBg = (fill, bdrA) => {
      bg.clear();
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
      bg.lineStyle(isPrimary ? 2 : 1, bdrColor, bdrA);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
    };
    drawBg(bgFill, bdrAlpha);

    // Text
    const text = scene.add.text(0, 0, label, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: fontSize,
      color: isPrimary ? '#ffffff' : textColor,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(text);

    // Make interactive
    const hitArea = scene.add.rectangle(0, 0, w, h, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true });
    container.add(hitArea);

    // Hover: glow + scale
    hitArea.on('pointerover', () => {
      glow.clear();
      glow.fillStyle(accentColor, 0.06);
      glow.fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, radius + 3);
      drawBg(bgHover, hBdrAlpha);
      text.setColor(hTextColor);
      container.setScale(1.03);
    });

    hitArea.on('pointerout', () => {
      glow.clear();
      drawBg(bgFill, bdrAlpha);
      text.setColor(isPrimary ? '#ffffff' : textColor);
      container.setScale(1);
    });

    // Press: scale down → bounce back → callback
    hitArea.on('pointerdown', () => {
      drawBg(bgPress, 1);
      container.setScale(0.95);
      scene.time.delayedCall(80, () => {
        container.setScale(1);
        glow.clear();
        drawBg(bgFill, bdrAlpha);
        text.setColor(isPrimary ? '#ffffff' : textColor);
        if (callback) callback();
      });
    });

    return container;
  }

  // ─── Toast notification system ───
  static _activeToasts = [];

  static showToast(scene, message, type = 'info') {
    const { width } = scene.cameras.main;

    const typeConfigs = {
      reward:  { bg: 0x0a2a1a, border: UIHelper.COLORS.success, icon: '✦' },
      warning: { bg: 0x2a2a0a, border: UIHelper.COLORS.warning, icon: '!' },
      danger:  { bg: 0x2a0a0a, border: UIHelper.COLORS.danger, icon: '!' },
      info:    { bg: 0x0a1a2a, border: UIHelper.COLORS.info, icon: 'i' },
    };
    const cfg = typeConfigs[type] || typeConfigs.info;

    // Measure text to determine toast width
    const maxTextW = width - 120;
    const testText = scene.add.text(0, 0, message, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
    });
    const textW = Math.min(testText.width + 10, maxTextW);
    testText.destroy();

    const toastW = textW + 50;
    const toastH = 38;
    const toastX = width / 2 - toastW / 2;

    // Stack management: max 3 visible
    UIHelper._activeToasts = UIHelper._activeToasts.filter(t => !t._destroyed);
    if (UIHelper._activeToasts.length >= 3) {
      const oldest = UIHelper._activeToasts.shift();
      if (oldest && oldest.scene) oldest.destroy();
    }
    const stackOffset = UIHelper._activeToasts.length * 44;
    const toastY = 16 + stackOffset;

    const container = scene.add.container(0, 0);
    container.setDepth(10002);

    // Panel background
    const panel = scene.add.graphics();
    panel.fillStyle(cfg.bg, 0.94);
    panel.fillRoundedRect(toastX, toastY, toastW, toastH, 8);
    panel.lineStyle(1, cfg.border, 0.5);
    panel.strokeRoundedRect(toastX, toastY, toastW, toastH, 8);
    // Left accent bar
    panel.fillStyle(cfg.border, 0.8);
    panel.fillRoundedRect(toastX + 4, toastY + 8, 3, toastH - 16, 2);
    container.add(panel);

    // Icon
    const icon = scene.add.text(toastX + 16, toastY + toastH / 2, cfg.icon, {
      fontFamily: 'Consolas, monospace',
      fontSize: '14px',
      color: Phaser.Display.Color.IntegerToRGBtoHex(cfg.border),
    }).setOrigin(0.5);
    container.add(icon);

    // Message text
    const text = scene.add.text(toastX + 32, toastY + toastH / 2, message, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: UIHelper.COLORS.textPrimary,
    }).setOrigin(0, 0.5);
    container.add(text);

    // Entrance animation: slide down + fade in
    container.setAlpha(0);
    container.y = -20;
    scene.tweens.add({
      targets: container,
      y: 0, alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Exit after hold
    scene.tweens.add({
      targets: container,
      alpha: 0, y: -15,
      duration: 250,
      delay: 2500,
      onComplete: () => {
        container._destroyed = true;
        container.destroy();
      },
    });

    UIHelper._activeToasts.push(container);
    return container;
  }

  // ─── Utility: convert integer color to CSS hex string ───
  static intToHex(color) {
    return '#' + color.toString(16).padStart(6, '0');
  }
}

// Phaser Display.Color doesn't have IntegerToRGBtoHex, add helper
if (!Phaser.Display.Color.IntegerToRGBtoHex) {
  Phaser.Display.Color.IntegerToRGBtoHex = function(color) {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };
}
