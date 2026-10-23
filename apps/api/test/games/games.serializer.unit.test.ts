import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type Backlog } from "../../src/backlog/backlog.model";
import { type ShowcaseGameRow } from "../../src/games/games.interface";
import {
	gameAdminListSerializer,
	gameFriendActivitySerializer,
	gameListSerializer,
	gameListSummarySerializer,
	gamePlayerSerializer,
	gameSerializer,
	gameShowcaseSerializer
} from "../../src/games/games.serializer";
import {
	buildBacklog,
	buildGame,
	buildPlatform
} from "../unit-helpers/builders";

const completrScores = [
	{ source: "rawg", score: 1 },
	{ source: "completr", score: 4 }
];
const completrTimes = [
	{ source: "hltb", duration: 100 },
	{ source: "completr", duration: 20 }
];

void describe("gameListSerializer", () => {
	void it("computes the ratio from the completr score and duration only", () => {
		const result = gameListSerializer(
			buildGame({ GameScores: completrScores, GameTimes: completrTimes })
		);

		assert.equal(result.ratio, 4);
	});

	void it("leaves the ratio null when the completr source is missing", () => {
		const result = gameListSerializer(
			buildGame({
				GameScores: [{ source: "rawg", score: 4 }],
				GameTimes: completrTimes
			})
		);

		assert.equal(result.ratio, null);
	});

	void it("defaults justImported to false and genres to empty", () => {
		const result = gameListSerializer(buildGame());

		assert.equal(result.justImported, false);
		assert.deepEqual(result.genres, []);
	});

	void it("flags justImported when requested", () => {
		assert.equal(
			gameListSerializer(buildGame(), { justImported: true })
				.justImported,
			true
		);
	});
});

void describe("gameAdminListSerializer", () => {
	void it("includes the activation state, scores and times by source", () => {
		const result = gameAdminListSerializer(
			buildGame({
				isActive: false,
				variant: undefined,
				GameScores: completrScores,
				GameTimes: completrTimes
			})
		);

		assert.equal(result.isActive, false);
		assert.equal(result.variant, null);
		assert.deepEqual(result.scores, completrScores);
		assert.deepEqual(result.times, completrTimes);
	});
});

void describe("gameSerializer", () => {
	void it("defaults every optional relation to an empty value", () => {
		const result = gameSerializer(buildGame());

		assert.deepEqual(result.platforms, []);
		assert.deepEqual(result.genres, []);
		assert.deepEqual(result.dlcs, []);
		assert.deepEqual(result.externalLinks, []);
		assert.deepEqual(result.compilationItems, []);
		assert.deepEqual(result.partOfCompilations, []);
		assert.equal(result.parentGame, null);
		assert.equal(result.franchise, null);
		assert.equal(result.variant, null);
		assert.equal(result.isCompilation, false);
	});

	void it("serializes the parent game, franchise and platforms", () => {
		const result = gameSerializer(
			buildGame({
				ParentGame: buildGame({
					id: "parent",
					code: "parent-code",
					title: "Parent"
				}),
				Franchise: {
					id: "f-1",
					name: "Zelda",
					code: "zelda",
					createdAt: "x"
				},
				Platforms: [buildPlatform()]
			})
		);

		assert.equal(result.parentGame?.code, "parent-code");
		assert.deepEqual(result.franchise, {
			id: "f-1",
			name: "Zelda",
			code: "zelda"
		});
		assert.equal(result.platforms[0]?.abbreviation, "PC");
	});

	void it("exposes the compilation children and drops orphan parent links as null", () => {
		const result = gameSerializer(
			buildGame({
				CompilationItems: [
					{
						id: "ci-1",
						position: 1,
						ChildGame: buildGame({ id: "child" })
					},
					{ id: "ci-2", position: 2, ChildGame: null }
				],
				PartOfCompilations: [{ id: "ci-3", ParentGame: null }]
			})
		);

		assert.equal(result.compilationItems[0]?.game?.id, "child");
		assert.equal(result.compilationItems[1]?.game, null);
		assert.deepEqual(result.partOfCompilations, [null]);
	});

	void it("serializes external links by source and id only", () => {
		const result = gameSerializer(
			buildGame({
				GameExternals: [
					{
						source: "rawg",
						externalId: "123",
						id: "x",
						gameId: "game-1"
					}
				]
			})
		);

		assert.deepEqual(result.externalLinks, [
			{ source: "rawg", externalId: "123" }
		]);
	});
});

