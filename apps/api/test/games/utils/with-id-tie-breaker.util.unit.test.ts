import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildOrder } from "../../../src/games/utils/build-order.util";
import { withIdTieBreaker } from "../../../src/games/utils/with-id-tie-breaker.util";

void describe("withIdTieBreaker", () => {
	void it("appends the id in the requested direction for every sort", () => {
		for (const sortBy of [
			"title",
			"score",
			"duration",
			"ratio",
			"popularity"
		]) {
			const ascending = withIdTieBreaker(
				buildOrder(sortBy, "asc"),
				"asc"
			);
			const descending = withIdTieBreaker(
				buildOrder(sortBy, "desc"),
				"desc"
			);
			assert.deepEqual((ascending as unknown[]).at(-1), ["id", "ASC"]);
			assert.deepEqual((descending as unknown[]).at(-1), ["id", "DESC"]);
		}
	});

	void it("leaves a random order untouched", () => {
		const order = buildOrder("random", "desc");
		assert.equal(withIdTieBreaker(order, "desc"), order);
	});
});
