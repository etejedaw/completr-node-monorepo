import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { DatePipe } from "@angular/common";
import { GameShelfEntry, Game, BacklogEntry } from "../../../core/models";
import { GameShelfService } from "../game-shelf";
import { FavoritesService } from "../../favorites/favorites";
import { WishlistService } from "../../wishlist/wishlist";
import { BacklogService } from "../../backlog/backlog";
import {
	BacklogModal,
	type BacklogModalData,
	type BacklogModalResult
} from "../../backlog/backlog-modal/backlog-modal";
import { GamesService } from "../../games/games";
import { RouterLink } from "@angular/router";
import {
	GameShelfModal,
	type GameShelfModalData,
	type GameShelfModalResult
} from "../game-shelf-modal/game-shelf-modal";
import { DialogService } from "../../../core/services/dialog";
import { GameShelfCalendar } from "../game-shelf-calendar/game-shelf-calendar";
import {
	UiButton,
	UiEmptyState,
	UiPagination,
	UiSearchBar
} from "../../../shared/ui";
import { GameCoverCard } from "../../../shared/components/game-cover-card/game-cover-card";
import { MoodTagsChips } from "../../../shared/components/mood-tags-chips/mood-tags-chips";
import { Subject, debounceTime, distinctUntilChanged } from "rxjs";

interface PlatformCount {
	id: string;
	abbreviation: string;
	count: number;
}

@Component({
	selector: "app-game-shelf-list",
	imports: [
		DatePipe,
		RouterLink,
		UiButton,
		UiEmptyState,
		UiPagination,
		UiSearchBar,
		GameCoverCard,
		MoodTagsChips,
		GameShelfCalendar
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

	protected readonly backlogGameIds = signal<Set<string>>(new Set());

	protected readonly allEntries = signal<GameShelfEntry[]>([]);
	protected readonly entries = signal<GameShelfEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly searchQuery = signal("");
	protected readonly selectedPlatform = signal("");
	protected readonly platformCounts = signal<PlatformCount[]>([]);
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = 100;

	protected readonly viewMode = signal<"grid" | "table" | "calendar">(
		((): "grid" | "table" | "calendar" => {
			const saved = localStorage.getItem("completr.shelf.viewMode");
			if (saved === "table") return "table";
			if (saved === "calendar") return "calendar";
			return "grid";
		})()
	);

	setViewMode(mode: "grid" | "table" | "calendar") {
		this.viewMode.set(mode);
		localStorage.setItem("completr.shelf.viewMode", mode);
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
		this.wishlistService.load({ limit: 100 }).subscribe();
		this.loadBacklogIds();
		this.loadShelf();
	}

	isInWishlist(gameId: string): boolean {
		return this.wishlistService.isInWishlist(gameId);
	}

	isInBacklog(gameId: string): boolean {
		return this.backlogGameIds().has(gameId);
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
			if (result === "saved") this.loadBacklogIds();
		});
	}

	private loadBacklogIds() {
		this.backlogService.getMyBacklog({ limit: 100 }).subscribe({
			next: res => {
				const ids = new Set(res.data.backlog.map(b => b.game.id));
				this.backlogGameIds.set(ids);
			}
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
		this.filterEntries();
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
					const entries = res.data.gameShelf;
					this.allEntries.set(entries);
					this.total.set(res.data.total);
					this.buildPlatformCounts(entries);
					this.filterEntries();
					this.isLoading.set(false);
				},
				error: () => this.isLoading.set(false)
			});
	}

	private buildPlatformCounts(entries: GameShelfEntry[]) {
		const map = new Map<string, PlatformCount>();
		for (const e of entries) {
			const existing = map.get(e.platform.id);
			if (existing) {
				existing.count++;
			} else {
				map.set(e.platform.id, {
					id: e.platform.id,
					abbreviation: e.platform.abbreviation,
					count: 1
				});
			}
		}
		const sorted = [...map.values()].sort((a, b) => b.count - a.count);
		this.platformCounts.set(sorted);
	}

	private filterEntries() {
		let filtered = this.allEntries();

		const platform = this.selectedPlatform();
		if (platform) {
			filtered = filtered.filter(e => e.platform.id === platform);
		}

		this.entries.set(filtered);
	}
}
