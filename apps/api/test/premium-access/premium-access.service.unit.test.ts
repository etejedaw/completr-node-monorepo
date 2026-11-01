import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { Op } from "sequelize";

import {
	FULL_PREMIUM_FEATURE,
	PREMIUM_FEATURES
} from "../../src/premium-access/premium-access.constants";
import {
	resolvePremiumAccess,
	resolvePremiumStatus
} from "../../src/premium-access/premium-access.service";
import { PremiumGrant } from "../../src/premium-access/premium-grant.model";
import { asModel } from "../unit-helpers/as-model";
import { buildRequestUser, stub } from "../unit-helpers/mocks";

const NOW = new Date("2026-12-15T12:00:00.000Z");
const LATER = new Date("2027-01-31T23:59:59.999Z");
const USER = buildRequestUser();

function buildGrant(overrides: Record<string, unknown> = {}) {
	return asModel<PremiumGrant>({
		userId: USER.id,
		feature: "rewind.premium",
		expiresAt: LATER,
		...overrides
	});
}

function stubGrants(grants: PremiumGrant[]) {
	return stub(PremiumGrant, "findAll", async () => grants);
}

afterEach(() => {
	mock.restoreAll();
});

void describe("resolvePremiumAccess", () => {
	void it("allows premium roles without querying grants", async () => {
		for (const role of ["premium", "moderator", "admin"]) {
			const findAll = stubGrants([]);

			const access = await resolvePremiumAccess(
				buildRequestUser({ role }),
				"rewind.premium",
				NOW
			);

			assert.deepEqual(access, {
				allowed: true,
				source: "role",
				expiresAt: null
			});
			assert.equal(findAll.mock.callCount(), 0);
		}
	});

	void it("denies a free user without applicable grants", async () => {
		stubGrants([]);

		const access = await resolvePremiumAccess(USER, "rewind.premium", NOW);

		assert.deepEqual(access, {
			allowed: false,
			source: null,
			expiresAt: null
		});
	});

	void it("allows every premium feature with a full grant", async () => {
		stubGrants([
			buildGrant({ feature: FULL_PREMIUM_FEATURE, expiresAt: LATER })
		]);

		for (const feature of PREMIUM_FEATURES) {
			const access = await resolvePremiumAccess(USER, feature, NOW);

			assert.deepEqual(access, {
				allowed: true,
				source: "full-grant",
				expiresAt: LATER.toISOString()
			});
		}
	});

	void it("keeps a full grant ahead of feature grants", async () => {
		stubGrants([
			buildGrant({ feature: "rewind.premium", expiresAt: null }),
			buildGrant({ feature: FULL_PREMIUM_FEATURE, expiresAt: LATER })
		]);

		const access = await resolvePremiumAccess(USER, "rewind.premium", NOW);

		assert.equal(access.source, "full-grant");
		assert.equal(access.expiresAt, LATER.toISOString());
	});

	void it("allows only the individually granted feature", async () => {
		stubGrants([buildGrant({ feature: "rewind.premium" })]);

		const rewindAccess = await resolvePremiumAccess(
			USER,
			"rewind.premium",
			NOW
		);
		const exportAccess = await resolvePremiumAccess(
			USER,
			"export.json",
			NOW
		);

		assert.equal(rewindAccess.allowed, true);
		assert.equal(rewindAccess.source, "feature-grant");
		assert.equal(exportAccess.allowed, false);
	});

	void it("applies global feature grants to any user", async () => {
		stubGrants([buildGrant({ userId: null, feature: "rewind.premium" })]);

		const access = await resolvePremiumAccess(
			buildRequestUser({ id: "new-user" }),
			"rewind.premium",
			NOW
		);

		assert.deepEqual(access, {
			allowed: true,
			source: "feature-grant",
			expiresAt: LATER.toISOString()
		});
	});

	void it("supports indefinite individual feature grants", async () => {
		stubGrants([buildGrant({ expiresAt: null })]);

		const access = await resolvePremiumAccess(USER, "rewind.premium", NOW);

		assert.deepEqual(access, {
			allowed: true,
			source: "feature-grant",
			expiresAt: null
		});
	});

	void it("prefers an individual feature grant over a global one", async () => {
		const individualExpiry = new Date("2027-02-01T00:00:00.000Z");
		stubGrants([
			buildGrant({ userId: null, expiresAt: LATER }),
			buildGrant({ userId: USER.id, expiresAt: individualExpiry })
		]);

		const access = await resolvePremiumAccess(USER, "rewind.premium", NOW);

		assert.equal(access.expiresAt, individualExpiry.toISOString());
	});

	void it("selects the most favorable applicable grant", async () => {
		const earlier = new Date("2026-12-20T00:00:00.000Z");
		stubGrants([
			buildGrant({ expiresAt: earlier }),
			buildGrant({ expiresAt: LATER })
		]);

		const access = await resolvePremiumAccess(USER, "rewind.premium", NOW);

		assert.equal(access.expiresAt, LATER.toISOString());
	});

	void it("does not apply another user's grant or a global full grant", async () => {
		stubGrants([
			buildGrant({ userId: "another-user" }),
			buildGrant({ userId: null, feature: FULL_PREMIUM_FEATURE })
		]);

		const access = await resolvePremiumAccess(USER, "rewind.premium", NOW);

		assert.equal(access.allowed, false);
	});

	void it("queries only grants that expire strictly after the current instant", async () => {
		const findAll = stubGrants([]);

		await resolvePremiumAccess(USER, "rewind.premium", NOW);

		assert.deepEqual(findAll.mock.calls[0]?.arguments, [
			{
				attributes: ["userId", "feature", "expiresAt"],
				where: {
					[Op.and]: [
						{
							[Op.or]: [
								{
									userId: USER.id,
									feature: FULL_PREMIUM_FEATURE
								},
								{ userId: USER.id, feature: "rewind.premium" },
								{ userId: null, feature: "rewind.premium" }
							]
						},
						{
							[Op.or]: [
								{ expiresAt: null },
								{ expiresAt: { [Op.gt]: NOW } }
							]
						}
					]
				}
			}
		]);
	});

	void it("reports only role and full grants as effective premium status", async () => {
		stubGrants([buildGrant({ feature: FULL_PREMIUM_FEATURE })]);
		assert.deepEqual(await resolvePremiumStatus(USER, NOW), {
			active: true,
			source: "full-grant",
			expiresAt: LATER.toISOString()
		});
		mock.restoreAll();

		stubGrants([buildGrant({ feature: "rewind.premium" })]);
		assert.deepEqual(await resolvePremiumStatus(USER, NOW), {
			active: false,
			source: null,
			expiresAt: null
		});
	});

	void it("does not modify the user's role", async () => {
		const user = buildRequestUser();
		stubGrants([buildGrant({ feature: FULL_PREMIUM_FEATURE })]);

		await resolvePremiumAccess(user, "rewind.premium", NOW);

		assert.equal(user.role, "user");
	});
});
