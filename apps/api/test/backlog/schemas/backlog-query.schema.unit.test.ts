/// <reference types="node" />

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BacklogQuerySchema } from "../../../src/backlog/schemas/backlog-query.schema";

describe("BacklogQuerySchema", () => {
	it("splits a comma separated status into an array", () => {
		const parsed = BacklogQuerySchema.parse({
			status: "playing,completed"
		});

		assert.deepEqual(parsed.status, ["playing", "completed"]);
	});

	it("rejects an unknown status inside the list", () => {
		assert.equal(
			BacklogQuerySchema.safeParse({ status: "playing,dropped" }).success,
			false
		);
	});

	it("drops empty items of platforms and genres lists", () => {
		const parsed = BacklogQuerySchema.parse({
			platforms: "pc,,ps5,",
			genres: "rpg,"
		});

		assert.deepEqual(parsed.platforms, ["pc", "ps5"]);
		assert.deepEqual(parsed.genres, ["rpg"]);
	});

	it("rejects mood_tags made only of separators", () => {
		assert.equal(
			BacklogQuerySchema.safeParse({ mood_tags: ",," }).success,
			false
		);
	});

	it("parses boolean flags from query strings", () => {
		const parsed = BacklogQuerySchema.parse({
			undated: "true",
			coop_only: "false",
			no_finished_date: "1"
		});

		assert.equal(parsed.undated, true);
		assert.equal(parsed.coop_only, false);
		assert.equal(parsed.no_finished_date, true);
	});

	it("coerces numeric filters and pagination", () => {
		const parsed = BacklogQuerySchema.parse({
			min_score: "3.5",
			max_ratio: "40",
			limit: "10",
			offset: "20"
		});

		assert.equal(parsed.min_score, 3.5);
		assert.equal(parsed.max_ratio, 40);
		assert.equal(parsed.limit, 10);
		assert.equal(parsed.offset, 20);
	});

	it("rejects invalid dates and uuids", () => {
		assert.equal(
			BacklogQuerySchema.safeParse({ started_from: "2024-13-01" })
				.success,
			false
		);
		assert.equal(
			BacklogQuerySchema.safeParse({ game_id: "not-a-uuid" }).success,
			false
		);
	});

	it("accepts the ratio sort fields and rejects unknown ones", () => {
		assert.equal(
			BacklogQuerySchema.safeParse({ sort_by: "personalRatio" }).success,
			true
		);
		assert.equal(
			BacklogQuerySchema.safeParse({ sort_by: "popularity" }).success,
			false
		);
	});

	it("limits the page size to 100", () => {
		assert.equal(
			BacklogQuerySchema.safeParse({ limit: "101" }).success,
			false
		);
	});
});
