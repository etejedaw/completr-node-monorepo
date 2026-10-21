/// <reference types="node" />

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { titleToSlug } from "../../../src/common/utils/title-to-slug.util";

describe("titleToSlug", () => {
	it("lowercases and joins words with dashes", () => {
		assert.equal(titleToSlug("Super Mario Bros"), "super-mario-bros");
	});

	it("strips punctuation and special characters", () => {
		assert.equal(
			titleToSlug("The Legend of Zelda: Breath of the Wild!"),
			"the-legend-of-zelda-breath-of-the-wild"
		);
	});

	it("transliterates accented characters", () => {
		assert.equal(titleToSlug("Pokémon Épée"), "pokemon-epee");
	});
});
