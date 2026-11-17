import { REWIND_RECAP_ROW_TAGS_LIMIT } from "../rewind-recap.constants";

export function joinRecapTags(tags: string[] | undefined): string | null {
	if (tags === undefined || tags.length === 0) return null;
	return tags.slice(0, REWIND_RECAP_ROW_TAGS_LIMIT).join("/");
}
