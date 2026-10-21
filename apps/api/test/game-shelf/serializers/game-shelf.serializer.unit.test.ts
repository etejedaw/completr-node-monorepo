import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type GameShelf } from "../../../src/game-shelf/game-shelf.model";
import { gameShelfSerializer } from "../../../src/game-shelf/serializers/game-shelf.serializer";
import { gameShelfMeSerializer } from "../../../src/game-shelf/serializers/game-shelf-me.serializer";
import { gameShelfSerializerTiny } from "../../../src/game-shelf/serializers/game-shelf-tiny.serializer";
import { asModel } from "../../unit-helpers/as-model";
import { buildGame, buildPlatform } from "../../unit-helpers/builders";

function buildShelfEntry() {
	return asModel<GameShelf>({
		id: "gs-1",
		userId: "u-1",
		gameId: "game-1",
		platformId: "platform-1",
		acquiredAt: "2023-12-25",
		edition: "Collector",
		notes: "gift",
		isPublic: false,
		Game: buildGame(),
		Platform: buildPlatform()
	});
}

void describe("gameShelfSerializer", () => {
	void it("serializes the entry with game and platform and no owner id", () => {
		const result = gameShelfSerializer(buildShelfEntry(), ["cozy"]);

		assert.equal(result.edition, "Collector");
		assert.deepEqual(result.moodTags, ["cozy"]);
		assert.equal(result.game.code, "hollow-knight");
		assert.equal(result.platform.code, "pc");
		assert.equal("userId" in result, false);
	});

	void it("defaults moodTags to an empty list", () => {
		assert.deepEqual(gameShelfSerializer(buildShelfEntry()).moodTags, []);
	});
});

void describe("gameShelfMeSerializer", () => {
	void it("adds the owner id and the inBacklog flag", () => {
		const result = gameShelfMeSerializer(
			buildShelfEntry(),
			undefined,
			true
		);

		assert.equal(result.userId, "u-1");
		assert.equal(result.inBacklog, true);
		assert.deepEqual(result.moodTags, []);
	});

	void it("defaults inBacklog to false", () => {
		assert.equal(gameShelfMeSerializer(buildShelfEntry()).inBacklog, false);
	});
});

void describe("gameShelfSerializerTiny", () => {
	void it("returns only the flat shelf columns without relations", () => {
		const result = gameShelfSerializerTiny(buildShelfEntry());

		assert.deepEqual(Object.keys(result).sort(), [
			"acquiredAt",
			"edition",
			"id",
			"isPublic",
			"notes",
			"platformId",
			"userId"
		]);
	});
});
