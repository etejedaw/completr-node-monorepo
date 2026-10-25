import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BacklogQuerySchema } from "../../src/backlog/schemas/backlog-query.schema";
import { GamePlatinumParamsSchema } from "../../src/game-platinum/schemas/game-platinum-params.schema";
import { UpsertGamePlatinumSchema } from "../../src/game-platinum/schemas/upsert-game-platinum.schema";

const UUID = "4d5c8f7e-1b2a-4c3d-9e8f-0a1b2c3d4e5f";

void describe("UpsertGamePlatinumSchema", () => {
	void it("accepts an empty body", () => {
		assert.deepEqual(UpsertGamePlatinumSchema.parse({}), {});
	});

	void it("accepts every field and trims the notes", () => {
		assert.deepEqual(
			UpsertGamePlatinumSchema.parse({
				backlogId: UUID,
				platformId: UUID,
				platinumedAt: "2026-03-12",
				notes: "  done  "
			}),
			{
				backlogId: UUID,
				platformId: UUID,
				platinumedAt: "2026-03-12",
				notes: "done"
			}
		);
	});

	void it("accepts nulls to clear the optional fields", () => {
		const body = {
			backlogId: null,
			platformId: null,
			platinumedAt: null,
			notes: null
		};

		assert.deepEqual(UpsertGamePlatinumSchema.parse(body), body);
	});

	void it("accepts notes of 500 characters and rejects longer ones", () => {
		assert.equal(
			UpsertGamePlatinumSchema.safeParse({ notes: "x".repeat(500) })
				.success,
			true
		);
		assert.equal(
			UpsertGamePlatinumSchema.safeParse({ notes: "x".repeat(501) })
				.success,
			false
		);
	});

	void it("rejects invalid ids, dates and unknown fields", () => {
		for (const body of [
			{ backlogId: "run-1" },
			{ platformId: 7 },
			{ platinumedAt: "2026-13-01" },
			{ status: "completed" }
		]) {
			assert.equal(
				UpsertGamePlatinumSchema.safeParse(body).success,
				false
			);
		}
	});
});

void describe("GamePlatinumParamsSchema", () => {
	void it("requires a uuid gameId and nothing else", () => {
		assert.equal(
			GamePlatinumParamsSchema.safeParse({ gameId: UUID }).success,
			true
		);
		assert.equal(
			GamePlatinumParamsSchema.safeParse({ gameId: "hades" }).success,
			false
		);
		assert.equal(
			GamePlatinumParamsSchema.safeParse({ gameId: UUID, extra: 1 })
				.success,
			false
		);
	});
});

void describe("BacklogQuerySchema platinumed_only", () => {
	void it("parses platinumed_only as a boolean string", () => {
		assert.equal(
			BacklogQuerySchema.parse({ platinumed_only: "true" })
				.platinumed_only,
			true
		);
		assert.equal(
			BacklogQuerySchema.parse({ platinumed_only: "false" })
				.platinumed_only,
			false
		);
	});

	void it("rejects a platinumed_only that is not a boolean", () => {
		assert.equal(
			BacklogQuerySchema.safeParse({ platinumed_only: "maybe" }).success,
			false
		);
	});
});
