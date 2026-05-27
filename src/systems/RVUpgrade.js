class RVUpgrade {
    constructor(rvState) {
        this.durability = rvState.durability;
        this.maxDurability = rvState.maxDurability;
        this.capacity = rvState.capacity;
        this.speed = rvState.speed;
        this.comfort = rvState.comfort;
        this.defense = rvState.defense;
    }

    getUpgrades() {
        return [
            {
                id: 'reinforce_body',
                name: '强化车身',
                description: '增加耐久度上限 +20',
                cost: { scrap_metal: 3, screws: 2 },
                apply: (rv) => { rv.maxDurability += 20; rv.durability += 20; }
            },
            {
                id: 'expand_cargo',
                name: '扩建车厢',
                description: '增加背包容量 +5',
                cost: { scrap_metal: 4, cloth: 2 },
                apply: (rv) => { rv.capacity += 5; }
            },
            {
                id: 'armor_plates',
                name: '加装铁板',
                description: '防御力 +5',
                cost: { scrap_metal: 5, screws: 3 },
                apply: (rv) => { rv.defense += 5; }
            },
            {
                id: 'engine_upgrade',
                name: '改装引擎',
                description: '速度 +3',
                cost: { wire: 3, scrap_metal: 2 },
                apply: (rv) => { rv.speed += 3; }
            },
            {
                id: 'interior_decor',
                name: '内部装修',
                description: '舒适度 +1（NPC 好感加成）',
                cost: { cloth: 3, wire: 1 },
                apply: (rv) => { rv.comfort += 1; }
            }
        ];
    }

    canUpgrade(upgradeId, inventory) {
        const upgrade = this.getUpgrades().find(u => u.id === upgradeId);
        if (!upgrade) return false;
        for (const [itemId, qty] of Object.entries(upgrade.cost)) {
            if (!inventory.hasItem(itemId, qty)) return false;
        }
        return true;
    }

    doUpgrade(upgradeId, inventory) {
        const upgrade = this.getUpgrades().find(u => u.id === upgradeId);
        if (!this.canUpgrade(upgradeId, inventory)) return false;
        for (const [itemId, qty] of Object.entries(upgrade.cost)) {
            inventory.removeItem(itemId, qty);
        }
        upgrade.apply(this);
        return true;
    }

    repair(amount, inventory) {
        const needed = Math.ceil(amount / 10);
        const have = inventory.getCount('scrap_metal');
        const used = Math.min(needed, have);
        inventory.removeItem('scrap_metal', used);
        this.durability = Math.min(this.maxDurability, this.durability + used * 10);
        return used;
    }

    takeDamage(amount) {
        const actual = Math.max(1, amount - this.defense);
        this.durability = Math.max(0, this.durability - actual);
        return this.durability <= 0; // returns true if destroyed
    }

    toJSON() {
        return {
            durability: this.durability,
            maxDurability: this.maxDurability,
            capacity: this.capacity,
            speed: this.speed,
            comfort: this.comfort,
            defense: this.defense
        };
    }
}
