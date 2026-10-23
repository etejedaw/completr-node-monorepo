import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it, mock } from "node:test";

import { Activity } from "../../src/activity/activity.model";
import { ActivityGame } from "../../src/activity/targets/activity-game.model";
import { AuditLog } from "../../src/audit/audit.model";
import { Backlog } from "../../src/backlog/backlog.model";
import { CompilationItem } from "../../src/compilation-items/compilation-item.model";
import { CoopRun } from "../../src/coop-runs/coop-run.model";
import { Favorite } from "../../src/favorites/favorite.model";
import { GameExternal } from "../../src/game-external/game-external.model";
import * as gameExternalService from "../../src/game-external/game-external.service";
import { GameGenre } from "../../src/game-genre/game-genre.model";
import { GamePlatform } from "../../src/game-platform/game-platform.model";
import { GameReport } from "../../src/game-reports/game-report.model";
import { GameScore } from "../../src/game-scores/game-score.model";
import { GameShelf } from "../../src/game-shelf/game-shelf.model";
import { GameTime } from "../../src/game-times/game-time.model";
import { Game } from "../../src/games/game.model";
import { Genre } from "../../src/genres/genres.model";
import { ListItem } from "../../src/list-items/list-item.model";
import { UserGameTag } from "../../src/mood-tags/user-game-tag.model";
import { Queue } from "../../src/queue/queue.model";
import { Review } from "../../src/reviews/review.model";
import { type UserRole } from "../../src/users/user-role.type";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { eventually } from "../helpers/eventually.helper";
import {
	createBacklog,
	createFranchise,
	createGame,
	createGameScore,
	createGameTime,
	createList,
	createPlatform,
	createScoreSource,
	createUser,
	createWishlistEntries
} from "../helpers/factories.helper";

let scoreSource: string;

useTestDatabase(async () => {
	const source = await createScoreSource({ scale: 100 });
	scoreSource = source.code;
});

type Account = Awaited<ReturnType<typeof createUserWithSession>>;
type Authorization = string | undefined;

const STAFF_ROLES: UserRole[] = ["moderator", "admin"];
const NON_STAFF_ROLES: UserRole[] = ["user", "premium"];
const NON_ADMIN_ROLES: UserRole[] = ["user", "premium", "moderator"];

function uniqueSuffix() {
	return randomUUID().replaceAll("-", "").slice(0, 10);
}

function uniqueTitle(prefix = "Admin Game") {
	return `${prefix} ${uniqueSuffix()}`;
}

function gamePayload(overrides: Record<string, unknown> = {}) {
	return { title: uniqueTitle(), ...overrides };
}

function createGenre() {
	const suffix = uniqueSuffix();
	return Genre.create({ name: `Genre ${suffix}`, code: `genre-${suffix}` });
}

function auditEntry(action: string, targetId: string) {
	return eventually(async () => {
		const entry = await AuditLog.findOne({ where: { action, targetId } });
		assert.ok(entry, `no audit entry ${action} for ${targetId}`);
		return entry;
	});
}

function withAuthorization<
	T extends { set: (name: string, value: string) => T }
>(request: T, authorization: Authorization) {
	return authorization
		? request.set("Authorization", authorization)
		: request;
}

function postGame(authorization: Authorization, body: object) {
	return withAuthorization(api().post("/games"), authorization).send(body);
}

function patchGame(authorization: Authorization, id: string, body: object) {
	return withAuthorization(api().patch(`/games/${id}`), authorization).send(
		body
	);
}

function deleteGame(authorization: Authorization, id: string, query = "") {
	return withAuthorization(
		api().delete(`/games/${id}${query}`),
		authorization
	);
}

function reactivateGame(authorization: Authorization, id: string) {
	return withAuthorization(
		api().post(`/games/${id}/reactivate`),
		authorization
	);
}

function splitGame(authorization: Authorization, id: string, body: object) {
	return withAuthorization(
		api().post(`/games/${id}/split`),
		authorization
	).send(body);
}

function putCompilationItems(
	authorization: Authorization,
	id: string,
	body: object
) {
	return withAuthorization(
		api().put(`/games/${id}/compilation-items`),
		authorization
	).send(body);
}

function deleteCompilationItems(authorization: Authorization, id: string) {
	return withAuthorization(
		api().delete(`/games/${id}/compilation-items`),
		authorization
	);
}

function getGameByCode(account: Account, code: string) {
	return api()
		.get(`/games/${code}`)
		.set("Authorization", account.authorization);
}

interface GameBody {
	id: string;
	title: string;
	code: string;
	variant: string | null;
	isActive: boolean;
	isCompilation: boolean;
	platforms: { code: string }[];
	genres: { code: string }[];
	scores: { source: string; score: number }[];
	times: { source: string; duration: number }[];
}

const USER_DATA_SEEDS: Record<string, (gameId: string) => Promise<unknown>> = {
	"a backlog entry": async gameId => {
		const user = await createUser();
		const platform = await createPlatform();
		return createBacklog(user.id, gameId, platform.id);
	},
	"a queued backlog entry": async gameId => {
		const user = await createUser();
		const platform = await createPlatform();
		const backlog = await createBacklog(user.id, gameId, platform.id);
		return Queue.create({
			userId: user.id,
			backlogId: backlog.id,
			position: 1
		});
	},
	"a backlog entry that points at it as compilation": async gameId => {
		const user = await createUser();
		const platform = await createPlatform();
		const other = await createGame();
		const backlog = await createBacklog(user.id, other.id, platform.id);
		return backlog.update({ compilationGameId: gameId });
	},
	"a game shelf entry": async gameId => {
		const user = await createUser();
		const platform = await createPlatform();
		return GameShelf.create({
			userId: user.id,
			gameId,
			platformId: platform.id
		});
	},
	"a list item": async gameId => {
		const user = await createUser();
		const list = await createList(user.id, scoreSource);
		return ListItem.create({ listId: list.id, gameId, position: 1 });
	},
	"a favorite": async gameId => {
		const user = await createUser();
		return Favorite.create({ userId: user.id, gameId, position: 1 });
	},
	"a wishlist entry": async gameId => {
		const user = await createUser();
		return createWishlistEntries(user.id, [gameId]);
	},
	"a review": async gameId => {
		const user = await createUser();
		return Review.create({
			userId: user.id,
			gameId,
			content: "Great",
			rating: 4
		});
	},
	"a coop run": gameId => CoopRun.create({ gameId }),
	"a mood tag": async gameId => {
		const user = await createUser();
		return UserGameTag.create({
			userId: user.id,
			gameId,
			tag: "cozy"
		});
	},
	"an activity": async gameId => {
		const user = await createUser();
		const activity = await Activity.create({
			userId: user.id,
			type: "favorite_added"
		});
		return ActivityGame.create({ activityId: activity.id, gameId });
	}
};

