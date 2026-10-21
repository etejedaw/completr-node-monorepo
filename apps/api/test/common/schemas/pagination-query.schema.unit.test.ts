import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PaginationQuerySchema } from "../../../src/common/schemas/pagination-query.schema";

void describe("PaginationQuerySchema", () => {
	void it("coerces query string values to numbers", () => {
		assert.deepEqual(
			PaginationQuerySchema.parse({ limit: "20", offset: "40" }),
			{ limit: 20, offset: 40 }
		);
	});

	void it("accepts an empty query", () => {
		assert.deepEqual(PaginationQuerySchema.parse({}), {});
	});

	void it("rejects a limit above 100 or below 1", () => {
		assert.equal(
			PaginationQuerySchema.safeParse({ limit: "101" }).success,
			false
		);
		assert.equal(
			PaginationQuerySchema.safeParse({ limit: "0" }).success,
			false
		);
	});

	void it("rejects negative and fractional offsets", () => {
		assert.equal(
			PaginationQuerySchema.safeParse({ offset: "-1" }).success,
			false
		);
		assert.equal(
			PaginationQuerySchema.safeParse({ offset: "1.5" }).success,
			false
		);
	});
});
