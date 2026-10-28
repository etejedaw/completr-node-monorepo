import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	type ClosedRewindRun,
	type RewindRun
} from "../../src/rewind/rewind-run.interface";
import { countGenresPlayed } from "../../src/rewind/utils/count-genres-played.util";
import { countPlatformsPlayed } from "../../src/rewind/utils/count-platforms-played.util";
import { pickTopGenres } from "../../src/rewind/utils/pick-top-genres.util";
import { pickTopPlatforms } from "../../src/rewind/utils/pick-top-platforms.util";
import { finishedRun } from "./rewind-run.builder";

function closed(
	gameCode: string,
	overrides: Partial<RewindRun> = {}
): ClosedRewindRun {
	return finishedRun(gameCode, "2025-05-05", overrides) as ClosedRewindRun;
}

function genre(gameCode: string, code: string) {
	return { gameId: `id-${gameCode}`, code, name: code.toUpperCase() };
}

function platform(name: string) {
	return { name, abbreviation: name.slice(0, 3) };
}

void describe("pickTopGenres and countGenresPlayed", () => {
	const runs = ["a", "b", "c", "d", "e"].map(code => closed(code));
	const genres = [
		genre("a", "rpg"),
		genre("b", "rpg"),
		genre("c", "rpg"),
		genre("a", "action"),
		genre("b", "action"),
		genre("c", "puzzle"),
		genre("d", "puzzle"),
		genre("e", "horror"),
		genre("e", "adventure"),
		genre("unfinished", "shooter")
	];

	void it("returns up to three genres by finished games, ties by name", () => {
		assert.deepEqual(pickTopGenres(runs, genres), [
			{ code: "rpg", name: "RPG", count: 3 },
			{ code: "action", name: "ACTION", count: 2 },
			{ code: "puzzle", name: "PUZZLE", count: 2 }
		]);
	});

	void it("counts every distinct genre of the finished games", () => {
		assert.equal(countGenresPlayed(runs, genres), 5);
	});

	void it("returns fewer than three when there are fewer genres", () => {
		assert.deepEqual(pickTopGenres([closed("e")], genres), [
			{ code: "adventure", name: "ADVENTURE", count: 1 },
			{ code: "horror", name: "HORROR", count: 1 }
		]);
	});

	void it("is empty and zero without finished games or genres", () => {
		assert.deepEqual(pickTopGenres([], genres), []);
		assert.deepEqual(pickTopGenres(runs, []), []);
		assert.equal(countGenresPlayed([], genres), 0);
	});

	void it("ignores duplicated genre rows for the same game", () => {
		const repeated = [genre("a", "rpg"), genre("a", "rpg")];

		assert.deepEqual(pickTopGenres([closed("a")], repeated), [
			{ code: "rpg", name: "RPG", count: 1 }
		]);
		assert.equal(countGenresPlayed([closed("a")], repeated), 1);
	});
});

void describe("pickTopPlatforms and countPlatformsPlayed", () => {
	const pc = platform("PC");
	const ps5 = platform("PlayStation 5");
	const nsw = platform("Switch");
	const xbox = platform("Xbox");

	void it("returns up to three platforms by finished runs, ties by name", () => {
		const runs = [
			closed("a", { platform: ps5 }),
			closed("a", { platform: ps5 }),
			closed("b", { platform: xbox }),
			closed("c", { platform: pc }),
			closed("d", { platform: nsw }),
			closed("e", { platform: null })
		];

		assert.deepEqual(pickTopPlatforms(runs), [
			{ name: "PlayStation 5", abbreviation: "Pla", count: 2 },
			{ name: "PC", abbreviation: "PC", count: 1 },
			{ name: "Switch", abbreviation: "Swi", count: 1 }
		]);
		assert.equal(countPlatformsPlayed(runs), 4);
	});

	void it("is empty and zero without platforms", () => {
		const runs = [closed("a", { platform: null })];

		assert.deepEqual(pickTopPlatforms(runs), []);
		assert.deepEqual(pickTopPlatforms([]), []);
		assert.equal(countPlatformsPlayed(runs), 0);
	});
});
