import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CompilationItem } from "../../src/compilation-items/compilation-item.model";
import { UserFranchise } from "../../src/franchises/user-franchise.model";
import { GameExternal } from "../../src/game-external/game-external.model";
import { GameGenre } from "../../src/game-genre/game-genre.model";
import { GamePlatform } from "../../src/game-platform/game-platform.model";
import { type Game } from "../../src/games/game.model";
import { Genre } from "../../src/genres/genres.model";
import { UserGameTag } from "../../src/mood-tags/user-game-tag.model";
import { type Platform } from "../../src/platforms/platform.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createFranchise,
	createGame,
	createGameScore,
	createGameTime,
	createPlatform,
	createScoreSource
} from "../helpers/factories.helper";

let platform: Platform;
let franchiseId: string;
let franchiseCode: string;
let franchiseName: string;
const catalog: Record<string, Game> = {};

useTestDatabase(async () => {
	await createScoreSource({ code: "completr", scale: 5, priority: 5 });
	await createScoreSource({
		code: "metacritic-t",
		scale: 100,
		priority: 100
	});
	platform = await createPlatform();
	const genre = await Genre.create({
		name: "Detail Genre",
		code: "detail-g"
	});
	const franchise = await createFranchise({ name: "Detail Saga" });
	franchiseId = franchise.id;
	franchiseCode = franchise.code;
	franchiseName = franchise.name;

	catalog.main = await createGame({ title: "Detail Main" });
	await catalog.main.update({
		description: "The main game",
		releaseAt: "2021-03-04",
		coverUrl: "https://img.completr.test/cover.jpg",
		backgroundUrl: "https://img.completr.test/background.jpg",
		franchiseId
	});
	catalog.sequel = await createGame({ title: "Detail Sequel" });
	await catalog.sequel.update({ franchiseId });
	catalog.retired = await createGame({
		title: "Detail Retired",
		isActive: false
	});
	await catalog.retired.update({ franchiseId });
	catalog.dlc = await createGame({ title: "Detail DLC" });
	await catalog.dlc.update({ isDlc: true, parentGameId: catalog.main.id });
	catalog.retiredDlc = await createGame({
		title: "Detail Retired DLC",
		isActive: false
	});
	await catalog.retiredDlc.update({
		isDlc: true,
		parentGameId: catalog.main.id
	});
	catalog.pack = await createGame({ title: "Detail Pack" });
	await catalog.pack.update({ isCompilation: true });
	catalog.retiredPack = await createGame({
		title: "Detail Retired Pack",
		isActive: false
	});
	await catalog.retiredPack.update({ isCompilation: true });
	catalog.lonely = await createGame({ title: "Detail Lonely" });

	await GameGenre.create({ gameId: catalog.main.id, genreId: genre.id });
	await GamePlatform.create({
		gameId: catalog.main.id,
		platformId: platform.id
	});
	await createGameScore(catalog.main.id, "completr", 4);
	await createGameScore(catalog.main.id, "metacritic-t", 80);
	await createGameTime(catalog.main.id, "completr", 10);
	await createGameTime(catalog.main.id, "hltb", 12);
	await GameExternal.create({
		gameId: catalog.main.id,
		source: "rawg",
		externalId: "4242"
	});
	await CompilationItem.bulkCreate([
		{
			parentGameId: catalog.pack.id,
			childGameId: catalog.main.id,
			position: 2
		},
		{
			parentGameId: catalog.pack.id,
			childGameId: catalog.sequel.id,
			position: 1
		},
		{
			parentGameId: catalog.retiredPack.id,
			childGameId: catalog.main.id,
			position: 1
		}
	]);
});

function getGame(authorization: string, code: string) {
	return api().get(`/games/${code}`).set("Authorization", authorization);
}

