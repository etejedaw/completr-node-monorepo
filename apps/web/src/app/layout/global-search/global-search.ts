import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	type ElementRef,
	inject,
	input,
	output,
	signal,
	viewChild
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Router } from "@angular/router";
import { debounceTime, of, Subject, switchMap } from "rxjs";

import { GlobalSearchService } from "../../core/services/global-search";
import { type SearchResults } from "../../core/services/global-search.model";
import { avatarRing } from "../../core/utils/premium";
import { GamePoster } from "../../shared/components/game-poster/game-poster";
import { UiAvatar } from "../../shared/ui";

export type GlobalSearchVariant = "inline" | "overlay";

@Component({
	selector: "app-global-search",
	imports: [GamePoster, UiAvatar],
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

	variant = input<GlobalSearchVariant>("inline");
	closed = output<void>();

	private readonly input = viewChild<ElementRef<HTMLInputElement>>("input");
	private readonly queries = new Subject<string>();

	protected readonly avatarRing = avatarRing;
	protected readonly query = signal("");
	protected readonly results = signal<SearchResults | null>(null);
	protected readonly searching = signal(false);
	protected readonly focused = signal(false);

	constructor() {
		this.queries
			.pipe(
				debounceTime(250),
				switchMap(query => {
					if (query.length < 2) {
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

		afterNextRender(() => {
			if (this.variant() === "overlay")
				this.input()?.nativeElement.focus();
		});
	}

	protected get isOpen(): boolean {
		return (
			this.variant() === "overlay" ||
			(this.focused() && this.query().length >= 2)
		);
	}

	protected get hasResults(): boolean {
		const results = this.results();
		return (
			!!results &&
			results.users.length + results.games.length + results.lists.length >
				0
		);
	}

	onInput(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		this.query.set(value);
		if (value.length < 2) this.results.set(null);
		this.queries.next(value);
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

	onEscape() {
		if (this.variant() === "overlay") {
			this.closed.emit();
			return;
		}
		this.clear();
		this.input()?.nativeElement.blur();
	}

	clear() {
		this.query.set("");
		this.results.set(null);
		this.queries.next("");
	}

	goTo(url: string) {
		this.finish();
		this.router.navigateByUrl(url);
	}

	searchInGames() {
		const query = this.query().trim();
		if (!query) return;
		this.finish();
		this.router.navigate(["/games"], { queryParams: { q: query } });
	}

	private finish() {
		this.clear();
		this.focused.set(false);
		this.input()?.nativeElement.blur();
		this.closed.emit();
	}
}
