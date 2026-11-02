import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { PREMIUM_FEATURES } from "../../src/premium-access/premium-access.constants";
import { PremiumGrant } from "../../src/premium-access/premium-grant.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";

useTestDatabase();

beforeEach(async () => {
	await PremiumGrant.destroy({ where: { userId: null } });
});

const FAR_FUTURE = new Date("2099-01-01T00:00:00.000Z");
const PAST = new Date("2020-01-01T00:00:00.000Z");

async function fetchPremiumFeatures(authorization: string) {
	const response = await api()
		.get("/users/me")
		.set("Authorization", authorization)
		.expect(200);
	return response.body.data.user.premiumFeatures as string[];
}

void describe("GET /users/me premiumFeatures", () => {
	void it("is empty for a free user without grants", async () => {
		const account = await createUserWithSession();

		assert.deepEqual(await fetchPremiumFeatures(account.authorization), []);
	});

	void it("lists every feature for a premium role", async () => {
		const account = await createUserWithSession("premium");

		assert.deepEqual(await fetchPremiumFeatures(account.authorization), [
			...PREMIUM_FEATURES
		]);
	});

	void it("lists only the individually granted feature", async () => {
		const account = await createUserWithSession();
		await PremiumGrant.create({
			userId: account.user.id,
			feature: "themes.premium",
			expiresAt: FAR_FUTURE
		});

		assert.deepEqual(await fetchPremiumFeatures(account.authorization), [
			"themes.premium"
		]);
	});

	void it("lists several granted features in catalog order", async () => {
		const account = await createUserWithSession();
		await PremiumGrant.bulkCreate([
			{
				userId: account.user.id,
				feature: "themes.premium",
				expiresAt: FAR_FUTURE
			},
			{
				userId: account.user.id,
				feature: "activity.feed-filters",
				expiresAt: null
			}
		]);

		assert.deepEqual(await fetchPremiumFeatures(account.authorization), [
			"activity.feed-filters",
			"themes.premium"
		]);
	});

	void it("omits an expired grant", async () => {
		const account = await createUserWithSession();
		await PremiumGrant.create({
			userId: account.user.id,
			feature: "themes.premium",
			expiresAt: PAST
		});

		assert.deepEqual(await fetchPremiumFeatures(account.authorization), []);
	});

	void it("keeps a valid grant when another one expired", async () => {
		const account = await createUserWithSession();
		await PremiumGrant.bulkCreate([
			{
				userId: account.user.id,
				feature: "themes.premium",
				expiresAt: PAST
			},
			{
				userId: account.user.id,
				feature: "export.json",
				expiresAt: FAR_FUTURE
			}
		]);

		assert.deepEqual(await fetchPremiumFeatures(account.authorization), [
			"export.json"
		]);
	});

	void it("lists every feature with a full grant", async () => {
		const account = await createUserWithSession();
		await PremiumGrant.create({
			userId: account.user.id,
			feature: "*",
			expiresAt: FAR_FUTURE
		});

		assert.deepEqual(await fetchPremiumFeatures(account.authorization), [
			...PREMIUM_FEATURES
		]);
	});

	void it("omits an expired full grant", async () => {
		const account = await createUserWithSession();
		await PremiumGrant.create({
			userId: account.user.id,
			feature: "*",
			expiresAt: PAST
		});

		assert.deepEqual(await fetchPremiumFeatures(account.authorization), []);
	});

	void it("does not leak another user's grants", async () => {
		const owner = await createUserWithSession();
		const other = await createUserWithSession();
		await PremiumGrant.bulkCreate([
			{
				userId: owner.user.id,
				feature: "*",
				expiresAt: FAR_FUTURE
			},
			{
				userId: owner.user.id,
				feature: "themes.premium",
				expiresAt: FAR_FUTURE
			}
		]);

		assert.deepEqual(await fetchPremiumFeatures(other.authorization), []);
	});

	void it("applies global feature grants to any user", async () => {
		const account = await createUserWithSession();
		await PremiumGrant.create({
			userId: null,
			feature: "export.json",
			expiresAt: FAR_FUTURE
		});

		assert.deepEqual(await fetchPremiumFeatures(account.authorization), [
			"export.json"
		]);
	});

	void it("stays consistent under concurrent and repeated requests", async () => {
		const account = await createUserWithSession();
		await PremiumGrant.create({
			userId: account.user.id,
			feature: "themes.premium",
			expiresAt: FAR_FUTURE
		});

		const responses = await Promise.all(
			Array.from({ length: 5 }, () =>
				fetchPremiumFeatures(account.authorization)
			)
		);

		for (const features of responses) {
			assert.deepEqual(features, ["themes.premium"]);
		}
	});

	void it("reflects a grant added between two requests", async () => {
		const account = await createUserWithSession();
		assert.deepEqual(await fetchPremiumFeatures(account.authorization), []);

		await PremiumGrant.create({
			userId: account.user.id,
			feature: "themes.premium",
			expiresAt: FAR_FUTURE
		});

		assert.deepEqual(await fetchPremiumFeatures(account.authorization), [
			"themes.premium"
		]);
	});

	void it("keeps the same shape in the PATCH response", async () => {
		const account = await createUserWithSession();
		await PremiumGrant.create({
			userId: account.user.id,
			feature: "themes.premium",
			expiresAt: FAR_FUTURE
		});

		const response = await api()
			.patch("/users/me")
			.set("Authorization", account.authorization)
			.send({ name: "Renamed" })
			.expect(200);

		assert.deepEqual(response.body.data.user.premiumFeatures, [
			"themes.premium"
		]);
	});
});
