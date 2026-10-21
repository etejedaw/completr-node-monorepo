/// <reference types="node" />

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	normalizeTag,
	normalizeTags
} from "../../src/mood-tags/normalize-tag.util";

describe("normalizeTag", () => {
	it("lowercases, trims and collapses inner whitespace", () => {
		assert.equal(normalizeTag("  Cozy   Vibes "), "cozy vibes");
	});

	it("removes accents", () => {
		assert.equal(normalizeTag("Acción Épica"), "accion epica");
	});

	it("returns an empty string for blank input", () => {
		assert.equal(normalizeTag("   "), "");
	});
});

describe("normalizeTags", () => {
	it("drops blank tags and duplicates after normalization", () => {
		assert.deepEqual(normalizeTags(["Cozy", " cozy ", "", "RPG", "rpg"]), [
			"cozy",
			"rpg"
		]);
	});

	it("drops tags longer than 40 characters", () => {
		assert.deepEqual(normalizeTags(["a".repeat(41), "a".repeat(40)]), [
			"a".repeat(40)
		]);
	});

	it("keeps the original order of first appearances", () => {
		assert.deepEqual(normalizeTags(["b", "a", "b"]), ["b", "a"]);
	});
});
