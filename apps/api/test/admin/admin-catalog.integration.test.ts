import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { GameScore } from "../../src/game-scores/game-score.model";
import { GameTime } from "../../src/game-times/game-time.model";
import { Genre } from "../../src/genres/genres.model";
import { Platform } from "../../src/platforms/platform.model";
import { ScoreSource } from "../../src/score-sources/score-source.model";
import { type UserRole } from "../../src/users/user-role.type";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createBacklog,
	createGame,
	createGameScore,
	createGameTime,
	createPlatform,
	createScoreSource
} from "../helpers/factories.helper";

let scoreSource: string;

useTestDatabase(async () => {
	const source = await createScoreSource({ scale: 100 });
	scoreSource = source.code;
});

type Authorization = string | undefined;

const STAFF_ROLES: UserRole[] = ["moderator", "admin"];
const NON_STAFF_ROLES: UserRole[] = ["user", "premium"];

function uniqueSuffix() {
	return randomUUID().replaceAll("-", "").slice(0, 10);
}

function withAuthorization<
	T extends { set: (name: string, value: string) => T }
>(request: T, authorization: Authorization) {
	return authorization
		? request.set("Authorization", authorization)
		: request;
}

function platformPayload(overrides: Record<string, unknown> = {}) {
	const suffix = uniqueSuffix();
	return {
		name: `Console ${suffix}`,
		abbreviation: suffix.toUpperCase(),
		description: "A test console",
		manufacturer: "Completr Labs",
		generation: 9,
		releaseAt: "2020-11-10",
		...overrides
	};
}

function createGenre() {
	const suffix = uniqueSuffix();
	return Genre.create({ name: `Genre ${suffix}`, code: `genre-${suffix}` });
}

const CATALOG_ENDPOINTS = [
	{
		label: "POST /genres",
		request: (authorization: Authorization) =>
			withAuthorization(api().post("/genres"), authorization).send({
				name: `Denied ${uniqueSuffix()}`
			})
	},
	{
		label: "PATCH /genres/:genreId",
		request: (authorization: Authorization) =>
			withAuthorization(
				api().patch(`/genres/${randomUUID()}`),
				authorization
			).send({ name: "Denied" })
	},
	{
		label: "DELETE /genres/:genreId",
		request: (authorization: Authorization) =>
			withAuthorization(
				api().delete(`/genres/${randomUUID()}`),
				authorization
			)
	},
	{
		label: "POST /platforms",
		request: (authorization: Authorization) =>
			withAuthorization(api().post("/platforms"), authorization).send(
				platformPayload()
			)
	},
	{
		label: "PATCH /platforms/:platformId",
		request: (authorization: Authorization) =>
			withAuthorization(
				api().patch(`/platforms/${randomUUID()}`),
				authorization
			).send({ description: "Denied" })
	},
	{
		label: "DELETE /platforms/:platformId",
		request: (authorization: Authorization) =>
			withAuthorization(
				api().delete(`/platforms/${randomUUID()}`),
				authorization
			)
	},
	{
		label: "POST /game-scores",
		request: (authorization: Authorization) =>
			withAuthorization(api().post("/game-scores"), authorization).send({
				gameId: randomUUID(),
				source: "denied",
				score: 1
			})
	},
	{
		label: "PATCH /game-scores/:gameId/:source",
		request: (authorization: Authorization) =>
			withAuthorization(
				api().patch(`/game-scores/${randomUUID()}/denied`),
				authorization
			).send({ score: 1 })
	},
	{
		label: "DELETE /game-scores/:gameId/:source",
		request: (authorization: Authorization) =>
			withAuthorization(
				api().delete(`/game-scores/${randomUUID()}/denied`),
				authorization
			)
	},
	{
		label: "POST /game-times",
		request: (authorization: Authorization) =>
			withAuthorization(api().post("/game-times"), authorization).send({
				gameId: randomUUID(),
				source: "hltb",
				duration: 1
			})
	},
	{
		label: "PATCH /game-times/:gameId/:source",
		request: (authorization: Authorization) =>
			withAuthorization(
				api().patch(`/game-times/${randomUUID()}/hltb`),
				authorization
			).send({ duration: 1 })
	},
	{
		label: "DELETE /game-times/:gameId/:source",
		request: (authorization: Authorization) =>
			withAuthorization(
				api().delete(`/game-times/${randomUUID()}/hltb`),
				authorization
			)
	}
];

const SCORE_SOURCE_ENDPOINT = {
	label: "POST /score-sources",
	request: (authorization: Authorization) =>
		withAuthorization(api().post("/score-sources"), authorization).send({
			code: `denied-${uniqueSuffix()}`,
			name: "Denied",
			scale: 10
		})
};

