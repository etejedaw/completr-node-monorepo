interface PendingRemoval<T> {
	item: T;
	previousKey: string | null;
}

export class PendingRemovals<T> {
	private readonly removals = new Map<string, PendingRemoval<T>>();

	constructor(private readonly keyOf: (item: T) => string) {}

	hide(item: T, visible: readonly T[]): T[] {
		const key = this.keyOf(item);
		const order = this.withPending(visible);
		const index = order.findIndex(
			candidate => this.keyOf(candidate) === key
		);
		const previousKey = index > 0 ? this.keyOf(order[index - 1]) : null;
		this.removals.set(key, { item, previousKey });
		return visible.filter(candidate => this.keyOf(candidate) !== key);
	}

	commit(item: T): void {
		const key = this.keyOf(item);
		const removal = this.removals.get(key);
		if (!removal) return;
		this.removals.delete(key);
		for (const other of this.removals.values()) {
			if (other.previousKey === key)
				other.previousKey = removal.previousKey;
		}
	}

	undo(item: T, visible: readonly T[]): T[] {
		const key = this.keyOf(item);
		if (!this.removals.has(key)) return [...visible];
		const order = this.withPending(visible);
		this.removals.delete(key);
		return this.withoutPending(order);
	}

	withPending(visible: readonly T[]): T[] {
		const order = this.withoutPending(visible);
		let remaining = [...this.removals.values()];
		while (remaining.length > 0) {
			const next =
				remaining.find(removal => this.isAnchored(order, removal)) ??
				remaining[0];
			order.splice(
				this.insertionIndex(order, next.previousKey),
				0,
				next.item
			);
			remaining = remaining.filter(removal => removal !== next);
		}
		return order;
	}

	withoutPending(items: readonly T[]): T[] {
		return items.filter(item => !this.removals.has(this.keyOf(item)));
	}

	private isAnchored(order: readonly T[], removal: PendingRemoval<T>) {
		return (
			removal.previousKey === null ||
			order.some(item => this.keyOf(item) === removal.previousKey)
		);
	}

	private insertionIndex(order: readonly T[], previousKey: string | null) {
		if (previousKey === null) return 0;
		const previousIndex = order.findIndex(
			item => this.keyOf(item) === previousKey
		);
		return previousIndex === -1 ? order.length : previousIndex + 1;
	}
}
