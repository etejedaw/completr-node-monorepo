/// <reference types="node" />

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Op } from "sequelize";

import {
	buildActiveFlagWhere,
	buildAggregateCondition,
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

describe("buildActiveFlagWhere", () => {
	it("only returns active games by default", () => {
		assert.deepEqual(buildActiveFlagWhere(undefined), { isActive: true });
		assert.deepEqual(buildActiveFlagWhere({}), { isActive: true });
	});

	it("returns only inactive games when onlyInactive is set", () => {
		assert.deepEqual(buildActiveFlagWhere({ onlyInactive: true }), {
			isActive: false
		});
	});

	it("does not filter when includeInactive is set", () => {
		assert.deepEqual(buildActiveFlagWhere({ includeInactive: true }), {});
	});

	it("gives onlyInactive priority over includeInactive", () => {
		assert.deepEqual(
			buildActiveFlagWhere({ onlyInactive: true, includeInactive: true }),
			{ isActive: false }
		);
	});
});

describe("buildCompilationFlagsWhere", () => {
	it("returns an empty filter without flags", () => {
		assert.deepEqual(buildCompilationFlagsWhere(undefined), {});
	});

	it("filters by isDlc even when false", () => {
		assert.deepEqual(buildCompilationFlagsWhere({ isDlc: false }), {
			isDlc: false
		});
	});

	it("excludes compilations only when isCompilation is not explicit", () => {
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

describe("buildReleaseDateRangeWhere", () => {
	it("spans from January 1st to December 31st of the given years", () => {
		assert.deepEqual(buildReleaseDateRangeWhere(2000, 2005), {
			releaseAt: {
				[Op.gte]: new Date("2000-01-01"),
				[Op.lte]: new Date("2005-12-31")
			}
		});
	});

	it("returns an empty filter when no year is given", () => {
		assert.deepEqual(buildReleaseDateRangeWhere(undefined, undefined), {});
	});
});

describe("genre and platform conditions", () => {
	it("return null for missing or empty code lists", () => {
		assert.equal(buildGenreCondition(undefined), null);
		assert.equal(buildPlatformCondition([]), null);
	});

	it("escape the codes inside the subquery", () => {
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

describe("buildAggregateCondition", () => {
	it("returns null without bounds", () => {
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

	it("combines both bounds on the average", () => {
		const sql = inSubquery(
			buildAggregateCondition("GameScores", "score", 2, 4)
		);

		assert.match(sql, /HAVING AVG\(score\) >= 2 AND AVG\(score\) <= 4/);
	});

	it("keeps a zero minimum", () => {
		const sql = inSubquery(
			buildAggregateCondition("GameTimes", "duration", 0, undefined)
		);

		assert.match(sql, /HAVING AVG\(duration\) >= 0/);
	});
});

describe("missing relation and source exclusion conditions", () => {
	it("exclude games present in the relation table", () => {
		assert.match(
			inSubquery(buildMissingRelationCondition("GameScores"), Op.notIn),
			/FROM "GameScores"/
		);
	});

	it("return null when there are no sources to exclude", () => {
		assert.equal(
			buildSourceExclusionCondition("GameScores", undefined),
			null
		);
		assert.equal(buildSourceExclusionCondition("GameScores", []), null);
	});

	it("exclude games with any of the given sources", () => {
		assert.match(
			inSubquery(
				buildSourceExclusionCondition("GameTimes", ["hltb", "rawg"]),
				Op.notIn
			),
			/source IN \('hltb', 'rawg'\)/
		);
	});
});

describe("buildOrder", () => {
	function orderSql(sortBy: string, sortOrder: string): string {
		const [first] = buildOrder(sortBy, sortOrder) as unknown as [
			{ val: string }
		];
		return first.val;
	}

	it("sorts randomly regardless of direction", () => {
		assert.equal(orderSql("random", "asc"), "RANDOM()");
	});

	it("sorts plain columns with the normalized direction", () => {
		assert.deepEqual(buildOrder("title", "asc"), [["title", "ASC"]]);
		assert.deepEqual(buildOrder("title", "desc"), [["title", "DESC"]]);
	});

	it("falls back to DESC for unexpected directions", () => {
		assert.deepEqual(buildOrder("title", "sideways"), [["title", "DESC"]]);
	});

	it("sorts by score using the source with the lowest priority and nulls last", () => {
		const sql = orderSql("score", "desc");

		assert.match(sql, /ORDER BY ss\.priority ASC/);
		assert.match(sql, /DESC NULLS LAST$/);
	});

	it("sorts by ratio dividing score by a non zero duration", () => {
		assert.match(
			orderSql("ratio", "asc"),
			/NULLIF\(.*, 0\)\) ASC NULLS LAST$/s
		);
	});

	it("sorts by popularity from the popularity table", () => {
		assert.match(orderSql("popularity", "desc"), /FROM "GamePopularities"/);
	});
});
