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

const SHARE_DESIGNS: ShareDesignCatalog = {
	"2026": {
		story: { coverLimit: STORY_COVER_LIMIT, render: storyTemplate },
		og: { coverLimit: OG_COVER_LIMIT, render: ogTemplate }
	}
};

const LATEST_DESIGN = REWIND_DESIGNS[REWIND_DESIGNS.length - 1]!;

function isKnownDesign(design: string): design is RewindDesign {
	return (REWIND_DESIGNS as readonly string[]).includes(design);
}

export function shareDesignTemplates(design: string): ShareDesignTemplates {
	return SHARE_DESIGNS[isKnownDesign(design) ? design : LATEST_DESIGN];
}