const FORBIDDEN_FOR_NON_STAFF = [
	{
		label: "POST /games",
		request: (authorization: Authorization) =>
			postGame(authorization, gamePayload())
	},
	{
		label: "PATCH /games/:id",
		request: (authorization: Authorization) =>
			patchGame(authorization, randomUUID(), { description: "text" })
	},
	{
		label: "POST /games/:id/split",
		request: (authorization: Authorization) =>
			splitGame(authorization, randomUUID(), {
				variants: [
					{ title: "A", variant: "A" },
					{ title: "B", variant: "B" }
				]
			})
	},
	{
		label: "PUT /games/:id/compilation-items",
		request: (authorization: Authorization) =>
			putCompilationItems(authorization, randomUUID(), {
				items: [{ mode: "create", title: "Part" }]
			})
	},
	{
		label: "DELETE /games/:id/compilation-items",
		request: (authorization: Authorization) =>
			deleteCompilationItems(authorization, randomUUID())
	}
];

const FORBIDDEN_FOR_NON_ADMIN = [
	{
		label: "DELETE /games/:id",
		request: (authorization: Authorization) =>
			deleteGame(authorization, randomUUID())
	},
	{
		label: "DELETE /games/:id?hard=true",
		request: (authorization: Authorization) =>
			deleteGame(authorization, randomUUID(), "?hard=true")
	},
	{
		label: "POST /games/:id/reactivate",
		request: (authorization: Authorization) =>
			reactivateGame(authorization, randomUUID())
	}
];

void describe("role matrix of the game write endpoints", () => {
	for (const { label, request } of FORBIDDEN_FOR_NON_STAFF) {
		for (const role of NON_STAFF_ROLES) {
			void it(`rejects ${label} from a ${role} with 403 AUTH_FORBIDDEN`, async () => {
				const account = await createUserWithSession(role);

				const response = await request(account.authorization);

				assert.equal(response.status, 403);
				assert.equal(response.body.type, "AUTH_FORBIDDEN");
			});
		}
	}

	for (const { label, request } of FORBIDDEN_FOR_NON_ADMIN) {
		for (const role of NON_ADMIN_ROLES) {
			void it(`rejects ${label} from a ${role} with 403 AUTH_FORBIDDEN`, async () => {
				const account = await createUserWithSession(role);

				const response = await request(account.authorization);

				assert.equal(response.status, 403);
				assert.equal(response.body.type, "AUTH_FORBIDDEN");
			});
		}
	}

	for (const { label, request } of [
		...FORBIDDEN_FOR_NON_STAFF,
		...FORBIDDEN_FOR_NON_ADMIN
	]) {
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

	void it("does not create a game for a user", async () => {
		const account = await createUserWithSession("user");
		const title = uniqueTitle();

		await postGame(account.authorization, { title }).expect(403);

		assert.equal(await Game.count({ where: { title } }), 0);
	});

	void it("does not change a game for a user", async () => {
		const account = await createUserWithSession("user");
		const game = await createGame();

		await patchGame(account.authorization, game.id, {
			title: "Hijacked"
		}).expect(403);

		await game.reload();
		assert.notEqual(game.title, "Hijacked");
	});

	void it("does not let a moderator deactivate a game", async () => {
		const moderator = await createUserWithSession("moderator");
		const game = await createGame();

		await deleteGame(moderator.authorization, game.id).expect(403);

		await game.reload();
		assert.equal(game.isActive, true);
	});

	void it("does not let a moderator hard delete a game", async () => {
		const moderator = await createUserWithSession("moderator");
		const game = await createGame();

		await deleteGame(moderator.authorization, game.id, "?hard=true").expect(
			403
		);

		assert.equal(await Game.count({ where: { id: game.id } }), 1);
	});

	void it("does not let a moderator reactivate a game", async () => {
		const moderator = await createUserWithSession("moderator");
		const game = await createGame({ isActive: false });

		await reactivateGame(moderator.authorization, game.id).expect(403);

		await game.reload();
		assert.equal(game.isActive, false);
	});
});

void describe("POST /games", () => {
	for (const role of STAFF_ROLES) {
		void it(`lets a ${role} register a game with platforms, genres, scores and times`, async () => {
			const staff = await createUserWithSession(role);
			const [platform, genre] = await Promise.all([
				createPlatform(),
				createGenre()
			]);
			const title = uniqueTitle("Full Game");

			const response = await postGame(staff.authorization, {
				title,
				description: "A catalogued game",
				releaseAt: "2024-05-17",
				platforms: [platform.code],
				genres: [genre.code],
				scores: [{ source: scoreSource, score: 87 }],
				times: [{ source: "hltb", duration: 12.5 }]
			});

			assert.equal(response.status, 201);
			const game = response.body.data.game as GameBody;
			assert.equal(game.title, title);
			assert.match(game.code, /^full-game-[a-z0-9]+$/);
			assert.equal(game.isActive, true);
			assert.equal(game.isCompilation, false);
			assert.deepEqual(
				game.platforms.map(entry => entry.code),
				[platform.code]
			);
			assert.deepEqual(
				game.genres.map(entry => entry.code),
				[genre.code]
			);
			assert.deepEqual(game.scores, [{ source: scoreSource, score: 87 }]);
			assert.deepEqual(game.times, [{ source: "hltb", duration: 12.5 }]);

			const fetched = await getGameByCode(staff, game.code);
			assert.equal(fetched.status, 200);
			assert.equal(fetched.body.data.game.id, game.id);
		});
	}

	void it("registers a game with only a title and defaults the optional parts", async () => {
		const admin = await createUserWithSession("admin");

		const response = await postGame(admin.authorization, {
			title: "Plain Title: Reloaded! " + uniqueSuffix()
		});

		assert.equal(response.status, 201);
		const game = response.body.data.game as GameBody;
		assert.match(game.code, /^plain-title-reloaded-[a-z0-9]+$/);
		assert.deepEqual(game.platforms, []);
		assert.deepEqual(game.genres, []);
		assert.deepEqual(game.scores, []);
		assert.deepEqual(game.times, []);
		assert.equal(game.variant, null);
	});

	void it("stores external ids and returns them with the game", async () => {
		const admin = await createUserWithSession("admin");
		const externalId = uniqueSuffix();

		const response = await postGame(admin.authorization, {
			title: uniqueTitle(),
			externalIds: [{ source: "igdb", externalId }]
		});

		assert.equal(response.status, 201);
		const stored = await GameExternal.findAll({
			where: { gameId: response.body.data.game.id }
		});
		assert.deepEqual(
			stored.map(entry => ({
				source: entry.source,
				externalId: entry.externalId
			})),
			[{ source: "igdb", externalId }]
		);
	});

	void it("records the creation in the audit log", async () => {
		const moderator = await createUserWithSession("moderator");

		const response = await postGame(moderator.authorization, gamePayload());
		assert.equal(response.status, 201);

		const entry = await auditEntry(
			"game_created",
			response.body.data.game.id
		);
		assert.equal(entry.userId, moderator.user.id);
		assert.equal(entry.targetType, "game");
	});

	void it("rejects a title that is already taken with 409 GAME_UNIQUE_CONSTRAINT", async () => {
		const admin = await createUserWithSession("admin");
		const existing = await createGame();

		const response = await postGame(admin.authorization, {
			title: existing.title
		});

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "GAME_UNIQUE_CONSTRAINT");
		assert.equal(await Game.count({ where: { code: existing.code } }), 1);
	});

	void it("rejects a title that cannot become a slug with 400 GAME_VALIDATION_ERROR", async () => {
		const admin = await createUserWithSession("admin");

		const response = await postGame(admin.authorization, { title: "!!!" });

		assert.equal(response.status, 400);
		assert.equal(response.body.type, "GAME_VALIDATION_ERROR");
	});

	void it("answers 404 GAME_PLATFORM_NOT_FOUND for an unknown platform and creates nothing", async () => {
		const admin = await createUserWithSession("admin");
		const title = uniqueTitle();

		const response = await postGame(admin.authorization, {
			title,
			platforms: ["no-such-platform"]
		});

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GAME_PLATFORM_NOT_FOUND");
		assert.equal(await Game.count({ where: { title } }), 0);
	});

	void it("answers 404 GAME_GENRE_NOT_FOUND for an unknown genre and creates nothing", async () => {
		const admin = await createUserWithSession("admin");
		const title = uniqueTitle();

		const response = await postGame(admin.authorization, {
			title,
			genres: ["no-such-genre"]
		});

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GAME_GENRE_NOT_FOUND");
		assert.equal(await Game.count({ where: { title } }), 0);
	});

	void it("answers 422 GAME_SCORE_SOURCE_NOT_FOUND for a score source outside the catalog", async () => {
		const admin = await createUserWithSession("admin");
		const title = uniqueTitle();

		const response = await postGame(admin.authorization, {
			title,
			scores: [{ source: "no-such-source", score: 50 }]
		});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "GAME_SCORE_SOURCE_NOT_FOUND");
		assert.equal(await Game.count({ where: { title } }), 0);
	});

	void it("answers 422 GAME_VARIANT_REQUIRED when sharing an external id without a variant", async () => {
		const admin = await createUserWithSession("admin");
		const externalId = uniqueSuffix();
		await postGame(admin.authorization, {
			title: uniqueTitle(),
			variant: "PC",
			externalIds: [{ source: "steam", externalId }]
		}).expect(201);
		const title = uniqueTitle();

		const response = await postGame(admin.authorization, {
			title,
			externalIds: [{ source: "steam", externalId }]
		});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "GAME_VARIANT_REQUIRED");
		assert.equal(await Game.count({ where: { title } }), 0);
	});

	void it("accepts two games sharing an external id when both carry a variant", async () => {
		const admin = await createUserWithSession("admin");
		const externalId = uniqueSuffix();
		await postGame(admin.authorization, {
			title: uniqueTitle(),
			variant: "PC",
			externalIds: [{ source: "steam", externalId }]
		}).expect(201);

		const response = await postGame(admin.authorization, {
			title: uniqueTitle(),
			variant: "Console",
			externalIds: [{ source: "steam", externalId }]
		});

		assert.equal(response.status, 201);
		assert.equal(response.body.data.game.variant, "Console");
	});

	void it("rejects an unknown parentGameId with 422 COMMON_REFERENCE_NOT_FOUND and creates nothing", async () => {
		const admin = await createUserWithSession("admin");
		const title = uniqueTitle();

		const response = await postGame(admin.authorization, {
			title,
			isDlc: true,
			parentGameId: randomUUID()
		});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_REFERENCE_NOT_FOUND");
		assert.equal(await Game.count({ where: { title } }), 0);
	});

	void it("accepts a score of 0 on a registered game", async () => {
		const admin = await createUserWithSession("admin");

		const response = await postGame(admin.authorization, {
			title: uniqueTitle(),
			scores: [{ source: scoreSource, score: 0 }]
		});

		assert.equal(response.status, 201);
		assert.deepEqual(response.body.data.game.scores, [
			{ source: scoreSource, score: 0 }
		]);
	});

	void it("answers 422 GAME_SCORE_OUT_OF_RANGE for a score above the source scale", async () => {
		const admin = await createUserWithSession("admin");
		const title = uniqueTitle();

		const response = await postGame(admin.authorization, {
			title,
			scores: [{ source: scoreSource, score: 101 }]
		});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "GAME_SCORE_OUT_OF_RANGE");
		assert.equal(await Game.count({ where: { title } }), 0);
	});

	const invalidBodies: [string, Record<string, unknown>][] = [
		["a missing title", {}],
		["an empty title", { title: "" }],
		["a title over 200 characters", { title: "a".repeat(201) }],
		["an unknown field", { title: "Strict", isActive: false }],
		[
			"a negative score",
			{ title: "Score", scores: [{ source: "x", score: -1 }] }
		],
		[
			"a non-positive duration",
			{ title: "Time", times: [{ source: "hltb", duration: -1 }] }
		],
		[
			"an unsupported time source",
			{ title: "Time", times: [{ source: "metacritic", duration: 1 }] }
		],
		["an invalid release date", { title: "Date", releaseAt: "17/05/2024" }],
		[
			"an unknown external source",
			{ title: "Ext", externalIds: [{ source: "gog", externalId: "1" }] }
		],
		["a malformed parentGameId", { title: "Parent", parentGameId: "nope" }]
	];

	for (const [label, body] of invalidBodies) {
		void it(`rejects ${label} with 422 COMMON_SCHEMA_INVALID`, async () => {
			const admin = await createUserWithSession("admin");

			const response = await postGame(admin.authorization, body);

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		});
	}
});

