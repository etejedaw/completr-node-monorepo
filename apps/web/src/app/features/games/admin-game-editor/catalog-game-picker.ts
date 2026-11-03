import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	computed,
	ElementRef,
	inject,
	input,
	output,
	signal
} from "@angular/core";

import { type Game } from "../../../core/models";
import { GamePoster } from "../../../shared/components/game-poster/game-poster";
import { UiBadge, UiButton, UiSearchBar, UiSkeleton } from "../../../shared/ui";
import { injectGameSearch } from "../game-search";

const CATALOG_PICKER_RESULT_LIMIT = 8;

const RESULT_STEP: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 };

@Component({
	selector: "app-catalog-game-picker",
	imports: [GamePoster, UiBadge, UiButton, UiSearchBar, UiSkeleton],
	template: `
		<ui-search-bar
			class="[&>div]:min-h-11 [&_input]:!py-2 [&_input]:!text-sm"
			[placeholder]="placeholder()"
			[ariaLabel]="label()"
			[(value)]="query"
		/>

		@if (search.status() === "done") {
			@if (results().length === 0) {
				<div
					class="flex flex-col items-center text-center gap-1.5 px-4 py-6"
					role="status"
				>
					<span
						aria-hidden="true"
						class="material-icons text-2xl text-fg-muted"
						>search_off</span
					>
					<p class="m-0 text-sm font-semibold text-fg">
						No games found
					</p>
					<p
						class="m-0 text-[0.8125rem] text-fg-muted max-w-[20rem] text-pretty"
					>
						{{ emptyHint() }}
					</p>
					<button
						uiButton
						variant="ghost"
						size="sm"
						type="button"
						class="mt-1 max-md:min-h-[44px]"
						(click)="clearQuery()"
					>
						New search
					</button>
				</div>
			} @else {
				<p class="sr-only" role="status">
					{{ results().length }}
					{{ results().length === 1 ? "game" : "games" }} found
				</p>
				<ul
					class="list-none m-0 mt-2 p-0 divide-y divide-line border border-line rounded-card bg-input-bg max-h-72 overflow-y-auto"
				>
					@for (game of results(); track game.id) {
						<li class="flex items-center gap-3 px-3 py-2">
							<app-game-poster
								class="w-9 aspect-[2/3] shrink-0 rounded ring-1 ring-white/10"
								[src]="game.backgroundUrl"
								[title]="game.title"
								[width]="200"
								[compact]="true"
							/>
							<div class="flex flex-col gap-0.5 min-w-0 flex-1">
								<span
									class="text-[0.8125rem] font-medium text-fg truncate"
									>{{ game.title }}</span
								>
								<span class="flex items-center gap-1.5 min-w-0">
									<span
										class="text-[0.6875rem] text-fg-muted truncate"
										>{{ resultMeta(game) }}</span
									>
									@if (game.isDlc) {
										<ui-badge tone="brand">DLC</ui-badge>
									}
								</span>
							</div>
							<button
								uiButton
								variant="secondary"
								size="sm"
								type="button"
								data-catalog-result
								class="shrink-0 max-md:min-h-[44px]"
								[attr.aria-label]="'Select ' + game.title"
								(click)="picked.emit(game)"
							>
								Select
							</button>
						</li>
					}
				</ul>
			}
		} @else if (search.status() !== "idle") {
			<p class="sr-only" role="status">Looking up the catalog</p>
			<ul
				class="list-none m-0 mt-2 p-0 divide-y divide-line border border-line rounded-card"
				aria-hidden="true"
				data-catalog-skeleton
			>
				@for (row of skeletonRows; track row) {
					<li class="flex items-center gap-3 px-3 py-2">
						<ui-skeleton
							variant="rect"
							class="w-9 aspect-[2/3] shrink-0 [&>span]:h-full [&>span]:rounded"
						/>
						<div class="flex flex-col gap-2 min-w-0 flex-1">
							<ui-skeleton variant="text" class="w-2/3" />
							<ui-skeleton variant="text" class="w-1/4" />
						</div>
						<ui-skeleton
							variant="rect"
							class="w-16 h-8 shrink-0 [&>span]:h-full"
						/>
					</li>
				}
			</ul>
		}
	`,
	host: { class: "block", "(keydown)": "onKeydown($event)" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class CatalogGamePicker {
	readonly label = input.required<string>();
	readonly placeholder = input("Search the catalog...");
	readonly emptyHint = input(
		"Only games already in the catalog show up here. Try another spelling or a shorter title."
	);
	readonly excludedIds = input<readonly string[]>([]);
	readonly autofocus = input(false);
	readonly picked = output<Game>();

	protected readonly query = signal("");
	protected readonly search = injectGameSearch(this.query, signal(false));
	protected readonly skeletonRows = [0, 1, 2];

	protected readonly results = computed(() => {
		const excluded = new Set(this.excludedIds());
		return this.search
			.results()
			.filter(game => !excluded.has(game.id))
			.slice(0, CATALOG_PICKER_RESULT_LIMIT);
	});

	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

	constructor() {
		afterNextRender(() => {
			if (this.autofocus()) this.searchInput()?.focus();
		});
	}

	protected resultMeta(game: Game) {
		const year = game.releaseAt?.substring(0, 4);
		return [year, game.code].filter(Boolean).join(" · ");
	}

	protected clearQuery() {
		this.query.set("");
		this.searchInput()?.focus();
	}

	protected onKeydown(event: KeyboardEvent) {
		const step = RESULT_STEP[event.key];
		if (step === undefined && event.key !== "Escape") return;
		const target = event.target as HTMLElement;
		const buttons = Array.from(
			this.host.nativeElement.querySelectorAll<HTMLButtonElement>(
				"[data-catalog-result]"
			)
		);
		const current = buttons.indexOf(target as HTMLButtonElement);
		if (event.key === "Escape") {
			if (current === -1) return;
			event.preventDefault();
			this.searchInput()?.focus();
			return;
		}
		if (buttons.length === 0) return;
		const inSearch = target === this.searchInput();
		if (!inSearch && current === -1) return;
		event.preventDefault();
		if (inSearch) {
			if (step > 0) buttons[0].focus();
			return;
		}
		const next = current + step;
		if (next < 0) this.searchInput()?.focus();
		else buttons[Math.min(next, buttons.length - 1)].focus();
	}

	private searchInput() {
		return this.host.nativeElement.querySelector<HTMLInputElement>(
			"ui-search-bar input"
		);
	}
}
