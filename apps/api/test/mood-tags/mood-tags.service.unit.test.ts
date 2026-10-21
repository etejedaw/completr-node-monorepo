import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { sequelize } from "../../src/database/sequelize.database";
import { Game } from "../../src/games/game.model";
import { MoodTagMeta } from "../../src/mood-tags/mood-tag-meta.model";
import * as moodTagsService from "../../src/mood-tags/mood-tags.service";
import { UserGameTag } from "../../src/mood-tags/user-game-tag.model";
import { asModel } from "../unit-helpers/as-model";
import { buildGame } from "../unit-helpers/builders";
import {
	buildRequestUser,
	captureRejection,
	spy,
	stub,
	stubTransaction
} from "../unit-helpers/mocks";

const FREE_USER = buildRequestUser();
const PREMIUM_USER = buildRequestUser({ role: "premium" });

function stubExistingTagNames(names: string[]) {
	return stub(sequelize, "query", async () => names.map(tag => ({ tag })));
}

function stubGameFound() {
	stub(Game, "findOne", async () => buildGame());
}

function numberedTags(count: number) {
	return Array.from({ length: count }, (_, index) => `tag${index}`);
}

void describe("moodTagsService.replaceTags", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("fails with MOOD_TAGS_GAME_NOT_FOUND when the game does not exist", async () => {
		stub(Game, "findOne", async () => null);

		const error = await captureRejection(
			moodTagsService.replaceTags(FREE_USER, "g", ["cozy"])
		);

		assert.equal(
			(error as { code: string }).code,
			"MOOD_TAGS_GAME_NOT_FOUND"
		);
	});

	void it("rejects more than 10 distinct tags per game", async () => {
		stubGameFound();

		const error = await captureRejection(
			moodTagsService.replaceTags(PREMIUM_USER, "g", numberedTags(11))
		);

		assert.equal((error as { code: string }).code, "MOOD_TAGS_TOO_MANY");
	});

	void it("counts tags after normalization, so duplicates do not hit the per-game cap", async () => {
		stubGameFound();
		stubTransaction();
		stub(UserGameTag, "destroy", async () => 0);
		const bulkCreate = stub(UserGameTag, "bulkCreate", async () => []);
		const duplicated = [...numberedTags(10), "TAG0", " tag1 "];

		const saved = await moodTagsService.replaceTags(
			PREMIUM_USER,
			"g",
			duplicated
		);

		assert.equal(saved.length, 10);
		assert.equal(bulkCreate.mock.callCount(), 1);
	});

	void it("blocks a free user from introducing a tag name over the free limit", async () => {
		stubGameFound();
		stubExistingTagNames(numberedTags(25));

		const error = await captureRejection(
			moodTagsService.replaceTags(FREE_USER, "g", ["brand new"])
		);

		assert.equal(
			(error as { code: string }).code,
			"MOOD_TAGS_LIMIT_REACHED"
		);
	});

	void it("lets a free user over the limit keep using tags that already exist", async () => {
		stubGameFound();
		stubTransaction();
		stubExistingTagNames(numberedTags(30));
		stub(UserGameTag, "destroy", async () => 0);
		stub(UserGameTag, "bulkCreate", async () => []);

		const saved = await moodTagsService.replaceTags(FREE_USER, "g", [
			"tag3",
			"tag4"
		]);

		assert.deepEqual(saved, ["tag3", "tag4"]);
	});

	void it("allows a free user to reach exactly the free limit", async () => {
		stubGameFound();
		stubTransaction();
		stubExistingTagNames(numberedTags(24));
		stub(UserGameTag, "destroy", async () => 0);
		stub(UserGameTag, "bulkCreate", async () => []);

		const saved = await moodTagsService.replaceTags(FREE_USER, "g", [
			"one more"
		]);

		assert.deepEqual(saved, ["one more"]);
	});

	void it("skips the limit lookup for premium users", async () => {
		stubGameFound();
		stubTransaction();
		const query = stubExistingTagNames(numberedTags(100));
		stub(UserGameTag, "destroy", async () => 0);
		stub(UserGameTag, "bulkCreate", async () => []);

		await moodTagsService.replaceTags(PREMIUM_USER, "g", ["brand new"]);

		assert.equal(query.mock.callCount(), 0);
	});

	void it("replaces the previous tags with the normalized ones inside a transaction", async () => {
		stubGameFound();
		const { transaction } = stubTransaction();
		stubExistingTagNames([]);
		const destroy = stub(UserGameTag, "destroy", async () => 0);
		const bulkCreate = stub(UserGameTag, "bulkCreate", async () => []);

		const saved = await moodTagsService.replaceTags(FREE_USER, "game-9", [
			"  Cozy ",
			"ÉPICO"
		]);

		assert.deepEqual(saved, ["cozy", "epico"]);
		assert.deepEqual(destroy.mock.calls[0]?.arguments, [
			{ where: { userId: "user-1", gameId: "game-9" }, transaction }
		]);
		assert.deepEqual(bulkCreate.mock.calls[0]?.arguments[0], [
			{ userId: "user-1", gameId: "game-9", tag: "cozy" },
			{ userId: "user-1", gameId: "game-9", tag: "epico" }
		]);
	});

	void it("only clears the tags when the new list is empty", async () => {
		stubGameFound();
		stubTransaction();
		const destroy = stub(UserGameTag, "destroy", async () => 0);
		const bulkCreate = stub(UserGameTag, "bulkCreate", async () => []);

		const saved = await moodTagsService.replaceTags(PREMIUM_USER, "g", []);

		assert.deepEqual(saved, []);
		assert.equal(destroy.mock.callCount(), 1);
		assert.equal(bulkCreate.mock.callCount(), 0);
	});
});

