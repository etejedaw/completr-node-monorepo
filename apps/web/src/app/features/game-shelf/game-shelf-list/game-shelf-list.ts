import { DatePipe } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	inject,
	type OnInit,
	signal
} from "@angular/core";
import { debounceTime, distinctUntilChanged, Subject } from "rxjs";

import { type BulkResult, type GameShelfEntry } from "../../../core/models";
import { AuthService } from "../../../core/services/auth";
import { DialogService } from "../../../core/services/dialog";
import { type ExportParams } from "../../../core/services/export";
import { BulkActionBar } from "../../../shared/components/bulk-action-bar/bulk-action-bar";
import { type BulkAction } from "../../../shared/components/bulk-action-bar/bulk-action-bar.model";
import { CoverGrid } from "../../../shared/components/cover-grid/cover-grid";
import { ExportActions } from "../../../shared/components/export-actions/export-actions";
import { GameCoverCard } from "../../../shared/components/game-cover-card/game-cover-card";
import { GameTitleCell } from "../../../shared/components/game-title-cell/game-title-cell";
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
import { PageSearch } from "../../../shared/components/page-search/page-search";
import {
	countByPlatform,
	matchesPlatform,
	PlatformFilter
} from "../../../shared/components/platform-filter/platform-filter";
import { ViewModeToggle } from "../../../shared/components/view-mode-toggle/view-mode-toggle";
import { type ViewModeOption } from "../../../shared/components/view-mode-toggle/view-mode-toggle.model";
import { PremiumOnly } from "../../../shared/directives/premium-only";
import { SelectionCell } from "../../../shared/directives/selection-cell";
import { type SelectionToggle } from "../../../shared/directives/selection-cell.model";
import {
	UiBadge,
	UiButton,
	UiCheckbox,
	UiIconButton,
	UiPremiumBadge,
	UiTable
} from "../../../shared/ui";
import { uniqueGameIds } from "../../../shared/utils/backlog-eligibility";
import { countOf } from "../../../shared/utils/bulk-feedback";
import { injectBulkRemoval } from "../../../shared/utils/bulk-removal";
import { injectBulkRunner } from "../../../shared/utils/bulk-runner";
import { injectRowSelection } from "../../../shared/utils/row-selection";
import { injectBacklogQuickAdd } from "../../backlog/backlog-quick-add";
import { FavoritesService } from "../../favorites/favorites";
import { WishlistService } from "../../wishlist/wishlist";
import { GameShelfService } from "../game-shelf";
import { GameShelfCalendar } from "../game-shelf-calendar/game-shelf-calendar";
import {
	GameShelfModal,
	type GameShelfModalResult
} from "../game-shelf-modal/game-shelf-modal";
import { type GameShelfModalData } from "../game-shelf-modal/game-shelf-modal.model";

type ShelfViewMode = "grid" | "table" | "calendar";

const VIEW_MODE_STORAGE_KEY = "completr.shelf.viewMode";
const SHELF_NOUN = { one: "game", other: "games" };

const VIEW_MODES: readonly ViewModeOption<ShelfViewMode>[] = [
	{ value: "grid", label: "Grid", icon: "grid_view" },
	{ value: "table", label: "Hardcore", icon: "table_rows" },
	{ value: "calendar", label: "Calendar", icon: "calendar_month" }
];

function readStoredViewMode(): ShelfViewMode {
	const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
	return saved === "table" || saved === "calendar" ? saved : "grid";
}