void describe("PATCH /games/:id", () => {
	for (const role of STAFF_ROLES) {
		void it(`lets a ${role} edit the basic fields and regenerates the code from the title`, async () => {
			const staff = await createUserWithSession(role);
			const game = await createGame();
			const newTitle = uniqueTitle("Renamed Game");

			const response = await patchGame(staff.authorization, game.id, {
				title: newTitle,
				description: "Updated description",
				releaseAt: "2020-01-31",
				isDlc: true
			});

			assert.equal(response.status, 200);
			const updated = response.body.data.game as GameBody & {
				description: string;
				releaseAt: string;
				isDlc: boolean;
			};
			assert.equal(updated.id, game.id);
			assert.equal(updated.title, newTitle);
			assert.match(updated.code, /^renamed-game-[a-z0-9]+$/);
			assert.equal(updated.description, "Updated description");
			assert.equal(updated.releaseAt, "2020-01-31");
			assert.equal(updated.isDlc, true);

			assert.equal(
				(await getGameByCode(staff, updated.code)).status,
				200
			);
			const oldCode = await getGameByCode(staff, game.code);
			assert.equal(oldCode.status, 404);
			assert.equal(oldCode.body.type, "GAME_NOT_FOUND");
		});
	}

	void it("replaces the platforms and genres with the given sets", async () => {
		const admin = await createUserWithSession("admin");
		const [oldPlatform, newPlatform, oldGenre, newGenre] =
			await Promise.all([
				createPlatform(),
				createPlatform(),
				createGenre(),
				createGenre()
			]);
		const created = await postGame(admin.authorization, {
			title: uniqueTitle(),
			platforms: [oldPlatform.code],
			genres: [oldGenre.code]
		}).expect(201);

		const response = await patchGame(
			admin.authorization,
			created.body.data.game.id,
			{
				platforms: [newPlatform.code],
				genres: [newGenre.code]
			}
		);

		assert.equal(response.status, 200);
		const updated = response.body.data.game as GameBody;
		assert.deepEqual(
			updated.platforms.map(entry => entry.code),
			[newPlatform.code]
		);
		assert.deepEqual(
			updated.genres.map(entry => entry.code),
			[newGenre.code]
		);
	});

	void it("rolls back the title, platforms, genres and external ids when a step fails mid-update", async () => {
		const admin = await createUserWithSession("admin");
		const [oldPlatform, newPlatform, oldGenre, newGenre] =
			await Promise.all([
				createPlatform(),
				createPlatform(),
				createGenre(),
				createGenre()
			]);
		const oldTitle = uniqueTitle();
		const created = await postGame(admin.authorization, {
			title: oldTitle,
			platforms: [oldPlatform.code],
			genres: [oldGenre.code],
			externalIds: [{ source: "rawg", externalId: "111" }]
		}).expect(201);
		const gameId = created.body.data.game.id as string;
		const upsert = mock.method(gameExternalService, "upsert", () =>
			Promise.reject(new Error("simulated database failure"))
		);

		try {
			const response = await patchGame(admin.authorization, gameId, {
				title: uniqueTitle(),
				platforms: [newPlatform.code],
				genres: [newGenre.code],
				externalIds: [{ source: "rawg", externalId: "222" }]
			});

			assert.equal(response.status, 500);
			assert.equal(upsert.mock.callCount(), 1);
		} finally {
			upsert.mock.restore();
		}

		const game = await Game.findByPk(gameId);
		assert.equal(game?.title, oldTitle);
		const platformLinks = await GamePlatform.findAll({ where: { gameId } });
		assert.deepEqual(
			platformLinks.map(link => link.platformId),
			[oldPlatform.id]
		);
		const genreLinks = await GameGenre.findAll({ where: { gameId } });
		assert.deepEqual(
			genreLinks.map(link => link.genreId),
			[oldGenre.id]
		);
		const externals = await GameExternal.findAll({ where: { gameId } });
		assert.deepEqual(
			externals.map(external => external.externalId),
			["111"]
		);
	});

	void it("clears the platforms and genres when sent empty", async () => {
		const admin = await createUserWithSession("admin");
		const [platform, genre] = await Promise.all([
			createPlatform(),
			createGenre()
		]);
		const created = await postGame(admin.authorization, {
			title: uniqueTitle(),
			platforms: [platform.code],
			genres: [genre.code]
		}).expect(201);

		const response = await patchGame(
			admin.authorization,
			created.body.data.game.id,
			{
				platforms: [],
				genres: []
			}
		);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.game.platforms, []);
		assert.deepEqual(response.body.data.game.genres, []);
	});

	void it("leaves scores and times alone when only other fields change", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();
		await createGameScore(game.id, scoreSource, 80);
		await createGameTime(game.id, "hltb", 9);

		const response = await patchGame(admin.authorization, game.id, {
			description: "Only the description changes"
		});

		assert.equal(response.status, 200);
		const updated = response.body.data.game as GameBody;
		assert.deepEqual(updated.scores, [{ source: scoreSource, score: 80 }]);
		assert.deepEqual(updated.times, [{ source: "hltb", duration: 9 }]);
	});

	void it("links the game to a franchise and unlinks it with null", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();
		const franchise = await createFranchise();

		const linked = await patchGame(admin.authorization, game.id, {
			franchiseId: franchise.id
		});
		assert.equal(linked.status, 200);
		assert.equal(linked.body.data.game.franchise.id, franchise.id);

		const unlinked = await patchGame(admin.authorization, game.id, {
			franchiseId: null
		});
		assert.equal(unlinked.status, 200);
		assert.equal(unlinked.body.data.game.franchise, null);
	});

	void it("sets and clears the variant", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();

		const set = await patchGame(admin.authorization, game.id, {
			variant: "Remastered"
		});
		assert.equal(set.body.data.game.variant, "Remastered");

		const cleared = await patchGame(admin.authorization, game.id, {
			variant: null
		});
		assert.equal(cleared.body.data.game.variant, null);
	});

	void it("answers 422 GAME_VARIANT_REQUIRED when the game shares an external id with a sibling without variant", async () => {
		const admin = await createUserWithSession("admin");
		const externalId = uniqueSuffix();
		const sibling = await postGame(admin.authorization, {
			title: uniqueTitle(),
			externalIds: [{ source: "steam", externalId }]
		}).expect(201);
		const game = await createGame();

		const response = await patchGame(admin.authorization, game.id, {
			variant: "Edition",
			externalIds: [{ source: "steam", externalId }]
		});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "GAME_VARIANT_REQUIRED");
		assert.ok(sibling.body.data.game.id);
	});

	void it("records the edit in the audit log", async () => {
		const moderator = await createUserWithSession("moderator");
		const game = await createGame();

		await patchGame(moderator.authorization, game.id, {
			description: "Audited"
		}).expect(200);

		const entry = await auditEntry("game_edited", game.id);
		assert.equal(entry.userId, moderator.user.id);
		assert.equal(entry.targetType, "game");
	});

	void it("answers 404 GAME_NOT_FOUND for an unknown game", async () => {
		const admin = await createUserWithSession("admin");

		const response = await patchGame(admin.authorization, randomUUID(), {
			description: "Ghost"
		});

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GAME_NOT_FOUND");
	});

	void it("answers 404 GAME_NOT_FOUND for a deactivated game", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame({ isActive: false });

		const response = await patchGame(admin.authorization, game.id, {
			description: "Hidden"
		});

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GAME_NOT_FOUND");
	});

	void it("answers 404 GAME_PLATFORM_NOT_FOUND for an unknown platform and keeps the game", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();

		const response = await patchGame(admin.authorization, game.id, {
			title: uniqueTitle("Never Applied"),
			platforms: ["no-such-platform"]
		});

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GAME_PLATFORM_NOT_FOUND");
		await game.reload();
		assert.doesNotMatch(game.title, /Never Applied/);
	});

	void it("answers 404 GAME_GENRE_NOT_FOUND for an unknown genre", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();

		const response = await patchGame(admin.authorization, game.id, {
			genres: ["no-such-genre"]
		});

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GAME_GENRE_NOT_FOUND");
	});

	void it("rejects a title that cannot become a slug with 400 GAME_VALIDATION_ERROR", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();

		const response = await patchGame(admin.authorization, game.id, {
			title: "???"
		});

		assert.equal(response.status, 400);
		assert.equal(response.body.type, "GAME_VALIDATION_ERROR");
		await game.reload();
		assert.notEqual(game.title, "???");
	});

	void it("answers 409 GAME_UNIQUE_CONSTRAINT when the new title collides with another game", async () => {
		const admin = await createUserWithSession("admin");
		const [game, other] = await Promise.all([createGame(), createGame()]);

		const response = await patchGame(admin.authorization, game.id, {
			title: other.title
		});

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "GAME_UNIQUE_CONSTRAINT");
	});

	void it("leaves the platforms and genres untouched when the new title collides", async () => {
		const admin = await createUserWithSession("admin");
		const [oldPlatform, newPlatform, oldGenre, newGenre] =
			await Promise.all([
				createPlatform(),
				createPlatform(),
				createGenre(),
				createGenre()
			]);
		const created = await postGame(admin.authorization, {
			title: uniqueTitle(),
			platforms: [oldPlatform.code],
			genres: [oldGenre.code]
		}).expect(201);
		const other = await createGame();
		const { id, code } = created.body.data.game as GameBody;

		const response = await patchGame(admin.authorization, id, {
			title: other.title,
			platforms: [newPlatform.code],
			genres: [newGenre.code]
		});

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "GAME_UNIQUE_CONSTRAINT");
		const reread = await getGameByCode(admin, code);
		assert.equal(reread.status, 200);
		const unchanged = reread.body.data.game as GameBody;
		assert.deepEqual(
			unchanged.platforms.map(entry => entry.code),
			[oldPlatform.code]
		);
		assert.deepEqual(
			unchanged.genres.map(entry => entry.code),
			[oldGenre.code]
		);
	});

	void it("rejects a malformed game id with 422 COMMON_SCHEMA_INVALID", async () => {
		const admin = await createUserWithSession("admin");

		const response = await patchGame(admin.authorization, "not-a-uuid", {
			description: "x"
		});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	const invalidBodies: [string, Record<string, unknown>][] = [
		["an empty title", { title: "" }],
		["an unknown field", { isActive: false }],
		["a score payload", { scores: [{ source: "x", score: 1 }] }],
		["a malformed franchise id", { franchiseId: "nope" }],
		["an invalid release date", { releaseAt: "tomorrow" }]
	];

	for (const [label, body] of invalidBodies) {
		void it(`rejects ${label} with 422 COMMON_SCHEMA_INVALID`, async () => {
			const admin = await createUserWithSession("admin");
			const game = await createGame();

			const response = await patchGame(
				admin.authorization,
				game.id,
				body
			);

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		});
	}
});

