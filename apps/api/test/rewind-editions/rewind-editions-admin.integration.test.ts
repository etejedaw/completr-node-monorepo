import "../rewind/rewind-today-env.setup";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { AuditLog } from "../../src/audit/audit.model";
import { PremiumGrant } from "../../src/premium-access/premium-grant.model";
import { type RewindPremiumAccessKind } from "../../src/rewind/rewind.constants";
import { Rewind } from "../../src/rewind/rewind.model";
import { RewindEdition } from "../../src/rewind-editions/rewind-edition.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { truncateAllTables, useTestDatabase } from "../helpers/database.helper";
import { eventually } from "../helpers/eventually.helper";
import { createRewindEdition, createUser } from "../helpers/factories.helper";

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

function putEdition(admin: Admin, year: number | string, body: unknown) {
	return api()
		.put(`/admin/rewind/editions/${year}`)
		.set("Authorization", admin.authorization)
		.send(body as object);
}

function postEdition(admin: Admin, body: unknown) {
	return api()
		.post("/admin/rewind/editions")
		.set("Authorization", admin.authorization)
		.send(body as object);
}

void describe("GET /admin/rewind/editions", () => {
	void it("lists editions with progress, generated count and the available designs", async () => {
		const admin = await createUserWithSession("admin");
		await createRewindEdition(2025, {
			opensAt: "2025-12-01",
			closesAt: "2026-01-31",
			graceStartsAt: "2026-01-01",
			graceEndsAt: "2026-01-07"
		});
		await createRewindEdition(2026, { premiumRegenerations: 4 });
		await createRewindEdition(2027);
		await storeRewindFor(2026, null, 0);
		await storeRewindFor(2026, "gift", 1);
		await storeRewindFor(2025, "premium", 2);

		const response = await api()
			.get("/admin/rewind/editions")
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.designs, ["2026"]);
		const [upcoming, latest, previous] = response.body.data.editions;
		assert.equal(upcoming.year, 2027);
		assert.equal(upcoming.status, "scheduled");
		assert.equal(upcoming.inProgress, false);
		assert.deepEqual(latest, {
			...EDITION_PAYLOAD,
			premiumRegenerations: 4,
			giftRegenerations: 0,
			frozenAt: null,
			status: "open",
			inProgress: true,
			generatedCount: 2
		});
		assert.equal(previous.year, 2025);
		assert.equal(previous.status, "closed");
		assert.equal(previous.inProgress, false);
		assert.equal(previous.generatedCount, 1);
	});

	void it("answers an empty list when there are no editions", async () => {
		const admin = await createUserWithSession("admin");
		const response = await api()
			.get("/admin/rewind/editions")
			.set("Authorization", admin.authorization);
		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.editions, []);
	});
});

