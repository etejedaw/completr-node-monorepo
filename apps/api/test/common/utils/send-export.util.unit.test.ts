import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildExportFilename } from "../../../src/common/utils/send-export.util";

const UTC_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

void describe("buildExportFilename", () => {
	void it("names the file after the resource, the UTC date and the format", () => {
		const today = new Date().toISOString().slice(0, 10);

		assert.equal(
			buildExportFilename("backlog", "csv"),
			`completr-backlog-${today}.csv`
		);
		assert.equal(
			buildExportFilename("list-my-rpgs", "json"),
			`completr-list-my-rpgs-${today}.json`
		);
		assert.match(today, UTC_DATE_PATTERN);
	});
});