void describe("DELETE /games/:id", () => {
	void it("deactivates the game so it disappears from the catalog but stays stored", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();

		const response = await deleteGame(admin.authorization, game.id);

		assert.equal(response.status, 204);
		await game.reload();
		assert.equal(game.isActive, false);
		const fetched = await getGameByCode(admin, game.code);
		assert.equal(fetched.status, 404);
		assert.equal(fetched.body.type, "GAME_NOT_FOUND");
	});

	void it("records the deactivation in the audit log", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();

		await deleteGame(admin.authorization, game.id).expect(204);

		const entry = await auditEntry("game_deactivated", game.id);
		assert.equal(entry.userId, admin.user.id);
		assert.equal(entry.targetType, "game");
	});

	void it("treats hard values other than true as a plain deactivation", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();

		await deleteGame(admin.authorization, game.id, "?hard=false").expect(
			204
		);

		await game.reload();
		assert.equal(game.isActive, false);
	});

	void it("hard deletes the game and its row when hard=true", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();

		const response = await deleteGame(
			admin.authorization,
			game.id,
			"?hard=true"
		);

		assert.equal(response.status, 204);
		assert.equal(await Game.count({ where: { id: game.id } }), 0);
		const entry = await auditEntry("game_deleted", game.id);
		assert.equal(entry.userId, admin.user.id);
	});

	void it("hard deletes a game that was already deactivated", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame({ isActive: false });

		await deleteGame(admin.authorization, game.id, "?hard=true").expect(
			204
		);

		assert.equal(await Game.count({ where: { id: game.id } }), 0);
	});

	void it("answers 404 GAME_NOT_FOUND when hard deleting an unknown game", async () => {
		const admin = await createUserWithSession("admin");

		const response = await deleteGame(
			admin.authorization,
			randomUUID(),
			"?hard=true"
		);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GAME_NOT_FOUND");
	});

	for (const [label, seed] of Object.entries(USER_DATA_SEEDS)) {
		void it(`answers 409 GAME_IN_USE and keeps the game when hard deleting a game with ${label}`, async () => {
			const admin = await createUserWithSession("admin");
			const game = await createGame();
			await seed(game.id);

			const response = await deleteGame(
				admin.authorization,
				game.id,
				"?hard=true"
			);

			assert.equal(response.status, 409);
			assert.equal(response.body.type, "GAME_IN_USE");
			assert.equal(await Game.count({ where: { id: game.id } }), 1);
		});
	}

	void it("does not delete the catalog data of a game in use when it answers 409", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();
		const platform = await createPlatform();
		const genre = await createGenre();
		await GameGenre.create({ gameId: game.id, genreId: genre.id });
		await GamePlatform.create({ gameId: game.id, platformId: platform.id });
		await createGameScore(game.id, scoreSource, 80);
		await createGameTime(game.id, "hltb", 12);
		await GameExternal.create({
			gameId: game.id,
			source: "rawg",
			externalId: uniqueSuffix()
		});
		const owner = await createUser();
		await createBacklog(owner.id, game.id, platform.id);

		const response = await deleteGame(
			admin.authorization,
			game.id,
			"?hard=true"
		);

		assert.equal(response.status, 409);
		assert.equal(await Game.count({ where: { id: game.id } }), 1);
		assert.equal(await GameGenre.count({ where: { gameId: game.id } }), 1);
		assert.equal(
			await GamePlatform.count({ where: { gameId: game.id } }),
			1
		);
		assert.equal(await GameScore.count({ where: { gameId: game.id } }), 1);
		assert.equal(await GameTime.count({ where: { gameId: game.id } }), 1);
		assert.equal(
			await GameExternal.count({ where: { gameId: game.id } }),
			1
		);
		assert.equal(await Backlog.count({ where: { gameId: game.id } }), 1);
		assert.equal(
			await AuditLog.count({
				where: { action: "game_deleted", targetId: game.id }
			}),
			0
		);
	});

	void it("answers 409 GAME_IN_USE when the game has variants", async () => {
		const admin = await createUserWithSession("admin");
		const parent = await createGame();
		const variant = await createGame();
		await variant.update({ parentGameId: parent.id });

		const response = await deleteGame(
			admin.authorization,
			parent.id,
			"?hard=true"
		);

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "GAME_IN_USE");
		assert.equal(await Game.count({ where: { id: parent.id } }), 1);
	});

	void it("hard deletes a game that only has reports and removes them", async () => {
		const admin = await createUserWithSession("admin");
		const reporter = await createUser();
		const game = await createGame();
		await GameReport.create({
			userId: reporter.id,
			gameId: game.id,
			message: "Wrong cover",
			status: "pending"
		});
		await GameReport.create({
			userId: reporter.id,
			gameId: game.id,
			message: "Missing score",
			category: "missing_score",
			status: "approved"
		});

		const response = await deleteGame(
			admin.authorization,
			game.id,
			"?hard=true"
		);

		assert.equal(response.status, 204);
		assert.equal(await Game.count({ where: { id: game.id } }), 0);
		assert.equal(await GameReport.count({ where: { gameId: game.id } }), 0);
	});

	void it("hard deletes a game that only has catalog data", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();
		const child = await createGame();
		const platform = await createPlatform();
		const genre = await createGenre();
		await GameGenre.create({ gameId: game.id, genreId: genre.id });
		await GamePlatform.create({ gameId: game.id, platformId: platform.id });
		await createGameScore(game.id, scoreSource, 80);
		await createGameTime(game.id, "hltb", 12);
		await GameExternal.create({
			gameId: game.id,
			source: "rawg",
			externalId: uniqueSuffix()
		});
		await CompilationItem.create({
			parentGameId: game.id,
			childGameId: child.id,
			position: 1
		});

		const response = await deleteGame(
			admin.authorization,
			game.id,
			"?hard=true"
		);

		assert.equal(response.status, 204);
		assert.equal(await Game.count({ where: { id: game.id } }), 0);
		assert.equal(await GameGenre.count({ where: { gameId: game.id } }), 0);
		assert.equal(
			await GamePlatform.count({ where: { gameId: game.id } }),
			0
		);
		assert.equal(await GameScore.count({ where: { gameId: game.id } }), 0);
		assert.equal(await GameTime.count({ where: { gameId: game.id } }), 0);
		assert.equal(
			await GameExternal.count({ where: { gameId: game.id } }),
			0
		);
		assert.equal(
			await CompilationItem.count({ where: { parentGameId: game.id } }),
			0
		);
		assert.equal(await Game.count({ where: { id: child.id } }), 1);
	});

	void it("answers 404 GAME_NOT_FOUND when deactivating an unknown game", async () => {
		const admin = await createUserWithSession("admin");

		const response = await deleteGame(admin.authorization, randomUUID());

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GAME_NOT_FOUND");
	});

	void it("rejects a malformed game id with 422 COMMON_SCHEMA_INVALID", async () => {
		const admin = await createUserWithSession("admin");

		const response = await deleteGame(admin.authorization, "not-a-uuid");

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});
});

