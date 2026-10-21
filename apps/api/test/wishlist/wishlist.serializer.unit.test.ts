import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type Wishlist } from "../../src/wishlist/wishlist.model";
import { wishlistSerializer } from "../../src/wishlist/wishlist.serializer";
import { asModel } from "../unit-helpers/as-model";
import { buildGame, buildPlatform } from "../unit-helpers/builders";

void describe("wishlistSerializer", () => {
	void it("serializes the game and the desired platform", () => {
		const entry = asModel<Wishlist>({
			id: "w-1",
			position: 0,
			Game: buildGame(),
			Platform: buildPlatform()
		});

		const result = wishlistSerializer(entry, ["backlog"]);

		assert.equal(result.game?.code, "hollow-knight");
		assert.deepEqual(result.platform, {
			id: "platform-1",
			name: "PC",
			abbreviation: "PC"
		});
		assert.deepEqual(result.moodTags, ["backlog"]);
	});

	void it("returns a null platform when no platform was chosen", () => {
		const entry = asModel<Wishlist>({
			id: "w-1",
			position: 0,
			Game: buildGame(),
			Platform: null
		});

		assert.equal(wishlistSerializer(entry).platform, null);
	});

	void it("defaults moodTags to an empty list and omits a missing game", () => {
		const entry = asModel<Wishlist>({
			id: "w-1",
			position: 0,
			Game: undefined,
			Platform: null
		});

		const result = wishlistSerializer(entry);

		assert.deepEqual(result.moodTags, []);
		assert.equal(result.game, undefined);
	});
});
