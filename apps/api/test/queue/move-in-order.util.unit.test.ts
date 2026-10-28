import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { moveInOrder } from "../../src/queue/move-in-order.util";

const IDS = ["a", "b", "c", "d"];

void describe("moveInOrder", () => {
	void it("moves an entry to the top", () => {
		assert.deepEqual(moveInOrder(IDS, "c", 1), ["c", "a", "b", "d"]);
	});

	void it("moves an entry to the middle shifting the others", () => {
		assert.deepEqual(moveInOrder(IDS, "a", 3), ["b", "c", "a", "d"]);
	});

	void it("moves an entry to the last position", () => {
		assert.deepEqual(moveInOrder(IDS, "a", 4), ["b", "c", "d", "a"]);
	});

	void it("clamps positions beyond the end to the last place", () => {
		assert.deepEqual(moveInOrder(IDS, "a", 999), ["b", "c", "d", "a"]);
	});

	void it("clamps positions below one to the first place", () => {
		assert.deepEqual(moveInOrder(IDS, "d", 0), ["d", "a", "b", "c"]);
		assert.deepEqual(moveInOrder(IDS, "d", -5), ["d", "a", "b", "c"]);
	});

	void it("keeps the order when the entry is already there", () => {
		assert.deepEqual(moveInOrder(IDS, "b", 2), IDS);
	});

	void it("returns null for an id that is not in the order", () => {
		assert.equal(moveInOrder(IDS, "x", 1), null);
		assert.equal(moveInOrder([], "a", 1), null);
	});

	void it("does not mutate the input", () => {
		const input = [...IDS];
		moveInOrder(input, "d", 1);
		assert.deepEqual(input, IDS);
	});
});
