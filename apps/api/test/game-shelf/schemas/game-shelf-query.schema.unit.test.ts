import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { GameShelfQuerySchema } from "../../../src/game-shelf/schemas/game-shelf-query.schema";

void describe("GameShelfQuerySchema", () => {
	void it("accepts an empty query", () => {
		assert.deepEqual({ ...GameShelfQuerySchema.parse({}) }, {});
	});

	void it("keeps pagination, search and game_id together", () => {
		const gameId = randomUUID();

		const parsed = GameShelfQuerySchema.parse({
			limit: "1",
			offset: "0",
			search: "zelda",
			game_id: gameId
		});

		assert.equal(parsed.limit, 1);
		assert.equal(parsed.offset, 0);
		assert.equal(parsed.search, "zelda");
		assert.equal(parsed.game_id, gameId);
	});

	void it("rejects a game_id that is not a UUID", () => {
		for (const value of [
			"abc",
			"",
			"123",
			"' OR 1=1 --",
			randomUUID() + "x"
		])
			assert.equal(
				GameShelfQuerySchema.safeParse({ game_id: value }).success,
				false,
				value
			);
	});

	void it("rejects unknown parameters", () => {
		assert.equal(
			GameShelfQuerySchema.safeParse({ gameId: randomUUID() }).success,
			false
		);
		assert.equal(
			GameShelfQuerySchema.safeParse({ foo: "bar" }).success,
			false
		);
	});

	void it("still enforces the pagination bounds", () => {
		assert.equal(
			GameShelfQuerySchema.safeParse({ limit: "0" }).success,
			false
		);
		assert.equal(
			GameShelfQuerySchema.safeParse({ limit: "101" }).success,
			false
		);
		assert.equal(
			GameShelfQuerySchema.safeParse({ offset: "-1" }).success,
			false
		);
	});
});
