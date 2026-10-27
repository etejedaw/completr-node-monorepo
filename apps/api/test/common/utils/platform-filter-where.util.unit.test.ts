import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildPlatformFilterWhere } from "../../../src/common/utils/platform-filter-where.util";

void describe("buildPlatformFilterWhere", () => {
	void it("does not filter without a platform", () => {
		assert.deepEqual(buildPlatformFilterWhere(undefined), {});
	});

	void it("filters by the given platform id", () => {
		assert.deepEqual(buildPlatformFilterWhere("platform-id"), {
			platformId: "platform-id"
		});
	});

	void it("matches rows without platform for any", () => {
		assert.deepEqual(buildPlatformFilterWhere("any"), { platformId: null });
	});
});
