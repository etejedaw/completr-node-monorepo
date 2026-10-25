import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Op } from "sequelize";

import { type BacklogQuery } from "../../src/backlog/schemas/backlog-query.schema";
import { buildBacklogWhere } from "../../src/backlog/utils/build-backlog-where.util";

function andConditionsOf(
	filters: Partial<BacklogQuery>,
	base: Record<string, unknown> = { userId: "user-1" }
) {
	const where = buildBacklogWhere(base, filters as BacklogQuery);
	return (where[Op.and as unknown as string] ?? []) as {
		gameId: Record<symbol, { val: string }>;
	}[];
}

void describe("buildBacklogWhere platinumed_only", () => {
	void it("limits the runs to the games the owner platinumed", () => {
		const [condition] = andConditionsOf({ platinumed_only: true });

		const sql = condition!.gameId[Op.in as symbol]!.val;
		assert.match(sql, /FROM "GamePlatinums"/);
		assert.match(sql, /"userId" = 'user-1'/);
	});

	void it("adds nothing when platinumed_only is false or missing", () => {
		assert.equal(andConditionsOf({ platinumed_only: false }).length, 0);
		assert.equal(andConditionsOf({}).length, 0);
	});

	void it("adds nothing when the base has no owner", () => {
		assert.equal(andConditionsOf({ platinumed_only: true }, {}).length, 0);
	});
});
