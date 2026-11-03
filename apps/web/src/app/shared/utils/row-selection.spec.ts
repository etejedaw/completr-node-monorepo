import { signal } from "@angular/core";

import { injectRowSelection } from "./row-selection";

interface Row {
	id: string;
	title: string;
}

function rows(...ids: string[]): Row[] {
	return ids.map(id => ({ id, title: `Game ${id}` }));
}

describe("injectRowSelection", () => {
	function setup(initial = rows("a", "b", "c", "d", "e")) {
		const source = signal<readonly Row[]>(initial);
		const selection = injectRowSelection(source, row => row.id);
		return { source, selection };
	}

	function selectedIds(selection: ReturnType<typeof setup>["selection"]) {
		return [...selection.selectedIds()].sort();
	}

	it("starts empty", () => {
		const { selection } = setup();
		expect(selection.count()).toBe(0);
		expect(selection.isAllSelected()).toBe(false);
		expect(selection.isPartiallySelected()).toBe(false);
		expect(selection.selectedRows()).toEqual([]);
	});

	it("toggles single rows on and off", () => {
		const { selection } = setup();
		selection.toggle("b");
		selection.toggle("d");
		expect(selectedIds(selection)).toEqual(["b", "d"]);
		expect(selection.isSelected("b")).toBe(true);
		expect(selection.isPartiallySelected()).toBe(true);
		selection.toggle("b");
		expect(selectedIds(selection)).toEqual(["d"]);
	});

	it("returns the selected rows in table order", () => {
		const { selection } = setup();
		selection.toggle("d");
		selection.toggle("a");
		expect(selection.selectedRows().map(row => row.id)).toEqual(["a", "d"]);
	});

	it("ignores ids that are not on the page", () => {
		const { selection } = setup();
		selection.toggle("zzz");
		selection.toggleRange("zzz");
		expect(selection.count()).toBe(0);
	});

	it("selects a range from the last anchor in either direction", () => {
		const { selection } = setup();
		selection.toggle("b");
		selection.toggleRange("d");
		expect(selectedIds(selection)).toEqual(["b", "c", "d"]);

		selection.clear();
		selection.toggle("e");
		selection.toggleRange("c");
		expect(selectedIds(selection)).toEqual(["c", "d", "e"]);
	});

	it("deselects a range when the clicked row was already selected", () => {
		const { selection } = setup();
		selection.togglePage();
		selection.toggle("a");
		selection.toggleRange("c");
		expect(selectedIds(selection)).toEqual(["d", "e"]);
	});

	it("falls back to a single toggle when there is no anchor", () => {
		const { selection } = setup();
		selection.toggleRange("c");
		expect(selectedIds(selection)).toEqual(["c"]);
		selection.toggleRange("e");
		expect(selectedIds(selection)).toEqual(["c", "d", "e"]);
	});

	it("selects the whole page, then clears it", () => {
		const { selection } = setup();
		selection.toggle("a");
		selection.togglePage();
		expect(selection.isAllSelected()).toBe(true);
		expect(selection.isPartiallySelected()).toBe(false);
		expect(selection.count()).toBe(5);
		selection.togglePage();
		expect(selection.count()).toBe(0);
	});

	it("never reports an empty page as fully selected", () => {
		const { selection } = setup([]);
		selection.togglePage();
		expect(selection.isAllSelected()).toBe(false);
		expect(selection.count()).toBe(0);
	});

	it("resets when the rows change to another page, filter or order", () => {
		const { source, selection } = setup();
		selection.toggle("a");
		source.set(rows("f", "g"));
		expect(selection.count()).toBe(0);

		selection.toggle("f");
		source.set(rows("g", "f"));
		expect(selection.count()).toBe(0);
	});

	it("keeps the selection when the same rows are updated in memory", () => {
		const { source, selection } = setup(rows("a", "b"));
		selection.toggle("a");
		source.set([
			{ id: "a", title: "Renamed" },
			{ id: "b", title: "Game b" }
		]);
		expect(selectedIds(selection)).toEqual(["a"]);
		expect(selection.selectedRows()[0].title).toBe("Renamed");
	});

	it("drops the range anchor when the rows change", () => {
		const { source, selection } = setup(rows("a", "b", "c"));
		selection.toggle("a");
		source.set(rows("a", "b", "c", "d"));
		selection.toggleRange("c");
		expect(selectedIds(selection)).toEqual(["c"]);
	});

	it("keeps an explicit selection made right after the rows change", () => {
		const { source, selection } = setup(rows("a", "b", "c"));
		selection.togglePage();
		source.set(rows("a", "c"));
		selection.select(["c", "b"]);
		expect(selectedIds(selection)).toEqual(["c"]);
	});

	it("clears everything", () => {
		const { selection } = setup();
		selection.togglePage();
		selection.clear();
		expect(selection.count()).toBe(0);
	});
});
