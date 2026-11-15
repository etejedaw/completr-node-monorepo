import "./rewind-today-env.setup";

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

import { QueryTypes } from "sequelize";

import { AuditLog } from "../../src/audit/audit.model";
import { sequelize } from "../../src/database/sequelize.database";
import { PremiumGrant } from "../../src/premium-access/premium-grant.model";
import { type RewindPremiumAccessKind } from "../../src/rewind/rewind.constants";
import { Rewind } from "../../src/rewind/rewind.model";
import { RewindEdition } from "../../src/rewind-editions/rewind-edition.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { truncateAllTables, useTestDatabase } from "../helpers/database.helper";
import { eventually } from "../helpers/eventually.helper";
import {
	createGame,
	createPlatform,
	createUser
} from "../helpers/factories.helper";
import {
	addRun,
	EDITION_QUOTA,
	findRewindRow,
	generate,
	mockAiRecap,
	mockPremiumStats,
	openRewindEdition2026,
	readRewind,
	regenerationOf,
	signUpOn
} from "./rewind-generation.helper";

useTestDatabase();

beforeEach(truncateAllTables);

const EDITION_PAYLOAD = {
	year: 2026,
	opensAt: "2026-12-01",
	closesAt: "2027-01-31",
	graceStartsAt: "2027-01-01",
	graceEndsAt: "2027-01-07",
	design: "2026",
	premiumRegenerations: 3,
	giftRegenerations: 1
};

const { year: _year, ...UPDATE_PAYLOAD } = EDITION_PAYLOAD;

type Admin = Awaited<ReturnType<typeof createUserWithSession>>;