void describe("GET /games/:code game data", () => {
	void it("returns the full game with its related catalog data", async () => {
		const reader = await createUserWithSession();

		const response = await getGame(
			reader.authorization,
			catalog.main!.code
		);

		assert.equal(response.status, 200);
		const { game } = response.body.data;
		assert.equal(game.id, catalog.main!.id);
		assert.equal(game.title, "Detail Main");
		assert.equal(game.code, catalog.main!.code);
		assert.equal(game.description, "The main game");
		assert.equal(game.releaseAt, "2021-03-04");
		assert.equal(game.coverUrl, "https://img.completr.test/cover.jpg");
		assert.equal(
			game.backgroundUrl,
			"https://img.completr.test/background.jpg"
		);
		assert.equal(game.isDlc, false);
		assert.equal(game.isCompilation, false);
		assert.equal(game.isActive, true);
		assert.equal(game.parentGameId, null);
		assert.equal(game.variant, null);
		assert.equal(game.justImported, false);
		assert.equal(game.ratio, 8);
		assert.deepEqual(game.platforms, [
			{
				id: platform.id,
				name: platform.name,
				code: platform.code,
				abbreviation: platform.abbreviation
			}
		]);
		assert.deepEqual(
			game.genres.map((genre: { code: string }) => genre.code),
			["detail-g"]
		);
		assert.deepEqual(
			game.scores
				.map((score: { source: string; score: number }) => [
					score.source,
					score.score
				])
				.sort(),
			[
				["completr", 4],
				["metacritic-t", 80]
			]
		);
		assert.deepEqual(
			game.times
				.map((time: { source: string; duration: number }) => [
					time.source,
					time.duration
				])
				.sort(),
			[
				["completr", 10],
				["hltb", 12]
			]
		);
		assert.deepEqual(game.externalLinks, [
			{ source: "rawg", externalId: "4242" }
		]);
	});

	void it("returns empty relations for a game without extras", async () => {
		const reader = await createUserWithSession();

		const response = await getGame(
			reader.authorization,
			catalog.lonely!.code
		);

		assert.equal(response.status, 200);
		const { game } = response.body.data;
		assert.equal(game.title, "Detail Lonely");
		assert.equal(game.ratio, null);
		assert.deepEqual(game.platforms, []);
		assert.deepEqual(game.genres, []);
		assert.deepEqual(game.scores, []);
		assert.deepEqual(game.times, []);
		assert.deepEqual(game.dlcs, []);
		assert.deepEqual(game.externalLinks, []);
		assert.deepEqual(game.compilationItems, []);
		assert.deepEqual(game.partOfCompilations, []);
		assert.equal(game.parentGame, null);
		assert.equal(game.franchise, null);
		assert.equal(game.franchiseTracked, false);
		assert.deepEqual(game.userMoodTags, []);
	});

	void it("lists only active DLCs and links a DLC back to its parent", async () => {
		const reader = await createUserWithSession();

		const parent = await getGame(reader.authorization, catalog.main!.code);
		const dlc = await getGame(reader.authorization, catalog.dlc!.code);

		assert.deepEqual(parent.body.data.game.dlcs, [
			{
				id: catalog.dlc!.id,
				code: catalog.dlc!.code,
				title: "Detail DLC",
				backgroundUrl: null
			}
		]);
		assert.equal(dlc.body.data.game.isDlc, true);
		assert.equal(dlc.body.data.game.parentGameId, catalog.main!.id);
		assert.equal(dlc.body.data.game.parentGame.id, catalog.main!.id);
		assert.equal(dlc.body.data.game.parentGame.title, "Detail Main");
	});

	void it("lists the compilation items by position and the active compilations a game belongs to", async () => {
		const reader = await createUserWithSession();

		const pack = await getGame(reader.authorization, catalog.pack!.code);
		const child = await getGame(reader.authorization, catalog.main!.code);

		assert.equal(pack.body.data.game.isCompilation, true);
		assert.deepEqual(
			pack.body.data.game.compilationItems.map(
				(item: { position: number; game: { title: string } }) => [
					item.position,
					item.game.title
				]
			),
			[
				[1, "Detail Sequel"],
				[2, "Detail Main"]
			]
		);
		assert.deepEqual(
			child.body.data.game.partOfCompilations.map(
				(entry: { parentGame: { id: string; title: string } }) => [
					entry.parentGame.id,
					entry.parentGame.title
				]
			),
			[[catalog.pack!.id, "Detail Pack"]]
		);
	});

	void it("answers 404 GAME_NOT_FOUND for an unknown code", async () => {
		const reader = await createUserWithSession();

		const response = await getGame(reader.authorization, "does-not-exist");

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GAME_NOT_FOUND");
	});

	void it("answers 404 GAME_NOT_FOUND for an inactive game", async () => {
		const reader = await createUserWithSession();

		const response = await getGame(
			reader.authorization,
			catalog.retired!.code
		);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GAME_NOT_FOUND");
	});

	void it("hides a game once it is deactivated and shows it again when reactivated", async () => {
		const reader = await createUserWithSession();
		const game = await createGame({ title: "Detail Toggle" });

		const visible = await getGame(reader.authorization, game.code);
		await game.update({ isActive: false });
		const hidden = await getGame(reader.authorization, game.code);
		await game.update({ isActive: true });
		const restored = await getGame(reader.authorization, game.code);

		assert.equal(visible.status, 200);
		assert.equal(hidden.status, 404);
		assert.equal(restored.status, 200);
	});
});

