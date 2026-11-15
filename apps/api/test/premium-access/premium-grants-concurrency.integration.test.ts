import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PremiumGrant } from "../../src/premium-access/premium-grant.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createUser } from "../helpers/factories.helper";

useTestDatabase();

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function futureDate() {
	return new Date(Date.now() + THIRTY_DAYS_MS).toISOString();
}

async function createActiveGrant() {
	const admin = await createUserWithSession("admin");
	const user = await createUser();
	const grant = await PremiumGrant.create({
		userId: user.id,
		feature: "lists.unlimited",
		expiresAt: new Date(Date.now() + THIRTY_DAYS_MS)
	});
	return { admin, user, grant };
}

void describe("premium grant races", () => {
	void it("never leaves a grant extended after a concurrent revoke and update", async () => {
		const { admin, user, grant } = await createActiveGrant();
		const base = `/admin/users/${user.id}/premium-grants/${grant.id}`;

		const [revoked, updated] = await Promise.all([
			api()
				.post(`${base}/revoke`)
				.set("Authorization", admin.authorization),
			api()
				.patch(base)
				.set("Authorization", admin.authorization)
				.send({ expiresAt: futureDate() })
		]);

		assert.equal(revoked.status, 200);
		assert.ok([200, 409].includes(updated.status));
		const stored = await PremiumGrant.findByPk(grant.id);
		const lastExpiration = stored?.expiresAt?.getTime() ?? Infinity;
		if (updated.status === 409)
			assert.equal(updated.body.type, "PREMIUM_GRANT_NOT_ACTIVE");
		assert.ok(lastExpiration <= Date.now());
	});

	void it("lets exactly one of many simultaneous revokes win", async () => {
		const { admin, user, grant } = await createActiveGrant();

		const responses = await Promise.all(
			Array.from({ length: 5 }, () =>
				api()
					.post(
						`/admin/users/${user.id}/premium-grants/${grant.id}/revoke`
					)
					.set("Authorization", admin.authorization)
			)
		);

		const statuses = responses.map(response => response.status).sort();
		assert.deepEqual(statuses, [200, 409, 409, 409, 409]);
	});

	void it("rejects a garbage expiration without touching the grant", async () => {
		const { admin, user, grant } = await createActiveGrant();
		const before = grant.expiresAt?.getTime();

		const response = await api()
			.patch(`/admin/users/${user.id}/premium-grants/${grant.id}`)
			.set("Authorization", admin.authorization)
			.send({ expiresAt: "not-a-date" });

		assert.equal(response.status, 422);
		const stored = await PremiumGrant.findByPk(grant.id);
		assert.equal(stored?.expiresAt?.getTime(), before);
	});
});
