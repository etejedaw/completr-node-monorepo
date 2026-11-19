import { computed, DestroyRef, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router } from "@angular/router";

import { MoodTagsService } from "../../core/services/mood-tags";
import { type UserTag } from "../../core/services/mood-tags.model";
import { ToastService } from "../../core/services/toast";
import {
	type MyTagFilterOptions,
	type MyTagFilterState
} from "./inject-my-tag-filter.model";
import { sameTagSet } from "./inject-tag-list-sync";
import {
	joinTagList,
	MOOD_TAGS_PARAM,
	myTagOptions,
	parseTagList,
	TAG_FILTER_LIMIT
} from "./tag-filter-params";

export function injectMyTagFilter({
	changed
}: MyTagFilterOptions): MyTagFilterState {
	const route = inject(ActivatedRoute);
	const router = inject(Router);
	const toast = inject(ToastService);
	const destroyRef = inject(DestroyRef);

	const rawUrlTags = route.snapshot.queryParamMap.get(MOOD_TAGS_PARAM);
	const userTags = signal<readonly UserTag[]>([]);
	const selected = signal<readonly string[]>(parseTagList(rawUrlTags));
	let urlWritesInFlight = 0;

	const writeUrl = (tags: readonly string[]) => {
		urlWritesInFlight++;
		void router
			.navigate([], {
				relativeTo: route,
				queryParams: { [MOOD_TAGS_PARAM]: joinTagList(tags) },
				queryParamsHandling: "merge",
				replaceUrl: true
			})
			.finally(() => urlWritesInFlight--);
	};

	const apply = (tags: readonly string[]) => {
		selected.set(tags);
		writeUrl(tags);
	};

	const select = (tags: readonly string[]) => {
		if (tags.length > TAG_FILTER_LIMIT) {
			toast.warning(
				`You can filter by up to ${TAG_FILTER_LIMIT} tags at a time.`
			);
			selected.set([...selected()]);
			return;
		}
		if (sameTagSet(tags, selected())) return;
		apply([...tags]);
		changed();
	};

	const clearSilently = () => {
		if (selected().length === 0) return;
		apply([]);
	};

	if (rawUrlTags !== null && rawUrlTags !== joinTagList(selected()))
		writeUrl(selected());

	route.queryParamMap
		.pipe(takeUntilDestroyed(destroyRef))
		.subscribe(params => {
			if (urlWritesInFlight > 0) return;
			const tags = parseTagList(params.get(MOOD_TAGS_PARAM));
			if (sameTagSet(tags, selected())) return;
			selected.set(tags);
			changed();
		});

	inject(MoodTagsService)
		.getMyTags()
		.pipe(takeUntilDestroyed(destroyRef))
		.subscribe({
			next: tags => userTags.set(tags),
			error: () => userTags.set([])
		});

	return {
		options: computed(() => myTagOptions(userTags(), selected())),
		selected: selected.asReadonly(),
		active: computed(() => selected().length > 0),
		param: computed(() => joinTagList(selected()) ?? undefined),
		select,
		clearSilently
	};
}
