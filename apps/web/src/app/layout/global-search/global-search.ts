import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	effect,
	type ElementRef,
	inject,
	input,
	linkedSignal,
	output,
	signal,
	untracked,
	viewChild
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Router } from "@angular/router";
import { debounceTime, of, Subject, switchMap } from "rxjs";

import { GlobalSearchService } from "../../core/services/global-search";
import { type SearchResults } from "../../core/services/global-search.model";
import { PageSearchScope } from "../../core/services/page-search-scope";
import { type PageSearchScopeEntry } from "../../core/services/page-search-scope.model";
import { avatarRing } from "../../core/utils/premium";
import { GamePoster } from "../../shared/components/game-poster/game-poster";
import { UiAvatar, UiButton, UiEyebrow, UiIconButton } from "../../shared/ui";
import { SearchScopeChip } from "../search-scope-chip/search-scope-chip";

export type GlobalSearchVariant = "inline" | "overlay";

const MIN_GLOBAL_QUERY_LENGTH = 2;
const GLOBAL_PLACEHOLDER = "Search games, players, lists...";
const GLOBAL_ACCESSIBLE_NAME = "Search users, games or lists";

@Component({
	selector: "app-global-search",
	imports: [
		GamePoster,
		SearchScopeChip,
		UiAvatar,
		UiButton,
		UiEyebrow,
		UiIconButton
	],
	templateUrl: "./global-search.html",
	host: {
		class: "block",
		"(document:keydown)": "onDocumentKeydown($event)"
	},
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GlobalSearch {
	private readonly searchService = inject(GlobalSearchService);
	private readonly router = inject(Router);
	private readonly pageSearchScope = inject(PageSearchScope, {
		optional: true
	});

	readonly variant = input<GlobalSearchVariant>("inline");
	readonly initialQuery = input("");
	readonly closed = output<void>();

	private readonly input = viewChild<ElementRef<HTMLInputElement>>("input");
	private readonly queries = new Subject<string>();
	private readonly dismissedScope = signal<PageSearchScopeEntry | null>(null);

	protected readonly avatarRing = avatarRing;
	protected readonly globalQuery = linkedSignal(() => this.initialQuery());
	protected readonly results = signal<SearchResults | null>(null);
	protected readonly searching = signal(false);
	protected readonly focused = signal(false);

	protected readonly pageScope = computed(
		() => this.pageSearchScope?.active() ?? null
	);
	protected readonly scope = computed(() => {
		const entry = this.pageScope();
		if (!entry || this.variant() === "overlay") return null;
		return entry === this.dismissedScope() ? null : entry;
	});
	protected readonly text = computed(
		() => this.scope()?.value() ?? this.globalQuery()
	);
	protected readonly placeholder = computed(
		() => this.scope()?.placeholder() ?? GLOBAL_PLACEHOLDER
	);
	protected readonly accessibleName = computed(
		() => this.scope()?.ariaLabel() ?? GLOBAL_ACCESSIBLE_NAME
	);
	protected readonly modeAnnouncement = computed(() => {
		const scope = this.scope();
		if (scope) return `Filtering ${scope.label()}`;
		return this.pageScope() ? "Searching all of Completr" : "";
	});
	protected readonly isOpen = computed(() => {
		if (this.variant() === "overlay") return true;
		if (!this.focused()) return false;
		if (this.scope()) return this.text().trim().length > 0;
		return this.globalQuery().length >= MIN_GLOBAL_QUERY_LENGTH;
	});
	protected readonly hasResults = computed(() => {
		const results = this.results();
		return (
			!!results &&
			results.users.length + results.games.length + results.lists.length >
				0
		);
	});

	constructor() {
		this.queries
			.pipe(
				debounceTime(250),
				switchMap(query => {
					if (query.length < MIN_GLOBAL_QUERY_LENGTH) {
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

		effect(() => {
			if (this.scope()) untracked(() => this.resetGlobalQuery());
		});

		afterNextRender(() => {
			if (this.variant() !== "overlay") return;
			if (this.globalQuery()) this.queries.next(this.globalQuery());
			this.input()?.nativeElement.focus();
		});
	}

	onInput(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		const scope = this.scope();
		if (scope) {
			scope.setValue(value);
			return;
		}
		this.setGlobalQuery(value);
	}

	onBackspace(event: Event) {
		const field = event.target as HTMLInputElement;
		if (!this.scope() || field.value !== "") return;
		event.preventDefault();
		this.searchEverywhere();
	}

	onFocusOut(event: FocusEvent) {
		const next = event.relatedTarget as Node | null;
		const host = (event.currentTarget as HTMLElement) ?? null;
		if (next && host?.contains(next)) return;
		this.focused.set(false);
	}

	onDocumentKeydown(event: KeyboardEvent) {
		if (this.variant() !== "inline" || event.key !== "/") return;
		const target = event.target as HTMLElement | null;
		const typing =
			target?.isContentEditable ||
			["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "");
		if (typing) return;
		event.preventDefault();
		this.input()?.nativeElement.focus();
	}

	onEscape(event: Event) {
		if (this.text()) {
			event.stopPropagation();
			this.clear();
			return;
		}
		if (this.variant() === "overlay") {
			this.closed.emit();
			return;
		}
		this.input()?.nativeElement.blur();
	}

	onEnter() {
		if (this.scope()) return;
		this.searchInGames();
	}

	clear() {
		const scope = this.scope();
		if (scope) {
			scope.setValue("");
			return;
		}
		this.resetGlobalQuery();
	}

	searchEverywhere() {
		const scope = this.scope();
		if (!scope) return;
		const query = scope.value();
		this.dismissedScope.set(scope);
		scope.setValue("");
		this.setGlobalQuery(query);
		this.focusInput();
	}

	filterPage() {
		const scope = this.pageScope();
		if (!scope) return;
		const query = this.globalQuery().trim();
		this.resetGlobalQuery();
		this.dismissedScope.set(null);
		scope.setValue(query);
		if (this.variant() === "overlay") {
			this.closed.emit();
			return;
		}
		this.focusInput();
	}

	goTo(url: string) {
		this.finish();
		this.router.navigateByUrl(url);
	}

	searchInGames() {
		const query = this.globalQuery().trim();
		if (!query) return;
		this.finish();
		this.router.navigate(["/games"], { queryParams: { q: query } });
	}

	private setGlobalQuery(value: string) {
		this.globalQuery.set(value);
		if (value.length < MIN_GLOBAL_QUERY_LENGTH) this.results.set(null);
		this.queries.next(value);
	}

	private resetGlobalQuery() {
		this.globalQuery.set("");
		this.results.set(null);
		this.queries.next("");
	}

	private focusInput() {
		this.input()?.nativeElement.focus();
	}

	private finish() {
		this.resetGlobalQuery();
		this.focused.set(false);
		this.input()?.nativeElement.blur();
		this.closed.emit();
	}
}