void describe("GET /games/:code viewer data", () => {
	void it("returns the saga without the viewer's progress", async () => {
		const reader = await createUserWithSession();

		const response = await getGame(
			reader.authorization,
			catalog.main!.code
		);

		const { game } = response.body.data;
		assert.deepEqual(game.franchise, {
			id: franchiseId,
			name: franchiseName,
			code: franchiseCode
		});
		assert.equal(game.franchiseProgress, undefined);
		assert.equal(game.franchiseTracked, false);
	});

	void it("flags the saga as tracked only for the viewer that tracks it", async () => {
		const tracker = await createUserWithSession();
		const other = await createUserWithSession();
		await UserFranchise.create({ userId: tracker.user.id, franchiseId });

		const forTracker = await getGame(
			tracker.authorization,
			catalog.main!.code
		);
		const forOther = await getGame(other.authorization, catalog.main!.code);

		assert.equal(forTracker.body.data.game.franchiseTracked, true);
		assert.equal(forOther.body.data.game.franchiseTracked, false);
	});

	void it("returns only the mood tags of the viewer, sorted alphabetically", async () => {
		const viewer = await createUserWithSession();
		const other = await createUserWithSession();
		await UserGameTag.bulkCreate([
			{ userId: viewer.user.id, gameId: catalog.main!.id, tag: "cozy" },
			{
				userId: viewer.user.id,
				gameId: catalog.main!.id,
				tag: "atmospheric"
			},
			{
				userId: other.user.id,
				gameId: catalog.main!.id,
				tag: "secret-tag"
			},
			{
				userId: viewer.user.id,
				gameId: catalog.sequel!.id,
				tag: "other-game"
			}
		]);

		const forViewer = await getGame(
			viewer.authorization,
			catalog.main!.code
		);
		const forOther = await getGame(other.authorization, catalog.main!.code);

		assert.deepEqual(forViewer.body.data.game.userMoodTags, [
			"atmospheric",
			"cozy"
		]);
		assert.deepEqual(forOther.body.data.game.userMoodTags, ["secret-tag"]);
	});
});

void describe("GET /games/:code authentication", () => {
	void it("serves every role", async () => {
		const accounts = await Promise.all([
			createUserWithSession("premium"),
			createUserWithSession("moderator"),
			createUserWithSession("admin")
		]);

		for (const account of accounts) {
			const response = await getGame(
				account.authorization,
				catalog.lonely!.code
			);
			assert.equal(response.status, 200);
		}
	});

	void it("rejects a missing Authorization header with 422 AUTH_SCHEMA_INVALID", async () => {
		const response = await api().get(`/games/${catalog.main!.code}`);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await api()
			.get(`/games/${catalog.main!.code}`)
			.set("Authorization", "Bearer expired.token.value");

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});
