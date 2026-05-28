// MapScene.js - Road map with nodes, status bar, and scene transitions
class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapScene' });

    // Ordered list of story nodes displayed on the map (linear path)
    this.storyPath = [
      'prologue',
      'intro',
      'gas_station',
      'supermarket',
      'apartment_laojing',
      'hospital',
      'highway',
      'safe_zone',
    ];

    // Branch nodes that map back to a parent node on the display
    this.branchParents = {
      gas_station_explore: 'gas_station',
      gas_station_rescue: 'gas_station',
      gas_station_trap: 'gas_station',
      gas_station_engine: 'gas_station',
      gas_station_fix_self: 'gas_station',
      gas_station_search_parts: 'gas_station',
      gas_station_walk: 'gas_station',
      laojing_rejected: 'apartment_laojing',
      highway_fast_path: 'highway',
      highway_mountain_path: 'highway',
    };

    // Map node positions (8 nodes) with emoji icons
    this.nodePositions = {
      prologue:         { x: 50,  y: 100, name: '引言', icon: '📖' },
      intro:            { x: 150, y: 150, name: '城市公寓', icon: '🏢' },
      gas_station:      { x: 250, y: 250, name: '加油站', icon: '⛽' },
      supermarket:      { x: 380, y: 180, name: '超市', icon: '🛒' },
      apartment_laojing:{ x: 500, y: 300, name: '居民楼', icon: '🏠' },
      hospital:         { x: 620, y: 200, name: '废弃医院', icon: '🏥' },
      highway:          { x: 700, y: 350, name: '高速公路', icon: '🛣️' },
      safe_zone:        { x: 750, y: 150, name: '安全区', icon: '🛡️' },
    };
  }

  init(data) {
    // Receive gameState from previous scene or load from save
    if (data && data.gameState) {
      this.gameState = data.gameState;
    } else {
      this.gameState = SaveLoad.load() || SaveLoad.getDefaultState();
    }
    this._autoEnter = data && data.autoEnter;
  }

  create() {
    const { width, height } = this.cameras.main;

    // Reset any fade state carried over from previous scene
    this.cameras.main.resetFX();

    // --- Scene-specific background ---
    const currentNodeId = this.getDisplayNode();
    const currentNodeData = this.cache.json.get('storyData').nodes[currentNodeId];
    const sceneName = currentNodeData ? currentNodeData.scene : null;
    const drawBg = SceneBackgrounds.getBySceneName(sceneName);
    if (drawBg) {
      drawBg(this, width, height);
    } else {
      SceneBackgrounds.drawNightSky(this, width, height);
    }

    // Dark overlay for readability
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.35);
    overlay.fillRect(0, 0, width, height);

    // --- Atmospheric particles ---
    if (sceneName) {
      SceneParticles.applyForScene(sceneName, this, width, height);
    }

    // --- Title ---
    this.add.text(width / 2, 65, '末日公路', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '32px',
      color: UIHelper.COLORS.textPrimary,
      fontStyle: 'bold',
      stroke: '#0a0a1a',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.add.text(width / 2, 95, '第一章：丧尸围城', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '13px',
      color: UIHelper.COLORS.textMuted,
    }).setOrigin(0.5);

    // --- Status bar ---
    this.renderStatusBar();

    // --- Draw path lines between nodes ---
    this.drawPaths();

    // --- Draw map nodes ---
    this.drawNodes();

    // --- RV icon on current node ---
    this.createRVIcon();

    // --- "Enter RV" button ---
    this.createEnterRVButton();

    // --- Check if ending should be shown (after battle victory) ---
    if (this.gameState._showEnding) {
      const ending = this.gameState._showEnding;
      delete this.gameState._showEnding;
      SaveLoad.save(this.gameState);
      this.time.delayedCall(500, () => {
        this.showEnding(ending);
      });
      return;
    }

    // --- Auto-enter node if coming from a choice ---
    if (this._autoEnter) {
      this.time.delayedCall(200, () => {
        this.enterScene(this.gameState.currentStoryNode);
      });
    }

    // --- Fade in ---
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  // ============================================================
  //  STATUS BAR
  // ============================================================
  renderStatusBar() {
    const { width } = this.cameras.main;
    const gs = this.gameState;
    const y = 8;
    const barH = 36;

    // Frosted panel background
    UIHelper.drawPanel(this, 10, y, width - 20, barH, {
      fillColor: UIHelper.COLORS.statusBarBg,
      fillAlpha: 0.88,
      radius: 6,
      shadowOffset: 2,
    });

    const barBg = this.add.graphics();

    const stats = [
      { icon: '🚐', label: '耐久', value: `${gs.rv.durability}/${gs.rv.maxDurability}`, ratio: gs.rv.durability / gs.rv.maxDurability, hasBar: true, color: '#66aacc' },
      { icon: '❤️', label: 'HP', value: `${gs.player.hp}/${gs.player.maxHp}`, ratio: gs.player.hp / gs.player.maxHp, hasBar: true, color: '#e94560' },
      { icon: '🍖', label: '饱食', value: `${gs.player.hunger}`, ratio: gs.player.hunger / 100, hasBar: true, color: '#ccaa44' },
      { icon: '🎒', label: '背包', value: `${gs.inventory.length}/${gs.rv.capacity}`, hasBar: false, color: UIHelper.COLORS.textSecondary },
      { icon: '📅', label: `第${gs.day}天`, hasBar: false, color: UIHelper.COLORS.textSecondary },
    ];

    const spacing = (width - 40) / stats.length;
    stats.forEach((s, i) => {
      const sx = 30 + spacing * i + spacing / 2;
      this.add.text(sx - 20, y + 9, s.icon, { fontSize: '13px' }).setOrigin(0.5);
      const label = s.label + (s.value ? ` ${s.value}` : '');
      this.add.text(sx - 4, y + (s.hasBar ? 7 : 10), label, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '11px',
        color: s.color,
      }).setOrigin(0, 0.5);

      // Mini bar for stats that have ratios
      if (s.hasBar) {
        const miniBarX = sx - 4;
        const miniBarY = y + 22;
        const miniBarW = 50;
        const miniBarH = 3;
        barBg.fillStyle(0x1a1a2e, 0.8);
        barBg.fillRoundedRect(miniBarX, miniBarY, miniBarW, miniBarH, 1.5);
        const ratio = Math.max(0, Math.min(1, s.ratio));
        const barColor = ratio > 0.6 ? 0x34d399 : ratio > 0.3 ? 0xfbbf24 : 0xef4444;
        barBg.fillStyle(barColor, 0.85);
        barBg.fillRoundedRect(miniBarX, miniBarY, miniBarW * ratio, miniBarH, 1.5);
      }
    });
  }

  // ============================================================
  //  PATH LINES
  // ============================================================
  getDisplayNode() {
    const cur = this.gameState.currentStoryNode;
    if (this.storyPath.includes(cur)) return cur;
    return this.branchParents[cur] || cur;
  }

  drawPaths() {
    const graphics = this.add.graphics();
    const progressGraphics = this.add.graphics();

    const displayNode = this.getDisplayNode();
    const currentIdx = this.storyPath.indexOf(displayNode);
    const completedUpTo = Math.max(0, currentIdx);

    for (let i = 0; i < this.storyPath.length - 1; i++) {
      const fromNode = this.nodePositions[this.storyPath[i]];
      const toNode = this.nodePositions[this.storyPath[i + 1]];
      const dx = toNode.x - fromNode.x;
      const dy = toNode.y - fromNode.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Dashed gray base line
      const dashLen = 8;
      const gapLen = 6;
      const steps = Math.floor(dist / (dashLen + gapLen));
      graphics.lineStyle(2, 0x333355, 0.5);
      for (let s = 0; s < steps; s++) {
        const t0 = s * (dashLen + gapLen) / dist;
        const t1 = Math.min(1, (s * (dashLen + gapLen) + dashLen) / dist);
        graphics.lineBetween(
          fromNode.x + dx * t0, fromNode.y + dy * t0,
          fromNode.x + dx * t1, fromNode.y + dy * t1
        );
      }

      // Solid red progress line for completed segments
      if (i < completedUpTo) {
        progressGraphics.lineStyle(3, 0xe94560, 0.8);
        progressGraphics.lineBetween(fromNode.x, fromNode.y, toNode.x, toNode.y);
      }
    }
  }

  // ============================================================
  //  MAP NODES
  // ============================================================
  drawNodes() {
    const displayNode = this.getDisplayNode();
    const currentIdx = this.storyPath.indexOf(displayNode);

    this.storyPath.forEach((nodeId, index) => {
      const pos = this.nodePositions[nodeId];
      if (!pos) return;

      const isCurrent = index === currentIdx;
      const isPast = index < currentIdx;
      const radius = isCurrent ? 22 : 16;
      const color = isCurrent ? 0xe94560 : isPast ? 0x444466 : 0x222233;
      const borderColor = isCurrent ? 0xff6b81 : isPast ? 0x6666aa : 0x3a4578;

      // Layer 1: Outer glow for current node
      if (isCurrent) {
        const glowOuter = this.add.graphics();
        glowOuter.fillStyle(0xe94560, 0.05);
        glowOuter.fillCircle(pos.x, pos.y, radius + 16);
        glowOuter.fillStyle(0xe94560, 0.1);
        glowOuter.fillCircle(pos.x, pos.y, radius + 8);
      }

      // Layer 2: Drop shadow
      const shadow = this.add.graphics();
      shadow.fillStyle(0x000000, 0.2);
      shadow.fillCircle(pos.x + 1, pos.y + 2, radius);

      // Layer 3: Base fill
      const nodeGraphic = this.add.graphics();
      nodeGraphic.fillStyle(color, 1);
      nodeGraphic.fillCircle(pos.x, pos.y, radius);

      // Layer 4: Top highlight (half-circle)
      nodeGraphic.fillStyle(0xffffff, isCurrent ? 0.08 : 0.04);
      nodeGraphic.beginPath();
      nodeGraphic.arc(pos.x, pos.y, radius - 1, Math.PI, 0, false);
      nodeGraphic.closePath();
      nodeGraphic.fillPath();

      // Layer 5: Border
      nodeGraphic.lineStyle(isCurrent ? 2.5 : 1.5, borderColor, 0.9);
      nodeGraphic.strokeCircle(pos.x, pos.y, radius);

      // Layer 6: Inner edge highlight
      nodeGraphic.lineStyle(1, 0xffffff, 0.04);
      nodeGraphic.strokeCircle(pos.x, pos.y, radius - 2);

      // Pulse ring for current node
      if (isCurrent) {
        const pulseRing = this.add.graphics();
        pulseRing.lineStyle(2, 0xe94560, 0.4);
        pulseRing.strokeCircle(pos.x, pos.y, radius);
        this.tweens.add({
          targets: pulseRing,
          scaleX: 1.8, scaleY: 1.8, alpha: 0,
          duration: 1500, ease: 'Sine.easeOut', repeat: -1,
          onRepeat: () => { pulseRing.setScale(1); pulseRing.setAlpha(0.4); },
        });
      }

      // Icon
      const iconText = isPast ? '✓' : (pos.icon || String(index + 1));
      this.add.text(pos.x, pos.y, iconText, {
        fontSize: isCurrent ? '20px' : '14px',
        color: isCurrent ? '#ffffff' : isPast ? '#aaaacc' : '#666688',
      }).setOrigin(0.5);

      // Location label
      const labelColor = isCurrent ? '#e94560' : isPast ? UIHelper.COLORS.textSecondary : UIHelper.COLORS.textMuted;
      const labelY = pos.y + radius + 12;
      this.add.text(pos.x, labelY, pos.name, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: labelColor,
        fontStyle: isCurrent ? 'bold' : 'normal',
      }).setOrigin(0.5);

      // Clickable area
      const hitArea = this.add.circle(pos.x, pos.y, radius + 10, 0x000000, 0.001)
        .setInteractive({ useHandCursor: isCurrent });

      if (isCurrent) {
        hitArea.on('pointerover', () => {
          nodeGraphic.clear();
          nodeGraphic.fillStyle(0xff3050, 1);
          nodeGraphic.fillCircle(pos.x, pos.y, radius);
          nodeGraphic.fillStyle(0xffffff, 0.1);
          nodeGraphic.beginPath();
          nodeGraphic.arc(pos.x, pos.y, radius - 1, Math.PI, 0, false);
          nodeGraphic.closePath();
          nodeGraphic.fillPath();
          nodeGraphic.lineStyle(2.5, 0xff8090, 1);
          nodeGraphic.strokeCircle(pos.x, pos.y, radius);
        });
        hitArea.on('pointerout', () => {
          nodeGraphic.clear();
          nodeGraphic.fillStyle(0xe94560, 1);
          nodeGraphic.fillCircle(pos.x, pos.y, radius);
          nodeGraphic.fillStyle(0xffffff, 0.08);
          nodeGraphic.beginPath();
          nodeGraphic.arc(pos.x, pos.y, radius - 1, Math.PI, 0, false);
          nodeGraphic.closePath();
          nodeGraphic.fillPath();
          nodeGraphic.lineStyle(2.5, 0xff6b81, 0.9);
          nodeGraphic.strokeCircle(pos.x, pos.y, radius);
          nodeGraphic.lineStyle(1, 0xffffff, 0.04);
          nodeGraphic.strokeCircle(pos.x, pos.y, radius - 2);
        });
        hitArea.on('pointerdown', () => {
          this.cameras.main.fadeOut(300, 0, 0, 0);
          this.time.delayedCall(400, () => {
            this.enterScene(nodeId);
            this.cameras.main.fadeIn(300, 0, 0, 0);
          });
        });
      }
    });
  }

  // ============================================================
  //  RV ICON
  // ============================================================
  createRVIcon() {
    const displayNode = this.getDisplayNode();
    const currentIdx = this.storyPath.indexOf(displayNode);
    const currentNodeId = this.storyPath[currentIdx >= 0 ? currentIdx : 0];
    const pos = this.nodePositions[currentNodeId];
    if (!pos) return;

    // Floating RV emoji above the current node
    const rvIcon = this.add.text(pos.x, pos.y - 30, '🚐', {
      fontSize: '28px',
    }).setOrigin(0.5);

    // Floating animation
    this.tweens.add({
      targets: rvIcon,
      y: pos.y - 38,
      duration: 1000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  // ============================================================
  //  ENTER RV BUTTON
  // ============================================================
  createEnterRVButton() {
    const { height } = this.cameras.main;
    UIHelper.createButton(this, 80, height - 50, 140, 36, '🚐 进入房车', { fontSize: '15px' }, () => {
      SaveLoad.save(this.gameState);
      this.scene.start('RVScene', { gameState: this.gameState });
    });
  }

  // ============================================================
  //  ENTER SCENE (click a node)
  // ============================================================
  enterScene(nodeId) {
    const storyData = this.cache.json.get('storyData');
    if (!storyData || !storyData.nodes[nodeId]) {
      console.warn('Story node not found:', nodeId);
      return;
    }

    const storyNode = storyData.nodes[nodeId];

    // If node has dialogues, play them first
    if (storyNode.dialogues && storyNode.dialogues.length > 0) {
      this.playDialogues(storyNode, () => {
        this.handlePostDialogue(storyNode);
      });
    } else {
      this.handlePostDialogue(storyNode);
    }
  }

  // ============================================================
  //  POST-DIALOGUE LOGIC
  // ============================================================
  handlePostDialogue(storyNode) {
    // Game over node — show game over screen, delete save
    if (storyNode.gameOver) {
      this.showMapGameOver(storyNode.gameOver);
      return;
    }

    // Check required items
    if (storyNode.requireItem) {
      const req = storyNode.requireItem;
      const invItem = this.gameState.inventory.find(i => i.id === req.itemId);
      if (!invItem || invItem.quantity < (req.amount || 1)) {
        // Player doesn't have the required item
        if (storyNode.failDialogue && storyNode.failDialogue.length > 0) {
          const dialogueSystem = new Dialogue(this);
          dialogueSystem.show(storyNode.failDialogue, () => {
            // Navigate to next node after fail dialogue
            if (storyNode.next) {
              this.gameState.currentStoryNode = storyNode.next;
              SaveLoad.save(this.gameState);
              this.scene.restart({ gameState: this.gameState, autoEnter: true });
            }
          });
        } else {
          this.showNotification('缺少所需物品！');
          if (storyNode.next) {
            this.gameState.currentStoryNode = storyNode.next;
            SaveLoad.save(this.gameState);
            this.scene.restart({ gameState: this.gameState, autoEnter: true });
          }
        }
        return;
      }
      // Consume the item
      if (storyNode.consumeItem) {
        const consumeReq = storyNode.consumeItem;
        const idx = this.gameState.inventory.findIndex(i => i.id === consumeReq.itemId);
        if (idx !== -1) {
          this.gameState.inventory[idx].quantity -= (consumeReq.amount || 1);
          if (this.gameState.inventory[idx].quantity <= 0) {
            this.gameState.inventory.splice(idx, 1);
          }
        }
      }
    }

    // Recruit NPCs if specified
    if (storyNode.recruitNPCs) {
      this.recruitNPCs(storyNode.recruitNPCs);
    }

    // Apply penalty if any
    if (storyNode.penalty) {
      this.applyPenalty(storyNode.penalty);
    }

    // Give rewards if any
    if (storyNode.rewards) {
      this.giveRewards(storyNode.rewards);
    }

    // If there is a forced battle, go to BattleScene
    if (storyNode.forcedBattle) {
      // If player HP is 0, auto-lose and game over
      if (this.gameState.player.hp <= 0) {
        SaveLoad.save(this.gameState);
        this.scene.start('BattleScene', {
          gameState: this.gameState,
          battleData: storyNode.forcedBattle,
          storyNodeId: storyNode.id,
          returnScene: 'MapScene',
        });
        return;
      }

      // Pre-compute next node for post-battle advancement
      const nextNode = storyNode.next || null;
      const ending = storyNode.ending || null;
      SaveLoad.save(this.gameState);
      this.scene.start('BattleScene', {
        gameState: this.gameState,
        battleData: storyNode.forcedBattle,
        storyNodeId: storyNode.id,
        returnScene: 'MapScene',
        onComplete: (gameState) => {
          const updatedState = gameState || this.gameState;
          if (nextNode) {
            updatedState.currentStoryNode = nextNode;
            updatedState.day = (updatedState.day || 1) + 1;
          } else if (ending) {
            // Mark that ending should be shown when returning to map
            updatedState._showEnding = ending;
          }
          SaveLoad.save(updatedState);
        },
      });
      return;
    }

    // If the node has an ending, show it (after dialogues and battles)
    if (storyNode.ending) {
      this.showEnding(storyNode.ending);
      return;
    }

    // If there are choices, show them
    if (storyNode.choices && storyNode.choices.length > 0) {
      this.showChoices(storyNode);
      return;
    }

    // If node has rewards + next (exploration node), advance directly
    if (storyNode.rewards && storyNode.next) {
      this.advanceStory(storyNode.id);
      return;
    }

    // Show explore / continue choice (only for nodes without rewards)
    this.showExploreChoice(storyNode);
  }

  // ============================================================
  //  EXPLORE CHOICE (explore scene or continue story)
  // ============================================================
  showExploreChoice(storyNode) {
    const dialogueSystem = new Dialogue(this);
    dialogueSystem.showChoices([
      { text: '探索当前位置', description: '搜刮物资，可能会遇到随机事件' },
      { text: '继续前进', description: '前往下一个目的地' },
    ], (selectedIndex) => {
      if (selectedIndex === 0) {
        // Go to ExploreScene
        SaveLoad.save(this.gameState);
        this.scene.start('ExploreScene', {
          gameState: this.gameState,
          storyNode: storyNode,
        });
      } else {
        // Continue to next node
        this.advanceStory(storyNode.id);
      }
    });
  }

  // ============================================================
  //  PLAY DIALOGUES
  // ============================================================
  playDialogues(storyNode, onComplete) {
    const dialogueSystem = new Dialogue(this);
    dialogueSystem.show(storyNode.dialogues, onComplete);
  }

  // ============================================================
  //  SHOW CHOICES
  // ============================================================
  showChoices(storyNode) {
    const dialogueSystem = new Dialogue(this);

    // Map choices to the format Dialogue.showChoices expects
    const choiceList = storyNode.choices.map((c) => ({
      text: c.text,
      description: c.description || '',
    }));

    dialogueSystem.showChoices(choiceList, (selectedIndex) => {
      const selected = storyNode.choices[selectedIndex];

      // Apply choice result penalties or rewards
      if (selected.result) {
        if (selected.result.recruitNPCs) {
          this.recruitNPCs(selected.result.recruitNPCs);
        }
        if (selected.result.penalty) {
          this.applyPenalty(selected.result.penalty);
        }
        if (selected.result.forcedBattle) {
          const nextNode = selected.next || storyNode.next || null;
          SaveLoad.save(this.gameState);
          this.scene.start('BattleScene', {
            gameState: this.gameState,
            battleData: selected.result.forcedBattle,
            storyNodeId: storyNode.id,
            choiceId: selected.id,
            returnScene: 'MapScene',
            onComplete: (gameState) => {
              const updatedState = gameState || this.gameState;
              if (nextNode) {
                updatedState.currentStoryNode = nextNode;
                updatedState.day = (updatedState.day || 1) + 1;
              }
              SaveLoad.save(updatedState);
            },
          });
          return;
        }
      }

      // Navigate to the choice's target node
      if (selected.next) {
        this.gameState.currentStoryNode = selected.next;
        SaveLoad.save(this.gameState);
        this.scene.restart({ gameState: this.gameState, autoEnter: true });
      } else {
        // Fall through to default next
        this.advanceStory(storyNode.id);
      }
    });
  }

  // ============================================================
  //  ADVANCE STORY
  // ============================================================
  advanceStory(nodeId) {
    const storyData = this.cache.json.get('storyData');
    const storyNode = storyData.nodes[nodeId];

    if (storyNode && storyNode.next) {
      this.gameState.currentStoryNode = storyNode.next;
      this.gameState.day = (this.gameState.day || 1) + 1;

      // 每天减少饱食感（改为5点，更平衡）
      this.gameState.player.hunger = Math.max(0, (this.gameState.player.hunger || 100) - 5);

      // 饱食感低于30时显示警告
      if (this.gameState.player.hunger < 30 && this.gameState.player.hunger > 0) {
        UIHelper.showToast(this, '饱食度过低！记得进食，否则会生病', 'warning');
      }

      // 检查是否生病
      if (this.gameState.player.hunger < 20 && !this.gameState.player.isSick) {
        this.gameState.player.isSick = true;
        this.gameState.player.sickDays = 0;
        this.showSicknessEvent();
        return;
      }

      // 如果已经生病，检查是否有NPC救助
      if (this.gameState.player.isSick) {
        this.gameState.player.sickDays = (this.gameState.player.sickDays || 0) + 1;
        // 生病期间HP每天下降10点
        this.gameState.player.hp = Math.max(0, this.gameState.player.hp - 10);

        // 生病超过5天且没有NPC救助，游戏结束
        if (this.gameState.player.sickDays > 5) {
          this.showGameOver('你因为饥饿和疾病，身体再也撑不住了……');
          return;
        }

        // 检查是否有NPC好感度高于80
        const rescuer = this.findRescuer();
        if (rescuer) {
          this.showRescueEvent(rescuer);
          return;
        } else {
          UIHelper.showToast(this, `你生病了！需要伙伴好感度≥80才能救治（第${this.gameState.player.sickDays}天）`, 'danger');
        }
      }

      SaveLoad.save(this.gameState);
      this.scene.restart({ gameState: this.gameState, autoEnter: true });
    } else {
      SaveLoad.save(this.gameState);
    }
  }

  findRescuer() {
    const npcs = this.gameState.npcs || {};
    for (const npcId of Object.keys(npcs)) {
      if (npcs[npcId].recruited && npcs[npcId].affinity >= 80) {
        return npcId;
      }
    }
    return null;
  }

  showSicknessEvent() {
    const { width, height } = this.cameras.main;

    // 显示生病提示
    UIHelper.showToast(this, '你因为饥饿过度生病了！需要有人照顾你才能康复', 'danger');

    // 如果没有NPC好感度高于80，显示游戏结束
    const rescuer = this.findRescuer();
    if (!rescuer) {
      this.time.delayedCall(2000, () => {
        this.showGameOver('你因为饥饿和疾病，身体再也撑不住了……\n没有人能照顾你，你的旅程到此结束。');
      });
      return;
    }

    // 如果有NPC好感度高于80，触发救助事件
    this.time.delayedCall(2000, () => {
      this.showRescueEvent(rescuer);
    });
  }

  showRescueEvent(npcId) {
    const specialEventsData = this.cache.json.get('specialEventsData');
    if (!specialEventsData || !specialEventsData.sickness_events) {
      this.gameState.player.isSick = false;
      this.gameState.player.sickDays = 0;
      SaveLoad.save(this.gameState);
      this.scene.restart({ gameState: this.gameState, autoEnter: true });
      return;
    }

    const rescueKey = `${npcId}_rescue`;
    const dialogues = specialEventsData.sickness_events[rescueKey];
    if (!dialogues) {
      this.gameState.player.isSick = false;
      this.gameState.player.sickDays = 0;
      SaveLoad.save(this.gameState);
      this.scene.restart({ gameState: this.gameState, autoEnter: true });
      return;
    }

    const dialogueSystem = new Dialogue(this);
    dialogueSystem.show(dialogues, () => {
      // 救助成功，恢复健康
      this.gameState.player.isSick = false;
      this.gameState.player.sickDays = 0;
      this.gameState.player.hunger = Math.min(100, this.gameState.player.hunger + 30);
      this.gameState.player.hp = Math.min(this.gameState.player.maxHp, this.gameState.player.hp + 20);

      UIHelper.showToast(this, `${this.getNpcName(npcId)}照顾了你，你恢复了健康`, 'reward');

      SaveLoad.save(this.gameState);
      this.time.delayedCall(1500, () => {
        this.scene.restart({ gameState: this.gameState, autoEnter: true });
      });
    });
  }

  getNpcName(npcId) {
    const npcsData = this.cache.json.get('npcsData') || {};
    return npcsData[npcId] ? npcsData[npcId].name : npcId;
  }

  showGameOver(message) {
    const { width, height } = this.cameras.main;

    const overlay = this.add.graphics();
    overlay.setDepth(100);
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);

    const panel = UIHelper.drawPanel(this, width / 2 - 200, height / 2 - 140, 400, 280, {
      fillColor: UIHelper.COLORS.panelBg,
      fillAlpha: 0.95,
      borderColor: UIHelper.COLORS.danger,
      borderAlpha: 0.7,
      radius: 12,
    });
    panel.setDepth(101);

    this.add.text(width / 2, height / 2 - 100, '游戏结束', {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '36px',
      color: '#e94560', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(102);

    this.add.text(width / 2, height / 2 - 40, message, {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '14px',
      color: UIHelper.COLORS.textSecondary, align: 'center',
    }).setOrigin(0.5).setDepth(102);

    UIHelper.createButton(this, width / 2, height / 2 + 50, 180, 44, '重新开始', {
      isPrimary: true, fontSize: '18px',
    }, () => {
      SaveLoad.deleteSave();
      this.scene.start('MenuScene');
    }).setDepth(102);
  }

  // ============================================================
  //  RECRUIT NPCs
  // ============================================================
  recruitNPCs(npcIds) {
    const npcsData = this.cache.json.get('npcsData');

    npcIds.forEach((npcId) => {
      if (!this.gameState.npcs[npcId]) {
        const npcDef = npcsData[npcId];
        if (npcDef) {
          this.gameState.npcs[npcId] = {
            affinity: 50,
            recruited: true,
            stats: { ...npcDef.baseStats },
          };
          console.log(`NPC recruited: ${npcDef.name}`);
        }
      } else {
        // Already exists, ensure recruited flag is set
        this.gameState.npcs[npcId].recruited = true;
      }
    });
  }

  // ============================================================
  //  APPLY PENALTY
  // ============================================================
  applyPenalty(penalty) {
    if (penalty.hp) {
      this.gameState.player.hp = Math.max(0, this.gameState.player.hp + penalty.hp);
    }
    if (penalty.hunger) {
      this.gameState.player.hunger = Math.max(0, this.gameState.player.hunger + penalty.hunger);
    }
    if (penalty.durability) {
      this.gameState.rv.durability = Math.max(0, this.gameState.rv.durability + penalty.durability);
    }
    if (penalty.items && penalty.items.length > 0) {
      // Remove items from inventory
      penalty.items.forEach((item) => {
        const idx = this.gameState.inventory.findIndex((i) => i.id === item.itemId);
        if (idx !== -1) {
          this.gameState.inventory[idx].quantity -= (item.amount || 1);
          if (this.gameState.inventory[idx].quantity <= 0) {
            this.gameState.inventory.splice(idx, 1);
          }
        }
      });
    }
  }

  // ============================================================
  //  GIVE REWARDS
  // ============================================================
  giveRewards(rewards) {
    const itemsData = this.cache.json.get('itemsData');

    rewards.forEach((reward) => {
      const existing = this.gameState.inventory.find((i) => i.id === reward.itemId);
      if (existing) {
        existing.quantity += (reward.amount || 1);
      } else if (this.gameState.inventory.length < this.gameState.rv.capacity) {
        this.gameState.inventory.push({ id: reward.itemId, quantity: reward.amount || 1 });
      }

      // Show reward notification
      const itemDef = itemsData ? itemsData[reward.itemId] : null;
      const itemName = itemDef ? itemDef.name : reward.itemId;
      this.showNotification(`获得: ${itemName} x${reward.amount || 1}`);
    });
  }

  // ============================================================
  //  SHOW ENDING
  // ============================================================
  showEnding(ending) {
    const { width, height } = this.cameras.main;

    // Dark overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0);
    this.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: 1500,
      onUpdate: () => {
        overlay.clear();
        overlay.fillStyle(0x000000, overlay.alpha);
        overlay.fillRect(0, 0, width, height);
      },
    });

    // Show ending dialogues after a short delay
    this.time.delayedCall(1600, () => {
      // Clear the map visuals
      this.children.removeAll(true);

      // Full black background
      const endBg = this.add.graphics();
      endBg.fillStyle(0x000000, 1);
      endBg.fillRect(0, 0, width, height);

      // Ending title
      this.add.text(width / 2, height / 2 - 160, ending.title || '结局', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '32px',
        color: '#e94560',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      // Chapter transition subtitle
      if (ending.chapterTransition) {
        this.add.text(width / 2, height / 2 - 120, '第二章即将开启', {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '16px',
          color: '#8892b0',
        }).setOrigin(0.5);
      }

      // Play ending dialogues
      const dialogueSystem = new Dialogue(this);
      dialogueSystem.show(ending.dialogues, () => {
        const buttonLabel = ending.chapterTransition ? '等待第二章...' : '返回主菜单';
        UIHelper.createButton(this, width / 2, height / 2 + 100, 180, 44, buttonLabel, { fontSize: '18px' }, () => {
          SaveLoad.save(this.gameState);
          this.scene.start('MenuScene');
        });
      });
    });
  }

  // ============================================================
  //  NOTIFICATION (small toast)
  // ============================================================
  showNotification(message) {
    const type = message.includes('获得') ? 'reward' : 'danger';
    UIHelper.showToast(this, message, type);
  }

  // ============================================================
  //  MAP GAME OVER (story node gameOver flag)
  // ============================================================
  showMapGameOver(desc) {
    const { width, height } = this.cameras.main;

    const overlay = this.add.graphics();
    overlay.setDepth(100);
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);

    // Panel with depth
    const panel = UIHelper.drawPanel(this, width / 2 - 200, height / 2 - 140, 400, 280, {
      fillColor: UIHelper.COLORS.panelBg,
      fillAlpha: 0.95,
      borderColor: UIHelper.COLORS.danger,
      borderAlpha: 0.7,
      radius: 12,
    });
    panel.setDepth(101);

    this.add.text(width / 2, height / 2 - 100, '游戏结束', {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '36px',
      color: '#e94560', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(102);

    this.add.text(width / 2, height / 2 - 40, desc || '你的旅程到此结束了……', {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '14px',
      color: UIHelper.COLORS.textSecondary, align: 'center',
    }).setOrigin(0.5).setDepth(102);

    UIHelper.createButton(this, width / 2, height / 2 + 50, 180, 44, '重新开始', {
      isPrimary: true, fontSize: '18px',
    }, () => {
      SaveLoad.deleteSave();
      this.scene.start('MenuScene');
    }).setDepth(102);
  }
}
