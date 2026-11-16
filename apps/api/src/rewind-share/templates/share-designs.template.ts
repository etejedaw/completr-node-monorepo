import {
	REWIND_DESIGNS,
	type RewindDesign
} from "../../rewind-editions/rewind-editions.constants";
import {
	type ShareDesignCatalog,
	type ShareDesignTemplates
} from "../rewind-share-template.types";
import { OG_COVER_LIMIT, ogTemplate } from "./og.template";
import { STORY_COVER_LIMIT, storyTemplate } from "./story.template";
import {
	STORY_LIST_COVER_LIMIT,
	storyListTemplate
} from "./story-list.template";

const SHARE_DESIGNS: ShareDesignCatalog = {
	"2025": null,
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

export function shareDesignTemplates(
	design: string
): ShareDesignTemplates | null {
	return SHARE_DESIGNS[isKnownDesign(design) ? design : LATEST_DESIGN];
}

export function hasShareImages(design: string): boolean {
	return shareDesignTemplates(design) !== null;
}
