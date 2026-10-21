import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { THEME_CATALOG } from "../../../src/users/constants/theme.constants";
import {
	canUseTheme,
	getThemeTier
} from "../../../src/users/helpers/theme.helper";

void describe("theme helper", () => {
	beforeEach(() => {
		THEME_CATALOG.push({ id: "gold-rush", tier: "premium" });
	});

	afterEach(() => {
		THEME_CATALOG.pop();
	});

	void it("returns the tier of a catalog theme and null for unknown ones", () => {
		assert.equal(getThemeTier("refined-dark"), "free");
		assert.equal(getThemeTier("gold-rush"), "premium");
		assert.equal(getThemeTier("ghost"), null);
	});

	void it("lets every role use free themes", () => {
		assert.equal(canUseTheme("refined-dark", "user"), true);
	});

	void it("restricts premium themes to premium, moderator and admin", () => {
		assert.equal(canUseTheme("gold-rush", "user"), false);
		assert.equal(canUseTheme("gold-rush", "premium"), true);
		assert.equal(canUseTheme("gold-rush", "moderator"), true);
		assert.equal(canUseTheme("gold-rush", "admin"), true);
	});

	void it("rejects unknown themes for every role", () => {
		assert.equal(canUseTheme("ghost", "admin"), false);
	});
});
