import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ExportFormatQuerySchema } from "../../../src/common/schemas/export-format-query.schema";

void describe("ExportFormatQuerySchema", () => {
	void it("defaults to csv", () => {
		assert.deepEqual(ExportFormatQuerySchema.parse({}), { format: "csv" });
	});

	void it("accepts csv and json", () => {
		assert.equal(
			ExportFormatQuerySchema.parse({ format: "csv" }).format,
			"csv"
		);
		assert.equal(
			ExportFormatQuerySchema.parse({ format: "json" }).format,
			"json"
		);
	});

	void it("rejects any other format", () => {
		assert.equal(
			ExportFormatQuerySchema.safeParse({ format: "xlsx" }).success,
			false
		);
	});
});
