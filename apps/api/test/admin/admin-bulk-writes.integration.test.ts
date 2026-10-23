import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { CompilationItem } from "../../src/compilation-items/compilation-item.model";
import { sequelize } from "../../src/database/sequelize.database";
import {
	EXTERNAL_SOURCES,
	GameExternal
} from "../../src/game-external/game-external.model";
import { GameGenre } from "../../src/game-genre/game-genre.model";
import { GamePlatform } from "../../src/game-platform/game-platform.model";
import { GameScore } from "../../src/game-scores/game-score.model";
import { GameTime } from "../../src/game-times/game-time.model";
import { Game } from "../../src/games/game.model";
import { assertVariantConsistency } from "../../src/games/services/games-variant.service";
import { Genre } from "../../src/genres/genres.model";
import { ListItem } from "../../src/list-items/list-item.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createGame,
	createGameScore,
	createGameTime,
	createList,
	createPlatform,
	createScoreSource
} from "../helpers/factories.helper";
import { countQueries } from "../helpers/query-counter.helper";

const FEW = 1;
const MANY = 4;
const PAST = new Date("2020-01-01T00:00:00.000Z");
const TIME_SOURCES_AVAILABLE = ["hltb", "rawg", "completr"] as const;

let scoreSourceCodes: string[];

useTestDatabase(async () => {
	const sources = await Promise.all(
		Array.from({ length: MANY }, () => createScoreSource({ scale: 100 }))
	);
	scoreSourceCodes = sources.map(source => source.code);
});

function uniqueTitle(prefix: string) {
	return `${prefix} ${randomUUID().replaceAll("-", "").slice(0, 10)}`;
}

function createGenre() {
	const suffix = randomUUID().replaceAll("-", "").slice(0, 10);
	return Genre.create({ name: `Genre ${suffix}`, code: `genre-${suffix}` });
}

function scoreEntries(count: number) {
	return scoreSourceCodes
		.slice(0, count)
		.map((source, index) => ({ source, score: 50 + index }));
}

function timeEntries(count: number) {
	return TIME_SOURCES_AVAILABLE.slice(0, count).map((source, index) => ({
		source,
		duration: 10 + index
	}));
}

function variantInputs(count: number) {
	return Array.from({ length: count }, (_, index) => ({
		title: uniqueTitle(`Variant ${index}`),
		variant: `Edition ${index}`
	}));
}

async function warmUpGameLists(authorization: string) {
	const game = await createGame();
	await api()
		.put(`/games/${game.id}/lists`)
		.set("Authorization", authorization)
		.send({ listIds: [] })
		.expect(200);
}

void describe("POST /games query count", () => {
	void it("does not grow with the number of scores and times", async () => {
		const admin = await createUserWithSession("admin");
		await api()
			.post("/games")
			.set("Authorization", admin.authorization)
			.send({ title: uniqueTitle("Warm up") })
			.expect(201);
		const counts: number[] = [];
		for (const [scoresCount, timesCount] of [
			[FEW, FEW],
			[MANY, TIME_SOURCES_AVAILABLE.length]
		] as const) {
			const title = uniqueTitle("Registered");
			const scores = scoreEntries(scoresCount);
			const times = timeEntries(timesCount);
			let gameId = "";
			counts.push(
				await countQueries(async () => {
					const response = await api()
						.post("/games")
						.set("Authorization", admin.authorization)
						.send({ title, scores, times })
						.expect(201);
					gameId = response.body.data.game.id as string;
				})
			);

			const storedScores = await GameScore.findAll({ where: { gameId } });
			assert.deepEqual(
				storedScores
					.map(({ source, score }) => ({ source, score }))
					.sort((a, b) => a.source.localeCompare(b.source)),
				[...scores].sort((a, b) => a.source.localeCompare(b.source))
			);
			const storedTimes = await GameTime.findAll({ where: { gameId } });
			assert.deepEqual(
				storedTimes
					.map(({ source, duration }) => ({ source, duration }))
					.sort((a, b) => a.source.localeCompare(b.source)),
				[...times].sort((a, b) => a.source.localeCompare(b.source))
			);
		}
		assert.equal(counts[1], counts[0]);
	});
});

