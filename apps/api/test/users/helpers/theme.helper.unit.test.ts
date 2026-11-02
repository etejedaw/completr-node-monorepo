import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";

import * as premiumAccessService from "../../../src/premium-access/premium-access.service";
import { THEME_CATALOG } from "../../../src/users/constants/theme.constants";
import {
	canUseTheme,
	getThemeTier
} from "../../../src/users/helpers/theme.helper";
import { stub } from "../../unit-helpers/mocks";

void describe("theme helper", () => {
	beforeEach(() => {
		THEME_CATALOG.push({ id: "gold-rush", tier: "premium" });
		stub(
			premiumAccessService,
			"resolvePremiumAccess",
			async (user: { role: string }) => ({
				allowed: user.role !== "user",
				source: user.role === "user" ? null : "role",
				expiresAt: null
			})
		);
	});

	afterEach(() => {
		THEME_CATALOG.pop();
		mock.restoreAll();
	});

	void it("returns the tier of a catalog theme and null for unknown ones", () => {
		assert.equal(getThemeTier("refined-dark"), "free");
		assert.equal(getThemeTier("gold-rush"), "premium");
		assert.equal(getThemeTier("ghost"), null);
	});

	void it("lets every role use free themes", async () => {
		assert.equal(
			await canUseTheme("refined-dark", { id: "user-1", role: "user" }),
			true
		);
	});

	void it("restricts premium themes to premium, moderator and admin", async () => {
		for (const role of ["user", "premium", "moderator", "admin"]) {
			assert.equal(
				await canUseTheme("gold-rush", { id: "user-1", role }),
				role !== "user"
			);
		}
	});

	void it("rejects unknown themes for every role", async () => {
		assert.equal(
			await canUseTheme("ghost", { id: "user-1", role: "admin" }),
			false
		);
	});
});