void describe("gameShowcaseSerializer", () => {
	function row(overrides: Partial<ShowcaseGameRow>): ShowcaseGameRow {
		return {
			id: "g",
			code: "g",
			title: "G",
			backgroundUrl: null,
			releaseYear: null,
			genres: [],
			score: null,
			duration: null,
			...overrides
		} as ShowcaseGameRow;
	}

	void it("exposes catalog data, rounded score and hours, and the ratio of every game", () => {
		const result = gameShowcaseSerializer([
			row({
				id: "b",
				code: "brothers",
				title: "Brothers",
				backgroundUrl: "https://img.test/b.jpg",
				releaseYear: 2013,
				genres: ["Adventure", "Puzzle"],
				score: 4.456,
				duration: 10.26
			})
		]);

		assert.deepEqual(result, {
			games: [
				{
					id: "b",
					code: "brothers",
					title: "Brothers",
					backgroundUrl: "https://img.test/b.jpg",
					releaseYear: 2013,
					genres: ["Adventure", "Puzzle"],
					score: 4.46,
					hours: 10.3,
					ratio: 8.69
				}
			]
		});
	});

	void it("nulls score, hours and ratio when the game lacks them", () => {
		const [scoreOnly, unrated] = gameShowcaseSerializer([
			row({ id: "a", score: 3, duration: null }),
			row({ id: "b" })
		]).games;

		assert.equal(scoreOnly?.score, 3);
		assert.equal(scoreOnly?.hours, null);
		assert.equal(scoreOnly?.ratio, null);
		assert.equal(unrated?.score, null);
		assert.equal(unrated?.ratio, null);
	});

	void it("does not include a featured game", () => {
		assert.deepEqual(gameShowcaseSerializer([]), { games: [] });
	});
});

void describe("gameListSummarySerializer", () => {
	void it("nulls the owner when the list has no owner username", () => {
		const result = gameListSummarySerializer({
			id: "l-1",
			name: "Official",
			description: undefined,
			isOfficial: true,
			ownerUsername: null,
			completed: false
		});

		assert.equal(result.owner, null);
		assert.equal(result.description, null);
	});

	void it("wraps the owner username", () => {
		const result = gameListSummarySerializer({
			id: "l-1",
			name: "Mine",
			description: "d",
			isOfficial: false,
			ownerUsername: "player",
			completed: true
		});

		assert.deepEqual(result.owner, { username: "player" });
	});
});

void describe("friend activity and player serializers", () => {
	const entry = buildBacklog({
		User: {
			username: "friend",
			name: "Friend",
			avatarUrl: undefined,
			role: "user",
			email: "f@x.y"
		},
		finishedAt: undefined,
		userRating: undefined
	}) as Backlog;

	void it("normalizes missing friend activity values to null", () => {
		const result = gameFriendActivitySerializer(entry);

		assert.equal(result.avatarUrl, null);
		assert.equal(result.finishedAt, null);
		assert.equal(result.userRating, null);
	});

	void it("never exposes the user email or the backlog notes", () => {
		const serialized = JSON.stringify([
			gameFriendActivitySerializer(entry),
			gamePlayerSerializer(entry)
		]);

		assert.equal(serialized.includes("f@x.y"), false);
		assert.equal(serialized.includes("private notes"), false);
	});

	void it("serializes the player status without rating or dates", () => {
		assert.deepEqual(Object.keys(gamePlayerSerializer(entry)).sort(), [
			"avatarUrl",
			"name",
			"role",
			"status",
			"username"
		]);
	});
});
