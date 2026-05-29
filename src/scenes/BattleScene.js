// BattleScene.js - Turn-based battle system with player actions, NPC AI, and zombie behavior
class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data) {
    this.gameState = data.gameState;
    this.battleData = data.battleData || {};
    this.onComplete = data.onComplete || null;
    this.returnScene = data.returnScene || 'MapScene';
    this.storyNode = data.storyNode || null;

    this.allies = [];
    this.enemies = [];
    this.turnOrder = [];
    this.currentTurnIndex = 0;
    this.isPlayerTurn = false;
    this.battleOver = false;
    this.turnCount = 0;
    this.logMessages = [];
    this.playerDefending = false;
    this._awakeningTriggered = false;

    // UI elements to clean up
    this._uiElements = [];
    this._clickHandler = null;
    this._targetClickHandler = null;
  }

  create() {
    const { width, height } = this.cameras.main;

    // --- Battlefield background ---
    const bgKey = SceneBackgrounds.findTexture(this, 'bg_battlefield');
    if (bgKey) {
      const img = this.add.image(width / 2, height / 2, bgKey);
      img.setDisplaySize(width, height);
      img.setDepth(-1);
    } else {
      const bg = this.add.graphics();
      bg.fillGradientStyle(0x1a0a0a, 0x1a0a0a, 0x0a0a1a, 0x0a0a1a, 1);
      bg.fillRect(0, 0, width, height);
      bg.fillStyle(0x111118, 1);
      bg.fillRect(0, height * 0.55, width, height * 0.45);
      bg.lineStyle(1, 0x2a2a33, 0.5);
      bg.lineBetween(0, height * 0.55, width, height * 0.55);
      for (let i = 0; i < 15; i++) {
        bg.fillStyle(0x1a1a22, 0.3 + Math.random() * 0.2);
        bg.fillRect(Math.random() * width, height * 0.55 + Math.random() * height * 0.35, 8 + Math.random() * 15, 3 + Math.random() * 4);
      }
      bg.fillStyle(0xe94560, 0.03);
      bg.fillCircle(width * 0.3, height * 0.4, 200);
      bg.fillStyle(0xe94560, 0.02);
      bg.fillCircle(width * 0.7, height * 0.35, 150);
    }

    // --- Atmospheric particles ---
    SceneParticles.addEmbers(this, width, height);
    SceneParticles.addDust(this, width, height);

    // --- Battle title with accent ---
    const titleBg = this.add.graphics();
    titleBg.fillStyle(0xe94560, 0.15);
    titleBg.fillRoundedRect(width / 2 - 80, 8, 160, 30, 6);
    titleBg.lineStyle(1, 0xe94560, 0.4);
    titleBg.strokeRoundedRect(width / 2 - 80, 8, 160, 30, 6);

    this.add.text(width / 2, 23, '⚔️ 战斗', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px', color: '#e94560', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.initAllies();
    this.initEnemies();

    this.enemyContainer = this.add.container(0, 0);
    this.allyContainer = this.add.container(0, 0);
    this.renderEnemies();
    this.renderAllies();
    this.renderBattleLog();

    // Boss战：用boss音效当战斗BGM循环播放
    const hasBoss = this.enemies.some(e => e.isBoss);
    if (hasBoss) {
      SoundManager.stopBGM();
      SoundManager.playBGM(this, 'sfx_boss_intro');
    } else {
      SoundManager.playBGM(this, 'bgm_battle');
    }

    // Fade in
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.time.delayedCall(500, () => this.startBattle());
  }

  // ============================================================
  //  INIT ALLIES
  // ============================================================
  initAllies() {
    const gs = this.gameState;
    const npcsData = this.cache.json.get('npcsData') || {};

    this.allies.push({
      id: 'player', name: '你', emoji: '🧑',
      hp: gs.player.hp, maxHp: gs.player.maxHp,
      attack: gs.player.attack, defense: gs.player.defense,
      speed: gs.player.speed, isPlayer: true, isNPC: false, defending: false,
    });

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
          id: npcId, name: npc.name, emoji: this.getNpcEmoji(npcId),
          hp: npc.stats.hp, maxHp: npc.stats.hp,
          attack: npc.stats.attack, defense: npc.stats.defense,
          speed: npc.stats.speed, isPlayer: false, isNPC: true,
          defending: false, npcRef: npc,
        });
      }
    }
  }

  getNpcEmoji(npcId) {
    const m = { wangzai: '👦', bingjie: '👩', caoge: '💪', laojing: '👨‍🏫' };
    return m[npcId] || '👤';
  }

  // ============================================================
  //  INIT ENEMIES
  // ============================================================
  initEnemies() {
    const zombiesData = this.cache.json.get('zombiesData') || {};
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
          name: zombie.name + suffix, emoji: zombie.isBoss ? '👹' : '🧟',
          hp: zombie.hp, maxHp: zombie.maxHp,
          attack: zombie.attack, defense: zombie.defense,
          speed: zombie.speed, isBoss: zombie.isBoss,
          isInvincible: zombie.isInvincible || false,
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

      // Boss立绘显示
      if (enemy.isBoss) {
        const bossKey = SceneBackgrounds.findTexture(this, 'char_boss');
        if (bossKey) {
          const bossImg = this.add.image(x, y, bossKey);
          bossImg.setDisplaySize(120, 120);
          bossImg.setOrigin(0.5);
          this.enemyContainer.add(bossImg);
        } else {
          // Fallback to emoji
          const emojiBg = this.add.graphics();
          emojiBg.fillStyle(0x330000, 0.4);
          emojiBg.fillCircle(x, y, 28);
          emojiBg.lineStyle(1.5, 0xe94560, 0.3);
          emojiBg.strokeCircle(x, y, 28);
          this.enemyContainer.add(emojiBg);

          const emojiText = this.add.text(x, y, enemy.emoji, { fontSize: '36px' }).setOrigin(0.5);
          this.enemyContainer.add(emojiText);
        }
      } else {
        // 普通敌人：优先使用立绘，fallback到emoji
        const zombieKey = SceneBackgrounds.findTexture(this, 'char_sangshi');
        if (zombieKey) {
          const zombieImg = this.add.image(x, y, zombieKey);
          zombieImg.setDisplaySize(70, 70);
          zombieImg.setOrigin(0.5);
          this.enemyContainer.add(zombieImg);
        } else {
          const emojiBg = this.add.graphics();
          emojiBg.fillStyle(0x330000, 0.4);
          emojiBg.fillCircle(x, y, 28);
          emojiBg.lineStyle(1.5, 0xe94560, 0.3);
          emojiBg.strokeCircle(x, y, 28);
          this.enemyContainer.add(emojiBg);

          const emojiText = this.add.text(x, y, enemy.emoji, { fontSize: '36px' }).setOrigin(0.5);
          this.enemyContainer.add(emojiText);
        }
      }

      // 根据立绘大小调整名字和血条位置
      const portraitH = enemy.isBoss ? 120 : 70;
      const nameText = this.add.text(x, y + portraitH / 2 + 6, enemy.name, {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '12px', color: '#e94560',
      }).setOrigin(0.5);
      this.enemyContainer.add(nameText);

      // HP bar with rounded corners
      const barW = 72, barH = 7;
      const barY = y + portraitH / 2 + 20;
      const barBg = this.add.graphics();
      barBg.fillStyle(0x1a1a22, 1);
      barBg.fillRoundedRect(x - barW / 2, barY, barW, barH, 3);
      barBg.lineStyle(1, 0x2a2a33, 0.5);
      barBg.strokeRoundedRect(x - barW / 2, barY, barW, barH, 3);
      this.enemyContainer.add(barBg);

      const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
      const barColor = hpRatio > 0.5 ? 0xe94560 : hpRatio > 0.25 ? 0xff8800 : 0xff0000;
      const barFill = this.add.graphics();
      if (hpRatio > 0) {
        barFill.fillStyle(barColor, 0.9);
        barFill.fillRoundedRect(x - barW / 2, barY, barW * hpRatio, barH, 3);
      }
      this.enemyContainer.add(barFill);

      const hpText = this.add.text(x, barY + 12, `${enemy.hp}/${enemy.maxHp}`, {
        fontFamily: 'Consolas, monospace', fontSize: '10px', color: '#667788',
      }).setOrigin(0.5);
      this.enemyContainer.add(hpText);

      if (enemy.isBoss) {
        const bossTag = this.add.text(x, y - portraitH / 2 - 8, '💀 BOSS', {
          fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '11px',
          color: '#ff6600', fontStyle: 'bold',
        }).setOrigin(0.5);
        this.enemyContainer.add(bossTag);
      }

      enemy._displayX = x;
      enemy._displayY = y;
      idx++;
    }
  }

  // ============================================================
  //  RENDER ALLIES
  // ============================================================
  renderAllies() {
    this.allyContainer.removeAll(true);
    const { width } = this.cameras.main;
    const count = this.allies.filter(a => a.hp > 0).length;
    const spacing = Math.min(160, (width - 80) / Math.max(count, 1));
    const startX = width / 2 - (spacing * (count - 1)) / 2;
    let idx = 0;
    for (const ally of this.allies) {
      if (ally.hp <= 0) continue;
      const x = startX + spacing * idx;
      const y = 340;

      const barColorHex = ally.isPlayer ? 0x00c8ff : 0x44aa66;

      // 立绘显示
      const portraitKey = SceneBackgrounds.findTexture(this, `char_${ally.id}`);
      if (portraitKey) {
        const portrait = this.add.image(x, y, portraitKey);
        portrait.setDisplaySize(60, 60);
        portrait.setOrigin(0.5);
        this.allyContainer.add(portrait);
      } else {
        const emojiBg = this.add.graphics();
        emojiBg.fillStyle(ally.isPlayer ? 0x002233 : 0x002211, 0.4);
        emojiBg.fillCircle(x, y, 25);
        emojiBg.lineStyle(1.5, barColorHex, 0.3);
        emojiBg.strokeCircle(x, y, 25);
        this.allyContainer.add(emojiBg);

        const emojiText = this.add.text(x, y, ally.emoji, { fontSize: '32px' }).setOrigin(0.5);
        this.allyContainer.add(emojiText);
      }

      const nameText = this.add.text(x, y + 35, ally.name, {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '12px',
        color: ally.isPlayer ? '#00c8ff' : '#77aa88',
      }).setOrigin(0.5);
      this.allyContainer.add(nameText);

      // HP bar
      const barW = 72, barH = 7;
      const barY = y + 49;
      const barBg = this.add.graphics();
      barBg.fillStyle(0x1a1a22, 1);
      barBg.fillRoundedRect(x - barW / 2, barY, barW, barH, 3);
      barBg.lineStyle(1, 0x2a2a33, 0.5);
      barBg.strokeRoundedRect(x - barW / 2, barY, barW, barH, 3);
      this.allyContainer.add(barBg);

      const hpRatio = Math.max(0, ally.hp / ally.maxHp);
      const barFill = this.add.graphics();
      if (hpRatio > 0) {
        barFill.fillStyle(barColorHex, 0.9);
        barFill.fillRoundedRect(x - barW / 2, barY, barW * hpRatio, barH, 3);
      }
      this.allyContainer.add(barFill);

      const hpText = this.add.text(x, barY + 12, `${ally.hp}/${ally.maxHp}`, {
        fontFamily: 'Consolas, monospace', fontSize: '10px', color: '#667788',
      }).setOrigin(0.5);
      this.allyContainer.add(hpText);

      if (ally.defending) {
        const shieldText = this.add.text(x + 28, y - 25, '🛡️', { fontSize: '16px' }).setOrigin(0.5);
        this.allyContainer.add(shieldText);
      }

      ally._displayX = x;
      ally._displayY = y;
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
    logBg.fillStyle(0x0a0a15, 0.85);
    logBg.fillRoundedRect(20, logY, width - 40, 90, 8);
    logBg.lineStyle(1, 0x222244, 0.5);
    logBg.strokeRoundedRect(20, logY, width - 40, 90, 8);
    // Left accent
    logBg.fillStyle(0xe94560, 0.4);
    logBg.fillRoundedRect(22, logY + 8, 3, 74, 2);
    this.logText = this.add.text(35, logY + 10, '战斗开始！', {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '12px',
      color: '#7788aa', wordWrap: { width: width - 90 }, lineSpacing: 5,
    });
  }

  addLog(msg) {
    this.logMessages.push(msg);
    if (this.logMessages.length > 5) this.logMessages.shift();
    if (this.logText) this.logText.setText(this.logMessages.join('\n'));
  }

  // ============================================================
  //  BATTLE FLOW
  // ============================================================
  startBattle() {
    this.turnCount = 0;
    this._npcsActedThisRound = new Set();
    this._comboTriggered = false;
    this.buildTurnOrder();
    this.processTurn();
  }

  buildTurnOrder() {
    // Check for combo attacks before new round
    this.checkComboAttack();
    this._npcsActedThisRound = new Set();
    this._comboTriggered = false;

    this.turnOrder = [];
    for (const ally of this.allies) {
      if (ally.hp > 0) this.turnOrder.push({ type: 'ally', unit: ally });
    }
    for (const enemy of this.enemies) {
      if (enemy.hp > 0) this.turnOrder.push({ type: 'enemy', unit: enemy });
    }
    this.turnOrder.sort((a, b) => b.unit.speed - a.unit.speed);
    this.currentTurnIndex = 0;
  }

  checkComboAttack() {
    if (this._comboTriggered) return;
    if (this._npcsActedThisRound.size < 2) return;

    // Define combo pairs
    const combos = [
      { partners: ['caoge', 'bingjie'], name: '冰火合击', power: 60, desc: '草哥和冰姐默契配合，冰与火的碰撞！' },
      { partners: ['player', 'wangzai'], name: '搭档连击', power: 45, desc: '你和旺仔默契十足，连续攻击！' },
      { partners: ['wangzai', 'laojing'], name: '智慧守护', power: 40, desc: '旺仔和老晶心意相通，攻守兼备！' },
      { partners: ['player', 'caoge'], name: '热血冲锋', power: 50, desc: '你和草哥并肩冲锋，势不可挡！' },
      { partners: ['player', 'bingjie'], name: '精准打击', power: 55, desc: '冰姐冷酷指引，你精准出击！' },
    ];

    const npcsActed = Array.from(this._npcsActedThisRound);
    for (const combo of combos) {
      if (combo.partners.every(p => npcsActed.includes(p))) {
        const aliveEnemies = this.enemies.filter(e => e.hp > 0);
        if (aliveEnemies.length === 0) break;

        this._comboTriggered = true;
        const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
        const damage = this.calculateDamage(combo.power, target.defense);
        target.hp = Math.max(0, target.hp - damage);
        if (target.hp <= 0 && target.isBoss && target.isInvincible && !this._awakeningTriggered) {
          target.hp = 1;
        }

        this.addLog(`【${combo.name}】${combo.desc}`);
        this.addLog(`合击对 ${target.name} 造成 ${damage} 点额外伤害！`);
        this.showDamageNumber(target._displayX, target._displayY, damage, 0xffd700);

        if (target.hp <= 0) {
          this.addLog(`${target.name} 被消灭了！`);
        }
        this.renderEnemies();
        break;
      }
    }
  }

  processTurn() {
    if (this.battleOver) return;

    // 玩家死亡立即结束
    const player = this.allies.find(a => a.isPlayer);
    if (player && player.hp <= 0) {
      this.gameState.player.hp = 0;
      this.endBattle(false);
      return;
    }

    // 检查boss清醒条件
    if (this.checkBossAwakening()) {
      return;
    }

    const aliveAllies = this.allies.filter(a => a.hp > 0);
    const aliveEnemies = this.enemies.filter(e => e.hp > 0);

    if (aliveEnemies.length === 0) { this.endBattle(true); return; }
    if (aliveAllies.length === 0) { this.endBattle(false); return; }

    if (this.currentTurnIndex >= this.turnOrder.length) {
      this.turnCount++;
      for (const ally of this.allies) ally.defending = false;
      this.buildTurnOrder();
    }

    const current = this.turnOrder[this.currentTurnIndex];
    if (!current) { this.buildTurnOrder(); this.processTurn(); return; }

    const unit = current.unit;
    if (unit.hp <= 0) { this.currentTurnIndex++; this.processTurn(); return; }

    if (current.type === 'ally') {
      if (unit.isPlayer) {
        this.isPlayerTurn = true;
        this.showActionBar();
      } else {
        this.time.delayedCall(400, () => this.npcAction(unit));
      }
    } else {
      this.time.delayedCall(400, () => this.enemyAction(unit));
    }
  }

  advanceTurn() {
    // 玩家死亡立即结束
    const player = this.allies.find(a => a.isPlayer);
    if (player && player.hp <= 0) {
      this.gameState.player.hp = 0;
      this.endBattle(false);
      return;
    }
    this.currentTurnIndex++;
    this.time.delayedCall(300, () => this.processTurn());
  }

  // ============================================================
  //  ACTION BAR — dual: scene-level + direct interactive
  // ============================================================
  showActionBar() {
    this.clearUI();
    const { width } = this.cameras.main;
    const y = 545;
    const btnW = 90, btnH = 36, gap = 8;
    const actions = [
      { label: '攻击', callback: () => this.playerAttack() },
      { label: '防御', callback: () => this.playerDefend() },
      { label: '物品', callback: () => this.showItems() },
      { label: '逃跑', callback: () => this.tryEscape() },
      { label: '自动战斗', callback: () => this.autoBattle() },
    ];
    const totalW = actions.length * btnW + (actions.length - 1) * gap;
    const startX = (width - totalW) / 2;

    // Background bar with depth
    const barBg = UIHelper.drawPanel(this, startX - 10, y - btnH / 2 - 6, totalW + 20, btnH + 12, {
      fillColor: UIHelper.COLORS.panelBg, fillAlpha: 0.95,
      radius: 8, shadowOffset: 2,
    });
    barBg.setDepth(100);
    this._uiElements.push(barBg);

    actions.forEach((action, i) => {
      const bx = startX + i * (btnW + gap);
      const btnContainer = this.add.container(bx + btnW / 2, y);
      btnContainer.setDepth(102);

      const glow = this.add.graphics();
      btnContainer.add(glow);

      const bg = this.add.graphics();
      bg.fillStyle(UIHelper.COLORS.cardBg, 1);
      bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
      bg.lineStyle(1, UIHelper.COLORS.info, 0.4);
      bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
      btnContainer.add(bg);

      const txt = this.add.text(0, 0, action.label, {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '14px', color: UIHelper.COLORS.textPrimary,
      }).setOrigin(0.5);
      btnContainer.add(txt);

      const hitArea = this.add.rectangle(0, 0, btnW, btnH, 0x000000, 0.001)
        .setInteractive({ useHandCursor: true });
      btnContainer.add(hitArea);
      this._uiElements.push(btnContainer);

      hitArea.on('pointerover', () => {
        glow.clear();
        glow.fillStyle(UIHelper.COLORS.info, 0.06);
        glow.fillRoundedRect(-btnW / 2 - 3, -btnH / 2 - 3, btnW + 6, btnH + 6, 8);
        bg.clear();
        bg.fillStyle(0x16213e, 1);
        bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
        bg.lineStyle(1, UIHelper.COLORS.info, 0.8);
        bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
        txt.setColor('#38bdf8');
        btnContainer.setScale(1.03);
      });
      hitArea.on('pointerout', () => {
        glow.clear();
        bg.clear();
        bg.fillStyle(UIHelper.COLORS.cardBg, 1);
        bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
        bg.lineStyle(1, UIHelper.COLORS.info, 0.4);
        bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
        txt.setColor(UIHelper.COLORS.textPrimary);
        btnContainer.setScale(1);
      });
      hitArea.on('pointerdown', () => {
        btnContainer.setScale(0.95);
        this.time.delayedCall(80, () => {
          this.clearUI();
          action.callback();
        });
      });
    });
  }

  clearUI() {
    if (this._clickHandler) {
      this.input.off('pointerdown', this._clickHandler);
      this._clickHandler = null;
    }
    if (this._targetClickHandler) {
      this.input.off('pointerdown', this._targetClickHandler);
      this._targetClickHandler = null;
    }
    for (const el of this._uiElements) {
      if (el && el.destroy) el.destroy();
    }
    this._uiElements = [];
  }

  // ============================================================
  //  PLAYER ATTACK
  // ============================================================
  playerAttack() {
    const player = this.allies.find(a => a.isPlayer);
    if (!player || player.hp <= 0) { this.advanceTurn(); return; }
    const aliveEnemies = this.enemies.filter(e => e.hp > 0);
    if (aliveEnemies.length === 0) { this.advanceTurn(); return; }
    this._npcsActedThisRound.add('player');
    this.showTargetSelection((target) => {
      const damage = this.calculateDamage(player.attack, target.defense);
      target.hp = Math.max(0, target.hp - damage);

      // 检查boss是否应该被杀死（不可战胜的boss在清醒前不会死）
      if (target.hp <= 0 && target.isBoss && target.zombieRef && target.zombieRef.isInvincible && !this._awakeningTriggered) {
        target.hp = 1;
        this.addLog(`你 攻击了 ${target.name}，造成 ${damage} 点伤害！`);
        this.addLog(`${target.name} 似乎无法被杀死...`);
      } else {
        const dead = target.hp <= 0;
        this.addLog(`你 攻击了 ${target.name}，造成 ${damage} 点伤害！`);
        if (dead) {
          this.addLog(`${target.name} 被消灭了！`);
        }
      }

      this.showSlashEffect(target._displayX, target._displayY, 0x00c8ff);
      this.showDamageNumber(target._displayX, target._displayY, damage);
      this.flashUnit();
      this.renderEnemies();
      this.renderAllies();

      // Immediate victory check — don't wait for turn system
      if (this.enemies.filter(e => e.hp > 0).length === 0) {
        this.time.delayedCall(400, () => this.endBattle(true));
        return;
      }
      this.advanceTurn();
    });
  }

  // ============================================================
  //  TARGET SELECTION — scene-level click detection
  // ============================================================
  showTargetSelection(onSelect) {
    this.clearUI();
    const aliveEnemies = this.enemies.filter(e => e.hp > 0);

    if (aliveEnemies.length === 0) { this.advanceTurn(); return; }
    if (aliveEnemies.length === 1) {
      onSelect(aliveEnemies[0]);
      return;
    }

    const { width, height } = this.cameras.main;

    const hintText = this.add.text(width / 2, height - 30, '点击丧尸选择攻击目标', {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '14px', color: '#ccd6f6',
    }).setOrigin(0.5).setDepth(100);
    this._uiElements.push(hintText);

    for (const enemy of aliveEnemies) {
      const x = enemy._displayX, y = enemy._displayY;

      const highlight = this.add.graphics();
      highlight.setDepth(100);
      highlight.lineStyle(3, 0x00c8ff, 0.9);
      highlight.strokeCircle(x, y, 45);
      this.tweens.add({ targets: highlight, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
      this._uiElements.push(highlight);

      const label = this.add.text(x, y + 55, '[ 点击攻击 ]', {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '13px', color: '#00c8ff',
      }).setOrigin(0.5).setDepth(100);
      this._uiElements.push(label);

      // Direct interactive hit area
      const hitArea = this.add.circle(x, y, 50, 0x000000, 0.001)
        .setDepth(101).setInteractive({ useHandCursor: true });
      this._uiElements.push(hitArea);

      hitArea.on('pointerdown', () => {
        this.clearUI();
        onSelect(enemy);
      });
    }
  }

  // ============================================================
  //  PLAYER DEFEND
  // ============================================================
  playerDefend() {
    const player = this.allies.find(a => a.isPlayer);
    if (!player) { this.advanceTurn(); return; }
    this._npcsActedThisRound.add('player');
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
    this.clearUI();
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

    const panelBg = this.add.graphics();
    panelBg.setDepth(100);
    panelBg.fillStyle(0x0d0d1f, 0.95);
    panelBg.fillRoundedRect(200, 180, width - 400, 240, 8);
    panelBg.lineStyle(1, 0x1a1a3e, 0.8);
    panelBg.strokeRoundedRect(200, 180, width - 400, 240, 8);
    this._uiElements.push(panelBg);

    const title = this.add.text(width / 2, 200, '使用物品', {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '16px',
      color: '#ccd6f6', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(101);
    this._uiElements.push(title);

    let yPos = 230;
    for (const invItem of usableItems) {
      const def = itemsData[invItem.id];
      const healAmount = def.effect && def.effect.hp ? def.effect.hp : 0;
      const hungerAmount = def.effect && def.effect.hunger ? def.effect.hunger : 0;
      let effectText = '';
      if (healAmount > 0) effectText = `HP+${healAmount}`;
      if (hungerAmount > 0) effectText = `饱食+${hungerAmount}`;

      const itemBtn = this.add.text(width / 2, yPos, `${def.name} x${invItem.quantity}  (${effectText})`, {
        fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '14px', color: '#8892b0',
      }).setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: true });
      this._uiElements.push(itemBtn);

      itemBtn.on('pointerover', () => itemBtn.setColor('#00c8ff'));
      itemBtn.on('pointerout', () => itemBtn.setColor('#8892b0'));
      itemBtn.on('pointerdown', () => {
        this.clearUI();
        this.useItem(invItem, def);
      });

      yPos += 30;
    }

    // Cancel button
    const cancelBtn = this.add.text(width / 2, yPos + 15, '[ 取消 ]', {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '14px', color: '#e94560',
    }).setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: true });
    this._uiElements.push(cancelBtn);

    cancelBtn.on('pointerdown', () => {
      this.clearUI();
      this.showActionBar();
    });
  }

  useItem(invItem, def) {
    const player = this.allies.find(a => a.isPlayer);
    if (!player) { this.advanceTurn(); return; }
    this._npcsActedThisRound.add('player');
    SoundManager.playSFX(this, 'sfx_heal');

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

    const idx = this.gameState.inventory.findIndex(i => i.id === invItem.id);
    if (idx !== -1) {
      this.gameState.inventory[idx].quantity--;
      if (this.gameState.inventory[idx].quantity <= 0) this.gameState.inventory.splice(idx, 1);
    }

    this.renderAllies();
    this.advanceTurn();
  }

  // ============================================================
  //  TRY ESCAPE
  // ============================================================
  tryEscape() {
    const baseChance = 0.15;
    const rvSpeedBonus = (this.gameState.rv && this.gameState.rv.speed) ? this.gameState.rv.speed * 0.03 : 0;
    const escapeChance = Math.min(0.6, baseChance + rvSpeedBonus);

    if (Math.random() < escapeChance) {
      this.addLog('逃跑成功！你们迅速撤退了。');
      this.battleOver = true;
      if (this.onComplete) this.onComplete(this.gameState);
      SaveLoad.save(this.gameState);
      this.time.delayedCall(800, () => {
        this.scene.start(this.returnScene, { gameState: this.gameState });
      });
    } else {
      this.addLog('逃跑失败！丧尸挡住了去路！');
      this.advanceTurn();
    }
  }

  // ============================================================
  //  AUTO BATTLE — instant resolution
  // ============================================================
  autoBattle() {
    this.clearUI();
    this.addLog('自动战斗中...');

    let rounds = 0;
    const maxRounds = 100;

    // Define combos for auto-battle
    const combos = [
      { partners: ['caoge', 'bingjie'], name: '冰火合击', power: 60 },
      { partners: ['player', 'wangzai'], name: '搭档连击', power: 45 },
      { partners: ['wangzai', 'laojing'], name: '智慧守护', power: 40 },
      { partners: ['player', 'caoge'], name: '热血冲锋', power: 50 },
      { partners: ['player', 'bingjie'], name: '精准打击', power: 55 },
    ];

    while (rounds < maxRounds) {
      const aliveAllies = this.allies.filter(a => a.hp > 0);
      const aliveEnemies = this.enemies.filter(e => e.hp > 0);
      if (aliveEnemies.length === 0 || aliveAllies.length === 0) break;

      // 检查boss清醒条件
      const player = this.allies.find(a => a.isPlayer);
      if (player && player.hp > 0) {
        const boss = this.enemies.find(e => e.isBoss && e.hp > 0 && e.zombieRef);
        if (boss && boss.zombieRef && boss.zombieRef.awakening) {
          if (player.hp <= 10) {
            // 触发boss清醒，停止自动战斗
            this._awakeningTriggered = true;
            this.addLog(`${boss.name} 突然停止了攻击...`);
            // 退出自动战斗，触发清醒对话
            this.time.delayedCall(500, () => {
              this.triggerBossAwakening(boss, boss.zombieRef.awakening);
            });
            return;
          }
        }
      }

      // All allies attack random enemies (re-filter each iteration)
      for (const ally of aliveAllies) {
        const enemies = this.enemies.filter(e => e.hp > 0);
        if (enemies.length === 0) break;
        const target = enemies[Math.floor(Math.random() * enemies.length)];
        // NPCs use skills with 50% chance
        let damage;
        if (ally.npcRef && Math.random() < 0.5) {
          const skills = ally.npcRef.getAvailableSkills();
          const attackSkill = skills.find(s => s.type === 'attack' || s.type === 'ultimate');
          if (attackSkill) {
            damage = this.calculateDamage(ally.attack + attackSkill.power, target.defense);
            if (attackSkill.effect.target === 'all_enemies') {
              for (const e of this.enemies.filter(e => e.hp > 0)) {
                const d = this.calculateDamage(ally.attack + attackSkill.power, e.defense);
                e.hp = Math.max(0, e.hp - d);
                if (e.hp <= 0 && e.isBoss && e.isInvincible && !this._awakeningTriggered) {
                  e.hp = 1;
                }
              }
              continue;
            }
          } else {
            damage = this.calculateDamage(ally.attack, target.defense);
          }
        } else {
          damage = this.calculateDamage(ally.attack, target.defense);
        }
        target.hp = Math.max(0, target.hp - damage);

        // 检查boss是否应该被杀死（不可战胜的boss在清醒前不会死）
        if (target.hp <= 0 && target.isBoss && target.isInvincible && !this._awakeningTriggered) {
          target.hp = 1;
        }

        if (target.hp <= 0) {
          this.turnOrder = this.turnOrder.filter(t => t.unit !== target);
        }
      }

      // Check combo attacks
      const actedIds = aliveAllies.map(a => a.id);
      for (const combo of combos) {
        if (combo.partners.every(p => actedIds.includes(p))) {
          const enemies = this.enemies.filter(e => e.hp > 0);
          if (enemies.length === 0) break;
          const target = enemies[Math.floor(Math.random() * enemies.length)];
          const damage = this.calculateDamage(combo.power, target.defense);
          target.hp = Math.max(0, target.hp - damage);
          this.addLog(`【${combo.name}】额外造成 ${damage} 点伤害！`);

          // 检查boss是否应该被杀死
          if (target.hp <= 0 && target.isBoss && target.isInvincible && !this._awakeningTriggered) {
            target.hp = 1;
          }

          if (target.hp <= 0) {
            this.turnOrder = this.turnOrder.filter(t => t.unit !== target);
          }
          break; // Only one combo per round
        }
      }

      // All enemies attack (re-filter allies each iteration)
      const enemiesAlive = this.enemies.filter(e => e.hp > 0);
      for (const enemy of enemiesAlive) {
        const allies = this.allies.filter(a => a.hp > 0);
        if (allies.length === 0) break;
        const target = allies.reduce((min, a) => a.defense < min.defense ? a : min, allies[0]);
        const damage = this.calculateDamage(enemy.attack, target.defense);
        target.hp = Math.max(0, target.hp - damage);
        if (target.hp <= 0) {
          this.turnOrder = this.turnOrder.filter(t => t.unit !== target);
        }
        // 玩家死亡立即跳出循环
        const p = this.allies.find(a => a.isPlayer);
        if (p && p.hp <= 0) break;
      }

      // 玩家死亡立即结束自动战斗
      const playerCheck = this.allies.find(a => a.isPlayer);
      if (playerCheck && playerCheck.hp <= 0) break;

      rounds++;
    }

    // Sync player HP
    const player = this.allies.find(a => a.isPlayer);
    if (player) this.gameState.player.hp = player.hp;

    this.renderEnemies();
    this.renderAllies();

    // 玩家死亡立即结束
    if (player && player.hp <= 0) {
      this.gameState.player.hp = 0;
      this.addLog('你倒下了...');
      this.endBattle(false);
      return;
    }

    const won = this.enemies.filter(e => e.hp > 0).length === 0;
    if (won) {
      this.addLog(`自动战斗完成！经过 ${rounds} 回合，战斗胜利！`);
    } else {
      this.addLog(`自动战斗完成！经过 ${rounds} 回合...`);
    }

    this.time.delayedCall(600, () => this.endBattle(won));
  }

  // ============================================================
  //  NPC ACTION
  // ============================================================
  npcAction(ally) {
    if (this.battleOver) return;
    if (!ally.npcRef) { this.npcBasicAttack(ally); this.advanceTurn(); return; }

    // Track NPC for combo attacks
    this._npcsActedThisRound.add(ally.id);

    const behavior = ally.npcRef.getCombatAction();
    const aliveEnemies = this.enemies.filter(e => e.hp > 0);
    const aliveAllies = this.allies.filter(a => a.hp > 0);
    const lowestHpAlly = aliveAllies.reduce((min, a) => a.hp < min.hp ? a : min, aliveAllies[0]);

    switch (behavior) {
      case 'aggressive': {
        const skills = ally.npcRef.getAvailableSkills();
        const attackSkill = skills.filter(s => s.type === 'attack' || s.type === 'ultimate');
        if (attackSkill.length > 0 && Math.random() < 0.7) {
          const skill = attackSkill[Math.floor(Math.random() * attackSkill.length)];
          if (skill.effect.target === 'all_enemies') {
            for (const enemy of aliveEnemies) {
              const damage = this.calculateDamage(ally.attack + skill.power, enemy.defense);
              enemy.hp = Math.max(0, enemy.hp - damage);
              if (enemy.hp <= 0 && enemy.isBoss && enemy.isInvincible && !this._awakeningTriggered) {
                enemy.hp = 1;
              }
              const dead = enemy.hp <= 0;
              this.showDamageNumber(enemy._displayX, enemy._displayY, damage);
              if (dead) {
                this.addLog(`${ally.name} 使用 ${skill.name} 消灭了 ${enemy.name}！`);
              }
            }
            this.addLog(`${ally.name} 使用了 ${skill.name}！`);
          } else {
            const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
            const damage = this.calculateDamage(ally.attack + skill.power, target.defense);
            target.hp = Math.max(0, target.hp - damage);
            if (target.hp <= 0 && target.isBoss && target.isInvincible && !this._awakeningTriggered) {
              target.hp = 1;
            }
            const dead = target.hp <= 0;
            this.addLog(`${ally.name} 使用 ${skill.name} 攻击 ${target.name}，造成 ${damage} 点伤害！`);
            this.showDamageNumber(target._displayX, target._displayY, damage);
            if (dead) {
              this.addLog(`${target.name} 被消灭了！`);
            }
          }
        } else {
          this.npcBasicAttack(ally);
        }
        break;
      }
      case 'normal': {
        if (Math.random() < 0.5) {
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
    target.hp = Math.max(0, target.hp - damage);

    // 检查boss是否应该被杀死（不可战胜的boss在清醒前不会死）
    if (target.hp <= 0 && target.isBoss && target.zombieRef && target.zombieRef.isInvincible && !this._awakeningTriggered) {
      target.hp = 1;
      this.addLog(`${ally.name} 攻击了 ${target.name}，造成 ${damage} 点伤害！`);
      this.addLog(`${target.name} 似乎无法被杀死...`);
    } else {
      const dead = target.hp <= 0;
      this.addLog(`${ally.name} 攻击了 ${target.name}，造成 ${damage} 点伤害！`);
      if (dead) {
        this.addLog(`${target.name} 被消灭了！`);
      }
    }

    this.showDamageNumber(target._displayX, target._displayY, damage);

    // Immediate victory check
    if (this.enemies.filter(e => e.hp > 0).length === 0) {
      this.time.delayedCall(400, () => this.endBattle(true));
    }
  }

  // ============================================================
  //  ENEMY ACTION
  // ============================================================
  enemyAction(enemy) {
    if (this.battleOver) return;
    if (enemy.hp <= 0) { this.advanceTurn(); return; }

    // 检查boss清醒条件
    if (this.checkBossAwakening()) {
      return;
    }

    const zombie = enemy.zombieRef;
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
              name: summonData.name, emoji: '🧟',
              hp: newZombie.hp, maxHp: newZombie.maxHp,
              attack: newZombie.attack, defense: newZombie.defense,
              speed: newZombie.speed, isBoss: false, zombieRef: newZombie,
            };
            this.enemies.push(newEnemy);
            this.turnOrder.push({ type: 'enemy', unit: newEnemy });
          }
          this.addLog(`${enemy.name} 召唤了 ${count} 只 ${summonData.name}！`);
          this.renderEnemies();
        }
      }
    }

    const aliveAllies = this.allies.filter(a => a.hp > 0);
    if (aliveAllies.length === 0) { this.advanceTurn(); return; }

    const target = aliveAllies.reduce((min, a) => a.defense < min.defense ? a : min, aliveAllies[0]);
    const damage = this.calculateDamage(enemy.attack, target.defense);
    const finalDamage = target.defending ? Math.floor(damage / 2) : damage;

    // Boss攻击不会打死玩家（留给清醒剧情）
    const isBossWithAwakening = zombie && zombie.isBoss && zombie.awakening;
    if (isBossWithAwakening && target.isPlayer && target.hp - finalDamage <= 0) {
      target.hp = 1;
    } else {
      target.hp = Math.max(0, target.hp - finalDamage);
    }

    const defendMsg = target.defending ? '（防御减半）' : '';
    this.addLog(`${enemy.name} 攻击了 ${target.name}，造成 ${finalDamage} 点伤害！${defendMsg}`);
    this.showSlashEffect(target._displayX, target._displayY, 0xe94560);
    this.showDamageNumber(target._displayX, target._displayY, finalDamage, 0xe94560);
    this.flashUnit();

    if (target.hp <= 0) {
      this.addLog(`${target.name} 倒下了...`);
      if (target.isPlayer) {
        this.addLog('你失去了意识...');
        this.gameState.player.hp = 0;
        this.renderAllies();
        this.endBattle(false);
        return;
      }
    }

    const player = this.allies.find(a => a.isPlayer);
    if (player) this.gameState.player.hp = player.hp;

    this.renderAllies();

    // 玩家死亡立即结束
    if (player && player.hp <= 0) {
      this.gameState.player.hp = 0;
      this.endBattle(false);
      return;
    }

    // Check if all allies dead
    const aliveAlliesNow = this.allies.filter(a => a.hp > 0);
    if (aliveAlliesNow.length === 0) {
      this.endBattle(false);
      return;
    }

    this.advanceTurn();
  }

  // ============================================================
  //  DAMAGE & EFFECTS
  // ============================================================
  calculateDamage(atk, def) {
    return Math.max(1, atk - def + Math.floor(Math.random() * 5));
  }

  showDamageNumber(x, y, amount, color) {
    const colorHex = color || 0xe94560;
    const colorStr = '#' + colorHex.toString(16).padStart(6, '0');
    const isHeal = colorHex === 0x00ff88;
    const offsetX = (Math.random() - 0.5) * 16;

    // Background pill
    const pill = this.add.graphics();
    pill.fillStyle(isHeal ? 0x004422 : 0x440000, 0.85);
    pill.fillRoundedRect(x - 32 + offsetX, y - 24, 64, 26, 6);
    pill.setAlpha(0);
    pill.setScale(0.5);

    const text = this.add.text(x + offsetX, y - 11, `${isHeal ? '+' : '-'}${amount}`, {
      fontFamily: 'Consolas, monospace', fontSize: '20px',
      color: colorStr, fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0).setScale(0.5);

    // Pop-in animation with bounce
    this.tweens.add({
      targets: [text, pill], alpha: 1, scaleX: 1.2, scaleY: 1.2, y: `-=35`,
      duration: 200, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: [text, pill], scaleX: 1, scaleY: 1, y: `-=8`,
          duration: 120,
          onComplete: () => {
            this.tweens.add({
              targets: [text, pill], alpha: 0, y: `-=12`, duration: 300,
              onComplete: () => { text.destroy(); pill.destroy(); },
            });
          },
        });
      },
    });
  }

  // Slash attack effect
  showSlashEffect(x, y, color) {
    const slashColor = color || 0xe94560;
    SoundManager.playSFX(this, 'sfx_hit');
    // Flash burst
    const burst = this.add.graphics();
    burst.fillStyle(slashColor, 0.6);
    burst.fillCircle(x, y, 5);
    this.tweens.add({
      targets: burst, scaleX: 8, scaleY: 8, alpha: 0,
      duration: 300, ease: 'Quad.easeOut',
      onComplete: () => burst.destroy(),
    });

    // Slash lines
    for (let i = 0; i < 3; i++) {
      const line = this.add.graphics();
      const angle = (Math.random() - 0.5) * 1.2;
      const len = 25 + Math.random() * 15;
      line.lineStyle(2 + Math.random(), slashColor, 0.8);
      line.lineBetween(
        x - Math.cos(angle) * len, y - Math.sin(angle) * len,
        x + Math.cos(angle) * len, y + Math.sin(angle) * len
      );
      this.tweens.add({
        targets: line, alpha: 0, duration: 250, delay: i * 40,
        onComplete: () => line.destroy(),
      });
    }
  }

  // Screen shake + flash on hit
  flashUnit(unit, color) {
    this.cameras.main.shake(80, 0.004);
    // Red flash overlay
    const flash = this.add.graphics();
    flash.fillStyle(0xe94560, 0.08);
    flash.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
    this.tweens.add({
      targets: flash, alpha: 0, duration: 200,
      onComplete: () => flash.destroy(),
    });
  }

  // ============================================================
  //  BOSS AWAKENING CHECK
  // ============================================================
  checkBossAwakening() {
    if (this.battleOver || this._awakeningTriggered) return false;

    const player = this.allies.find(a => a.isPlayer);
    if (!player || player.hp <= 0) return false;

    // 查找boss敌人
    const boss = this.enemies.find(e => e.isBoss && e.hp > 0 && e.zombieRef);
    if (!boss || !boss.zombieRef) return false;

    const zombie = boss.zombieRef;
    const awakening = zombie.awakening;
    if (!awakening) return false;

    // 检查玩家HP是否降至10以下（boss意识到玩家快死了）
    if (player.hp <= 10) {
      this._awakeningTriggered = true;
      this.triggerBossAwakening(boss, awakening);
      return true;
    }

    return false;
  }

  triggerBossAwakening(boss, awakening) {
    this.battleOver = true;
    this.clearUI();

    // 切换到地图BGM
    SoundManager.playBGM(this, 'bgm_map');

    // 停止所有战斗动作
    this.addLog(`${boss.name} 突然停止了攻击...`);

    // 显示boss清醒对话
    this.time.delayedCall(1000, () => {
      const dialogueSystem = new Dialogue(this);
      dialogueSystem.show(awakening.dialogues, () => {
        // 对话结束，给予奖励
        this.giveAwakeningRewards(awakening);

        // 显示结束信息
        this.time.delayedCall(500, () => {
          this.showAwakeningComplete(boss);
        });
      });
    });
  }

  giveAwakeningRewards(awakening) {
    if (!awakening.rewards) return;

    const itemsData = this.cache.json.get('itemsData') || {};

    awakening.rewards.forEach(reward => {
      if (reward.itemId) {
        const existing = this.gameState.inventory.find(i => i.id === reward.itemId);
        if (existing) {
          existing.quantity += (reward.amount || 1);
        } else if (this.gameState.inventory.length < this.gameState.rv.capacity) {
          this.gameState.inventory.push({ id: reward.itemId, quantity: reward.amount || 1 });
        }
        const itemDef = itemsData[reward.itemId];
        const itemName = itemDef ? itemDef.name : reward.itemId;
        this.addLog(`获得: ${itemName} x${reward.amount || 1}`);
      }
    });

    SaveLoad.save(this.gameState);
  }

  showAwakeningComplete(boss) {
    const { width, height } = this.cameras.main;

    const overlay = this.add.graphics();
    overlay.setDepth(100);
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, width, height);

    const panel = UIHelper.drawPanel(this, width / 2 - 200, height / 2 - 120, 400, 240, {
      fillColor: UIHelper.COLORS.panelBg, fillAlpha: 0.95,
      borderColor: UIHelper.COLORS.info, borderAlpha: 0.5, radius: 12,
    });
    panel.setDepth(101);

    this.add.text(width / 2, height / 2 - 80, '战斗结束', {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '28px',
      color: '#38bdf8', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(102);

    this.add.text(width / 2, height / 2 - 30, `${boss.name}恢复了理智，将真相告诉了你们`, {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '14px',
      color: UIHelper.COLORS.textSecondary, align: 'center',
    }).setOrigin(0.5).setDepth(102);

    UIHelper.createButton(this, width / 2, height / 2 + 50, 140, 40, '继续', {}, () => {
      this.clearUI();
      if (this.onComplete) this.onComplete(this.gameState);
      this.scene.start(this.returnScene, { gameState: this.gameState });
    }).setDepth(102);
  }

  // ============================================================
  //  END BATTLE
  // ============================================================
  endBattle(won) {
    this.battleOver = true;
    this.clearUI();

    // gameOver battles: always end permanently, win or lose
    if (this.battleData.gameOver) {
      SaveLoad.save(this.gameState);
      this.time.delayedCall(1500, () => {
        this.showGameOverScreen('肩膀上的咬伤开始发黑，病毒沿着血管迅速蔓延。\n你的视线模糊，四肢逐渐失去知觉……\n末日之中，善良有时也是致命的弱点。');
      });
      return;
    }

    if (won) {
      SoundManager.playSFX(this, 'sfx_victory');
      this.addLog('战斗胜利！');
      this.collectDrops();
      if (this.gameState.npcs) {
        for (const npcId of Object.keys(this.gameState.npcs)) {
          if (this.gameState.npcs[npcId] && this.gameState.npcs[npcId].recruited) {
            this.gameState.npcs[npcId].affinity = Math.min(100, (this.gameState.npcs[npcId].affinity || 50) + 5);
          }
        }
      }
      const player = this.allies.find(a => a.isPlayer);
      if (player) this.gameState.player.hp = player.hp;
      SaveLoad.save(this.gameState);
      this.time.delayedCall(1000, () => this.showVictoryScreen());
    } else {
      SoundManager.playSFX(this, 'sfx_defeat');
      this.addLog('战斗失败...');
      SaveLoad.save(this.gameState);
      this.time.delayedCall(1500, () => {
        this.showGameOverScreen('你在战斗中耗尽了最后一丝力气……\n末日不会给任何人第二次机会。');
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
          allDrops.push(itemDef ? itemDef.name : itemId);
        }
      }
    }
    if (allDrops.length > 0) this.addLog(`掉落物品: ${allDrops.join(', ')}`);
  }

  showVictoryScreen() {
    const { width, height } = this.cameras.main;

    const overlay = this.add.graphics();
    overlay.setDepth(100);
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, width, height);
    this._uiElements.push(overlay);

    const panel = UIHelper.drawPanel(this, width / 2 - 180, height / 2 - 120, 360, 240, {
      fillColor: UIHelper.COLORS.panelBg, fillAlpha: 0.95,
      borderColor: UIHelper.COLORS.info, borderAlpha: 0.5, radius: 12,
    });
    panel.setDepth(101);
    this._uiElements.push(panel);

    const victoryText = this.add.text(width / 2, height / 2 - 80, '战斗胜利！', {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '28px',
      color: '#38bdf8', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(102);
    this._uiElements.push(victoryText);

    const dropText = this.add.text(width / 2, height / 2 - 30, '获得战利品已放入背包', {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '14px', color: UIHelper.COLORS.textSecondary,
    }).setOrigin(0.5).setDepth(102);
    this._uiElements.push(dropText);

    const affinityText = this.add.text(width / 2, height / 2, '同伴好感度 +5', {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '14px', color: UIHelper.COLORS.textSecondary,
    }).setOrigin(0.5).setDepth(102);
    this._uiElements.push(affinityText);

    UIHelper.createButton(this, width / 2, height / 2 + 70, 140, 40, '继续', {}, () => {
      this.clearUI();
      if (this.onComplete) this.onComplete(this.gameState);
      this.scene.start(this.returnScene, { gameState: this.gameState });
    }).setDepth(102);
  }

  showDefeatScreen() {
    const { width, height } = this.cameras.main;

    const overlay = this.add.graphics();
    overlay.setDepth(100);
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, width, height);
    this._uiElements.push(overlay);

    const panel = UIHelper.drawPanel(this, width / 2 - 180, height / 2 - 120, 360, 260, {
      fillColor: UIHelper.COLORS.panelBg, fillAlpha: 0.95,
      borderColor: UIHelper.COLORS.danger, borderAlpha: 0.5, radius: 12,
    });
    panel.setDepth(101);
    this._uiElements.push(panel);

    const defeatText = this.add.text(width / 2, height / 2 - 80, '战斗失败...', {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '28px',
      color: '#e94560', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(102);
    this._uiElements.push(defeatText);

    const hintText = this.add.text(width / 2, height / 2 - 30, '你们勉强撤退，保住了性命', {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '14px', color: UIHelper.COLORS.textSecondary,
    }).setOrigin(0.5).setDepth(102);
    this._uiElements.push(hintText);

    UIHelper.createButton(this, width / 2, height / 2 + 20, 150, 40, '重新挑战', {}, () => {
      this.clearUI();
      this.gameState.player.hp = this.gameState.player.maxHp;
      for (const ally of this.allies) {
        if (ally.isNPC) {
          const maxHp = this.gameState.npcs[ally.id] ? this.gameState.npcs[ally.id].stats.hp : ally.maxHp;
          ally.hp = maxHp;
          if (this.gameState.npcs[ally.id]) {
            this.gameState.npcs[ally.id].stats.hp = maxHp;
          }
        }
      }
      SaveLoad.save(this.gameState);
      this.scene.restart({
        gameState: this.gameState,
        battleData: this.battleData,
        storyNodeId: this.storyNode,
        returnScene: this.returnScene,
        onComplete: this.onComplete,
      });
    }).setDepth(102);

    UIHelper.createButton(this, width / 2, height / 2 + 70, 150, 40, '撤退回地图', {}, () => {
      this.clearUI();
      if (this.onComplete) this.onComplete(this.gameState);
      SaveLoad.save(this.gameState);
      this.scene.start(this.returnScene, { gameState: this.gameState });
    }).setDepth(102);
  }

  showGameOverScreen(desc) {
    const { width, height } = this.cameras.main;

    const overlay = this.add.graphics();
    overlay.setDepth(100);
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);
    this._uiElements.push(overlay);

    const panel = UIHelper.drawPanel(this, width / 2 - 200, height / 2 - 140, 400, 280, {
      fillColor: UIHelper.COLORS.panelBg, fillAlpha: 0.95,
      borderColor: UIHelper.COLORS.danger, borderAlpha: 0.7, radius: 12,
    });
    panel.setDepth(101);
    this._uiElements.push(panel);

    const gameOverText = this.add.text(width / 2, height / 2 - 100, '游戏结束', {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '36px',
      color: '#e94560', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(102);
    this._uiElements.push(gameOverText);

    const descText = this.add.text(width / 2, height / 2 - 40, desc || '你的旅程到此结束了……', {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '14px',
      color: UIHelper.COLORS.textSecondary, align: 'center',
    }).setOrigin(0.5).setDepth(102);
    this._uiElements.push(descText);

    UIHelper.createButton(this, width / 2, height / 2 + 50, 180, 44, '重新开始', {
      isPrimary: true, fontSize: '18px',
    }, () => {
      SaveLoad.deleteSave();
      this.scene.start('MenuScene');
    }).setDepth(102);
  }
}
