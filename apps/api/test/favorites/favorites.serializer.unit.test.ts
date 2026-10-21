import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type Favorite } from "../../src/favorites/favorite.model";
import { favoriteSerializer } from "../../src/favorites/favorites.serializer";
import { asModel } from "../unit-helpers/as-model";
import { buildGame } from "../unit-helpers/builders";

void describe("favoriteSerializer", () => {
	void it("serializes position, game and the inBacklog flag", () => {
		const entry = asModel<Favorite>({
			id: "f-1",
			position: 3,
			Game: buildGame()
		});

		const result = favoriteSerializer(entry, ["cozy"], true);

		assert.equal(result.position, 3);
		assert.equal(result.inBacklog, true);
		assert.deepEqual(result.moodTags, ["cozy"]);
		assert.equal(result.game?.title, "Hollow Knight");
	});

	void it("defaults inBacklog to false and moodTags to empty", () => {
		const result = favoriteSerializer(
			asModel<Favorite>({ id: "f-1", position: 0, Game: undefined })
		);

		assert.equal(result.inBacklog, false);
		assert.deepEqual(result.moodTags, []);
		assert.equal(result.game, undefined);
	});
});
