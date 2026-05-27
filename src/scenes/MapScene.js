// MapScene.js - Road map with nodes, status bar, and scene transitions
class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapScene' });

    // Ordered list of story nodes displayed on the map (linear path)
    this.storyPath = [
      'intro',
      'gas_station',
      'supermarket',
      'apartment_laojing',
      'hospital',
      'highway',
      'safe_zone',
    ];

    // Map node positions (7 nodes)
    this.nodePositions = {
      intro:            { x: 80,  y: 150, name: '城市公寓' },
      gas_station:      { x: 220, y: 250, name: '加油站' },
      supermarket:      { x: 380, y: 180, name: '超市' },
      apartment_laojing:{ x: 500, y: 300, name: '居民楼' },
      hospital:         { x: 620, y: 200, name: '废弃医院' },
      highway:          { x: 700, y: 350, name: '高速公路' },
      safe_zone:        { x: 750, y: 150, name: '安全区' },
    };
  }

  init(data) {
    // Receive gameState from previous scene or load from save
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
    for (let gx = 0; gx < width; gx += 40) {
      grid.lineBetween(gx, 0, gx, height);
    }
    for (let gy = 0; gy < height; gy += 40) {
      grid.lineBetween(0, gy, width, gy);
    }

    // --- Title ---
    this.add.text(width / 2, 70, '末日公路', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '36px',
      color: '#ccd6f6',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 102, '第一章：丧尸围城', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#4a5568',
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
  }

  // ============================================================
  //  STATUS BAR
  // ============================================================
  renderStatusBar() {
    const { width } = this.cameras.main;
    const gs = this.gameState;
    const y = 12;

    // Background strip
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
      const iconText = this.add.text(sx - 24, y + 6, s.icon, {
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
  //  PATH LINES
  // ============================================================
  drawPaths() {
    const graphics = this.add.graphics();
    const progressGraphics = this.add.graphics();

    // Determine how far the player has progressed
    const currentIdx = this.storyPath.indexOf(this.gameState.currentStoryNode);
    // Nodes before (and including) current are "completed path"
    const completedUpTo = Math.max(0, currentIdx);

    for (let i = 0; i < this.storyPath.length - 1; i++) {
      const fromNode = this.nodePositions[this.storyPath[i]];
      const toNode = this.nodePositions[this.storyPath[i + 1]];

      // Gray base line (all connections)
      graphics.lineStyle(3, 0x333355, 0.6);
      graphics.lineBetween(fromNode.x, fromNode.y, toNode.x, toNode.y);

      // Red progress line for completed segments
      if (i < completedUpTo) {
        progressGraphics.lineStyle(3, 0xe94560, 0.85);
        progressGraphics.lineBetween(fromNode.x, fromNode.y, toNode.x, toNode.y);
      }
    }
  }

  // ============================================================
  //  MAP NODES
  // ============================================================
  drawNodes() {
    const currentIdx = this.storyPath.indexOf(this.gameState.currentStoryNode);

    this.storyPath.forEach((nodeId, index) => {
      const pos = this.nodePositions[nodeId];
      if (!pos) return;

      const isCurrent = index === currentIdx;
      const isPast = index < currentIdx;
      const isFuture = index > currentIdx;

      // Node circle
      const radius = isCurrent ? 18 : 14;
      const color = isCurrent ? 0xe94560 : isPast ? 0x555577 : 0x2a2a44;
      const borderColor = isCurrent ? 0xff6b81 : isPast ? 0x7777aa : 0x3a3a5e;

      const nodeGraphic = this.add.graphics();
      nodeGraphic.fillStyle(color, 1);
      nodeGraphic.fillCircle(pos.x, pos.y, radius);
      nodeGraphic.lineStyle(2, borderColor, 1);
      nodeGraphic.strokeCircle(pos.x, pos.y, radius);

      // Pulsing animation for current node
      if (isCurrent) {
        const pulseRing = this.add.graphics();
        pulseRing.lineStyle(2, 0xe94560, 0.5);
        pulseRing.strokeCircle(pos.x, pos.y, radius);
        this.tweens.add({
          targets: pulseRing,
          scaleX: 1.6,
          scaleY: 1.6,
          alpha: 0,
          duration: 1200,
          ease: 'Sine.easeOut',
          repeat: -1,
          yoyo: false,
          onRepeat: () => {
            pulseRing.setScale(1);
            pulseRing.setAlpha(0.5);
          },
        });
      }

      // Node number / icon
      const numberText = isPast ? '✓' : String(index + 1);
      this.add.text(pos.x, pos.y, numberText, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: isCurrent ? '14px' : '12px',
        color: isCurrent ? '#ffffff' : isPast ? '#aaaacc' : '#666688',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      // Location name label
      const labelColor = isCurrent ? '#e94560' : isPast ? '#8888aa' : '#4a4a6a';
      const labelY = pos.y + radius + 10;
      this.add.text(pos.x, labelY, pos.name, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: labelColor,
      }).setOrigin(0.5);

      // Clickable area for current and adjacent nodes
      const hitArea = this.add.circle(pos.x, pos.y, radius + 8, 0x000000, 0.001)
        .setInteractive({ useHandCursor: isCurrent || isPast });

      if (isCurrent) {
        hitArea.on('pointerover', () => {
          nodeGraphic.clear();
          nodeGraphic.fillStyle(0xff4060, 1);
          nodeGraphic.fillCircle(pos.x, pos.y, radius);
          nodeGraphic.lineStyle(2, 0xff8090, 1);
          nodeGraphic.strokeCircle(pos.x, pos.y, radius);
        });
        hitArea.on('pointerout', () => {
          nodeGraphic.clear();
          nodeGraphic.fillStyle(0xe94560, 1);
          nodeGraphic.fillCircle(pos.x, pos.y, radius);
          nodeGraphic.lineStyle(2, 0xff6b81, 1);
          nodeGraphic.strokeCircle(pos.x, pos.y, radius);
        });
        hitArea.on('pointerdown', () => {
          this.enterScene(nodeId);
        });
      }
    });
  }

  // ============================================================
  //  RV ICON
  // ============================================================
  createRVIcon() {
    const currentIdx = this.storyPath.indexOf(this.gameState.currentStoryNode);
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
    const btnX = 80;
    const btnY = height - 50;
    const btnW = 140;
    const btnH = 36;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x1a1a2e, 1);
    btnBg.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 6);
    btnBg.lineStyle(1, 0x00c8ff, 0.5);
    btnBg.strokeRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 6);

    const btnText = this.add.text(btnX, btnY, '🚐 进入房车', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '15px',
      color: '#ccd6f6',
    }).setOrigin(0.5);

    const hitArea = this.add.rectangle(btnX, btnY, btnW, btnH)
      .setInteractive({ useHandCursor: true })
      .setOrigin(0.5)
      .setAlpha(0.001);

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

    // If the node has an ending, show it and return to menu
    if (storyNode.ending) {
      this.showEnding(storyNode.ending);
      return;
    }

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
      // Pre-compute next node for post-battle advancement
      const nextNode = storyNode.next || null;
      SaveLoad.save(this.gameState);
      this.scene.start('BattleScene', {
        gameState: this.gameState,
        battleData: storyNode.forcedBattle,
        storyNodeId: storyNode.id,
        returnScene: 'MapScene',
        onComplete: (gameState) => {
          // Advance story node before returning to map
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

    // If there are choices, show them
    if (storyNode.choices && storyNode.choices.length > 0) {
      this.showChoices(storyNode);
      return;
    }

    // Show explore / continue choice
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
        this.scene.restart({ gameState: this.gameState });
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
      // Advance day
      this.gameState.day = (this.gameState.day || 1) + 1;
      SaveLoad.save(this.gameState);
      this.scene.restart({ gameState: this.gameState });
    } else {
      // No next node - stay on map
      SaveLoad.save(this.gameState);
    }
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

      // Play ending dialogues
      const dialogueSystem = new Dialogue(this);
      dialogueSystem.show(ending.dialogues, () => {
        // After ending dialogue, show "return to menu" button
        const returnBtn = this.add.text(width / 2, height / 2 + 100, '返回主菜单', {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '20px',
          color: '#ccd6f6',
          backgroundColor: '#1a1a2e',
          padding: { x: 30, y: 12 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        returnBtn.on('pointerover', () => returnBtn.setColor('#00c8ff'));
        returnBtn.on('pointerout', () => returnBtn.setColor('#ccd6f6'));
        returnBtn.on('pointerdown', () => {
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
}