void describe("moodTagsService.createTag", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("rejects empty and too long tag names", async () => {
		const empty = await captureRejection(
			moodTagsService.createTag(FREE_USER, "   ", null)
		);
		const tooLong = await captureRejection(
			moodTagsService.createTag(FREE_USER, "a".repeat(41), null)
		);

		assert.equal((empty as { code: string }).code, "MOOD_TAGS_INVALID_TAG");
		assert.equal(
			(tooLong as { code: string }).code,
			"MOOD_TAGS_INVALID_TAG"
		);
	});

	void it("returns the existing tag without creating it nor checking the limit", async () => {
		stub(MoodTagMeta, "findOne", async () =>
			asModel({ description: "kept" })
		);
		const query = stubExistingTagNames(numberedTags(99));
		const create = stub(MoodTagMeta, "create", async () => ({}));

		const result = await moodTagsService.createTag(
			FREE_USER,
			"Cozy",
			"new text"
		);

		assert.deepEqual(result, {
			tag: "cozy",
			description: "kept",
			created: false
		});
		assert.equal(query.mock.callCount(), 0);
		assert.equal(create.mock.callCount(), 0);
	});

	void it("creates a new tag trimming and capping the description to 255 characters", async () => {
		stub(MoodTagMeta, "findOne", async () => null);
		stubExistingTagNames([]);
		const create = stub(MoodTagMeta, "create", async () => ({}));

		const result = await moodTagsService.createTag(
			FREE_USER,
			"Cozy",
			`  ${"x".repeat(300)}  `
		);

		assert.equal(result.created, true);
		assert.equal(result.description?.length, 255);
		assert.deepEqual(create.mock.calls[0]?.arguments[0], {
			userId: "user-1",
			tag: "cozy",
			description: "x".repeat(255)
		});
	});

	void it("stores a blank description as null", async () => {
		stub(MoodTagMeta, "findOne", async () => null);
		stubExistingTagNames([]);
		stub(MoodTagMeta, "create", async () => ({}));

		const result = await moodTagsService.createTag(
			FREE_USER,
			"Cozy",
			"   "
		);

		assert.equal(result.description, null);
	});

	void it("blocks a free user from creating a tag over the free limit", async () => {
		stub(MoodTagMeta, "findOne", async () => null);
		stubExistingTagNames(numberedTags(25));
		const create = stub(MoodTagMeta, "create", async () => ({}));

		const error = await captureRejection(
			moodTagsService.createTag(FREE_USER, "extra", null)
		);

		assert.equal(
			(error as { code: string }).code,
			"MOOD_TAGS_LIMIT_REACHED"
		);
		assert.equal(create.mock.callCount(), 0);
	});
});

