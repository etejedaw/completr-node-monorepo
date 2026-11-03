import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { GameShelf } from "../../src/game-shelf/game-shelf.model";
import { createUserWithSession } from "../helpers/auth.helper";
import {
	itRejectsInvalidBulkRequests,
	postBulk,
	skippedIds
} from "../helpers/bulk.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createGame,
	createPlatform,
	createShelfEntries,
	createUser
} from "../helpers/factories.helper";

const BULK_PATH = "/users/me/game-shelf/bulk";

useTestDatabase();

async function createShelf(userId: string, count: number) {
	const [game, platform] = await Promise.all([
		createGame(),
		createPlatform()
	]);
	const entries = await createShelfEntries(
		userId,
		game.id,
		platform.id,
		count
	);
	return entries.map(entry => entry.id);
}

function bulkDelete(authorization: string, ids: string[]) {
	return postBulk(BULK_PATH, authorization, "delete", { ids });
}

void describe("POST /users/me/game-shelf/bulk?action=delete", () => {
	void it("deletes every owned entry and answers with the bulk shape", async () => {
		const owner = await createUserWithSession();
		const ids = await createShelf(owner.user.id, 3);

		const response = await bulkDelete(owner.authorization, ids);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data, {
			action: "delete",
			succeeded: ids,
			skipped: []
		});
		assert.equal(
			await GameShelf.count({ where: { userId: owner.user.id } }),
			0
		);
	});

	void it("skips foreign and missing entries with GAME_SHELF_NOT_FOUND without deleting them", async () => {
		const owner = await createUserWithSession();
		const stranger = await createUser();
		const [own, kept] = await createShelf(owner.user.id, 2);
		const [foreign] = await createShelf(stranger.id, 1);
		const missing = randomUUID();

		const response = await bulkDelete(owner.authorization, [
			foreign!,
			own!,
			missing,
			own!
		]);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.succeeded, [own]);
		assert.deepEqual(response.body.data.skipped, [
			{ id: foreign, code: "GAME_SHELF_NOT_FOUND" },
			{ id: missing, code: "GAME_SHELF_NOT_FOUND" }
		]);
		assert.notEqual(await GameShelf.findByPk(foreign), null);
		assert.notEqual(await GameShelf.findByPk(kept), null);
	});

	void it("skips everything on a second identical batch", async () => {
		const owner = await createUserWithSession();
		const ids = await createShelf(owner.user.id, 2);

		await bulkDelete(owner.authorization, ids).expect(200);
		const response = await bulkDelete(owner.authorization, ids);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.succeeded, []);
		assert.deepEqual(
			skippedIds(response.body.data.skipped),
			[...ids].sort()
		);
	});

	itRejectsInvalidBulkRequests({
		path: BULK_PATH,
		action: "delete",
		idsKey: "ids",
		otherActionBody: { gameIds: [randomUUID()] }
	});
});