function auditEntry(action: string, targetId: string) {
	return eventually(async () => {
		const entry = await AuditLog.findOne({ where: { action, targetId } });
		assert.ok(entry, `no audit entry ${action} for ${targetId}`);
		return entry;
	});
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function grantFeature(
	userId: string,
	feature: "rewind.premium" | "*",
	expiresAt = new Date(Date.now() + ONE_DAY_MS)
) {
	return PremiumGrant.create({ userId, feature, expiresAt });
}

async function createOwnerWith(
	aiAccess: RewindPremiumAccessKind | null,
	username?: string
) {
	const user = await createUser({
		...(username ? { username } : {}),
		role: aiAccess === "premium" ? "premium" : "user"
	});
	if (aiAccess === "gift") await grantFeature(user.id, "rewind.premium");
	return user;
}

function storeRewindOf(
	userId: string,
	year: number,
	accessKind: RewindPremiumAccessKind | null,
	regenerationsLeft: number
) {
	return Rewind.create({
		userId,
		year,
		language: "en",
		generatedAt: new Date("2026-12-02T10:00:00.000Z"),
		premiumAccessKind: accessKind,
		regenerationsLeft
	});
}

async function storeRewindFor(
	year: number,
	accessKind: RewindPremiumAccessKind | null,
	regenerationsLeft: number,
	username?: string
) {
	const user = await createOwnerWith(accessKind, username);
	return storeRewindOf(user.id, year, accessKind, regenerationsLeft);
}

function patchRewind(admin: Admin, id: string, body: unknown) {
	return api()
		.patch(`/admin/rewinds/${id}`)
		.set("Authorization", admin.authorization)
		.send(body as object);
}

function listRewinds(admin: Admin, query: string) {
	return api()
		.get(`/admin/rewinds?${query}`)
		.set("Authorization", admin.authorization);
}

void describe("admin Rewind permissions", () => {
	void it("hides every route from anonymous users and non-admin roles", async () => {
		const rewind = await storeRewindFor(2026, null, 0);
		const roles = ["user", "premium", "moderator"] as const;
		for (const role of roles) {
			const account = await createUserWithSession(role);
			const calls = [
				api().get("/admin/rewind/editions"),
				api().post("/admin/rewind/editions").send(EDITION_PAYLOAD),
				api().put("/admin/rewind/editions/2026").send(UPDATE_PAYLOAD),
				api().get("/admin/rewinds?year=2026"),
				api()
					.patch(`/admin/rewinds/${rewind.id}`)
					.send({ regenerationsLeft: 9 })
			];
			for (const call of calls) {
				const response = await call.set(
					"Authorization",
					account.authorization
				);
				assert.equal(response.status, 404, `${role} ${call.url}`);
			}
		}
		const anonymous = await api().get("/admin/rewind/editions");
		assert.ok([401, 404].includes(anonymous.status));
		assert.equal(await RewindEdition.count(), 0);
		await rewind.reload();
		assert.equal(rewind.regenerationsLeft, 0);
	});
});

void describe("GET /admin/rewinds", () => {
	void it("lists the rewinds of a year with their access kind, newest first", async () => {
		const admin = await createUserWithSession("admin");
		const premium = await storeRewindFor(2026, "premium", 3, "alice_p");
		await Rewind.update(
			{ generatedAt: new Date("2026-12-03T10:00:00.000Z") },
			{ where: { id: premium.id } }
		);
		const none = await storeRewindFor(2026, null, 0, "bob_n");
		await Rewind.update(
			{ graceUsed: true, frozenAt: new Date("2027-02-01T00:00:00.000Z") },
			{ where: { id: none.id } }
		);
		await storeRewindFor(2025, "gift", 1, "carol_g");

		const response = await listRewinds(admin, "year=2026");

		assert.equal(response.status, 200);
		assert.equal(response.body.data.total, 2);
		assert.deepEqual(Object.keys(response.body.data).sort(), [
			"rewinds",
			"total"
		]);
		assert.deepEqual(response.body.data.rewinds, [
			{
				id: premium.id,
				year: 2026,
				user: { id: premium.userId, username: "alice_p" },
				accessKind: "premium",
				aiAccess: "premium",
				regenerationsLeft: 3,
				graceUsed: false,
				generatedAt: "2026-12-03T10:00:00.000Z",
				frozenAt: null
			},
			{
				id: none.id,
				year: 2026,
				user: { id: none.userId, username: "bob_n" },
				accessKind: "none",
				aiAccess: "none",
				regenerationsLeft: 0,
				graceUsed: true,
				generatedAt: "2026-12-02T10:00:00.000Z",
				frozenAt: "2027-02-01T00:00:00.000Z"
			}
		]);
	});

	void it("reports the current AI access of each owner, not the access stored with the rewind", async () => {
		const admin = await createUserWithSession("admin");
		const lostGift = await createOwnerWith(null, "lost_gift");
		await storeRewindOf(lostGift.id, 2026, "gift", 1);
		const expired = await createOwnerWith(null, "expired_gift");
		await grantFeature(
			expired.id,
			"rewind.premium",
			new Date(Date.now() - ONE_DAY_MS)
		);
		await storeRewindOf(expired.id, 2026, null, 0);
		const gifted = await createOwnerWith("gift", "fresh_gift");
		await storeRewindOf(gifted.id, 2026, null, 0);
		await storeRewindOf(gifted.id, 2025, null, 0);
		const fullGrant = await createOwnerWith(null, "full_grant");
		await grantFeature(fullGrant.id, "*");
		await storeRewindOf(fullGrant.id, 2026, "gift", 1);
		const premiumRole = await createOwnerWith("premium", "premium_role");
		await storeRewindOf(premiumRole.id, 2026, null, 0);

		const response = await listRewinds(admin, "limit=100");

		assert.equal(response.status, 200);
		const accessByRow = response.body.data.rewinds
			.map(
				(row: {
					year: number;
					user: { username: string };
					accessKind: string;
					aiAccess: string;
				}) =>
					`${row.user.username}/${row.year}:${row.accessKind}->${row.aiAccess}`
			)
			.sort();
		assert.deepEqual(accessByRow, [
			"expired_gift/2026:none->none",
			"fresh_gift/2025:none->gift",
			"fresh_gift/2026:none->gift",
			"full_grant/2026:gift->premium",
			"lost_gift/2026:gift->none",
			"premium_role/2026:none->premium"
		]);
	});

	void it("searches by username ignoring case and accents, and combines it with the year", async () => {
		const admin = await createUserWithSession("admin");
		await storeRewindFor(2026, "gift", 1, "Marta_Plays");
		await storeRewindFor(2026, null, 0, "otro_jugador");
		await storeRewindFor(2025, null, 0, "marta_2025");

		const response = await listRewinds(
			admin,
			"year=2026&search=%20MARTA%20"
		);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.total, 1);
		assert.equal(
			response.body.data.rewinds[0].user.username,
			"Marta_Plays"
		);
		const allYears = await listRewinds(admin, "search=marta");
		assert.equal(allYears.body.data.total, 2);
		const nothing = await listRewinds(admin, "year=2026&search=zzzz");
		assert.equal(nothing.body.data.total, 0);
		assert.deepEqual(nothing.body.data.rewinds, []);
	});

	void it("treats SQL-looking and wildcard searches as plain text", async () => {
		const admin = await createUserWithSession("admin");
		await storeRewindFor(2026, null, 0, "plain_user");
		const hostile = [
			"'%3B%20DROP%20TABLE%20%22Rewinds%22%3B--",
			"%25",
			"_"
		];
		for (const q of hostile) {
			const response = await listRewinds(admin, `year=2026&search=${q}`);
			assert.equal(response.status, 200, q);
		}
		assert.equal(await Rewind.count(), 1);
	});

	void it("paginates with limit and offset, defaulting to 50 rows, without repeating or skipping rows", async () => {
		const admin = await createUserWithSession("admin");
		const users = await Promise.all(
			Array.from({ length: 53 }, () => createUser())
		);
		await Rewind.bulkCreate(
			users.map((user, index) => ({
				userId: user.id,
				year: 2026,
				language: "en",
				generatedAt: new Date(Date.UTC(2026, 11, 2, 0, index))
			}))
		);

		const first = await listRewinds(admin, "year=2026");
		const second = await listRewinds(admin, "year=2026&offset=50");
		const beyond = await listRewinds(admin, "year=2026&offset=100");

		assert.equal(first.body.data.total, 53);
		assert.equal(first.body.data.rewinds.length, 50);
		assert.equal(second.body.data.rewinds.length, 3);
		const small = await listRewinds(admin, "year=2026&limit=20&offset=40");
		assert.equal(small.body.data.rewinds.length, 13);
		assert.equal(small.body.data.total, 53);
		assert.deepEqual(beyond.body.data.rewinds, []);
		const ids = [
			...first.body.data.rewinds,
			...second.body.data.rewinds
		].map((row: { id: string }) => row.id);
		assert.equal(new Set(ids).size, 53);
	});

	void it("rejects garbage in the query string", async () => {
		const admin = await createUserWithSession("admin");
		const garbage = [
			"year=abc",
			"year=1",
			"year=2026&offset=-1",
			"year=2026&offset=1.5",
			"year=2026&offset=abc",
			"year=2026&limit=0",
			"year=2026&limit=101",
			"year=2026&limit=abc",
			"year=2026&page=2",
			"year=2026&search=" + "x".repeat(101),
			"year=2026&year=2025&year=2024"
		];
		for (const query of garbage) {
			const response = await listRewinds(admin, query);
			assert.equal(response.status, 422, query);
		}
	});
});

