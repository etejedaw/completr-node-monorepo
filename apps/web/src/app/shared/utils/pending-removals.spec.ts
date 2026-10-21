import { PendingRemovals } from "./pending-removals";

describe("PendingRemovals", () => {
	let removals: PendingRemovals<string>;

	beforeEach(() => {
		removals = new PendingRemovals<string>(item => item);
	});

	it("hides an item from the visible list", () => {
		expect(removals.hide("b", ["a", "b", "c"])).toEqual(["a", "c"]);
		expect(removals.withoutPending(["a", "b", "c"])).toEqual(["a", "c"]);
	});

	it("puts a hidden item back after its previous neighbour", () => {
		const visible = removals.hide("b", ["a", "b", "c"]);

		expect(removals.withPending(visible)).toEqual(["a", "b", "c"]);
		expect(removals.withPending(["c", "a"])).toEqual(["c", "a", "b"]);
	});

	it("keeps a hidden first item at the top", () => {
		removals.hide("a", ["a", "b", "c"]);

		expect(removals.withPending(["c", "b"])).toEqual(["a", "c", "b"]);
	});

	it("sends a hidden item to the end when its neighbour is gone", () => {
		removals.hide("b", ["a", "b", "c"]);

		expect(removals.withPending(["c"])).toEqual(["c", "b"]);
	});

	it("keeps the relative order of two hidden neighbours", () => {
		let visible = removals.hide("c", ["a", "b", "c", "d"]);
		visible = removals.hide("b", visible);

		expect(visible).toEqual(["a", "d"]);
		expect(removals.withPending(["d", "a"])).toEqual(["d", "a", "b", "c"]);
	});

	it("re-anchors the remaining item when its neighbour is committed", () => {
		const visible = removals.hide("b", ["a", "b", "c", "d"]);
		expect(removals.hide("c", visible)).toEqual(["a", "d"]);
		removals.commit("b");

		expect(removals.withPending(["d", "a"])).toEqual(["d", "a", "c"]);
	});

	it("restores an undone item into the current order", () => {
		const visible = removals.hide("b", ["a", "b", "c", "d"]);
		expect(removals.hide("c", visible)).toEqual(["a", "d"]);

		expect(removals.undo("c", ["d", "a"])).toEqual(["d", "a", "c"]);
		expect(removals.withPending(["d", "a", "c"])).toEqual([
			"d",
			"a",
			"b",
			"c"
		]);
	});

	it("filters out items that are pending removal", () => {
		removals.hide("b", ["a", "b", "c"]);

		expect(removals.withoutPending(["c", "b", "a"])).toEqual(["c", "a"]);
	});

	it("ignores items that are not pending", () => {
		removals.commit("x");

		expect(removals.undo("x", ["a"])).toEqual(["a"]);
		expect(removals.withPending(["a"])).toEqual(["a"]);
	});
});
