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

    // --- RV Interior background ---
    const bg = this.add.graphics();
    // Warm interior gradient
    bg.fillGradientStyle(0x1a1510, 0x1a1510, 0x151018, 0x151018, 1);
    bg.fillRect(0, 0, width, height);

    // Wall panel lines (interior feel)
    bg.lineStyle(1, 0x222018, 0.3);
    for (let wx = 0; wx < width; wx += 60) {
      bg.lineBetween(wx, 0, wx, height);
    }
    // Horizontal panel
    bg.lineStyle(1, 0x222018, 0.2);
    bg.lineBetween(0, height * 0.15, width, height * 0.15);

    // Warm light glow
    bg.fillStyle(0xffcc44, 0.02);
    bg.fillCircle(width / 2, 20, 300);

    // --- Warm floating particles ---
    SceneParticles.addFireflies(this, width, height);

    // --- Title ---
    this.add.text(width / 2, 35, '🚐 房车内部', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '24px',
      color: UIHelper.COLORS.textPrimary,
      fontStyle: 'bold',
      stroke: '#0a0a0a',
      strokeThickness: 2,
    }).setOrigin(0.5);

    // Fade in
    this.cameras.main.fadeIn(400, 0, 0, 0);

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

    // Notification handled by UIHelper.showToast

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
    bg.fillStyle(isActive ? 0x16213e : UIHelper.COLORS.cardBg, 1);
    bg.fillRoundedRect(x, y, w, h, 6);
    bg.lineStyle(1, isActive ? UIHelper.COLORS.info : UIHelper.COLORS.border, isActive ? 0.9 : 0.5);
    bg.strokeRoundedRect(x, y, w, h, 6);

    const text = this.add.text(x + w / 2, y + h / 2, `${icon} ${label}`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: isActive ? '#38bdf8' : UIHelper.COLORS.textSecondary,
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    text.on('pointerdown', () => {
      if (this.activeTab !== key) {
        this.activeTab = key;
        this.refreshTabBar();
        this.renderTab(key);
      }
    });

    text.on('pointerover', () => {
      if (this.activeTab !== key) {
        text.setColor('#ccd6f6');
      }
    });

    text.on('pointerout', () => {
      if (this.activeTab !== key) {
        text.setColor('#8892b0');
      }
    });

    this.tabButtons[key] = { bg, text, x, y, w, h };
  }

  refreshTabBar() {
    Object.entries(this.tabButtons).forEach(([key, btn]) => {
      const isActive = key === this.activeTab;
      btn.bg.clear();
      btn.bg.fillStyle(isActive ? 0x16213e : UIHelper.COLORS.cardBg, 1);
      btn.bg.fillRoundedRect(btn.x, btn.y, btn.w, btn.h, 6);
      btn.bg.lineStyle(1, isActive ? UIHelper.COLORS.info : UIHelper.COLORS.border, isActive ? 0.9 : 0.5);
      btn.bg.strokeRoundedRect(btn.x, btn.y, btn.w, btn.h, 6);
      btn.text.setColor(isActive ? '#38bdf8' : UIHelper.COLORS.textSecondary);
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
  //  SCROLLABLE AREA HELPER — no dragArea overlay, uses wheel only
  // ============================================================
  createScrollableArea(parentContainer, x, y, w, h) {
    const contentContainer = this.add.container(x, y);
    parentContainer.add(contentContainer);

    // Mask to clip content — use same (x, y, w, h) so local y=0 maps to world y=y
    const maskGfx = this.make.graphics().fillRect(x, y, w, h).setVisible(false);
    const mask = maskGfx.createGeometryMask();
    contentContainer.setMask(mask);

    // Wheel scrolling (no dragArea needed — wheel doesn't block clicks)
    const scrollBounds = new Phaser.Geom.Rectangle(x, y, w, h);
    const wheelFn = (pointer, gameObjects, deltaX, deltaY) => {
      if (!scrollBounds.contains(pointer.x, pointer.y)) return;
      contentContainer.y -= deltaY * 0.5;
      const scrollArea = this.scrollContainers[parentContainer];
      if (scrollArea) {
        const minScroll = Math.min(y, y + h - scrollArea.scrollHeight);
        contentContainer.y = Phaser.Math.Clamp(contentContainer.y, minScroll, y);
      }
    };
    this.input.on('wheel', wheelFn);

    this.scrollContainers[parentContainer] = {
      contentContainer, maskGfx, mask, wheelFn, x, y, w, h, scrollHeight: 0
    };

    return contentContainer;
  }

  updateScrollHeight(parentContainer, totalHeight) {
    const scrollArea = this.scrollContainers[parentContainer];
    if (!scrollArea) return;
    scrollArea.scrollHeight = totalHeight;
    // Clamp position — y is the container's base (top of scroll area)
    const minScroll = Math.min(scrollArea.y, scrollArea.y + scrollArea.h - totalHeight);
    scrollArea.contentContainer.y = Phaser.Math.Clamp(scrollArea.contentContainer.y, minScroll, scrollArea.y);
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
        const minScroll = Math.min(scrollArea.y, scrollArea.y + scrollArea.h - scrollArea.scrollHeight);
        scrollUp.setAlpha(pos < scrollArea.y - 5 ? 0.6 : 0.15);
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
      const emptyText = this.add.text(scrollW / 2, 100, '还没有队友加入', {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '18px', color: '#4a5568'
      }).setOrigin(0.5);
      contentContainer.add(emptyText);
      this.updateScrollHeight(parentContainer, 200);
      return;
    }

    const roleNames = { tank: '坦克', control: '控制', burst: '输出', support: '辅助' };
    let yPos = 0;

    npcIds.forEach(npcId => {
      const npc = this.npcInstances[npcId];
      const cardH = 110;
      const cardContainer = this.add.container(0, yPos);
      contentContainer.add(cardContainer);

      // Card background
      const cardBg = this.add.graphics();
      cardBg.fillStyle(0x12122a, 0.9);
      cardBg.fillRoundedRect(0, 0, scrollW, cardH, 6);
      cardBg.lineStyle(1, 0x222244, 0.8);
      cardBg.strokeRoundedRect(0, 0, scrollW, cardH, 6);
      cardContainer.add(cardBg);

      // --- Left section: Name + Role + Personality + Stats ---
      const npcEmojis = { wangzai: '👦', bingjie: '👩', caoge: '💪', laojing: '👨‍🏫' };
      const emoji = npcEmojis[npcId] || '👤';
      cardContainer.add(this.add.text(12, 8, `${emoji} ${npc.name}`, {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '16px',
        color: '#ccd6f6', fontStyle: 'bold',
      }));

      const roleName = roleNames[npc.role] || npc.role || '';
      cardContainer.add(this.add.text(12, 30, `职业: ${roleName}`, {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '11px', color: '#00c8ff',
      }));

      cardContainer.add(this.add.text(80, 30, npc.personality || '', {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '11px', color: '#666688',
      }));

      // Stats row
      const stats = npc.stats || {};
      const statsStr = `HP:${stats.hp || 0}  攻:${stats.attack || 0}  防:${stats.defense || 0}  速:${stats.speed || 0}`;
      cardContainer.add(this.add.text(12, 48, statsStr, {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '11px', color: '#8892b0',
      }));

      // --- Affinity bar ---
      const barX = 12;
      const barY = 68;
      const barW = 180;
      const barH = 10;

      cardContainer.add(this.add.text(barX, barY - 1, '好感:', {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '11px', color: '#8892b0',
      }));

      const abX = barX + 32;
      const barBg = this.add.graphics();
      barBg.fillStyle(0x1a1a2e, 1);
      barBg.fillRoundedRect(abX, barY, barW, barH, 4);
      barBg.lineStyle(1, 0x333355, 0.8);
      barBg.strokeRoundedRect(abX, barY, barW, barH, 4);
      cardContainer.add(barBg);

      const affinity = npc.affinity;
      const fillW = Math.max(2, (affinity / 100) * barW);
      const barColor = affinity > 60 ? 0xff69b4 : affinity > 30 ? 0xff8c00 : 0xe94560;
      const barFill = this.add.graphics();
      barFill.fillStyle(barColor, 1);
      barFill.fillRoundedRect(abX + 1, barY + 1, fillW - 2, barH - 2, 3);
      cardContainer.add(barFill);

      const status = this.getAffinityStatus(affinity);
      cardContainer.add(this.add.text(abX + barW + 8, barY - 1, `${affinity} ${status.text}`, {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '11px', color: status.color,
      }));

      // --- Right section: Skills ---
      const rightX = 300;

      cardContainer.add(this.add.text(rightX, 8, '已解锁技能:', {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '11px', color: '#8892b0',
      }));

      const availableSkills = npc.getAvailableSkills();
      if (availableSkills.length > 0) {
        availableSkills.forEach((skill, i) => {
          cardContainer.add(this.add.text(rightX, 26 + i * 16, `${skill.name}`, {
            fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '11px', color: '#00c8ff',
          }));
        });
      } else {
        cardContainer.add(this.add.text(rightX, 26, '无', {
          fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '11px', color: '#4a5568',
        }));
      }

      // Locked skills hint
      const allSkills = npc.skills || [];
      const lockedSkills = allSkills.filter(s => affinity < s.unlockAffinity);
      if (lockedSkills.length > 0) {
        const nextSkill = lockedSkills[0];
        cardContainer.add(this.add.text(rightX, 26 + availableSkills.length * 16 + 4, `🔒 ${nextSkill.name} (好感${nextSkill.unlockAffinity})`, {
          fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '10px', color: '#4a5568',
        }));
      }

      // Feed button
      this.createFeedButton(cardContainer, scrollW - 90, cardH - 30, npcId, npc);

      yPos += cardH + 8;
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
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    parentContainer.add(btnText);

    btnText.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x16213e, 1);
      btnBg.fillRoundedRect(x, y, btnW, btnH, 4);
      btnBg.lineStyle(1, 0x00c8ff, 0.9);
      btnBg.strokeRoundedRect(x, y, btnW, btnH, 4);
      btnText.setColor('#00c8ff');
    });

    btnText.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0x1a1a2e, 1);
      btnBg.fillRoundedRect(x, y, btnW, btnH, 4);
      btnBg.lineStyle(1, 0x00c8ff, 0.5);
      btnBg.strokeRoundedRect(x, y, btnW, btnH, 4);
      btnText.setColor('#ccd6f6');
    });

    btnText.on('pointerdown', () => { this.feedNPC(npcId); });
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
    const oldAffinity = npc.affinity;
    const result = npc.changeAffinity(affinityGain);

    // Sync back to gameState
    this.gameState.npcs[npcId].affinity = npc.affinity;

    this.showNotification(`喂了 ${npc.name} ${foodName}，好感 +${affinityGain}`);

    // 好感度达到80时的特殊提示
    if (oldAffinity < 80 && npc.affinity >= 80) {
      this.time.delayedCall(1000, () => {
        this.showNotification(`${npc.name}的好感度达到80！当你生病时，TA会来救你`);
      });
    }

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
    const headerText = this.add.text(scrollW / 2, 8, `背包: ${count}/${cap}`, {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '14px', color: '#8892b0',
    }).setOrigin(0.5, 0);
    contentContainer.add(headerText);

    if (this.gameState.inventory.length === 0) {
      const emptyText = this.add.text(scrollW / 2, 120, '储存空间为空', {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '18px', color: '#4a5568',
      }).setOrigin(0.5);
      contentContainer.add(emptyText);
      this.updateScrollHeight(parentContainer, 200);
      return;
    }

    // Grid: 3 columns for better readability
    const cols = 3;
    const gap = 10;
    const cellW = (scrollW - gap * (cols - 1)) / cols;
    const cellH = 90;
    const gridOffsetY = 30;

    const itemsData = this.cache.json.get('itemsData') || {};
    const typeEmojis = { food: '🍖', material: '🔧', medical: '💊', weapon: '⚔️', special: '⭐' };

    this.gameState.inventory.forEach((invItem, i) => {
      const def = itemsData[invItem.id];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = col * (cellW + gap);
      const cy = gridOffsetY + row * (cellH + gap);

      const itemContainer = this.add.container(cx, cy);
      contentContainer.add(itemContainer);

      // Card background
      const isUsable = def && (def.type === 'food' || def.type === 'medical');
      const cardBg = this.add.graphics();
      cardBg.fillStyle(isUsable ? 0x121830 : 0x12122a, 0.9);
      cardBg.fillRoundedRect(0, 0, cellW, cellH, 6);
      cardBg.lineStyle(1, isUsable ? 0x00c8ff : 0x222244, isUsable ? 0.4 : 0.8);
      cardBg.strokeRoundedRect(0, 0, cellW, cellH, 6);
      itemContainer.add(cardBg);

      const emoji = def ? (typeEmojis[def.type] || '📦') : '📦';
      const itemName = def ? def.name : invItem.id;

      // Emoji + Name + Quantity
      itemContainer.add(this.add.text(8, 6, emoji, { fontSize: '16px' }));
      itemContainer.add(this.add.text(28, 6, itemName, {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '13px',
        color: '#ccd6f6', fontStyle: 'bold',
      }));
      itemContainer.add(this.add.text(cellW - 8, 6, `x${invItem.quantity}`, {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '13px', color: '#00c8ff',
      }).setOrigin(1, 0));

      // Effect info
      let effectStr = '';
      if (def && def.effect) {
        if (def.effect.hp) effectStr = `HP +${def.effect.hp}`;
        if (def.effect.hunger) effectStr = `饱食 +${def.effect.hunger}`;
        if (def.effect.attack) effectStr = `攻击 +${def.effect.attack}`;
        if (def.effect.affinity) effectStr = `好感 +${def.effect.affinity}`;
      }
      if (effectStr) {
        itemContainer.add(this.add.text(8, 28, effectStr, {
          fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '11px', color: '#00ff88',
        }));
      }

      // Description (truncated)
      if (def && def.description) {
        const desc = def.description.length > 30 ? def.description.substring(0, 30) + '...' : def.description;
        itemContainer.add(this.add.text(8, 46, desc, {
          fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '10px', color: '#666688',
          wordWrap: { width: cellW - 16 },
        }));
      }

      // Use button for consumable items
      if (isUsable) {
        this.createItemUseButton(itemContainer, cellW - 50, cellH - 22, invItem, def);
      }

      // Special hint for old_photo
      if (invItem.id === 'old_photo') {
        this.createViewItemButton(itemContainer, cellW - 50, cellH - 22);
      }
    });

    const totalRows = Math.ceil(this.gameState.inventory.length / cols);
    const totalHeight = gridOffsetY + totalRows * (cellH + gap);
    this.updateScrollHeight(parentContainer, totalHeight);
    this.addScrollIndicators(parentContainer);
  }

  createItemUseButton(parentContainer, x, y, invItem, def) {
    const btnW = 44;
    const btnH = 18;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x0a2a2a, 1);
    btnBg.fillRoundedRect(x, y, btnW, btnH, 3);
    btnBg.lineStyle(1, 0x00c8ff, 0.5);
    btnBg.strokeRoundedRect(x, y, btnW, btnH, 3);
    parentContainer.add(btnBg);

    const btnText = this.add.text(x + btnW / 2, y + btnH / 2, '使用', {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '11px', color: '#00c8ff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    parentContainer.add(btnText);

    btnText.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x0a3a3a, 1);
      btnBg.fillRoundedRect(x, y, btnW, btnH, 3);
      btnBg.lineStyle(1, 0x00c8ff, 1);
      btnBg.strokeRoundedRect(x, y, btnW, btnH, 3);
      btnText.setColor('#ffffff');
    });

    btnText.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0x0a2a2a, 1);
      btnBg.fillRoundedRect(x, y, btnW, btnH, 3);
      btnBg.lineStyle(1, 0x00c8ff, 0.5);
      btnBg.strokeRoundedRect(x, y, btnW, btnH, 3);
      btnText.setColor('#00c8ff');
    });

    btnText.on('pointerdown', () => { this.useItemFromInventory(invItem, def); });
  }

  createViewItemButton(parentContainer, x, y) {
    const btnW = 44;
    const btnH = 18;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x1a1a2e, 1);
    btnBg.fillRoundedRect(x, y, btnW, btnH, 3);
    btnBg.lineStyle(1, 0x666688, 0.5);
    btnBg.strokeRoundedRect(x, y, btnW, btnH, 3);
    parentContainer.add(btnBg);

    const btnText = this.add.text(x + btnW / 2, y + btnH / 2, '查看', {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '11px', color: '#8892b0',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    parentContainer.add(btnText);

    btnText.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x16213e, 1);
      btnBg.fillRoundedRect(x, y, btnW, btnH, 3);
      btnBg.lineStyle(1, 0x8892b0, 0.8);
      btnBg.strokeRoundedRect(x, y, btnW, btnH, 3);
      btnText.setColor('#ccd6f6');
    });

    btnText.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0x1a1a2e, 1);
      btnBg.fillRoundedRect(x, y, btnW, btnH, 3);
      btnBg.lineStyle(1, 0x666688, 0.5);
      btnBg.strokeRoundedRect(x, y, btnW, btnH, 3);
      btnText.setColor('#8892b0');
    });

    btnText.on('pointerdown', () => {
      const passedSafeZone = RVUpgrade.isNodeVisited(this.gameState.currentStoryNode, 'safe_zone');
      if (passedSafeZone) {
        this.showNotification('照片背面的字终于看清了——"雪盒，等我回来。"……这是什么意思？');
      } else {
        this.showNotification('照片背面模糊地写着几个字，但现在还看不清……也许到了安全区就能解开了。');
      }
    });
  }

  useItemFromInventory(invItem, def) {
    if (def.effect.hp) {
      const player = this.gameState.player;
      const healed = Math.min(def.effect.hp, player.maxHp - player.hp);
      if (healed <= 0) {
        this.showNotification('HP已满！');
        return;
      }
      player.hp = Math.min(player.maxHp, player.hp + def.effect.hp);
      this.showNotification(`使用 ${def.name}，HP +${healed}`);
    }
    if (def.effect.hunger) {
      this.gameState.player.hunger = Math.min(100, this.gameState.player.hunger + def.effect.hunger);
      this.showNotification(`使用 ${def.name}，饱食 +${def.effect.hunger}`);
    }
    if (def.effect.affinity && def.effect.target) {
      const npcId = def.effect.target;
      if (this.gameState.npcs[npcId] && this.npcInstances[npcId]) {
        const npc = this.npcInstances[npcId];
        const result = npc.changeAffinity(def.effect.affinity);
        this.gameState.npcs[npcId].affinity = npc.affinity;
        this.showNotification(`给 ${npc.name} 使用 ${def.name}，好感 +${def.effect.affinity}`);
      }
    }

    // Consume item
    const idx = this.gameState.inventory.findIndex(i => i.id === invItem.id);
    if (idx !== -1) {
      this.gameState.inventory[idx].quantity -= 1;
      if (this.gameState.inventory[idx].quantity <= 0) {
        this.gameState.inventory.splice(idx, 1);
      }
    }

    SaveLoad.save(this.gameState);
    this.time.delayedCall(600, () => { this.renderTab('inventory'); });
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

    // --- Current RV stats panel ---
    const statsContainer = this.add.container(0, 0);
    contentContainer.add(statsContainer);

    const statsBg = this.add.graphics();
    statsBg.fillStyle(0x12122a, 0.9);
    statsBg.fillRoundedRect(0, 0, scrollW, 50, 6);
    statsBg.lineStyle(1, 0x00c8ff, 0.3);
    statsBg.strokeRoundedRect(0, 0, scrollW, 50, 6);
    statsContainer.add(statsBg);

    const rv = this.gameState.rv;
    const stats = [
      { icon: '🚐', label: '耐久', value: `${rv.durability}/${rv.maxDurability}` },
      { icon: '📦', label: '容量', value: `${rv.capacity}` },
      { icon: '⚡', label: '速度', value: `${rv.speed}` },
      { icon: '🛡️', label: '防御', value: `${rv.defense}` },
      { icon: '💤', label: '舒适', value: `${rv.comfort}` },
    ];

    const statSpacing = scrollW / (stats.length + 1);
    stats.forEach((stat, i) => {
      const sx = statSpacing * (i + 1);
      statsContainer.add(this.add.text(sx, 14, `${stat.icon} ${stat.label}`, {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '11px', color: '#666688',
      }).setOrigin(0.5));
      statsContainer.add(this.add.text(sx, 30, `${stat.value}`, {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '14px', color: '#ccd6f6', fontStyle: 'bold',
      }).setOrigin(0.5));
    });

    // --- Section title ---
    let yPos = 60;
    contentContainer.add(this.add.text(4, yPos, '可升级项目', {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '14px', color: '#8892b0',
    }));
    yPos += 24;

    // --- Upgrades list ---
    const rvUpgrade = new RVUpgrade(this.gameState.rv);
    const upgrades = rvUpgrade.getUpgrades();

    upgrades.forEach(upgrade => {
      const isUnlocked = rvUpgrade.isUpgradeUnlocked(upgrade.id, this.gameState.currentStoryNode);
      const canAfford = isUnlocked && this.canAffordUpgrade(upgrade.cost);

      const upgradeContainer = this.add.container(0, yPos);
      contentContainer.add(upgradeContainer);

      const cardH = 88;
      const cardBg = this.add.graphics();

      if (!isUnlocked) {
        cardBg.fillStyle(0x0a0a18, 0.7);
        cardBg.fillRoundedRect(0, 0, scrollW, cardH, 6);
        cardBg.lineStyle(1, 0x1a1a2e, 0.5);
        cardBg.strokeRoundedRect(0, 0, scrollW, cardH, 6);
      } else {
        cardBg.fillStyle(canAfford ? 0x121830 : 0x12122a, 0.9);
        cardBg.fillRoundedRect(0, 0, scrollW, cardH, 6);
        cardBg.lineStyle(1, canAfford ? 0x00c8ff : 0x222244, canAfford ? 0.6 : 0.8);
        cardBg.strokeRoundedRect(0, 0, scrollW, cardH, 6);
      }
      upgradeContainer.add(cardBg);

      if (!isUnlocked) {
        // Locked state
        upgradeContainer.add(this.add.text(14, 8, `\u{1F512} ${upgrade.name}`, {
          fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '15px',
          color: '#3a3a4a', fontStyle: 'bold',
        }));
        upgradeContainer.add(this.add.text(14, 30, `解锁条件: ${upgrade.unlockHint || '推进剧情'}`, {
          fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '12px', color: '#2a2a3a',
        }));
        upgradeContainer.add(this.add.text(14, 52, upgrade.description, {
          fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '11px', color: '#2a2a3a',
        }));
      } else {
        // Name
        upgradeContainer.add(this.add.text(14, 8, upgrade.name, {
          fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '15px',
          color: canAfford ? '#00c8ff' : '#ccd6f6', fontStyle: 'bold',
        }));

        // Description
        upgradeContainer.add(this.add.text(14, 30, upgrade.description, {
          fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '12px', color: '#8892b0',
          wordWrap: { width: scrollW - 110 },
        }));

        // Cost items
        const itemsData = this.cache.json.get('itemsData') || {};
        const costArr = Object.entries(upgrade.cost).map(([itemId, qty]) => {
          const def = itemsData[itemId];
          const have = this.getItemCount(itemId);
          const color = have >= qty ? '#00ff88' : '#e94560';
          return { text: `${def ? def.name : itemId} ${have}/${qty}`, color };
        });
        const costStr = costArr.map(c => c.text).join('  ');
        const costColor = canAfford ? '#00ff88' : '#e94560';
        upgradeContainer.add(this.add.text(14, 52, `需要: ${costStr}`, {
          fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '11px', color: costColor,
        }));

        // Upgrade button
        this.createUpgradeButton(upgradeContainer, scrollW - 90, 30, upgrade, canAfford);
      }

      yPos += cardH + 8;
    });

    this.updateScrollHeight(parentContainer, yPos);
    this.addScrollIndicators(parentContainer);
  }

  getItemCount(itemId) {
    const inv = this.gameState.inventory.find(i => i.id === itemId);
    return inv ? inv.quantity : 0;
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
    }).setOrigin(0.5).setInteractive({ useHandCursor: canAfford });
    parentContainer.add(btnText);

    if (canAfford) {
      btnText.on('pointerover', () => {
        btnBg.clear();
        btnBg.fillStyle(0x0a3a3a, 1);
        btnBg.fillRoundedRect(x, y, btnW, btnH, 4);
        btnBg.lineStyle(1, 0x00c8ff, 1);
        btnBg.strokeRoundedRect(x, y, btnW, btnH, 4);
        btnText.setColor('#ffffff');
      });

      btnText.on('pointerout', () => {
        btnBg.clear();
        btnBg.fillStyle(0x0a2a2a, 1);
        btnBg.fillRoundedRect(x, y, btnW, btnH, 4);
        btnBg.lineStyle(1, 0x00c8ff, 0.7);
        btnBg.strokeRoundedRect(x, y, btnW, btnH, 4);
        btnText.setColor('#00c8ff');
      });

      btnText.on('pointerdown', () => { this.applyUpgrade(upgrade); });
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
    const rvUpgrade = new RVUpgrade(this.gameState.rv);
    if (!rvUpgrade.isUpgradeUnlocked(upgrade.id, this.gameState.currentStoryNode)) {
      this.showNotification('该升级尚未解锁！');
      return;
    }
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

    // 触发特殊剧情
    this.triggerUpgradeEvent(upgrade.id);
  }

  triggerUpgradeEvent(upgradeId) {
    const specialEventsData = this.cache.json.get('specialEventsData');

    // 立即刷新升级面板
    this.renderTab('upgrades');

    if (!specialEventsData || !specialEventsData.rv_upgrade_events) {
      console.warn('specialEventsData not loaded');
      return;
    }

    const upgradeEvents = specialEventsData.rv_upgrade_events[upgradeId];
    if (!upgradeEvents) {
      console.warn('No upgrade events for:', upgradeId);
      return;
    }

    // 随机选择一个已招募的NPC
    const recruitedNpcs = Object.keys(this.gameState.npcs).filter(
      npcId => this.gameState.npcs[npcId] && this.gameState.npcs[npcId].recruited
    );

    if (recruitedNpcs.length === 0) return;

    const randomNpcId = recruitedNpcs[Math.floor(Math.random() * recruitedNpcs.length)];
    const dialogues = upgradeEvents[randomNpcId];

    if (!dialogues) return;

    // 延迟显示剧情
    this.time.delayedCall(800, () => {
      const dialogueSystem = new Dialogue(this);
      dialogueSystem.show(dialogues, () => {
        // 剧情结束，增加NPC好感度
        if (this.gameState.npcs[randomNpcId]) {
          this.gameState.npcs[randomNpcId].affinity = Math.min(
            100,
            (this.gameState.npcs[randomNpcId].affinity || 50) + 10
          );
          this.showNotification(`${this.getNpcName(randomNpcId)}好感度 +10`);
        }

        SaveLoad.save(this.gameState);
        this.time.delayedCall(800, () => { this.renderTab('upgrades'); });
      });
    });
  }

  getNpcName(npcId) {
    const npcsData = this.cache.json.get('npcsData') || {};
    return npcsData[npcId] ? npcsData[npcId].name : npcId;
  }

  // ============================================================
  //  BACK BUTTON
  // ============================================================
  createBackButton() {
    const { width, height } = this.cameras.main;
    UIHelper.createButton(this, width / 2, height - 35, 160, 36, '返回地图', { fontSize: '15px' }, () => {
      SaveLoad.save(this.gameState);
      this.scene.start('MapScene', { gameState: this.gameState });
    });
  }

  // ============================================================
  //  NOTIFICATION
  // ============================================================
  showNotification(message) {
    UIHelper.showToast(this, message, 'info');
  }
}
