import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { PremiumGrant } from "../../src/premium-access/premium-grant.model";
import { PremiumPromotion } from "../../src/premium-access/premium-promotion.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";

useTestDatabase();

afterEach(async () => {
	await PremiumGrant.destroy({ where: {} });
	await PremiumPromotion.destroy({ where: {} });
});

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

interface OfferBody {
	code: string;
	feature: string;
	durationDays: number | null;
	availableFrom: string | null;
	availableUntil: string | null;
	status: string;
	expiresAt: string | null;
	canActivate: boolean;
	hasAccess: boolean;
}

let promotionSequence = 0;

function createPromotion(
	options: {
		code?: string;
		feature?: "lists.unlimited" | "rewind.premium" | "*";
		startsInDays?: number;
		endsInDays?: number;
	} = {}
) {
	promotionSequence += 1;
	return PremiumPromotion.create({
		code: options.code ?? `launch-gift-${promotionSequence}`,
		feature: options.feature ?? "lists.unlimited",
		startsAt: new Date(Date.now() + (options.startsInDays ?? -1) * DAY_MS),
		endsAt: new Date(Date.now() + (options.endsInDays ?? 30) * DAY_MS)
	});
}

async function listOffers(authorization: string) {
	const response = await api()
		.get("/users/me/gift-offers")
		.set("Authorization", authorization);
	assert.equal(response.status, 200);
	return response.body.data.offers as OfferBody[];
}

