import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { afterEach, describe, it } from "node:test";

import { AuditLog } from "../../src/audit/audit.model";
import { PremiumGrant } from "../../src/premium-access/premium-grant.model";
import { PremiumPromotion } from "../../src/premium-access/premium-promotion.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { eventually } from "../helpers/eventually.helper";
import { createUser } from "../helpers/factories.helper";

useTestDatabase();

afterEach(async () => {
	await PremiumGrant.destroy({ where: {} });
	await PremiumPromotion.destroy({ where: {} });
});

function futureDate(days = 30) {
	return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function promotionBody(code = "rewind-launch-2026") {
	return {
		code,
		feature: "rewind.premium",
		startsAt: futureDate(-1),
		endsAt: futureDate(30)
	};
}

function auditEntry(action: string, targetId: string) {
	return eventually(async () => {
		const entry = await AuditLog.findOne({ where: { action, targetId } });
		assert.ok(entry, `no audit entry ${action} for ${targetId}`);
		return entry;
	});
}

void describe("premium promotion administration", () => {
	void it("creates and lists promotions without granting access and records the audit entry", async () => {
		const admin = await createUserWithSession("admin");
		const body = promotionBody();

		const created = await api()
			.post("/admin/premium-promotions")
			.set("Authorization", admin.authorization)
			.send(body);

		assert.equal(created.status, 201);
		assert.equal(created.body.data.promotion.code, body.code);
		assert.equal(created.body.data.promotion.feature, body.feature);
		assert.equal(created.body.data.promotion.startsAt, body.startsAt);
		assert.equal(created.body.data.promotion.endsAt, body.endsAt);
		assert.equal(await PremiumGrant.count(), 0);

		const listed = await api()
			.get("/admin/premium-promotions")
			.set("Authorization", admin.authorization);
		assert.equal(listed.status, 200);
		assert.deepEqual(
			listed.body.data.promotions.map(
				(promotion: { id: string }) => promotion.id
			),
			[created.body.data.promotion.id]
		);

		const entry = await auditEntry(
			"premium_promotion_created",
			created.body.data.promotion.id
		);
		assert.equal(entry.userId, admin.user.id);
		assert.equal(entry.targetType, "premium_promotion");
	});

	void it("hides promotion administration from non-admin users and anonymous callers", async () => {
		const account = await createUserWithSession("premium");
		const authenticated = await api()
			.get("/admin/premium-promotions")
			.set("Authorization", account.authorization);
		const anonymous = await api()
			.post("/admin/premium-promotions")
			.send(promotionBody());

		assert.equal(authenticated.status, 404);
		assert.equal(authenticated.body.type, "AUTH_ROUTE_NOT_FOUND");
		assert.equal(anonymous.status, 404);
		assert.equal(anonymous.body.type, "AUTH_ROUTE_NOT_FOUND");
	});

	void it("rejects invalid periods and past expiration dates", async () => {
		const admin = await createUserWithSession("admin");
		const reversed = await api()
			.post("/admin/premium-promotions")
			.set("Authorization", admin.authorization)
			.send({
				...promotionBody(),
				startsAt: futureDate(10),
				endsAt: futureDate(5)
			});
		const past = await api()
			.post("/admin/premium-promotions")
			.set("Authorization", admin.authorization)
			.send({ ...promotionBody(), endsAt: futureDate(-1) });

		assert.equal(reversed.status, 422);
		assert.equal(reversed.body.type, "PREMIUM_PROMOTION_INVALID_DATES");
		assert.equal(past.status, 422);
		assert.equal(past.body.type, "PREMIUM_PROMOTION_INVALID_DATES");
		assert.equal(await PremiumPromotion.count(), 0);
	});

	void it("rejects duplicate codes and invalid promotion definitions", async () => {
		const admin = await createUserWithSession("admin");
		await api()
			.post("/admin/premium-promotions")
			.set("Authorization", admin.authorization)
			.send(promotionBody())
			.expect(201);

		const duplicate = await api()
			.post("/admin/premium-promotions")
			.set("Authorization", admin.authorization)
			.send(promotionBody());
		const invalid = await api()
			.post("/admin/premium-promotions")
			.set("Authorization", admin.authorization)
			.send({
				...promotionBody("Invalid Code"),
				feature: "unknown.feature",
				extra: true
			});

		assert.equal(duplicate.status, 409);
		assert.equal(duplicate.body.type, "PREMIUM_PROMOTION_CODE_CONFLICT");
		assert.equal(invalid.status, 422);
		assert.equal(invalid.body.type, "COMMON_SCHEMA_INVALID");
		assert.equal(await PremiumPromotion.count(), 1);
	});

	void it("updates dates and synchronizes claimed grants in the same operation", async () => {
		const admin = await createUserWithSession("admin");
		const user = await createUser();
		const body = promotionBody();
		const promotion = await PremiumPromotion.create({
			...body,
			startsAt: new Date(body.startsAt),
			endsAt: new Date(body.endsAt)
		});
		const grant = await PremiumGrant.create({
			userId: user.id,
			feature: promotion.feature,
			expiresAt: new Date(body.endsAt),
			offerCode: promotion.code
		});
		const startsAt = futureDate(-2);
		const endsAt = futureDate(90);

		const response = await api()
			.patch(`/admin/premium-promotions/${promotion.id}`)
			.set("Authorization", admin.authorization)
			.send({ startsAt, endsAt });

		assert.equal(response.status, 200);
		assert.equal(response.body.data.promotion.startsAt, startsAt);
		assert.equal(response.body.data.promotion.endsAt, endsAt);
		await grant.reload();
		assert.equal(grant.expiresAt?.toISOString(), endsAt);
		assert.equal(
			(await auditEntry("premium_promotion_updated", promotion.id))
				.userId,
			admin.user.id
		);
	});

	void it("returns not found when updating or revoking an unknown promotion", async () => {
		const admin = await createUserWithSession("admin");
		const promotionId = randomUUID();

		const updated = await api()
			.patch(`/admin/premium-promotions/${promotionId}`)
			.set("Authorization", admin.authorization)
			.send({ endsAt: futureDate() });
		const revoked = await api()
			.post(`/admin/premium-promotions/${promotionId}/revoke`)
			.set("Authorization", admin.authorization);

		assert.equal(updated.status, 404);
		assert.equal(updated.body.type, "PREMIUM_PROMOTION_NOT_FOUND");
		assert.equal(revoked.status, 404);
		assert.equal(revoked.body.type, "PREMIUM_PROMOTION_NOT_FOUND");
	});

	void it("revokes active promotions and only their claimed grants", async () => {
		const admin = await createUserWithSession("admin");
		const user = await createUser();
		const otherUser = await createUser();
		const body = promotionBody();
		const promotion = await PremiumPromotion.create({
			...body,
			startsAt: new Date(body.startsAt),
			endsAt: new Date(body.endsAt)
		});
		const grant = await PremiumGrant.create({
			userId: user.id,
			feature: promotion.feature,
			expiresAt: new Date(body.endsAt),
			offerCode: promotion.code
		});
		const unrelatedGrant = await PremiumGrant.create({
			userId: otherUser.id,
			feature: "export.json",
			expiresAt: new Date(futureDate(60)),
			offerCode: "json-export-trial-1m"
		});
		const unrelatedExpiration = unrelatedGrant.expiresAt?.toISOString();

		const response = await api()
			.post(`/admin/premium-promotions/${promotion.id}/revoke`)
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 200);
		const revokedAt = response.body.data.promotion.endsAt;
		assert.ok(new Date(revokedAt).getTime() <= Date.now());
		await Promise.all([grant.reload(), unrelatedGrant.reload()]);
		assert.equal(grant.expiresAt?.toISOString(), revokedAt);
		assert.equal(
			unrelatedGrant.expiresAt?.toISOString(),
			unrelatedExpiration
		);
		assert.equal(
			(await auditEntry("premium_promotion_revoked", promotion.id))
				.userId,
			admin.user.id
		);
	});

	void it("revokes scheduled promotions without violating their date constraint", async () => {
		const admin = await createUserWithSession("admin");
		const promotion = await PremiumPromotion.create({
			code: "lists-december-2026",
			feature: "lists.unlimited",
			startsAt: new Date(futureDate(10)),
			endsAt: new Date(futureDate(40))
		});

		const first = await api()
			.post(`/admin/premium-promotions/${promotion.id}/revoke`)
			.set("Authorization", admin.authorization);
		const second = await api()
			.post(`/admin/premium-promotions/${promotion.id}/revoke`)
			.set("Authorization", admin.authorization);

		assert.equal(first.status, 200);
		assert.equal(
			first.body.data.promotion.startsAt,
			first.body.data.promotion.endsAt
		);
		assert.equal(second.status, 200);
		assert.equal(second.body.data.promotion.id, promotion.id);
	});
});