void describe("POST /games/:id/reactivate", () => {
	void it("brings a deactivated game back to the catalog", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame({ isActive: false });
		assert.equal((await getGameByCode(admin, game.code)).status, 404);

		const response = await reactivateGame(admin.authorization, game.id);

		assert.equal(response.status, 204);
		await game.reload();
		assert.equal(game.isActive, true);
		assert.equal((await getGameByCode(admin, game.code)).status, 200);
	});

	void it("restores a game deactivated through DELETE", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();
		await deleteGame(admin.authorization, game.id).expect(204);

		await reactivateGame(admin.authorization, game.id).expect(204);

		assert.equal((await getGameByCode(admin, game.code)).status, 200);
	});

	void it("records the reactivation in the audit log", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame({ isActive: false });

		await reactivateGame(admin.authorization, game.id).expect(204);

		const entry = await auditEntry("game_reactivated", game.id);
		assert.equal(entry.userId, admin.user.id);
		assert.equal(entry.targetType, "game");
	});

	void it("keeps an already active game active", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();

		await reactivateGame(admin.authorization, game.id).expect(204);

		await game.reload();
		assert.equal(game.isActive, true);
	});

	void it("answers 404 GAME_NOT_FOUND for an unknown game", async () => {
		const admin = await createUserWithSession("admin");

		const response = await reactivateGame(
			admin.authorization,
			randomUUID()
		);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GAME_NOT_FOUND");
	});

	void it("rejects a malformed game id with 422 COMMON_SCHEMA_INVALID", async () => {
		const admin = await createUserWithSession("admin");

		const response = await reactivateGame(
			admin.authorization,
			"not-a-uuid"
		);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});
});

