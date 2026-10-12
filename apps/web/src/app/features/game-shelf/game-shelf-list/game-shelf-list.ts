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

import {
	type BacklogEntry,
	type Game,
	type GameShelfEntry
} from "../../../core/models";
import { DialogService } from "../../../core/services/dialog";
import { PointerService } from "../../../core/services/pointer";
import { ViewportService } from "../../../core/services/viewport";
import { GameCoverCard } from "../../../shared/components/game-cover-card/game-cover-card";
import { GameTitleCell } from "../../../shared/components/game-title-cell/game-title-cell";
import { LibraryHero } from "../../../shared/components/library-hero/library-hero";
import { SwipeActions } from "../../../shared/directives/swipe-actions";
import {
	UiButton,
	UiEmptyState,
	UiPagination,
	UiSearchBar,
	UiSkeleton
} from "../../../shared/ui";
import { BacklogService } from "../../backlog/backlog";
import {
	BacklogModal,
	type BacklogModalData,
	type BacklogModalResult
} from "../../backlog/backlog-modal/backlog-modal";
import { FavoritesService } from "../../favorites/favorites";
import { GamesService } from "../../games/games";
import { WishlistService } from "../../wishlist/wishlist";
import { GameShelfService } from "../game-shelf";
import { GameShelfCalendar } from "../game-shelf-calendar/game-shelf-calendar";
import {
	GameShelfModal,
	type GameShelfModalData,
	type GameShelfModalResult
} from "../game-shelf-modal/game-shelf-modal";
import { ShelfEntryCard } from "../shelf-entry-card/shelf-entry-card";

interface PlatformCount {
	id: string;
	abbreviation: string;
	count: number;
}

type ShelfViewMode = "grid" | "table" | "calendar";

const VIEW_MODE_STORAGE_KEY = "completr.shelf.viewMode";

const VIEW_MODES: { value: ShelfViewMode; label: string; icon: string }[] = [
	{ value: "grid", label: "Grid", icon: "grid_view" },
	{ value: "table", label: "Hardcore", icon: "table_rows" },
	{ value: "calendar", label: "Calendar", icon: "calendar_month" }
];

function readStoredViewMode(): ShelfViewMode {
	const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
	return saved === "table" || saved === "calendar" ? saved : "grid";
}

function countByPlatform(entries: GameShelfEntry[]): PlatformCount[] {
	const counts = new Map<string, PlatformCount>();
	for (const entry of entries) {
		const existing = counts.get(entry.platform.id);
		if (existing) existing.count++;
		else
			counts.set(entry.platform.id, {
				id: entry.platform.id,
				abbreviation: entry.platform.abbreviation,
				count: 1
			});
	}
	return [...counts.values()].sort((a, b) => b.count - a.count);
}

@Component({
	selector: "app-game-shelf-list",
	imports: [
		DatePipe,
		UiButton,
		UiEmptyState,
		UiPagination,
		UiSearchBar,
		GameCoverCard,
		GameTitleCell,
		GameShelfCalendar,
		LibraryHero,
		ShelfEntryCard,
		SwipeActions,
		UiSkeleton
	],
	templateUrl: "./game-shelf-list.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameShelfList implements OnInit {
	private readonly shelfService = inject(GameShelfService);
	private readonly favoritesService = inject(FavoritesService);
	private readonly wishlistService = inject(WishlistService);
	private readonly backlogService = inject(BacklogService);
	private readonly gamesService = inject(GamesService);
	private readonly dialogs = inject(DialogService);
	protected readonly viewport = inject(ViewportService);
	protected readonly pointer = inject(PointerService);
	protected readonly viewModes = computed(() =>
		this.viewport.isMobile()
			? VIEW_MODES.map(mode =>
					mode.value === "grid"
						? { ...mode, label: "Cards", icon: "view_agenda" }
						: mode
				)
			: VIEW_MODES
	);

	protected readonly allEntries = signal<GameShelfEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly searchQuery = signal("");
	protected readonly selectedPlatform = signal("");
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = 100;
	protected readonly skeletonRange = Array.from({ length: 12 }, (_, i) => i);
	protected readonly tableColumns = [
		"Title",
		"Platform",
		"Edition",
		"Acquired",
		"Notes"
	];
	protected readonly viewMode = signal<ShelfViewMode>(readStoredViewMode());

	protected readonly platformCounts = computed(() =>
		countByPlatform(this.allEntries())
	);
	protected readonly entries = computed(() => {
		const platform = this.selectedPlatform();
		const all = this.allEntries();
		return platform ? all.filter(e => e.platform.id === platform) : all;
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

	openBacklogQuickAdd(entry: GameShelfEntry) {
		this.backlogService.getMyBacklog({ game_id: entry.game.id }).subscribe({
			next: res => {
				const existing = res.data.backlog[0] ?? null;
				if (existing) {
					this.openBacklog(existing, null);
					return;
				}
				this.openCreateBacklogFor(entry.game.code);
			},
			error: () => this.openCreateBacklogFor(entry.game.code)
		});
	}

	private openCreateBacklogFor(code: string) {
		this.gamesService.getByCode(code).subscribe(game => {
			this.openBacklog(null, game);
		});
	}

	private openBacklog(
		entry: BacklogEntry | null,
		preselectedGame: Game | null
	) {
		const ref = this.dialogs.open<BacklogModalData, BacklogModalResult>(
			BacklogModal,
			{
				data: {
					entry,
					preselectedGame,
					preselectedCompilationParent: null,
					preselectAddToQueue: false
				}
			}
		);
		ref.afterClosed.subscribe(result => {
			if (result === "saved") this.loadShelf();
		});
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

	filterByPlatform(platformId: string) {
		this.selectedPlatform.set(platformId);
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