void describe("assertVariantConsistency", () => {
	void it("does not grow with the number of external ids shared with other variants", async () => {
		const counts: number[] = [];
		for (const size of [FEW, MANY]) {
			const externalIds: { source: string; externalId: string }[] = [];
			for (let index = 0; index < size; index++) {
				const sibling = await createGame();
				await sibling.update({ variant: "Original" });
				const source = EXTERNAL_SOURCES[index]!;
				const externalId = randomUUID().slice(0, 12);
				await GameExternal.create({
					gameId: sibling.id,
					source,
					externalId
				});
				externalIds.push({ source, externalId });
			}
			counts.push(
				await countQueries(() =>
					assertVariantConsistency(externalIds, "Remaster", null)
				)
			);
		}
		assert.equal(counts[1], counts[0]);
	});

	void it("still requires a variant name when a sibling has none", async () => {
		const admin = await createUserWithSession("admin");
		const sibling = await createGame();
		const externalId = randomUUID().slice(0, 12);
		await GameExternal.create({
			gameId: sibling.id,
			source: "steam",
			externalId
		});

		const response = await api()
			.post("/games")
			.set("Authorization", admin.authorization)
			.send({
				title: uniqueTitle("Sibling"),
				variant: "Remaster",
				externalIds: [{ source: "steam", externalId }]
			});

		assert.equal(response.status, 422);
	});
});

void describe("POST /games/:id/split query count", () => {
	async function createSplittableGame() {
		const admin = await createUserWithSession("admin");
		const [platform, genre] = await Promise.all([
			createPlatform(),
			createGenre()
		]);
		const created = await api()
			.post("/games")
			.set("Authorization", admin.authorization)
			.send({
				title: uniqueTitle("Base"),
				platforms: [platform.code],
				genres: [genre.code],
				scores: scoreEntries(MANY),
				times: timeEntries(TIME_SOURCES_AVAILABLE.length),
				externalIds: [
					{ source: "steam", externalId: randomUUID().slice(0, 12) }
				]
			})
			.expect(201);
		return { admin, gameId: created.body.data.game.id as string };
	}

	async function measureSplit(variantsCount: number) {
		const { admin, gameId } = await createSplittableGame();
		const variants = variantInputs(variantsCount);
		let body: { games: { id: string; title: string }[] } = { games: [] };
		const count = await countQueries(async () => {
			const response = await api()
				.post(`/games/${gameId}/split`)
				.set("Authorization", admin.authorization)
				.send({ variants })
				.expect(200);
			body = response.body.data;
		});
		assert.deepEqual(
			body.games.map(game => game.title),
			variants.map(variant => variant.title)
		);
		assert.equal(body.games[0]!.id, gameId);
		for (const game of body.games.slice(1)) {
			assert.equal(
				await GameScore.count({ where: { gameId: game.id } }),
				MANY
			);
			assert.equal(
				await GameTime.count({ where: { gameId: game.id } }),
				TIME_SOURCES_AVAILABLE.length
			);
			assert.equal(
				await GameExternal.count({ where: { gameId: game.id } }),
				1
			);
			assert.equal(
				await GamePlatform.count({ where: { gameId: game.id } }),
				1
			);
			assert.equal(
				await GameGenre.count({ where: { gameId: game.id } }),
				1
			);
		}
		return count;
	}

	void it("does not grow with the number of variants", async () => {
		const fewVariants = await measureSplit(2);
		const manyVariants = await measureSplit(MANY);
		assert.equal(manyVariants, fewVariants);
	});
});

