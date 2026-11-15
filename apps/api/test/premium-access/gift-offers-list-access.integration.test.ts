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

const DAY_MS = 24 * 60 * 60 * 1000;

const OFFERED_FEATURES = [
	"lists.unlimited",
	"export.json",
	"rewind.premium",
	"*"
] as const;

async function createOffers() {
	await PremiumPromotion.bulkCreate(
		OFFERED_FEATURES.map((feature, index) => ({
			code: `access-offer-${index}`,
			feature,
			startsAt: new Date(Date.now() - DAY_MS),
			endsAt: new Date(Date.now() + 30 * DAY_MS)
		}))
	);
}

async function accessByFeature(authorization: string) {
	const response = await api()
		.get("/users/me/gift-offers")
		.set("Authorization", authorization);
	assert.equal(response.status, 200);
	return new Map(
		(
			response.body.data.offers as {
				feature: string;
				hasAccess: boolean;
			}[]
		).map(offer => [offer.feature, offer.hasAccess])
	);
}

void describe("GET /users/me/gift-offers access", () => {
	void it("marks access only for the features the account already holds", async () => {
		const account = await createUserWithSession();
		await createOffers();
		await PremiumGrant.create({
			userId: account.user.id,
			feature: "export.json",
			expiresAt: new Date(Date.now() + DAY_MS)
		});
		await PremiumGrant.create({
			userId: null,
			feature: "lists.unlimited",
			expiresAt: null
		});

		const access = await accessByFeature(account.authorization);

		assert.deepEqual(
			OFFERED_FEATURES.map(feature => access.get(feature)),
			[true, true, false, false]
		);
	});

	void it("marks every offer as accessible for a full premium grant", async () => {
		const account = await createUserWithSession();
		await createOffers();
		await PremiumGrant.create({
			userId: account.user.id,
			feature: "*",
			expiresAt: new Date(Date.now() + DAY_MS)
		});

		const access = await accessByFeature(account.authorization);

		assert.deepEqual(
			OFFERED_FEATURES.map(feature => access.get(feature)),
			[true, true, true, true]
		);
	});

	void it("ignores an expired grant", async () => {
		const account = await createUserWithSession();
		await createOffers();
		await PremiumGrant.create({
			userId: account.user.id,
			feature: "*",
			expiresAt: new Date(Date.now() - 1000)
		});

		const access = await accessByFeature(account.authorization);

		assert.ok([...access.values()].every(hasAccess => !hasAccess));
	});
});
