import assert from "node:assert/strict";
import { after, afterEach, before, describe, it } from "node:test";

import { registerIgdbRequestPacer } from "../../src/games/services/external-data-sources.service";
import { createRequestPacer } from "../../src/games/utils/create-request-pacer.util";
import { Genre } from "../../src/genres/genres.model";
import { type IgdbGame } from "../../src/igdb/igdb.interface";
import { Platform } from "../../src/platforms/platform.model";
import { ScoreSource } from "../../src/score-sources/score-source.model";
import { type UserRole } from "../../src/users/user-role.type";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createScoreSource } from "../helpers/factories.helper";
import {
	deferred,
	fakeIgdb,
	providerError,
	registerFakes
} from "./external-data-fakes.helper";

const ALLOWED_ROLES: UserRole[] = ["moderator", "admin"];
const FORBIDDEN_ROLES: UserRole[] = ["user", "premium"];

const HOLLOW_KNIGHT: IgdbGame = {
	id: 14593,
	name: "Hollow Knight",
	slug: "hollow-knight",
	summary: "Forge your own path in Hollow Knight!",
	first_release_date: 1487894400,
	rating: 91.79755,
	game_type: { id: 0, type: "Main Game" },
	cover: { id: 1, image_id: "cobfzp" },
	artworks: [
		{ id: 2, image_id: "ar-logo", image_type: 5, width: 800, height: 317 },
		{ id: 3, image_id: "ar-art", image_type: 1, width: 1600, height: 900 }
	],
	platforms: [
		{ id: 130, slug: "switch" },
		{ id: 508, slug: "switch-2" },
		{ id: 3, slug: "linux" }
	],
	genres: [
		{ id: 8, slug: "platform" },
		{ id: 32, slug: "indie" }
	]
};

useTestDatabase(async () => {
	await createScoreSource({ code: "igdb", scale: 100, priority: 5 });
	await Platform.bulkCreate([
		{
			name: "Nintendo Switch",
			code: "nintendo-switch",
			abbreviation: "NSW",
			manufacturer: "Completr Test"
		},
		{
			name: "Nintendo Switch 2",
			code: "nintendo-switch-2",
			abbreviation: "NSW2",
			manufacturer: "Completr Test"
		}
	]);
	await Genre.bulkCreate(
		["platformer", "indie"].map(code => ({ name: `Genre ${code}`, code }))
	);
});

before(() => {
	registerIgdbRequestPacer(createRequestPacer(0));
});

after(() => {
	registerIgdbRequestPacer();
	registerFakes({});
});

afterEach(() => {
	registerFakes({});
});

function bySlug(authorization: string, slug: string) {
	return api()
		.get(`/game-external/igdb/${slug}`)
		.set("Authorization", authorization);
}

void describe("GET /game-external/igdb/:slug", () => {
	for (const role of ALLOWED_ROLES) {
		void it(`returns the mapped IGDB detail of the slug to a ${role}`, async () => {
			const igdb = fakeIgdb({
				bySlug: slug =>
					slug === "hollow-knight" ? HOLLOW_KNIGHT : undefined
			});
			registerFakes({ igdb });
			const account = await createUserWithSession(role);

			const response = await bySlug(
				account.authorization,
				"hollow-knight"
			);

			assert.equal(response.status, 200);
			assert.deepEqual(response.body.data.game, {
				source: "igdb",
				externalId: "14593",
				title: "Hollow Knight",
				description: "Forge your own path in Hollow Knight!",
				coverUrl:
					"https://images.igdb.com/igdb/image/upload/t_cover_big_2x/cobfzp.jpg",
				backgroundUrl:
					"https://images.igdb.com/igdb/image/upload/t_1080p/ar-art.jpg",
				releaseAt: "2017-02-24",
				platforms: ["nintendo-switch", "nintendo-switch-2"],
				genres: ["platformer", "indie"],
				scores: [{ source: "igdb", score: 92 }],
				times: []
			});
			assert.deepEqual(igdb.calls, ["slug:hollow-knight"]);
		});
	}

	void it("leaves out the IGDB score when the igdb source is not in the catalog", async () => {
		await ScoreSource.destroy({ where: { code: "igdb" } });
		registerFakes({
			igdb: fakeIgdb({ bySlug: () => HOLLOW_KNIGHT })
		});
		const account = await createUserWithSession("moderator");

		const response = await bySlug(account.authorization, "hollow-knight");

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.game.scores, []);
		await createScoreSource({ code: "igdb", scale: 100, priority: 5 });
	});

	void it("answers 404 IGDB_NOT_FOUND for a slug IGDB does not have", async () => {
		registerFakes({ igdb: fakeIgdb({}) });
		const account = await createUserWithSession("moderator");

		const response = await bySlug(account.authorization, "no-such-game");

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "IGDB_NOT_FOUND");
	});

	void it("answers 503 IGDB_DISABLED when IGDB is not configured", async () => {
		const account = await createUserWithSession("moderator");

		const response = await bySlug(account.authorization, "hollow-knight");

		assert.equal(response.status, 503);
		assert.equal(response.body.type, "IGDB_DISABLED");
	});

	for (const [code, httpStatus] of [
		["IGDB_RATE_LIMITED", 429],
		["IGDB_AUTH_ERROR", 502],
		["IGDB_REQUEST_ERROR", 502],
		["IGDB_PARSE_ERROR", 502]
	] as const) {
		void it(`maps ${code} to ${httpStatus}`, async () => {
			registerFakes({
				igdb: fakeIgdb({ bySlug: () => providerError(code) })
			});
			const account = await createUserWithSession("moderator");

			const response = await bySlug(
				account.authorization,
				"hollow-knight"
			);

			assert.equal(response.status, httpStatus);
			assert.equal(response.body.type, code);
		});
	}

	void it("answers both requests when the same slug is fetched twice at once", async () => {
		const gate = deferred<IgdbGame>();
		registerFakes({ igdb: fakeIgdb({ bySlug: () => gate.promise }) });
		const account = await createUserWithSession("moderator");

		const pending = [
			bySlug(account.authorization, "hollow-knight"),
			bySlug(account.authorization, "hollow-knight")
		];
		gate.resolve(HOLLOW_KNIGHT);
		const responses = await Promise.all(pending);

		for (const response of responses) {
			assert.equal(response.status, 200);
			assert.equal(response.body.data.game.externalId, "14593");
		}
	});

	void it("rejects a slug over 200 characters with 422 COMMON_SCHEMA_INVALID", async () => {
		const igdb = fakeIgdb({ bySlug: () => HOLLOW_KNIGHT });
		registerFakes({ igdb });
		const account = await createUserWithSession("moderator");

		const response = await bySlug(account.authorization, "a".repeat(201));

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		assert.deepEqual(igdb.calls, []);
	});

	for (const role of FORBIDDEN_ROLES) {
		void it(`rejects a ${role} with 403 AUTH_FORBIDDEN and does not call IGDB`, async () => {
			const igdb = fakeIgdb({ bySlug: () => HOLLOW_KNIGHT });
			registerFakes({ igdb });
			const account = await createUserWithSession(role);

			const response = await bySlug(
				account.authorization,
				"hollow-knight"
			);

			assert.equal(response.status, 403);
			assert.equal(response.body.type, "AUTH_FORBIDDEN");
			assert.deepEqual(igdb.calls, []);
		});
	}

	void it("rejects a request without token with 422 AUTH_SCHEMA_INVALID", async () => {
		const response = await api().get("/game-external/igdb/hollow-knight");

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
	});
});
