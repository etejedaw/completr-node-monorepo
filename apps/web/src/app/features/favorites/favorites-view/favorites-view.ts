import {
	CdkDrag,
	type CdkDragDrop,
	CdkDropList,
	moveItemInArray
} from "@angular/cdk/drag-drop";
import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	computed,
	ElementRef,
	inject,
	Injector,
	type OnInit,
	signal
} from "@angular/core";
import { RouterLink } from "@angular/router";
import {
	catchError,
	concatMap,
	debounceTime,
	distinctUntilChanged,
	EMPTY,
	Subject
} from "rxjs";

import { type FavoriteEntry } from "../../../core/models";
import { AuthService } from "../../../core/services/auth";
import { type ExportParams } from "../../../core/services/export";
import { ToastService } from "../../../core/services/toast";
import { CoverGrid } from "../../../shared/components/cover-grid/cover-grid";
import { ExportActions } from "../../../shared/components/export-actions/export-actions";
import { GameCoverCard } from "../../../shared/components/game-cover-card/game-cover-card";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import {
	LibraryPage,
	type LibraryPageState
} from "../../../shared/components/library-page/library-page";
import {
	LibraryPageContent,
	LibraryPageEmptyAction,
	LibraryPageToolbar
} from "../../../shared/components/library-page/library-page-slots";
import { PremiumOnly } from "../../../shared/directives/premium-only";
import { UiButton, UiPremiumBadge, UiSearchBar } from "../../../shared/ui";
import { injectBacklogQuickAdd } from "../../backlog/backlog-quick-add";
import {
	type FavoriteReorderAction,
	FavoriteReorderCard
} from "../components/favorite-reorder-card/favorite-reorder-card";
import { FavoritesService } from "../favorites";

@Component({
	selector: "app-favorites-view",
	imports: [
		ExportActions,
		RouterLink,
		CdkDrag,
		CdkDropList,
		CoverGrid,
		FavoriteReorderCard,
		GameCoverCard,
		LibraryHero,
		LibraryPage,
		LibraryPageContent,
		LibraryPageEmptyAction,
		LibraryPageToolbar,
		PremiumOnly,
		UiButton,
		UiPremiumBadge,
		UiSearchBar
	],
	templateUrl: "./favorites-view.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class FavoritesView implements OnInit {
	private readonly favoritesService = inject(FavoritesService);
	private readonly toast = inject(ToastService);
	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
	private readonly injector = inject(Injector);
	protected readonly openBacklogQuickAdd = injectBacklogQuickAdd(() =>
		this.loadFavorites()
	);

	protected readonly isPremium = inject(AuthService).isPremium;
	protected readonly entries = signal<FavoriteEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly searchQuery = signal("");
	protected readonly exportParams = computed<ExportParams>(() => ({
		search: this.searchQuery().trim() || undefined
	}));
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = 100;
	protected readonly reordering = signal(false);
	protected readonly reorderAnnouncement = signal("");
	protected readonly canReorder = computed(
		() =>
			!this.searchQuery().trim() &&
			this.offset() === 0 &&
			this.entries().length > 1 &&
			this.entries().length === this.total()
	);
	private readonly orderChanges = new Subject<string[]>();
	protected readonly pageState = computed<LibraryPageState>(() => {
		if (this.isLoading()) return "loading";
		if (this.entries().length > 0) return "ready";
		return this.searchQuery().trim() ? "no-matches" : "empty";
	});
	protected readonly heroPosters = computed(() =>
		this.entries().map(entry => ({
			src: entry.game.backgroundUrl,
			title: entry.game.title
		}))
	);

	onOffsetChange(offset: number) {
		this.offset.set(offset);
		this.loadFavorites();
	}

	private readonly searchSubject = new Subject<string>();

	constructor() {
		this.orderChanges
			.pipe(
				concatMap(gameIds =>
					this.favoritesService.replaceFavorites(gameIds).pipe(
						catchError(() => {
							this.toast.error("Could not save the new order.");
							this.loadFavorites();
							return EMPTY;
						})
					)
				)
			)
			.subscribe();
	}

	ngOnInit() {
		this.searchSubject
			.pipe(debounceTime(300), distinctUntilChanged())
			.subscribe(() => {
				this.offset.set(0);
				this.loadFavorites();
			});
		this.loadFavorites();
	}

	onSearch(query: string) {
		this.searchQuery.set(query);
		if (!query.trim()) {
			this.offset.set(0);
			this.loadFavorites();
			return;
		}
		this.searchSubject.next(query);
	}

	remove(entry: FavoriteEntry) {
		const snapshot = this.entries();
		const previousTotal = this.total();
		const restore = () => {
			this.entries.set(snapshot);
			this.total.set(previousTotal);
		};
		this.entries.set(
			this.renumber(snapshot.filter(e => e.id !== entry.id))
		);
		this.total.set(Math.max(0, previousTotal - 1));
		this.toast.pending({
			message: `Removed ${entry.game.title} from favorites`,
			onCommit: () =>
				this.favoritesService.removeFavorite(entry.game.id).subscribe({
					error: () => {
						restore();
						this.toast.error("Could not remove the favorite.");
					}
				}),
			onUndo: restore
		});
	}

	startReordering() {
		if (!this.canReorder()) return;
		this.reorderAnnouncement.set("");
		this.reordering.set(true);
	}

	finishReordering() {
		this.reordering.set(false);
	}

	onReorderAction(index: number, action: FavoriteReorderAction) {
		const target =
			action === "first"
				? 0
				: action === "earlier"
					? index - 1
					: index + 1;
		this.moveEntry(index, target, action);
	}

	onDrop(event: CdkDragDrop<FavoriteEntry[]>) {
		this.moveEntry(event.previousIndex, event.currentIndex);
	}

	private moveEntry(
		from: number,
		to: number,
		focusAction?: FavoriteReorderAction
	) {
		const current = this.entries();
		if (from === to || to < 0 || to >= current.length) return;
		const reordered = [...current];
		moveItemInArray(reordered, from, to);
		this.entries.set(this.renumber(reordered));
		const moved = reordered[to];
		this.reorderAnnouncement.set(
			`${moved.game.title} moved to position ${to + 1} of ${reordered.length}.`
		);
		if (focusAction) this.keepFocusOn(moved.game.id, focusAction);
		this.orderChanges.next(reordered.map(entry => entry.game.id));
	}

	private keepFocusOn(gameId: string, action: FavoriteReorderAction) {
		afterNextRender(
			() => {
				const card = this.host.nativeElement.querySelector(
					`[data-favorite-id="${gameId}"]`
				);
				const preferred = card?.querySelector<HTMLButtonElement>(
					`[data-reorder-action="${action}"]:not(:disabled)`
				);
				const fallback = card?.querySelector<HTMLButtonElement>(
					"[data-reorder-action]:not(:disabled)"
				);
				(preferred ?? fallback)?.focus();
			},
			{ injector: this.injector }
		);
	}

	private renumber(entries: FavoriteEntry[]): FavoriteEntry[] {
		return entries.map((entry, index) => ({
			...entry,
			position: this.offset() + index + 1
		}));
	}

	private loadFavorites() {
		this.isLoading.set(true);
		this.favoritesService
			.load({
				limit: this.limit,
				offset: this.offset(),
				search: this.searchQuery().trim() || undefined
			})
			.subscribe({
				next: res => {
					this.entries.set(res.data.favorites);
					this.total.set(res.data.total ?? res.data.favorites.length);
					this.isLoading.set(false);
				},
				error: () => this.isLoading.set(false)
			});
	}
}
