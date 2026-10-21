/// <reference types="node" />

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Op } from "sequelize";

import { type BacklogQuery } from "../../../src/backlog/schemas/backlog-query.schema";
import { buildBacklogWhere } from "../../../src/backlog/utils/build-backlog-where.util";

const USER_ID = "user-1";

function build(
	filters: Partial<BacklogQuery>,
	base: Record<string, unknown> = { userId: USER_ID }
) {
	const where = buildBacklogWhere(base, filters as BacklogQuery);
	const andConditions = (where[Op.and as unknown as string] ??
		[]) as object[];
	return { where, andConditions };
}

function literalSql(condition: unknown): string {
	return (condition as { val: string }).val;
}

function sqlOfAll(andConditions: object[]): string[] {
	return andConditions.map(condition => {
		const literalValue = (condition as { val?: string }).val;
		if (literalValue) return literalValue;
		const nested = Object.values(condition)[0] as Record<
			symbol,
			{ val: string }
		>;
		return nested[Op.in as symbol]?.val ?? "";
	});
}

describe("buildBacklogWhere", () => {
	it("keeps the base conditions and adds nothing for empty filters", () => {
		const { where } = build({});

		assert.deepEqual(where, { userId: USER_ID });
	});

	it("does not mutate the base object", () => {
		const base = { userId: USER_ID };

		buildBacklogWhere(base, { status: ["playing"] } as BacklogQuery);

		assert.deepEqual(base, { userId: USER_ID });
	});

	it("uses equality for a single status and IN for several", () => {
		assert.equal(build({ status: ["playing"] }).where.status, "playing");
		assert.deepEqual(
			build({ status: ["playing", "completed"] }).where.status,
			{
				[Op.in]: ["playing", "completed"]
			}
		);
	});

	it("filters coop runs with a not null condition", () => {
		assert.deepEqual(build({ coop_only: true }).where.coopRunId, {
			[Op.ne]: null
		});
	});

	it("ignores coop_only when it is false", () => {
		assert.equal("coopRunId" in build({ coop_only: false }).where, false);
	});

	it("builds date ranges for started and finished dates", () => {
		const { where } = build({
			started_from: "2024-01-01",
			finished_to: "2024-12-31"
		});

		assert.deepEqual(where.startedAt, { [Op.gte]: new Date("2024-01-01") });
		assert.deepEqual(where.finishedAt, {
			[Op.lte]: new Date("2024-12-31")
		});
	});

	it("prefers no_finished_date over any finished range", () => {
		const { where } = build({
			no_finished_date: true,
			finished_from: "2024-01-01"
		});

		assert.deepEqual(where.finishedAt, { [Op.is]: null });
	});

	it("builds numeric ranges for score, duration, real duration and rating", () => {
		const { where } = build({
			min_score: 3,
			max_score: 5,
			min_duration: 1,
			max_real_duration: 40,
			min_rating: 2.5
		});

		assert.deepEqual(where.score, { [Op.gte]: 3, [Op.lte]: 5 });
		assert.deepEqual(where.duration, { [Op.gte]: 1 });
		assert.deepEqual(where.realDuration, { [Op.lte]: 40 });
		assert.deepEqual(where.userRating, { [Op.gte]: 2.5 });
	});

	it("keeps a zero lower bound instead of treating it as missing", () => {
		assert.deepEqual(build({ min_score: 0 }).where.score, { [Op.gte]: 0 });
	});

	it("escapes platform codes inside the subquery", () => {
		const { andConditions } = build({ platforms: ["pc", "o'brien"] });

		const [sql] = sqlOfAll(andConditions);
		assert.match(sql!, /code IN \('pc', 'o''brien'\)/);
	});

	it("escapes genre codes inside the subquery", () => {
		const { andConditions } = build({ genres: ["rpg", "x'); DROP TABLE"] });

		const [sql] = sqlOfAll(andConditions);
		assert.match(sql!, /g\.code IN \('rpg', 'x''\); DROP TABLE'\)/);
	});

	it("skips empty platform and genre lists", () => {
		assert.equal(
			build({ platforms: [], genres: [] }).andConditions.length,
			0
		);
	});

	it("filters by release year bounds on the game table", () => {
		const { andConditions } = build({
			release_year_from: 2000,
			release_year_to: 2010
		});

		const [sql] = sqlOfAll(andConditions);
		assert.match(
			sql!,
			/EXTRACT\(YEAR FROM g\."releaseAt"\) >= 2000 AND EXTRACT\(YEAR FROM g\."releaseAt"\) <= 2010/
		);
	});

	it("treats undated as both dates being null", () => {
		const { andConditions } = build({ undated: true });

		assert.match(
			literalSql(andConditions[0]),
			/"startedAt" IS NULL AND "Backlog"\."finishedAt" IS NULL/
		);
	});

	it("counts playing and endless as active until today when filtering active_from", () => {
		const { andConditions } = build({ active_from: "2024-05-01" });

		const sql = literalSql(andConditions[0]);
		assert.match(sql, /IN \('playing', 'endless'\) THEN CURRENT_DATE/);
		assert.match(sql, />= '2024-05-01'/);
	});

	it("builds ratio conditions guarding against division by zero", () => {
		const { andConditions } = build({
			min_ratio: 10,
			max_personal_ratio: 50
		});

		const [minRatio, maxPersonal] = andConditions.map(literalSql);
		assert.match(
			minRatio!,
			/"score" \/ NULLIF\("Backlog"\."duration", 0\)\) >= 10/
		);
		assert.match(
			maxPersonal!,
			/NULLIF\("Backlog"\."realDuration", 0\)\) <= 50/
		);
	});

	it("requires every mood tag for the owner and normalizes them", () => {
		const { andConditions } = build({ mood_tags: [" Cozy ", "RPG"] });

		const [sql] = sqlOfAll(andConditions);
		assert.match(sql!, /"userId" = 'user-1'/);
		assert.match(sql!, /"tag" IN \('cozy', 'rpg'\)/);
		assert.match(sql!, /HAVING COUNT\(DISTINCT "tag"\) = 2/);
	});

	it("ignores mood tags when the base has no owner", () => {
		assert.equal(
			build({ mood_tags: ["cozy"] }, {}).andConditions.length,
			0
		);
	});
});
