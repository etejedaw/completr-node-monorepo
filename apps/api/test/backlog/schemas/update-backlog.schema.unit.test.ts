import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { UpdateBacklogSchema } from "../../../src/backlog/schemas/update-backlog.schema";

const GAME_ID = "0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d";
const PLATFORM_ID = "1c2d3e4f-5061-4b7c-9d8e-0f1a2b3c4d5e";

void describe("UpdateBacklogSchema", () => {
	void it("accepts an empty update", () => {
		assert.equal(UpdateBacklogSchema.safeParse({}).success, true);
	});

	void it("allows clearing nullable fields with null", () => {
		const parsed = UpdateBacklogSchema.safeParse({
			startedAt: null,
			finishedAt: null,
			realDuration: null,
			userRating: null,
			notes: null,
			compilationGameId: null
		});

		assert.equal(parsed.success, true);
	});

	void it("does not allow clearing score or duration with null", () => {
		assert.equal(
			UpdateBacklogSchema.safeParse({ score: null }).success,
			false
		);
		assert.equal(
			UpdateBacklogSchema.safeParse({ duration: null }).success,
			false
		);
	});

	void it("does not allow changing the game or the platform", () => {
		assert.equal(
			UpdateBacklogSchema.safeParse({ gameId: GAME_ID }).success,
			false
		);
		assert.equal(
			UpdateBacklogSchema.safeParse({ platformId: PLATFORM_ID }).success,
			false
		);
	});

	void it("keeps validating score precision on update", () => {
		assert.equal(
			UpdateBacklogSchema.safeParse({ score: 4.123 }).success,
			false
		);
	});
});
