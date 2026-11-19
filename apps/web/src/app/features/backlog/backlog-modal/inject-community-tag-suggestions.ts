import { computed, DestroyRef, inject, signal } from "@angular/core";
import { catchError, of, type Subscription } from "rxjs";

import { MoodTagsService } from "../../../core/services/mood-tags";
import {
	type CommunityTagSuggestionsOptions,
	type LoadedCommunityTags
} from "./inject-community-tag-suggestions.model";

const SUGGESTIONS_SHOWN = 8;

export function injectCommunityTagSuggestions(
	options: CommunityTagSuggestionsOptions
) {
	const moodTagsService = inject(MoodTagsService);
	const loaded = signal<LoadedCommunityTags | null>(null);
	let request: Subscription | undefined;
	inject(DestroyRef).onDestroy(() => request?.unsubscribe());

	const suggestions = computed(() => {
		const current = loaded();
		if (!current || current.gameId !== options.gameId()) return [];
		return current.tags
			.filter(item => item.players > 0)
			.slice(0, SUGGESTIONS_SHOWN);
	});

	const load = (gameId: string) => {
		request?.unsubscribe();
		loaded.set(null);
		request = moodTagsService
			.getCommunityTags(gameId)
			.pipe(catchError(() => of([])))
			.subscribe(tags => loaded.set({ gameId, tags }));
	};

	return { suggestions, load };
}