void describe("POST /games/:id/split", () => {
	async function createRichGame(authorization: string) {
		const [platform, genre] = await Promise.all([
			createPlatform(),
			createGenre()
		]);
		const created = await postGame(authorization, {
			title: uniqueTitle("Base Game"),
			platforms: [platform.code],
			genres: [genre.code],
			scores: [{ source: scoreSource, score: 90 }],
			times: [{ source: "hltb", duration: 20 }],
			externalIds: [{ source: "steam", externalId: uniqueSuffix() }]
		}).expect(201);
		return {
			game: created.body.data.game as GameBody,
			platform,
			genre
		};
	}

	for (const role of STAFF_ROLES) {
		void it(`lets a ${role} split a game into variants that inherit its data`, async () => {
			const staff = await createUserWithSession(role);
			const { game, platform, genre } = await createRichGame(
				staff.authorization
			);
			const pcTitle = uniqueTitle("Variant PC");
			const consoleTitle = uniqueTitle("Variant Console");

			const response = await splitGame(staff.authorization, game.id, {
				variants: [
					{ title: pcTitle, variant: "PC" },
					{ title: consoleTitle, variant: "Console" }
				]
			});

			assert.equal(response.status, 200);
			const [first, second] = response.body.data.games as GameBody[];
			assert.equal(first!.id, game.id);
			assert.equal(first!.title, pcTitle);
			assert.equal(first!.variant, "PC");
			assert.notEqual(second!.id, game.id);
			assert.equal(second!.title, consoleTitle);
			assert.equal(second!.variant, "Console");
			assert.match(second!.code, /^variant-console-[a-z0-9]+$/);
			for (const variant of [first!, second!]) {
				assert.deepEqual(
					variant.platforms.map(entry => entry.code),
					[platform.code]
				);
				assert.deepEqual(
					variant.genres.map(entry => entry.code),
					[genre.code]
				);
				assert.deepEqual(variant.scores, [
					{ source: scoreSource, score: 90 }
				]);
				assert.deepEqual(variant.times, [
					{ source: "hltb", duration: 20 }
				]);
			}
		});
	}

	void it("copies the external ids to every new variant", async () => {
		const admin = await createUserWithSession("admin");
		const { game } = await createRichGame(admin.authorization);
		const original = await GameExternal.findAll({
			where: { gameId: game.id }
		});

		const response = await splitGame(admin.authorization, game.id, {
			variants: [
				{ title: uniqueTitle("Split A"), variant: "A" },
				{ title: uniqueTitle("Split B"), variant: "B" },
				{ title: uniqueTitle("Split C"), variant: "C" }
			]
		});

		assert.equal(response.status, 200);
		const variants = response.body.data.games as GameBody[];
		assert.equal(variants.length, 3);
		for (const variant of variants) {
			const stored = await GameExternal.findAll({
				where: { gameId: variant.id }
			});
			assert.deepEqual(
				stored.map(entry => entry.externalId),
				original.map(entry => entry.externalId)
			);
		}
	});

	void it("serves the renamed original and the new variant from the catalog", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();
		const [firstTitle, secondTitle] = [
			uniqueTitle("One"),
			uniqueTitle("Two")
		];

		const response = await splitGame(admin.authorization, game.id, {
			variants: [
				{ title: firstTitle, variant: "1" },
				{ title: secondTitle, variant: "2" }
			]
		});
		assert.equal(response.status, 200);

		const [first, second] = response.body.data.games as GameBody[];
		assert.equal(
			(await getGameByCode(admin, first!.code)).body.data.game.id,
			game.id
		);
		assert.equal((await getGameByCode(admin, second!.code)).status, 200);
		assert.equal((await getGameByCode(admin, game.code)).status, 404);
	});

	void it("records the split in the audit log", async () => {
		const moderator = await createUserWithSession("moderator");
		const game = await createGame();

		await splitGame(moderator.authorization, game.id, {
			variants: [
				{ title: uniqueTitle("Log A"), variant: "A" },
				{ title: uniqueTitle("Log B"), variant: "B" }
			]
		}).expect(200);

		const entry = await auditEntry("game_split", game.id);
		assert.equal(entry.userId, moderator.user.id);
	});

	void it("rejects variants whose titles collapse to the same slug with 400 GAME_SPLIT_INVALID", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();
		const title = uniqueTitle("Same Slug");

		const response = await splitGame(admin.authorization, game.id, {
			variants: [
				{ title, variant: "A" },
				{ title: title.toUpperCase(), variant: "B" }
			]
		});

		assert.equal(response.status, 400);
		assert.equal(response.body.type, "GAME_SPLIT_INVALID");
		await game.reload();
		assert.equal(game.variant, null);
	});

	void it("rejects a variant title that cannot become a slug with 400 GAME_SPLIT_INVALID", async () => {
		const admin = await createUserWithSession("admin");
		const game = await createGame();

		const response = await splitGame(admin.authorization, game.id, {
			variants: [
				{ title: "!!!", variant: "A" },
				{ title: uniqueTitle(), variant: "B" }
			]
		});

		assert.equal(response.status, 400);
		assert.equal(response.body.type, "GAME_SPLIT_INVALID");
	});

	void it("answers 409 GAME_UNIQUE_CONSTRAINT when a variant title collides with another game and rolls back", async () => {
		const admin = await createUserWithSession("admin");
		const [game, other] = await Promise.all([createGame(), createGame()]);

		const response = await splitGame(admin.authorization, game.id, {
			variants: [
				{ title: uniqueTitle("Fresh"), variant: "A" },
				{ title: other.title, variant: "B" }
			]
		});

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "GAME_UNIQUE_CONSTRAINT");
		await game.reload();
		assert.equal(game.variant, null);
	});

	void it("answers 404 GAME_NOT_FOUND for an unknown or deactivated game", async () => {
		const admin = await createUserWithSession("admin");
		const inactive = await createGame({ isActive: false });
		const body = {
			variants: [
				{ title: uniqueTitle(), variant: "A" },
				{ title: uniqueTitle(), variant: "B" }
			]
		};

		for (const id of [randomUUID(), inactive.id]) {
			const response = await splitGame(admin.authorization, id, body);
			assert.equal(response.status, 404);
			assert.equal(response.body.type, "GAME_NOT_FOUND");
		}
	});

	const invalidBodies: [string, Record<string, unknown>][] = [
		["a single variant", { variants: [{ title: "Only", variant: "A" }] }],
		["no variants", { variants: [] }],
		[
			"more than ten variants",
			{
				variants: Array.from({ length: 11 }, (_, index) => ({
					title: `Many ${index}`,
					variant: `V${index}`
				}))
			}
		],
		[
			"a variant without a label",
			{ variants: [{ title: "A" }, { title: "B", variant: "B" }] }
		],
		["an unknown field", { variants: [], force: true }]
	];

	for (const [label, body] of invalidBodies) {
		void it(`rejects ${label} with 422 COMMON_SCHEMA_INVALID`, async () => {
			const admin = await createUserWithSession("admin");
			const game = await createGame();

			const response = await splitGame(
				admin.authorization,
				game.id,
				body
			);

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		});
	}
});

