class Dialogue {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.isActive = false;
        this.callback = null;
        this.dialogueQueue = [];
        this.currentHitArea = null;
    }

    show(dialogues, onComplete) {
        this.callback = onComplete;
        this.dialogueQueue = [...dialogues];
        this.isActive = true;
        this.showNext();
    }

    showNext() {
        // Clean up previous hit area listener
        if (this.currentHitArea) {
            this.currentHitArea.removeAllListeners('pointerdown');
            this.currentHitArea = null;
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

        // Full-screen transparent overlay to block clicks on underlying elements
        const fullOverlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.001)
            .setInteractive();
        this.container.add(fullOverlay);

        // Semi-transparent background
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x000000, 0.85);
        bg.fillRect(20, height - 170, width - 40, 150);
        this.container.add(bg);

        // Border
        const border = this.scene.add.graphics();
        border.lineStyle(1, 0x00c8ff, 0.5);
        border.strokeRect(20, height - 170, width - 40, 150);
        this.container.add(border);

        // Speaker name tag
        const speakerName = line.speaker === 'narrator' ? '' : line.speaker;
        if (speakerName) {
            const nameTag = this.scene.add.graphics();
            nameTag.fillStyle(0xe94560, 1);
            nameTag.fillRoundedRect(30, height - 185, 100, 28, 5);
            this.container.add(nameTag);

            const nameText = this.scene.add.text(80, height - 171, speakerName, {
                fontFamily: 'Microsoft YaHei, sans-serif',
                fontSize: '15px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            this.container.add(nameText);
        }

        // Dialogue text
        const text = this.scene.add.text(40, height - 150, '', {
            fontFamily: 'Microsoft YaHei, sans-serif',
            fontSize: '17px',
            color: '#ffffff',
            wordWrap: { width: width - 80 },
            lineSpacing: 6
        });
        this.container.add(text);

        // Typewriter effect
        let charIndex = 0;
        let typewriterDone = false;
        const fullText = line.text;
        const timer = this.scene.time.addEvent({
            delay: 30,
            callback: () => {
                if (charIndex > fullText.length) {
                    timer.remove();
                    typewriterDone = true;
                    return;
                }
                text.setText(fullText.substring(0, charIndex));
                charIndex++;
            },
            loop: true
        });

        // Click hint (blinking)
        const hint = this.scene.add.text(width / 2, height - 35, '▼ 点击继续', {
            fontFamily: 'Microsoft YaHei, sans-serif',
            fontSize: '13px',
            color: '#666'
        }).setOrigin(0.5);
        this.container.add(hint);
        this.scene.tweens.add({
            targets: hint,
            alpha: 0.3,
            duration: 600,
            yoyo: true,
            repeat: -1
        });

        // Clickable hit area - covers entire bottom section
        const hitY = height - 95;
        const hitH = 160;
        const hitArea = this.scene.add.rectangle(width / 2, hitY, width, hitH, 0x000000, 0.001)
            .setInteractive({ useHandCursor: true })
            .setDepth(10000);
        this.container.add(hitArea);
        this.currentHitArea = hitArea;

        const self = this;
        hitArea.on('pointerdown', function () {
            if (!typewriterDone && charIndex <= fullText.length) {
                // Skip typewriter, show full text immediately
                charIndex = fullText.length + 1;
                text.setText(fullText);
                timer.remove();
                typewriterDone = true;
            } else {
                // Go to next dialogue
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
        const overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4)
            .setInteractive();
        this.container.add(overlay);

        // Choice panel
        const panelH = choices.length * 60 + 40;
        const panelY = height / 2 - panelH / 2;

        const bg = this.scene.add.graphics();
        bg.fillStyle(0x111128, 0.95);
        bg.fillRoundedRect(width / 2 - 220, panelY, 440, panelH, 10);
        bg.lineStyle(1, 0x00c8ff, 0.5);
        bg.strokeRoundedRect(width / 2 - 220, panelY, 440, panelH, 10);
        this.container.add(bg);

        choices.forEach((choice, index) => {
            const btnY = panelY + 30 + index * 60;
            const btn = this.scene.add.text(
                width / 2,
                btnY,
                choice.text,
                {
                    fontFamily: 'Microsoft YaHei, sans-serif',
                    fontSize: '18px',
                    color: '#ffffff',
                    backgroundColor: '#1a1a2e',
                    padding: { x: 24, y: 10 }
                }
            ).setOrigin(0.5).setInteractive({ useHandCursor: true });

            btn.on('pointerover', () => {
                btn.setStyle({ backgroundColor: '#e94560' });
                btn.setScale(1.05);
            });
            btn.on('pointerout', () => {
                btn.setStyle({ backgroundColor: '#1a1a2e' });
                btn.setScale(1);
            });
            btn.on('pointerdown', () => {
                this.hide();
                onSelect(index);
            });

            this.container.add(btn);
        });
    }

    hide() {
        if (this.currentHitArea) {
            this.currentHitArea.removeAllListeners('pointerdown');
            this.currentHitArea = null;
        }
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
        this.isActive = false;
    }
}