void describe("PATCH /admin/rewinds/:id", () => {
	void it("sets the regenerations left, answers the item and audits it", async () => {
		const admin = await createUserWithSession("admin");
		const rewind = await storeRewindFor(2026, "gift", 1, "patch_me");

		const response = await patchRewind(admin, rewind.id, {
			regenerationsLeft: 6
		});

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.rewind, {
			id: rewind.id,
			year: 2026,
			user: { id: rewind.userId, username: "patch_me" },
			accessKind: "gift",
			aiAccess: "gift",
			regenerationsLeft: 6,
			graceUsed: false,
			generatedAt: "2026-12-02T10:00:00.000Z",
			frozenAt: null
		});
		await rewind.reload();
		assert.equal(rewind.regenerationsLeft, 6);
		await auditEntry("rewind_edited", rewind.id);
	});

	void it("accepts zero and keeps the same value after a double submit", async () => {
		const admin = await createUserWithSession("admin");
		const rewind = await storeRewindFor(2026, "premium", 4);

		const responses = await Promise.all([
			patchRewind(admin, rewind.id, { regenerationsLeft: 0 }),
			patchRewind(admin, rewind.id, { regenerationsLeft: 0 })
		]);

		assert.ok(responses.every(response => response.status === 200));
		await rewind.reload();
		assert.equal(rewind.regenerationsLeft, 0);
	});

	void it("rejects garbage bodies and ids", async () => {
		const admin = await createUserWithSession("admin");
		const rewind = await storeRewindFor(2026, "premium", 4);
		const bodies: unknown[] = [
			{},
			{ regenerationsLeft: -1 },
			{ regenerationsLeft: 1.5 },
			{ regenerationsLeft: "3" },
			{ regenerationsLeft: null },
			{ regenerationsLeft: 1_000_000 },
			{ regenerationsLeft: 2, graceUsed: false },
			[]
		];
		for (const body of bodies) {
			const response = await patchRewind(admin, rewind.id, body);
			assert.equal(response.status, 422, JSON.stringify(body));
		}
		const badId = await patchRewind(admin, "not-a-uuid", {
			regenerationsLeft: 1
		});
		assert.equal(badId.status, 422);
		await rewind.reload();
		assert.equal(rewind.regenerationsLeft, 4);
	});

	void it("answers 404 for a rewind that does not exist", async () => {
		const admin = await createUserWithSession("admin");
		const response = await patchRewind(
			admin,
			"3f6f1c2e-8a0e-4c27-9d6a-0b1c2d3e4f5a",
			{ regenerationsLeft: 2 }
		);
		assert.equal(response.status, 404);
		assert.equal(response.body.type, "REWIND_NOT_FOUND");
	});

	void it("answers 409 REWIND_NO_AI_ACCESS to owners without access and changes nothing, even on a double submit", async () => {
		const admin = await createUserWithSession("admin");
		const lostPremium = await storeRewindFor(2026, null, 0);
		await Rewind.update(
			{ premiumAccessKind: "premium", regenerationsLeft: 2 },
			{ where: { id: lostPremium.id } }
		);
		const expired = await createOwnerWith(null);
		await grantFeature(
			expired.id,
			"rewind.premium",
			new Date(Date.now() - ONE_DAY_MS)
		);
		const expiredRewind = await storeRewindOf(expired.id, 2026, null, 0);

		const responses = await Promise.all([
			patchRewind(admin, lostPremium.id, { regenerationsLeft: 5 }),
			patchRewind(admin, lostPremium.id, { regenerationsLeft: 5 }),
			patchRewind(admin, expiredRewind.id, { regenerationsLeft: 1 })
		]);

		for (const response of responses) {
			assert.equal(response.status, 409);
			assert.equal(response.body.type, "REWIND_NO_AI_ACCESS");
		}
		await lostPremium.reload();
		assert.equal(lostPremium.regenerationsLeft, 2);
		await expiredRewind.reload();
		assert.equal(expiredRewind.regenerationsLeft, 0);
		await delay(100);
		assert.equal(
			await AuditLog.count({ where: { action: "rewind_edited" } }),
			0
		);
	});

	void it("lets the admin give rolls to owners with a gift, a full grant or the premium role", async () => {
		const admin = await createUserWithSession("admin");
		const gift = await storeRewindFor(2026, null, 0);
		await grantFeature(gift.userId, "rewind.premium");
		const fullGrant = await storeRewindFor(2026, null, 0);
		await grantFeature(fullGrant.userId, "*");
		const premiumOwner = await createOwnerWith("premium");
		const premium = await storeRewindOf(premiumOwner.id, 2026, null, 0);

		const cases = [
			{ rewind: gift, aiAccess: "gift" },
			{ rewind: fullGrant, aiAccess: "premium" },
			{ rewind: premium, aiAccess: "premium" }
		];
		for (const { rewind, aiAccess } of cases) {
			const response = await patchRewind(admin, rewind.id, {
				regenerationsLeft: 2
			});
			assert.equal(response.status, 200, aiAccess);
			assert.equal(response.body.data.rewind.aiAccess, aiAccess);
			assert.equal(response.body.data.rewind.accessKind, "none");
			assert.equal(response.body.data.rewind.regenerationsLeft, 2);
			await rewind.reload();
			assert.equal(rewind.regenerationsLeft, 2);
		}
	});

	void it("answers 409 when the owner loses the access between the listing and the save", async () => {
		const admin = await createUserWithSession("admin");
		const rewind = await storeRewindFor(2026, "gift", 1, "about_to_lose");
		const listed = await listRewinds(admin, "year=2026");
		assert.equal(listed.body.data.rewinds[0].aiAccess, "gift");

		await PremiumGrant.destroy({ where: { userId: rewind.userId } });
		const response = await patchRewind(admin, rewind.id, {
			regenerationsLeft: 4
		});

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "REWIND_NO_AI_ACCESS");
		await rewind.reload();
		assert.equal(rewind.regenerationsLeft, 1);
	});

	void it("waits for a spend in progress on the same row instead of overwriting it", async () => {
		const admin = await createUserWithSession("admin");
		const rewind = await storeRewindFor(2026, "premium", 3);
		let patch: ReturnType<typeof patchRewind> | undefined;
		await sequelize.transaction(async transaction => {
			const locked = await Rewind.findByPk(rewind.id, {
				lock: transaction.LOCK.UPDATE,
				transaction
			});
			assert.ok(locked);
			patch = patchRewind(admin, rewind.id, { regenerationsLeft: 9 });
			await delay(250);
			const [stillThere] = await sequelize.query<{
				regenerationsLeft: number;
			}>(`SELECT "regenerationsLeft" FROM "Rewinds" WHERE "id" = :id`, {
				replacements: { id: rewind.id },
				transaction,
				type: QueryTypes.SELECT
			});
			assert.equal(stillThere?.regenerationsLeft, 3);
			await locked.update(
				{ regenerationsLeft: locked.regenerationsLeft - 1 },
				{ transaction }
			);
		});
		assert.ok(patch);
		const spendInProgress = await patch;

		assert.equal(spendInProgress.status, 200);
		assert.equal(spendInProgress.body.data.rewind.regenerationsLeft, 9);
		await rewind.reload();
		assert.equal(rewind.regenerationsLeft, 9);
	});

	void it("lets a concurrent spend land after the patch without losing either write", async () => {
		const admin = await createUserWithSession("admin");
		const rewind = await storeRewindFor(2026, "premium", 3);

		const [patch, spend] = await Promise.all([
			patchRewind(admin, rewind.id, { regenerationsLeft: 5 }),
			sequelize.transaction(async transaction => {
				const locked = await Rewind.findByPk(rewind.id, {
					lock: transaction.LOCK.UPDATE,
					transaction
				});
				assert.ok(locked);
				return locked.update(
					{ regenerationsLeft: locked.regenerationsLeft - 1 },
					{ transaction }
				);
			})
		]);

		assert.equal(patch.status, 200);
		assert.ok(spend);
		await rewind.reload();
		assert.ok([4, 5].includes(rewind.regenerationsLeft));
	});
});

