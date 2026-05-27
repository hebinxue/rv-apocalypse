class Inventory {
    constructor(maxSlots = 10) {
        this.items = []; // { id, quantity }
        this.maxSlots = maxSlots;
    }

    addItem(itemId, quantity = 1) {
        const existing = this.items.find(i => i.id === itemId);
        if (existing) {
            existing.quantity += quantity;
            return true;
        }
        if (this.items.length >= this.maxSlots) {
            return false; // backpack full
        }
        this.items.push({ id: itemId, quantity });
        return true;
    }

    removeItem(itemId, quantity = 1) {
        const existing = this.items.find(i => i.id === itemId);
        if (!existing || existing.quantity < quantity) return false;
        existing.quantity -= quantity;
        if (existing.quantity <= 0) {
            this.items = this.items.filter(i => i.id !== itemId);
        }
        return true;
    }

    hasItem(itemId, quantity = 1) {
        const existing = this.items.find(i => i.id === itemId);
        return existing && existing.quantity >= quantity;
    }

    getCount(itemId) {
        const existing = this.items.find(i => i.id === itemId);
        return existing ? existing.quantity : 0;
    }

    isFull() {
        return this.items.length >= this.maxSlots;
    }

    getSlotsUsed() {
        return this.items.length;
    }

    toJSON() {
        return { items: this.items, maxSlots: this.maxSlots };
    }

    static fromJSON(data) {
        const inv = new Inventory(data.maxSlots);
        inv.items = data.items;
        return inv;
    }
}