void describe("role matrix of the catalog write endpoints", () => {
	for (const { label, request } of CATALOG_ENDPOINTS) {
		for (const role of NON_STAFF_ROLES) {
			void it(`rejects ${label} from a ${role} with 403 AUTH_FORBIDDEN`, async () => {
				const account = await createUserWithSession(role);

				const response = await request(account.authorization);

				assert.equal(response.status, 403);
				assert.equal(response.body.type, "AUTH_FORBIDDEN");
			});
		}

		void it(`rejects ${label} with an invalid token with 401 AUTH_INVALID_TOKEN`, async () => {
			const response = await request("Bearer expired.token.value");

			assert.equal(response.status, 401);
			assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
		});

		void it(`rejects ${label} without Authorization header with 422 AUTH_SCHEMA_INVALID`, async () => {
			const response = await request(undefined);

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
		});
	}

	for (const role of [...NON_STAFF_ROLES, "moderator" as const]) {
		void it(`rejects POST /score-sources from a ${role} with 403 AUTH_FORBIDDEN`, async () => {
			const account = await createUserWithSession(role);

			const response = await SCORE_SOURCE_ENDPOINT.request(
				account.authorization
			);

			assert.equal(response.status, 403);
			assert.equal(response.body.type, "AUTH_FORBIDDEN");
		});
	}

	void it("rejects POST /score-sources with an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await SCORE_SOURCE_ENDPOINT.request(
			"Bearer expired.token.value"
		);

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});

	void it("rejects POST /score-sources without Authorization header with 422 AUTH_SCHEMA_INVALID", async () => {
		const response = await SCORE_SOURCE_ENDPOINT.request(undefined);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
	});

	void it("does not let a user create a genre or a platform", async () => {
		const account = await createUserWithSession("user");
		const genreName = `Denied ${uniqueSuffix()}`;
		const platformName = `Denied ${uniqueSuffix()}`;

		await withAuthorization(api().post("/genres"), account.authorization)
			.send({ name: genreName })
			.expect(403);
		await withAuthorization(api().post("/platforms"), account.authorization)
			.send(platformPayload({ name: platformName }))
			.expect(403);

		assert.equal(await Genre.count({ where: { name: genreName } }), 0);
		assert.equal(
			await Platform.count({ where: { name: platformName } }),
			0
		);
	});

	void it("does not let a moderator create a score source", async () => {
		const moderator = await createUserWithSession("moderator");
		const code = `denied-${uniqueSuffix()}`;

		await api()
			.post("/score-sources")
			.set("Authorization", moderator.authorization)
			.send({ code, name: "Denied", scale: 10 })
			.expect(403);

		assert.equal(await ScoreSource.count({ where: { code } }), 0);
	});
});