void describe("POST /admin/rewind/editions", () => {
	void it("creates an edition and audits it", async () => {
		const admin = await createUserWithSession("admin");

		const response = await postEdition(admin, EDITION_PAYLOAD);

		assert.equal(response.status, 201);
		assert.deepEqual(response.body.data.edition, {
			...EDITION_PAYLOAD,
			frozenAt: null,
			status: "open",
			inProgress: true,
			generatedCount: 0
		});
		assert.equal(await RewindEdition.count({ where: { year: 2026 } }), 1);
		const entry = await auditEntry("rewind_edition_created", "2026");
		assert.equal(entry.userId, admin.user.id);
	});

	void it("rejects garbage input without storing anything", async () => {
		const admin = await createUserWithSession("admin");
		const garbage: Record<string, unknown>[] = [
			{},
			{ ...EDITION_PAYLOAD, year: "2026" },
			{ ...EDITION_PAYLOAD, year: 20.5 },
			{ ...EDITION_PAYLOAD, year: 1 },
			{ ...EDITION_PAYLOAD, year: 99999 },
			{ ...EDITION_PAYLOAD, opensAt: "2026-02-30" },
			{ ...EDITION_PAYLOAD, opensAt: "01/12/2026" },
			{ ...EDITION_PAYLOAD, closesAt: "2027-01-31T00:00:00Z" },
			{ ...EDITION_PAYLOAD, graceStartsAt: null },
			{ ...EDITION_PAYLOAD, graceEndsAt: 20270107 },
			{ ...EDITION_PAYLOAD, design: "1999" },
			{ ...EDITION_PAYLOAD, design: ["2026"] },
			{ ...EDITION_PAYLOAD, premiumRegenerations: -1 },
			{ ...EDITION_PAYLOAD, giftRegenerations: 1.5 },
			{ ...EDITION_PAYLOAD, premiumRegenerations: "3" },
			{ ...EDITION_PAYLOAD, giftRegenerations: 1_000_000 },
			{ ...EDITION_PAYLOAD, giftRegenerations: null },
			{ ...EDITION_PAYLOAD, extra: true },
			{ ...EDITION_PAYLOAD, applyToGenerated: true },
			{ ...EDITION_PAYLOAD, opensAt: "2027-02-01" },
			{ ...EDITION_PAYLOAD, graceStartsAt: "2026-11-30" },
			{
				...EDITION_PAYLOAD,
				graceStartsAt: "2027-01-10",
				graceEndsAt: "2027-01-07"
			},
			{ ...EDITION_PAYLOAD, graceEndsAt: "2027-02-01" }
		];
		for (const body of garbage) {
			const response = await postEdition(admin, body);
			assert.equal(response.status, 422, JSON.stringify(body));
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		}
		const noBody = await api()
			.post("/admin/rewind/editions")
			.set("Authorization", admin.authorization)
			.set("Content-Type", "application/json")
			.send("{not json");
		assert.equal(noBody.status, 400);
		assert.equal(await RewindEdition.count(), 0);
	});

	void it("accepts a single-day period and the grace touching both ends", async () => {
		const admin = await createUserWithSession("admin");
		const response = await postEdition(admin, {
			...EDITION_PAYLOAD,
			opensAt: "2026-12-01",
			graceStartsAt: "2026-12-01",
			graceEndsAt: "2026-12-01",
			closesAt: "2026-12-01"
		});
		assert.equal(response.status, 201);
	});

	void it("answers 409 when the year already has an edition and keeps the stored one", async () => {
		const admin = await createUserWithSession("admin");
		await createRewindEdition(2026, { premiumRegenerations: 7 });

		const response = await postEdition(admin, {
			...EDITION_PAYLOAD,
			opensAt: "2030-01-01",
			closesAt: "2030-02-01",
			graceStartsAt: "2030-01-10",
			graceEndsAt: "2030-01-20"
		});

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "REWIND_EDITION_EXISTS");
		const stored = await RewindEdition.findOne({ where: { year: 2026 } });
		assert.equal(stored?.premiumRegenerations, 7);
	});

	void it("answers 409 when the period overlaps another edition, edges included", async () => {
		const admin = await createUserWithSession("admin");
		await createRewindEdition(2026);
		const overlapping = [
			{ opensAt: "2026-11-01", closesAt: "2026-12-01" },
			{ opensAt: "2027-01-31", closesAt: "2027-03-01" },
			{ opensAt: "2026-12-10", closesAt: "2026-12-20" },
			{ opensAt: "2026-01-01", closesAt: "2028-01-01" }
		];
		for (const period of overlapping) {
			const response = await postEdition(admin, {
				...EDITION_PAYLOAD,
				year: 2027,
				graceStartsAt: period.opensAt,
				graceEndsAt: period.closesAt,
				...period
			});
			assert.equal(response.status, 409, JSON.stringify(period));
			assert.equal(response.body.type, "REWIND_EDITION_OVERLAP");
		}
		assert.equal(await RewindEdition.count(), 1);

		const adjacent = await postEdition(admin, {
			...EDITION_PAYLOAD,
			year: 2027,
			opensAt: "2027-02-01",
			closesAt: "2027-03-01",
			graceStartsAt: "2027-02-01",
			graceEndsAt: "2027-02-05"
		});
		assert.equal(adjacent.status, 201);
	});

	void it("creates only one edition when the same year is submitted twice at once", async () => {
		const admin = await createUserWithSession("admin");

		const responses = await Promise.all(
			Array.from({ length: 4 }, () => postEdition(admin, EDITION_PAYLOAD))
		);

		const statuses = responses.map(response => response.status).sort();
		assert.deepEqual(statuses, [201, 409, 409, 409]);
		assert.equal(await RewindEdition.count(), 1);
	});

	void it("creates only one of two overlapping editions submitted at once", async () => {
		const admin = await createUserWithSession("admin");

		const responses = await Promise.all([
			postEdition(admin, EDITION_PAYLOAD),
			postEdition(admin, {
				...EDITION_PAYLOAD,
				year: 2027,
				opensAt: "2027-01-15",
				closesAt: "2027-03-01",
				graceStartsAt: "2027-01-15",
				graceEndsAt: "2027-01-20"
			})
		]);

		const statuses = responses.map(response => response.status).sort();
		assert.deepEqual(statuses, [201, 409]);
		assert.equal(await RewindEdition.count(), 1);
	});
});

