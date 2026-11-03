import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { BULK_MAX_IDS } from "../../../src/common/constants/bulk.constants";
import { buildBulkActionQuerySchema } from "../../../src/common/schemas/bulk-action-query.schema";
import { BulkIdsSchema } from "../../../src/common/schemas/bulk-ids.schema";

void describe("BulkIdsSchema", () => {
	void it("removes duplicates keeping the first occurrence order", () => {
		const [first, second] = [randomUUID(), randomUUID()];

		assert.deepEqual(BulkIdsSchema.parse([first, second, first, second]), [
			first,
			second
		]);
	});

	void it("rejects an empty list", () => {
		assert.equal(BulkIdsSchema.safeParse([]).success, false);
	});

	void it("accepts up to BULK_MAX_IDS ids and rejects one more", () => {
		const ids = Array.from({ length: BULK_MAX_IDS + 1 }, () =>
			randomUUID()
		);

		assert.equal(BulkIdsSchema.safeParse(ids.slice(1)).success, true);
		assert.equal(BulkIdsSchema.safeParse(ids).success, false);
	});

	void it("counts the limit before removing duplicates", () => {
		const id = randomUUID();
		const ids = Array.from({ length: BULK_MAX_IDS + 1 }, () => id);

		assert.equal(BulkIdsSchema.safeParse(ids).success, false);
	});

	void it("rejects values that are not UUIDs", () => {
		assert.equal(
			BulkIdsSchema.safeParse([randomUUID(), "abc"]).success,
			false
		);
	});
});

void describe("buildBulkActionQuerySchema", () => {
	const schema = buildBulkActionQuerySchema(["add", "remove"]);

	void it("accepts the actions of the resource", () => {
		assert.deepEqual(schema.parse({ action: "remove" }), {
			action: "remove"
		});
	});

	void it("rejects an unknown or missing action", () => {
		assert.equal(schema.safeParse({ action: "delete" }).success, false);
		assert.equal(schema.safeParse({}).success, false);
	});
});