function claim(authorization: string, code: string) {
	return api()
		.post(`/users/me/gift-offers/${code}/claim`)
		.set("Authorization", authorization)
		.send({});
}

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
		assert.equal(jsonOffer.availableFrom, null);
		assert.equal(jsonOffer.availableUntil, null);
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
		assert.equal(response.body.data.grant, undefined);
		assert.equal(response.body.data.offer.code, "json-export-trial-1m");
		assert.equal(response.body.data.offer.feature, "export.json");
		assert.equal(response.body.data.offer.status, "active");
		assert.equal(response.body.data.offer.hasAccess, true);
		const grant = await PremiumGrant.findOne({
			where: {
				userId: account.user.id,
				offerCode: "json-export-trial-1m"
			}
		});
		assert.ok(grant?.expiresAt);
		assert.equal(
			response.body.data.offer.expiresAt,
			grant.expiresAt.toISOString()
		);
		const expiresAt = grant.expiresAt.getTime();
		assert.ok(expiresAt >= before + ONE_MONTH_MS);
		assert.ok(expiresAt <= Date.now() + ONE_MONTH_MS);
	});

	void it("repeats a claim idempotently without extending its expiration", async () => {
		const account = await createUserWithSession();
		const first = await api()
			.post("/users/me/gift-offers/json-export-trial-1m/claim")
			.set("Authorization", account.authorization)
			.send({});
		const firstExpiration = first.body.data.offer.expiresAt;

		const second = await api()
			.post("/users/me/gift-offers/json-export-trial-1m/claim")
			.set("Authorization", account.authorization)
			.send({});

		assert.equal(second.status, 200);
		assert.equal(second.body.data.created, false);
		assert.equal(second.body.data.offer.status, "active");
		assert.equal(second.body.data.offer.expiresAt, firstExpiration);
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
			responses[0]!.body.data.offer.expiresAt,
			responses[1]!.body.data.offer.expiresAt
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
			claimed.body.data.offer.expiresAt
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
		assert.equal(response.body.data.created, false);
		assert.equal(response.body.data.offer.status, "used");
		assert.equal(response.body.data.offer.canActivate, false);
		assert.equal(response.body.data.offer.hasAccess, false);
		assert.ok(grant.expiresAt);
		assert.equal(
			response.body.data.offer.expiresAt,
			grant.expiresAt.toISOString()
		);
		assert.equal(
			await PremiumGrant.count({ where: { userId: account.user.id } }),
			1
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

void describe("gift offers backed by premium promotions", () => {
	void it("lists an active promotion next to the static offers with its fixed window", async () => {
		const account = await createUserWithSession();
		const promotion = await createPromotion({ code: "lists-gift" });

		const offers = await listOffers(account.authorization);

		const codes = offers.map(offer => offer.code);
		assert.deepEqual(codes.slice(0, 2), [
			"json-export-trial-1m",
			"premium-trial-1m"
		]);
		assert.ok(codes.includes("lists-gift"));
		const offer = offers.find(
			candidate => candidate.code === "lists-gift"
		)!;
		assert.equal(offer.feature, "lists.unlimited");
		assert.equal(offer.durationDays, null);
		assert.equal(offer.availableFrom, promotion.startsAt.toISOString());
		assert.equal(offer.availableUntil, promotion.endsAt.toISOString());
		assert.equal(offer.status, "available");
		assert.equal(offer.canActivate, true);
		assert.equal(offer.hasAccess, false);
		assert.equal(offer.expiresAt, null);
	});

	void it("does not reveal promotions that have not started, answering claims as an unknown code", async () => {
		const account = await createUserWithSession();
		await createPromotion({
			code: "scheduled-gift",
			startsInDays: 2,
			endsInDays: 9
		});

		const offers = await listOffers(account.authorization);

		assert.equal(
			offers.some(offer => offer.code === "scheduled-gift"),
			false
		);
		const response = await claim(account.authorization, "scheduled-gift");
		const unknown = await claim(account.authorization, "unknown-gift");
		assert.equal(response.status, 404);
		assert.equal(response.body.type, "GIFT_OFFER_NOT_FOUND");
		assert.equal(response.body.title, unknown.body.title);
		assert.equal(await PremiumGrant.count(), 0);
	});

	void it("omits ended promotions unless the user claimed them", async () => {
		const claimant = await createUserWithSession();
		const bystander = await createUserWithSession();
		const promotion = await createPromotion({
			code: "ending-gift",
			endsInDays: 5
		});
		assert.equal(
			(await claim(claimant.authorization, "ending-gift")).status,
			201
		);
		await promotion.update({
			startsAt: new Date(Date.now() - 3 * DAY_MS),
			endsAt: new Date(Date.now() - 1000)
		});
		await PremiumGrant.update(
			{ expiresAt: promotion.endsAt },
			{ where: { offerCode: "ending-gift" } }
		);

		const claimantOffers = await listOffers(claimant.authorization);
		const bystanderOffers = await listOffers(bystander.authorization);

		const used = claimantOffers.find(offer => offer.code === "ending-gift");
		assert.equal(used?.status, "used");
		assert.equal(used?.canActivate, false);
		assert.equal(used?.hasAccess, false);
		assert.equal(
			bystanderOffers.some(offer => offer.code === "ending-gift"),
			false
		);
		const lateClaim = await claim(bystander.authorization, "ending-gift");
		assert.equal(lateClaim.status, 409);
		assert.equal(lateClaim.body.type, "GIFT_OFFER_NOT_ELIGIBLE");
	});

	void it("claims during the window and expires the grant at the common end date", async () => {
		const account = await createUserWithSession();
		const promotion = await createPromotion({
			code: "common-end-gift",
			endsInDays: 12
		});

		const response = await claim(account.authorization, "common-end-gift");

		assert.equal(response.status, 201);
		assert.equal(response.body.data.created, true);
		assert.equal(response.body.data.offer.status, "active");
		assert.equal(response.body.data.offer.hasAccess, true);
		assert.equal(
			response.body.data.offer.expiresAt,
			promotion.endsAt.toISOString()
		);
		const grant = await PremiumGrant.findOne({
			where: { userId: account.user.id, offerCode: "common-end-gift" }
		});
		assert.equal(grant?.feature, "lists.unlimited");
		assert.equal(
			grant?.expiresAt?.toISOString(),
			promotion.endsAt.toISOString()
		);
		const listed = (await listOffers(account.authorization)).find(
			offer => offer.code === "common-end-gift"
		);
		assert.equal(listed?.status, "active");
		assert.equal(listed?.expiresAt, promotion.endsAt.toISOString());
	});

	void it("grants only the promoted feature and nothing before the claim", async () => {
		const account = await createUserWithSession();
		await createPromotion({
			code: "rewind-gift",
			feature: "rewind.premium"
		});
		const before = await listOffers(account.authorization);
		assert.equal(
			before.find(offer => offer.code === "rewind-gift")?.hasAccess,
			false
		);
		assert.equal(await PremiumGrant.count(), 0);

		await claim(account.authorization, "rewind-gift");

		const after = await listOffers(account.authorization);
		const byCode = new Map(after.map(offer => [offer.code, offer]));
		assert.equal(byCode.get("rewind-gift")?.hasAccess, true);
		assert.equal(byCode.get("json-export-trial-1m")?.hasAccess, false);
		assert.equal(byCode.get("json-export-trial-1m")?.status, "available");
	});

	void it("repeats a promotion claim without a second grant or a longer expiration", async () => {
		const account = await createUserWithSession();
		await createPromotion({ code: "repeat-gift" });
		const first = await claim(account.authorization, "repeat-gift");

		const second = await claim(account.authorization, "repeat-gift");
		const third = await claim(account.authorization, "repeat-gift");

		assert.equal(second.status, 200);
		assert.equal(third.status, 200);
		assert.equal(second.body.data.created, false);
		assert.equal(
			second.body.data.offer.expiresAt,
			first.body.data.offer.expiresAt
		);
		assert.equal(
			await PremiumGrant.count({
				where: { userId: account.user.id, offerCode: "repeat-gift" }
			}),
			1
		);
	});

	void it("marks promotions not eligible for accounts that already have the feature", async () => {
		const premium = await createUserWithSession("premium");
		const subscriber = await createUserWithSession();
		await PremiumGrant.create({
			userId: subscriber.user.id,
			feature: "lists.unlimited",
			expiresAt: new Date(Date.now() + 10 * DAY_MS)
		});
		await createPromotion({ code: "redundant-gift" });

		const premiumOffer = (await listOffers(premium.authorization)).find(
			offer => offer.code === "redundant-gift"
		);
		const grantedOffer = (await listOffers(subscriber.authorization)).find(
			offer => offer.code === "redundant-gift"
		);

		assert.equal(premiumOffer?.status, "not-eligible");
		assert.equal(grantedOffer?.status, "not-eligible");
		assert.equal(grantedOffer?.canActivate, false);
		const response = await claim(premium.authorization, "redundant-gift");
		assert.equal(response.status, 409);
		assert.equal(response.body.type, "GIFT_OFFER_NOT_ELIGIBLE");
		const grantResponse = await claim(
			subscriber.authorization,
			"redundant-gift"
		);
		assert.equal(grantResponse.status, 409);
		assert.equal(
			await PremiumGrant.count({
				where: { offerCode: "redundant-gift" }
			}),
			0
		);
	});

	void it("answers 404 for promotion codes that do not exist and 422 for garbage input", async () => {
		const account = await createUserWithSession();
		await createPromotion({ code: "real-gift" });

		const missing = await claim(account.authorization, "ghost-gift");
		const shouting = await claim(account.authorization, "REAL-GIFT");
		const withBody = await api()
			.post("/users/me/gift-offers/real-gift/claim")
			.set("Authorization", account.authorization)
			.send({ expiresAt: "2099-01-01T00:00:00.000Z" });

		assert.equal(missing.status, 404);
		assert.equal(missing.body.type, "GIFT_OFFER_NOT_FOUND");
		assert.equal(shouting.status, 422);
		assert.equal(withBody.status, 422);
		assert.equal(await PremiumGrant.count(), 0);
	});

	void it("resolves repeated concurrent claims by one user to a single grant", async () => {
		const account = await createUserWithSession();
		await createPromotion({ code: "double-click-gift" });

		const responses = await Promise.all(
			Array.from({ length: 6 }, () =>
				claim(account.authorization, "double-click-gift")
			)
		);

		const statuses = responses.map(response => response.status).sort();
		assert.deepEqual(statuses, [200, 200, 200, 200, 200, 201]);
		assert.ok(
			responses.every(
				response => response.body.data.offer.status === "active"
			)
		);
		assert.equal(
			await PremiumGrant.count({
				where: {
					userId: account.user.id,
					offerCode: "double-click-gift"
				}
			}),
			1
		);
	});

	void it("lets many users claim the same promotion concurrently, once each", async () => {
		const accounts = await Promise.all(
			Array.from({ length: 5 }, () => createUserWithSession())
		);
		await createPromotion({ code: "crowd-gift" });

		const responses = await Promise.all(
			accounts.flatMap(account => [
				claim(account.authorization, "crowd-gift"),
				claim(account.authorization, "crowd-gift")
			])
		);

		assert.equal(
			responses.filter(response => response.status === 201).length,
			5
		);
		assert.equal(
			responses.filter(response => response.status === 200).length,
			5
		);
		assert.equal(
			await PremiumGrant.count({ where: { offerCode: "crowd-gift" } }),
			5
		);
	});

	void it("never lets a grant survive a promotion revoked during the claim", async () => {
		const admin = await createUserWithSession("admin");
		for (let attempt = 0; attempt < 6; attempt += 1) {
			const account = await createUserWithSession();
			const promotion = await createPromotion({
				code: `racing-gift-${attempt}`
			});

			const [claimResponse, revokeResponse] = await Promise.all([
				claim(account.authorization, promotion.code),
				api()
					.post(`/admin/premium-promotions/${promotion.id}/revoke`)
					.set("Authorization", admin.authorization)
			]);

			assert.equal(revokeResponse.status, 200);
			assert.ok([201, 409].includes(claimResponse.status));
			const grant = await PremiumGrant.findOne({
				where: { userId: account.user.id, offerCode: promotion.code }
			});
			if (grant) {
				assert.ok(grant.expiresAt);
				assert.ok(grant.expiresAt.getTime() <= Date.now());
			} else {
				assert.equal(claimResponse.status, 409);
			}
			const offer = (await listOffers(account.authorization)).find(
				candidate => candidate.code === promotion.code
			);
			assert.notEqual(offer?.status, "active");
			assert.equal(offer?.hasAccess ?? false, false);
		}
	});

	void it("reports a claimed promotion as used, not active, after it is revoked", async () => {
		const admin = await createUserWithSession("admin");
		const account = await createUserWithSession();
		const bystander = await createUserWithSession();
		const promotion = await createPromotion({ code: "revoked-gift" });
		assert.equal(
			(await claim(account.authorization, "revoked-gift")).status,
			201
		);
		const revoke = await api()
			.post(`/admin/premium-promotions/${promotion.id}/revoke`)
			.set("Authorization", admin.authorization);
		assert.equal(revoke.status, 200);

		const repeated = await claim(account.authorization, "revoked-gift");
		const lateClaim = await claim(bystander.authorization, "revoked-gift");

		assert.equal(repeated.status, 200);
		assert.equal(repeated.body.data.created, false);
		assert.equal(repeated.body.data.offer.status, "used");
		assert.equal(repeated.body.data.offer.canActivate, false);
		assert.equal(repeated.body.data.offer.hasAccess, false);
		assert.equal(lateClaim.status, 409);
		assert.equal(lateClaim.body.type, "GIFT_OFFER_NOT_ELIGIBLE");
		const listed = (await listOffers(account.authorization)).find(
			offer => offer.code === "revoked-gift"
		);
		assert.equal(listed?.status, "used");
		assert.equal(
			(await listOffers(bystander.authorization)).some(
				offer => offer.code === "revoked-gift"
			),
			false
		);
	});

	void it("follows an extended promotion end date for already claimed grants", async () => {
		const admin = await createUserWithSession("admin");
		const account = await createUserWithSession();
		const promotion = await createPromotion({
			code: "extended-gift",
			endsInDays: 5
		});
		await claim(account.authorization, "extended-gift");
		const newEnd = new Date(Date.now() + 40 * DAY_MS).toISOString();
		const patch = await api()
			.patch(`/admin/premium-promotions/${promotion.id}`)
			.set("Authorization", admin.authorization)
			.send({ endsAt: newEnd });
		assert.equal(patch.status, 200);

		const offer = (await listOffers(account.authorization)).find(
			candidate => candidate.code === "extended-gift"
		);

		assert.equal(offer?.status, "active");
		assert.equal(offer?.expiresAt, newEnd);
		assert.equal(offer?.availableUntil, newEnd);
	});
});
