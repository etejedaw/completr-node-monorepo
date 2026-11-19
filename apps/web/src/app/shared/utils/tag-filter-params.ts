import { type UserTag } from "../../core/services/mood-tags.model";
import { type UiPickerOption } from "../ui";
import { normalizeTag } from "./normalize-tag";
import { tagColorOf, tagIconOf } from "./tag-appearance";

export const MOOD_TAGS_PARAM = "mood_tags";
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

export function myTagOption(userTag: UserTag): UiPickerOption {
	return {
		value: userTag.tag,
		label: userTag.tag,
		icon: tagIconOf(userTag.icon),
		iconColor: tagColorOf(userTag.color),
		count: userTag.usageCount,
		hint: userTag.description ?? `On ${userTag.usageCount} of your games`
	};
}

export function myTagOptions(
	userTags: readonly UserTag[],
	selected: readonly string[]
): UiPickerOption[] {
	const known = [...userTags]
		.sort(
			(a, b) => b.usageCount - a.usageCount || a.tag.localeCompare(b.tag)
		)
		.map(myTagOption);
	const knownValues = new Set(known.map(option => option.value));
	const missingSelected = selected
		.filter(tag => !knownValues.has(tag))
		.map(tag => ({ value: tag, label: tag }));
	return [...missingSelected, ...known];
}
