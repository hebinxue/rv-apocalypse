// Zombie.js - Zombie entity class for turn-based battles
class Zombie {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.hp = data.hp;
        this.maxHp = data.hp;
        this.attack = data.attack;
        this.defense = data.defense;
        this.speed = data.speed;
        this.isBoss = data.isBoss || false;
        this.phases = data.phases || [];
        this.drops = data.rewards ? (data.rewards.drops || []) : [];
        this.currentPhase = 0;
        this.summonCooldown = 0;
    }

    takeDamage(amount) {
        const actual = Math.max(1, amount - this.defense);
        this.hp = Math.max(0, this.hp - actual);
        if (this.isBoss) this.checkPhase();
        return this.hp <= 0;
    }

    checkPhase() {
        const hpPercent = this.hp / this.maxHp;
        for (let i = this.phases.length - 1; i >= 0; i--) {
            if (hpPercent <= this.phases[i].hpThreshold) {
                if (i !== this.currentPhase) {
                    this.currentPhase = i;
                    const phase = this.phases[i];
                    if (phase.buff) {
                        this.attack = this.attack + (phase.buff.attack || 0);
                        this.speed = this.speed + (phase.buff.speed || 0);
                    }
                }
                break;
            }
        }
    }

    getCurrentPhase() {
        return this.phases[this.currentPhase] || null;
    }

    shouldSummon() {
        if (!this.isBoss) return false;
        const phase = this.getCurrentPhase();
        if (!phase || phase.behavior !== 'summon') return false;
        if (this.summonCooldown > 0) {
            this.summonCooldown--;
            return false;
        }
        this.summonCooldown = (phase.summon && phase.summon.cooldown) || 3;
        return true;
    }

    rollDrops() {
        const dropped = [];
        for (const drop of this.drops) {
            if (Math.random() < drop.chance) dropped.push(drop.itemId);
        }
        return dropped;
    }
}
