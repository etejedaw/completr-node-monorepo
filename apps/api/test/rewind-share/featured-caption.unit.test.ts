import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { box } from "../../src/rewind-share/templates/elements.template";
import { fanWithCaption } from "../../src/rewind-share/templates/featured-caption.template";
import { buildRewind } from "./rewind.fixture";

const FAN = box({});

void describe("fanWithCaption", () => {
	void it("adds the top rated caption when the front cover is the top rated game", () => {
		const rewind = buildRewind();
		const topRated = rewind.highlights.topRated;
		assert.ok(topRated);

		const children = fanWithCaption(
			rewind,
			[{ gameId: topRated.gameId, title: topRated.title, dataUri: null }],
			FAN,
			34
		);

		assert.equal(children.length, 2);
		assert.match(JSON.stringify(children[1]), /Top rated/);
	});

	void it("leaves the fan alone when the front cover is another game", () => {
		const rewind = buildRewind();

		const children = fanWithCaption(
			rewind,
			[{ gameId: "someone-else", title: "Other", dataUri: null }],
			FAN,
			34
		);

		assert.deepEqual(children, [FAN]);
	});

	void it("leaves the fan alone when the year has no top rated game", () => {
		const rewind = buildRewind();
		rewind.highlights.topRated = null;

		assert.deepEqual(fanWithCaption(rewind, [], FAN, 34), [FAN]);
	});
});
