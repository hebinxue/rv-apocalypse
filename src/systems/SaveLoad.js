class SaveLoad {
    static SAVE_KEY = 'rv_apocalypse_save';

    static save(gameState) {
        try {
            localStorage.setItem(SaveLoad.SAVE_KEY, JSON.stringify(gameState));
            return true;
        } catch (e) {
            console.error('存档失败:', e);
            return false;
        }
    }

    static load() {
        try {
            const data = localStorage.getItem(SaveLoad.SAVE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('读档失败:', e);
            return null;
        }
    }

    static hasSave() {
        return localStorage.getItem(SaveLoad.SAVE_KEY) !== null;
    }

    static deleteSave() {
        localStorage.removeItem(SaveLoad.SAVE_KEY);
    }

    static getDefaultState() {
        return {
            player: {
                name: '玩家',
                hp: 100,
                maxHp: 100,
                attack: 10,
                defense: 5,
                speed: 10,
                hunger: 100,
                isSick: false,
                sickDays: 0
            },
            rv: {
                durability: 50,
                maxDurability: 50,
                capacity: 20,
                speed: 5,
                comfort: 1,
                defense: 0
            },
            inventory: [],
            rvStorage: [],
            npcs: {},
            currentScene: 'prologue',
            currentStoryNode: 'prologue',
            day: 1,
            timeOfDay: 'morning',
            chaptersUnlocked: ['chapter1'],
            battlesWon: 0
        };
    }
}