void describe("moodTagsService.renameTag", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("does nothing when old and new names normalize to the same tag", async () => {
		const count = stub(UserGameTag, "count", async () => 1);

		await moodTagsService.renameTag("user-1", "Cozy", " cozy ");

		assert.equal(count.mock.callCount(), 0);
	});

	void it("rejects a blank old or new name and a new name over 40 characters", async () => {
		const blankNew = await captureRejection(
			moodTagsService.renameTag("u", "cozy", " ")
		);
		const tooLong = await captureRejection(
			moodTagsService.renameTag("u", "cozy", "a".repeat(41))
		);

		assert.equal(
			(blankNew as { code: string }).code,
			"MOOD_TAGS_INVALID_TAG"
		);
		assert.equal(
			(tooLong as { code: string }).code,
			"MOOD_TAGS_INVALID_TAG"
		);
	});

	void it("fails with MOOD_TAGS_TAG_NOT_FOUND when the user has no such tag", async () => {
		stub(UserGameTag, "count", async () => 0);
		stub(MoodTagMeta, "count", async () => 0);

		const error = await captureRejection(
			moodTagsService.renameTag("u", "ghost", "spirit")
		);

		assert.equal(
			(error as { code: string }).code,
			"MOOD_TAGS_TAG_NOT_FOUND"
		);
	});

	void it("renames a tag that only exists as metadata", async () => {
		stub(UserGameTag, "count", async () => 0);
		stub(MoodTagMeta, "count", async () => 1);
		stubTransaction();
		stub(sequelize, "query", async () => []);
		stub(UserGameTag, "destroy", async () => 0);
		const update = spy();
		stub(
			MoodTagMeta,
			"findOne",
			async (options: { where: { tag: string } }) =>
				options.where.tag === "old"
					? asModel({ description: null, update })
					: null
		);

		await moodTagsService.renameTag("u", "old", "new");

		assert.deepEqual(update.mock.calls[0]?.arguments[0], { tag: "new" });
	});

	void it("merges metadata into an existing target tag keeping the target description", async () => {
		stub(UserGameTag, "count", async () => 2);
		stubTransaction();
		stub(sequelize, "query", async () => []);
		stub(UserGameTag, "destroy", async () => 0);
		const targetUpdate = spy();
		const sourceDestroy = spy();
		stub(
			MoodTagMeta,
			"findOne",
			async (options: { where: { tag: string } }) =>
				options.where.tag === "old"
					? asModel({
							description: "from old",
							destroy: sourceDestroy
						})
					: asModel({ description: "from new", update: targetUpdate })
		);

		await moodTagsService.renameTag("u", "old", "new");

		assert.equal(targetUpdate.mock.callCount(), 0);
		assert.equal(sourceDestroy.mock.callCount(), 1);
	});

	void it("moves the old description to the target tag when the target has none", async () => {
		stub(UserGameTag, "count", async () => 2);
		stubTransaction();
		stub(sequelize, "query", async () => []);
		stub(UserGameTag, "destroy", async () => 0);
		const targetUpdate = spy();
		stub(
			MoodTagMeta,
			"findOne",
			async (options: { where: { tag: string } }) =>
				options.where.tag === "old"
					? asModel({
							description: "from old",
							destroy: async () => undefined
						})
					: asModel({ description: null, update: targetUpdate })
		);

		await moodTagsService.renameTag("u", "old", "new");

		assert.deepEqual(targetUpdate.mock.calls[0]?.arguments[0], {
			description: "from old"
		});
	});
});

void describe("moodTagsService.deleteTag", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("rejects a blank tag", async () => {
		const error = await captureRejection(
			moodTagsService.deleteTag("u", "  ")
		);

		assert.equal((error as { code: string }).code, "MOOD_TAGS_INVALID_TAG");
	});

	void it("fails with MOOD_TAGS_TAG_NOT_FOUND when neither assignments nor metadata exist", async () => {
		stub(UserGameTag, "count", async () => 0);
		stub(MoodTagMeta, "count", async () => 0);

		const error = await captureRejection(
			moodTagsService.deleteTag("u", "ghost")
		);

		assert.equal(
			(error as { code: string }).code,
			"MOOD_TAGS_TAG_NOT_FOUND"
		);
	});

	void it("removes assignments and metadata of the normalized tag", async () => {
		stub(UserGameTag, "count", async () => 1);
		stub(MoodTagMeta, "count", async () => 0);
		const { transaction } = stubTransaction();
		const destroyAssignments = stub(UserGameTag, "destroy", async () => 1);
		const destroyMeta = stub(MoodTagMeta, "destroy", async () => 0);

		await moodTagsService.deleteTag("user-1", " Cozy ");

		const expected = [
			{ where: { userId: "user-1", tag: "cozy" }, transaction }
		];
		assert.deepEqual(destroyAssignments.mock.calls[0]?.arguments, expected);
		assert.deepEqual(destroyMeta.mock.calls[0]?.arguments, expected);
	});
});

void describe("moodTagsService.findGameIdsByTags", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("returns no games without querying when all tags are blank", async () => {
		const query = stub(sequelize, "query", async () => []);

		assert.deepEqual(
			await moodTagsService.findGameIdsByTags("u", [" ", ""]),
			[]
		);
		assert.equal(query.mock.callCount(), 0);
	});

	void it("requires every distinct normalized tag to match", async () => {
		const query = stub(sequelize, "query", async () => [{ gameId: "g-1" }]);

		const result = await moodTagsService.findGameIdsByTags("u", [
			"Cozy",
			"cozy",
			"RPG"
		]);

		assert.deepEqual(result, ["g-1"]);
		const options = query.mock.calls[0]?.arguments[1] as {
			replacements: Record<string, unknown>;
		};
		assert.deepEqual(options.replacements.tags, ["cozy", "rpg"]);
		assert.equal(options.replacements.tagCount, 2);
	});
});

void describe("moodTagsService.findTagsForGames", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("returns an empty map without querying when there are no games", async () => {
		const findAll = stub(UserGameTag, "findAll", async () => []);

		const result = await moodTagsService.findTagsForGames("u", []);

		assert.equal(result.size, 0);
		assert.equal(findAll.mock.callCount(), 0);
	});

	void it("groups the tags by game", async () => {
		stub(UserGameTag, "findAll", async () => [
			{ gameId: "g-1", tag: "a" },
			{ gameId: "g-1", tag: "b" },
			{ gameId: "g-2", tag: "c" }
		]);

		const result = await moodTagsService.findTagsForGames("u", [
			"g-1",
			"g-2"
		]);

		assert.deepEqual(result.get("g-1"), ["a", "b"]);
		assert.deepEqual(result.get("g-2"), ["c"]);
	});
});
