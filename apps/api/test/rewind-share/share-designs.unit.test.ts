import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { REWIND_DESIGNS } from "../../src/rewind-editions/rewind-editions.constants";
import {
	OG_COVER_LIMIT,
	ogTemplate
} from "../../src/rewind-share/templates/og.template";
import {
	hasShareImages,
	shareDesignTemplates
} from "../../src/rewind-share/templates/share-designs.template";
import {
	STORY_COVER_LIMIT,
	storyTemplate
} from "../../src/rewind-share/templates/story.template";
import {
	STORY_LIST_COVER_LIMIT,
	storyListTemplate
} from "../../src/rewind-share/templates/story-list.template";

void describe("shareDesignTemplates", () => {
	void it("maps the 2026 design to the current story, story list and og templates", () => {
		const templates = shareDesignTemplates("2026")!;

		assert.equal(templates.story.render, storyTemplate);
		assert.equal(templates.story.coverLimit, STORY_COVER_LIMIT);
		assert.equal(templates["story-list"].render, storyListTemplate);
		assert.equal(
			templates["story-list"].coverLimit,
			STORY_LIST_COVER_LIMIT
		);
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

	void it("has templates for every design that has share images", () => {
		for (const design of REWIND_DESIGNS.filter(hasShareImages)) {
			const templates = shareDesignTemplates(design)!;
			assert.equal(typeof templates.story.render, "function");
			assert.equal(typeof templates["story-list"].render, "function");
			assert.equal(typeof templates.og.render, "function");
		}
	});
});

void describe("hasShareImages", () => {
	void it("is false for the 2025 design and true for the 2026 design", () => {
		assert.equal(hasShareImages("2025"), false);
		assert.equal(hasShareImages("2026"), true);
	});

	void it("treats unknown or garbage keys like the latest design", () => {
		for (const design of [
			"1999",
			"",
			"../2025",
			"constructor",
			"__proto__",
			"toString"
		])
			assert.equal(hasShareImages(design), true, design);
	});

	void it("returns no templates for a design without share images", () => {
		assert.equal(shareDesignTemplates("2025"), null);
	});

	void it("agrees with shareDesignTemplates for every design", () => {
		for (const design of REWIND_DESIGNS)
			assert.equal(
				hasShareImages(design),
				shareDesignTemplates(design) !== null
			);
	});
});