void describe("PUT /games/:id/compilation-items query count", () => {
	async function createCompilation() {
		const admin = await createUserWithSession("admin");
		const [platform, genre] = await Promise.all([
			createPlatform(),
			createGenre()
		]);
		const created = await api()
			.post("/games")
			.set("Authorization", admin.authorization)
			.send({
				title: uniqueTitle("Collection"),
				platforms: [platform.code],
				genres: [genre.code],
				scores: scoreEntries(MANY),
				times: timeEntries(TIME_SOURCES_AVAILABLE.length)
			})
			.expect(201);
		return { admin, parentId: created.body.data.game.id as string };
	}

	void it("does not grow with the number of parts created", async () => {
		const warm = await createCompilation();
		await api()
			.put(`/games/${warm.parentId}/compilation-items`)
			.set("Authorization", warm.admin.authorization)
			.send({ items: [{ mode: "create", title: uniqueTitle("Warm") }] })
			.expect(200);
		const counts: number[] = [];
		for (const size of [FEW, MANY]) {
			const { admin, parentId } = await createCompilation();
			const titles = Array.from({ length: size }, (_, index) =>
				uniqueTitle(`Part ${index}`)
			);
			counts.push(
				await countQueries(() =>
					api()
						.put(`/games/${parentId}/compilation-items`)
						.set("Authorization", admin.authorization)
						.send({
							items: titles.map(title => ({
								mode: "create",
								title
							}))
						})
						.expect(200)
				)
			);
			const items = await CompilationItem.findAll({
				where: { parentGameId: parentId },
				order: [["position", "ASC"]]
			});
			assert.deepEqual(
				items.map(item => item.position),
				titles.map((_, index) => index)
			);
			for (const item of items) {
				const childId = item.childGameId;
				assert.equal(
					await GameScore.count({ where: { gameId: childId } }),
					MANY
				);
				assert.equal(
					await GameTime.count({ where: { gameId: childId } }),
					TIME_SOURCES_AVAILABLE.length
				);
				assert.equal(
					await GamePlatform.count({ where: { gameId: childId } }),
					1
				);
				assert.equal(
					await GameGenre.count({ where: { gameId: childId } }),
					1
				);
			}
		}
		assert.equal(counts[1], counts[0]);
	});

	void it("keeps the order of the items when linking and creating are mixed", async () => {
		const { admin, parentId } = await createCompilation();
		const linked = await createGame();
		const firstTitle = uniqueTitle("First");
		const lastTitle = uniqueTitle("Last");

		await api()
			.put(`/games/${parentId}/compilation-items`)
			.set("Authorization", admin.authorization)
			.send({
				items: [
					{ mode: "create", title: firstTitle },
					{ mode: "link", gameId: linked.id },
					{ mode: "create", title: lastTitle }
				]
			})
			.expect(200);

		const items = await CompilationItem.findAll({
			where: { parentGameId: parentId },
			order: [["position", "ASC"]]
		});
		const children = await Game.findAll({
			where: { id: items.map(item => item.childGameId) }
		});
		const titleById = new Map(children.map(game => [game.id, game.title]));
		assert.deepEqual(
			items.map(item => titleById.get(item.childGameId)),
			[firstTitle, linked.title, lastTitle]
		);
	});
});