void describe("genres write endpoints", () => {
	function postGenre(authorization: string, body: object) {
		return api()
			.post("/genres")
			.set("Authorization", authorization)
			.send(body);
	}

	function patchGenre(authorization: string, id: string, body: object) {
		return api()
			.patch(`/genres/${id}`)
			.set("Authorization", authorization)
			.send(body);
	}

	function deleteGenre(authorization: string, id: string) {
		return api()
			.delete(`/genres/${id}`)
			.set("Authorization", authorization);
	}

	for (const role of STAFF_ROLES) {
		void it(`lets a ${role} create a genre and read it back by code`, async () => {
			const staff = await createUserWithSession(role);
			const name = `Roguelike ${uniqueSuffix()}`;

			const response = await postGenre(staff.authorization, { name });

			assert.equal(response.status, 201);
			assert.equal(response.body.data.genre.name, name);
			assert.match(
				response.body.data.genre.code,
				/^roguelike-[a-z0-9]+$/
			);

			const fetched = await api()
				.get(`/genres/${response.body.data.genre.code}`)
				.set("Authorization", staff.authorization);
			assert.equal(fetched.status, 200);
			assert.equal(
				fetched.body.data.genre.id,
				response.body.data.genre.id
			);
		});
	}

	void it("rejects a duplicated genre name with 409 GENRE_UNIQUE_CONSTRAINT", async () => {
		const admin = await createUserWithSession("admin");
		const existing = await createGenre();

		const response = await postGenre(admin.authorization, {
			name: existing.name
		});

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "GENRE_UNIQUE_CONSTRAINT");
	});

	void it("rejects a duplicated slug written with another casing with 409", async () => {
		const admin = await createUserWithSession("admin");
		const existing = await createGenre();

		const response = await postGenre(admin.authorization, {
			name: existing.name.toUpperCase()
		});

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "GENRE_UNIQUE_CONSTRAINT");
	});

	void it(
		"rejects a name that cannot become a slug instead of storing an empty code",
		{
			todo: "bug: POST /genres with a name like '!!!' answers 201 and stores a genre with an empty code"
		},
		async () => {
			const admin = await createUserWithSession("admin");

			const response = await postGenre(admin.authorization, {
				name: "!!!"
			});

			assert.ok(
				response.status >= 400 && response.status < 500,
				`expected 4xx, got ${response.status}`
			);
		}
	);

	const invalidCreateBodies: [string, Record<string, unknown>][] = [
		["a missing name", {}],
		["an empty name", { name: "" }],
		["a name over 50 characters", { name: "g".repeat(51) }]
	];

	for (const [label, body] of invalidCreateBodies) {
		void it(`rejects ${label} with 422 COMMON_SCHEMA_INVALID`, async () => {
			const admin = await createUserWithSession("admin");

			const response = await postGenre(admin.authorization, body);

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		});
	}

	for (const role of STAFF_ROLES) {
		void it(`lets a ${role} rename a genre and regenerates its code`, async () => {
			const staff = await createUserWithSession(role);
			const genre = await createGenre();
			const name = `Metroidvania ${uniqueSuffix()}`;

			const response = await patchGenre(staff.authorization, genre.id, {
				name
			});

			assert.equal(response.status, 200);
			assert.equal(response.body.data.genre.id, genre.id);
			assert.equal(response.body.data.genre.name, name);
			assert.match(
				response.body.data.genre.code,
				/^metroidvania-[a-z0-9]+$/
			);

			const renamed = await api()
				.get(`/genres/${response.body.data.genre.code}`)
				.set("Authorization", staff.authorization);
			assert.equal(renamed.status, 200);
			const previous = await api()
				.get(`/genres/${genre.code}`)
				.set("Authorization", staff.authorization);
			assert.equal(previous.status, 404);
			assert.equal(previous.body.type, "GENRE_NOT_FOUND");
		});
	}

	void it("answers 404 GENRE_NOT_FOUND when renaming an unknown genre", async () => {
		const admin = await createUserWithSession("admin");

		const response = await patchGenre(admin.authorization, randomUUID(), {
			name: "Ghost"
		});

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GENRE_NOT_FOUND");
	});

	void it(
		"answers 409 GENRE_UNIQUE_CONSTRAINT when renaming to a name already in use",
		{
			todo: "bug: PATCH /genres/:genreId renaming to an existing name answers 500 instead of 409"
		},
		async () => {
			const admin = await createUserWithSession("admin");
			const [genre, other] = await Promise.all([
				createGenre(),
				createGenre()
			]);

			const response = await patchGenre(admin.authorization, genre.id, {
				name: other.name
			});

			assert.equal(response.status, 409);
			assert.equal(response.body.type, "GENRE_UNIQUE_CONSTRAINT");
		}
	);

	void it("rejects an invalid rename with 422 COMMON_SCHEMA_INVALID", async () => {
		const admin = await createUserWithSession("admin");
		const genre = await createGenre();

		for (const body of [{}, { name: "" }, { name: "ok", code: "forced" }]) {
			const response = await patchGenre(
				admin.authorization,
				genre.id,
				body
			);
			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		}
		const malformedId = await patchGenre(
			admin.authorization,
			"not-a-uuid",
			{
				name: "ok"
			}
		);
		assert.equal(malformedId.status, 422);
	});

	for (const role of STAFF_ROLES) {
		void it(`lets a ${role} delete a genre`, async () => {
			const staff = await createUserWithSession(role);
			const genre = await createGenre();

			const response = await deleteGenre(staff.authorization, genre.id);

			assert.equal(response.status, 204);
			assert.equal(await Genre.count({ where: { id: genre.id } }), 0);
			const fetched = await api()
				.get(`/genres/${genre.code}`)
				.set("Authorization", staff.authorization);
			assert.equal(fetched.status, 404);
		});
	}

	void it("answers 409 GENRE_IN_USE while a game still carries the genre", async () => {
		const admin = await createUserWithSession("admin");
		const genre = await createGenre();
		const created = await api()
			.post("/games")
			.set("Authorization", admin.authorization)
			.send({
				title: `Genre Holder ${uniqueSuffix()}`,
				genres: [genre.code]
			})
			.expect(201);

		const blocked = await deleteGenre(admin.authorization, genre.id);
		assert.equal(blocked.status, 409);
		assert.equal(blocked.body.type, "GENRE_IN_USE");
		assert.equal(await Genre.count({ where: { id: genre.id } }), 1);

		await api()
			.patch(`/games/${created.body.data.game.id}`)
			.set("Authorization", admin.authorization)
			.send({ genres: [] })
			.expect(200);
		await deleteGenre(admin.authorization, genre.id).expect(204);
	});

	void it(
		"answers 404 GENRE_NOT_FOUND when deleting an unknown genre",
		{
			todo: "bug: DELETE /genres/:genreId for a nonexistent genre answers 204"
		},
		async () => {
			const admin = await createUserWithSession("admin");

			const response = await deleteGenre(
				admin.authorization,
				randomUUID()
			);

			assert.equal(response.status, 404);
			assert.equal(response.body.type, "GENRE_NOT_FOUND");
		}
	);

	void it("rejects a malformed genre id on delete with 422 COMMON_SCHEMA_INVALID", async () => {
		const admin = await createUserWithSession("admin");

		const response = await deleteGenre(admin.authorization, "not-a-uuid");

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});
});

