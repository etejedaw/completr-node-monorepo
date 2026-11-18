import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	inject,
	input,
	linkedSignal,
	output,
	signal
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
	catchError,
	debounceTime,
	distinctUntilChanged,
	map,
	of,
	Subject,
	switchMap
} from "rxjs";

import { UiEyebrow, UiFieldError, UiInput } from "../../../../shared/ui";
import { MoodTagsService } from "../../../mood-tags/mood-tags";
import {
	MAX_TAG_LENGTH,
	TAG_SEARCH_MAX_LENGTH
} from "../../../mood-tags/mood-tags.constants";
import { type PopularTag } from "../../../mood-tags/mood-tags.model";
import { normalizeTag } from "../../../mood-tags/normalize-tag";
import {
	type GameTagSearchResult,
	type GameTagSuggestion
} from "./game-tags.model";

const TAG_SEARCH_DEBOUNCE_MS = 250;
const SUGGESTIONS_SHOWN = 8;
const POPULAR_TAGS_REQUESTED = 20;

let nextInputId = 0;

@Component({
	selector: "app-game-tag-input",
	imports: [UiEyebrow, UiFieldError, UiInput],
	templateUrl: "./game-tag-input.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameTagInput {
	readonly taken = input<readonly string[]>([]);
	readonly disabled = input(false);
	readonly tagPicked = output<string>();

	private readonly moodTagsService = inject(MoodTagsService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly searches = new Subject<string>();
	private popularRequested = false;

	protected readonly inputId = `game-tag-input-${nextInputId++}`;
	protected readonly listboxId = `${this.inputId}-listbox`;
	protected readonly errorId = `${this.inputId}-error`;
	protected readonly maxLength = MAX_TAG_LENGTH;
	protected readonly query = signal("");
	protected readonly open = signal(false);
	private readonly popular = signal<PopularTag[]>([]);
	private readonly searchResult = signal<GameTagSearchResult | null>(null);

	protected readonly normalizedQuery = computed(() =>
		normalizeTag(this.query())
	);
	protected readonly tooLong = computed(
		() => this.normalizedQuery().length > MAX_TAG_LENGTH
	);
	protected readonly alreadyTagged = computed(() =>
		this.taken().includes(this.normalizedQuery())
	);

	protected readonly suggestions = computed<GameTagSuggestion[]>(() => {
		const query = this.normalizedQuery();
		const taken = new Set(this.taken());
		if (!query)
			return this.popular()
				.filter(item => !taken.has(item.tag))
				.slice(0, SUGGESTIONS_SHOWN)
				.map(item => ({
					tag: item.tag,
					games: item.games,
					isNew: false
				}));
		if (this.tooLong()) return [];
		const result = this.searchResult();
		const found = result?.query === query ? result.tags : [];
		const matches = found
			.filter(item => !taken.has(item.tag))
			.slice(0, SUGGESTIONS_SHOWN)
			.map(item => ({ tag: item.tag, games: item.games, isNew: false }));
		const exists =
			taken.has(query) || found.some(item => item.tag === query);
		return exists
			? matches
			: [{ tag: query, games: null, isNew: true }, ...matches];
	});

	protected readonly activeIndex = linkedSignal({
		source: this.suggestions,
		computation: () => 0
	});

	protected readonly listOpen = computed(
		() => this.open() && !this.disabled() && this.suggestions().length > 0
	);

	protected readonly activeOptionId = computed(() =>
		this.listOpen() ? this.optionId(this.activeIndex()) : null
	);

	protected readonly listLabel = computed(() =>
		this.normalizedQuery() ? "Tag suggestions" : "Popular tags"
	);

	constructor() {
		this.searches
			.pipe(
				debounceTime(TAG_SEARCH_DEBOUNCE_MS),
				distinctUntilChanged(),
				switchMap(query =>
					query
						? this.moodTagsService
								.searchTags(
									query.slice(0, TAG_SEARCH_MAX_LENGTH)
								)
								.pipe(
									map(tags => ({ query, tags })),
									catchError(() => of({ query, tags: [] }))
								)
						: of(null)
				),
				takeUntilDestroyed()
			)
			.subscribe(result => this.searchResult.set(result));
	}

	protected optionId(index: number) {
		return `${this.inputId}-option-${index}`;
	}

	protected onFocus() {
		this.open.set(true);
		this.loadPopular();
	}

	protected onBlur() {
		this.open.set(false);
	}

	protected onInput(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		this.query.set(value);
		this.open.set(true);
		this.searches.next(normalizeTag(value));
	}

	protected onKeydown(event: KeyboardEvent) {
		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				this.open.set(true);
				this.moveActive(1);
				break;
			case "ArrowUp":
				event.preventDefault();
				this.open.set(true);
				this.moveActive(-1);
				break;
			case "Enter": {
				event.preventDefault();
				const suggestion = this.listOpen()
					? this.suggestions()[this.activeIndex()]
					: this.suggestions().find(item => item.isNew);
				if (suggestion) this.pick(suggestion);
				break;
			}
			case "Escape":
				if (!this.listOpen()) return;
				event.stopPropagation();
				this.open.set(false);
				break;
		}
	}

	protected pick(suggestion: GameTagSuggestion) {
		if (this.disabled() || this.taken().includes(suggestion.tag)) return;
		this.tagPicked.emit(suggestion.tag);
		this.query.set("");
		this.searches.next("");
		this.open.set(false);
	}

	private moveActive(step: number) {
		const count = this.suggestions().length;
		if (count === 0) return;
		this.activeIndex.set((this.activeIndex() + step + count) % count);
	}

	private loadPopular() {
		if (this.popularRequested) return;
		this.popularRequested = true;
		this.moodTagsService
			.getPopularTags(POPULAR_TAGS_REQUESTED)
			.pipe(
				catchError(() => {
					this.popularRequested = false;
					return of([]);
				}),
				takeUntilDestroyed(this.destroyRef)
			)
			.subscribe(tags => this.popular.set(tags));
	}
}