void describe("PUT /games/:id/compilation-items", () => {
	function linkItem(gameId: string) {
		return { mode: "link", gameId };
	}

	function createItem(title: string) {
		return { mode: "create", title };
	}

	interface CompilationItemBody {
		position: number;
		childGameId: string;
		childGame: GameBody | null;
	}

	for (const role of STAFF_ROLES) {
		void it(`lets a ${role} mark a game as a compilation of linked and new games`, async () => {
			const staff = await createUserWithSession(role);
			const parent = await createGame();
			const existing = await createGame();
			const newTitle = uniqueTitle("Brand New Part");

			const response = await putCompilationItems(
				staff.authorization,
				parent.id,
				{
					items: [linkItem(existing.id), createItem(newTitle)]
				}
			);

			assert.equal(response.status, 200);
			const items = response.body.data.items as CompilationItemBody[];
			assert.deepEqual(
				items.map(item => item.position),
				[0, 1]
			);
			assert.equal(items[0]!.childGameId, existing.id);
			assert.equal(items[1]!.childGame?.title, newTitle);
			assert.equal(items[1]!.childGame?.isCompilation, false);

			await parent.reload();
			assert.equal(parent.isCompilation, true);
			const fetched = await getGameByCode(staff, parent.code);
			assert.equal(fetched.body.data.game.isCompilation, true);
			assert.equal(fetched.body.data.game.compilationItems.length, 2);
		});
	}

	void it("makes new parts inherit the platforms, genres, scores and times of the compilation", async () => {
		const admin = await createUserWithSession("admin");
		const [platform, genre] = await Promise.all([
			createPlatform(),
			createGenre()
		]);
		const created = await postGame(admin.authorization, {
			title: uniqueTitle("Collection"),
			platforms: [platform.code],
			genres: [genre.code],
			scores: [{ source: scoreSource, score: 75 }],
			times: [{ source: "hltb", duration: 8 }]
		}).expect(201);

		const response = await putCompilationItems(
			admin.authorization,
			created.body.data.game.id,
			{ items: [createItem(uniqueTitle("Inherited Part"))] }
		);

		assert.equal(response.status, 200);
		const part = (response.body.data.items as CompilationItemBody[])[0]!
			.childGame!;
		assert.deepEqual(
			part.platforms.map(entry => entry.code),
			[platform.code]
		);
		assert.deepEqual(
			part.genres.map(entry => entry.code),
			[genre.code]
		);
		assert.deepEqual(part.scores, [{ source: scoreSource, score: 75 }]);
		assert.deepEqual(part.times, [{ source: "hltb", duration: 8 }]);
	});

	void it("replaces the previous items on a second call and keeps the old parts as games", async () => {
		const admin = await createUserWithSession("admin");
		const parent = await createGame();
		const [first, second] = await Promise.all([createGame(), createGame()]);
		await putCompilationItems(admin.authorization, parent.id, {
			items: [linkItem(first.id)]
		}).expect(200);

		const response = await putCompilationItems(
			admin.authorization,
			parent.id,
			{
				items: [linkItem(second.id)]
			}
		);

		assert.equal(response.status, 200);
		assert.deepEqual(
			(response.body.data.items as CompilationItemBody[]).map(
				item => item.childGameId
			),
			[second.id]
		);
		assert.equal(
			await CompilationItem.count({ where: { parentGameId: parent.id } }),
			1
		);
		assert.equal((await getGameByCode(admin, first.code)).status, 200);
	});

	void it("records the change in the audit log", async () => {
		const moderator = await createUserWithSession("moderator");
		const parent = await createGame();

		await putCompilationItems(moderator.authorization, parent.id, {
			items: [createItem(uniqueTitle("Logged Part"))]
		}).expect(200);

		const entry = await auditEntry("game_compilation_set", parent.id);
		assert.equal(entry.userId, moderator.user.id);
	});

	void it("rejects linking the compilation to itself with 400 GAME_COMPILATION_INVALID", async () => {
		const admin = await createUserWithSession("admin");
		const parent = await createGame();

		const response = await putCompilationItems(
			admin.authorization,
			parent.id,
			{
				items: [linkItem(parent.id)]
			}
		);

		assert.equal(response.status, 400);
		assert.equal(response.body.type, "GAME_COMPILATION_INVALID");
		await parent.reload();
		assert.equal(parent.isCompilation, false);
	});

	void it("rejects the same game linked twice with 400 GAME_COMPILATION_INVALID", async () => {
		const admin = await createUserWithSession("admin");
		const [parent, child] = await Promise.all([createGame(), createGame()]);

		const response = await putCompilationItems(
			admin.authorization,
			parent.id,
			{
				items: [linkItem(child.id), linkItem(child.id)]
			}
		);

		assert.equal(response.status, 400);
		assert.equal(response.body.type, "GAME_COMPILATION_INVALID");
	});

	void it("rejects new parts with the same slug with 400 GAME_COMPILATION_INVALID", async () => {
		const admin = await createUserWithSession("admin");
		const parent = await createGame();
		const title = uniqueTitle("Twin Part");

		const response = await putCompilationItems(
			admin.authorization,
			parent.id,
			{
				items: [createItem(title), createItem(title.toUpperCase())]
			}
		);

		assert.equal(response.status, 400);
		assert.equal(response.body.type, "GAME_COMPILATION_INVALID");
	});

	void it("rejects a new part title that cannot become a slug with 400 GAME_COMPILATION_INVALID", async () => {
		const admin = await createUserWithSession("admin");
		const parent = await createGame();

		const response = await putCompilationItems(
			admin.authorization,
			parent.id,
			{
				items: [createItem("!!!")]
			}
		);

		assert.equal(response.status, 400);
		assert.equal(response.body.type, "GAME_COMPILATION_INVALID");
	});

	void it("answers 409 GAME_UNIQUE_CONSTRAINT when a new part collides with an existing game and keeps the old items", async () => {
		const admin = await createUserWithSession("admin");
		const [parent, kept, taken] = await Promise.all([
			createGame(),
			createGame(),
			createGame()
		]);
		await putCompilationItems(admin.authorization, parent.id, {
			items: [linkItem(kept.id)]
		}).expect(200);

		const response = await putCompilationItems(
			admin.authorization,
			parent.id,
			{
				items: [createItem(taken.title)]
			}
		);

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "GAME_UNIQUE_CONSTRAINT");
		const stored = await CompilationItem.findAll({
			where: { parentGameId: parent.id }
		});
		assert.deepEqual(
			stored.map(item => item.childGameId),
			[kept.id]
		);
	});

	void it("answers 404 GAME_NOT_FOUND when a linked game is unknown or deactivated", async () => {
		const admin = await createUserWithSession("admin");
		const parent = await createGame();
		const inactive = await createGame({ isActive: false });

		for (const gameId of [randomUUID(), inactive.id]) {
			const response = await putCompilationItems(
				admin.authorization,
				parent.id,
				{ items: [linkItem(gameId)] }
			);
			assert.equal(response.status, 404);
			assert.equal(response.body.type, "GAME_NOT_FOUND");
		}
		await parent.reload();
		assert.equal(parent.isCompilation, false);
	});

	void it("answers 404 GAME_NOT_FOUND for an unknown or deactivated compilation", async () => {
		const admin = await createUserWithSession("admin");
		const inactive = await createGame({ isActive: false });
		const body = { items: [createItem(uniqueTitle())] };

		for (const id of [randomUUID(), inactive.id]) {
			const response = await putCompilationItems(
				admin.authorization,
				id,
				body
			);
			assert.equal(response.status, 404);
			assert.equal(response.body.type, "GAME_NOT_FOUND");
		}
	});

	const invalidBodies: [string, Record<string, unknown>][] = [
		["an empty item list", { items: [] }],
		["an unknown mode", { items: [{ mode: "copy", title: "x" }] }],
		["a link without a game id", { items: [{ mode: "link" }] }],
		[
			"a link with a malformed game id",
			{ items: [{ mode: "link", gameId: "nope" }] }
		],
		["a create without a title", { items: [{ mode: "create" }] }],
		[
			"more than fifty items",
			{
				items: Array.from({ length: 51 }, (_, index) => ({
					mode: "create",
					title: `Part ${index}`
				}))
			}
		],
		[
			"an unknown field",
			{ items: [{ mode: "create", title: "x" }], force: true }
		]
	];

	for (const [label, body] of invalidBodies) {
		void it(`rejects ${label} with 422 COMMON_SCHEMA_INVALID`, async () => {
			const admin = await createUserWithSession("admin");
			const parent = await createGame();

			const response = await putCompilationItems(
				admin.authorization,
				parent.id,
				body
			);

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		});
	}
});

