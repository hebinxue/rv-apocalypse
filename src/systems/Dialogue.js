class Dialogue {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.isActive = false;
        this.callback = null;
        this.dialogueQueue = [];
        this.currentHitArea = null;
        this._measureCanvas = null;
    }

    wrapText(text, maxWidth, fontSize) {
        if (!this._measureCanvas) {
            this._measureCanvas = document.createElement('canvas');
            this._measureCtx = this._measureCanvas.getContext('2d');
        }
        const ctx = this._measureCtx;
        ctx.font = `${fontSize}px Microsoft YaHei, sans-serif`;

        let result = '';
        let line = '';
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (ch === '\n') {
                result += line + '\n';
                line = '';
                continue;
            }
            const testLine = line + ch;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && line.length > 0) {
                result += line + '\n';
                line = ch;
            } else {
                line = testLine;
            }
        }
        result += line;
        return result;
    }

    show(dialogues, onComplete) {
        this.callback = onComplete;
        this.dialogueQueue = [...dialogues];
        this.isActive = true;
        this.showNext();
    }

    showNext() {
        if (this.currentHitArea) {
            this.currentHitArea.removeAllListeners('pointerdown');
            this.currentHitArea = null;
        }
        if (this._skipBtn) {
            this._skipBtn.destroy();
            this._skipBtn = null;
        }
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }

        if (this.dialogueQueue.length === 0) {
            this.isActive = false;
            if (this.callback) this.callback();
            return;
        }
        const line = this.dialogueQueue.shift();
        this.renderLine(line);
    }

    renderLine(line) {
        const { width, height } = this.scene.cameras.main;
        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(9999);

        // Full-screen transparent overlay to block clicks
        const fullOverlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.001)
            .setInteractive();
        this.container.add(fullOverlay);

        // Name mapping
        const nameMap = {
            'narrator': '', 'player': '你', '旁白': '',
            'wangzai': '旺仔', 'bingjie': '冰姐', 'caoge': '草哥', 'laojing': '老晶',
            'xuehe': '雪盒',
        };
        const speakerName = nameMap[line.speaker] !== undefined ? nameMap[line.speaker] : line.speaker;
        const isPlayer = line.speaker === 'player';
        const isNarrator = !speakerName;

        // Speaker color map
        const colorMap = {
            'player': { primary: 0x00c8ff, text: '#00c8ff' },
            'wangzai': { primary: 0xffaa00, text: '#ffaa00' },
            'bingjie': { primary: 0x66ccff, text: '#66ccff' },
            'caoge': { primary: 0x44dd66, text: '#44dd66' },
            'laojing': { primary: 0xccaa66, text: '#ccaa66' },
            'xuehe': { primary: 0xaa88ff, text: '#aa88ff' },
        };
        const speakerColor = colorMap[line.speaker] || { primary: 0xe94560, text: '#e94560' };

        const boxY = height - 175;
        const boxH = 155;

        // Character portrait (if image loaded, PNG or JPG)
        const portraitBase = `char_${line.speaker}`;
        const imageKey = SceneBackgrounds.findTexture(this.scene, portraitBase);
        const hasPortrait = !isNarrator && imageKey;
        const portraitW = hasPortrait ? 90 : 0;
        const portraitGap = hasPortrait ? 10 : 0;
        const boxLeft = 15 + portraitW + portraitGap;

        if (hasPortrait) {
            const portraitBg = this.scene.add.graphics();
            portraitBg.fillStyle(0x0a0a18, 0.92);
            portraitBg.fillRoundedRect(15, boxY - 10, portraitW + 6, boxH + 10, 8);
            portraitBg.lineStyle(1.5, speakerColor.primary, 0.5);
            portraitBg.strokeRoundedRect(15, boxY - 10, portraitW + 6, boxH + 10, 8);
            this.container.add(portraitBg);

            const portrait = this.scene.add.image(15 + 3 + portraitW / 2, boxY + boxH / 2, imageKey);
            // Maintain aspect ratio: fill the portrait area, center-crop overflow
            const tex = this.scene.textures.get(imageKey);
            const frame = tex.getSourceImage();
            const imgW = frame.width || frame.naturalWidth || 1;
            const imgH = frame.height || frame.naturalHeight || 1;
            const scaleX = portraitW / imgW;
            const scaleY = boxH / imgH;
            const fillScale = Math.max(scaleX, scaleY);
            portrait.setScale(fillScale);
            // Crop to portrait bounds
            const cropW = Math.min(imgW, portraitW / fillScale);
            const cropH = Math.min(imgH, boxH / fillScale);
            const cropX = (imgW - cropW) / 2;
            const cropY = (imgH - cropH) / 2;
            portrait.setCrop(cropX, cropY, cropW, cropH);
            this.container.add(portrait);
        }

        // Dialogue box — frosted glass panel
        const boxW = width - boxLeft - 15;
        const boxBg = this.scene.add.graphics();
        // Shadow
        boxBg.fillStyle(0x000000, 0.25);
        boxBg.fillRoundedRect(boxLeft + 2, boxY + 3, boxW, boxH, 10);
        // Base layer
        boxBg.fillStyle(0x0c0e1a, 0.9);
        boxBg.fillRoundedRect(boxLeft, boxY, boxW, boxH, 10);
        // Blue tint overlay (frosted feel)
        boxBg.fillStyle(0x1a2040, 0.1);
        boxBg.fillRoundedRect(boxLeft, boxY, boxW, boxH, 10);
        // Top highlight edge
        boxBg.lineStyle(1, 0xffffff, 0.04);
        boxBg.lineBetween(boxLeft + 10, boxY + 1, boxLeft + boxW - 10, boxY + 1);
        // Border
        boxBg.lineStyle(1.5, isNarrator ? 0x333355 : speakerColor.primary, isNarrator ? 0.35 : 0.5);
        boxBg.strokeRoundedRect(boxLeft, boxY, boxW, boxH, 10);
        // Inner glow
        boxBg.lineStyle(1, isNarrator ? 0x222244 : speakerColor.primary, 0.08);
        boxBg.strokeRoundedRect(boxLeft + 2, boxY + 2, boxW - 4, boxH - 4, 9);
        this.container.add(boxBg);

        // Accent bar on left
        if (!isNarrator) {
            const accent = this.scene.add.graphics();
            accent.fillStyle(speakerColor.primary, 0.8);
            accent.fillRoundedRect(boxLeft + 3, boxY + 10, 4, boxH - 20, 2);
            this.container.add(accent);
        }

        // Speaker name tag
        if (speakerName) {
            const tagW = Math.max(80, speakerName.length * 18 + 24);
            const nameTagBg = this.scene.add.graphics();
            nameTagBg.fillStyle(speakerColor.primary, 0.85);
            nameTagBg.fillRoundedRect(boxLeft + 15, boxY - 18, tagW, 30, 6);
            // Triangle pointer
            nameTagBg.fillStyle(speakerColor.primary, 0.85);
            nameTagBg.beginPath();
            nameTagBg.moveTo(boxLeft + 35, boxY + 12);
            nameTagBg.lineTo(boxLeft + 45, boxY + 22);
            nameTagBg.lineTo(boxLeft + 25, boxY + 22);
            nameTagBg.closePath();
            nameTagBg.fillPath();
            this.container.add(nameTagBg);

            const nameText = this.scene.add.text(boxLeft + 15 + tagW / 2, boxY - 3, speakerName, {
                fontFamily: 'Microsoft YaHei, sans-serif',
                fontSize: '15px',
                color: '#ffffff',
                fontStyle: 'bold',
            }).setOrigin(0.5);
            this.container.add(nameText);
        }

        // Dialogue text
        const textColor = isNarrator ? UIHelper.COLORS.textSecondary : UIHelper.COLORS.textPrimary;
        const textX = boxLeft + (isNarrator ? 20 : 30);
        const maxW = width - textX - 30;
        const text = this.scene.add.text(textX, boxY + 22, '', {
            fontFamily: 'Microsoft YaHei, sans-serif',
            fontSize: '16px',
            color: textColor,
            lineSpacing: 7,
        });
        this.container.add(text);

        // Wrap text for CJK support, then typewriter effect
        const fullText = this.wrapText(line.text, maxW, 16);
        let charIndex = 0;
        let typewriterDone = false;
        const timer = this.scene.time.addEvent({
            delay: 28,
            callback: () => {
                if (charIndex > fullText.length) {
                    timer.remove();
                    typewriterDone = true;
                    return;
                }
                text.setText(fullText.substring(0, charIndex));
                charIndex++;
            },
            loop: true,
        });

        // Click hint — pulsing circle
        const hint = this.scene.add.graphics();
        hint.fillStyle(0xffffff, 0.12);
        hint.fillCircle(width / 2, boxY + boxH - 14, 6);
        hint.fillStyle(0xffffff, 0.25);
        hint.fillCircle(width / 2, boxY + boxH - 14, 2.5);
        this.container.add(hint);
        this.scene.tweens.add({
            targets: hint, alpha: 0.3, scaleX: 0.7, scaleY: 0.7,
            duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });

        // Entrance animation — slide up + fade in
        this.container.setAlpha(0);
        this.container.y = 20;
        this.scene.tweens.add({
            targets: this.container,
            y: 0, alpha: 1,
            duration: 250,
            ease: 'Cubic.easeOut',
        });

        // Skip button (top-right of dialogue box) — outside container to avoid hitArea blocking
        if (this.dialogueQueue.length > 0) {
            const skipBtn = this.scene.add.text(width - 30, boxY + 8, '跳过 ▶▶', {
                fontFamily: 'Microsoft YaHei, sans-serif',
                fontSize: '12px',
                color: UIHelper.COLORS.textMuted,
            }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(10001);

            skipBtn.on('pointerover', () => skipBtn.setColor(UIHelper.COLORS.textPrimary));
            skipBtn.on('pointerout', () => skipBtn.setColor(UIHelper.COLORS.textMuted));
            skipBtn.on('pointerdown', () => {
                timer.remove();
                skipBtn.destroy();
                this.dialogueQueue = [];
                this.isActive = false;
                if (this.container) {
                    this.container.destroy();
                    this.container = null;
                }
                if (this.callback) this.callback();
            });

            // Store ref for cleanup when advancing to next line
            this._skipBtn = skipBtn;
        }

        // Clickable hit area
        const hitY = boxY + boxH / 2;
        const hitArea = this.scene.add.rectangle(width / 2, hitY, width, boxH + 30, 0x000000, 0.001)
            .setInteractive({ useHandCursor: true })
            .setDepth(10000);
        this.container.add(hitArea);
        this.currentHitArea = hitArea;

        const self = this;
        hitArea.on('pointerdown', function () {
            if (!typewriterDone && charIndex <= fullText.length) {
                charIndex = fullText.length + 1;
                text.setText(fullText);
                timer.remove();
                typewriterDone = true;
            } else {
                self.showNext();
            }
        });
    }

    showChoices(choices, onSelect) {
        if (this.container) this.container.destroy();

        const { width, height } = this.scene.cameras.main;
        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(9999);

        // Full-screen overlay
        const overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5)
            .setInteractive();
        this.container.add(overlay);

        // Choice panel — cinematic frosted panel
        const panelH = choices.length * 62 + 50;
        const panelY = height / 2 - panelH / 2;

        const bg = this.scene.add.graphics();
        // Shadow
        bg.fillStyle(0x000000, 0.3);
        bg.fillRoundedRect(width / 2 - 230 + 2, panelY + 3, 460, panelH, 12);
        // Base
        bg.fillStyle(0x0c0e1a, 0.95);
        bg.fillRoundedRect(width / 2 - 230, panelY, 460, panelH, 12);
        // Blue tint
        bg.fillStyle(0x1a2040, 0.08);
        bg.fillRoundedRect(width / 2 - 230, panelY, 460, panelH, 12);
        // Top highlight
        bg.lineStyle(1, 0xffffff, 0.04);
        bg.lineBetween(width / 2 - 218, panelY + 1, width / 2 + 218, panelY + 1);
        // Border
        bg.lineStyle(1.5, UIHelper.COLORS.border, 0.5);
        bg.strokeRoundedRect(width / 2 - 230, panelY, 460, panelH, 12);
        this.container.add(bg);

        // Title
        const titleText = this.scene.add.text(width / 2, panelY + 22, '做出你的选择', {
            fontFamily: 'Microsoft YaHei, sans-serif',
            fontSize: '14px',
            color: UIHelper.COLORS.textMuted,
        }).setOrigin(0.5);
        this.container.add(titleText);

        // Entrance animation
        this.container.setAlpha(0);
        this.container.y = 15;
        this.scene.tweens.add({
            targets: this.container,
            y: 0, alpha: 1,
            duration: 300,
            ease: 'Back.easeOut',
        });

        choices.forEach((choice, index) => {
            const btnY = panelY + 55 + index * 62;
            const btnW = 400;
            const btnH = 48;

            const btnBg = this.scene.add.graphics();
            btnBg.fillStyle(0x151528, 1);
            btnBg.fillRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
            btnBg.lineStyle(1, UIHelper.COLORS.info, 0.3);
            btnBg.strokeRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
            this.container.add(btnBg);

            // Glow layer
            const btnGlow = this.scene.add.graphics();
            this.container.add(btnGlow);

            const btn = this.scene.add.text(width / 2, btnY, choice.text, {
                fontFamily: 'Microsoft YaHei, sans-serif',
                fontSize: '16px',
                color: UIHelper.COLORS.textPrimary,
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            this.container.add(btn);

            btn.on('pointerover', () => {
                btnGlow.clear();
                btnGlow.fillStyle(UIHelper.COLORS.info, 0.05);
                btnGlow.fillRoundedRect(width / 2 - btnW / 2 - 3, btnY - btnH / 2 - 3, btnW + 6, btnH + 6, 10);
                btnBg.clear();
                btnBg.fillStyle(0x1a2040, 1);
                btnBg.fillRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
                btnBg.lineStyle(1.5, UIHelper.COLORS.info, 0.8);
                btnBg.strokeRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
                btn.setColor(UIHelper.COLORS.textPrimary);
                btn.setScale(1.02);
            });
            btn.on('pointerout', () => {
                btnGlow.clear();
                btnBg.clear();
                btnBg.fillStyle(0x151528, 1);
                btnBg.fillRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
                btnBg.lineStyle(1, UIHelper.COLORS.info, 0.3);
                btnBg.strokeRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
                btn.setColor(UIHelper.COLORS.textPrimary);
                btn.setScale(1);
            });
            btn.on('pointerdown', () => {
                btn.setScale(0.95);
                this.scene.time.delayedCall(80, () => {
                    this.hide();
                    onSelect(index);
                });
            });
        });
    }

    hide() {
        if (this.currentHitArea) {
            this.currentHitArea.removeAllListeners('pointerdown');
            this.currentHitArea = null;
        }
        if (this._skipBtn) {
            this._skipBtn.destroy();
            this._skipBtn = null;
        }
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
        this.isActive = false;
    }
}
