import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { AuditLog } from "../../src/audit/audit.model";
import { PremiumGrant } from "../../src/premium-access/premium-grant.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { eventually } from "../helpers/eventually.helper";
import { createUser } from "../helpers/factories.helper";

useTestDatabase();

function futureDate(days = 30) {
	return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function auditEntry(action: string, targetId: string) {
	return eventually(async () => {
		const entry = await AuditLog.findOne({ where: { action, targetId } });
		assert.ok(entry, `no audit entry ${action} for ${targetId}`);
		return entry;
	});
}

void describe("GET /admin/premium-features", () => {
	void it("returns the individual feature catalog without the full premium marker", async () => {
		const admin = await createUserWithSession("admin");

		const response = await api()
			.get("/admin/premium-features")
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.features.length, 11);
		assert.ok(
			response.body.data.features.every(
				(feature: { feature: string }) => feature.feature !== "*"
			)
		);
		assert.ok(
			response.body.data.features.some(
				(feature: { feature: string }) =>
					feature.feature === "rewind.premium"
			)
		);
	});

	void it("hides the catalog from non-admin users and anonymous callers", async () => {
		const account = await createUserWithSession("premium");
		const authenticated = await api()
			.get("/admin/premium-features")
			.set("Authorization", account.authorization);
		const anonymous = await api().get("/admin/premium-features");

		assert.equal(authenticated.status, 404);
		assert.equal(authenticated.body.type, "AUTH_ROUTE_NOT_FOUND");
		assert.equal(anonymous.status, 404);
		assert.equal(anonymous.body.type, "AUTH_ROUTE_NOT_FOUND");
	});
});

