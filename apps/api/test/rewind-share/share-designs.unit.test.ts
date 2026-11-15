import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { REWIND_DESIGNS } from "../../src/rewind-editions/rewind-editions.constants";
import {
	OG_COVER_LIMIT,
	ogTemplate
} from "../../src/rewind-share/templates/og.template";
import { shareDesignTemplates } from "../../src/rewind-share/templates/share-designs.template";
import {
	STORY_COVER_LIMIT,
	storyTemplate
} from "../../src/rewind-share/templates/story.template";

void describe("shareDesignTemplates", () => {
	void it("maps the 2026 design to the current story and og templates", () => {
		const templates = shareDesignTemplates("2026");

		assert.equal(templates.story.render, storyTemplate);
		assert.equal(templates.story.coverLimit, STORY_COVER_LIMIT);
		assert.equal(templates.og.render, ogTemplate);
		assert.equal(templates.og.coverLimit, OG_COVER_LIMIT);
	});

	void it("falls back to the latest design for unknown or garbage keys", () => {
		const latest = shareDesignTemplates(REWIND_DESIGNS.at(-1)!);

		for (const design of [
			"1999",
			"",
			"../2026",
			"constructor",
			"__proto__"
		])
			assert.equal(shareDesignTemplates(design), latest);
	});

	void it("has templates for every design", () => {
		for (const design of REWIND_DESIGNS) {
			const templates = shareDesignTemplates(design);
			assert.equal(typeof templates.story.render, "function");
			assert.equal(typeof templates.og.render, "function");
		}
	});
});
