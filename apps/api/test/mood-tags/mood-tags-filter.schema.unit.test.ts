import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MoodTagsFilterSchema } from "../../src/mood-tags/schemas/mood-tags-filter.schema";

function numberedTags(count: number) {
	return Array.from({ length: count }, (_, index) => `tag${index}`);
}

void describe("MoodTagsFilterSchema", () => {
	void it("normalizes case, accents and spaces and drops duplicates and empty items", () => {
		assert.deepEqual(
			MoodTagsFilterSchema.parse(
				"  Cózy   Night ,RPG,,cozy night, rpg ,"
			),
			["cozy night", "rpg"]
		);
	});

	void it("accepts ten distinct tags", () => {
		assert.deepEqual(
			MoodTagsFilterSchema.parse(numberedTags(10).join(",")),
			numberedTags(10)
		);
	});

	void it("counts the limit after collapsing duplicates", () => {
		const tags = [...numberedTags(10), "TAG0", " tag1 "];

		assert.equal(MoodTagsFilterSchema.parse(tags.join(",")).length, 10);
	});

	for (const [label, value] of [
		["eleven distinct tags", numberedTags(11).join(",")],
		["an empty string", ""],
		["only separators", ",,,"],
		["only blank tags", " ,  ,\t"],
		["only tags longer than the maximum", "x".repeat(41)],
		["a repeated query param", ["cozy", "rpg"]],
		["a number", 3]
	] as const)
		void it(`rejects ${label}`, () => {
			assert.equal(MoodTagsFilterSchema.safeParse(value).success, false);
		});
});
