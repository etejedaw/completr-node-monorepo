export class ScrollPositionMemory {
	private readonly positions = new Map<number, number>();

	constructor(private readonly limit: number) {}

	remember(navigationId: number, position: number): void {
		this.positions.delete(navigationId);
		this.positions.set(navigationId, Math.max(0, position));
		if (this.positions.size <= this.limit) return;
		const oldest = this.positions.keys().next().value;
		if (oldest !== undefined) this.positions.delete(oldest);
	}

	recall(navigationId: number): number | undefined {
		return this.positions.get(navigationId);
	}

	get size(): number {
		return this.positions.size;
	}
}
