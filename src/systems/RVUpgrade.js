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
                unlockNode: 'gas_station_search_parts',
                unlockHint: '在废弃车辆旁学会改装',
                cost: { scrap_metal: 3, screws: 2 },
                apply: (rv) => { rv.maxDurability += 20; rv.durability += 20; }
            },
            {
                id: 'expand_cargo',
                name: '扩建车厢',
                description: '增加背包容量 +5',
                unlockNode: 'apartment_laojing',
                unlockHint: '老晶加入后需要更多空间',
                cost: { scrap_metal: 4, cloth: 2 },
                apply: (rv) => { rv.capacity += 5; }
            },
            {
                id: 'armor_plates',
                name: '加装铁板',
                description: '防御力 +5',
                unlockNode: 'hospital',
                unlockHint: '经历医院战斗后领悟',
                cost: { scrap_metal: 5, screws: 3 },
                apply: (rv) => { rv.defense += 5; }
            },
            {
                id: 'engine_upgrade',
                name: '改装引擎',
                description: '速度 +3',
                unlockNode: 'gas_station_search_parts',
                unlockHint: '在废弃车辆旁学会改装',
                cost: { wire: 3, scrap_metal: 2 },
                apply: (rv) => { rv.speed += 3; }
            },
            {
                id: 'interior_decor',
                name: '内部装修',
                description: '舒适度 +1（NPC 好感加成）',
                unlockNode: 'highway',
                unlockHint: '前往安全区的路上获得了改装灵感',
                cost: { cloth: 3, wire: 1 },
                apply: (rv) => { rv.comfort += 1; }
            }
        ];
    }

    static STORY_ORDER = [
        'intro',
        'gas_station',
        'gas_station_explore',
        'gas_station_rescue',
        'gas_station_trap',
        'gas_station_observe',
        'gas_station_engine',
        'gas_station_fix_self',
        'gas_station_search_parts',
        'gas_station_walk',
        'supermarket',
        'apartment_laojing',
        'laojing_rejected',
        'hospital',
        'highway',
        'highway_fast_path',
        'highway_mountain_path',
        'safe_zone'
    ];

    static isNodeVisited(currentStoryNode, targetNode) {
        const currentIdx = RVUpgrade.STORY_ORDER.indexOf(currentStoryNode);
        const targetIdx = RVUpgrade.STORY_ORDER.indexOf(targetNode);
        if (currentIdx === -1 || targetIdx === -1) return false;
        return currentIdx >= targetIdx;
    }

    isUpgradeUnlocked(upgradeId, currentStoryNode) {
        const upgrade = this.getUpgrades().find(u => u.id === upgradeId);
        if (!upgrade || !upgrade.unlockNode) return true;
        return RVUpgrade.isNodeVisited(currentStoryNode, upgrade.unlockNode);
    }

    canUpgrade(upgradeId, inventory, currentStoryNode) {
        const upgrade = this.getUpgrades().find(u => u.id === upgradeId);
        if (!upgrade) return false;
        if (upgrade.unlockNode && !RVUpgrade.isNodeVisited(currentStoryNode, upgrade.unlockNode)) {
            return false;
        }
        for (const [itemId, qty] of Object.entries(upgrade.cost)) {
            if (!inventory.hasItem(itemId, qty)) return false;
        }
        return true;
    }

    doUpgrade(upgradeId, inventory) {
        const upgrade = this.getUpgrades().find(u => u.id === upgradeId);
        if (!upgrade) return false;
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
