import { arrangeIntoFullOrder, moveIntoFullOrder } from "./full-order";

describe("moveIntoFullOrder", () => {
	it("returns the visible order when nothing is hidden", () => {
		expect(
			moveIntoFullOrder(["a", "b", "c"], "c", ["a", "c", "b"])
		).toEqual(["a", "c", "b"]);
		expect(
			moveIntoFullOrder(["a", "b", "c"], "a", ["b", "a", "c"])
		).toEqual(["b", "a", "c"]);
		expect(
			moveIntoFullOrder(["a", "b", "c"], "a", ["b", "c", "a"])
		).toEqual(["b", "c", "a"]);
	});

	it("moves up right before the next visible entry, past hidden ones in between", () => {
		expect(
			moveIntoFullOrder(["a", "x", "b", "y", "c"], "c", ["a", "c", "b"])
		).toEqual(["a", "x", "c", "b", "y"]);
	});

	it("moves down right before the next visible entry", () => {
		expect(
			moveIntoFullOrder(["a", "x", "b", "y", "c"], "a", ["b", "a", "c"])
		).toEqual(["x", "b", "y", "a", "c"]);
	});

	it("moves to the last visible place right after the previous visible entry", () => {
		expect(
			moveIntoFullOrder(["a", "x", "b", "y", "c", "z"], "a", [
				"b",
				"c",
				"a"
			])
		).toEqual(["x", "b", "y", "c", "a", "z"]);
	});

	it("drags to the first visible place ahead of hidden entries after it", () => {
		expect(
			moveIntoFullOrder(["x", "a", "y", "b", "c"], "c", ["c", "a", "b"])
		).toEqual(["x", "c", "a", "y", "b"]);
	});

	it("keeps the relative order of hidden entries before, between and after", () => {
		const moved = moveIntoFullOrder(
			["h1", "a", "h2", "b", "h3", "c", "h4"],
			"b",
			["b", "a", "c"]
		);

		expect(moved).toEqual(["h1", "b", "a", "h2", "h3", "c", "h4"]);
		expect(moved.filter(id => id.startsWith("h"))).toEqual([
			"h1",
			"h2",
			"h3",
			"h4"
		]);
	});

	it("anchors to a pending removal that is part of the visible order", () => {
		expect(
			moveIntoFullOrder(["a", "p", "x", "c"], "c", ["c", "a", "p"])
		).toEqual(["c", "a", "p", "x"]);
		expect(
			moveIntoFullOrder(["a", "p", "c"], "c", ["a", "c", "p"])
		).toEqual(["a", "c", "p"]);
	});

	it("skips visible entries the server no longer has", () => {
		expect(
			moveIntoFullOrder(["a", "x", "c"], "c", ["c", "gone", "a"])
		).toEqual(["c", "a", "x"]);
	});

	it("leaves the order untouched when the moved entry is unknown or alone", () => {
		expect(moveIntoFullOrder(["a", "b"], "z", ["z", "a"])).toEqual([
			"a",
			"b"
		]);
		expect(moveIntoFullOrder(["x", "a", "y"], "a", ["a"])).toEqual([
			"x",
			"a",
			"y"
		]);
	});
});

describe("arrangeIntoFullOrder", () => {
	it("returns the visible order when nothing is hidden", () => {
		expect(arrangeIntoFullOrder(["a", "b", "c"], ["c", "a", "b"])).toEqual([
			"c",
			"a",
			"b"
		]);
	});

	it("fills the places of the visible entries and leaves hidden ones where they are", () => {
		expect(
			arrangeIntoFullOrder(["a", "x", "b", "y", "c"], ["c", "b", "a"])
		).toEqual(["c", "x", "b", "y", "a"]);
	});

	it("ignores visible entries the server no longer has", () => {
		expect(
			arrangeIntoFullOrder(["a", "x", "c"], ["c", "gone", "a"])
		).toEqual(["c", "x", "a"]);
	});
});
