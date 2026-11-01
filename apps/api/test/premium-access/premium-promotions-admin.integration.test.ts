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
		assert.equal(created.body.data.promotion.claimCount, 0);
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

	void it("rejects codes reserved by static gift offers", async () => {
		const admin = await createUserWithSession("admin");

		const responses = await Promise.all(
			["premium-trial-1m", "json-export-trial-1m"].map(code =>
				api()
					.post("/admin/premium-promotions")
					.set("Authorization", admin.authorization)
					.send(promotionBody(code))
			)
		);

		for (const response of responses) {
			assert.equal(response.status, 409);
			assert.equal(response.body.type, "PREMIUM_PROMOTION_CODE_CONFLICT");
		}
		assert.equal(await PremiumPromotion.count(), 0);
	});

	void it("lists how many users claimed each promotion", async () => {
		const admin = await createUserWithSession("admin");
		const [firstUser, secondUser] = await Promise.all([
			createUser(),
			createUser()
		]);
		const body = promotionBody();
		const claimed = await PremiumPromotion.create({
			...body,
			startsAt: new Date(body.startsAt),
			endsAt: new Date(body.endsAt)
		});
		const unclaimed = await PremiumPromotion.create({
			...promotionBody("lists-unlimited-2026"),
			feature: "lists.unlimited",
			startsAt: new Date(body.startsAt),
			endsAt: new Date(body.endsAt)
		});
		await PremiumGrant.bulkCreate(
			[firstUser, secondUser].map(user => ({
				userId: user.id,
				feature: claimed.feature,
				expiresAt: claimed.endsAt,
				offerCode: claimed.code
			}))
		);

		const listed = await api()
			.get("/admin/premium-promotions")
			.set("Authorization", admin.authorization);

		assert.equal(listed.status, 200);
		const claimCountById = new Map(
			listed.body.data.promotions.map(
				(promotion: { id: string; claimCount: number }) => [
					promotion.id,
					promotion.claimCount
				]
			)
		);
		assert.equal(claimCountById.get(claimed.id), 2);
		assert.equal(claimCountById.get(unclaimed.id), 0);
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

	void it("keeps individually revoked grants revoked when the promotion is extended", async () => {
		const admin = await createUserWithSession("admin");
		const [activeUser, revokedUser] = await Promise.all([
			createUser(),
			createUser()
		]);
		const body = promotionBody();
		const promotion = await PremiumPromotion.create({
			...body,
			startsAt: new Date(body.startsAt),
			endsAt: new Date(body.endsAt)
		});
		const activeGrant = await PremiumGrant.create({
			userId: activeUser.id,
			feature: promotion.feature,
			expiresAt: promotion.endsAt,
			offerCode: promotion.code
		});
		const revokedAt = new Date(futureDate(-0.5));
		const revokedGrant = await PremiumGrant.create({
			userId: revokedUser.id,
			feature: promotion.feature,
			expiresAt: revokedAt,
			offerCode: promotion.code
		});
		const endsAt = futureDate(90);

		const response = await api()
			.patch(`/admin/premium-promotions/${promotion.id}`)
			.set("Authorization", admin.authorization)
			.send({ endsAt });

		assert.equal(response.status, 200);
		assert.equal(response.body.data.promotion.claimCount, 2);
		await Promise.all([activeGrant.reload(), revokedGrant.reload()]);
		assert.equal(activeGrant.expiresAt?.toISOString(), endsAt);
		assert.equal(
			revokedGrant.expiresAt?.toISOString(),
			revokedAt.toISOString()
		);
	});

	void it("refuses to edit an ended promotion and leaves its grants untouched", async () => {
		const admin = await createUserWithSession("admin");
		const user = await createUser();
		const promotion = await PremiumPromotion.create({
			code: "rewind-ended-2026",
			feature: "rewind.premium",
			startsAt: new Date(futureDate(-30)),
			endsAt: new Date(futureDate(-1))
		});
		const grant = await PremiumGrant.create({
			userId: user.id,
			feature: promotion.feature,
			expiresAt: promotion.endsAt,
			offerCode: promotion.code
		});

		const response = await api()
			.patch(`/admin/premium-promotions/${promotion.id}`)
			.set("Authorization", admin.authorization)
			.send({ endsAt: futureDate(30) });

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "PREMIUM_PROMOTION_ENDED");
		await Promise.all([promotion.reload(), grant.reload()]);
		assert.equal(
			promotion.endsAt.toISOString(),
			new Date(grant.expiresAt ?? 0).toISOString()
		);
		assert.ok(promotion.endsAt.getTime() < Date.now());
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
		assert.equal(
			second.body.data.promotion.endsAt,
			first.body.data.promotion.endsAt
		);
	});

	void it("keeps the original end of an ended promotion when revoked again", async () => {
		const admin = await createUserWithSession("admin");
		const user = await createUser();
		const endedAt = new Date(futureDate(-5));
		const promotion = await PremiumPromotion.create({
			code: "lists-october-2026",
			feature: "lists.unlimited",
			startsAt: new Date(futureDate(-35)),
			endsAt: endedAt
		});
		const grant = await PremiumGrant.create({
			userId: user.id,
			feature: promotion.feature,
			expiresAt: endedAt,
			offerCode: promotion.code
		});

		const responses = await Promise.all(
			[1, 2].map(() =>
				api()
					.post(`/admin/premium-promotions/${promotion.id}/revoke`)
					.set("Authorization", admin.authorization)
			)
		);

		for (const response of responses) {
			assert.equal(response.status, 200);
			assert.equal(
				response.body.data.promotion.endsAt,
				endedAt.toISOString()
			);
		}
		await grant.reload();
		assert.equal(grant.expiresAt?.toISOString(), endedAt.toISOString());
	});
});
