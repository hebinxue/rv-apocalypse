// RVScene.js - RV interior management scene with NPC, inventory, and upgrade tabs
class RVScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RVScene' });
    this.activeTab = 'npcs';
    this.npcInstances = {};
    this.scrollContainers = {};
    this.notificationText = null;
  }

  init(data) {
    if (data && data.gameState) {
      this.gameState = data.gameState;
    } else {
      this.gameState = SaveLoad.load() || SaveLoad.getDefaultState();
    }
  }

  create() {
    const { width, height } = this.cameras.main;

    // --- Dark background ---
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x111128, 0x111128, 1);
    bg.fillRect(0, 0, width, height);

    // Subtle grid pattern
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a1a3e, 0.15);
    for (let gx = 0; gx < width; gx += 40) grid.lineBetween(gx, 0, gx, height);
    for (let gy = 0; gy < height; gy += 40) grid.lineBetween(0, gy, width, gy);

    // --- Title ---
    this.add.text(width / 2, 35, '房车内部', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '28px',
      color: '#ccd6f6',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // --- Build NPC instances from gameState ---
    const npcsData = this.cache.json.get('npcsData') || {};
    Object.keys(this.gameState.npcs).forEach(npcId => {
      const npcSave = this.gameState.npcs[npcId];
      if (!npcSave.recruited) return;
      const npcDef = npcsData[npcId];
      if (!npcDef) return;
      const inst = new NPC(npcDef);
      inst.affinity = npcSave.affinity;
      inst.recruited = true;
      if (npcSave.stats) inst.stats = npcSave.stats;
      this.npcInstances[npcId] = inst;
    });

    // --- Tab containers ---
    this.tabContainers = {
      npcs: this.add.container(0, 0),
      inventory: this.add.container(0, 0),
      upgrades: this.add.container(0, 0),
    };
    this.activeTab = 'npcs';

    // --- Tab bar ---
    this.createTabBar();

    // --- Notification text ---
    this.notificationText = this.add.text(width / 2, 50, '', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#e94560',
      padding: { x: 16, y: 6 },
    }).setOrigin(0.5).setAlpha(0).setDepth(100);

    // --- Render default tab ---
    this.renderTab('npcs');

    // --- Back button ---
    this.createBackButton();
  }

  // ============================================================
  //  TAB BAR
  // ============================================================
  createTabBar() {
    const { width } = this.cameras.main;
    const tabY = 72;
    const tabWidth = 180;
    const tabHeight = 36;
    const gap = 20;
    const totalWidth = tabWidth * 3 + gap * 2;
    const startX = (width - totalWidth) / 2;

    const tabs = [
      { key: 'npcs', icon: '👥', label: '队友' },
      { key: 'inventory', icon: '📦', label: '物资' },
      { key: 'upgrades', icon: '🔧', label: '升级' },
    ];

    this.tabButtons = {};

    tabs.forEach((tab, i) => {
      const x = startX + i * (tabWidth + gap);
      this.createTabButton(x, tabY, tabWidth, tabHeight, tab.icon, tab.label, tab.key);
    });
  }

  createTabButton(x, y, w, h, icon, label, key) {
    const isActive = key === this.activeTab;

    const bg = this.add.graphics();
    bg.fillStyle(isActive ? 0x16213e : 0x1a1a2e, 1);
    bg.fillRoundedRect(x, y, w, h, 6);
    bg.lineStyle(1, isActive ? 0x00c8ff : 0x333355, isActive ? 0.9 : 0.5);
    bg.strokeRoundedRect(x, y, w, h, 6);

    const text = this.add.text(x + w / 2, y + h / 2, `${icon} ${label}`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: isActive ? '#00c8ff' : '#8892b0',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const hitArea = this.add.rectangle(x + w / 2, y + h / 2, w, h)
      .setOrigin(0.5).setAlpha(0.001).setInteractive({ useHandCursor: true });

    hitArea.on('pointerdown', () => {
      if (this.activeTab !== key) {
        this.activeTab = key;
        this.refreshTabBar();
        this.renderTab(key);
      }
    });

    hitArea.on('pointerover', () => {
      if (this.activeTab !== key) {
        text.setColor('#ccd6f6');
      }
    });

    hitArea.on('pointerout', () => {
      if (this.activeTab !== key) {
        text.setColor('#8892b0');
      }
    });

    this.tabButtons[key] = { bg, text, hitArea, x, y, w, h };
  }

  refreshTabBar() {
    Object.entries(this.tabButtons).forEach(([key, btn]) => {
      const isActive = key === this.activeTab;
      btn.bg.clear();
      btn.bg.fillStyle(isActive ? 0x16213e : 0x1a1a2e, 1);
      btn.bg.fillRoundedRect(btn.x, btn.y, btn.w, btn.h, 6);
      btn.bg.lineStyle(1, isActive ? 0x00c8ff : 0x333355, isActive ? 0.9 : 0.5);
      btn.bg.strokeRoundedRect(btn.x, btn.y, btn.w, btn.h, 6);
      btn.text.setColor(isActive ? '#00c8ff' : '#8892b0');
    });
  }

  // ============================================================
  //  TAB RENDERING DISPATCH
  // ============================================================
  renderTab(tabKey) {
    // Clear all tab containers
    Object.values(this.tabContainers).forEach(c => c.removeAll(true));
    // Clear scroll containers
    Object.values(this.scrollContainers).forEach(c => {
      if (c.wheelFn) this.input.removeListener('wheel', c.wheelFn);
    });
    this.scrollContainers = {};

    switch (tabKey) {
      case 'npcs': this.renderNPCTab(); break;
      case 'inventory': this.renderInventoryTab(); break;
      case 'upgrades': this.renderUpgradesTab(); break;
    }
  }

  // ============================================================
  //  SCROLLABLE AREA HELPER
  // ============================================================
  createScrollableArea(parentContainer, x, y, w, h) {
    const contentContainer = this.add.container(0, 0);
    parentContainer.add(contentContainer);

    // Mask to clip content
    const maskGfx = this.make.graphics().fillRect(x, y, w, h).setVisible(false);
    const mask = maskGfx.createGeometryMask();
    contentContainer.setMask(mask);

    // Drag target
    const dragArea = this.add.rectangle(x + w / 2, y + h / 2, w, h)
      .setOrigin(0.5).setAlpha(0.001).setInteractive();

    let dragStartY = 0;
    let scrollStart = 0;
    let isDragging = false;

    dragArea.on('pointerdown', (pointer) => {
      isDragging = true;
      dragStartY = pointer.y;
      scrollStart = contentContainer.y;
    });

    this.input.on('pointermove', (pointer) => {
      if (!isDragging) return;
      contentContainer.y = scrollStart + (pointer.y - dragStartY);
    });

    this.input.on('pointerup', () => { isDragging = false; });

    // Wheel scrolling
    const wheelFn = (pointer, gameObjects, deltaX, deltaY) => {
      if (!dragArea.getBounds().contains(pointer.x, pointer.y)) return;
      contentContainer.y -= deltaY * 0.5;
      const scrollArea = this.scrollContainers[parentContainer];
      if (scrollArea) {
        const minScroll = Math.min(0, h - scrollArea.scrollHeight);
        contentContainer.y = Phaser.Math.Clamp(contentContainer.y, minScroll, 0);
      }
    };
    this.input.on('wheel', wheelFn);

    parentContainer.add(dragArea);

    this.scrollContainers[parentContainer] = {
      contentContainer, dragArea, maskGfx, mask, wheelFn, x, y, w, h, scrollHeight: 0
    };

    return contentContainer;
  }

  updateScrollHeight(parentContainer, totalHeight) {
    const scrollArea = this.scrollContainers[parentContainer];
    if (!scrollArea) return;
    scrollArea.scrollHeight = totalHeight;
    // Clamp position
    const minScroll = Math.min(0, scrollArea.h - totalHeight);
    scrollArea.contentContainer.y = Phaser.Math.Clamp(scrollArea.contentContainer.y, minScroll, 0);
  }

  addScrollIndicators(parentContainer) {
    const scrollArea = this.scrollContainers[parentContainer];
    if (!scrollArea || scrollArea.scrollHeight <= scrollArea.h) return;

    const scrollUp = this.add.text(scrollArea.x + scrollArea.w - 20, scrollArea.y + 5, '▲', {
      fontSize: '14px', color: '#4a5568'
    }).setOrigin(0.5).setAlpha(0.6);

    const scrollDown = this.add.text(scrollArea.x + scrollArea.w - 20, scrollArea.y + scrollArea.h - 5, '▼', {
      fontSize: '14px', color: '#4a5568'
    }).setOrigin(0.5).setAlpha(0.6);

    parentContainer.add(scrollUp);
    parentContainer.add(scrollDown);

    // Animate scroll indicators based on position
    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        if (!scrollArea.contentContainer.active) return;
        const pos = scrollArea.contentContainer.y;
        const minScroll = Math.min(0, scrollArea.h - scrollArea.scrollHeight);
        scrollUp.setAlpha(pos < -5 ? 0.6 : 0.15);
        scrollDown.setAlpha(pos > minScroll + 5 ? 0.6 : 0.15);
      },
    });
  }

  // ============================================================
  //  TAB 1: NPC MANAGEMENT
  // ============================================================
  renderNPCTab() {
    const { width } = this.cameras.main;
    const parentContainer = this.tabContainers.npcs;

    const scrollX = 40;
    const scrollY = 120;
    const scrollW = width - 80;
    const scrollH = 380;

    const contentContainer = this.createScrollableArea(parentContainer, scrollX, scrollY, scrollW, scrollH);

    const npcIds = Object.keys(this.npcInstances);

    if (npcIds.length === 0) {
      this.add.text(scrollX + scrollW / 2, scrollY + 100, '还没有队友加入', {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '18px', color: '#4a5568'
      }).setOrigin(0.5);
      return;
    }

    let yPos = 0;

    npcIds.forEach(npcId => {
      const npc = this.npcInstances[npcId];
      const cardContainer = this.add.container(0, yPos);
      contentContainer.add(cardContainer);

      // Card background
      const cardBg = this.add.graphics();
      cardBg.fillStyle(0x12122a, 0.9);
      cardBg.fillRoundedRect(0, 0, scrollW, 85, 6);
      cardBg.lineStyle(1, 0x222244, 0.8);
      cardBg.strokeRoundedRect(0, 0, scrollW, 85, 6);
      cardContainer.add(cardBg);

      // --- Left section: Name + Personality + Affinity bar ---
      // Name
      cardContainer.add(this.add.text(12, 8, npc.name, {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '16px',
        color: '#ccd6f6', fontStyle: 'bold',
      }));

      // Personality
      cardContainer.add(this.add.text(12, 28, npc.personality || '', {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '11px', color: '#666688',
      }));

      // Affinity bar
      const barX = 12;
      const barY = 46;
      const barW = 200;
      const barH = 10;

      cardContainer.add(this.add.text(barX, barY - 1, '好感:', {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '11px', color: '#8892b0',
      }));

      const abX = barX + 32;
      // Bar background
      const barBg = this.add.graphics();
      barBg.fillStyle(0x1a1a2e, 1);
      barBg.fillRoundedRect(abX, barY, barW, barH, 4);
      barBg.lineStyle(1, 0x333355, 0.8);
      barBg.strokeRoundedRect(abX, barY, barW, barH, 4);
      cardContainer.add(barBg);

      // Bar fill
      const affinity = npc.affinity;
      const fillW = Math.max(2, (affinity / 100) * barW);
      const barColor = affinity > 60 ? 0xff69b4 : affinity > 30 ? 0xff8c00 : 0xe94560;
      const barFill = this.add.graphics();
      barFill.fillStyle(barColor, 1);
      barFill.fillRoundedRect(abX + 1, barY + 1, fillW - 2, barH - 2, 3);
      cardContainer.add(barFill);

      // Affinity value + status
      const status = this.getAffinityStatus(affinity);
      cardContainer.add(this.add.text(abX + barW + 8, barY - 1, `${affinity} ${status.text}`, {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '11px', color: status.color,
      }));

      // --- Right section: Skills + Feed button ---
      const rightX = 300;

      // Skills
      cardContainer.add(this.add.text(rightX, 6, '技能:', {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '11px', color: '#8892b0',
      }));

      const availableSkills = npc.getAvailableSkills();
      let skillStr = '无';
      if (availableSkills.length > 0) {
        skillStr = availableSkills.map(s => s.name).join(' / ');
      }
      const skillText = this.add.text(rightX, 22, skillStr, {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '11px', color: '#00c8ff',
        wordWrap: { width: scrollW - rightX - 10 },
      });
      cardContainer.add(skillText);

      // Feed button
      this.createFeedButton(cardContainer, scrollW - 90, 58, npcId, npc);

      yPos += 92;
    });

    this.updateScrollHeight(parentContainer, yPos);
    this.addScrollIndicators(parentContainer);
  }

  createFeedButton(parentContainer, x, y, npcId, npc) {
    const btnW = 80;
    const btnH = 24;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x1a1a2e, 1);
    btnBg.fillRoundedRect(x, y, btnW, btnH, 4);
    btnBg.lineStyle(1, 0x00c8ff, 0.5);
    btnBg.strokeRoundedRect(x, y, btnW, btnH, 4);
    parentContainer.add(btnBg);

    const btnText = this.add.text(x + btnW / 2, y + btnH / 2, '🍖 喂食', {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '13px', color: '#ccd6f6',
    }).setOrigin(0.5);
    parentContainer.add(btnText);

    const hitArea = this.add.rectangle(x + btnW / 2, y + btnH / 2, btnW, btnH)
      .setOrigin(0.5).setAlpha(0.001).setInteractive({ useHandCursor: true });
    parentContainer.add(hitArea);

    hitArea.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x16213e, 1);
      btnBg.fillRoundedRect(x, y, btnW, btnH, 4);
      btnBg.lineStyle(1, 0x00c8ff, 0.9);
      btnBg.strokeRoundedRect(x, y, btnW, btnH, 4);
      btnText.setColor('#00c8ff');
    });

    hitArea.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0x1a1a2e, 1);
      btnBg.fillRoundedRect(x, y, btnW, btnH, 4);
      btnBg.lineStyle(1, 0x00c8ff, 0.5);
      btnBg.strokeRoundedRect(x, y, btnW, btnH, 4);
      btnText.setColor('#ccd6f6');
    });

    hitArea.on('pointerdown', () => { this.feedNPC(npcId); });
  }

  feedNPC(npcId) {
    const npc = this.npcInstances[npcId];
    if (!npc) return;

    const foodItems = this.gameState.inventory.filter(invItem => {
      const itemsData = this.cache.json.get('itemsData') || {};
      const def = itemsData[invItem.id];
      return def && def.type === 'food';
    });

    if (foodItems.length === 0) {
      this.showNotification('没有食物可以喂食！');
      return;
    }

    const foodItem = foodItems[0];
    const itemsData = this.cache.json.get('itemsData') || {};
    const itemDef = itemsData[foodItem.id];
    const foodName = itemDef ? itemDef.name : '食物';

    // Consume food
    const idx = this.gameState.inventory.findIndex(i => i.id === foodItem.id);
    if (idx !== -1) {
      this.gameState.inventory[idx].quantity -= 1;
      if (this.gameState.inventory[idx].quantity <= 0) {
        this.gameState.inventory.splice(idx, 1);
      }
    }

    // Increase affinity (+5, +comfort bonus)
    const comfortBonus = Math.floor(this.gameState.rv.comfort / 3);
    const affinityGain = 5 + comfortBonus;
    const result = npc.changeAffinity(affinityGain);

    // Sync back to gameState
    this.gameState.npcs[npcId].affinity = npc.affinity;

    this.showNotification(`喂了 ${npc.name} ${foodName}，好感 +${affinityGain}`);

    // Warning if NPC about to leave
    if (result.event === 'warning') {
      this.time.delayedCall(1200, () => { this.showNotification(result.message); });
    }
    if (result.event === 'left') {
      this.time.delayedCall(1200, () => {
        this.showNotification(result.message);
        this.time.delayedCall(800, () => {
          delete this.npcInstances[npcId];
          this.renderTab('npcs');
        });
      });
      return;
    }

    // Refresh tab
    this.time.delayedCall(800, () => { this.renderTab('npcs'); });
  }

  getAffinityStatus(affinity) {
    if (affinity > 80) return { text: '羁绊', color: '#ff69b4' };
    if (affinity > 60) return { text: '友好', color: '#ff8c00' };
    if (affinity > 40) return { text: '普通', color: '#8892b0' };
    if (affinity > 20) return { text: '不满', color: '#e94560' };
    return { text: '即将离开', color: '#ff0000' };
  }

  // ============================================================
  //  TAB 2: INVENTORY
  // ============================================================
  renderInventoryTab() {
    const { width } = this.cameras.main;
    const parentContainer = this.tabContainers.inventory;

    const scrollX = 40;
    const scrollY = 120;
    const scrollW = width - 80;
    const scrollH = 380;

    const contentContainer = this.createScrollableArea(parentContainer, scrollX, scrollY, scrollW, scrollH);

    // Header
    const count = this.gameState.inventory.length;
    const cap = this.gameState.rv.capacity;
    this.add.text(scrollX + scrollW / 2, scrollY - 20, `背包: ${count}/${cap}`, {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '14px', color: '#8892b0',
    }).setOrigin(0.5);

    if (this.gameState.inventory.length === 0) {
      this.add.text(scrollX + scrollW / 2, scrollY + 100, '储存空间为空', {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '18px', color: '#4a5568',
      }).setOrigin(0.5);
      return;
    }

    // Grid: 4 columns
    const cols = 4;
    const gap = 8;
    const cellW = (scrollW - gap * (cols - 1)) / cols;
    const cellH = 72;

    const itemsData = this.cache.json.get('itemsData') || {};
    const typeEmojis = { food: '🍖', material: '🔧', medical: '💊', weapon: '⚔️', special: '⭐' };

    this.gameState.inventory.forEach((invItem, i) => {
      const def = itemsData[invItem.id];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = col * (cellW + gap);
      const cy = row * (cellH + gap);

      const itemContainer = this.add.container(cx, cy);
      contentContainer.add(itemContainer);

      // Card background
      const cardBg = this.add.graphics();
      cardBg.fillStyle(0x12122a, 0.9);
      cardBg.fillRoundedRect(0, 0, cellW, cellH, 6);
      cardBg.lineStyle(1, 0x222244, 0.8);
      cardBg.strokeRoundedRect(0, 0, cellW, cellH, 6);
      itemContainer.add(cardBg);

      const emoji = def ? (typeEmojis[def.type] || '📦') : '📦';
      const itemName = def ? def.name : invItem.id;

      // Emoji
      itemContainer.add(this.add.text(8, 6, emoji, { fontSize: '18px' }));

      // Name
      itemContainer.add(this.add.text(30, 6, itemName, {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '12px',
        color: '#ccd6f6', fontStyle: 'bold',
      }));

      // Quantity
      itemContainer.add(this.add.text(cellW - 8, 6, `x${invItem.quantity}`, {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '12px', color: '#00c8ff',
      }).setOrigin(1, 0));

      // Description
      if (def && def.description) {
        itemContainer.add(this.add.text(8, 28, def.description, {
          fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '10px', color: '#666688',
          wordWrap: { width: cellW - 16 },
        }));
      }
    });

    const totalRows = Math.ceil(this.gameState.inventory.length / cols);
    const totalHeight = totalRows * (cellH + gap);
    this.updateScrollHeight(parentContainer, totalHeight);
    this.addScrollIndicators(parentContainer);
  }

  // ============================================================
  //  TAB 3: RV UPGRADES
  // ============================================================
  renderUpgradesTab() {
    const { width } = this.cameras.main;
    const parentContainer = this.tabContainers.upgrades;

    const scrollX = 40;
    const scrollY = 120;
    const scrollW = width - 80;
    const scrollH = 380;

    const contentContainer = this.createScrollableArea(parentContainer, scrollX, scrollY, scrollW, scrollH);

    // --- Current RV stats row ---
    const statsContainer = this.add.container(0, 0);
    contentContainer.add(statsContainer);

    const statsBg = this.add.graphics();
    statsBg.fillStyle(0x12122a, 0.9);
    statsBg.fillRoundedRect(0, 0, scrollW, 40, 6);
    statsBg.lineStyle(1, 0x222244, 0.8);
    statsBg.strokeRoundedRect(0, 0, scrollW, 40, 6);
    statsContainer.add(statsBg);

    const rv = this.gameState.rv;
    const stats = [
      { label: '耐久', value: `${rv.durability}/${rv.maxDurability}` },
      { label: '容量', value: `${rv.capacity}` },
      { label: '速度', value: `${rv.speed}` },
      { label: '防御', value: `${rv.defense}` },
      { label: '舒适', value: `${rv.comfort}` },
    ];

    const statSpacing = scrollW / (stats.length + 1);
    stats.forEach((stat, i) => {
      const sx = statSpacing * (i + 1);
      statsContainer.add(this.add.text(sx, 12, `${stat.label}: ${stat.value}`, {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '12px', color: '#8892b0',
      }).setOrigin(0.5));
    });

    // --- Upgrades list ---
    let yPos = 52;
    const rvUpgrade = new RVUpgrade(this.gameState.rv);
    const upgrades = rvUpgrade.getUpgrades();

    upgrades.forEach(upgrade => {
      const canAfford = this.canAffordUpgrade(upgrade.cost);

      const upgradeContainer = this.add.container(0, yPos);
      contentContainer.add(upgradeContainer);

      // Card background
      const cardBg = this.add.graphics();
      cardBg.fillStyle(0x12122a, 0.9);
      cardBg.fillRoundedRect(0, 0, scrollW, 72, 6);
      cardBg.lineStyle(1, canAfford ? 0x00c8ff : 0x222244, canAfford ? 0.7 : 0.8);
      cardBg.strokeRoundedRect(0, 0, scrollW, 72, 6);
      upgradeContainer.add(cardBg);

      // Name
      upgradeContainer.add(this.add.text(12, 8, upgrade.name, {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '15px',
        color: canAfford ? '#00c8ff' : '#ccd6f6', fontStyle: 'bold',
      }));

      // Description
      upgradeContainer.add(this.add.text(12, 28, upgrade.description, {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '11px', color: '#8892b0',
      }));

      // Cost items (left-aligned, word-wrapped)
      const itemsData = this.cache.json.get('itemsData') || {};
      const costArr = Object.entries(upgrade.cost).map(([itemId, qty]) => {
        const def = itemsData[itemId];
        return `${def ? def.name : itemId}x${qty}`;
      });
      const costStr = '需要: ' + costArr.join(' ');
      upgradeContainer.add(this.add.text(12, 46, costStr, {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '10px', color: '#666688',
        wordWrap: { width: scrollW - 120 },
      }));

      // Upgrade button
      this.createUpgradeButton(upgradeContainer, scrollW - 90, 24, upgrade, canAfford);

      yPos += 80;
    });

    this.updateScrollHeight(parentContainer, yPos);
    this.addScrollIndicators(parentContainer);
  }

  createUpgradeButton(parentContainer, x, y, upgrade, canAfford) {
    const btnW = 80;
    const btnH = 28;
    const borderColor = canAfford ? 0x00c8ff : 0x333355;
    const textColor = canAfford ? '#00c8ff' : '#4a5568';

    const btnBg = this.add.graphics();
    btnBg.fillStyle(canAfford ? 0x0a2a2a : 0x1a1a2e, 1);
    btnBg.fillRoundedRect(x, y, btnW, btnH, 4);
    btnBg.lineStyle(1, borderColor, canAfford ? 0.7 : 0.3);
    btnBg.strokeRoundedRect(x, y, btnW, btnH, 4);
    parentContainer.add(btnBg);

    const btnText = this.add.text(x + btnW / 2, y + btnH / 2, '升级', {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '14px', color: textColor,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    parentContainer.add(btnText);

    const hitArea = this.add.rectangle(x + btnW / 2, y + btnH / 2, btnW, btnH)
      .setOrigin(0.5).setAlpha(0.001).setInteractive({ useHandCursor: canAfford });
    parentContainer.add(hitArea);

    if (canAfford) {
      hitArea.on('pointerover', () => {
        btnBg.clear();
        btnBg.fillStyle(0x0a3a3a, 1);
        btnBg.fillRoundedRect(x, y, btnW, btnH, 4);
        btnBg.lineStyle(1, 0x00c8ff, 1);
        btnBg.strokeRoundedRect(x, y, btnW, btnH, 4);
        btnText.setColor('#ffffff');
      });

      hitArea.on('pointerout', () => {
        btnBg.clear();
        btnBg.fillStyle(0x0a2a2a, 1);
        btnBg.fillRoundedRect(x, y, btnW, btnH, 4);
        btnBg.lineStyle(1, 0x00c8ff, 0.7);
        btnBg.strokeRoundedRect(x, y, btnW, btnH, 4);
        btnText.setColor('#00c8ff');
      });

      hitArea.on('pointerdown', () => { this.applyUpgrade(upgrade); });
    }
  }

  canAffordUpgrade(cost) {
    for (const [itemId, qty] of Object.entries(cost)) {
      const invItem = this.gameState.inventory.find(i => i.id === itemId);
      if (!invItem || invItem.quantity < qty) return false;
    }
    return true;
  }

  applyUpgrade(upgrade) {
    if (!this.canAffordUpgrade(upgrade.cost)) return;

    // Consume materials
    for (const [itemId, qty] of Object.entries(upgrade.cost)) {
      const idx = this.gameState.inventory.findIndex(i => i.id === itemId);
      if (idx !== -1) {
        this.gameState.inventory[idx].quantity -= qty;
        if (this.gameState.inventory[idx].quantity <= 0) {
          this.gameState.inventory.splice(idx, 1);
        }
      }
    }

    // Apply upgrade to gameState.rv directly
    upgrade.apply(this.gameState.rv);

    this.showNotification(`升级成功: ${upgrade.name}！`);
    this.time.delayedCall(800, () => { this.renderTab('upgrades'); });
  }

  // ============================================================
  //  BACK BUTTON
  // ============================================================
  createBackButton() {
    const { width, height } = this.cameras.main;
    const btnX = width / 2;
    const btnY = height - 35;
    const btnW = 160;
    const btnH = 36;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x1a1a2e, 1);
    btnBg.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 6);
    btnBg.lineStyle(1, 0x00c8ff, 0.5);
    btnBg.strokeRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 6);

    const btnText = this.add.text(btnX, btnY, '返回地图', {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '15px', color: '#ccd6f6',
    }).setOrigin(0.5);

    const hitArea = this.add.rectangle(btnX, btnY, btnW, btnH)
      .setOrigin(0.5).setAlpha(0.001).setInteractive({ useHandCursor: true });

    hitArea.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x16213e, 1);
      btnBg.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 6);
      btnBg.lineStyle(1, 0x00c8ff, 0.9);
      btnBg.strokeRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 6);
      btnText.setColor('#00c8ff');
    });

    hitArea.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0x1a1a2e, 1);
      btnBg.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 6);
      btnBg.lineStyle(1, 0x00c8ff, 0.5);
      btnBg.strokeRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 6);
      btnText.setColor('#ccd6f6');
    });

    hitArea.on('pointerdown', () => {
      SaveLoad.save(this.gameState);
      this.scene.start('MapScene', { gameState: this.gameState });
    });
  }

  // ============================================================
  //  NOTIFICATION
  // ============================================================
  showNotification(message) {
    if (!this.notificationText) return;
    this.notificationText.setText(message);
    this.notificationText.setAlpha(0);
    this.tweens.add({
      targets: this.notificationText,
      alpha: 1,
      y: 55,
      duration: 300,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: 1500,
      onComplete: () => {
        this.notificationText.setAlpha(0);
        this.notificationText.y = 50;
      },
    });
  }
}
