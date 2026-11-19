import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { screen, within } from "@testing-library/angular";
import { type UserEvent } from "@testing-library/user-event";

import { type UserTag } from "../../../core/services/mood-tags.model";

const TAGS_LISTBOX_NAME = "Filter by your tags";

export function userTag(tag: string, usageCount: number): UserTag {
	return {
		tag,
		usageCount,
		description: null,
		favoriteOrder: null,
		icon: null,
		color: null
	};
}

export function hasEveryTag(
	entryTags: readonly string[] | undefined,
	moodTagsParam: string | null
) {
	const wanted = moodTagsParam?.split(",").filter(Boolean) ?? [];
	return wanted.every(tag => entryTags?.includes(tag));
}

export function queryTagsPicker() {
	return screen.queryByRole("button", { name: /^Tags:/ });
}

export function tagsPicker() {
	return screen.getByRole("button", { name: /^Tags:/ });
}

export function tagsList() {
	return within(screen.getByRole("listbox", { name: TAGS_LISTBOX_NAME }));
}

export async function openTagsPicker(user: Pick<UserEvent, "click">) {
	if (!screen.queryByRole("listbox", { name: TAGS_LISTBOX_NAME }))
		await user.click(tagsPicker());
	await screen.findByRole("listbox", { name: TAGS_LISTBOX_NAME });
}

export function tagOption(name: string) {
	return tagsList().getByRole("option", { name: new RegExp(`^${name}\\b`) });
}

export async function pickTags(
	user: Pick<UserEvent, "click">,
	...names: string[]
) {
	await openTagsPicker(user);
	for (const name of names) await user.click(tagOption(name));
}

export function urlMoodTags() {
	const url = new URL(TestBed.inject(Router).url, "http://app.test");
	return url.searchParams.get("mood_tags");
}
