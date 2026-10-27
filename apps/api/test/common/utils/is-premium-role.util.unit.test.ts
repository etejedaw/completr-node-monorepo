import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isPremiumRole } from "../../../src/common/utils/is-premium-role.util";

void describe("isPremiumRole", () => {
	for (const role of ["premium", "moderator", "admin"]) {
		void it(`accepts ${role}`, () => {
			assert.equal(isPremiumRole(role), true);
		});
	}

	void it("rejects user", () => {
		assert.equal(isPremiumRole("user"), false);
	});
});
