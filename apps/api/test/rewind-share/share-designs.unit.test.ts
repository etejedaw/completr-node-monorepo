import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { REWIND_DESIGNS } from "../../src/rewind-editions/rewind-editions.constants";
import { SHARE_IMAGE_SIZES } from "../../src/rewind-share/rewind-share.constants";
import {
	OG_COVER_LIMIT,
	ogTemplate
} from "../../src/rewind-share/templates/og.template";
import {
	OG_2025_COVER_LIMIT,
	og2025Template
} from "../../src/rewind-share/templates/og-2025.template";
import {
	hasShareImage,
	shareFormatTemplate
} from "../../src/rewind-share/templates/share-designs.template";
import {
	STORY_COVER_LIMIT,
	storyTemplate
} from "../../src/rewind-share/templates/story.template";
import {
	STORY_LIST_COVER_LIMIT,
	storyListTemplate
} from "../../src/rewind-share/templates/story-list.template";

const FORMATS = Object.keys(SHARE_IMAGE_SIZES) as (keyof typeof SHARE_IMAGE_SIZES)[];
const GARBAGE_DESIGNS = [
	"1999",
	"",
	" 2025",
	"2025 ",
	"../2025",
	"constructor",
	"__proto__",
	"toString",
	"hasOwnProperty"
];

void describe("shareFormatTemplate", () => {
	void it("maps the 2026 design to the story, story list and og templates", () => {
		assert.deepEqual(shareFormatTemplate("2026", "story"), {
			coverLimit: STORY_COVER_LIMIT,
			render: storyTemplate
		});
		assert.deepEqual(shareFormatTemplate("2026", "story-list"), {
			coverLimit: STORY_LIST_COVER_LIMIT,
			render: storyListTemplate
		});
		assert.deepEqual(shareFormatTemplate("2026", "og"), {
			coverLimit: OG_COVER_LIMIT,
			render: ogTemplate
		});
	});

	void it("gives the 2025 design its own og template and no story templates", () => {
		assert.deepEqual(shareFormatTemplate("2025", "og"), {
			coverLimit: OG_2025_COVER_LIMIT,
			render: og2025Template
		});
		assert.equal(shareFormatTemplate("2025", "story"), null);
		assert.equal(shareFormatTemplate("2025", "story-list"), null);
	});

	void it("never hands the 2025 og template to another design", () => {
		for (const design of REWIND_DESIGNS.filter(key => key !== "2025"))
			assert.notEqual(
				shareFormatTemplate(design, "og")?.render,
				og2025Template,
				design
			);
	});

	void it("falls back to the latest design for unknown or garbage keys, format by format", () => {
		const latest = REWIND_DESIGNS.at(-1)!;

		for (const design of GARBAGE_DESIGNS)
			for (const format of FORMATS)
				assert.equal(
					shareFormatTemplate(design, format),
					shareFormatTemplate(latest, format),
					`${design}:${format}`
				);
	});
});

void describe("hasShareImage", () => {
	void it("allows only the og image for 2025 and every format for 2026", () => {
		assert.equal(hasShareImage("2025", "og"), true);
		assert.equal(hasShareImage("2025", "story"), false);
		assert.equal(hasShareImage("2025", "story-list"), false);
		for (const format of FORMATS)
			assert.equal(hasShareImage("2026", format), true, format);
	});

	void it("treats unknown or garbage keys like the latest design", () => {
		for (const design of GARBAGE_DESIGNS)
			for (const format of FORMATS)
				assert.equal(
					hasShareImage(design, format),
					true,
					`${design}:${format}`
				);
	});

	void it("agrees with shareFormatTemplate for every design and format", () => {
		for (const design of [...REWIND_DESIGNS, ...GARBAGE_DESIGNS])
			for (const format of FORMATS)
				assert.equal(
					hasShareImage(design, format),
					shareFormatTemplate(design, format) !== null,
					`${design}:${format}`
				);
	});

	void it("gives every design a link preview image", () => {
		for (const design of REWIND_DESIGNS)
			assert.equal(hasShareImage(design, "og"), true, design);
	});
});