void describe("platforms write endpoints", () => {
	function postPlatform(authorization: string, body: object) {
		return api()
			.post("/platforms")
			.set("Authorization", authorization)
			.send(body);
	}

	function patchPlatform(authorization: string, id: string, body: object) {
		return api()
			.patch(`/platforms/${id}`)
			.set("Authorization", authorization)
			.send(body);
	}

	function deletePlatform(authorization: string, id: string) {
		return api()
			.delete(`/platforms/${id}`)
			.set("Authorization", authorization);
	}

	for (const role of STAFF_ROLES) {
		void it(`lets a ${role} create a platform and read it back by code`, async () => {
			const staff = await createUserWithSession(role);
			const payload = platformPayload({
				name: `Handheld ${uniqueSuffix()}`
			});

			const response = await postPlatform(staff.authorization, payload);

			assert.equal(response.status, 201);
			const platform = response.body.data.platform;
			assert.equal(platform.name, payload.name);
			assert.match(platform.code, /^handheld-[a-z0-9]+$/);
			assert.equal(platform.abbreviation, payload.abbreviation);
			assert.equal(platform.manufacturer, "Completr Labs");
			assert.equal(platform.generation, 9);
			assert.equal(platform.releaseAt, "2020-11-10");

			const fetched = await api()
				.get(`/platforms/${platform.code}`)
				.set("Authorization", staff.authorization);
			assert.equal(fetched.status, 200);
			assert.equal(fetched.body.data.platform.id, platform.id);
		});
	}

	void it("accepts a platform without generation and logo", async () => {
		const admin = await createUserWithSession("admin");

		const response = await postPlatform(
			admin.authorization,
			platformPayload({ generation: undefined })
		);

		assert.equal(response.status, 201);
		assert.equal(response.body.data.platform.generation ?? null, null);
	});

	void it("rejects a duplicated platform name with 409 PLATFORM_UNIQUE_CONSTRAINT", async () => {
		const admin = await createUserWithSession("admin");
		const existing = await createPlatform();

		const response = await postPlatform(
			admin.authorization,
			platformPayload({ name: existing.name })
		);

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "PLATFORM_UNIQUE_CONSTRAINT");
	});

	const invalidCreateBodies: [string, Record<string, unknown>][] = [
		["a missing name", { name: undefined }],
		["a missing release date", { releaseAt: undefined }],
		["an abbreviation over 10 characters", { abbreviation: "ABCDEFGHIJK" }],
		["a non-integer generation", { generation: 1.5 }],
		["an invalid release date", { releaseAt: "10/11/2020" }],
		["an unknown field", { code: "forced-code" }]
	];

	for (const [label, overrides] of invalidCreateBodies) {
		void it(`rejects ${label} with 422 COMMON_SCHEMA_INVALID`, async () => {
			const admin = await createUserWithSession("admin");

			const response = await postPlatform(
				admin.authorization,
				platformPayload(overrides)
			);

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		});
	}

	for (const role of STAFF_ROLES) {
		void it(`lets a ${role} update a platform and keeps its code`, async () => {
			const staff = await createUserWithSession(role);
			const platform = await createPlatform();

			const response = await patchPlatform(
				staff.authorization,
				platform.id,
				{
					description: "Updated description",
					manufacturer: "New Maker",
					generation: 8
				}
			);

			assert.equal(response.status, 200);
			assert.equal(response.body.data.platform.id, platform.id);
			assert.equal(response.body.data.platform.code, platform.code);
			assert.equal(
				response.body.data.platform.description,
				"Updated description"
			);
			assert.equal(response.body.data.platform.manufacturer, "New Maker");
			assert.equal(response.body.data.platform.generation, 8);
			await platform.reload();
			assert.equal(platform.manufacturer, "New Maker");
		});
	}

	void it("answers 404 PLATFORM_NOT_FOUND when updating an unknown platform", async () => {
		const admin = await createUserWithSession("admin");

		const response = await patchPlatform(
			admin.authorization,
			randomUUID(),
			{
				description: "Ghost"
			}
		);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "PLATFORM_NOT_FOUND");
	});

	void it("rejects renaming a platform and other invalid updates with 422", async () => {
		const admin = await createUserWithSession("admin");
		const platform = await createPlatform();

		for (const body of [
			{ name: "Renamed" },
			{ abbreviation: "" },
			{ generation: 0 },
			{ releaseAt: "soon" }
		]) {
			const response = await patchPlatform(
				admin.authorization,
				platform.id,
				body
			);
			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		}
		const malformedId = await patchPlatform(
			admin.authorization,
			"not-a-uuid",
			{
				description: "x"
			}
		);
		assert.equal(malformedId.status, 422);
	});

	for (const role of STAFF_ROLES) {
		void it(`lets a ${role} delete an unused platform`, async () => {
			const staff = await createUserWithSession(role);
			const platform = await createPlatform();

			const response = await deletePlatform(
				staff.authorization,
				platform.id
			);

			assert.equal(response.status, 204);
			assert.equal(
				await Platform.count({ where: { id: platform.id } }),
				0
			);
			const fetched = await api()
				.get(`/platforms/${platform.code}`)
				.set("Authorization", staff.authorization);
			assert.equal(fetched.status, 404);
		});
	}

	void it("answers 409 PLATFORM_IN_USE when a backlog entry still uses the platform", async () => {
		const admin = await createUserWithSession("admin");
		const owner = await createUserWithSession();
		const [game, platform] = await Promise.all([
			createGame(),
			createPlatform()
		]);
		await createBacklog(owner.user.id, game.id, platform.id);

		const response = await deletePlatform(admin.authorization, platform.id);

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "PLATFORM_IN_USE");
		assert.equal(await Platform.count({ where: { id: platform.id } }), 1);
	});

	void it(
		"answers 404 PLATFORM_NOT_FOUND when deleting an unknown platform",
		{
			todo: "bug: DELETE /platforms/:platformId for a nonexistent platform answers 204"
		},
		async () => {
			const admin = await createUserWithSession("admin");

			const response = await deletePlatform(
				admin.authorization,
				randomUUID()
			);

			assert.equal(response.status, 404);
			assert.equal(response.body.type, "PLATFORM_NOT_FOUND");
		}
	);

	void it("rejects a malformed platform id on delete with 422 COMMON_SCHEMA_INVALID", async () => {
		const admin = await createUserWithSession("admin");

		const response = await deletePlatform(
			admin.authorization,
			"not-a-uuid"
		);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});
});

