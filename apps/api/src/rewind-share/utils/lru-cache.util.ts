export class LruCache<Value> {
	private readonly entries = new Map<string, Value>();

	constructor(private readonly capacity: number) {}

	get size(): number {
		return this.entries.size;
	}

	get(key: string): Value | undefined {
		const value = this.entries.get(key);
		if (value === undefined) return undefined;
		this.entries.delete(key);
		this.entries.set(key, value);
		return value;
	}

	set(key: string, value: Value): void {
		this.entries.delete(key);
		this.entries.set(key, value);
		this.evictOverflow();
	}

	delete(key: string): void {
		this.entries.delete(key);
	}

	clear(): void {
		this.entries.clear();
	}

	private evictOverflow(): void {
		while (this.entries.size > this.capacity) {
			const oldestKey = this.entries.keys().next().value;
			if (oldestKey === undefined) return;
			this.entries.delete(oldestKey);
		}
	}
}
