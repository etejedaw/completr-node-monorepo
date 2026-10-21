/// <reference types="node" />

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	BacklogDurationSchema,
	BacklogScoreSchema
} from "../../../src/backlog/schemas/backlog-reference.schema";

describe("BacklogScoreSchema", () => {
	it("accepts a score up to 5 with two decimals", () => {
		assert.equal(BacklogScoreSchema.safeParse(5).success, true);
		assert.equal(BacklogScoreSchema.safeParse(4.25).success, true);
	});

	it("rejects zero, negative and scores above 5", () => {
		assert.equal(BacklogScoreSchema.safeParse(0).success, false);
		assert.equal(BacklogScoreSchema.safeParse(-1).success, false);
		assert.equal(BacklogScoreSchema.safeParse(5.01).success, false);
	});

	it("rejects more than two decimals instead of rounding", () => {
		assert.equal(BacklogScoreSchema.safeParse(4.255).success, false);
	});
});
describe("BacklogDurationSchema", () => {
	it("accepts positive durations without an upper bound", () => {
		assert.equal(BacklogDurationSchema.safeParse(1500.5).success, true);
	});

	it("rejects zero and durations with more than two decimals", () => {
		assert.equal(BacklogDurationSchema.safeParse(0).success, false);
		assert.equal(BacklogDurationSchema.safeParse(10.333).success, false);
	});
});
