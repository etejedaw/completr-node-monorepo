/// <reference types="node" />

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type List } from "../../src/lists/list.model";
import {
	listSerializer,
	listSummarySerializer
} from "../../src/lists/lists.serializer";
import { asModel } from "../unit-helpers/as-model";
import { buildGame } from "../unit-helpers/builders";

function buildList(overrides: Record<string, unknown> = {}) {
	return asModel<List>({
		id: "l-1",
		userId: "u-1",
		name: "Best RPGs",
		description: null,
		isPublic: true,
		scoreSource: "completr",
		durationSource: "hltb",
		User: { username: "owner", role: "user" },
		ListItems: [
			{
				id: "li-1",
				gameId: "game-1",
				position: 1,
				score: 4,
				duration: 20,
				Game: buildGame()
			}
		],
		...overrides
	});
}

describe("listSerializer", () => {
	it("marks lists owned by an admin as official", () => {
		assert.equal(listSerializer(buildList()).isOfficial, false);
		assert.equal(
			listSerializer(
				buildList({ User: { username: "boss", role: "admin" } })
			).isOfficial,
			true
		);
	});

	it("exposes the owner username only", () => {
		const result = listSerializer(
			buildList({
				User: { username: "owner", role: "user", email: "x@y.z" }
			})
		);

		assert.deepEqual(result.owner, { username: "owner" });
	});

	it("returns a null owner when the user was not loaded", () => {
		assert.equal(
			listSerializer(buildList({ User: undefined })).owner,
			null
		);
	});

	it("defaults follower data and progress", () => {
		const result = listSerializer(buildList());

		assert.equal(result.followerCount, 0);
		assert.equal(result.isFollowing, false);
		assert.equal(result.progress, null);
	});

	it("enriches items with the owner's backlog summary by game id", () => {
		const backlogSummaryMap = new Map([
			[
				"game-1",
				{ status: "completed", realDuration: 10, personalRatio: 8 }
			]
		]);

		const [item] = listSerializer(buildList(), {
			backlogSummaryMap
		}).items!;

		assert.equal(item?.ratio, 4);
		assert.equal(item?.backlogStatus, "completed");
		assert.equal(item?.realDuration, 10);
		assert.equal(item?.personalRatio, 8);
	});

	it("nulls the backlog data of items the user has not played", () => {
		const [item] = listSerializer(buildList(), {
			backlogSummaryMap: new Map()
		}).items!;

		assert.equal(item?.backlogStatus, null);
		assert.equal(item?.realDuration, null);
		assert.equal(item?.personalRatio, null);
	});

	it("leaves items undefined when they were not loaded", () => {
		assert.equal(
			listSerializer(buildList({ ListItems: undefined })).items,
			undefined
		);
	});
});

describe("listSummarySerializer", () => {
	it("maps preview items to a minimal game", () => {
		const result = listSummarySerializer(buildList());

		assert.deepEqual(result.previewItems, [
			{
				id: "li-1",
				game: {
					id: "game-1",
					code: "hollow-knight",
					title: "Hollow Knight",
					backgroundUrl: "https://img/bg.jpg"
				}
			}
		]);
	});

	it("returns empty previews when items were not loaded", () => {
		assert.deepEqual(
			listSummarySerializer(buildList({ ListItems: undefined }))
				.previewItems,
			[]
		);
	});

	it("does not expose the owner id", () => {
		assert.equal("userId" in listSummarySerializer(buildList()), false);
	});
});
