/// <reference types="node" />

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type GamesQuery } from "../../../src/games/schemas/games-query.schema";
import { mapGamesQueryToOptions } from "../../../src/games/utils/games-query.adapter";

function adapt(query: Partial<GamesQuery>) {
	return mapGamesQueryToOptions(query as GamesQuery);
}

describe("mapGamesQueryToOptions", () => {
	it("maps pagination, sort and search", () => {
		const options = adapt({
			limit: 10,
			offset: 20,
			sort_by: "ratio",
			sort_order: "asc",
			search: "zelda"
		});

		assert.deepEqual(options.pagination, { limit: 10, offset: 20 });
		assert.deepEqual(options.sort, { by: "ratio", order: "asc" });
		assert.equal(options.search, "zelda");
	});

	it("prefers the genres list over the single genre", () => {
		const options = adapt({ genres: ["rpg", "action"], genre: "puzzle" });

		assert.deepEqual(options.filters?.genres, ["rpg", "action"]);
	});

	it("falls back to the single genre when the list is missing or empty", () => {
		assert.deepEqual(adapt({ genre: "puzzle" }).filters?.genres, [
			"puzzle"
		]);
		assert.deepEqual(
			adapt({ genres: [], genre: "puzzle" }).filters?.genres,
			["puzzle"]
		);
	});

	it("leaves genres undefined when neither is given", () => {
		assert.equal(adapt({}).filters?.genres, undefined);
	});

	it("groups the compilation, status and missing flags", () => {
		const filters = adapt({
			is_dlc: true,
			exclude_compilations: true,
			only_inactive: true,
			no_scores: true,
			no_score_source: ["rawg"]
		}).filters;

		assert.deepEqual(filters?.flags, {
			isDlc: true,
			isCompilation: undefined,
			excludeCompilations: true
		});
		assert.deepEqual(filters?.status, {
			includeInactive: undefined,
			onlyInactive: true
		});
		assert.equal(filters?.missing?.scores, true);
		assert.deepEqual(filters?.excludedSources?.scoreSources, ["rawg"]);
	});

	it("maps release year and min/max ranges", () => {
		const filters = adapt({
			release_year_from: 1990,
			min_score: 2,
			max_duration: 30
		}).filters;

		assert.deepEqual(filters?.releaseYear, { from: 1990, to: undefined });
		assert.deepEqual(filters?.score, { min: 2, max: undefined });
		assert.deepEqual(filters?.duration, { min: undefined, max: 30 });
	});
});
