// BattleScene.js - Turn-based battle system with player actions, NPC AI, and zombie behavior
class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
  }

  // ============================================================
  //  INIT
  // ============================================================
  init(data) {
    this.gameState = data.gameState;
    this.battleData = data.battleData || {};
    this.onComplete = data.onComplete || null;
    this.returnScene = data.returnScene || 'MapScene';
    this.storyNode = data.storyNode || null;

    // Battle state
    this.allies = [];
    this.enemies = [];
    this.turnOrder = [];
    this.currentTurnIndex = 0;
    this.isPlayerTurn = false;
    this.battleOver = false;
    this.turnCount = 0;
    this.logMessages = [];
    this.playerDefending = false;
  }

  // ============================================================
  //  CREATE
  // ============================================================
  create() {
    const { width, height } = this.cameras.main;

    // Dark battle background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x1a0a0a, 0x1a0a0a, 1);
    bg.fillRect(0, 0, width, height);

    // Subtle grid
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1a1a3e, 0.1);
    for (let gx = 0; gx < width; gx += 40) grid.lineBetween(gx, 0, gx, height);
    for (let gy = 0; gy < height; gy += 40) grid.lineBetween(0, gy, width, gy);

    // Title
    this.add.text(width / 2, 20, '- 战斗 -', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '24px',
      color: '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Initialize units
    this.initAllies();
    this.initEnemies();

    // Render units
    this.enemyContainer = this.add.container(0, 0);
    this.allyContainer = this.add.container(0, 0);
    this.renderEnemies();
    this.renderAllies();

    // Battle log
    this.renderBattleLog();

    // Action bar (shown during player turn)
    this.actionContainer = this.add.container(0, 0);

    // Start battle
    this.time.delayedCall(500, () => this.startBattle());
  }

  // ============================================================
  //  INIT ALLIES
  // ============================================================
  initAllies() {
    const gs = this.gameState;
    const npcsData = this.cache.json.get('npcsData') || {};

    // Player
    this.allies.push({
      id: 'player',
      name: '你',
      emoji: '🧑',
      hp: gs.player.hp,
      maxHp: gs.player.maxHp,
      attack: gs.player.attack,
      defense: gs.player.defense,
      speed: gs.player.speed,
      isPlayer: true,
      isNPC: false,
      defending: false,
    });

    // Recruited NPCs
    if (gs.npcs) {
      for (const npcId of Object.keys(gs.npcs)) {
        const npcSave = gs.npcs[npcId];
        if (!npcSave || !npcSave.recruited) continue;
        const npcData = npcsData[npcId];
        if (!npcData) continue;

        const npc = new NPC(npcData);
        npc.affinity = npcSave.affinity;
        npc.recruited = npcSave.recruited;
        if (npcSave.stats) npc.stats = npcSave.stats;

        this.allies.push({
          id: npcId,
          name: npc.name,
          emoji: this.getNpcEmoji(npcId),
          hp: npc.stats.hp,
          maxHp: npc.stats.hp,
          attack: npc.stats.attack,
          defense: npc.stats.defense,
          speed: npc.stats.speed,
          isPlayer: false,
          isNPC: true,
          defending: false,
          npcRef: npc,
        });
      }
    }
  }

  getNpcEmoji(npcId) {
    const emojiMap = {
      wangzai: '🐕',
      bingjie: '👩',
      caoge: '💪',
      laojing: '👨‍🏫',
    };
    return emojiMap[npcId] || '👤';
  }

  // ============================================================
  //  INIT ENEMIES
  // ============================================================
  initEnemies() {
    const zombiesData = this.cache.json.get('zombiesData') || {};
    // Support both "enemies" and "zombies" field names, and both "id" and "type"
    const enemyList = this.battleData.enemies || this.battleData.zombies || [];

    for (const entry of enemyList) {
      const zombieId = typeof entry === 'string' ? entry : (entry.id || entry.type);
      const count = entry.count || 1;
      const zombieData = zombiesData[zombieId];
      if (!zombieData) continue;

      for (let i = 0; i < count; i++) {
        const zombie = new Zombie(zombieData);
        const suffix = count > 1 ? `#${i + 1}` : '';
        this.enemies.push({
          id: zombieId + (count > 1 ? '_' + i : ''),
          name: zombie.name + suffix,
          emoji: '🧟',
          hp: zombie.hp,
          maxHp: zombie.maxHp,
          attack: zombie.attack,
          defense: zombie.defense,
          speed: zombie.speed,
          isBoss: zombie.isBoss,
          zombieRef: zombie,
        });
      }
    }
  }

  // ============================================================
  //  RENDER ENEMIES
  // ============================================================
  renderEnemies() {
    this.enemyContainer.removeAll(true);
    const { width } = this.cameras.main;
    const count = this.enemies.filter(e => e.hp > 0).length;
    const spacing = Math.min(160, (width - 80) / Math.max(count, 1));
    const startX = width / 2 - (spacing * (count - 1)) / 2;

    let idx = 0;
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      const x = startX + spacing * idx;
      const y = 100;

      // Emoji
      const emojiText = this.add.text(x, y, enemy.emoji, {
        fontSize: '40px',
      }).setOrigin(0.5);
      this.enemyContainer.add(emojiText);

      // Name
      const nameText = this.add.text(x, y + 30, enemy.name, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '13px',
        color: '#e94560',
      }).setOrigin(0.5);
      this.enemyContainer.add(nameText);

      // HP bar background
      const barW = 70;
      const barH = 6;
      const barBg = this.add.graphics();
      barBg.fillStyle(0x333333, 1);
      barBg.fillRect(x - barW / 2, y + 42, barW, barH);
      this.enemyContainer.add(barBg);

      // HP bar fill
      const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
      const barFill = this.add.graphics();
      barFill.fillStyle(0xe94560, 1);
      barFill.fillRect(x - barW / 2, y + 42, barW * hpRatio, barH);
      this.enemyContainer.add(barFill);

      // HP text
      const hpText = this.add.text(x, y + 56, `${enemy.hp}/${enemy.maxHp}`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '11px',
        color: '#8892b0',
      }).setOrigin(0.5);
      this.enemyContainer.add(hpText);

      // Boss indicator
      if (enemy.isBoss) {
        const bossTag = this.add.text(x, y - 30, '[ BOSS ]', {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '12px',
          color: '#ff6600',
          fontStyle: 'bold',
        }).setOrigin(0.5);
        this.enemyContainer.add(bossTag);
      }

      // Store references for damage display
      enemy._displayX = x;
      enemy._displayY = y;
      enemy._hpBar = barFill;
      enemy._hpText = hpText;
      enemy._barW = barW;

      idx++;
    }
  }

  // ============================================================
  //  RENDER ALLIES
  // ============================================================
  renderAllies() {
    this.allyContainer.removeAll(true);
    const { width } = this.cameras.main;
    const aliveAllies = this.allies.filter(a => a.hp > 0);
    const count = aliveAllies.length;
    const spacing = Math.min(160, (width - 80) / Math.max(count, 1));
    const startX = width / 2 - (spacing * (count - 1)) / 2;

    let idx = 0;
    for (const ally of this.allies) {
      if (ally.hp <= 0) continue;
      const x = startX + spacing * idx;
      const y = 340;

      // Emoji
      const emojiText = this.add.text(x, y, ally.emoji, {
        fontSize: '36px',
      }).setOrigin(0.5);
      this.allyContainer.add(emojiText);

      // Name
      const nameColor = ally.isPlayer ? '#00c8ff' : '#8892b0';
      const nameText = this.add.text(x, y + 28, ally.name, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '13px',
        color: nameColor,
      }).setOrigin(0.5);
      this.allyContainer.add(nameText);

      // HP bar background
      const barW = 70;
      const barH = 6;
      const barBg = this.add.graphics();
      barBg.fillStyle(0x333333, 1);
      barBg.fillRect(x - barW / 2, y + 40, barW, barH);
      this.allyContainer.add(barBg);

      // HP bar fill
      const hpRatio = Math.max(0, ally.hp / ally.maxHp);
      const barColor = ally.isPlayer ? 0x00c8ff : 0x44aa66;
      const barFill = this.add.graphics();
      barFill.fillStyle(barColor, 1);
      barFill.fillRect(x - barW / 2, y + 40, barW * hpRatio, barH);
      this.allyContainer.add(barFill);

      // HP text
      const hpText = this.add.text(x, y + 54, `${ally.hp}/${ally.maxHp}`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '11px',
        color: '#8892b0',
      }).setOrigin(0.5);
      this.allyContainer.add(hpText);

      // Defending indicator
      if (ally.defending) {
        const shieldText = this.add.text(x + 30, y - 10, '🛡️', {
          fontSize: '16px',
        }).setOrigin(0.5);
        this.allyContainer.add(shieldText);
      }

      ally._displayX = x;
      ally._displayY = y;
      ally._hpBar = barFill;
      ally._hpText = hpText;
      ally._barW = barW;

      idx++;
    }
  }

  // ============================================================
  //  BATTLE LOG
  // ============================================================
  renderBattleLog() {
    const { width } = this.cameras.main;
    const logY = 430;
    const logBg = this.add.graphics();
    logBg.fillStyle(0x0d0d1f, 0.9);
    logBg.fillRect(20, logY, width - 40, 90);
    logBg.lineStyle(1, 0x1a1a3e, 0.6);
    logBg.strokeRect(20, logY, width - 40, 90);

    this.logText = this.add.text(30, logY + 8, '战斗开始！', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '12px',
      color: '#8892b0',
      wordWrap: { width: width - 80 },
      lineSpacing: 4,
    });
  }

  addLog(msg) {
    this.logMessages.push(msg);
    if (this.logMessages.length > 5) this.logMessages.shift();
    if (this.logText) {
      this.logText.setText(this.logMessages.join('\n'));
    }
  }

  // ============================================================
  //  START BATTLE
  // ============================================================
  startBattle() {
    this.turnCount = 0;
    this.buildTurnOrder();
    this.processTurn();
  }

  buildTurnOrder() {
    this.turnOrder = [];
    for (const ally of this.allies) {
      if (ally.hp > 0) {
        this.turnOrder.push({ type: 'ally', unit: ally });
      }
    }
    for (const enemy of this.enemies) {
      if (enemy.hp > 0) {
        this.turnOrder.push({ type: 'enemy', unit: enemy });
      }
    }
    // Sort by speed descending
    this.turnOrder.sort((a, b) => b.unit.speed - a.unit.speed);
    this.currentTurnIndex = 0;
  }

  // ============================================================
  //  PROCESS TURN
  // ============================================================
  processTurn() {
    if (this.battleOver) return;

    // Check win/lose
    const aliveAllies = this.allies.filter(a => a.hp > 0);
    const aliveEnemies = this.enemies.filter(e => e.hp > 0);

    if (aliveEnemies.length === 0) {
      this.endBattle(true);
      return;
    }
    if (aliveAllies.length === 0) {
      this.endBattle(false);
      return;
    }

    // Rebuild turn order if we've gone through everyone
    if (this.currentTurnIndex >= this.turnOrder.length) {
      this.turnCount++;
      // Clear defending status at start of new round
      for (const ally of this.allies) ally.defending = false;
      this.buildTurnOrder();
    }

    const current = this.turnOrder[this.currentTurnIndex];
    if (!current) {
      this.buildTurnOrder();
      this.processTurn();
      return;
    }

    const unit = current.unit;

    // Skip dead units
    if (unit.hp <= 0) {
      this.currentTurnIndex++;
      this.processTurn();
      return;
    }

    if (current.type === 'ally') {
      if (unit.isPlayer) {
        this.isPlayerTurn = true;
        this.showActionBar();
      } else {
        // NPC turn
        this.time.delayedCall(400, () => {
          this.npcAction(unit);
        });
      }
    } else {
      // Enemy turn
      this.time.delayedCall(400, () => {
        this.enemyAction(unit);
      });
    }
  }

  advanceTurn() {
    this.currentTurnIndex++;
    this.time.delayedCall(300, () => this.processTurn());
  }

  // ============================================================
  //  ACTION BAR
  // ============================================================
  showActionBar() {
    this.actionContainer.removeAll(true);
    const { width } = this.cameras.main;
    const y = 540;

    const actions = [
      { label: '攻击', callback: () => this.playerAttack() },
      { label: '防御', callback: () => this.playerDefend() },
      { label: '物品', callback: () => this.showItems() },
      { label: '逃跑', callback: () => this.tryEscape() },
    ];

    const btnW = 100;
    const btnH = 36;
    const totalW = actions.length * (btnW + 12) - 12;
    const startX = (width - totalW) / 2;

    actions.forEach((action, i) => {
      const bx = startX + i * (btnW + 12) + btnW / 2;

      const btnBg = this.add.graphics();
      btnBg.fillStyle(0x1a1a2e, 1);
      btnBg.fillRoundedRect(bx - btnW / 2, y - btnH / 2, btnW, btnH, 6);
      btnBg.lineStyle(1, 0x00c8ff, 0.5);
      btnBg.strokeRoundedRect(bx - btnW / 2, y - btnH / 2, btnW, btnH, 6);
      this.actionContainer.add(btnBg);

      const btnText = this.add.text(bx, y, action.label, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '15px',
        color: '#ccd6f6',
      }).setOrigin(0.5);
      this.actionContainer.add(btnText);

      const hitArea = this.add.rectangle(bx, y, btnW, btnH)
        .setInteractive({ useHandCursor: true })
        .setOrigin(0.5)
        .setAlpha(0.001);
      this.actionContainer.add(hitArea);

      hitArea.on('pointerover', () => {
        btnBg.clear();
        btnBg.fillStyle(0x16213e, 1);
        btnBg.fillRoundedRect(bx - btnW / 2, y - btnH / 2, btnW, btnH, 6);
        btnBg.lineStyle(1, 0x00c8ff, 0.9);
        btnBg.strokeRoundedRect(bx - btnW / 2, y - btnH / 2, btnW, btnH, 6);
        btnText.setColor('#00c8ff');
      });

      hitArea.on('pointerout', () => {
        btnBg.clear();
        btnBg.fillStyle(0x1a1a2e, 1);
        btnBg.fillRoundedRect(bx - btnW / 2, y - btnH / 2, btnW, btnH, 6);
        btnBg.lineStyle(1, 0x00c8ff, 0.5);
        btnBg.strokeRoundedRect(bx - btnW / 2, y - btnH / 2, btnW, btnH, 6);
        btnText.setColor('#ccd6f6');
      });

      hitArea.on('pointerdown', () => {
        this.actionContainer.removeAll(true);
        action.callback();
      });
    });
  }

  hideActionBar() {
    this.actionContainer.removeAll(true);
  }

  // ============================================================
  //  PLAYER ATTACK
  // ============================================================
  playerAttack() {
    const player = this.allies.find(a => a.isPlayer);
    if (!player || player.hp <= 0) {
      this.advanceTurn();
      return;
    }

    // Show target selection
    this.showTargetSelection((target) => {
      const damage = this.calculateDamage(player.attack, target.defense);
      const dead = target.takeDamage(damage);

      this.addLog(`你 攻击了 ${target.name}，造成 ${damage} 点伤害！`);
      this.showDamageNumber(target._displayX, target._displayY, damage);
      this.flashUnit(target, 0xe94560);

      this.renderEnemies();
      this.renderAllies();

      if (dead) {
        this.addLog(`${target.name} 被消灭了！`);
        // Remove from turn order
        this.turnOrder = this.turnOrder.filter(t => t.unit !== target);
      }

      this.advanceTurn();
    });
  }

  // ============================================================
  //  TARGET SELECTION
  // ============================================================
  showTargetSelection(onSelect) {
    this.hideActionBar();
    const aliveEnemies = this.enemies.filter(e => e.hp > 0);

    if (aliveEnemies.length === 1) {
      onSelect(aliveEnemies[0]);
      return;
    }

    const { width, height } = this.cameras.main;

    // Hint text
    const hintText = this.add.text(width / 2, height - 30, '点击丧尸选择攻击目标', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#ccd6f6',
    }).setOrigin(0.5);

    const cleanup = () => {
      hintText.destroy();
      for (const item of targetItems) {
        item.destroy();
      }
    };

    const targetItems = [];

    for (const enemy of aliveEnemies) {
      const x = enemy._displayX;
      const y = enemy._displayY;

      // Highlight ring
      const highlight = this.add.graphics();
      highlight.lineStyle(3, 0x00c8ff, 0.9);
      highlight.strokeCircle(x, y, 45);
      this.tweens.add({
        targets: highlight,
        alpha: 0.3,
        duration: 500,
        yoyo: true,
        repeat: -1,
      });
      targetItems.push(highlight);

      // Label
      const label = this.add.text(x, y + 55, '点击攻击', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: '#00c8ff',
        backgroundColor: '#000000',
        padding: { x: 6, y: 2 },
      }).setOrigin(0.5);
      targetItems.push(label);

      // Clickable area - larger, on top of everything
      const hitArea = this.add.rectangle(x, y, 90, 90, 0x00c8ff, 0.001)
        .setInteractive({ useHandCursor: true })
        .setOrigin(0.5)
        .setDepth(1000);

      hitArea.on('pointerover', () => {
        highlight.clear();
        highlight.lineStyle(3, 0xff0000, 1);
        highlight.strokeCircle(x, y, 45);
      });
      hitArea.on('pointerout', () => {
        highlight.clear();
        highlight.lineStyle(3, 0x00c8ff, 0.9);
        highlight.strokeCircle(x, y, 45);
      });

      hitArea.on('pointerdown', (pointer) => {
        pointer.event.stopPropagation();
        cleanup();
        hitArea.destroy();
        onSelect(enemy);
      });

      targetItems.push(hitArea);
    }
  }

  // ============================================================
  //  PLAYER DEFEND
  // ============================================================
  playerDefend() {
    const player = this.allies.find(a => a.isPlayer);
    if (!player) {
      this.advanceTurn();
      return;
    }

    player.defending = true;
    this.playerDefending = true;
    this.addLog('你 举起了防御姿态，伤害减半！');
    this.renderAllies();
    this.advanceTurn();
  }

  // ============================================================
  //  SHOW ITEMS
  // ============================================================
  showItems() {
    const itemsData = this.cache.json.get('itemsData') || {};
    const usableItems = this.gameState.inventory.filter(inv => {
      const def = itemsData[inv.id];
      return def && (def.type === 'medical' || def.type === 'food') && inv.quantity > 0;
    });

    if (usableItems.length === 0) {
      this.addLog('没有可以使用的物品！');
      this.showActionBar();
      return;
    }

    const { width } = this.cameras.main;
    const container = this.add.container(0, 0);

    // Background panel
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0d0d1f, 0.95);
    panelBg.fillRoundedRect(200, 180, width - 400, 240, 8);
    panelBg.lineStyle(1, 0x1a1a3e, 0.8);
    panelBg.strokeRoundedRect(200, 180, width - 400, 240, 8);
    container.add(panelBg);

    const title = this.add.text(width / 2, 200, '使用物品', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#ccd6f6',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(title);

    let yPos = 230;
    for (const invItem of usableItems) {
      const def = itemsData[invItem.id];
      const healAmount = def.effect && def.effect.hp ? def.effect.hp : 0;
      const hungerAmount = def.effect && def.effect.hunger ? def.effect.hunger : 0;
      let effectText = '';
      if (healAmount > 0) effectText = `HP+${healAmount}`;
      if (hungerAmount > 0) effectText = `饱食+${hungerAmount}`;

      const itemBtn = this.add.text(width / 2, yPos, `${def.name} x${invItem.quantity}  (${effectText})`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: '#8892b0',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      container.add(itemBtn);

      itemBtn.on('pointerover', () => itemBtn.setColor('#00c8ff'));
      itemBtn.on('pointerout', () => itemBtn.setColor('#8892b0'));
      itemBtn.on('pointerdown', () => {
        container.destroy();
        this.useItem(invItem, def);
      });

      yPos += 30;
    }

    // Cancel button
    const cancelBtn = this.add.text(width / 2, yPos + 15, '[ 取消 ]', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#e94560',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    container.add(cancelBtn);
    cancelBtn.on('pointerdown', () => {
      container.destroy();
      this.showActionBar();
    });
  }

  useItem(invItem, def) {
    const player = this.allies.find(a => a.isPlayer);
    if (!player) {
      this.advanceTurn();
      return;
    }

    // Apply effect
    if (def.effect.hp) {
      const healed = Math.min(def.effect.hp, player.maxHp - player.hp);
      player.hp = Math.min(player.maxHp, player.hp + def.effect.hp);
      this.addLog(`你使用了 ${def.name}，恢复了 ${healed} 点HP！`);
      this.showDamageNumber(player._displayX, player._displayY, healed, 0x00ff88);
    }
    if (def.effect.hunger) {
      this.gameState.player.hunger = Math.min(100, this.gameState.player.hunger + def.effect.hunger);
      this.addLog(`你使用了 ${def.name}，饱食度+${def.effect.hunger}`);
    }

    // Remove from inventory
    const idx = this.gameState.inventory.findIndex(i => i.id === invItem.id);
    if (idx !== -1) {
      this.gameState.inventory[idx].quantity--;
      if (this.gameState.inventory[idx].quantity <= 0) {
        this.gameState.inventory.splice(idx, 1);
      }
    }

    this.renderAllies();
    this.advanceTurn();
  }

  // ============================================================
  //  TRY ESCAPE
  // ============================================================
  tryEscape() {
    const baseChance = 0.3;
    const rvSpeedBonus = (this.gameState.rv && this.gameState.rv.speed) ? this.gameState.rv.speed * 0.05 : 0;
    const escapeChance = Math.min(0.9, baseChance + rvSpeedBonus);

    if (Math.random() < escapeChance) {
      this.addLog('逃跑成功！你们迅速撤退了。');
      this.battleOver = true;
      this.time.delayedCall(800, () => {
        this.scene.start(this.returnScene, {
          gameState: this.gameState,
          storyNode: this.storyNode,
        });
      });
    } else {
      this.addLog('逃跑失败！丧尸挡住了去路！');
      this.advanceTurn();
    }
  }

  // ============================================================
  //  NPC ACTION
  // ============================================================
  npcAction(ally) {
    if (!ally.npcRef) {
      // No NPC ref, just basic attack
      this.npcBasicAttack(ally);
      return;
    }

    const behavior = ally.npcRef.getCombatAction();
    const aliveEnemies = this.enemies.filter(e => e.hp > 0);
    const aliveAllies = this.allies.filter(a => a.hp > 0);
    const lowestHpAlly = aliveAllies.reduce((min, a) => a.hp < min.hp ? a : min, aliveAllies[0]);

    switch (behavior) {
      case 'aggressive': {
        // Use strongest available skill or attack
        const skills = ally.npcRef.getAvailableSkills();
        const attackSkill = skills.filter(s => s.type === 'attack' || s.type === 'ultimate');
        if (attackSkill.length > 0 && Math.random() < 0.5) {
          const skill = attackSkill[Math.floor(Math.random() * attackSkill.length)];
          if (skill.effect.target === 'all_enemies') {
            // AoE
            for (const enemy of aliveEnemies) {
              const damage = this.calculateDamage(ally.attack + skill.power, enemy.defense);
              const dead = enemy.takeDamage(damage);
              this.showDamageNumber(enemy._displayX, enemy._displayY, damage);
              this.flashUnit(enemy, 0xe94560);
              if (dead) {
                this.addLog(`${ally.name} 使用 ${skill.name} 消灭了 ${enemy.name}！`);
                this.turnOrder = this.turnOrder.filter(t => t.unit !== enemy);
              }
            }
            this.addLog(`${ally.name} 使用了 ${skill.name}！`);
          } else {
            const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
            const damage = this.calculateDamage(ally.attack + skill.power, target.defense);
            const dead = target.takeDamage(damage);
            this.addLog(`${ally.name} 使用 ${skill.name} 攻击 ${target.name}，造成 ${damage} 点伤害！`);
            this.showDamageNumber(target._displayX, target._displayY, damage);
            this.flashUnit(target, 0xe94560);
            if (dead) {
              this.addLog(`${target.name} 被消灭了！`);
              this.turnOrder = this.turnOrder.filter(t => t.unit !== target);
            }
          }
        } else {
          this.npcBasicAttack(ally);
        }
        break;
      }
      case 'normal': {
        // Basic attack with occasional skill
        if (Math.random() < 0.3) {
          const skills = ally.npcRef.getAvailableSkills();
          const healSkill = skills.find(s => s.type === 'heal');
          if (healSkill && lowestHpAlly.hp < lowestHpAlly.maxHp * 0.5) {
            const healAmount = healSkill.effect.heal || 25;
            const healed = Math.min(healAmount, lowestHpAlly.maxHp - lowestHpAlly.hp);
            lowestHpAlly.hp += healed;
            this.addLog(`${ally.name} 使用 ${healSkill.name} 恢复了 ${lowestHpAlly.name} ${healed} 点HP！`);
            this.showDamageNumber(lowestHpAlly._displayX, lowestHpAlly._displayY, healed, 0x00ff88);
            this.renderAllies();
            break;
          }
        }
        this.npcBasicAttack(ally);
        break;
      }
      case 'passive': {
        // Heal or defend
        if (Math.random() < 0.6 && lowestHpAlly.hp < lowestHpAlly.maxHp * 0.6) {
          const skills = ally.npcRef.getAvailableSkills();
          const healSkill = skills.find(s => s.type === 'heal');
          if (healSkill) {
            const healAmount = healSkill.effect.heal || 25;
            const healed = Math.min(healAmount, lowestHpAlly.maxHp - lowestHpAlly.hp);
            lowestHpAlly.hp += healed;
            this.addLog(`${ally.name} 使用 ${healSkill.name} 恢复了 ${lowestHpAlly.name} ${healed} 点HP！`);
            this.showDamageNumber(lowestHpAlly._displayX, lowestHpAlly._displayY, healed, 0x00ff88);
            this.renderAllies();
            break;
          }
        }
        // Defend
        ally.defending = true;
        this.addLog(`${ally.name} 采取了防御姿态。`);
        this.renderAllies();
        break;
      }
      case 'refuse': {
        this.addLog(`${ally.name} 拒绝战斗，呆在原地不动...`);
        break;
      }
      default:
        this.npcBasicAttack(ally);
    }

    this.renderEnemies();
    this.advanceTurn();
  }

  npcBasicAttack(ally) {
    const aliveEnemies = this.enemies.filter(e => e.hp > 0);
    if (aliveEnemies.length === 0) return;

    const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
    const damage = this.calculateDamage(ally.attack, target.defense);
    const dead = target.takeDamage(damage);

    this.addLog(`${ally.name} 攻击了 ${target.name}，造成 ${damage} 点伤害！`);
    this.showDamageNumber(target._displayX, target._displayY, damage);
    this.flashUnit(target, 0xe94560);

    if (dead) {
      this.addLog(`${target.name} 被消灭了！`);
      this.turnOrder = this.turnOrder.filter(t => t.unit !== target);
    }
  }

  // ============================================================
  //  ENEMY ACTION
  // ============================================================
  enemyAction(enemy) {
    if (enemy.hp <= 0) {
      this.advanceTurn();
      return;
    }

    const zombie = enemy.zombieRef;

    // Boss summon check
    if (zombie && zombie.isBoss && zombie.shouldSummon()) {
      const phase = zombie.getCurrentPhase();
      if (phase && phase.summon) {
        const zombiesData = this.cache.json.get('zombiesData') || {};
        const summonData = zombiesData[phase.summon.zombieType];
        if (summonData) {
          const count = phase.summon.count || 1;
          for (let i = 0; i < count; i++) {
            const newZombie = new Zombie(summonData);
            const newEnemy = {
              id: summonData.id + '_' + Date.now() + '_' + i,
              name: summonData.name,
              emoji: '🧟',
              hp: newZombie.hp,
              maxHp: newZombie.maxHp,
              attack: newZombie.attack,
              defense: newZombie.defense,
              speed: newZombie.speed,
              isBoss: false,
              zombieRef: newZombie,
            };
            this.enemies.push(newEnemy);
            this.turnOrder.push({ type: 'enemy', unit: newEnemy });
          }
          this.addLog(`${enemy.name} 召唤了 ${count} 只 ${summonData.name}！`);
          this.renderEnemies();
        }
      }
    }

    // Attack lowest defense ally
    const aliveAllies = this.allies.filter(a => a.hp > 0);
    if (aliveAllies.length === 0) {
      this.advanceTurn();
      return;
    }

    const target = aliveAllies.reduce((min, a) => a.defense < min.defense ? a : min, aliveAllies[0]);
    const damage = this.calculateDamage(enemy.attack, target.defense);
    const finalDamage = target.defending ? Math.floor(damage / 2) : damage;
    target.hp = Math.max(0, target.hp - finalDamage);

    const defendMsg = target.defending ? '（防御减半）' : '';
    this.addLog(`${enemy.name} 攻击了 ${target.name}，造成 ${finalDamage} 点伤害！${defendMsg}`);
    this.showDamageNumber(target._displayX, target._displayY, finalDamage, 0xe94560);
    this.flashUnit(target, 0xe94560);

    if (target.hp <= 0) {
      this.addLog(`${target.name} 倒下了...`);
      if (target.isPlayer) {
        this.addLog('你失去了意识...');
      }
      this.turnOrder = this.turnOrder.filter(t => t.unit !== target);
    }

    // Sync player HP to gameState
    const player = this.allies.find(a => a.isPlayer);
    if (player) {
      this.gameState.player.hp = player.hp;
    }

    this.renderAllies();
    this.advanceTurn();
  }

  // ============================================================
  //  DAMAGE CALCULATION
  // ============================================================
  calculateDamage(atk, def) {
    return Math.max(1, atk - def + Math.floor(Math.random() * 5));
  }

  // ============================================================
  //  VISUAL EFFECTS
  // ============================================================
  showDamageNumber(x, y, amount, color) {
    const colorHex = color || 0xe94560;
    const colorStr = '#' + colorHex.toString(16).padStart(6, '0');
    const text = this.add.text(x, y - 20, `-${amount}`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: colorStr,
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: text,
      alpha: 1,
      y: y - 50,
      duration: 600,
      ease: 'Power2',
      onComplete: () => {
        this.tweens.add({
          targets: text,
          alpha: 0,
          duration: 300,
          onComplete: () => text.destroy(),
        });
      },
    });
  }

  flashUnit(unit, color) {
    // Simple screen shake effect for damage feedback
    this.cameras.main.shake(100, 0.003);
  }

  // ============================================================
  //  END BATTLE
  // ============================================================
  endBattle(won) {
    this.battleOver = true;
    this.hideActionBar();

    if (won) {
      this.addLog('战斗胜利！');
      this.collectDrops();

      // Affinity boost for all NPCs
      if (this.gameState.npcs) {
        for (const npcId of Object.keys(this.gameState.npcs)) {
          if (this.gameState.npcs[npcId] && this.gameState.npcs[npcId].recruited) {
            this.gameState.npcs[npcId].affinity = Math.min(100, (this.gameState.npcs[npcId].affinity || 50) + 5);
          }
        }
      }

      // Sync player HP
      const player = this.allies.find(a => a.isPlayer);
      if (player) {
        this.gameState.player.hp = player.hp;
      }

      SaveLoad.save(this.gameState);

      // Show victory screen
      this.time.delayedCall(1000, () => {
        this.showVictoryScreen();
      });
    } else {
      this.addLog('战斗失败...');
      this.time.delayedCall(1500, () => {
        // Delete save and return to menu
        SaveLoad.deleteSave();
        this.scene.start('MenuScene');
      });
    }
  }

  collectDrops() {
    const itemsData = this.cache.json.get('itemsData') || {};
    const allDrops = [];

    for (const enemy of this.enemies) {
      if (enemy.zombieRef) {
        const drops = enemy.zombieRef.rollDrops();
        for (const itemId of drops) {
          const existing = this.gameState.inventory.find(i => i.id === itemId);
          if (existing) {
            existing.quantity++;
          } else if (this.gameState.inventory.length < this.gameState.rv.capacity) {
            this.gameState.inventory.push({ id: itemId, quantity: 1 });
          }
          const itemDef = itemsData[itemId];
          const itemName = itemDef ? itemDef.name : itemId;
          allDrops.push(itemName);
        }
      }
    }

    if (allDrops.length > 0) {
      this.addLog(`掉落物品: ${allDrops.join(', ')}`);
    }
  }

  showVictoryScreen() {
    const { width, height } = this.cameras.main;
    const container = this.add.container(0, 0);

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, width, height);
    container.add(overlay);

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0d0d1f, 0.95);
    panelBg.fillRoundedRect(width / 2 - 180, height / 2 - 120, 360, 240, 10);
    panelBg.lineStyle(1, 0x00c8ff, 0.5);
    panelBg.strokeRoundedRect(width / 2 - 180, height / 2 - 120, 360, 240, 10);
    container.add(panelBg);

    const victoryText = this.add.text(width / 2, height / 2 - 80, '战斗胜利！', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '28px',
      color: '#00c8ff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(victoryText);

    // Show drops summary
    const itemsData = this.cache.json.get('itemsData') || {};
    const dropNames = [];
    for (const enemy of this.enemies) {
      if (enemy.zombieRef) {
        for (const drop of enemy.zombieRef.drops) {
          const itemDef = itemsData[drop.itemId];
          dropNames.push(itemDef ? itemDef.name : drop.itemId);
        }
      }
    }

    const dropText = this.add.text(width / 2, height / 2 - 30, `获得战利品已放入背包`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#8892b0',
    }).setOrigin(0.5);
    container.add(dropText);

    const affinityText = this.add.text(width / 2, height / 2, '同伴好感度 +5', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#8892b0',
    }).setOrigin(0.5);
    container.add(affinityText);

    // Continue button
    const continueBtn = this.add.text(width / 2, height / 2 + 70, '[ 继续 ]', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#00c8ff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    container.add(continueBtn);

    continueBtn.on('pointerover', () => continueBtn.setColor('#ffffff'));
    continueBtn.on('pointerout', () => continueBtn.setColor('#00c8ff'));
    continueBtn.on('pointerdown', () => {
      container.destroy();
      if (this.onComplete) {
        this.onComplete(this.gameState);
      }
      // Always return to the return scene
      this.scene.start(this.returnScene, {
        gameState: this.gameState,
        storyNode: this.storyNode,
      });
    });
  }
}
