import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type Platform } from "../../src/platforms/platform.model";
import { platformSerializer } from "../../src/platforms/platform.serializer";
import { asModel } from "../unit-helpers/as-model";

void describe("platformSerializer", () => {
	void it("exposes the public catalog fields only", () => {
		const platform = asModel<Platform>({
			id: "p-1",
			name: "PlayStation 5",
			code: "ps5",
			abbreviation: "PS5",
			description: "Console",
			manufacturer: "Sony",
			generation: 9,
			logoUrl: null,
			releaseAt: new Date("2020-11-12"),
			updatedAt: new Date("2024-01-01"),
			createdAt: new Date("2023-01-01")
		});

		const result = platformSerializer(platform);

		assert.equal("createdAt" in result, false);
		assert.deepEqual(Object.keys(result).sort(), [
			"abbreviation",
			"code",
			"description",
			"generation",
			"id",
			"logoUrl",
			"manufacturer",
			"name",
			"releaseAt",
			"updatedAt"
		]);
	});
});
