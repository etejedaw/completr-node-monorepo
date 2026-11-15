import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Genre } from "../../src/genres/genres.model";
import { Platform } from "../../src/platforms/platform.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";

let authorization: string;

useTestDatabase(async () => {
	authorization = (await createUserWithSession()).authorization;
});

void describe("catalog lists have a stable order", () => {
	void it("lists genres by name whatever the insertion order", async () => {
		await Genre.bulkCreate(
			["Strategy", "Action", "Puzzle", "Adventure"].map(name => ({
				name,
				code: name.toLowerCase()
			}))
		);

		const response = await api()
			.get("/genres")
			.set("Authorization", authorization);

		assert.deepEqual(
			response.body.data.genres.map(
				(genre: { name: string }) => genre.name
			),
			["Action", "Adventure", "Puzzle", "Strategy"]
		);
	});

	void it("lists platforms by name whatever the insertion order", async () => {
		await Platform.bulkCreate(
			["Switch", "Amiga", "PC", "Dreamcast"].map(name => ({
				name,
				code: name.toLowerCase(),
				abbreviation: name.slice(0, 3).toUpperCase(),
				manufacturer: "Test"
			}))
		);

		const response = await api()
			.get("/platforms")
			.set("Authorization", authorization);

		assert.deepEqual(
			response.body.data.platforms.map(
				(platform: { name: string }) => platform.name
			),
			["Amiga", "Dreamcast", "PC", "Switch"]
		);
	});
});