void describe("premium grant administration", () => {
	void it("creates and lists a permanent individual grant and records the audit entry", async () => {
		const admin = await createUserWithSession("admin");
		const user = await createUser();

		const created = await api()
			.post(`/admin/users/${user.id}/premium-grants`)
			.set("Authorization", admin.authorization)
			.send({ feature: "lists.unlimited", expiresAt: null });

		assert.equal(created.status, 201);
		assert.equal(created.body.data.grant.userId, user.id);
		assert.equal(created.body.data.grant.feature, "lists.unlimited");
		assert.equal(created.body.data.grant.expiresAt, null);
		assert.equal(created.body.data.grant.offerCode, null);

		const listed = await api()
			.get(`/admin/users/${user.id}/premium-grants`)
			.set("Authorization", admin.authorization);
		assert.equal(listed.status, 200);
		assert.deepEqual(
			listed.body.data.grants.map((grant: { id: string }) => grant.id),
			[created.body.data.grant.id]
		);

		const entry = await auditEntry(
			"premium_grant_created",
			created.body.data.grant.id
		);
		assert.equal(entry.userId, admin.user.id);
		assert.equal(entry.targetType, "premium_grant");
	});

	void it("requires an expiration for full premium", async () => {
		const admin = await createUserWithSession("admin");
		const user = await createUser();

		const response = await api()
			.post(`/admin/users/${user.id}/premium-grants`)
			.set("Authorization", admin.authorization)
			.send({ feature: "*", expiresAt: null });

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "PREMIUM_GRANT_INVALID_EXPIRATION");
		assert.equal(
			await PremiumGrant.count({ where: { userId: user.id } }),
			0
		);
	});

	void it("rejects past expiration dates", async () => {
		const admin = await createUserWithSession("admin");
		const user = await createUser();

		const response = await api()
			.post(`/admin/users/${user.id}/premium-grants`)
			.set("Authorization", admin.authorization)
			.send({
				feature: "rewind.premium",
				expiresAt: "2020-01-01T00:00:00.000Z"
			});

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "PREMIUM_GRANT_INVALID_EXPIRATION");
	});

	void it("returns USER_NOT_FOUND when listing or creating grants for an unknown user", async () => {
		const admin = await createUserWithSession("admin");
		const userId = randomUUID();

		const listed = await api()
			.get(`/admin/users/${userId}/premium-grants`)
			.set("Authorization", admin.authorization);
		const created = await api()
			.post(`/admin/users/${userId}/premium-grants`)
			.set("Authorization", admin.authorization)
			.send({ feature: "export.json", expiresAt: null });

		assert.equal(listed.status, 404);
		assert.equal(listed.body.type, "USER_NOT_FOUND");
		assert.equal(created.status, 404);
		assert.equal(created.body.type, "USER_NOT_FOUND");
	});

	void it("extends a grant and records the update", async () => {
		const admin = await createUserWithSession("admin");
		const user = await createUser();
		const grant = await PremiumGrant.create({
			userId: user.id,
			feature: "*",
			expiresAt: new Date(futureDate(1)),
			offerCode: null
		});
		const expiresAt = futureDate(90);

		const response = await api()
			.patch(`/admin/users/${user.id}/premium-grants/${grant.id}`)
			.set("Authorization", admin.authorization)
			.send({ expiresAt });

		assert.equal(response.status, 200);
		assert.equal(response.body.data.grant.feature, "*");
		assert.equal(response.body.data.grant.expiresAt, expiresAt);
		assert.equal(
			(await auditEntry("premium_grant_updated", grant.id)).userId,
			admin.user.id
		);
	});

	void it("does not allow updating or revoking a grant owned by another user", async () => {
		const admin = await createUserWithSession("admin");
		const user = await createUser();
		const otherUser = await createUser();
		const grant = await PremiumGrant.create({
			userId: otherUser.id,
			feature: "themes.premium",
			expiresAt: null,
			offerCode: null
		});

		const updated = await api()
			.patch(`/admin/users/${user.id}/premium-grants/${grant.id}`)
			.set("Authorization", admin.authorization)
			.send({ expiresAt: futureDate() });
		const revoked = await api()
			.post(`/admin/users/${user.id}/premium-grants/${grant.id}/revoke`)
			.set("Authorization", admin.authorization);

		assert.equal(updated.status, 404);
		assert.equal(updated.body.type, "PREMIUM_GRANT_NOT_FOUND");
		assert.equal(revoked.status, 404);
		assert.equal(revoked.body.type, "PREMIUM_GRANT_NOT_FOUND");
	});

	void it("revokes a permanent grant once and rejects revoking it again without moving the date", async () => {
		const admin = await createUserWithSession("admin");
		const user = await createUser();
		const grant = await PremiumGrant.create({
			userId: user.id,
			feature: "favorites.unlimited",
			expiresAt: null,
			offerCode: null
		});

		const first = await api()
			.post(`/admin/users/${user.id}/premium-grants/${grant.id}/revoke`)
			.set("Authorization", admin.authorization);
		const firstExpiration = first.body.data.grant.expiresAt;
		const second = await api()
			.post(`/admin/users/${user.id}/premium-grants/${grant.id}/revoke`)
			.set("Authorization", admin.authorization);

		assert.equal(first.status, 200);
		assert.ok(new Date(firstExpiration).getTime() <= Date.now());
		assert.equal(second.status, 409);
		assert.equal(second.body.type, "PREMIUM_GRANT_NOT_ACTIVE");
		await grant.reload();
		assert.equal(grant.expiresAt?.toISOString(), firstExpiration);
		assert.equal(
			await eventually(async () => {
				const count = await AuditLog.count({
					where: {
						action: "premium_grant_revoked",
						targetId: grant.id
					}
				});
				assert.equal(count, 1);
				return count;
			}),
			1
		);
	});

	void it("rejects revoking an expired grant and keeps its real expiration", async () => {
		const admin = await createUserWithSession("admin");
		const user = await createUser();
		const expiredAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
		const grant = await PremiumGrant.create({
			userId: user.id,
			feature: "*",
			expiresAt: expiredAt,
			offerCode: null
		});

		const response = await api()
			.post(`/admin/users/${user.id}/premium-grants/${grant.id}/revoke`)
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "PREMIUM_GRANT_NOT_ACTIVE");
		await grant.reload();
		assert.equal(grant.expiresAt?.toISOString(), expiredAt.toISOString());
		assert.equal(
			await AuditLog.count({
				where: { action: "premium_grant_revoked", targetId: grant.id }
			}),
			0
		);
	});

	void it("rejects changing the date of an expired grant instead of reactivating it", async () => {
		const admin = await createUserWithSession("admin");
		const user = await createUser();
		const expiredAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
		const grant = await PremiumGrant.create({
			userId: user.id,
			feature: "export.json",
			expiresAt: expiredAt,
			offerCode: null
		});

		const future = await api()
			.patch(`/admin/users/${user.id}/premium-grants/${grant.id}`)
			.set("Authorization", admin.authorization)
			.send({ expiresAt: futureDate(30) });
		const permanent = await api()
			.patch(`/admin/users/${user.id}/premium-grants/${grant.id}`)
			.set("Authorization", admin.authorization)
			.send({ expiresAt: null });

		assert.equal(future.status, 409);
		assert.equal(future.body.type, "PREMIUM_GRANT_NOT_ACTIVE");
		assert.equal(permanent.status, 409);
		assert.equal(permanent.body.type, "PREMIUM_GRANT_NOT_ACTIVE");
		await grant.reload();
		assert.equal(grant.expiresAt?.toISOString(), expiredAt.toISOString());
	});
});
