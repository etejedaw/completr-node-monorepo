import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PremiumGrant } from "../../src/premium-access/premium-grant.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";

useTestDatabase();

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

void describe("GET /users/me/gift-offers", () => {
	void it("returns available trials with server-defined features and durations", async () => {
		const account = await createUserWithSession();

		const response = await api()
			.get("/users/me/gift-offers")
			.set("Authorization", account.authorization);

		assert.equal(response.status, 200);
		const jsonOffer = response.body.data.offers.find(
			(offer: { code: string }) => offer.code === "json-export-trial-1m"
		);
		assert.equal(jsonOffer.feature, "export.json");
		assert.equal(jsonOffer.durationDays, 30);
		assert.equal(jsonOffer.status, "available");
		assert.equal(jsonOffer.canActivate, true);
		assert.equal(jsonOffer.hasAccess, false);
	});

	void it("hides eligibility for trials a premium user does not need", async () => {
		const account = await createUserWithSession("premium");

		const response = await api()
			.get("/users/me/gift-offers")
			.set("Authorization", account.authorization);

		assert.equal(response.status, 200);
		assert.ok(
			response.body.data.offers.every(
				(offer: {
					status: string;
					canActivate: boolean;
					hasAccess: boolean;
				}) =>
					offer.status === "not-eligible" &&
					offer.canActivate === false &&
					offer.hasAccess === true
			)
		);
	});

	void it("requires authentication", async () => {
		const response = await api().get("/users/me/gift-offers");
		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
	});
});

void describe("POST /users/me/gift-offers/:offerCode/claim", () => {
	void it("claims a feature trial for the server-defined duration", async () => {
		const account = await createUserWithSession();
		const before = Date.now();

		const response = await api()
			.post("/users/me/gift-offers/json-export-trial-1m/claim")
			.set("Authorization", account.authorization)
			.send({});

		assert.equal(response.status, 201);
		assert.equal(response.body.data.created, true);
		assert.equal(response.body.data.grant.userId, account.user.id);
		assert.equal(response.body.data.grant.feature, "export.json");
		assert.equal(
			response.body.data.grant.offerCode,
			"json-export-trial-1m"
		);
		const expiresAt = new Date(
			response.body.data.grant.expiresAt
		).getTime();
		assert.ok(expiresAt >= before + ONE_MONTH_MS);
		assert.ok(expiresAt <= Date.now() + ONE_MONTH_MS);
	});

	void it("repeats a claim idempotently without extending its expiration", async () => {
		const account = await createUserWithSession();
		const first = await api()
			.post("/users/me/gift-offers/json-export-trial-1m/claim")
			.set("Authorization", account.authorization)
			.send({});
		const firstExpiration = first.body.data.grant.expiresAt;

		const second = await api()
			.post("/users/me/gift-offers/json-export-trial-1m/claim")
			.set("Authorization", account.authorization)
			.send({});

		assert.equal(second.status, 200);
		assert.equal(second.body.data.created, false);
		assert.equal(second.body.data.grant.id, first.body.data.grant.id);
		assert.equal(second.body.data.grant.expiresAt, firstExpiration);
		assert.equal(
			await PremiumGrant.count({
				where: {
					userId: account.user.id,
					offerCode: "json-export-trial-1m"
				}
			}),
			1
		);
	});

	void it("resolves concurrent claims to one grant and one creation response", async () => {
		const account = await createUserWithSession();

		const responses = await Promise.all([
			api()
				.post("/users/me/gift-offers/premium-trial-1m/claim")
				.set("Authorization", account.authorization)
				.send({}),
			api()
				.post("/users/me/gift-offers/premium-trial-1m/claim")
				.set("Authorization", account.authorization)
				.send({})
		]);

		assert.deepEqual(
			responses.map(response => response.status).sort(),
			[200, 201]
		);
		assert.equal(
			responses[0]!.body.data.grant.id,
			responses[1]!.body.data.grant.id
		);
		assert.equal(
			await PremiumGrant.count({
				where: {
					userId: account.user.id,
					offerCode: "premium-trial-1m"
				}
			}),
			1
		);
	});

	void it("activates full premium in the effective authentication state", async () => {
		const account = await createUserWithSession();
		const claimed = await api()
			.post("/users/me/gift-offers/premium-trial-1m/claim")
			.set("Authorization", account.authorization)
			.send({});
		assert.equal(claimed.status, 201);

		const me = await api()
			.get("/users/me")
			.set("Authorization", account.authorization);
		assert.equal(me.body.data.user.premiumAccess.active, true);
		assert.equal(me.body.data.user.premiumAccess.source, "full-grant");
		assert.equal(
			me.body.data.user.premiumAccess.expiresAt,
			claimed.body.data.grant.expiresAt
		);
	});

	void it("rejects an unknown offer", async () => {
		const account = await createUserWithSession();
		const response = await api()
			.post("/users/me/gift-offers/not-a-real-offer/claim")
			.set("Authorization", account.authorization)
			.send({});
		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GIFT_OFFER_NOT_FOUND");
	});

	void it("rejects an unnecessary trial for a premium account", async () => {
		const account = await createUserWithSession("premium");
		const response = await api()
			.post("/users/me/gift-offers/premium-trial-1m/claim")
			.set("Authorization", account.authorization)
			.send({});
		assert.equal(response.status, 409);
		assert.equal(response.body.type, "GIFT_OFFER_NOT_ELIGIBLE");
	});

	void it("does not let the client choose feature or expiration", async () => {
		const account = await createUserWithSession();
		const response = await api()
			.post("/users/me/gift-offers/json-export-trial-1m/claim")
			.set("Authorization", account.authorization)
			.send({ feature: "*", expiresAt: null });
		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		assert.equal(
			await PremiumGrant.count({ where: { userId: account.user.id } }),
			0
		);
	});

	void it("returns a revoked grant without reactivating it", async () => {
		const account = await createUserWithSession();
		const grant = await PremiumGrant.create({
			userId: account.user.id,
			feature: "export.json",
			expiresAt: new Date("2020-01-01T00:00:00.000Z"),
			offerCode: "json-export-trial-1m"
		});

		const response = await api()
			.post("/users/me/gift-offers/json-export-trial-1m/claim")
			.set("Authorization", account.authorization)
			.send({});
		assert.equal(response.status, 200);
		assert.equal(response.body.data.grant.id, grant.id);
		assert.ok(grant.expiresAt);
		assert.equal(
			response.body.data.grant.expiresAt,
			grant.expiresAt.toISOString()
		);

		const offers = await api()
			.get("/users/me/gift-offers")
			.set("Authorization", account.authorization);
		const offer = offers.body.data.offers.find(
			(candidate: { code: string }) =>
				candidate.code === "json-export-trial-1m"
		);
		assert.equal(offer.status, "used");
		assert.equal(offer.canActivate, false);
		assert.equal(offer.hasAccess, false);
	});
});