void describe("game external ids query count", () => {
	function externalEntries(count: number) {
		return EXTERNAL_SOURCES.slice(0, count).map(source => ({
			source,
			externalId: randomUUID().slice(0, 12)
		}));
	}

	void it("does not grow with the number of external ids when registering", async () => {
		const admin = await createUserWithSession("admin");
		await api()
			.post("/games")
			.set("Authorization", admin.authorization)
			.send({ title: uniqueTitle("Warm up") })
			.expect(201);
		const counts: number[] = [];
		for (const size of [FEW, MANY]) {
			const externalIds = externalEntries(size);
			let gameId = "";
			counts.push(
				await countQueries(async () => {
					const response = await api()
						.post("/games")
						.set("Authorization", admin.authorization)
						.send({ title: uniqueTitle("Externals"), externalIds })
						.expect(201);
					gameId = response.body.data.game.id as string;
				})
			);
			const stored = await GameExternal.findAll({ where: { gameId } });
			assert.deepEqual(
				stored
					.map(({ source, externalId }) => ({ source, externalId }))
					.sort((a, b) => a.source.localeCompare(b.source)),
				[...externalIds].sort((a, b) =>
					a.source.localeCompare(b.source)
				)
			);
		}
		assert.equal(counts[1], counts[0]);
	});

	void it("does not grow with the number of external ids when updating, mixing new, changed and unchanged ones", async () => {
		const admin = await createUserWithSession("admin");
		const counts: number[] = [];
		for (const size of [3, MANY]) {
			const initial = externalEntries(size);
			const created = await api()
				.post("/games")
				.set("Authorization", admin.authorization)
				.send({
					title: uniqueTitle("Updated"),
					externalIds: initial.slice(0, size - 1)
				})
				.expect(201);
			const gameId = created.body.data.game.id as string;
			await sequelize.query(
				`UPDATE "GameExternals" SET "updatedAt" = :past WHERE "gameId" = :gameId`,
				{ replacements: { past: PAST, gameId } }
			);
			const [unchanged, ...rest] = initial;
			const changed = rest.slice(0, -1).map(entry => ({
				source: entry.source,
				externalId: `changed-${entry.externalId}`
			}));
			const added = rest[rest.length - 1]!;
			const payload = [unchanged!, ...changed, added];

			counts.push(
				await countQueries(() =>
					api()
						.patch(`/games/${gameId}`)
						.set("Authorization", admin.authorization)
						.send({ externalIds: payload })
						.expect(200)
				)
			);

			const stored = await GameExternal.findAll({ where: { gameId } });
			assert.deepEqual(
				stored
					.map(({ source, externalId }) => ({ source, externalId }))
					.sort((a, b) => a.source.localeCompare(b.source)),
				[...payload].sort((a, b) => a.source.localeCompare(b.source))
			);
			const unchangedRow = stored.find(
				row => row.source === unchanged!.source
			)!;
			assert.equal(unchangedRow.updatedAt.getTime(), PAST.getTime());
			for (const entry of changed) {
				const row = stored.find(item => item.source === entry.source)!;
				assert.ok(row.updatedAt.getTime() > PAST.getTime());
			}
		}
		assert.equal(counts[1], counts[0]);
	});

	void it("keeps the last external id when the same source is sent twice", async () => {
		const admin = await createUserWithSession("admin");
		const created = await api()
			.post("/games")
			.set("Authorization", admin.authorization)
			.send({ title: uniqueTitle("Repeated") })
			.expect(201);
		const gameId = created.body.data.game.id as string;

		await api()
			.patch(`/games/${gameId}`)
			.set("Authorization", admin.authorization)
			.send({
				externalIds: [
					{ source: "steam", externalId: "first" },
					{ source: "steam", externalId: "second" }
				]
			})
			.expect(200);

		const stored = await GameExternal.findAll({ where: { gameId } });
		assert.deepEqual(
			stored.map(row => row.externalId),
			["second"]
		);
	});
});

