import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	DOCUMENT,
	type ElementRef,
	inject,
	linkedSignal,
	output,
	signal,
	viewChild
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Router, RouterLink } from "@angular/router";
import { debounceTime, of, Subject, switchMap } from "rxjs";

import { GlobalSearchService } from "../../core/services/global-search";
import { type SearchResults } from "../../core/services/global-search.model";
import { ChipGroup } from "../../shared/components/chip-group/chip-group";
import { type ChipOption } from "../../shared/components/chip-group/chip-group.model";
import {
	UiButton,
	UiEyebrow,
	UiFocusTrap,
	UiIconButton
} from "../../shared/ui";
import { injectBodyPortal } from "../../shared/ui/portal/body-portal";
import {
	type SearchPaletteItem,
	type SearchPaletteScope
} from "./search-palette.model";
import { SearchPaletteOption } from "./search-palette-option";
import {
	buildCatalogSection,
	buildResultSections
} from "./search-palette-sections";

const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 250;

const SCOPE_OPTIONS: readonly ChipOption[] = [
	{ value: "all", label: "All" },
	{ value: "library", label: "My library", icon: "list_alt" },
	{ value: "games", label: "Games", icon: "sports_esports" },
	{ value: "players", label: "Players", icon: "group" },
	{ value: "lists", label: "Lists", icon: "format_list_bulleted" }
];

const SCOPES: readonly SearchPaletteScope[] = [
	"all",
	"library",
	"games",
	"players",
	"lists"
];

function isScope(value: string | undefined): value is SearchPaletteScope {
	return SCOPES.includes(value as SearchPaletteScope);
}

@Component({
	selector: "app-search-palette",
	imports: [
		ChipGroup,
		RouterLink,
		SearchPaletteOption,
		UiButton,
		UiEyebrow,
		UiFocusTrap,
		UiIconButton
	],
	templateUrl: "./search-palette.html",
	host: {
		class: "fixed inset-0 z-[1000] flex md:items-start md:justify-center md:px-4 md:pt-[12dvh]",
		role: "dialog",
		"aria-modal": "true",
		"aria-label": "Search Completr"
	},
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchPalette {
	private readonly searchService = inject(GlobalSearchService);
	private readonly router = inject(Router);
	private readonly document = inject(DOCUMENT);

	readonly closed = output<void>();

	private readonly input =
		viewChild.required<ElementRef<HTMLInputElement>>("input");
	private readonly queries = new Subject<string>();
	private isClosing = false;

	protected readonly scopeOptions = SCOPE_OPTIONS;
	protected readonly listboxId = "search-palette-results";
	protected readonly query = signal("");
	protected readonly scope = signal<SearchPaletteScope>("all");
	protected readonly results = signal<SearchResults | null>(null);
	protected readonly searching = signal(false);

	protected readonly trimmedQuery = computed(() => this.query().trim());
	protected readonly hasQuery = computed(
		() => this.trimmedQuery().length >= MIN_QUERY_LENGTH
	);

	private readonly resultSections = computed(() => {
		const results = this.results();
		if (!results || !this.hasQuery()) return [];
		return buildResultSections(results, this.scope(), this.trimmedQuery());
	});

	protected readonly sections = computed(() => {
		if (!this.hasQuery()) return [];
		const catalog = buildCatalogSection(this.scope(), this.trimmedQuery());
		return catalog
			? [...this.resultSections(), catalog]
			: this.resultSections();
	});

	protected readonly items = computed(() =>
		this.sections().flatMap(section => section.items)
	);

	protected readonly activeIndex = linkedSignal({
		source: this.items,
		computation: () => 0
	});

	protected readonly activeItem = computed<SearchPaletteItem | null>(
		() => this.items().at(this.activeIndex()) ?? null
	);

	protected readonly activeId = computed(() => this.activeItem()?.id ?? null);

	protected readonly showsNoMatches = computed(
		() =>
			this.hasQuery() &&
			!!this.results() &&
			!this.searching() &&
			this.resultSections().length === 0
	);

	protected readonly scopeValue = computed(() => [this.scope()]);

	private readonly itemIndex = computed(
		() => new Map(this.items().map((item, index) => [item.id, index]))
	);

	constructor() {
		injectBodyPortal({ restoreFocus: true });

		this.queries
			.pipe(
				debounceTime(SEARCH_DEBOUNCE_MS),
				switchMap(query => {
					if (query.length < MIN_QUERY_LENGTH) {
						this.searching.set(false);
						return of(null);
					}
					this.searching.set(true);
					return this.searchService.search(query);
				}),
				takeUntilDestroyed(inject(DestroyRef))
			)
			.subscribe(results => {
				this.results.set(results);
				this.searching.set(false);
			});

		afterNextRender(() => this.focusInput());
	}

	protected activate(item: SearchPaletteItem) {
		const index = this.itemIndex().get(item.id);
		if (index !== undefined) this.activeIndex.set(index);
	}

	protected optionId(item: SearchPaletteItem) {
		return `search-palette-${item.id}`;
	}

	protected onInput(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		this.query.set(value);
		const trimmed = value.trim();
		if (trimmed.length < MIN_QUERY_LENGTH) this.results.set(null);
		this.queries.next(trimmed);
	}

	protected onKeydown(event: KeyboardEvent) {
		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				this.moveActive(1);
				break;
			case "ArrowUp":
				event.preventDefault();
				this.moveActive(-1);
				break;
			case "Enter": {
				event.preventDefault();
				const item = this.activeItem();
				if (item) this.open(item);
				break;
			}
		}
	}

	protected onEscape(event: Event) {
		event.stopPropagation();
		if (this.query()) {
			this.clear();
			return;
		}
		this.close();
	}

	protected selectScope(values: readonly string[]) {
		const [scope] = values;
		if (isScope(scope)) this.scope.set(scope);
	}

	protected clear() {
		this.query.set("");
		this.results.set(null);
		this.queries.next("");
		this.focusInput();
	}

	protected open(item: SearchPaletteItem) {
		this.router.navigate([item.path], { queryParams: item.queryParams });
		this.close();
	}

	protected close() {
		if (this.isClosing) return;
		this.isClosing = true;
		this.closed.emit();
	}

	private moveActive(step: number) {
		const count = this.items().length;
		if (count === 0) return;
		const next = (this.activeIndex() + step + count) % count;
		this.activeIndex.set(next);
		const item = this.items()[next];
		this.document
			.getElementById(this.optionId(item))
			?.scrollIntoView({ block: "nearest" });
	}

	private focusInput() {
		this.input().nativeElement.focus();
	}
}
