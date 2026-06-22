import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnInit,
	signal
} from "@angular/core";
import { DatePipe } from "@angular/common";
import { GameShelfEntry } from "../../../core/models";
import { GameShelfService } from "../game-shelf";
import { FavoritesService } from "../../favorites/favorites";
import { RouterLink } from "@angular/router";
import { GameShelfModal } from "../game-shelf-modal/game-shelf-modal";
import { UiButton, UiEmptyState, UiPagination, UiSearchBar } from "../../../shared/ui";
import { GameCoverCard } from "../../../shared/components/game-cover-card/game-cover-card";
import { Subject, debounceTime, distinctUntilChanged } from "rxjs";

interface PlatformCount {
	id: string;
	abbreviation: string;
	count: number;
}

@Component({
	selector: "app-game-shelf-list",
	imports: [DatePipe, GameShelfModal, RouterLink, UiButton, UiEmptyState, UiPagination, UiSearchBar, GameCoverCard],
	templateUrl: "./game-shelf-list.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameShelfList implements OnInit {
	private readonly shelfService = inject(GameShelfService);
	private readonly favoritesService = inject(FavoritesService);

	protected readonly allEntries = signal<GameShelfEntry[]>([]);
	protected readonly entries = signal<GameShelfEntry[]>([]);
	protected readonly isLoading = signal(true);
	protected readonly searchQuery = signal("");
	protected readonly selectedPlatform = signal("");
	protected readonly platformCounts = signal<PlatformCount[]>([]);
	protected readonly showModal = signal(false);
	protected readonly editingEntry = signal<GameShelfEntry | null>(null);
	protected readonly total = signal(0);
	protected readonly offset = signal(0);
	protected readonly limit = 100;

	protected readonly viewMode = signal<"grid" | "table">(
		((): "grid" | "table" => {
			const saved = localStorage.getItem("completr.shelf.viewMode");
			return saved === "table" ? "table" : "grid";
		})()
	);

	setViewMode(mode: "grid" | "table") {
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
		this.loadShelf();
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
		this.editingEntry.set(null);
		this.showModal.set(true);
	}

	openEdit(entry: GameShelfEntry) {
		this.editingEntry.set(entry);
		this.showModal.set(true);
	}

	onModalClosed() {
		this.showModal.set(false);
		this.editingEntry.set(null);
	}

	onModalSaved() {
		this.showModal.set(false);
		this.editingEntry.set(null);
		this.loadShelf();
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