@Component({
	selector: "app-game-shelf-list",
	imports: [
		BulkActionBar,
		ExportActions,
		SelectionCell,
		UiCheckbox,
		ViewModeToggle,
		DatePipe,
		UiBadge,
		UiButton,
		UiIconButton,
		UiTable,
		GameCoverCard,
		GameTitleCell,
		GameShelfCalendar,
		CoverGrid,
		LibraryHero,
		LibraryPage,
		LibraryPageContent,
		LibraryPageEmptyAction,
		LibraryPageToolbar,
		PlatformFilter,
		PremiumOnly,
		UiPremiumBadge,
		PageSearch
	],
	templateUrl: "./game-shelf-list.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameShelfList implements OnInit {
	private readonly shelfService = inject(GameShelfService);
	private readonly favoritesService = inject(FavoritesService);
	private readonly wishlistService = inject(WishlistService);
	private readonly dialogs = inject(DialogService);
	protected readonly openBacklogQuickAdd = injectBacklogQuickAdd(() =>
		this.loadShelf()
	);
	protected readonly isPremium = inject(AuthService).isPremium;
	protected readonly viewModes = VIEW_MODES;

	protected readonly allEntries = signal<GameShelfEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly searchQuery = signal("");
	protected readonly selectedPlatform = signal("");
	protected readonly exportParams = computed<ExportParams>(() => ({
		search: this.searchQuery().trim() || undefined,
		platform: this.selectedPlatform() || undefined
	}));
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = 100;
	protected readonly tableColumns = [
		"Title",
		"Platform",
		"Edition",
		"Acquired"
	];
	protected readonly viewMode = signal<ShelfViewMode>(readStoredViewMode());

	protected readonly platformCounts = computed(() =>
		countByPlatform(this.allEntries(), entry => entry.platform)
	);
	protected readonly entries = computed(() =>
		this.allEntries().filter(entry =>
			matchesPlatform(entry.platform, this.selectedPlatform())
		)
	);
	protected readonly selection = injectRowSelection(
		this.entries,
		entry => entry.id
	);
	protected readonly bulkRunner = injectBulkRunner(this.selection);
	private readonly bulkRemoval = injectBulkRemoval<GameShelfEntry>({
		rows: this.allEntries,
		total: this.total,
		selection: this.selection,
		keyOf: entry => entry.id,
		requestIdOf: entry => entry.id,
		request: ids => this.shelfService.bulk("delete", { ids }),
		pendingMessage: count =>
			`${countOf(count, SHELF_NOUN)} removed from your shelf`,
		failureMessage: "Couldn't remove the selected games. Try again."
	});
	protected readonly bulkNoun = SHELF_NOUN;
	private readonly selectedGameIds = computed(() =>
		uniqueGameIds(this.selection.selectedRows())
	);
	private readonly favoriteEligible = computed(() => {
		const favorites = this.favoritesService.favoriteIds();
		return this.selectedGameIds().filter(id => !favorites.has(id));
	});
	private readonly unfavoriteEligible = computed(() => {
		const favorites = this.favoritesService.favoriteIds();
		return this.selectedGameIds().filter(id => favorites.has(id));
	});
	protected readonly bulkActions = computed<BulkAction[]>(() => {
		const allFavorites =
			this.selectedGameIds().length > 0 &&
			this.favoriteEligible().length === 0;
		const unfavorite: BulkAction = {
			id: "unfavorite",
			label: "Unfavorite",
			icon: "heart_broken",
			eligibleCount: this.unfavoriteEligible().length,
			tone: "default"
		};
		const remove: BulkAction = {
			id: "remove",
			label: "Remove from shelf",
			icon: "delete",
			eligibleCount: this.selection.count(),
			tone: "danger"
		};
		if (allFavorites) return [unfavorite, remove];
		const favorite: BulkAction = {
			id: "favorite",
			label: "Favorite",
			icon: "favorite",
			eligibleCount: this.favoriteEligible().length,
			tone: "default"
		};
		return this.unfavoriteEligible().length > 0
			? [favorite, { ...unfavorite, overflow: true }, remove]
			: [favorite, remove];
	});
	protected readonly pageState = computed<LibraryPageState>(() => {
		if (this.isLoading()) return "loading";
		if (this.entries().length > 0) return "ready";
		return this.searchQuery().trim() || this.selectedPlatform()
			? "no-matches"
			: "empty";
	});
	protected readonly heroPosters = computed(() =>
		this.allEntries().map(entry => ({
			src: entry.game.backgroundUrl,
			title: entry.game.title
		}))
	);

	constructor() {
		effect(() =>
			localStorage.setItem(VIEW_MODE_STORAGE_KEY, this.viewMode())
		);
	}

	protected setViewMode(mode: ShelfViewMode) {
		this.selection.clear();
		this.viewMode.set(mode);
	}

	protected toggleSelection(entry: GameShelfEntry, toggle: SelectionToggle) {
		if (toggle.range) this.selection.toggleRange(entry.id);
		else this.selection.toggle(entry.id);
	}

	protected runBulkAction(id: string) {
		if (this.bulkRunner.busy()) return;
		if (id === "remove") {
			this.bulkRemoval.remove(this.selection.selectedRows());
			return;
		}
		const action = id === "favorite" ? "add" : "remove";
		const gameIds =
			action === "add"
				? this.favoriteEligible()
				: this.unfavoriteEligible();
		if (gameIds.length === 0) return;
		this.bulkRunner.run<BulkResult>({
			request: this.favoritesService.bulk(action, { gameIds }),
			applied: () => undefined,
			successMessage: count =>
				`${countOf(count, SHELF_NOUN)} ${action === "add" ? "added to" : "removed from"} favorites`,
			partialVerb: action === "add" ? "added" : "removed",
			failureMessage: "Couldn't update your favorites. Try again.",
			rowIdsOf: ids => this.rowIdsForGames(ids)
		});
	}

	private rowIdsForGames(gameIds: readonly string[]): string[] {
		const games = new Set(gameIds);
		return this.selection
			.selectedRows()
			.filter(entry => games.has(entry.game.id))
			.map(entry => entry.id);
	}

	private readonly searchSubject = new Subject<string>();

	ngOnInit() {
		this.searchSubject
			.pipe(debounceTime(300), distinctUntilChanged())
			.subscribe(() => {
				this.offset.set(0);
				this.loadShelf();
			});
		this.favoritesService.ensureIdsLoaded().subscribe();
		this.wishlistService.ensureIdsLoaded().subscribe();
		this.loadShelf();
	}

	isInWishlist(gameId: string): boolean {
		return this.wishlistService.isInWishlist(gameId);
	}

	toggleWishlist(gameId: string) {
		this.wishlistService.toggle(gameId).subscribe();
	}

	isFavorite(gameId: string): boolean {
		return this.favoritesService.isFavorite(gameId);
	}

	toggleFavorite(gameId: string) {
		this.favoritesService.toggle(gameId).subscribe();
	}

	onSearch(query: string) {
		this.searchQuery.set(query);
		if (!query.trim()) {
			this.offset.set(0);
			this.loadShelf();
			return;
		}
		this.searchSubject.next(query);
	}

	clearSearchAndFilter() {
		this.searchQuery.set("");
		this.selectedPlatform.set("");
		this.offset.set(0);
		this.loadShelf();
	}

	openCreate() {
		this.openModal(null);
	}

	openEdit(entry: GameShelfEntry) {
		this.openModal(entry);
	}

	private openModal(entry: GameShelfEntry | null) {
		const ref = this.dialogs.open<GameShelfModalData, GameShelfModalResult>(
			GameShelfModal,
			{ data: { entry, preselectedGame: null } }
		);
		ref.afterClosed.subscribe(result => {
			if (result === "saved") this.loadShelf();
		});
	}

	onOffsetChange(offset: number) {
		this.offset.set(offset);
		this.loadShelf();
	}

	private loadShelf() {
		this.isLoading.set(true);
		this.shelfService
			.getMyShelf({
				limit: this.limit,
				offset: this.offset(),
				search: this.searchQuery().trim() || undefined
			})
			.subscribe({
				next: res => {
					this.allEntries.set(
						this.bulkRemoval.withoutPending(res.data.gameShelf)
					);
					this.total.set(res.data.total);
					this.isLoading.set(false);
				},
				error: () => this.isLoading.set(false)
			});
	}
}
