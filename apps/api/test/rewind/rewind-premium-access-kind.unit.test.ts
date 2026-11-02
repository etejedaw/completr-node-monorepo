import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hasPremiumContent } from "../../src/rewind/utils/has-premium-content.util";
import { resolveRewindPremiumAccessKind } from "../../src/rewind/utils/resolve-rewind-premium-access-kind.util";

const RECAP = {
	headline: "h",
	summary: "s",
	insights: [],
	funFact: "f",
	nextYearChallenge: "n"
};

const STATS = {
	hoursByMonth: [],
	tasteVsCritics: [],
	backlogFlow: [],
	genreShare: []
};

void describe("resolveRewindPremiumAccessKind", () => {
	void it("maps a feature grant to gift and a role or full grant to premium", () => {
		assert.equal(
			resolveRewindPremiumAccessKind({
				allowed: true,
				source: "feature-grant",
				expiresAt: "2027-01-31T00:00:00.000Z"
			}),
			"gift"
		);
		for (const source of ["role", "full-grant"] as const) {
			assert.equal(
				resolveRewindPremiumAccessKind({
					allowed: true,
					source,
					expiresAt: null
				}),
				"premium"
			);
		}
	});

	void it("answers null without access, whatever the source says", () => {
		assert.equal(
			resolveRewindPremiumAccessKind({
				allowed: false,
				source: null,
				expiresAt: null
			}),
			null
		);
		assert.equal(
			resolveRewindPremiumAccessKind({
				allowed: false,
				source: "feature-grant",
				expiresAt: null
			}),
			null
		);
	});
});

void describe("hasPremiumContent", () => {
	void it("counts a ready recap or stored premium stats", () => {
		assert.equal(
			hasPremiumContent({
				aiRecap: RECAP,
				aiRecapStatus: "ready",
				premiumStats: null
			}),
			true
		);
		assert.equal(
			hasPremiumContent({
				aiRecap: null,
				aiRecapStatus: "failed",
				premiumStats: STATS
			}),
			true
		);
	});

	void it("ignores a recap that is not ready and an empty row", () => {
		for (const aiRecapStatus of ["none", "pending", "failed"] as const) {
			assert.equal(
				hasPremiumContent({
					aiRecap: RECAP,
					aiRecapStatus,
					premiumStats: null
				}),
				false
			);
		}
		assert.equal(
			hasPremiumContent({
				aiRecap: null,
				aiRecapStatus: "ready",
				premiumStats: null
			}),
			false
		);
	});
});
