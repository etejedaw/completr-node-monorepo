import { type UserTag } from "../../core/services/mood-tags.model";
import { type UiPickerOption } from "../../shared/ui";
import { normalizeTag } from "../../shared/utils/normalize-tag";
import { tagColorOf, tagIconOf } from "../../shared/utils/tag-appearance";

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
