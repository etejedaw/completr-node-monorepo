import { DestroyRef, inject, type Signal, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { type Subscription } from "rxjs";

import { type Game } from "../../../core/models";
import { MoodTagsService } from "../../mood-tags/mood-tags";

export function injectGameMoodTags(game: Signal<Game | null>) {
	const moodTagsService = inject(MoodTagsService);
	const destroyRef = inject(DestroyRef);
	let suggestionsRequest: Subscription | null = null;
	destroyRef.onDestroy(() => suggestionsRequest?.unsubscribe());

	const tags = signal<string[]>([]);
	const draft = signal<string[]>([]);
	const suggestions = signal<string[]>([]);
	const editing = signal(false);
	const saving = signal(false);

	function showFor(loaded: Game) {
		tags.set(loaded.userMoodTags ?? []);
		editing.set(false);
		loadSuggestions();
	}

	function loadSuggestions() {
		suggestionsRequest?.unsubscribe();
		suggestionsRequest = moodTagsService
			.getMyTags()
			.subscribe(all => suggestions.set(all.map(item => item.tag)));
	}

	function startEdit() {
		draft.set([...tags()]);
		editing.set(true);
	}

	function cancelEdit() {
		editing.set(false);
	}

	function commit() {
		const current = game();
		if (!current || saving()) return;
		saving.set(true);
		moodTagsService
			.replaceGameTags(current.id, draft())
			.pipe(takeUntilDestroyed(destroyRef))
			.subscribe({
				next: saved => {
					tags.set(saved);
					editing.set(false);
					saving.set(false);
					loadSuggestions();
				},
				error: () => saving.set(false)
			});
	}

	return {
		tags,
		draft,
		suggestions,
		editing,
		saving,
		showFor,
		startEdit,
		cancelEdit,
		commit
	};
}
