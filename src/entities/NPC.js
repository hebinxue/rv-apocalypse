class NPC {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.isPermanent = data.isPermanent || false;
        this.personality = data.personality;
        this.role = data.role;
        this.stats = { ...data.baseStats };
        this.skills = data.skills;
        this.dialogues = data.dialogues;
        this.affinity = data.isPermanent ? 80 : 50;
        this.recruited = data.isPermanent;
        this.couplePartner = data.couplePartner || null;
    }

    getAvailableSkills() {
        return this.skills.filter(s => this.affinity >= s.unlockAffinity);
    }

    getDialogue(type) {
        const pool = this.dialogues[type] || this.dialogues.neutral;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    changeAffinity(amount) {
        const old = this.affinity;
        this.affinity = Math.max(0, Math.min(100, this.affinity + amount));
        const result = { name: this.name, old, current: this.affinity, change: amount };

        if (this.affinity <= 20 && !this.isPermanent && old > 20) {
            result.event = 'warning';
            result.message = `${this.name} 的好感度很低，可能会离开...`;
        }
        if (this.affinity <= 0 && !this.isPermanent) {
            result.event = 'left';
            result.message = `${this.name} 在一个夜晚悄悄离开了...留下了一封告别信。`;
        }
        return result;
    }

    getCombatAction() {
        if (this.affinity >= 80) return 'aggressive';
        if (this.affinity >= 50) return 'normal';
        if (this.affinity >= 20) return 'passive';
        return 'refuse';
    }

    toJSON() {
        return {
            id: this.id,
            affinity: this.affinity,
            recruited: this.recruited,
            stats: this.stats
        };
    }

    static fromJSON(saveData, npcData) {
        const npc = new NPC(npcData);
        npc.affinity = saveData.affinity;
        npc.recruited = saveData.recruited;
        npc.stats = saveData.stats;
        return npc;
    }
}
