import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CompilationItem } from "../../src/compilation-items/compilation-item.model";
import { Game } from "../../src/games/game.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createGame } from "../helpers/factories.helper";

let authorization: string;

useTestDatabase(async () => {
	authorization = (await createUserWithSession("moderator")).authorization;
});

function putCompilationItems(parentId: string, items: object[]) {
	return api()
		.put(`/games/${parentId}/compilation-items`)
		.set("Authorization", authorization)
		.send({ items });
}

void describe("compilation items are replaced atomically", () => {
	void it("keeps the previous items when creating a child fails midway", async () => {
		const parent = await createGame();
		const child = await createGame();
		const taken = await createGame({ title: "Taken Title" });
		await Game.update({ code: "fresh-child" }, { where: { id: taken.id } });
		const first = await putCompilationItems(parent.id, [
			{ mode: "link", gameId: child.id }
		]);
		assert.equal(first.status, 200);

		const failing = await putCompilationItems(parent.id, [
			{ mode: "create", title: "Fresh Child" }
		]);

		assert.equal(failing.status, 409);
		const items = await CompilationItem.findAll({
			where: { parentGameId: parent.id }
		});
		assert.deepEqual(
			items.map(item => item.childGameId),
			[child.id]
		);
		assert.equal(await Game.count({ where: { code: "fresh-child" } }), 1);
	});

	void it("lets exactly one of two identical simultaneous replacements create the child", async () => {
		const parent = await createGame();

		const responses = await Promise.all(
			[1, 2].map(() =>
				putCompilationItems(parent.id, [
					{ mode: "create", title: "Twin Child" }
				])
			)
		);

		const statuses = responses.map(response => response.status).sort();
		assert.ok(statuses.includes(200));
		assert.equal(await Game.count({ where: { code: "twin-child" } }), 1);
		assert.equal(
			await CompilationItem.count({ where: { parentGameId: parent.id } }),
			1
		);
	});
});

void describe("DELETE /games/:id/compilation-items", () => {
	void it("clears the compilation and answers a repeated click with the same 204", async () => {
		const parent = await createGame();
		const child = await createGame();
		await putCompilationItems(parent.id, [
			{ mode: "link", gameId: child.id }
		]);

		const responses = await Promise.all(
			[1, 2].map(() =>
				api()
					.delete(`/games/${parent.id}/compilation-items`)
					.set("Authorization", authorization)
			)
		);

		for (const response of responses) assert.equal(response.status, 204);
		assert.equal(
			await CompilationItem.count({ where: { parentGameId: parent.id } }),
			0
		);
		const stored = await Game.findByPk(parent.id);
		assert.equal(stored?.isCompilation, false);
	});
});