void describe("POST /score-sources", () => {
	function postScoreSource(authorization: string, body: object) {
		return api()
			.post("/score-sources")
			.set("Authorization", authorization)
			.send(body);
	}

	void it("lets an admin create a score source with the default priority", async () => {
		const admin = await createUserWithSession("admin");
		const code = `critic-${uniqueSuffix()}`;

		const response = await postScoreSource(admin.authorization, {
			code,
			name: "Critic Aggregator",
			scale: 10
		});

		assert.equal(response.status, 201);
		assert.deepEqual(response.body.data.source, {
			code,
			name: "Critic Aggregator",
			scale: 10,
			priority: 100
		});
		assert.equal(await ScoreSource.count({ where: { code } }), 1);
	});

	void it("stores a custom priority and lists the source ordered by priority", async () => {
		const admin = await createUserWithSession("admin");
		const code = `first-${uniqueSuffix()}`;

		await postScoreSource(admin.authorization, {
			code,
			name: "Top Priority",
			scale: 5,
			priority: 1
		}).expect(201);

		const listing = await api()
			.get("/score-sources")
			.set("Authorization", admin.authorization)
			.expect(200);
		const sources = listing.body.data.sources as {
			code: string;
			priority: number;
		}[];
		assert.equal(sources[0]!.code, code);
		assert.equal(sources[0]!.priority, 1);
	});

	void it("makes the new source usable for a game score", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();
		const code = `usable-${uniqueSuffix()}`;
		await postScoreSource(admin.authorization, {
			code,
			name: "Usable",
			scale: 10
		}).expect(201);

		const response = await api()
			.post("/game-scores")
			.set("Authorization", admin.authorization)
			.send({ gameId: game.id, source: code, score: 8 });

		assert.equal(response.status, 201);
		assert.equal(response.body.data.gameScore.source, code);
	});

	void it("rejects a duplicated code with 409 SCORE_SOURCE_ALREADY_EXISTS", async () => {
		const admin = await createUserWithSession("admin");

		const response = await postScoreSource(admin.authorization, {
			code: scoreSource,
			name: "Duplicate",
			scale: 100
		});

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "SCORE_SOURCE_ALREADY_EXISTS");
	});

	const invalidBodies: [string, Record<string, unknown>][] = [
		["a missing code", { name: "No Code", scale: 10 }],
		["an empty code", { code: "", name: "Empty", scale: 10 }],
		[
			"a code over 50 characters",
			{ code: "c".repeat(51), name: "Long", scale: 10 }
		],
		["a missing name", { code: "no-name", scale: 10 }],
		["a missing scale", { code: "no-scale", name: "No Scale" }],
		["a zero scale", { code: "zero", name: "Zero", scale: 0 }],
		[
			"a fractional scale",
			{ code: "fraction", name: "Fraction", scale: 2.5 }
		],
		[
			"a non-positive priority",
			{ code: "prio", name: "Prio", scale: 10, priority: 0 }
		],
		[
			"an unknown field",
			{ code: "extra", name: "Extra", scale: 10, id: randomUUID() }
		]
	];

	for (const [label, body] of invalidBodies) {
		void it(`rejects ${label} with 422 COMMON_SCHEMA_INVALID`, async () => {
			const admin = await createUserWithSession("admin");

			const response = await postScoreSource(admin.authorization, body);

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		});
	}
});

