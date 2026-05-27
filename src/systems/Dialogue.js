class Dialogue {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.isActive = false;
        this.callback = null;
        this.dialogueQueue = [];
    }

    show(dialogues, onComplete) {
        this.callback = onComplete;
        this.dialogueQueue = [...dialogues];
        this.isActive = true;
        this.showNext();
    }

    showNext() {
        if (this.dialogueQueue.length === 0) {
            this.hide();
            if (this.callback) this.callback();
            return;
        }
        const line = this.dialogueQueue.shift();
        this.renderLine(line);
    }

    renderLine(line) {
        if (this.container) this.container.destroy();

        const { width, height } = this.scene.cameras.main;
        this.container = this.scene.add.container(0, 0);

        // Semi-transparent background
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x000000, 0.7);
        bg.fillRect(20, height - 160, width - 40, 140);
        this.container.add(bg);

        // Speaker name tag
        const speakerName = line.speaker === 'narrator' ? '' : line.speaker;
        if (speakerName) {
            const nameTag = this.scene.add.graphics();
            nameTag.fillStyle(0xe94560, 1);
            nameTag.fillRoundedRect(30, height - 175, 100, 30, 5);
            this.container.add(nameTag);

            const nameText = this.scene.add.text(80, height - 168, speakerName, {
                fontFamily: 'Microsoft YaHei, sans-serif',
                fontSize: '16px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            this.container.add(nameText);
        }

        // Dialogue text
        const text = this.scene.add.text(40, height - 140, '', {
            fontFamily: 'Microsoft YaHei, sans-serif',
            fontSize: '18px',
            color: '#ffffff',
            wordWrap: { width: width - 80 }
        });
        this.container.add(text);

        // Typewriter effect
        let charIndex = 0;
        const fullText = line.text;
        const timer = this.scene.time.addEvent({
            delay: 30,
            callback: () => {
                text.setText(fullText.substring(0, charIndex));
                charIndex++;
                if (charIndex > fullText.length) {
                    timer.remove();
                }
            },
            loop: true
        });

        // Click hint
        const hint = this.scene.add.text(width - 60, height - 40, '▼', {
            fontFamily: 'Microsoft YaHei, sans-serif',
            fontSize: '20px',
            color: '#888'
        }).setOrigin(0.5);
        this.container.add(hint);

        // Click to continue
        this.scene.input.once('pointerdown', () => {
            if (charIndex < fullText.length) {
                charIndex = fullText.length;
                text.setText(fullText);
                timer.remove();
            } else {
                this.showNext();
            }
        });
    }

    showChoices(choices, onSelect) {
        if (this.container) this.container.destroy();

        const { width, height } = this.scene.cameras.main;
        this.container = this.scene.add.container(0, 0);

        // Background
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x000000, 0.8);
        bg.fillRect(width / 2 - 200, height / 2 - 100, 400, choices.length * 60 + 40);
        this.container.add(bg);

        choices.forEach((choice, index) => {
            const btn = this.scene.add.text(
                width / 2,
                height / 2 - 60 + index * 60,
                choice.text,
                {
                    fontFamily: 'Microsoft YaHei, sans-serif',
                    fontSize: '20px',
                    color: '#ffffff',
                    backgroundColor: '#333333',
                    padding: { x: 20, y: 10 }
                }
            ).setOrigin(0.5).setInteractive({ useHandCursor: true });

            btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#e94560' }));
            btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#333333' }));
            btn.on('pointerdown', () => {
                this.hide();
                onSelect(index);
            });

            this.container.add(btn);
        });
    }

    hide() {
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
        this.isActive = false;
    }
}
