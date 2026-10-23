import assert from "node:assert/strict";
import { after, afterEach, before, describe, it } from "node:test";

import { Backlog, type BacklogStatus } from "../../src/backlog/backlog.model";
import { sequelize } from "../../src/database/sequelize.database";
import { ListFollower } from "../../src/list-followers/list-follower.model";
import { ListItem } from "../../src/list-items/list-item.model";
import * as listsService from "../../src/lists/lists.service";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createBacklog,
	createGame,
	createList,
	createPlatform,
	createScoreSource
} from "../helpers/factories.helper";

const QUERY_HOOK_NAME = "list-progress-batch-query-counter";

let scoreSource: string;
let queryCount = 0;

useTestDatabase(async () => {
	const source = await createScoreSource({ scale: 100 });
	scoreSource = source.code;
});

before(() => {
	sequelize.addHook("beforeQuery", QUERY_HOOK_NAME, () => {
		queryCount++;
	});
});

after(() => {
	sequelize.removeHook("beforeQuery", QUERY_HOOK_NAME);
});

afterEach(() => {
	queryCount = 0;
});

async function countQueries(request: PromiseLike<{ status: number }>) {
	queryCount = 0;
	const response = await request;
	const count = queryCount;
	assert.equal(response.status, 200);
	return count;
}

async function fillList(listId: string, gameIds: string[]) {
	for (const [index, gameId] of gameIds.entries()) {
		await ListItem.create({
			listId,
			gameId,
			position: index + 1,
			score: null,
			duration: null
		});
	}
}

async function createGames(count: number) {
	return Promise.all(
		Array.from({ length: count }, async () => (await createGame()).id)
	);
}

async function backlogFor(
	userId: string,
	gameId: string,
	status: BacklogStatus,
	overrides: { isPublic?: boolean; platformId?: string } = {}
) {
	const platformId = overrides.platformId ?? (await createPlatform()).id;
	const entry = await createBacklog(userId, gameId, platformId, { status });
	if (overrides.isPublic === false)
		await Backlog.update({ isPublic: false }, { where: { id: entry.id } });
	return entry;
}

async function buildProgressFixture() {
	const viewer = await createUserWithSession();
	const owner = await createUserWithSession();
	const [completed, abandoned, endless, playing, untouched, privateDone] =
		await createGames(6);
	const gameIds = [
		completed!,
		abandoned!,
		endless!,
		playing!,
		untouched!,
		privateDone!
	];

	await backlogFor(viewer.user.id, completed!, "completed");
	await backlogFor(viewer.user.id, abandoned!, "abandoned");
	await backlogFor(viewer.user.id, endless!, "endless");
	await backlogFor(viewer.user.id, playing!, "playing");
	await backlogFor(viewer.user.id, privateDone!, "completed", {
		isPublic: false
	});
	const secondPlatform = await createPlatform();
	await backlogFor(viewer.user.id, completed!, "completed", {
		platformId: secondPlatform.id
	});

	const emptyList = await createList(owner.user.id, scoreSource);
	const finishedList = await createList(owner.user.id, scoreSource);
	const mixedList = await createList(owner.user.id, scoreSource);
	const withoutBacklogList = await createList(owner.user.id, scoreSource);
	const privateEntryList = await createList(owner.user.id, scoreSource);
	await fillList(finishedList.id, [completed!, abandoned!, endless!]);
	await fillList(mixedList.id, gameIds);
	await fillList(withoutBacklogList.id, [untouched!]);
	await fillList(privateEntryList.id, [privateDone!, completed!]);

	return {
		viewer,
		listIds: [
			emptyList.id,
			finishedList.id,
			mixedList.id,
			withoutBacklogList.id,
			privateEntryList.id
		]
	};
}

void describe("listsService.getListsProgress", () => {
	void it("matches getListProgress for every list, with and without publicOnly", async () => {
		const { viewer, listIds } = await buildProgressFixture();

		for (const publicOnly of [false, true]) {
			const batch = await listsService.getListsProgress(
				listIds,
				viewer.user.id,
				publicOnly
			);
			for (const listId of listIds) {
				const individual = await listsService.getListProgress(
					listId,
					viewer.user.id,
					publicOnly
				);
				assert.deepEqual(batch.get(listId), individual);
			}
		}
	});

	void it("reports the expected figures for the fixture", async () => {
		const { viewer, listIds } = await buildProgressFixture();

		const batch = await listsService.getListsProgress(
			listIds,
			viewer.user.id
		);
		const publicBatch = await listsService.getListsProgress(
			listIds,
			viewer.user.id,
			true
		);

		assert.deepEqual(
			listIds.map(id => batch.get(id)),
			[
				{ completed: 0, total: 0 },
				{ completed: 3, total: 3 },
				{ completed: 4, total: 6 },
				{ completed: 0, total: 1 },
				{ completed: 2, total: 2 }
			]
		);
		assert.deepEqual(
			listIds.map(id => publicBatch.get(id)),
			[
				{ completed: 0, total: 0 },
				{ completed: 3, total: 3 },
				{ completed: 3, total: 6 },
				{ completed: 0, total: 1 },
				{ completed: 1, total: 2 }
			]
		);
	});

	void it("returns zero progress for unknown lists and an empty map for no ids", async () => {
		const viewer = await createUserWithSession();
		const unknownId = "00000000-0000-4000-8000-000000000000";

		const batch = await listsService.getListsProgress(
			[unknownId],
			viewer.user.id
		);

		assert.deepEqual(batch.get(unknownId), { completed: 0, total: 0 });
		assert.equal(
			(await listsService.getListsProgress([], viewer.user.id)).size,
			0
		);
	});
});