void describe("PUT /games/:gameId/lists query count", () => {
	async function createPositionedLists(
		userId: string,
		gameId: string,
		count: number,
		options: { containing: boolean }
	) {
		const lists = [];
		for (let index = 0; index < count; index++) {
			const list = await createList(userId, scoreSourceCodes[0]!);
			const others = [await createGame(), await createGame()];
			const games = options.containing
				? [others[0]!, { id: gameId }, others[1]!]
				: others;
			for (const [position, game] of games.entries()) {
				await ListItem.create({
					listId: list.id,
					gameId: game.id,
					position: position + 1,
					score: null,
					duration: null
				});
			}
			lists.push(list);
		}
		return lists;
	}

	async function positionsOf(listId: string) {
		const items = await ListItem.findAll({
			where: { listId },
			order: [["position", "ASC"]]
		});
		return items.map(item => item.position);
	}

	void it("does not grow with the number of lists the game is added to", async () => {
		const owner = await createUserWithSession("premium");
		await warmUpGameLists(owner.authorization);
		const counts: number[] = [];
		for (const size of [FEW, MANY]) {
			const game = await createGame();
			await createGameScore(game.id, scoreSourceCodes[0]!, 80);
			await createGameTime(game.id, "hltb", 10);
			const lists = await createPositionedLists(
				owner.user.id,
				game.id,
				size,
				{ containing: false }
			);
			counts.push(
				await countQueries(() =>
					api()
						.put(`/games/${game.id}/lists`)
						.set("Authorization", owner.authorization)
						.send({ listIds: lists.map(list => list.id) })
						.expect(200)
				)
			);
			for (const list of lists) {
				const items = await ListItem.findAll({
					where: { listId: list.id },
					order: [["position", "ASC"]]
				});
				assert.deepEqual(
					items.map(item => item.position),
					[1, 2, 3]
				);
				assert.equal(items[2]!.gameId, game.id);
				assert.equal(items[2]!.score, 4);
				assert.equal(items[2]!.duration, 10);
			}
		}
		assert.equal(counts[1], counts[0]);
	});

	void it("does not grow with the number of lists the game is removed from", async () => {
		const owner = await createUserWithSession("premium");
		await warmUpGameLists(owner.authorization);
		const counts: number[] = [];
		for (const size of [FEW, MANY]) {
			const game = await createGame();
			const lists = await createPositionedLists(
				owner.user.id,
				game.id,
				size,
				{ containing: true }
			);
			counts.push(
				await countQueries(() =>
					api()
						.put(`/games/${game.id}/lists`)
						.set("Authorization", owner.authorization)
						.send({ listIds: [] })
						.expect(200)
				)
			);
			for (const list of lists) {
				assert.deepEqual(await positionsOf(list.id), [1, 2]);
				assert.equal(
					await ListItem.count({
						where: { listId: list.id, gameId: game.id }
					}),
					0
				);
			}
		}
		assert.equal(counts[1], counts[0]);
	});

	void it("leaves compact positions after adding to some lists and removing from others at once", async () => {
		const owner = await createUserWithSession("premium");
		const game = await createGame();
		const toRemove = await createPositionedLists(
			owner.user.id,
			game.id,
			MANY,
			{ containing: true }
		);
		const toAdd = await createPositionedLists(
			owner.user.id,
			game.id,
			MANY,
			{ containing: false }
		);

		await api()
			.put(`/games/${game.id}/lists`)
			.set("Authorization", owner.authorization)
			.send({ listIds: toAdd.map(list => list.id) })
			.expect(200);

		for (const list of toRemove) {
			assert.deepEqual(await positionsOf(list.id), [1, 2]);
		}
		for (const list of toAdd) {
			assert.deepEqual(await positionsOf(list.id), [1, 2, 3]);
			const last = await ListItem.findOne({
				where: { listId: list.id, position: 3 }
			});
			assert.equal(last!.gameId, game.id);
		}
	});

	void it("appends after the highest position even when the list has gaps", async () => {
		const owner = await createUserWithSession("premium");
		const game = await createGame();
		const list = await createList(owner.user.id, scoreSourceCodes[0]!);
		const emptyList = await createList(owner.user.id, scoreSourceCodes[0]!);
		for (const position of [2, 7]) {
			await ListItem.create({
				listId: list.id,
				gameId: (await createGame()).id,
				position,
				score: null,
				duration: null
			});
		}

		await api()
			.put(`/games/${game.id}/lists`)
			.set("Authorization", owner.authorization)
			.send({ listIds: [list.id, emptyList.id] })
			.expect(200);

		assert.deepEqual(await positionsOf(list.id), [2, 7, 8]);
		assert.deepEqual(await positionsOf(emptyList.id), [1]);
	});
});
