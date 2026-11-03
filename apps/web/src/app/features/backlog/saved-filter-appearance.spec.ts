import { describe, expect, it } from "vitest";

import {
	SAVED_FILTER_ICON_LABELS,
	SAVED_FILTER_ICONS,
	savedFilterIconLabel
} from "./saved-filter-appearance";

describe("saved filter appearance", () => {
	it("includes the platform icons together after sports_esports", () => {
		const start = SAVED_FILTER_ICONS.indexOf("sports_esports");

		expect(SAVED_FILTER_ICONS.slice(start + 1, start + 4)).toEqual([
			"smartphone",
			"computer",
			"tv"
		]);
	});

	it("has a readable label for every icon", () => {
		for (const icon of SAVED_FILTER_ICONS) {
			expect(SAVED_FILTER_ICON_LABELS[icon]).toBeTruthy();
		}
		expect(savedFilterIconLabel("smartphone")).toBe("Phone");
		expect(savedFilterIconLabel("computer")).toBe("PC");
		expect(savedFilterIconLabel("tv")).toBe("TV");
	});

	it("falls back to the technical name for unknown icons", () => {
		expect(savedFilterIconLabel("unknown_icon")).toBe("unknown_icon");
	});
});