void describe("listsService.getListFollowerCounts", () => {
	void it("matches getFollowerCount for every list, including lists without followers", async () => {
		const owner = await createUserWithSession();
		const followers = await Promise.all([
			createUserWithSession(),
			createUserWithSession(),
			createUserWithSession()
		]);
		const lists = await Promise.all([
			createList(owner.user.id, scoreSource),
			createList(owner.user.id, scoreSource),
			createList(owner.user.id, scoreSource)
		]);
		for (const follower of followers)
			await ListFollower.create({
				listId: lists[0]!.id,
				userId: follower.user.id
			});
		await ListFollower.create({
			listId: lists[1]!.id,
			userId: followers[0]!.user.id
		});
		const listIds = lists.map(list => list.id);

		const counts = await listsService.getListFollowerCounts(listIds);

		for (const listId of listIds)
			assert.equal(
				counts.get(listId),
				await listsService.getFollowerCount(listId)
			);
		assert.deepEqual(
			listIds.map(id => counts.get(id)),
			[3, 1, 0]
		);
		assert.equal((await listsService.getListFollowerCounts([])).size, 0);
	});
});

void describe("query count of the list progress endpoints", () => {
	async function ownerWithLists(count: number, isPublic: boolean) {
		const owner = await createUserWithSession();
		const gameIds = await createGames(2);
		const lists = [];
		for (let index = 0; index < count; index++) {
			const list = await createList(owner.user.id, scoreSource, {
				isPublic
			});
			await fillList(list.id, gameIds);
			lists.push(list);
		}
		return { owner, lists, gameIds };
	}

	void it("GET /lists/me does not grow with the number of lists", async () => {
		const few = await ownerWithLists(1, false);
		const many = await ownerWithLists(6, false);

		const fewCount = await countQueries(
			api().get("/lists/me").set("Authorization", few.owner.authorization)
		);
		const manyCount = await countQueries(
			api()
				.get("/lists/me")
				.set("Authorization", many.owner.authorization)
		);

		assert.equal(manyCount, fewCount);
	});

	void it("GET /lists/following does not grow with the number of followed lists", async () => {
		const follow = async (count: number) => {
			const follower = await createUserWithSession();
			const { lists } = await ownerWithLists(count, true);
			for (const list of lists)
				await ListFollower.create({
					listId: list.id,
					userId: follower.user.id
				});
			return follower;
		};
		const few = await follow(1);
		const many = await follow(6);

		const fewCount = await countQueries(
			api()
				.get("/lists/following")
				.set("Authorization", few.authorization)
		);
		const manyCount = await countQueries(
			api()
				.get("/lists/following")
				.set("Authorization", many.authorization)
		);

		assert.equal(manyCount, fewCount);
	});

	void it("GET /users/:username/lists does not grow with the number of public lists", async () => {
		const few = await ownerWithLists(1, true);
		const many = await ownerWithLists(6, true);
		const viewer = await createUserWithSession();

		const fewCount = await countQueries(
			api()
				.get(`/users/${few.owner.user.username}/lists`)
				.set("Authorization", viewer.authorization)
		);
		const manyCount = await countQueries(
			api()
				.get(`/users/${many.owner.user.username}/lists`)
				.set("Authorization", viewer.authorization)
		);

		assert.equal(manyCount, fewCount);
	});

	void it("GET /users/:username/lists as the owner does not grow with the number of lists", async () => {
		const few = await ownerWithLists(1, false);
		const many = await ownerWithLists(6, false);

		const fewCount = await countQueries(
			api()
				.get(`/users/${few.owner.user.username}/lists`)
				.set("Authorization", few.owner.authorization)
		);
		const manyCount = await countQueries(
			api()
				.get(`/users/${many.owner.user.username}/lists`)
				.set("Authorization", many.owner.authorization)
		);

		assert.equal(manyCount, fewCount);
	});

	async function gameInPublicLists(count: number) {
		const game = await createGame();
		for (let index = 0; index < count; index++) {
			const owner = await createUserWithSession();
			const list = await createList(owner.user.id, scoreSource, {
				isPublic: true
			});
			await fillList(list.id, [game.id]);
		}
		return game;
	}

	void it("GET /games/:id/lists does not grow with the number of public lists", async () => {
		const viewer = await createUserWithSession();
		const fewGame = await gameInPublicLists(1);
		const manyGame = await gameInPublicLists(6);
		await api()
			.get(`/games/${fewGame.id}/lists`)
			.set("Authorization", viewer.authorization);

		const fewCount = await countQueries(
			api()
				.get(`/games/${fewGame.id}/lists`)
				.set("Authorization", viewer.authorization)
		);
		const manyCount = await countQueries(
			api()
				.get(`/games/${manyGame.id}/lists`)
				.set("Authorization", viewer.authorization)
		);

		assert.equal(manyCount, fewCount);
	});

	void it("PUT /games/:id/lists does not grow with the number of public lists in the response", async () => {
		const viewer = await createUserWithSession();
		const fewGame = await gameInPublicLists(1);
		const manyGame = await gameInPublicLists(6);
		await api()
			.put(`/games/${fewGame.id}/lists`)
			.set("Authorization", viewer.authorization)
			.send({ listIds: [] });

		const fewCount = await countQueries(
			api()
				.put(`/games/${fewGame.id}/lists`)
				.set("Authorization", viewer.authorization)
				.send({ listIds: [] })
		);
		const manyCount = await countQueries(
			api()
				.put(`/games/${manyGame.id}/lists`)
				.set("Authorization", viewer.authorization)
				.send({ listIds: [] })
		);

		assert.equal(manyCount, fewCount);
	});
});
