import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	normalizeTag,
	normalizeTags
} from "../../src/mood-tags/normalize-tag.util";

void describe("normalizeTag", () => {
	void it("lowercases, trims and collapses inner whitespace", () => {
		assert.equal(normalizeTag("  Cozy   Vibes "), "cozy vibes");
	});

	void it("removes accents", () => {
		assert.equal(normalizeTag("Acción Épica"), "accion epica");
	});

	void it("returns an empty string for blank input", () => {
		assert.equal(normalizeTag("   "), "");
	});
});

void describe("normalizeTags", () => {
	void it("drops blank tags and duplicates after normalization", () => {
		assert.deepEqual(normalizeTags(["Cozy", " cozy ", "", "RPG", "rpg"]), [
			"cozy",
			"rpg"
		]);
	});

	void it("drops tags longer than 40 characters", () => {
		assert.deepEqual(normalizeTags(["a".repeat(41), "a".repeat(40)]), [
			"a".repeat(40)
		]);
	});

	void it("keeps the original order of first appearances", () => {
		assert.deepEqual(normalizeTags(["b", "a", "b"]), ["b", "a"]);
	});
});
