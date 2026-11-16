import { ScrollPositionMemory } from "./scroll-position-memory";

describe("ScrollPositionMemory", () => {
	it("recalls the last position remembered for a navigation", () => {
		const memory = new ScrollPositionMemory(3);

		memory.remember(1, 120);
		memory.remember(1, 480);

		expect(memory.recall(1)).toBe(480);
		expect(memory.recall(2)).toBeUndefined();
	});

	it("forgets the oldest navigation once the limit is passed", () => {
		const memory = new ScrollPositionMemory(3);

		for (let id = 1; id <= 10; id++) memory.remember(id, id * 100);

		expect(memory.size).toBe(3);
		expect(memory.recall(7)).toBeUndefined();
		expect(memory.recall(8)).toBe(800);
		expect(memory.recall(10)).toBe(1000);
	});

	it("keeps a navigation that was remembered again even if it is old", () => {
		const memory = new ScrollPositionMemory(2);

		memory.remember(1, 100);
		memory.remember(2, 200);
		memory.remember(1, 150);
		memory.remember(3, 300);

		expect(memory.recall(1)).toBe(150);
		expect(memory.recall(2)).toBeUndefined();
	});

	it("never stores a negative position from an overscroll bounce", () => {
		const memory = new ScrollPositionMemory(2);

		memory.remember(1, -40);

		expect(memory.recall(1)).toBe(0);
	});
});