void describe("game-scores write endpoints", () => {
	function postGameScore(authorization: string, body: object) {
		return api()
			.post("/game-scores")
			.set("Authorization", authorization)
			.send(body);
	}

	function patchGameScore(
		authorization: string,
		gameId: string,
		source: string,
		body: object
	) {
		return api()
			.patch(`/game-scores/${gameId}/${source}`)
			.set("Authorization", authorization)
			.send(body);
	}

	function deleteGameScore(
		authorization: string,
		gameId: string,
		source: string
	) {
		return api()
			.delete(`/game-scores/${gameId}/${source}`)
			.set("Authorization", authorization);
	}

	for (const role of STAFF_ROLES) {
		void it(`lets a ${role} create a score and shows it in the game scores`, async () => {
			const staff = await createUserWithSession(role);
			const game = await createGame();

			const response = await postGameScore(staff.authorization, {
				gameId: game.id,
				source: scoreSource,
				score: 84.5
			});

			assert.equal(response.status, 201);
			assert.equal(response.body.data.gameScore.gameId, game.id);
			assert.equal(response.body.data.gameScore.source, scoreSource);
			assert.equal(response.body.data.gameScore.score, 84.5);

			const listing = await api()
				.get(`/game-scores/${game.id}`)
				.set("Authorization", staff.authorization)
				.expect(200);
			assert.deepEqual(
				listing.body.data.gameScores.map(
					(entry: { source: string; score: number }) => ({
						source: entry.source,
						score: entry.score
					})
				),
				[{ source: scoreSource, score: 84.5 }]
			);
		});
	}

	void it("rejects a second score for the same game and source with 409 GAME_SCORE_ALREADY_EXISTS", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();
		await createGameScore(game.id, scoreSource, 70);

		const response = await postGameScore(admin.authorization, {
			gameId: game.id,
			source: scoreSource,
			score: 90
		});

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "GAME_SCORE_ALREADY_EXISTS");
		const stored = await GameScore.findOne({
			where: { gameId: game.id, source: scoreSource }
		});
		assert.equal(stored?.score, 70);
	});

	void it("rejects a source outside the catalog with 422 GAME_SCORE_SOURCE_NOT_FOUND", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();

		const response = await postGameScore(admin.authorization, {
			gameId: game.id,
			source: "no-such-source",
			score: 50
		});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "GAME_SCORE_SOURCE_NOT_FOUND");
	});

	void it("rejects the computed completr source with 422 COMMON_SCHEMA_INVALID", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();

		const response = await postGameScore(admin.authorization, {
			gameId: game.id,
			source: "completr",
			score: 4
		});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		assert.equal(await GameScore.count({ where: { gameId: game.id } }), 0);
	});

	void it("rejects an unknown game with 422 COMMON_REFERENCE_NOT_FOUND", async () => {
		const admin = await createUserWithSession("admin");

		const response = await postGameScore(admin.authorization, {
			gameId: randomUUID(),
			source: scoreSource,
			score: 50
		});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_REFERENCE_NOT_FOUND");
	});

	void it(
		"rejects a negative score",
		{
			todo: "bug: POST /game-scores accepts negative scores and answers 201"
		},
		async () => {
			const admin = await createUserWithSession("admin");
			const game = await createGame();

			const response = await postGameScore(admin.authorization, {
				gameId: game.id,
				source: scoreSource,
				score: -5
			});

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		}
	);

	void it(
		"rejects a score above the scale of its source",
		{
			todo: "bug: POST /game-scores accepts a score above the source scale and answers 201"
		},
		async () => {
			const admin = await createUserWithSession("admin");
			const game = await createGame();

			const response = await postGameScore(admin.authorization, {
				gameId: game.id,
				source: scoreSource,
				score: 5000
			});

			assert.equal(response.status, 422);
		}
	);

	const invalidBodies: [string, Record<string, unknown>][] = [
		["a missing score", { source: "x" }],
		["a non-numeric score", { source: "x", score: "high" }],
		["a missing source", { score: 5 }],
		["an unknown field", { source: "x", score: 5, id: randomUUID() }]
	];

	for (const [label, body] of invalidBodies) {
		void it(`rejects ${label} with 422 COMMON_SCHEMA_INVALID`, async () => {
			const admin = await createUserWithSession("admin");
			const game = await createGame();

			const response = await postGameScore(admin.authorization, {
				gameId: game.id,
				...body
			});

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		});
	}

	void it("rejects a malformed game id with 422 COMMON_SCHEMA_INVALID", async () => {
		const admin = await createUserWithSession("admin");

		const response = await postGameScore(admin.authorization, {
			gameId: "not-a-uuid",
			source: scoreSource,
			score: 5
		});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	for (const role of STAFF_ROLES) {
		void it(`lets a ${role} update a score and reads the new value back`, async () => {
			const staff = await createUserWithSession(role);
			const game = await createGame();
			await createGameScore(game.id, scoreSource, 60);

			const response = await patchGameScore(
				staff.authorization,
				game.id,
				scoreSource,
				{ score: 72 }
			);

			assert.equal(response.status, 200);
			assert.equal(response.body.data.gameScore.score, 72);
			const stored = await GameScore.findOne({
				where: { gameId: game.id, source: scoreSource }
			});
			assert.equal(stored?.score, 72);
		});
	}

	void it("answers 404 GAME_SCORE_NOT_FOUND when updating a score that does not exist", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();

		const response = await patchGameScore(
			admin.authorization,
			game.id,
			scoreSource,
			{ score: 10 }
		);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GAME_SCORE_NOT_FOUND");
	});

	void it("rejects updating the computed completr score with 422 COMMON_SCHEMA_INVALID", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();
		await createScoreSource({ code: "completr" });
		await createGameScore(game.id, "completr", 4);

		const response = await patchGameScore(
			admin.authorization,
			game.id,
			"completr",
			{ score: 1 }
		);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		const stored = await GameScore.findOne({
			where: { gameId: game.id, source: "completr" }
		});
		assert.equal(stored?.score, 4);
	});

	void it("rejects an invalid update body and a malformed game id with 422", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();
		await createGameScore(game.id, scoreSource, 60);

		for (const body of [
			{},
			{ score: "x" },
			{ score: 1, source: "other" }
		]) {
			const response = await patchGameScore(
				admin.authorization,
				game.id,
				scoreSource,
				body
			);
			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		}
		const malformedId = await patchGameScore(
			admin.authorization,
			"not-a-uuid",
			scoreSource,
			{ score: 1 }
		);
		assert.equal(malformedId.status, 422);
	});

	for (const role of STAFF_ROLES) {
		void it(`lets a ${role} delete a score`, async () => {
			const staff = await createUserWithSession(role);
			const game = await createGame();
			await createGameScore(game.id, scoreSource, 60);

			const response = await deleteGameScore(
				staff.authorization,
				game.id,
				scoreSource
			);

			assert.equal(response.status, 204);
			assert.equal(
				await GameScore.count({ where: { gameId: game.id } }),
				0
			);
		});
	}

	void it("answers 404 GAME_SCORE_NOT_FOUND when deleting a score that does not exist", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();

		const response = await deleteGameScore(
			admin.authorization,
			game.id,
			scoreSource
		);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GAME_SCORE_NOT_FOUND");
	});

	void it("rejects deleting the computed completr score with 422 COMMON_SCHEMA_INVALID", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();
		await createGameScore(game.id, "completr", 4);

		const response = await deleteGameScore(
			admin.authorization,
			game.id,
			"completr"
		);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		assert.equal(await GameScore.count({ where: { gameId: game.id } }), 1);
	});

	void it("rejects a malformed game id on delete with 422 COMMON_SCHEMA_INVALID", async () => {
		const admin = await createUserWithSession("admin");

		const response = await deleteGameScore(
			admin.authorization,
			"not-a-uuid",
			scoreSource
		);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});
});

