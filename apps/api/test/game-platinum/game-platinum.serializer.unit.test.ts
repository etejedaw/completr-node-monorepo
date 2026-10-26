import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	backlogPublicSerializer,
	backlogSerializer
} from "../../src/backlog/backlog.serializer";
import { type GamePlatinum } from "../../src/game-platinum/game-platinum.model";
import {
	gamePlatinumPublicSerializer,
	gamePlatinumSerializer,
	platinumEntrySerializer
} from "../../src/game-platinum/game-platinum.serializer";
import { asModel } from "../unit-helpers/as-model";
import { buildBacklog } from "../unit-helpers/builders";

function buildPlatinum(overrides: Record<string, unknown> = {}) {
	return asModel<GamePlatinum>({
		id: "platinum-1",
		userId: "user-1",
		gameId: "game-1",
		backlogId: "backlog-1",
		platformId: "platform-1",
		platinumedAt: "2026-03-12",
		notes: "all trophies",
		Backlog: { id: "backlog-1", isPublic: true },
		...overrides
	});
}

void describe("gamePlatinumSerializer", () => {
	void it("exposes id, run, platform, date and notes", () => {
		assert.deepEqual(gamePlatinumSerializer(buildPlatinum()), {
			id: "platinum-1",
			backlogId: "backlog-1",
			platformId: "platform-1",
			platinumedAt: "2026-03-12",
			notes: "all trophies"
		});
	});
});

void describe("gamePlatinumPublicSerializer", () => {
	void it("omits the notes and keeps the id of a public run", () => {
		assert.deepEqual(gamePlatinumPublicSerializer(buildPlatinum()), {
			id: "platinum-1",
			backlogId: "backlog-1",
			platformId: "platform-1",
			platinumedAt: "2026-03-12"
		});
	});

	void it("hides the id of a private run", () => {
		const platinum = buildPlatinum({
			Backlog: { id: "backlog-1", isPublic: false }
		});

		assert.equal(gamePlatinumPublicSerializer(platinum).backlogId, null);
	});

	void it("keeps a null run as null", () => {
		const platinum = buildPlatinum({ backlogId: null, Backlog: null });

		assert.equal(gamePlatinumPublicSerializer(platinum).backlogId, null);
	});
});

void describe("platinumEntrySerializer", () => {
	const game = {
		id: "game-1",
		code: "bloodborne",
		title: "Bloodborne",
		backgroundUrl: "https://img.test/bb.jpg",
		isDlc: false
	};
	const platform = {
		id: "platform-1",
		name: "PlayStation 4",
		abbreviation: "PS4"
	};

	void it("adds the game and the platform to the owner view with notes", () => {
		const platinum = buildPlatinum({ Game: game, Platform: platform });

		assert.deepEqual(platinumEntrySerializer(platinum, true), {
			...gamePlatinumSerializer(platinum),
			platform,
			game
		});
	});

	void it("uses the public view for visitors", () => {
		const platinum = buildPlatinum({
			Game: game,
			Platform: platform,
			Backlog: { id: "backlog-1", isPublic: false }
		});

		const result = platinumEntrySerializer(platinum, false);

		assert.equal("notes" in result, false);
		assert.equal(result.backlogId, null);
		assert.deepEqual(result.game, game);
	});

	void it("serves a null platform when the platinum has none", () => {
		const platinum = buildPlatinum({
			platformId: null,
			Game: game,
			Platform: null
		});

		assert.equal(platinumEntrySerializer(platinum, false).platform, null);
	});
});

void describe("backlog serializers with platinum", () => {
	void it("adds the platinum when it was loaded, null included", () => {
		const platinum = gamePlatinumSerializer(buildPlatinum());

		assert.deepEqual(
			backlogSerializer(buildBacklog(), null, [], null, [], platinum)
				.platinum,
			platinum
		);
		assert.equal(
			backlogSerializer(buildBacklog(), null, [], null, [], null)
				.platinum,
			null
		);
	});

	void it("omits the platinum key when it was not loaded", () => {
		assert.equal("platinum" in backlogSerializer(buildBacklog()), false);
		assert.equal(
			"platinum" in backlogPublicSerializer(buildBacklog()),
			false
		);
	});

	void it("passes the public platinum through the public serializer", () => {
		const platinum = gamePlatinumPublicSerializer(buildPlatinum());

		const result = backlogPublicSerializer(
			buildBacklog(),
			null,
			[],
			undefined,
			[],
			platinum
		);

		assert.deepEqual(result.platinum, platinum);
		assert.equal("notes" in result, false);
	});
});
