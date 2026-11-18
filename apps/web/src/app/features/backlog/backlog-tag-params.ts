import { type PopularTag } from "../../core/services/mood-tags.model";
import { type UiChipOption } from "../../shared/ui";
import { normalizeTag } from "../../shared/utils/normalize-tag";

export const TAG_FILTER_LIMIT = 10;
const MAX_TAG_LENGTH = 40;

export function parseTagList(raw: string | null | undefined): string[] {
	if (!raw) return [];
	const tags = raw
		.split(",")
		.map(normalizeTag)
		.filter(tag => tag.length > 0 && tag.length <= MAX_TAG_LENGTH);
	return [...new Set(tags)].slice(0, TAG_FILTER_LIMIT);
}

export function joinTagList(tags: readonly string[]): string | null {
	return tags.length > 0 ? tags.join(",") : null;
}

export function myTagOption(
	tag: string,
	usageCount: number,
	description: string | null
): UiChipOption {
	return {
		value: tag,
		label: tag,
		count: usageCount,
		hint: description ?? `On ${usageCount} of your games`
	};
}

export function popularTagOption(popular: PopularTag): UiChipOption {
	return {
		value: popular.tag,
		label: popular.tag,
		hint: `Community tag on ${popular.games} ${popular.games === 1 ? "game" : "games"}`
	};
}