void describe("admin rolls given before the first AI use", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	async function freeRewindOwnerWithGift() {
		const platform = await createPlatform();
		const game = await createGame({ title: "Hades" });
		await openRewindEdition2026();
		const player = await signUpOn("2025-01-15T00:00:00.000Z");
		await addRun(player, game, platform, { finishedAt: "2026-03-10" });
		const first = await generate(player, 2026).expect(201);
		await grantFeature(player.user.id, "rewind.premium");
		const row = await findRewindRow(player, 2026);
		assert.ok(row);
		assert.equal(row.premiumAccessKind, null);
		assert.equal(row.regenerationsLeft, 0);
		mockPremiumStats();
		mockAiRecap();
		return {
			player,
			row,
			regeneration: regenerationOf(first.body.data.generatedAt)
		};
	}

	void it("adds the edition quota on top of them instead of replacing them", async () => {
		const admin = await createUserWithSession("admin");
		const { player, row, regeneration } = await freeRewindOwnerWithGift();

		const patch = await patchRewind(admin, row.id, {
			regenerationsLeft: 3
		});
		assert.equal(patch.status, 200);
		assert.equal(patch.body.data.rewind.aiAccess, "gift");
		const owned = await readRewind(
			player.user.username,
			2026,
			player.authorization
		).expect(200);
		assert.equal(
			owned.body.data.ownerControls.regenerationsLeft,
			3 + EDITION_QUOTA
		);

		const regenerated = await generate(player, 2026, regeneration);

		assert.equal(regenerated.status, 200);
		assert.equal(
			regenerated.body.data.ownerControls.regenerationsLeft,
			3 + EDITION_QUOTA - 1
		);
		await row.reload();
		assert.equal(row.premiumAccessKind, "gift");
		assert.equal(row.regenerationsLeft, 3 + EDITION_QUOTA - 1);
	});

	void it("keeps the rolls of a patch that lands just before a concurrent first AI use", async () => {
		const admin = await createUserWithSession("admin");
		const { player, row, regeneration } = await freeRewindOwnerWithGift();
		let patch: ReturnType<typeof patchRewind> | undefined;
		let regenerated: ReturnType<typeof generate> | undefined;

		await sequelize.transaction(async transaction => {
			await Rewind.findByPk(row.id, {
				lock: transaction.LOCK.UPDATE,
				transaction
			});
			patch = patchRewind(admin, row.id, { regenerationsLeft: 3 });
			await delay(250);
			regenerated = generate(player, 2026, regeneration);
			await delay(250);
		});
		assert.ok(patch && regenerated);
		const [patched, generation] = await Promise.all([patch, regenerated]);

		assert.equal(patched.status, 200);
		assert.equal(generation.status, 200);
		await row.reload();
		assert.equal(row.premiumAccessKind, "gift");
		assert.equal(row.regenerationsLeft, 3 + EDITION_QUOTA - 1);
	});

	void it("never loses the rolls when patches and double clicks race in any order", async () => {
		const admin = await createUserWithSession("admin");
		const { player, row, regeneration } = await freeRewindOwnerWithGift();

		const [firstPatch, firstClick, secondClick, secondPatch] =
			await Promise.all([
				patchRewind(admin, row.id, { regenerationsLeft: 3 }),
				generate(player, 2026, regeneration),
				generate(player, 2026, regeneration),
				patchRewind(admin, row.id, { regenerationsLeft: 3 })
			]);

		assert.equal(firstPatch.status, 200);
		assert.equal(secondPatch.status, 200);
		assert.deepEqual(
			[firstClick.status, secondClick.status].sort(),
			[200, 409]
		);
		await row.reload();
		assert.equal(row.premiumAccessKind, "gift");
		assert.ok(
			[3, 3 + EDITION_QUOTA - 1].includes(row.regenerationsLeft),
			`unexpected ${row.regenerationsLeft} rolls`
		);
	});
});

void describe("admin Rewind inactive admin", () => {
	void it("does not let a deactivated admin through", async () => {
		const admin = await createUserWithSession("admin");
		await admin.user.update({ isActive: false });
		const response = await api()
			.get("/admin/rewind/editions")
			.set("Authorization", admin.authorization);
		assert.equal(response.status, 404);
	});
});