void describe("DELETE /games/:id/compilation-items", () => {
	for (const role of STAFF_ROLES) {
		void it(`lets a ${role} unmark a compilation while keeping its parts as games`, async () => {
			const staff = await createUserWithSession(role);
			const [parent, child] = await Promise.all([
				createGame(),
				createGame()
			]);
			await putCompilationItems(staff.authorization, parent.id, {
				items: [{ mode: "link", gameId: child.id }]
			}).expect(200);

			const response = await deleteCompilationItems(
				staff.authorization,
				parent.id
			);

			assert.equal(response.status, 204);
			await parent.reload();
			assert.equal(parent.isCompilation, false);
			assert.equal(
				await CompilationItem.count({
					where: { parentGameId: parent.id }
				}),
				0
			);
			const fetched = await getGameByCode(staff, parent.code);
			assert.equal(fetched.body.data.game.isCompilation, false);
			assert.deepEqual(fetched.body.data.game.compilationItems, []);
			assert.equal((await getGameByCode(staff, child.code)).status, 200);
		});
	}

	void it("records the change in the audit log", async () => {
		const moderator = await createUserWithSession("moderator");
		const parent = await createGame();

		await deleteCompilationItems(moderator.authorization, parent.id).expect(
			204
		);

		const entry = await auditEntry("game_compilation_cleared", parent.id);
		assert.equal(entry.userId, moderator.user.id);
	});

	void it("answers 404 GAME_NOT_FOUND for an unknown or deactivated game", async () => {
		const admin = await createUserWithSession("admin");
		const inactive = await createGame({ isActive: false });

		for (const id of [randomUUID(), inactive.id]) {
			const response = await deleteCompilationItems(
				admin.authorization,
				id
			);
			assert.equal(response.status, 404);
			assert.equal(response.body.type, "GAME_NOT_FOUND");
		}
	});

	void it("rejects a malformed game id with 422 COMMON_SCHEMA_INVALID", async () => {
		const admin = await createUserWithSession("admin");

		const response = await deleteCompilationItems(
			admin.authorization,
			"not-a-uuid"
		);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});
});
