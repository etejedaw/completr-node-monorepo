/// <reference types="node" />

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PaginatedSearchQuerySchema } from "../../../src/common/schemas/paginated-search-query.schema";

describe("PaginatedSearchQuerySchema", () => {
	it("rejects an empty search and a search over 100 characters", () => {
		assert.equal(
			PaginatedSearchQuerySchema.safeParse({ search: "" }).success,
			false
		);
		assert.equal(
			PaginatedSearchQuerySchema.safeParse({ search: "a".repeat(101) })
				.success,
			false
		);
	});

	it("accepts search together with pagination", () => {
		assert.deepEqual(
			PaginatedSearchQuerySchema.parse({ search: "zelda", limit: "5" }),
			{ search: "zelda", limit: 5 }
		);
	});
});