void describe("PUT /admin/rewind/editions/:year", () => {
	void it("updates the edition without touching generated rewinds by default", async () => {
		const admin = await createUserWithSession("admin");
		await createRewindEdition(2026);
		const rewind = await storeRewindFor(2026, "premium", 2);

		const response = await putEdition(admin, 2026, {
			...UPDATE_PAYLOAD,
			closesAt: "2027-02-15",
			premiumRegenerations: 9
		});

		assert.equal(response.status, 200);
		assert.equal(response.body.data.affectedRewinds, 0);
		assert.equal(response.body.data.edition.closesAt, "2027-02-15");
		assert.equal(response.body.data.edition.premiumRegenerations, 9);
		assert.equal(response.body.data.edition.generatedCount, 1);
		await rewind.reload();
		assert.equal(rewind.regenerationsLeft, 2);
		await auditEntry("rewind_edition_updated", "2026");
	});

	void it("adds the quota difference per access kind and leaves rewinds without access alone", async () => {
		const admin = await createUserWithSession("admin");
		await createRewindEdition(2026, {
			premiumRegenerations: 2,
			giftRegenerations: 1
		});
		await createRewindEdition(2025, {
			opensAt: "2025-12-01",
			closesAt: "2026-01-31",
			graceStartsAt: "2026-01-01",
			graceEndsAt: "2026-01-07",
			premiumRegenerations: 2,
			giftRegenerations: 1
		});
		const premium = await storeRewindFor(2026, "premium", 1);
		const gift = await storeRewindFor(2026, "gift", 0);
		const none = await storeRewindFor(2026, null, 0);
		const otherYear = await storeRewindFor(2025, "premium", 5);

		const response = await putEdition(admin, 2026, {
			...UPDATE_PAYLOAD,
			premiumRegenerations: 5,
			giftRegenerations: 4,
			applyToGenerated: true
		});

		assert.equal(response.status, 200);
		assert.equal(response.body.data.affectedRewinds, 2);
		const left = async (rewind: Rewind) =>
			(await rewind.reload()).regenerationsLeft;
		assert.equal(await left(premium), 4);
		assert.equal(await left(gift), 3);
		assert.equal(await left(none), 0);
		assert.equal(await left(otherYear), 5);
	});

	void it("lowers quotas without going below zero", async () => {
		const admin = await createUserWithSession("admin");
		await createRewindEdition(2026, {
			premiumRegenerations: 5,
			giftRegenerations: 3
		});
		const barelyPremium = await storeRewindFor(2026, "premium", 1);
		const richPremium = await storeRewindFor(2026, "premium", 4);
		const emptyGift = await storeRewindFor(2026, "gift", 0);
		const none = await storeRewindFor(2026, null, 0);

		const response = await putEdition(admin, 2026, {
			...UPDATE_PAYLOAD,
			premiumRegenerations: 2,
			giftRegenerations: 0,
			applyToGenerated: true
		});

		assert.equal(response.status, 200);
		assert.equal(response.body.data.affectedRewinds, 3);
		const left = async (rewind: Rewind) =>
			(await rewind.reload()).regenerationsLeft;
		assert.equal(await left(barelyPremium), 0);
		assert.equal(await left(richPremium), 1);
		assert.equal(await left(emptyGift), 0);
		assert.equal(await left(none), 0);
	});

	void it("counts no rewind when the quotas do not change", async () => {
		const admin = await createUserWithSession("admin");
		await createRewindEdition(2026, {
			premiumRegenerations: 3,
			giftRegenerations: 1
		});
		const premium = await storeRewindFor(2026, "premium", 2);

		const response = await putEdition(admin, 2026, {
			...UPDATE_PAYLOAD,
			applyToGenerated: true
		});

		assert.equal(response.status, 200);
		assert.equal(response.body.data.affectedRewinds, 0);
		await premium.reload();
		assert.equal(premium.regenerationsLeft, 2);
	});

	void it("applies the difference once when the same save is sent twice at once", async () => {
		const admin = await createUserWithSession("admin");
		await createRewindEdition(2026, {
			premiumRegenerations: 1,
			giftRegenerations: 1
		});
		const premium = await storeRewindFor(2026, "premium", 1);

		const responses = await Promise.all(
			Array.from({ length: 3 }, () =>
				putEdition(admin, 2026, {
					...UPDATE_PAYLOAD,
					premiumRegenerations: 4,
					giftRegenerations: 1,
					applyToGenerated: true
				})
			)
		);

		assert.ok(responses.every(response => response.status === 200));
		const applied = responses.map(r => r.body.data.affectedRewinds).sort();
		assert.deepEqual(applied, [0, 0, 1]);
		await premium.reload();
		assert.equal(premium.regenerationsLeft, 4);
	});

	void it("rejects garbage input and leaves the edition and rewinds untouched", async () => {
		const admin = await createUserWithSession("admin");
		await createRewindEdition(2026, { premiumRegenerations: 2 });
		const premium = await storeRewindFor(2026, "premium", 2);
		const garbage: Record<string, unknown>[] = [
			{},
			{ ...UPDATE_PAYLOAD, year: 2027 },
			{ ...UPDATE_PAYLOAD, applyToGenerated: "yes" },
			{ ...UPDATE_PAYLOAD, applyToGenerated: 1 },
			{ ...UPDATE_PAYLOAD, premiumRegenerations: -5 },
			{ ...UPDATE_PAYLOAD, giftRegenerations: 0.5 },
			{ ...UPDATE_PAYLOAD, design: "nope" },
			{ ...UPDATE_PAYLOAD, opensAt: "2026-13-01" },
			{ ...UPDATE_PAYLOAD, graceEndsAt: "2027-03-01" },
			{ ...UPDATE_PAYLOAD, graceStartsAt: "2026-11-01" },
			{ ...UPDATE_PAYLOAD, unexpected: 1 }
		];
		for (const body of garbage) {
			const response = await putEdition(admin, 2026, {
				...body,
				applyToGenerated: body.applyToGenerated ?? true
			});
			assert.equal(response.status, 422, JSON.stringify(body));
		}
		for (const year of ["abc", "-1", "20.5", "1", "99999"]) {
			const response = await putEdition(admin, year, UPDATE_PAYLOAD);
			assert.equal(response.status, 422, year);
		}
		const stored = await RewindEdition.findOne({ where: { year: 2026 } });
		assert.equal(stored?.premiumRegenerations, 2);
		await premium.reload();
		assert.equal(premium.regenerationsLeft, 2);
	});

	void it("answers 404 when the edition does not exist", async () => {
		const admin = await createUserWithSession("admin");
		const response = await putEdition(admin, 2031, UPDATE_PAYLOAD);
		assert.equal(response.status, 404);
		assert.equal(response.body.type, "REWIND_EDITION_NOT_FOUND");
	});

	void it("answers 409 when the new period overlaps another edition and changes nothing", async () => {
		const admin = await createUserWithSession("admin");
		await createRewindEdition(2026);
		await createRewindEdition(2027, {
			opensAt: "2027-12-01",
			closesAt: "2028-01-31",
			graceStartsAt: "2028-01-01",
			graceEndsAt: "2028-01-07"
		});
		const premium = await storeRewindFor(2026, "premium", 1);

		const response = await putEdition(admin, 2026, {
			...UPDATE_PAYLOAD,
			closesAt: "2027-12-01",
			premiumRegenerations: 9,
			applyToGenerated: true
		});

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "REWIND_EDITION_OVERLAP");
		const stored = await RewindEdition.findOne({ where: { year: 2026 } });
		assert.equal(stored?.closesAt, "2027-01-31");
		assert.equal(stored?.premiumRegenerations, 0);
		await premium.reload();
		assert.equal(premium.regenerationsLeft, 1);
	});

	void it("lets an edition keep or stretch its own period", async () => {
		const admin = await createUserWithSession("admin");
		await createRewindEdition(2026);
		const response = await putEdition(admin, 2026, {
			...UPDATE_PAYLOAD,
			opensAt: "2026-11-01",
			closesAt: "2027-03-31"
		});
		assert.equal(response.status, 200);
	});

	void it("answers 409 when the edition is frozen and applies nothing", async () => {
		const admin = await createUserWithSession("admin");
		const frozenAt = new Date("2027-02-01T00:10:00.000Z");
		await createRewindEdition(2026, {
			frozenAt,
			premiumRegenerations: 2
		});
		const premium = await storeRewindFor(2026, "premium", 1);

		const response = await putEdition(admin, 2026, {
			...UPDATE_PAYLOAD,
			premiumRegenerations: 9,
			applyToGenerated: true
		});

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "REWIND_EDITION_FROZEN");
		const stored = await RewindEdition.findOne({ where: { year: 2026 } });
		assert.equal(stored?.premiumRegenerations, 2);
		await premium.reload();
		assert.equal(premium.regenerationsLeft, 1);
	});
});
