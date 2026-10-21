import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Op } from "sequelize";

import {
	buildActiveFlagWhere,
	buildAggregateCondition,
	buildCanonicalScoreCondition,
	buildCompilationFlagsWhere,
	buildGenreCondition,
	buildMissingRelationCondition,
	buildOrder,
	buildPlatformCondition,
	buildReleaseDateRangeWhere,
	buildSourceExclusionCondition
} from "../../../src/games/utils/search-filters.util";

function inSubquery(
	condition: object | null,
	operator: symbol = Op.in
): string {
	const idFilter = (condition as { id: Record<symbol, { val: string }> }).id;
	return idFilter[operator]!.val;
}

void describe("buildActiveFlagWhere", () => {
	void it("only returns active games by default", () => {
		assert.deepEqual(buildActiveFlagWhere(undefined), { isActive: true });
		assert.deepEqual(buildActiveFlagWhere({}), { isActive: true });
	});

	void it("returns only inactive games when onlyInactive is set", () => {
		assert.deepEqual(buildActiveFlagWhere({ onlyInactive: true }), {
			isActive: false
		});
	});

	void it("does not filter when includeInactive is set", () => {
		assert.deepEqual(buildActiveFlagWhere({ includeInactive: true }), {});
	});

	void it("gives onlyInactive priority over includeInactive", () => {
		assert.deepEqual(
			buildActiveFlagWhere({ onlyInactive: true, includeInactive: true }),
			{ isActive: false }
		);
	});
});

void describe("buildCompilationFlagsWhere", () => {
	void it("returns an empty filter without flags", () => {
		assert.deepEqual(buildCompilationFlagsWhere(undefined), {});
	});

	void it("filters by isDlc even when false", () => {
		assert.deepEqual(buildCompilationFlagsWhere({ isDlc: false }), {
			isDlc: false
		});
	});

	void it("excludes compilations only when isCompilation is not explicit", () => {
		assert.deepEqual(
			buildCompilationFlagsWhere({ excludeCompilations: true }),
			{
				isCompilation: false
			}
		);
		assert.deepEqual(
			buildCompilationFlagsWhere({
				isCompilation: true,
				excludeCompilations: true
			}),
			{ isCompilation: true }
		);
	});
});

void describe("buildReleaseDateRangeWhere", () => {
	void it("spans from January 1st to December 31st of the given years", () => {
		assert.deepEqual(buildReleaseDateRangeWhere(2000, 2005), {
			releaseAt: {
				[Op.gte]: new Date("2000-01-01"),
				[Op.lte]: new Date("2005-12-31")
			}
		});
	});

	void it("returns an empty filter when no year is given", () => {
		assert.deepEqual(buildReleaseDateRangeWhere(undefined, undefined), {});
	});
});

void describe("genre and platform conditions", () => {
	void it("return null for missing or empty code lists", () => {
		assert.equal(buildGenreCondition(undefined), null);
		assert.equal(buildPlatformCondition([]), null);
	});

	void it("escape the codes inside the subquery", () => {
		assert.match(
			inSubquery(buildGenreCondition(["rpg", "it's"])),
			/g\.code IN \('rpg', 'it''s'\)/
		);
		assert.match(
			inSubquery(buildPlatformCondition(["pc"])),
			/p\.code IN \('pc'\)/
		);
	});
});

void describe("buildAggregateCondition", () => {
	void it("returns null without bounds", () => {
		assert.equal(
			buildAggregateCondition(
				"GameScores",
				"score",
				undefined,
				undefined
			),
			null
		);
	});

	void it("combines both bounds on the average", () => {
		const sql = inSubquery(
			buildAggregateCondition("GameScores", "score", 2, 4)
		);

		assert.match(sql, /HAVING AVG\(score\) >= 2 AND AVG\(score\) <= 4/);
	});

	void it("keeps a zero minimum", () => {
		const sql = inSubquery(
			buildAggregateCondition("GameTimes", "duration", 0, undefined)
		);

		assert.match(sql, /HAVING AVG\(duration\) >= 0/);
	});
});

void describe("buildCanonicalScoreCondition", () => {
	function clausesOf(condition: object | null) {
		return (condition as Record<symbol, object[]>)[Op.and]!;
	}

	void it("returns null without bounds", () => {
		assert.equal(buildCanonicalScoreCondition(undefined, undefined), null);
	});

	void it("adds one clause per bound", () => {
		assert.equal(clausesOf(buildCanonicalScoreCondition(2, 4)).length, 2);
		assert.equal(
			clausesOf(buildCanonicalScoreCondition(undefined, 4)).length,
			1
		);
	});

	void it("keeps a zero minimum", () => {
		assert.equal(
			clausesOf(buildCanonicalScoreCondition(0, undefined)).length,
			1
		);
	});

	void it("compares the normalized canonical score used by the score sort", () => {
		const [clause] = clausesOf(buildCanonicalScoreCondition(2, undefined));

		assert.match(JSON.stringify(clause), /gs\.score \* 5\.0 \/ ss\.scale/);
	});
});

void describe("missing relation and source exclusion conditions", () => {
	void it("exclude games present in the relation table", () => {
		assert.match(
			inSubquery(buildMissingRelationCondition("GameScores"), Op.notIn),
			/FROM "GameScores"/
		);
	});

	void it("return null when there are no sources to exclude", () => {
		assert.equal(
			buildSourceExclusionCondition("GameScores", undefined),
			null
		);
		assert.equal(buildSourceExclusionCondition("GameScores", []), null);
	});

	void it("exclude games with any of the given sources", () => {
		assert.match(
			inSubquery(
				buildSourceExclusionCondition("GameTimes", ["hltb", "rawg"]),
				Op.notIn
			),
			/source IN \('hltb', 'rawg'\)/
		);
	});
});

void describe("buildOrder", () => {
	function orderSql(sortBy: string, sortOrder: string): string {
		const [first] = buildOrder(sortBy, sortOrder) as unknown as [
			{ val: string }
		];
		return first.val;
	}

	void it("sorts randomly regardless of direction", () => {
		assert.equal(orderSql("random", "asc"), "RANDOM()");
	});

	void it("sorts plain columns with the normalized direction", () => {
		assert.deepEqual(buildOrder("title", "asc"), [["title", "ASC"]]);
		assert.deepEqual(buildOrder("title", "desc"), [["title", "DESC"]]);
	});

	void it("falls back to DESC for unexpected directions", () => {
		assert.deepEqual(buildOrder("title", "sideways"), [["title", "DESC"]]);
	});

	void it("sorts by score using the source with the lowest priority and nulls last", () => {
		const sql = orderSql("score", "desc");

		assert.match(sql, /ORDER BY ss\.priority ASC/);
		assert.match(sql, /DESC NULLS LAST$/);
	});

	void it("sorts by ratio dividing score by a non zero duration", () => {
		assert.match(
			orderSql("ratio", "asc"),
			/NULLIF\(.*, 0\)\) ASC NULLS LAST$/s
		);
	});

	void it("sorts by popularity from the popularity table", () => {
		assert.match(orderSql("popularity", "desc"), /FROM "GamePopularities"/);
	});
});
