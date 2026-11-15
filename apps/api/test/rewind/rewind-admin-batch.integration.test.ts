import "./rewind-today-env.setup";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { PremiumGrant } from "../../src/premium-access/premium-grant.model";
import { Rewind } from "../../src/rewind/rewind.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { truncateAllTables, useTestDatabase } from "../helpers/database.helper";
import { createUser } from "../helpers/factories.helper";
import { countQueries } from "../helpers/query-counter.helper";

useTestDatabase();

beforeEach(truncateAllTables);

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

async function storeRewinds(count: number) {
	const kinds = ["premium", "gift", "full-grant", "none"] as const;
	const ids: string[] = [];
	for (let index = 0; index < count; index++) {
		const kind = kinds[index % kinds.length];
		const user = await createUser({
			role: kind === "premium" ? "premium" : "user"
		});
		if (kind === "gift" || kind === "full-grant")
			await PremiumGrant.create({
				userId: user.id,
				feature: kind === "gift" ? "rewind.premium" : "*",
				expiresAt: new Date(Date.now() + ONE_DAY_MS)
			});
		await Rewind.create({
			userId: user.id,
			year: 2026,
			language: "en",
			generatedAt: new Date("2026-12-02T10:00:00.000Z"),
			premiumAccessKind: null,
			regenerationsLeft: 0
		});
		ids.push(user.id);
	}
	return ids;
}

void describe("GET /admin/rewinds resolves the AI access in one query", () => {
	void it("keeps the query count flat as the page grows and keeps each access kind", async () => {
		const admin = await createUserWithSession("admin");
		const list = () =>
			api()
				.get("/admin/rewinds?year=2026")
				.set("Authorization", admin.authorization);

		await storeRewinds(2);
		const small = await countQueries(async () => {
			await list().expect(200);
		});

		await storeRewinds(10);
		const large = await countQueries(async () => {
			await list().expect(200);
		});

		assert.equal(large, small);
		const response = await list().expect(200);
		const accessKinds = new Set(
			response.body.data.rewinds.map(
				(row: { aiAccess: string }) => row.aiAccess
			)
		);
		assert.deepEqual([...accessKinds].sort(), ["gift", "none", "premium"]);
	});

	void it("answers parallel listings with the same result", async () => {
		const admin = await createUserWithSession("admin");
		await storeRewinds(6);

		const responses = await Promise.all(
			Array.from({ length: 5 }, () =>
				api()
					.get("/admin/rewinds?year=2026")
					.set("Authorization", admin.authorization)
			)
		);

		const bodies = responses.map(response => {
			assert.equal(response.status, 200);
			return JSON.stringify(response.body.data);
		});
		assert.equal(new Set(bodies).size, 1);
	});
});
