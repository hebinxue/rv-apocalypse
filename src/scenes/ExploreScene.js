// ExploreScene.js - Scene exploration with item searching and random events
class ExploreScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ExploreScene' });

    // Scene display names
    this.sceneNames = {
      apartment: '城市公寓',
      gas_station: '加油站',
      supermarket: '超市',
      hospital: '废弃医院',
      highway: '高速公路',
      safe_zone: '安全区大门',
    };

    // Scene-specific loot tables
    this.lootTables = {
      apartment: ['canned_food', 'bandage', 'cloth', 'old_photo'],
      gas_station: ['water', 'instant_noodles', 'scrap_metal', 'screws'],
      supermarket: ['canned_food', 'water', 'instant_noodles', 'first_aid_kit', 'bat'],
      hospital: ['bandage', 'first_aid_kit', 'wire'],
      highway: ['scrap_metal', 'water'],
      safe_zone: ['canned_food', 'water', 'bandage'],
    };
  }

  init(data) {
    this.gameState = data.gameState;
    this.storyNode = data.storyNode || {};
    this.searchCount = 0;
    this.maxSearches = 3;
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
    for (let gx = 0; gx < width; gx += 40) {
      grid.lineBetween(gx, 0, gx, height);
    }
    for (let gy = 0; gy < height; gy += 40) {
      grid.lineBetween(0, gy, width, gy);
    }

    // --- Scene name ---
    const sceneName = this.sceneNames[this.storyNode.scene] || this.storyNode.sceneName || '未知区域';
    this.add.text(width / 2, 80, sceneName, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '36px',
      color: '#ccd6f6',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 112, '探索中...', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#4a5568',
    }).setOrigin(0.5);

    // --- Status bar ---
    this.renderStatusBar();

    // --- Action buttons ---
    this.createActionButton(width / 2, 220, '搜索物资', () => this.searchForItems());
    this.createActionButton(width / 2, 280, '返回房车', () => this.returnToRV());
    this.createActionButton(width / 2, 340, '存档', () => this.saveGame());

    // --- Search count display ---
    this.searchCountText = this.add.text(width / 2, 400, `搜索次数: ${this.searchCount}/${this.maxSearches}`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#8892b0',
    }).setOrigin(0.5);

    // --- Message area ---
    this.messageText = this.add.text(width / 2, 460, '点击"搜索物资"开始搜刮...', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#4a5568',
      wordWrap: { width: width - 100 },
    }).setOrigin(0.5);

    // --- Play entry dialogues ---
    this.playEntryDialogues();
  }

  // ============================================================
  //  STATUS BAR
  // ============================================================
  renderStatusBar() {
    const { width } = this.cameras.main;
    const gs = this.gameState;
    const y = 12;

    const barBg = this.add.graphics();
    barBg.fillStyle(0x0d0d1f, 0.85);
    barBg.fillRect(0, y - 4, width, 32);
    barBg.lineStyle(1, 0x1a1a3e, 0.6);
    barBg.lineBetween(0, y + 28, width, y + 28);

    const stats = [
      { icon: '🚐', label: '耐久', value: `${gs.rv.durability}/${gs.rv.maxDurability}` },
      { icon: '❤️', label: 'HP', value: `${gs.player.hp}/${gs.player.maxHp}` },
      { icon: '🍖', label: '饱食', value: `${gs.player.hunger}` },
      { icon: '🎒', label: '背包', value: `${gs.inventory.length}/${gs.rv.capacity}` },
      { icon: '📅', label: `第${gs.day}天` },
    ];

    const spacing = width / (stats.length + 1);
    stats.forEach((s, i) => {
      const sx = spacing * (i + 1);
      this.add.text(sx - 24, y + 6, s.icon, {
        fontSize: '14px',
      }).setOrigin(0.5);

      const label = s.label + (s.value ? ` ${s.value}` : '');
      this.add.text(sx + 4, y + 6, label, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: '#8892b0',
      }).setOrigin(0, 0.5);
    });
  }

  // ============================================================
  //  ACTION BUTTONS
  // ============================================================
  createActionButton(x, y, label, callback) {
    const btnWidth = 180;
    const btnHeight = 42;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x1a1a2e, 1);
    btnBg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 6);
    btnBg.lineStyle(1, 0x00c8ff, 0.5);
    btnBg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 6);

    const btnText = this.add.text(x, y, label, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#ccd6f6',
    }).setOrigin(0.5);

    const hitArea = this.add.rectangle(x, y, btnWidth, btnHeight)
      .setInteractive({ useHandCursor: true })
      .setOrigin(0.5)
      .setAlpha(0.001);

    hitArea.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x16213e, 1);
      btnBg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 6);
      btnBg.lineStyle(1, 0x00c8ff, 0.9);
      btnBg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 6);
      btnText.setColor('#00c8ff');
    });

    hitArea.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0x1a1a2e, 1);
      btnBg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 6);
      btnBg.lineStyle(1, 0x00c8ff, 0.5);
      btnBg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 6);
      btnText.setColor('#ccd6f6');
    });

    hitArea.on('pointerdown', callback);
  }

  // ============================================================
  //  ENTRY DIALOGUES
  // ============================================================
  playEntryDialogues() {
    if (this.storyNode.dialogues && this.storyNode.dialogues.length > 0) {
      const dialogueSystem = new Dialogue(this);
      dialogueSystem.show(this.storyNode.dialogues, () => {
        // Dialogues finished, player can now explore
      });
    }
  }

  // ============================================================
  //  NOTIFICATION
  // ============================================================
  showNotification(message) {
    const { width } = this.cameras.main;
    const toast = this.add.text(width / 2, 50, message, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#e94560',
      padding: { x: 16, y: 6 },
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: toast,
      alpha: 1,
      y: 55,
      duration: 300,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: 1500,
      onComplete: () => toast.destroy(),
    });
  }

  // ============================================================
  //  SEARCH FOR ITEMS
  // ============================================================
  searchForItems() {
    if (this.searchCount >= this.maxSearches) {
      this.messageText.setText('这里已经没什么可搜的了...');
      return;
    }

    this.searchCount++;

    const sceneKey = this.storyNode.scene || 'apartment';
    const availableItems = this.getItemsForScene(sceneKey);

    if (availableItems.length === 0) {
      this.messageText.setText('这里什么都没找到。');
      this.updateSearchCount();
      return;
    }

    // Randomly pick an item
    const itemId = availableItems[Math.floor(Math.random() * availableItems.length)];
    const itemsData = this.cache.json.get('itemsData');
    const itemDef = itemsData ? itemsData[itemId] : null;
    const itemName = itemDef ? itemDef.name : itemId;

    // Add to inventory
    if (this.gameState.inventory.length >= this.gameState.rv.capacity) {
      const existing = this.gameState.inventory.find(i => i.id === itemId);
      if (existing) {
        existing.quantity += 1;
        this.messageText.setText(`你找到了: ${itemName} x1`);
        this.showNotification(`获得: ${itemName} x1`);
      } else {
        this.messageText.setText('背包已满，无法拾取更多物品！');
        this.showNotification('背包已满!');
      }
    } else {
      const existing = this.gameState.inventory.find(i => i.id === itemId);
      if (existing) {
        existing.quantity += 1;
      } else {
        this.gameState.inventory.push({ id: itemId, quantity: 1 });
      }
      this.messageText.setText(`你找到了: ${itemName} x1`);
      this.showNotification(`获得: ${itemName} x1`);
    }

    this.updateSearchCount();

    // 30% chance to trigger random event after first search
    if (this.searchCount >= 1 && Math.random() < 0.3) {
      this.triggerRandomEvent();
    }
  }

  // ============================================================
  //  GET ITEMS FOR SCENE
  // ============================================================
  getItemsForScene(scene) {
    return this.lootTables[scene] || ['canned_food', 'water'];
  }

  // ============================================================
  //  UPDATE SEARCH COUNT DISPLAY
  // ============================================================
  updateSearchCount() {
    if (this.searchCountText) {
      this.searchCountText.setText(`搜索次数: ${this.searchCount}/${this.maxSearches}`);
    }
  }

  // ============================================================
  //  TRIGGER RANDOM EVENT
  // ============================================================
  triggerRandomEvent() {
    const eventsData = this.cache.json.get('eventsData');
    if (!eventsData) return;

    const eventIds = Object.keys(eventsData);
    if (eventIds.length === 0) return;

    // Filter events that match current day
    const eligibleEvents = eventIds.filter(id => {
      const event = eventsData[id];
      const cond = event.triggerCondition;
      if (!cond) return true;
      if (cond.minDay && this.gameState.day < cond.minDay) return false;
      if (cond.maxDay && this.gameState.day > cond.maxDay) return false;
      return true;
    });

    if (eligibleEvents.length === 0) return;

    // Pick a random eligible event
    const eventId = eligibleEvents[Math.floor(Math.random() * eligibleEvents.length)];
    const event = eventsData[eventId];

    // Show event dialogue
    const dialogueSystem = new Dialogue(this);
    const dialogues = event.dialogue
      ? [{ speaker: '旁白', text: event.dialogue }]
      : [];

    if (dialogues.length > 0) {
      dialogueSystem.show(dialogues, () => {
        this.showEventChoices(event);
      });
    } else {
      this.showEventChoices(event);
    }
  }

  // ============================================================
  //  SHOW EVENT CHOICES
  // ============================================================
  showEventChoices(event) {
    if (!event.choices || event.choices.length === 0) return;

    const dialogueSystem = new Dialogue(this);
    const choiceList = event.choices.map(c => ({
      text: c.text,
      description: '',
    }));

    dialogueSystem.showChoices(choiceList, (selectedIndex) => {
      const selected = event.choices[selectedIndex];
      this.rollOutcome(selected.outcomes);
    });
  }

  // ============================================================
  //  ROLL OUTCOME
  // ============================================================
  rollOutcome(outcomes) {
    if (!outcomes || outcomes.length === 0) return;

    const roll = Math.random();
    let cumulative = 0;

    for (let i = 0; i < outcomes.length; i++) {
      cumulative += outcomes[i].chance || 0;
      if (roll < cumulative) {
        this.applyOutcome(outcomes[i]);
        return;
      }
    }

    // Fallback to last outcome
    this.applyOutcome(outcomes[outcomes.length - 1]);
  }

  // ============================================================
  //  APPLY OUTCOME
  // ============================================================
  applyOutcome(outcome) {
    const itemsData = this.cache.json.get('itemsData');

    // Show outcome description
    if (outcome.description) {
      this.messageText.setText(outcome.description);
      this.showNotification(outcome.result || '事件结果');
    }

    // Apply rewards
    if (outcome.rewards) {
      outcome.rewards.forEach(reward => {
        if (reward.itemId) {
          const existing = this.gameState.inventory.find(i => i.id === reward.itemId);
          if (existing) {
            existing.quantity += (reward.amount || 1);
          } else if (this.gameState.inventory.length < this.gameState.rv.capacity) {
            this.gameState.inventory.push({ id: reward.itemId, quantity: reward.amount || 1 });
          }
          const itemDef = itemsData ? itemsData[reward.itemId] : null;
          const itemName = itemDef ? itemDef.name : reward.itemId;
          this.showNotification(`获得: ${itemName} x${reward.amount || 1}`);
        }
        if (reward.stat === 'rv_condition') {
          this.gameState.rv.durability = Math.min(
            this.gameState.rv.maxDurability,
            this.gameState.rv.durability + (reward.amount || 0)
          );
        }
      });
    }

    // Apply penalties
    if (outcome.penalties) {
      outcome.penalties.forEach(penalty => {
        if (penalty.resource === 'food') {
          this.gameState.player.hunger = Math.max(0, this.gameState.player.hunger + (penalty.amount || 0));
        }
        if (penalty.resource === 'fuel') {
          // Fuel not tracked separately in current state, skip
        }
      });
    }

    // Apply costs (items consumed)
    if (outcome.costs) {
      outcome.costs.forEach(cost => {
        const idx = this.gameState.inventory.findIndex(i => i.id === cost.itemId);
        if (idx !== -1) {
          this.gameState.inventory[idx].quantity -= (cost.amount || 1);
          if (this.gameState.inventory[idx].quantity <= 0) {
            this.gameState.inventory.splice(idx, 1);
          }
        }
      });
    }

    // Apply morality change
    if (outcome.moralityChange) {
      if (!this.gameState.player.morality) {
        this.gameState.player.morality = 0;
      }
      this.gameState.player.morality += outcome.moralityChange;
    }

    // Handle battle outcomes
    if (outcome.battle) {
      SaveLoad.save(this.gameState);
      this.scene.start('BattleScene', {
        gameState: this.gameState,
        battleData: outcome.battle,
        returnScene: 'ExploreScene',
        storyNode: this.storyNode,
      });
    }
  }

  // ============================================================
  //  RETURN TO RV (back to map)
  // ============================================================
  returnToRV() {
    this.gameState.day = (this.gameState.day || 1) + 1;
    SaveLoad.save(this.gameState);
    this.scene.start('MapScene', { gameState: this.gameState });
  }

  // ============================================================
  //  SAVE GAME
  // ============================================================
  saveGame() {
    SaveLoad.save(this.gameState);
    this.showNotification('存档成功！');
    this.messageText.setText('游戏已保存。');
  }
}
