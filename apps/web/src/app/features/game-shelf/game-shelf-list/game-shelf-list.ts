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

import { type GameShelfEntry } from "../../../core/models";
import { AuthService } from "../../../core/services/auth";
import { DialogService } from "../../../core/services/dialog";
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
import {
	countByPlatform,
	matchesPlatform,
	PlatformFilter
} from "../../../shared/components/platform-filter/platform-filter";
import {
	type ViewModeOption,
	ViewModeToggle
} from "../../../shared/components/view-mode-toggle/view-mode-toggle";
import { PremiumOnly } from "../../../shared/directives/premium-only";
import { UiButton, UiPremiumBadge, UiSearchBar } from "../../../shared/ui";
import { injectBacklogQuickAdd } from "../../backlog/backlog-quick-add";
import { FavoritesService } from "../../favorites/favorites";
import { WishlistService } from "../../wishlist/wishlist";
import { GameShelfService } from "../game-shelf";
import { GameShelfCalendar } from "../game-shelf-calendar/game-shelf-calendar";
import {
	GameShelfModal,
	type GameShelfModalData,
	type GameShelfModalResult
} from "../game-shelf-modal/game-shelf-modal";

type ShelfViewMode = "grid" | "table" | "calendar";

const VIEW_MODE_STORAGE_KEY = "completr.shelf.viewMode";

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
		ExportActions,
		ViewModeToggle,
		DatePipe,
		UiButton,
		UiSearchBar,
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
		UiPremiumBadge
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
					this.allEntries.set(res.data.gameShelf);
					this.total.set(res.data.total);
					this.isLoading.set(false);
				},
				error: () => this.isLoading.set(false)
			});
	}
}
