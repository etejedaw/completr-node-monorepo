/// <reference types="node" />

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type SavedFilter } from "../../src/saved-filters/saved-filter.model";
import { savedFilterSerializer } from "../../src/saved-filters/saved-filters.serializer";
import { asModel } from "../unit-helpers/as-model";

function buildFilter(overrides: Record<string, unknown> = {}) {
	return asModel<SavedFilter>({
		id: "sf-1",
		name: "RPGs",
		description: null,
		filters: { genres: "rpg" },
		sortBy: "ratio",
		sortOrder: "desc",
		showInBacklog: true,
		isDefault: false,
		createdAt: new Date("2024-01-01"),
		userId: "u-1",
		...overrides
	});
}

describe("savedFilterSerializer", () => {
	it("normalizes missing enabledStats, icon and color to null", () => {
		const result = savedFilterSerializer(buildFilter());

		assert.equal(result.enabledStats, null);
		assert.equal(result.icon, null);
		assert.equal(result.color, null);
	});

	it("keeps the stored filters and display options", () => {
		const result = savedFilterSerializer(
			buildFilter({
				enabledStats: ["ratio"],
				icon: "star",
				color: "#fff"
			})
		);

		assert.deepEqual(result.filters, { genres: "rpg" });
		assert.deepEqual(result.enabledStats, ["ratio"]);
		assert.equal(result.icon, "star");
		assert.equal(result.isDefault, false);
		assert.equal(result.showInBacklog, true);
	});

	it("does not expose the owner id", () => {
		assert.equal("userId" in savedFilterSerializer(buildFilter()), false);
	});
});
