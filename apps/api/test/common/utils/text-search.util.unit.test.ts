import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Op } from "sequelize";

import {
	buildTextSearchRelevanceOrder,
	buildTextSearchWhere,
	tokenizeSearchQuery
} from "../../../src/common/utils/text-search.util";

function conditionsOf(where: object | null) {
	assert.ok(where);
	return (where as Record<symbol, unknown[]>)[Op.and]!;
}

function relevanceSqlOf(query: string) {
	const [relevance] = buildTextSearchRelevanceOrder(query, "Game.title");
	const [literal] = relevance as unknown as [{ val: string }];
	return literal.val;
}

void describe("tokenizeSearchQuery", () => {
	void it("lowercases the query", () => {
		assert.deepEqual(tokenizeSearchQuery("Resident EVIL"), [
			"resident",
			"evil"
		]);
	});

	void it("strips accents", () => {
		assert.deepEqual(tokenizeSearchQuery("Pokémon Édition"), [
			"pokemon",
			"edition"
		]);
	});

	void it("splits on punctuation and collapses repeated separators", () => {
		assert.deepEqual(tokenizeSearchQuery("  spider--man:  2!! "), [
			"spider",
			"man",
			"2"
		]);
	});

	void it("drops LIKE wildcards and backslashes", () => {
		assert.deepEqual(tokenizeSearchQuery("100%_\\mario"), ["100", "mario"]);
	});

	void it("returns no tokens for a query without letters or digits", () => {
		assert.deepEqual(tokenizeSearchQuery(" %_\\ -- !! "), []);
		assert.deepEqual(tokenizeSearchQuery(""), []);
	});
});

void describe("buildTextSearchWhere", () => {
	void it("returns null when the query is empty after normalizing", () => {
		assert.equal(buildTextSearchWhere("%_\\ !!", ["Game.title"]), null);
		assert.equal(buildTextSearchWhere("   ", ["Game.title"]), null);
	});

	void it("returns null when there are no columns", () => {
		assert.equal(buildTextSearchWhere("mario", []), null);
	});

	void it("requires one condition per word", () => {
		assert.equal(
			conditionsOf(buildTextSearchWhere("evil resident", ["Game.title"]))
				.length,
			2
		);
		assert.equal(
			conditionsOf(buildTextSearchWhere("Spider-Man", ["Game.title"]))
				.length,
			2
		);
		assert.equal(
			conditionsOf(buildTextSearchWhere("pokemon", ["Game.title"]))
				.length,
			1
		);
	});

	void it("does not add conditions for repeated separators or wildcards", () => {
		assert.equal(
			conditionsOf(buildTextSearchWhere("  50%__ off ", ["Game.title"]))
				.length,
			2
		);
	});

	void it("matches each word against any of the columns", () => {
		const conditions = conditionsOf(
			buildTextSearchWhere("john smith", ["User.username", "User.name"])
		);
		assert.equal(conditions.length, 2);
		for (const condition of conditions) {
			const alternatives = (condition as Record<symbol, unknown[]>)[
				Op.or
			];
			assert.equal(alternatives?.length, 2);
		}
	});
});

void describe("buildTextSearchRelevanceOrder", () => {
	void it("ranks exact, then prefix, then the rest", () => {
		const sql = relevanceSqlOf("Resident Evil");
		assert.match(sql, /= 'residentevil' THEN 0/);
		assert.match(sql, /LIKE 'residentevil%' THEN 1/);
		assert.match(sql, /ELSE 2 END/);
	});

	void it("normalizes the column the same way as the filter", () => {
		const sql = relevanceSqlOf("pokemon");
		assert.match(
			sql,
			/regexp_replace\(lower\(unaccent\("Game"\."title"\)\), '\[\^a-z0-9\]', '', 'g'\)/
		);
	});

	void it("ignores accents, punctuation and wildcards in the query", () => {
		const sql = relevanceSqlOf("Pokémon_%!");
		assert.match(sql, /= 'pokemon' THEN 0/);
		assert.match(sql, /LIKE 'pokemon%' THEN 1/);
	});

	void it("breaks ties alphabetically by column and then by id", () => {
		const order = buildTextSearchRelevanceOrder("mario", "Game.title");
		assert.equal(order.length, 3);
		assert.deepEqual(order[2], ["id", "ASC"]);
	});

	void it("falls back to alphabetical when the query is empty", () => {
		const order = buildTextSearchRelevanceOrder("%_", "Game.title");
		assert.equal(order.length, 2);
		assert.deepEqual(order[1], ["id", "ASC"]);
	});
});
