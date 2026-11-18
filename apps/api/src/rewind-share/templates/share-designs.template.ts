import {
	REWIND_DESIGNS,
	type RewindDesign
} from "../../rewind-editions/rewind-editions.constants";
import { type RewindImageFormat } from "../rewind-share.constants";
import { type ShareFormatTemplate } from "../rewind-share-template.interface";
import { type ShareDesignCatalog } from "../rewind-share-template.types";
import { OG_COVER_LIMIT, ogTemplate } from "./og.template";
import { OG_2025_COVER_LIMIT, og2025Template } from "./og-2025.template";
import { STORY_COVER_LIMIT, storyTemplate } from "./story.template";
import {
	STORY_LIST_COVER_LIMIT,
	storyListTemplate
} from "./story-list.template";

const SHARE_DESIGNS: ShareDesignCatalog = {
	"2025": {
		og: { coverLimit: OG_2025_COVER_LIMIT, render: og2025Template }
	},
	"2026": {
		story: { coverLimit: STORY_COVER_LIMIT, render: storyTemplate },
		"story-list": {
			coverLimit: STORY_LIST_COVER_LIMIT,
			render: storyListTemplate
		},
		og: { coverLimit: OG_COVER_LIMIT, render: ogTemplate }
	}
};

const LATEST_DESIGN = REWIND_DESIGNS[REWIND_DESIGNS.length - 1]!;

function isKnownDesign(design: string): design is RewindDesign {
	return (REWIND_DESIGNS as readonly string[]).includes(design);
}

export function shareFormatTemplate(
	design: string,
	format: RewindImageFormat
): ShareFormatTemplate | null {
	const formats = SHARE_DESIGNS[isKnownDesign(design) ? design : LATEST_DESIGN];
	return formats[format] ?? null;
}

export function hasShareImage(
	design: string,
	format: RewindImageFormat
): boolean {
	return shareFormatTemplate(design, format) !== null;
}