void describe("game-times write endpoints", () => {
	function postGameTime(authorization: string, body: object) {
		return api()
			.post("/game-times")
			.set("Authorization", authorization)
			.send(body);
	}

	function patchGameTime(
		authorization: string,
		gameId: string,
		source: string,
		body: object
	) {
		return api()
			.patch(`/game-times/${gameId}/${source}`)
			.set("Authorization", authorization)
			.send(body);
	}

	function deleteGameTime(
		authorization: string,
		gameId: string,
		source: string
	) {
		return api()
			.delete(`/game-times/${gameId}/${source}`)
			.set("Authorization", authorization);
	}

	for (const role of STAFF_ROLES) {
		void it(`lets a ${role} create a duration and shows it in the game times`, async () => {
			const staff = await createUserWithSession(role);
			const game = await createGame();

			const response = await postGameTime(staff.authorization, {
				gameId: game.id,
				source: "hltb",
				duration: 14.5
			});

			assert.equal(response.status, 201);
			assert.equal(response.body.data.gameTime.gameId, game.id);
			assert.equal(response.body.data.gameTime.source, "hltb");
			assert.equal(response.body.data.gameTime.duration, 14.5);

			const listing = await api()
				.get(`/game-times/${game.id}`)
				.set("Authorization", staff.authorization)
				.expect(200);
			assert.deepEqual(
				listing.body.data.gameTimes.map(
					(entry: { source: string; duration: number }) => ({
						source: entry.source,
						duration: entry.duration
					})
				),
				[{ source: "hltb", duration: 14.5 }]
			);
		});
	}

	void it("accepts the rawg source too", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();

		const response = await postGameTime(admin.authorization, {
			gameId: game.id,
			source: "rawg",
			duration: 6
		});

		assert.equal(response.status, 201);
		assert.equal(response.body.data.gameTime.source, "rawg");
	});

	void it("rejects a second duration for the same game and source with 409 GAME_TIME_ALREADY_EXISTS", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();
		await createGameTime(game.id, "hltb", 10);

		const response = await postGameTime(admin.authorization, {
			gameId: game.id,
			source: "hltb",
			duration: 20
		});

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "GAME_TIME_ALREADY_EXISTS");
		const stored = await GameTime.findOne({
			where: { gameId: game.id, source: "hltb" }
		});
		assert.equal(stored?.duration, 10);
	});

	void it("rejects the computed completr source with 422 COMMON_SCHEMA_INVALID", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();

		const response = await postGameTime(admin.authorization, {
			gameId: game.id,
			source: "completr",
			duration: 10
		});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		assert.equal(await GameTime.count({ where: { gameId: game.id } }), 0);
	});

	void it("rejects an unknown game with 422 COMMON_REFERENCE_NOT_FOUND", async () => {
		const admin = await createUserWithSession("admin");

		const response = await postGameTime(admin.authorization, {
			gameId: randomUUID(),
			source: "hltb",
			duration: 10
		});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_REFERENCE_NOT_FOUND");
	});

	void it(
		"rejects a negative duration",
		{
			todo: "bug: POST /game-times accepts zero and negative durations and answers 201"
		},
		async () => {
			const admin = await createUserWithSession("admin");
			const game = await createGame();

			const response = await postGameTime(admin.authorization, {
				gameId: game.id,
				source: "hltb",
				duration: -5
			});

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		}
	);

	const invalidBodies: [string, Record<string, unknown>][] = [
		["a missing duration", { source: "hltb" }],
		["a non-numeric duration", { source: "hltb", duration: "long" }],
		["an unknown source", { source: "metacritic", duration: 5 }],
		["an unknown field", { source: "hltb", duration: 5, id: randomUUID() }]
	];

	for (const [label, body] of invalidBodies) {
		void it(`rejects ${label} with 422 COMMON_SCHEMA_INVALID`, async () => {
			const admin = await createUserWithSession("admin");
			const game = await createGame();

			const response = await postGameTime(admin.authorization, {
				gameId: game.id,
				...body
			});

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		});
	}

	for (const role of STAFF_ROLES) {
		void it(`lets a ${role} update a duration and reads the new value back`, async () => {
			const staff = await createUserWithSession(role);
			const game = await createGame();
			await createGameTime(game.id, "hltb", 10);

			const response = await patchGameTime(
				staff.authorization,
				game.id,
				"hltb",
				{ duration: 12.25 }
			);

			assert.equal(response.status, 200);
			assert.equal(response.body.data.gameTime.duration, 12.25);
			const stored = await GameTime.findOne({
				where: { gameId: game.id, source: "hltb" }
			});
			assert.equal(stored?.duration, 12.25);
		});
	}

	void it("answers 404 GAME_TIME_NOT_FOUND when updating a duration that does not exist", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();

		const response = await patchGameTime(
			admin.authorization,
			game.id,
			"hltb",
			{ duration: 5 }
		);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GAME_TIME_NOT_FOUND");
	});

	void it("rejects an invalid update, the completr source and a malformed game id with 422", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();
		await createGameTime(game.id, "hltb", 10);
		await createGameTime(game.id, "completr", 8);

		for (const body of [
			{},
			{ duration: "x" },
			{ duration: 1, source: "rawg" }
		]) {
			const response = await patchGameTime(
				admin.authorization,
				game.id,
				"hltb",
				body
			);
			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		}
		const computed = await patchGameTime(
			admin.authorization,
			game.id,
			"completr",
			{ duration: 1 }
		);
		assert.equal(computed.status, 422);
		const stored = await GameTime.findOne({
			where: { gameId: game.id, source: "completr" }
		});
		assert.equal(stored?.duration, 8);
		const malformedId = await patchGameTime(
			admin.authorization,
			"not-a-uuid",
			"hltb",
			{ duration: 1 }
		);
		assert.equal(malformedId.status, 422);
	});

	for (const role of STAFF_ROLES) {
		void it(`lets a ${role} delete a duration`, async () => {
			const staff = await createUserWithSession(role);
			const game = await createGame();
			await createGameTime(game.id, "hltb", 10);

			const response = await deleteGameTime(
				staff.authorization,
				game.id,
				"hltb"
			);

			assert.equal(response.status, 204);
			assert.equal(
				await GameTime.count({ where: { gameId: game.id } }),
				0
			);
		});
	}

	void it("answers 404 GAME_TIME_NOT_FOUND when deleting a duration that does not exist", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();

		const response = await deleteGameTime(
			admin.authorization,
			game.id,
			"rawg"
		);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GAME_TIME_NOT_FOUND");
	});

	void it("rejects deleting the computed completr duration with 422 COMMON_SCHEMA_INVALID", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();
		await createGameTime(game.id, "completr", 8);

		const response = await deleteGameTime(
			admin.authorization,
			game.id,
			"completr"
		);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		assert.equal(await GameTime.count({ where: { gameId: game.id } }), 1);
	});

	void it("rejects a malformed game id on delete with 422 COMMON_SCHEMA_INVALID", async () => {
		const admin = await createUserWithSession("admin");

		const response = await deleteGameTime(
			admin.authorization,
			"not-a-uuid",
			"hltb"
		);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});
});
