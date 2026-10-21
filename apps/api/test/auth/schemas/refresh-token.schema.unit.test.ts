import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RefreshTokenSchema } from "../../../src/auth/schemas/refresh-token.schema";

void describe("RefreshTokenSchema", () => {
	void it("defaults to an empty object when the body is missing", () => {
		assert.deepEqual(RefreshTokenSchema.parse(undefined), {});
	});

	void it("rejects an empty refresh token", () => {
		assert.equal(
			RefreshTokenSchema.safeParse({ refresh_token: "" }).success,
			false
		);
	});
});
